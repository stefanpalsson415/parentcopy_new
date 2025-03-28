// src/services/AllieAIEngineService.js

import ClaudeService from './ClaudeService';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

class AllieAIEngineService {
  // Generate personalized tasks based on survey data
  async generatePersonalizedTasks(familyId, currentWeek, previousTasks = []) {
    try {
      // Get family data
      const familyData = await this.getFamilyData(familyId);
      
      // Get survey responses and full question set
      const surveyResponses = await this.getSurveyResponses(familyId);
      const fullQuestionSet = await this.getFullQuestionSet();
      
      // Combine responses with question metadata for better insights
      const enhancedResponses = this.enhanceResponsesWithMetadata(surveyResponses, fullQuestionSet);
      
      // Analyze previous tasks
      const previousTasksAnalysis = this.analyzePreviousTasks(previousTasks);
      
      // ...rest of function...
      
      // Create prompt for Claude
      const systemPrompt = `You are Allie, an AI designed to create personalized family task recommendations to improve workload balance.
      
      Family Information:
      Family Name: ${familyData.familyName}
      Parents: ${JSON.stringify(familyData.parents)}
      Children: ${JSON.stringify(familyData.children)}
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
      
      // Parse JSON response
      const responseData = JSON.parse(claudeResponse);
      
      return responseData.tasks;
    } catch (error) {
      console.error("Error generating personalized tasks:", error);
      
      // Fallback tasks if AI fails
      return this.getFallbackTasks(currentWeek, familyId);
    }
  }
  
  // Generate dashboard insights based on survey data
  async generateDashboardInsights(familyId, currentWeek) {
    try {
      // Get family data and survey responses
      const familyData = await this.getFamilyData(familyId);
      const surveyResponses = await this.getSurveyResponses(familyId);
      
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
      ${JSON.stringify(familyData)}
      
      Current Survey Results:
      ${JSON.stringify(surveyResponses)}
      
      ${previousWeekData ? `Previous Week Data: ${JSON.stringify(previousWeekData)}` : ''}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response
      const responseData = JSON.parse(claudeResponse);
      
      return responseData.insights;
    } catch (error) {
      console.error("Error generating dashboard insights:", error);
      
      // Fallback insights if AI fails
      return this.getFallbackInsights();
    }
  }
  
// Generate relationship insights based on all available data
async generateRelationshipInsights(familyId, currentWeek, relationshipData, strategies, checkInData) {
  try {
    if (!familyId) throw new Error("No family ID available");
    
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
    ${JSON.stringify(relationshipData)}
    
    Strategy Implementation:
    ${JSON.stringify(strategies)}
    
    Check-in Responses:
    ${JSON.stringify(checkInData)}
    
    Current Week: ${currentWeek}`;
    
    // Call Claude API
    const claudeResponse = await ClaudeService.generateResponse(
      [{ role: 'user', content: userMessage }],
      { system: systemPrompt }
    );
    
    // Parse JSON response
    const responseData = JSON.parse(claudeResponse);
    
    return responseData.insights;
  } catch (error) {
    console.error("Error generating relationship insights:", error);
    return null;
  }
}



// Process relationship feedback to improve AI recommendations
async processRelationshipFeedback(familyId, weekNum, memberId, relationshipResponses) {
  try {
    if (!familyId) throw new Error("No family ID available");
    
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
    
    // Optionally: Immediately update any AI models or recommendations
    // This could trigger a re-evaluation of strategies or insights
    
    return true;
  } catch (error) {
    console.error("Error processing relationship feedback:", error);
    return false;
  }
}

// Generate feedback on couple check-in responses
async generateCoupleCheckInFeedback(familyId, weekNumber, checkInData) {
  try {
    if (!familyId) throw new Error("No family ID available");
    
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
    
    // Parse JSON response
    const responseData = JSON.parse(claudeResponse);
    
    return responseData;
  } catch (error) {
    console.error("Error generating couple check-in feedback:", error);
    return null;
  }
}

  // Generate family meeting agenda
  async generateFamilyMeetingAgenda(familyId, weekNumber) {
    try {
      // Get family data
      const familyData = await this.getFamilyData(familyId);
      
      // Get completed tasks for the week
      const tasks = await this.getWeekTasks(familyId, weekNumber);
      const completedTasks = tasks.filter(task => task.completed);
      
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
      ${JSON.stringify(familyData)}
      
      Completed Tasks:
      ${JSON.stringify(completedTasks)}
      
      Uncompleted Tasks:
      ${JSON.stringify(tasks.filter(task => !task.completed))}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse JSON response
      const responseData = JSON.parse(claudeResponse);
      
      return responseData.agenda;
    } catch (error) {
      console.error("Error generating family meeting agenda:", error);
      
      // Fallback agenda if AI fails
      return this.getFallbackAgenda(weekNumber);
    }
  }
  
  // Helper functions
  async getFamilyData(familyId) {
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Extract parents and children
      const parents = data.familyMembers.filter(m => m.role === 'parent').map(p => ({
        role: p.roleType,
        name: p.name
      }));
      
      const children = data.familyMembers.filter(m => m.role === 'child').map(c => ({
        name: c.name,
        age: c.age
      }));
      
      return {
        familyName: data.familyName,
        parents,
        children,
        currentWeek: data.currentWeek,
        priorities: data.priorities || {}
      };
    }
    
    return {};
  }
  
  async getSurveyResponses(familyId) {
    const surveySnapshot = await getDocs(
      query(collection(db, "surveyResponses"), where("familyId", "==", familyId))
    );
    
    const responses = {};
    surveySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.responses) {
        Object.assign(responses, data.responses);
      }
    });
    
    return responses;
  }
  
  async getWeekTasks(familyId, weekNumber) {
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().tasks || [];
    }
    
    return [];
  }
  

// Helper to enhance survey responses with question metadata
enhanceResponsesWithMetadata(responses, fullQuestionSet) {
  const enhanced = {};
  
  Object.entries(responses).forEach(([questionId, response]) => {
    // Find this question in the full set
    const questionData = fullQuestionSet.find(q => q.id === questionId);
    
    if (questionData) {
      enhanced[questionId] = {
        response,
        category: questionData.category,
        weight: questionData.totalWeight,
        text: questionData.text,
        // Add any other metadata that might be useful
      };
    } else {
      // If not found, just keep the response
      enhanced[questionId] = { response };
    }
  });
  
  return enhanced;
}

// Helper to get the full question set from SurveyContext
async getFullQuestionSet() {
  // This would ideally import directly from SurveyContext
  // For now, we'll use a simplified approach for illustration
  return this.fullQuestionSet || [];
}



  analyzePreviousTasks(tasks) {
    // Group tasks by type/category
    const tasksByType = {};
    tasks.forEach(task => {
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
  }
  
  // Fallback methods if AI generation fails
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

export default new AllieAIEngineService();