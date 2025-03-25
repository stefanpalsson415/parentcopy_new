// src/services/EnhancedAIService.js
import ClaudeService from './ClaudeService';
import { db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

class EnhancedAIService {
  constructor() {
    this.contextCache = {};
  }

  // Get comprehensive family context for AI
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
      
      // Get relationship data
      const relationshipRef = doc(db, "relationshipStrategies", familyId);
      const relationshipSnap = await getDoc(relationshipRef);
      const relationshipData = relationshipSnap.exists() ? relationshipSnap.data() : {};
      
      // Get survey responses
      const surveyQuery = query(
        collection(db, "surveyResponses"), 
        where("familyId", "==", familyId)
      );
      const surveySnapshot = await getDocs(surveyQuery);
      
      const surveyResponses = {};
      surveySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.responses) {
          Object.assign(surveyResponses, data.responses);
        }
      });
      
      // Get couple check-in data
      const checkInQuery = query(
        collection(db, "coupleCheckIns"),
        where("familyId", "==", familyId)
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
        relationship: {
          strategies: relationshipData.strategies || [],
          checkIns: checkInData
        },
        survey: {
          responses: surveyResponses
        },
        tasks: familyData.tasks || []
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

  // Get task recommendations with AI
  async getTaskRecommendations(familyId, weekNumber) {
    try {
      const context = await this.getFamilyContext(familyId);
      
      const systemPrompt = `You are Allie's AI Task Engine. Your job is to recommend personalized tasks to help balance family workload.
      
      Based on the family data provided, generate 6 specific tasks:
      - 3 tasks for each parent (Mama and Papa)
      - Focus on areas with the greatest imbalance
      - Include a mixture of visible and invisible work
      - Each task should be specific, actionable, and achievable within a week
      - Include an AI insight explaining why this task matters
      
      Your response should be in valid JSON format with this structure:
      {
        "tasks": [
          {
            "id": "week${weekNumber}-1",
            "title": "Task title",
            "description": "Detailed task description",
            "assignedTo": "Mama or Papa",
            "assignedToName": "Mama or Papa",
            "focusArea": "Category name",
            "category": "Task category",
            "aiInsight": "Why this task matters",
            "isAIGenerated": true,
            "taskType": "ai", 
            "subTasks": [
              {
                "id": "week${weekNumber}-1-1",
                "title": "Subtask title",
                "description": "Subtask description"
              }
            ]
          }
        ]
      }`;
      
      const userMessage = `Generate personalized tasks for Week ${weekNumber} based on this family data: ${JSON.stringify(context)}`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response
      return JSON.parse(response).tasks;
    } catch (error) {
      console.error("Error getting AI task recommendations:", error);
      throw error;
    }
  }

  // Get relationship insights with AI
  async getRelationshipInsights(familyId) {
    try {
      const context = await this.getFamilyContext(familyId);
      
      const systemPrompt = `You are Allie's Relationship AI. Your job is to provide personalized insights to strengthen the couple's relationship.
      
      Based on the family data provided, generate 3-4 specific insights about:
      - Relationship strengths to build on
      - Connection opportunities
      - Areas where balance is affecting relationship
      - Specific, actionable suggestions
      
      Your response should be in valid JSON format with this structure:
      {
        "insights": [
          {
            "id": "unique-id",
            "title": "Insight title",
            "category": "connection, workload, gratitude, or growth",
            "description": "Detailed insight with data-driven observation",
            "actionable": "Specific action suggestion",
            "researchBacked": "Brief research finding that supports this"
          }
        ]
      }`;
      
      const userMessage = `Generate relationship insights based on this family data: ${JSON.stringify(context)}`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response
      return JSON.parse(response).insights;
    } catch (error) {
      console.error("Error getting AI relationship insights:", error);
      throw error;
    }
  }

  // Generate personalized meeting agenda
  async generateMeetingAgenda(familyId, meetingType, weekNumber) {
    try {
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
      throw error;
    }
  }
}

export default new EnhancedAIService();