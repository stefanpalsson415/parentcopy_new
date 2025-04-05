// src/services/AllieAIService.js
// Consolidated AI service combining EnhancedAIService and AllieAIEngineService

import ClaudeService from './ClaudeService';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp,
  limit
} from 'firebase/firestore';

/**
 * Comprehensive AI service for Allie app that handles all AI interactions
 * Combines functionality from EnhancedAIService and AllieAIEngineService
 */
class AllieAIService {
  constructor() {
    this.contextCache = {};
    this.feedbackLog = {};
  }

  /**
   * Enhanced JSON parsing with better fallback handling
   * @param {string} jsonString - The JSON string to parse
   * @param {object} defaultValue - Default value to return if parsing fails
   * @returns {object} The parsed JSON or default value
   */
  safelyParseJSON(jsonString, defaultValue) {
    try {
      // Handle empty or null responses
      if (!jsonString || typeof jsonString !== 'string') {
        console.warn("Invalid input for JSON parsing:", jsonString);
        return defaultValue;
      }

      // Check if the response is a plain text insight rather than JSON
      if (jsonString.trim().startsWith("Here are") || 
          jsonString.trim().startsWith("Based on")) {
        // Handle plain text responses by converting to our expected format
        console.log("Received text response instead of JSON, creating structured format");
        
        // Extract meaningful content from the text
        const textLines = jsonString.split('\n').filter(line => line.trim().length > 0);
        
        // Create structured insights from text
        return {
          insights: [
            {
              title: "AI Analysis",
              category: "Family Balance",
              description: textLines.slice(0, 3).join(' '),
              actionItem: textLines.length > 3 ? textLines[3] : "Review your family workload balance."
            }
          ]
        };
      }

      // Try direct parsing first
      try {
        return JSON.parse(jsonString);
      } catch (initialError) {
        console.warn("Initial JSON parsing failed, attempting recovery:", initialError.message);
      }
      
      // Try to find and extract a valid JSON object
      try {
        // Look for anything that looks like a JSON object
        const objectMatch = jsonString.match(/(\{[\s\S]*\})/);
        if (objectMatch && objectMatch[0]) {
          // Further clean the match to ensure it's valid JSON
          const cleanJSON = objectMatch[0]
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\n/g, ' ');
            
          return JSON.parse(cleanJSON);
        }
        
        // Try to find JSON arrays
        const arrayMatch = jsonString.match(/(\[[\s\S]*\])/);
        if (arrayMatch && arrayMatch[0]) {
          return JSON.parse(arrayMatch[0]);
        }
      } catch (recoveryError) {
        console.warn("JSON extraction failed:", recoveryError.message);
      }
      
      console.error("Could not extract valid JSON from response");
      console.log("Response preview:", jsonString.substring(0, 200) + "...");
      return defaultValue;
    } catch (error) {
      console.error("JSON recovery completely failed:", error.message);
      return defaultValue;
    }
  }

  /**
   * Get comprehensive family context for AI
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Family context data
   */
  async getFamilyContext(familyId) {
    // Check cache first
    if (this.contextCache[familyId]) {
      const cacheAge = Date.now() - this.contextCache[familyId].timestamp;
      // Use cache if less than 5 minutes old
      if (cacheAge < 300000) {
        return this.contextCache[familyId].data;
      }
    }

    try {
      // Get family document
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Family not found");
      }
      
      const familyData = docSnap.data();
      
      // Get survey responses
      const surveyResponsesQuery = query(
        collection(db, "surveyResponses"), 
        where("familyId", "==", familyId)
      );
      const surveyResponsesSnapshot = await getDocs(surveyResponsesQuery);
      
      // Process and merge all responses
      const surveyResponses = {};
      surveyResponsesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.responses) {
          // Merge all responses together
          Object.assign(surveyResponses, data.responses);
        }
      });
      
      // Get relationship data
      const relationshipRef = doc(db, "relationshipStrategies", familyId);
      const relationshipSnap = await getDoc(relationshipRef);
      const relationshipData = relationshipSnap.exists() ? relationshipSnap.data() : {};
      
      // Get couple check-in data
      const checkInQuery = query(
        collection(db, "coupleCheckIns"),
        where("familyId", "==", familyId),
        orderBy("completedAt", "desc"),
        limit(5)
      );
      
      const checkInSnapshot = await getDocs(checkInQuery);
      const checkInData = {};
      
      checkInSnapshot.forEach((doc) => {
        const id = doc.id;
        const weekMatch = id.match(/-week(\d+)$/);
        if (weekMatch && weekMatch[1]) {
          const weekNumber = parseInt(weekMatch[1]);
          checkInData[weekNumber] = doc.data();
        }
      });
      
      // Compile comprehensive context
      const context = {
        family: familyData,
        familyId: familyId,
        familyName: familyData.familyName,
        familyMembers: familyData.familyMembers,
        adults: familyData.familyMembers.filter(m => m.role === 'parent').length,
        children: familyData.familyMembers.filter(m => m.role === 'child'),
        relationship: {
          strategies: relationshipData.strategies || [],
          checkIns: checkInData
        },
        survey: {
          responses: surveyResponses,
          totalQuestions: Object.keys(surveyResponses).length,
          mamaPercentage: this.calculateMamaPercentage(surveyResponses),
          categories: this.getCategoryBreakdown(surveyResponses)
        },
        tasks: familyData.tasks || [],
        currentWeek: familyData.currentWeek || 1,
        completedWeeks: familyData.completedWeeks || [],
        impactInsights: familyData.impactInsights || [],
        balanceScores: familyData.weightedScores || null,
        weekHistory: familyData.weekHistory || {}
      };
      
      // Cache the context
      this.contextCache[familyId] = {
        data: context,
        timestamp: Date.now()
      };
      
      return context;
    } catch (error) {
      console.error("Error getting family context:", error);
      throw error;
    }
  }

  /**
   * Generate personalized tasks based on survey data
   * @param {string} familyId - Family ID
   * @param {number} currentWeek - Current week number
   * @param {Array} previousTasks - Previously generated tasks
   * @returns {Promise<Array>} Array of personalized tasks
   */
  async generatePersonalizedTasks(familyId, currentWeek, previousTasks = []) {
    try {
      // Get family data and context
      const familyContext = await this.getFamilyContext(familyId);
      const familyData = familyContext.family;
      const surveyResponses = familyContext.survey.responses;
      
      // Analyze previous tasks
      const previousTasksAnalysis = this.analyzePreviousTasks(previousTasks);
      
      // Create prompt for Claude
      const systemPrompt = `You are Allie, an AI designed to create personalized family task recommendations to improve workload balance.
      
      Family Information:
      Family Name: ${familyData.familyName}
      Parents: ${JSON.stringify(familyData.familyMembers.filter(m => m.role === 'parent'))}
      Children: ${JSON.stringify(familyData.familyMembers.filter(m => m.role === 'child'))}
      Current Week: ${currentWeek}
      
      Use this information to generate 4 specific tasks for Week ${currentWeek}:
      1. Create 2 tasks for each parent
      2. Focus on areas with the highest imbalance
      3. Avoid repeating tasks from previous weeks
      4. Each task should have 2-3 specific subtasks
      5. Include an AI insight explaining why each task was selected
      
      IMPORTANT: Your response should be in valid JSON format with this structure:
      {
        "tasks": [
          {
            "id": "string (weekNumber-taskNumber)",
            "title": "string (descriptive task title)",
            "description": "string (detailed task description)",
            "assignedTo": "string (parent role: 'Mama' or 'Papa')",
            "assignedToName": "string (parent name)",
            "focusArea": "string (category name)",
            "category": "string (one of the four task categories)",
            "aiInsight": "string (explanation of why this task matters)",
            "isAIGenerated": true,
            "subTasks": [
              {
                "id": "string (taskId-subtaskNumber)",
                "title": "string (subtask title)",
                "description": "string (subtask description)"
              }
            ]
          }
        ]
      }`;
      
      const userMessage = `Generate 4 personalized tasks for Week ${currentWeek} based on this data:
      
      Survey Analysis:
      ${JSON.stringify(surveyResponses)}
      
      Previous Task Effectiveness:
      ${JSON.stringify(previousTasksAnalysis)}
      
      Task Categories:
      1. Visible Household Tasks (cleaning, cooking, etc.)
      2. Invisible Household Tasks (planning, scheduling, etc.)
      3. Visible Parental Tasks (child activities, homework help, etc.)
      4. Invisible Parental Tasks (emotional support, anticipating needs, etc.)
      
      Family Priorities:
      ${JSON.stringify(familyData.priorities)}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response with enhanced error handling
      const responseData = this.safelyParseJSON(claudeResponse, { tasks: [] });
      
      if (responseData.tasks && responseData.tasks.length > 0) {
        return responseData.tasks;
      } else {
        console.warn("Claude did not return valid tasks structure, using fallback");
        // Return fallback tasks if the response doesn't contain tasks
        return this.getFallbackTasks(currentWeek, familyId, familyData);
      }
    } catch (error) {
      console.error("Error generating personalized tasks:", error);
      
      // Fallback tasks if AI fails
      return this.getFallbackTasks(currentWeek, familyId);
    }
  }

  /**
   * Generate dashboard insights for family balance
   * @param {string} familyId - Family ID
   * @param {number} currentWeek - Current week number
   * @returns {Promise<object>} Object containing insights
   */
  async generateDashboardInsights(familyId, currentWeek) {
    try {
      if (!familyId) {
        console.warn("Missing familyId in generateDashboardInsights");
        return { insights: this.getFallbackInsights() };
      }
      
      // Get family context
      const familyContext = await this.getFamilyContext(familyId);
      
      // Check if we have previous week data
      let previousWeekData = null;
      if (currentWeek > 1) {
        // Get previous week data
        const weekHistoryDoc = await getDoc(doc(db, "weekHistory", `${familyId}-week${currentWeek-1}`));
        if (weekHistoryDoc.exists()) {
          previousWeekData = weekHistoryDoc.data();
        }
      }
      
      // Create prompt for Claude
      const systemPrompt = `You are Allie, an AI designed to provide family workload balance insights.
      
      Analyze the family's survey data and progress to generate 3-4 meaningful insights about:
      1. Current imbalance patterns
      2. Progress since previous weeks
      3. Impact of completed tasks
      4. Recommendations for improvement
      
      Keep insights concise (2-3 sentences each) and actionable.
      
      Your response should be in valid JSON format with this structure:
      {
        "insights": [
          {
            "title": "string (short, engaging title)",
            "category": "string (which category this relates to)",
            "description": "string (the actual insight - 2-3 sentences)",
            "actionItem": "string (a specific suggestion based on this insight)"
          }
        ]
      }`;
      
      const userMessage = `Generate family balance insights for Week ${currentWeek} based on this data:
      
      Family Information:
      ${JSON.stringify(familyContext.family)}
      
      Current Survey Results:
      ${JSON.stringify(familyContext.survey.responses)}
      
      ${previousWeekData ? `Previous Week Data: ${JSON.stringify(previousWeekData)}` : ''}`;
      
      // Call Claude API with timeout handling
      let claudeResponse = null;
      try {
        claudeResponse = await Promise.race([
          ClaudeService.generateResponse(
            [{ role: 'user', content: userMessage }],
            { system: systemPrompt }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Claude API timeout")), 15000)
          )
        ]);
      } catch (timeoutError) {
        console.error("Claude API timed out:", timeoutError);
        return { insights: this.getFallbackInsights() };
      }
      
      if (!claudeResponse) {
        console.warn("Empty response from Claude API");
        return { insights: this.getFallbackInsights() };
      }
      
      // Enhanced parsing with fallback
      const parsedResponse = this.safelyParseJSON(claudeResponse, { insights: this.getFallbackInsights() });
      
      // Validate response structure and fall back if needed
      if (!parsedResponse.insights || !Array.isArray(parsedResponse.insights) || parsedResponse.insights.length === 0) {
        console.warn("Invalid dashboard insights structure returned, using fallback");
        return { insights: this.getFallbackInsights() };
      }
      
      return parsedResponse;
    } catch (error) {
      console.error("Error generating dashboard insights:", error);
      
      // Return fallback insights
      return { insights: this.getFallbackInsights() };
    }
  }
  
  /**
   * Generate relationship insights based on all available data
   * @param {string} familyId - Family ID
   * @param {number} currentWeek - Current week number
   * @param {object} relationshipData - Relationship data
   * @param {Array} strategies - Relationship strategies
   * @param {object} checkInData - Couple check-in data
   * @returns {Promise<Array>} Array of relationship insights
   */
  async generateRelationshipInsights(familyId, currentWeek, relationshipData, strategies, checkInData) {
    try {
      if (!familyId) {
        console.warn("Missing familyId in generateRelationshipInsights");
        return this.getFallbackRelationshipInsights();
      }
      
      // Prepare data for Claude
      const systemPrompt = `You are Allie's relationship AI expert. Analyze the family's relationship data and generate 3-4 personalized insights.
      
      For each insight, include:
      1. A short, specific title
      2. A 1-2 sentence description with a specific data point or research finding
      3. One actionable recommendation
      4. A category (connection, workload, gratitude, or growth)
      
      Your response should be in valid JSON format with this structure:
      {
        "insights": [
          {
            "id": "string (unique identifier)",
            "title": "string (concise title)",
            "description": "string (insight with data point)",
            "actionable": "string (specific action to take)",
            "category": "string (connection, workload, gratitude, or growth)"
          }
        ]
      }`;
      
      const userMessage = `Generate relationship insights based on this data:
      
      Relationship Trend Data:
      ${JSON.stringify(relationshipData || {})}
      
      Strategy Implementation:
      ${JSON.stringify(strategies || [])}
      
      Check-in Responses:
      ${JSON.stringify(checkInData || {})}
      
      Current Week: ${currentWeek}`;
      
      // Call Claude API with timeout handling
      let claudeResponse = null;
      try {
        claudeResponse = await Promise.race([
          ClaudeService.generateResponse(
            [{ role: 'user', content: userMessage }],
            { system: systemPrompt }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Claude API timeout")), 15000)
          )
        ]);
      } catch (timeoutError) {
        console.error("Claude API timed out:", timeoutError);
        return this.getFallbackRelationshipInsights();
      }
      
      if (!claudeResponse) {
        console.warn("Empty response from Claude API");
        return this.getFallbackRelationshipInsights();
      }
      
      // Parse JSON response with enhanced error handling
      const responseData = this.safelyParseJSON(claudeResponse, { insights: [] });
      
      // Validate insights structure
      if (!responseData.insights || !Array.isArray(responseData.insights) || responseData.insights.length === 0) {
        console.warn("Claude did not return valid insights, using fallback");
        return this.getFallbackRelationshipInsights();
      }
      
      return responseData.insights;
    } catch (error) {
      console.error("Error generating relationship insights:", error);
      console.log("Stack trace:", error.stack);
      
      // Return fallback insights instead of null
      return this.getFallbackRelationshipInsights();
    }
  }

  /**
   * Process relationship feedback to improve AI recommendations
   * @param {string} familyId - Family ID
   * @param {number} weekNum - Week number
   * @param {string} memberId - Family member ID
   * @param {object} relationshipResponses - Relationship feedback responses
   * @returns {Promise<boolean>} Success indicator
   */
  async processRelationshipFeedback(familyId, weekNum, memberId, relationshipResponses) {
    try {
      if (!familyId || !memberId) {
        console.warn("Missing required parameters in processRelationshipFeedback");
        return false;
      }
      
      console.log(`Processing relationship feedback from week ${weekNum} for member ${memberId}`);
      
      // Save the responses to Firestore for future AI training
      const docRef = doc(db, "relationshipFeedback", `${familyId}-${weekNum}-${memberId}`);
      await setDoc(docRef, {
        familyId,
        weekNum,
        memberId,
        responses: relationshipResponses,
        timestamp: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error processing relationship feedback:", error);
      return false;
    }
  }

  /**
   * Generate feedback on couple check-in responses
   * @param {string} familyId - Family ID
   * @param {number} weekNumber - Week number
   * @param {object} checkInData - Couple check-in data
   * @returns {Promise<object>} Feedback object
   */
  async generateCoupleCheckInFeedback(familyId, weekNumber, checkInData) {
    try {
      if (!familyId || !checkInData) {
        console.warn("Missing required parameters in generateCoupleCheckInFeedback");
        return this.getFallbackCoupleCheckInFeedback();
      }
      
      // Prepare data for Claude
      const systemPrompt = `You are Allie's relationship AI expert. Analyze the couple's check-in responses and provide personalized feedback.
      
      For your feedback, include:
      1. An overall assessment of their relationship health
      2. 2-3 specific strengths you've identified
      3. 1-2 growth opportunities with actionable suggestions
      4. A specific recommendation for the coming week
      
      Your response should be in valid JSON format with this structure:
      {
        "assessment": "string (1-2 sentences overall assessment)",
        "strengths": [
          { "title": "string", "description": "string" }
        ],
        "growthAreas": [
          { "title": "string", "description": "string", "suggestion": "string" }
        ],
        "weeklyRecommendation": "string (specific action for the week)"
      }`;
      
      const userMessage = `Generate couple check-in feedback based on these responses:
      
      Week Number: ${weekNumber}
      
      Check-in Data:
      ${JSON.stringify(checkInData)}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response with enhanced error handling
      const responseData = this.safelyParseJSON(claudeResponse, this.getFallbackCoupleCheckInFeedback());
      
      // Validate response structure
      if (!responseData.assessment || !responseData.strengths) {
        console.warn("Claude did not return valid couple check-in feedback structure");
        return this.getFallbackCoupleCheckInFeedback();
      }
      
      return responseData;
    } catch (error) {
      console.error("Error generating couple check-in feedback:", error);
      return this.getFallbackCoupleCheckInFeedback();
    }
  }

  /**
   * Generate family meeting agenda
   * @param {string} familyId - Family ID
   * @param {number} weekNumber - Week number
   * @returns {Promise<object>} Meeting agenda object
   */
  async generateFamilyMeetingAgenda(familyId, weekNumber) {
    try {
      if (!familyId) {
        console.warn("Missing familyId in generateFamilyMeetingAgenda");
        return this.getFallbackAgenda(weekNumber);
      }
      
      // Get family context
      const familyContext = await this.getFamilyContext(familyId);
      
      // Get tasks for the week
      const tasks = familyContext.tasks || [];
      const completedTasks = tasks.filter(task => task.completed);
      const uncompletedTasks = tasks.filter(task => !task.completed);
      
      // Create prompt for Claude
      const systemPrompt = `You are Allie, an AI designed to create structured family meeting agendas.
      
      Generate a family meeting agenda for Week ${weekNumber} that includes:
      1. A brief introduction setting the tone (positive, solution-focused)
      2. 2-3 specific wins to celebrate based on completed tasks
      3. 2-3 challenges to discuss based on uncompleted tasks
      4. 2-3 goals for the coming week
      5. 2-3 discussion questions to facilitate conversation
      
      Your response should be in valid JSON format with this structure:
      {
        "agenda": {
          "introduction": "string (brief introduction paragraph)",
          "timeEstimate": "30 minutes",
          "sections": [
            {
              "title": "string (section title)",
              "items": ["string (discussion point)", "string (discussion point)"],
              "notes": "string (optional guidance for this section)"
            }
          ],
          "discussionQuestions": ["string (question)", "string (question)"],
          "closingThoughts": "string (brief positive closing paragraph)"
        }
      }`;
      
      const userMessage = `Generate a family meeting agenda for Week ${weekNumber} based on this data:
      
      Family Information:
      ${JSON.stringify(familyContext.family)}
      
      Completed Tasks:
      ${JSON.stringify(completedTasks)}
      
      Uncompleted Tasks:
      ${JSON.stringify(uncompletedTasks)}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response with enhanced error handling
      const responseData = this.safelyParseJSON(claudeResponse, { agenda: this.getFallbackAgenda(weekNumber) });
      
      if (responseData.agenda) {
        return responseData.agenda;
      } else {
        console.warn("Claude did not return valid agenda structure");
        return this.getFallbackAgenda(weekNumber);
      }
    } catch (error) {
      console.error("Error generating family meeting agenda:", error);
      
      // Fallback agenda if AI fails
      return this.getFallbackAgenda(weekNumber);
    }
  }

  /**
   * Generate a personalized meeting agenda
   * @param {string} familyId - Family ID 
   * @param {string} meetingType - Type of meeting ('family' or 'relationship')
   * @param {number} weekNumber - Week number
   * @returns {Promise<object>} Meeting agenda object
   */
  async generateMeetingAgenda(familyId, meetingType, weekNumber) {
    try {
      // Get family context
      const context = await this.getFamilyContext(familyId);
      
      let systemPrompt = '';
      if (meetingType === 'family') {
        systemPrompt = `You are Allie's AI Meeting Facilitator. Create a family meeting agenda for Week ${weekNumber}.
        
        The agenda should include:
        1. A welcoming introduction
        2. Review of the week's progress
        3. Celebration of wins
        4. Discussion of challenges
        5. Planning for next week
        6. Specific discussion questions
        
        Your response should be in valid JSON format with this structure:
        {
          "agenda": {
            "title": "Week ${weekNumber} Family Meeting",
            "introduction": "Welcome message",
            "sections": [
              {
                "title": "Section title",
                "description": "Section description",
                "items": ["Discussion point 1", "Discussion point 2"],
                "timeEstimate": "10 minutes"
              }
            ],
            "discussionQuestions": ["Question 1", "Question 2"],
            "closingMessage": "Closing thoughts"
          }
        }`;
      } else if (meetingType === 'relationship') {
        systemPrompt = `You are Allie's AI Relationship Facilitator. Create a couple's meeting agenda for Week ${weekNumber}.
        
        The agenda should include:
        1. A connection-focused introduction
        2. Relationship strengths to celebrate
        3. Areas for growth discussion
        4. Specific action planning
        5. Focused discussion topics
        
        Your response should be in valid JSON format with this structure:
        {
          "agenda": {
            "title": "Week ${weekNumber} Relationship Meeting",
            "introduction": "Welcome message",
            "sections": [
              {
                "title": "Section title",
                "description": "Section description",
                "discussionPrompts": ["Prompt 1", "Prompt 2"],
                "timeEstimate": "10 minutes"
              }
            ],
            "actionPlanning": {
              "title": "Action Planning",
              "description": "Plan specific actions",
              "suggestions": ["Suggestion 1", "Suggestion 2"]
            },
            "closingActivity": "Description of a brief closing activity"
          }
        }`;
      }
      
      const userMessage = `Generate a personalized ${meetingType} meeting agenda for Week ${weekNumber} based on this family data: ${JSON.stringify(context)}`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response
      return JSON.parse(response).agenda;
    } catch (error) {
      console.error(`Error generating ${meetingType} meeting agenda:`, error);
      
      // Return a fallback agenda
      return {
        title: `Week ${weekNumber} ${meetingType === 'family' ? 'Family' : 'Relationship'} Meeting`,
        introduction: `Welcome to your Week ${weekNumber} meeting. Let's take some time to connect and reflect.`,
        sections: [
          {
            title: "Review of the Week",
            description: "What went well and what could be improved",
            items: ["Discuss wins from this week", "Address any challenges faced"],
            timeEstimate: "10 minutes"
          },
          {
            title: "Planning Ahead",
            description: "Setting intentions for next week",
            items: ["Set priorities for the coming week", "Assign responsibilities"],
            timeEstimate: "10 minutes"
          }
        ],
        discussionQuestions: ["What made you feel most connected this week?", "How can we better support each other?"],
        closingMessage: "Thank you for taking this time to connect. Small, consistent efforts make a big difference."
      };
    }
  }

  /**
   * Calculate mama percentage from survey responses
   * @param {object} responses - Survey responses
   * @returns {number} Percentage of tasks done by mama
   */
  calculateMamaPercentage(responses) {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses || {}).forEach(response => {
      if (response === 'Mama' || response === 'Papa') {
        totalCount++;
        if (response === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    return totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
  }
  
  /**
   * Get category breakdown from survey responses
   * @param {object} responses - Survey responses
   * @returns {object} Category breakdown with percentages
   */
  getCategoryBreakdown(responses) {
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Simple categorization based on question IDs (approximate)
    // In a real implementation, you would have a mapping of question IDs to categories
    Object.entries(responses || {}).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question number if possible
      const match = key.match(/q(\d+)/);
      if (!match) return;
      
      const qNum = parseInt(match[1]);
      let category;
      
      if (qNum <= 20) {
        category = "Visible Household Tasks";
      } else if (qNum <= 40) {
        category = "Invisible Household Tasks";
      } else if (qNum <= 60) {
        category = "Visible Parental Tasks";
      } else {
        category = "Invisible Parental Tasks";
      }
      
      categories[category].total++;
      if (value === 'Mama') {
        categories[category].mama++;
      } else {
        categories[category].papa++;
      }
    });
    
    // Calculate percentages
    Object.keys(categories).forEach(category => {
      const { mama, total } = categories[category];
      if (total > 0) {
        categories[category].mamaPercent = (mama / total) * 100;
        categories[category].papaPercent = 100 - (mama / total) * 100;
      } else {
        categories[category].mamaPercent = 50;
        categories[category].papaPercent = 50;
      }
    });
    
    return categories;
  }

  /**
   * Analyze task effectiveness
   * @param {Array} completedTasks - Array of completed tasks
   * @param {object} weekHistoryData - Historical week data
   * @returns {Array} Task effectiveness analysis
   */
  analyzeTaskEffectiveness(completedTasks, weekHistoryData) {
    // Group tasks by type/focus area
    const tasksByType = {};
    completedTasks.forEach(task => {
      const type = task.focusArea || task.taskType || task.category || 'other';
      if (!tasksByType[type]) tasksByType[type] = [];
      tasksByType[type].push(task);
    });
    
    // For each type, check if balance improved in the following week
    const effectiveness = [];
    Object.entries(tasksByType).forEach(([type, tasks]) => {
      // Find the weeks these tasks were completed in
      const weekNumbers = [...new Set(tasks.map(t => {
        // Extract week number from task ID or other properties
        const match = t.id?.toString().match(/^(\d+)-/);
        return match ? parseInt(match[1]) : null;
      }))].filter(Boolean);
      
      // Check balance before and after
      const improvementCount = weekNumbers.filter(weekNum => {
        const beforeWeekData = weekHistoryData[`week${weekNum}`];
        const afterWeekData = weekHistoryData[`week${weekNum+1}`];
        
        if (!beforeWeekData || !afterWeekData) return false;
        
        // Calculate if balance improved - extract the balance data
        const beforeBalance = { mama: 0, papa: 0 };
        const afterBalance = { mama: 0, papa: 0 };
        
        // Try to extract mama percentage from different possible data structures
        this.extractBalanceFromWeekData(beforeWeekData, beforeBalance);
        this.extractBalanceFromWeekData(afterWeekData, afterBalance);
        
        // Measure distance from perfect balance (50/50)
        const beforeImbalance = Math.abs(beforeBalance.mama - 50);
        const afterImbalance = Math.abs(afterBalance.mama - 50);
        
        // Return true if balance got better (imbalance decreased)
        return afterImbalance < beforeImbalance;
      }).length;
      
      // Calculate effectiveness ratio
      const effectivenessScore = weekNumbers.length > 0 
        ? improvementCount / weekNumbers.length 
        : 0.5; // Default if no data
      
      effectiveness.push({
        taskType: type,
        effectiveness: effectivenessScore,
        sampleSize: weekNumbers.length,
        tasksCompleted: tasks.length
      });
    });
    
    return effectiveness;
  }
  
  /**
   * Helper method for extracting balance data from week data
   * @param {object} weekData - Week data object
   * @param {object} balanceObj - Balance object to populate
   */
  extractBalanceFromWeekData(weekData, balanceObj) {
    // Try to extract mama percentage from different possible data structures
    if (weekData.balance?.mama) {
      balanceObj.mama = weekData.balance.mama;
    } else if (weekData.surveyResponses) {
      // Count responses where value is "Mama"
      let mamaCount = 0;
      let totalCount = 0;
      
      Object.values(weekData.surveyResponses).forEach(value => {
        if (value === "Mama" || value === "Papa") {
          totalCount++;
          if (value === "Mama") mamaCount++;
        }
      });
      
      if (totalCount > 0) {
        balanceObj.mama = (mamaCount / totalCount) * 100;
      }
    }
    
    balanceObj.papa = 100 - balanceObj.mama;
  }

  /**
   * Analyze task impact between weeks
   * @param {object} currentWeekData - Current week data
   * @param {object} previousWeekData - Previous week data
   * @returns {Array} Task impact insights
   */
  analyzeTaskImpact(currentWeekData, previousWeekData) {
    const impactInsights = [];
    
    if (!currentWeekData || !previousWeekData) {
      return impactInsights; // Return empty array if data is missing
    }
    
    // Helper to extract balance data from week data
    const extractBalance = (weekData, category) => {
      // First try category-specific balance
      if (weekData.categoryBalance && weekData.categoryBalance[category]) {
        return weekData.categoryBalance[category];
      }
      
      // If that's not available, extract from survey responses
      if (weekData.surveyResponses) {
        const categoryResponses = Object.entries(weekData.surveyResponses)
          .filter(([key, _]) => key.includes(category) || 
                             (key.includes('q') && 
                             (category === "Visible Household Tasks" && key.match(/q([1-9]|1[0-9]|20)/)) ||
                             (category === "Invisible Household Tasks" && key.match(/q(2[1-9]|3[0-9]|40)/)) ||
                             (category === "Visible Parental Tasks" && key.match(/q(4[1-9]|5[0-9]|60)/)) ||
                             (category === "Invisible Parental Tasks" && key.match(/q(6[1-9]|7[0-9]|80)/))
                             ));
        
        const mamaCount = categoryResponses.filter(([_, value]) => value === "Mama").length;
        const totalCount = categoryResponses.length;
        
        if (totalCount > 0) {
          return {
            mamaPercent: (mamaCount / totalCount) * 100,
            papaPercent: 100 - (mamaCount / totalCount) * 100
          };
        }
      }
      
      // If we can't determine from the data, return a balanced default
      return { mamaPercent: 50, papaPercent: 50 };
    };
    
    // Compare data between weeks for each category
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    categories.forEach(category => {
      const previousBalance = extractBalance(previousWeekData, category);
      const currentBalance = extractBalance(currentWeekData, category);
      
      // Calculate improvement (how much closer to 50/50 balance we got)
      const previousImbalance = Math.abs(previousBalance.mamaPercent - 50);
      const currentImbalance = Math.abs(currentBalance.mamaPercent - 50);
      const improvement = previousImbalance - currentImbalance;
      
      // Find tasks related to this category
      const relatedTasks = (currentWeekData.tasks || []).filter(task => 
        task.category === category || 
        task.hiddenWorkloadType === category || 
        task.focusArea === category);
      
      const completedTasks = relatedTasks.filter(task => task.completed);
      
      if (improvement > 3 && completedTasks.length > 0) {
        // Significant improvement with completed tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          effectiveTasks: completedTasks.map(t => t.title || t.description),
          message: `Your work on ${completedTasks.length} tasks has improved balance in ${category} by ${improvement.toFixed(1)}%!`,
          type: 'success'
        });
      } 
      else if (improvement <= 0 && completedTasks.length > 0) {
        // No improvement despite completed tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          ineffectiveTasks: completedTasks.map(t => t.title || t.description),
          message: `Despite completing tasks in ${category}, we haven't seen improvement yet. Let's try a different approach next week.`,
          type: 'warning'
        });
      }
      else if (improvement > 0 && completedTasks.length === 0) {
        // Improvement without specific tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          message: `${category} balance improved by ${improvement.toFixed(1)}% even without specific tasks!`,
          type: 'info'
        });
      }
    });
    
    return impactInsights;
  }

  /**
   * Analyze previous tasks to determine effectiveness
   * @param {Array} tasks - Array of previous tasks
   * @returns {object} Task effectiveness analysis
   */
  analyzePreviousTasks(tasks) {
    try {
      // Group tasks by type/category
      const tasksByType = {};
      (tasks || []).forEach(task => {
        const type = task.category || task.focusArea || 'Unknown';
        if (!tasksByType[type]) {
          tasksByType[type] = {
            count: 0,
            completed: 0
          };
        }
        
        tasksByType[type].count++;
        if (task.completed) {
          tasksByType[type].completed++;
        }
      });
      
      // Calculate effectiveness ratio for each type
      const effectiveness = {};
      Object.entries(tasksByType).forEach(([type, data]) => {
        effectiveness[type] = data.count > 0 ? data.completed / data.count : 0;
      });
      
      return effectiveness;
    } catch (error) {
      console.error("Error in analyzePreviousTasks:", error);
      return {};
    }
  }

  /**
   * Get fallback tasks if AI generation fails
   * @param {number} weekNumber - Week number
   * @param {string} familyId - Family ID
   * @returns {Array} Array of fallback tasks
   */
  getFallbackTasks(weekNumber, familyId) {
    return [
      {
        id: `${weekNumber}-1`,
        title: `Week ${weekNumber}: Meal Planning`,
        description: "Take charge of planning family meals for the week",
        assignedTo: "Papa",
        assignedToName: "Papa",
        focusArea: "Meal Planning",
        category: "Invisible Household Tasks",
        aiInsight: "Meal planning is often an invisible task that creates mental load. Taking it on can significantly improve workload balance.",
        isAIGenerated: true,
        subTasks: [
          {
            id: `${weekNumber}-1-1`,
            title: "Create weekly menu",
            description: "Plan meals for each day of the week"
          },
          {
            id: `${weekNumber}-1-2`,
            title: "Make shopping list",
            description: "List all ingredients needed for the menu"
          },
          {
            id: `${weekNumber}-1-3`,
            title: "Coordinate with family",
            description: "Get input on meal preferences"
          }
        ]
      },
      {
        id: `${weekNumber}-2`,
        title: `Week ${weekNumber}: Homework Support`,
        description: "Take a more active role in children's schoolwork",
        assignedTo: "Papa",
        assignedToName: "Papa",
        focusArea: "Homework Support",
        category: "Visible Parental Tasks",
        aiInsight: "Data shows that homework support is often imbalanced. Sharing this responsibility builds stronger parent-child bonds.",
        isAIGenerated: true,
        subTasks: [
          {
            id: `${weekNumber}-2-1`,
            title: "Create study space",
            description: "Set up a quiet area for homework"
          },
          {
            id: `${weekNumber}-2-2`,
            title: "Review assignments",
            description: "Know what homework is due and when"
          }
        ]
      },
      {
        id: `${weekNumber}-3`,
        title: `Week ${weekNumber}: Home Maintenance`,
        description: "Handle household repairs and upkeep",
        assignedTo: "Mama",
        assignedToName: "Mama",
        focusArea: "Home Maintenance",
        category: "Visible Household Tasks",
        aiInsight: "Challenging traditional roles by sharing home maintenance tasks creates more balance in visible household work.",
        isAIGenerated: true,
        subTasks: [
          {
            id: `${weekNumber}-3-1`,
            title: "Create repair list",
            description: "Identify what needs fixing around the house"
          },
          {
            id: `${weekNumber}-3-2`,
            title: "Schedule maintenance",
            description: "Plan time for repairs or hire help"
          }
        ]
      },
      {
        id: `${weekNumber}-4`,
        title: `Week ${weekNumber}: Emotional Support`,
        description: "Provide more emotional guidance for the children",
        assignedTo: "Mama",
        assignedToName: "Mama",
        focusArea: "Emotional Support",
        category: "Invisible Parental Tasks",
        aiInsight: "Emotional labor is often an invisible task that creates significant mental load. Balancing this responsibility improves family dynamics.",
        isAIGenerated: true,
        subTasks: [
          {
            id: `${weekNumber}-4-1`,
            title: "Have one-on-one talks",
            description: "Check in with each child individually"
          },
          {
            id: `${weekNumber}-4-2`,
            title: "Notice emotional needs",
            description: "Pay attention to cues that children need support"
          }
        ]
      }
    ];
  }
  
  /**
   * Get fallback insights if AI generation fails
   * @returns {Array} Array of fallback insights
   */
  getFallbackInsights() {
    return [
      {
        title: "Invisible Work Imbalance",
        category: "Invisible Household Tasks",
        description: "Your family shows a significant imbalance in invisible household work, with one parent handling 72% of planning and organizing tasks. This creates mental load that may not be immediately apparent.",
        actionItem: "Try redistributing meal planning and scheduling responsibilities for the next two weeks."
      },
      {
        title: "Progress in Visible Tasks",
        category: "Visible Household Tasks",
        description: "Your family has improved balance in visible household tasks, moving from a 70/30 split to a 60/40 split. Continued focus on sharing cleaning and cooking will help maintain this progress.",
        actionItem: "Create a rotating schedule for daily kitchen cleanup."
      },
      {
        title: "Emotional Labor Gap",
        category: "Invisible Parental Tasks",
        description: "One parent is handling 85% of emotional support for children. Sharing this invisible work more evenly can reduce burnout and strengthen all parent-child relationships.",
        actionItem: "Have the less-involved parent take the lead on bedtime talks this week."
      }
    ];
  }
  
  /**
   * Get fallback relationship insights if AI generation fails
   * @returns {Array} Array of fallback relationship insights
   */
  getFallbackRelationshipInsights() {
    return [
      {
        id: "fallback-1",
        title: "Emotional Connection",
        description: "Research indicates that daily check-ins strengthen your emotional bond. Taking 5 minutes a day to connect can boost relationship satisfaction.",
        actionable: "Try the 5-minute check-in template tonight.",
        category: "connection"
      },
      {
        id: "fallback-2",
        title: "Workload Sharing",
        description: "Balanced sharing of invisible work is linked to higher relationship satisfaction and reduced burnout.",
        actionable: "Review the Task Division strategy together this week.",
        category: "workload"
      },
      {
        id: "fallback-3",
        title: "Appreciation Practice",
        description: "Expressing gratitude regularly can significantly boost your connection. Try to notice and acknowledge your partner's contributions.",
        actionable: "Share one thing you appreciate about your partner each day this week.",
        category: "gratitude"
      }
    ];
  }
  
  /**
   * Get fallback couple check-in feedback if AI generation fails
   * @returns {object} Fallback couple check-in feedback
   */
  getFallbackCoupleCheckInFeedback() {
    return {
      assessment: "Based on your check-in data, you're making progress in your communication and connection.",
      strengths: [
        { title: "Communication", description: "You're making an effort to discuss important topics together." },
        { title: "Teamwork", description: "You're approaching family responsibilities as a team." }
      ],
      growthAreas: [
        { title: "Workload Balance", description: "There's still room for improvement in sharing invisible tasks.", suggestion: "Try swapping responsibility for one mental load task this week." }
      ],
      weeklyRecommendation: "Schedule a 15-minute check-in at the end of each day this week to share appreciations and briefly discuss the next day's plan."
    };
  }
  
  /**
   * Get fallback family meeting agenda if AI generation fails
   * @param {number} weekNumber - Week number
   * @returns {object} Fallback family meeting agenda
   */
  getFallbackAgenda(weekNumber) {
    return {
      introduction: `Welcome to your Week ${weekNumber} family meeting! Today we'll celebrate your progress, discuss challenges, and set goals for the coming week.`,
      timeEstimate: "30 minutes",
      sections: [
        {
          title: "Celebrate Wins",
          items: [
            "Task completions from this week",
            "Improved communication moments",
            "Balance improvements from survey data"
          ],
          notes: "Start with positives to create a supportive atmosphere"
        },
        {
          title: "Discuss Challenges",
          items: [
            "Review incomplete tasks from this week",
            "Identify barriers to completion",
            "Discuss potential solutions"
          ],
          notes: "Focus on solutions rather than blame"
        },
        {
          title: "Next Week's Goals",
          items: [
            "Set 2-3 specific family balance goals",
            "Discuss upcoming schedule challenges",
            "Assign new tasks based on AI recommendations"
          ],
          notes: "Make goals specific and achievable"
        }
      ],
      discussionQuestions: [
        "What's one thing your partner did this week that you appreciated?",
        "What task felt most challenging this week and why?",
        "What's one way we could improve our family balance next week?"
      ],
      closingThoughts: "Remember that creating better balance is a journey. Small improvements each week lead to significant changes over time. Keep supporting each other!"
    };
  }
}

export default new AllieAIService();