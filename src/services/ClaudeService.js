// src/services/ClaudeService.js
import { getFunctions, httpsCallable } from 'firebase/functions';

class ClaudeService {
  constructor() {
    // Force direct API mode
    this.useServerProxy = false;
    this.API_URL = 'https://api.anthropic.com/v1/messages';
    this.API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
    console.log("Claude service initialized in direct API mode");
  }
  

  async generateResponse(messages, familyContext) {
    try {
      // Format system prompt with family context
      const systemPrompt = this.formatSystemPrompt(familyContext || {});
      
      // Log for debugging
      console.log("Claude API request:", { 
        messagesCount: messages.length, 
        systemPromptLength: systemPrompt.length,
        useServerProxy: this.useServerProxy
      });
      
      if (this.useServerProxy) {
        // Call the secure Cloud Function
        console.log("Using Firebase Function to call Claude API");
        
        // Add a timeout to the API call
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timed out")), 30000)
        );
        
        const result = await Promise.race([
          this.claudeProxy({
            system: systemPrompt,
            messages: messages
          }),
          timeoutPromise
        ]);
        
        // Check for valid response
        if (!result || !result.data || !result.data.content || !result.data.content[0]) {
          console.error("Invalid response format from Claude proxy:", result);
          throw new Error("Invalid response format from Claude proxy");
        }
        
        return result.data.content[0].text;
      } else {
        // IMPLEMENT DIRECT API CALL
        console.log("Making direct API call to Claude API");
        
        // Prepare the request body
        const requestBody = {
          model: "claude-3-7-sonnet-20240219",
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages
        };
        
        console.log("API URL:", this.API_URL);
        console.log("Request body:", JSON.stringify(requestBody).substring(0, 200) + "...");
        
        // Make the API call
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Claude API error: ${response.status}`, errorText);
          throw new Error(`Claude API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Claude API response received:", result);
        
        // Extract the text from the response
        if (!result || !result.content || !result.content[0]) {
          console.error("Invalid response format from Claude API:", result);
          throw new Error("Invalid response format from Claude API");
        }
        
        return result.content[0].text;
      }
    } catch (error) {
      console.error("Error calling Claude API:", error);
      console.error("Error details:", error.message, error.stack);
      
      // For debugging - log the family context keys
      if (familyContext) {
        console.log("Family context keys:", Object.keys(familyContext));
        console.log("Context size:", JSON.stringify(familyContext).length);
      }
      
      // Still fall back to local responses if all else fails
      if (familyContext && Object.keys(familyContext).length > 3) {
        console.log("Falling back to local personalized response");
        return this.createPersonalizedResponse(messages[messages.length - 1]?.content || "", familyContext);
      }
      
      return this.getContextualResponse(messages[messages.length - 1]?.content || "", familyContext);
    }
  }
  
  // Add this new method to create personalized responses
  createPersonalizedResponse(userMessage, context) {
    const userMessageLower = userMessage.toLowerCase();
    
    // Get family name
    const familyName = context.familyName || "your family";
    
    // Try to give responses based on actual data
    if (userMessageLower.includes("survey") || userMessageLower.includes("result")) {
      if (context.surveyData && context.surveyData.mamaPercentage) {
        return `Based on your family's survey data, Mama is currently handling about ${context.surveyData.mamaPercentage.toFixed(1)}% of tasks overall, while Papa is handling ${(100 - context.surveyData.mamaPercentage).toFixed(1)}%. Would you like me to break this down by category?`;
      }
    }
    
    if (userMessageLower.includes("task") || userMessageLower.includes("what") && userMessageLower.includes("do")) {
      if (context.tasks && context.tasks.length > 0) {
        const pendingTasks = context.tasks.filter(t => !t.completed);
        if (pendingTasks.length > 0) {
          return `The ${familyName} family currently has ${pendingTasks.length} pending tasks. The next task due is "${pendingTasks[0].title}" assigned to ${pendingTasks[0].assignedTo}. Would you like more details about this task?`;
        }
      }
    }
    
    if (userMessageLower.includes("balance") || userMessageLower.includes("imbalance")) {
      if (context.balanceScores && context.balanceScores.categoryBalance) {
        const mostImbalanced = Object.entries(context.balanceScores.categoryBalance)
          .sort((a, b) => b[1].imbalance - a[1].imbalance)[0];
        
        if (mostImbalanced) {
          return `The greatest imbalance in the ${familyName} family is in ${mostImbalanced[0]}, with a ${mostImbalanced[1].imbalance.toFixed(1)}% difference. ${mostImbalanced[1].mama > mostImbalanced[1].papa ? "Mama" : "Papa"} is currently handling most of these tasks.`;
        }
      }
    }
    
    // If we can't give a specific response based on data, default to something generic but personalized
    return `I have access to the ${familyName} family's data and can answer specific questions about your survey results, tasks, and balance metrics. What would you like to know?`;
  }
  
  // Add this new method for better fallback responses
  getContextualResponse(userMessage, context) {
    const userMessageLower = userMessage.toLowerCase();
    
    // Greeting patterns
    if (userMessageLower.match(/^(hi|hello|hey|greetings)/)) {
      return `Hello! I'm Allie, your family balance assistant. How can I help you today?`;
    }
    
    // Questions about the app or features
    if (userMessageLower.includes("how do you work") || userMessageLower.includes("what can you do")) {
      return "I can help you understand your family balance data, explain tasks, provide insights on workload distribution, and offer suggestions for improving balance. What would you like to know about?";
    }
    
    // Questions about tasks
    if (userMessageLower.includes("task") || userMessageLower.includes("to do")) {
      return "Your tasks are designed to balance family workload. Each one is carefully selected based on your survey data to address specific imbalances. Check the Tasks tab to see what's currently assigned to you.";
    }
    
    // Questions about balance
    if (userMessageLower.includes("balance") || userMessageLower.includes("workload")) {
      return "Family balance is about equitably sharing both visible work (like cleaning) and invisible work (like planning). Your dashboard shows your current balance across these categories, and your tasks help improve areas where there's imbalance.";
    }
    
    // Default response that feels more personalized
    return "I'd like to help with that! Currently, I'm using my basic knowledge to respond. For more personalized assistance, please check the Tasks or Dashboard tabs where I've already analyzed your family's specific data.";
  }
  
  // Add this new method to provide useful responses even when API is down
  getMockResponse(userMessage) {
    // Check if the message contains common keywords and return appropriate responses
    const userMessageLower = userMessage.toLowerCase();
    
    if (userMessageLower.includes("help") || userMessageLower.includes("what can you do")) {
      return "I can help with questions about family workload balance, explain how the app works, and provide insights about your survey results. What would you like to know?";
    }
    
    if (userMessageLower.includes("task") || userMessageLower.includes("balance")) {
      return "Balancing family tasks is about creating fair distribution of both visible and invisible work. The Allie app helps track these responsibilities and suggests ways to improve balance over time.";
    }
    
    if (userMessageLower.includes("relationship") || userMessageLower.includes("partner")) {
      return "Research shows that balanced household responsibilities lead to stronger relationships. When both partners feel the workload is fair, relationship satisfaction typically improves.";
    }
    
    // Default response for any other question
    return "I'd normally connect to my AI system to answer this question in detail. While that connection is being restored, you can explore the dashboard for insights or check your tasks for this week.";
  }

  // Find and update the formatSystemPrompt method (around line 67-96)
formatSystemPrompt(familyContext) {
  // Get knowledge base if available
  const kb = familyContext.knowledgeBase || {};
  
  // Create knowledge base section
  let knowledgeBaseContent = '';
  if (kb.whitepapers) {
    knowledgeBaseContent = `
    === ALLIE KNOWLEDGE BASE ===
    
    TASK CATEGORIES:
    - Visible Household: ${kb.whitepapers.taskCategories?.visibleHousehold || ''}
    - Invisible Household: ${kb.whitepapers.taskCategories?.invisibleHousehold || ''}
    - Visible Parental: ${kb.whitepapers.taskCategories?.visibleParental || ''}
    - Invisible Parental: ${kb.whitepapers.taskCategories?.invisibleParental || ''}
    
    RESEARCH FINDINGS:
    - Mental Load: ${kb.whitepapers.research?.mentalLoad || ''}
    - Relationship Impact: ${kb.whitepapers.research?.relationshipImpact || ''}
    - Child Development: ${kb.whitepapers.research?.childDevelopment || ''}
    
    METHODOLOGY:
    - Task Weighting: ${kb.whitepapers.methodology?.taskWeighting || ''}
    - Improvement Framework: ${kb.whitepapers.methodology?.improvementFramework || ''}
    
Calendar Integration Knowledge:
Allie supports calendar integration with:
1. Google Calendar - requires sign-in through settings
2. Apple Calendar - available on macOS devices 
3. ICS downloads - works with any calendar system

Users can add tasks to their calendar by:
- Clicking the "Add to Calendar" button on any task
- Asking you to add a specific task to their calendar
- Setting up automatic calendar sync in Settings > Calendar

When users ask about adding something to their calendar, explain the options
and direct them to Settings > Calendar if needed for setup.


    PARENTING STRATEGIES:
    1. Positive Reinforcement: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.research || ''}
    
    2. Responsibility Development: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.research || ''}
    
    3. Emotional Support: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.research || ''}
    
    4. Integrated Approach: ${kb.whitepapers.parentingStrategies?.integratedApproach?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.integratedApproach?.research || ''}
    `;
  }

  // Create FAQ section if available
  let faqContent = '';
  if (kb.faqs) {
    faqContent = '\n=== FREQUENTLY ASKED QUESTIONS ===\n';
    Object.entries(kb.faqs).forEach(([question, answer]) => {
      faqContent += `Q: ${question}\nA: ${answer}\n\n`;
    });
  }
  
  // Add marketing statements if available
  let marketingContent = '';
  if (kb.marketing) {
    marketingContent = '\n=== KEY BENEFITS ===\n';
    if (kb.marketing.valueProps) {
      kb.marketing.valueProps.forEach(prop => {
        marketingContent += `- ${prop}\n`;
      });
    }
  }
  
    // NEW: Create relationship strategies section
    let relationshipContent = '';
    if (familyContext.relationshipData) {
      relationshipContent = `
      === RELATIONSHIP STRATEGIES ===
      
      These 10 key relationship strategies strengthen the parental bond:
      1. Brief Daily Check-ins: 5-10 minutes of connection each day
      2. Divide and Conquer Tasks: Clear role assignment for responsibilities
      3. Regular Date Nights: Dedicated couple time at least monthly
      4. Practice Gratitude & Affirmation: Regular appreciation expressions
      5. Create a Unified Family Calendar: Shared scheduling system
      6. Collaborative Problem-Solving: Structured approach to challenges
      7. Prioritize Self-Care: Ensuring "me time" for each parent
      8. Consider Couples Workshops: Professional guidance when needed
      9. Celebrate Milestones Together: Acknowledging achievements
      10. Shared Future Planning: Joint vision for family direction
      
      Current Implementation Status:
      - Average implementation: ${familyContext.relationshipData.avgImplementation?.toFixed(0) || 0}%
      - Most implemented strategy: ${familyContext.relationshipData.topStrategy || 'None'}
      - Number of well-implemented strategies: ${familyContext.relationshipData.implementedStrategies?.length || 0}
      `;
      
      if (familyContext.coupleData && familyContext.coupleData.satisfaction) {
        relationshipContent += `
      Latest Couple Data:
      - Satisfaction level: ${familyContext.coupleData.satisfaction}/5
      - Communication quality: ${familyContext.coupleData.communication}/5
      `;
      }
    }
    
    // Create a context-rich system prompt
return `You are Allie, an AI assistant specialized in family workload balance. 
Your purpose is to help families distribute responsibilities more equitably and improve their dynamics.

Family Information:
Family Name: ${familyContext.familyName || 'Unknown'}
Number of Adults: ${familyContext.adults || 2}
Number of Children: ${familyContext.children?.length || 0}
Current Week: ${familyContext.currentWeek || 1}
Family ID: ${familyContext.familyId || 'Unknown'}

${familyContext.familyMembers ? `
Family Members:
${familyContext.familyMembers.map(m => `- ${m.name}: ${m.role} (${m.roleType || 'Child'})`).join('\n')}
` : ''}

${familyContext.surveyData ? `
Survey Data:
Total Questions: ${familyContext.surveyData.totalQuestions || 0}
Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%

Category Breakdown:
${Object.entries(familyContext.surveyData.categories || {}).map(([category, data]) => 
  `- ${category}: Mama ${data.mamaPercent?.toFixed(1) || 0}%, Papa ${data.papaPercent?.toFixed(1) || 0}%`
).join('\n')}
` : ''}

${familyContext.tasks && familyContext.tasks.length > 0 ? `
Current Tasks:
${familyContext.tasks.map(task => 
  `- "${task.title}" assigned to ${task.assignedTo} (${task.completed ? 'Completed' : 'Pending'}): ${task.description}`
).join('\n')}
` : ''}

${familyContext.impactInsights && familyContext.impactInsights.length > 0 ? `
Family Insights:
${familyContext.impactInsights.map(insight => 
  `- ${insight.type || 'Insight'} for ${insight.category || 'Family'}: ${insight.message}`
).join('\n')}
` : ''}

${familyContext.balanceScores ? `
Current Balance Scores:
- Overall Balance: Mama ${familyContext.balanceScores.overallBalance?.mama?.toFixed(1) || 50}%, Papa ${familyContext.balanceScores.overallBalance?.papa?.toFixed(1) || 50}%
${Object.entries(familyContext.balanceScores.categoryBalance || {}).map(([category, scores]) => 
  `- ${category}: Mama ${scores.mama?.toFixed(1) || 0}%, Papa ${scores.papa?.toFixed(1) || 0}%, Imbalance: ${scores.imbalance?.toFixed(1) || 0}%`
).join('\n')}
` : ''}

${knowledgeBaseContent}

${relationshipContent}

${marketingContent}

${faqContent}

${familyContext.surveyData && familyContext.surveyData.responses ? `
IMPORTANT: You have access to detailed survey responses for this family. When asked about specific tasks or categories, reference this data to provide personalized insights rather than general information.
` : ''}

You can help with:
1. Explaining how to use the Allie app
2. Providing insights about family survey results
3. Offering research-backed parenting advice
4. Suggesting ways to improve family balance
5. Answering questions about the app's mission and methodology
6. Giving relationship advice based on the 10 strategies
7. Connecting workload balance to relationship health
8. Adding tasks and meetings to calendars
9. Managing calendar integrations
10. Analyzing their specific survey data and tasks

Always be supportive, practical, and focused on improving family dynamics through better balance.
Remember that all data is confidential to this family.

In your responses:
- Be concise but friendly
- Provide practical, actionable advice whenever possible
- Focus on equity and balance rather than "traditional" gender roles
- Remember that "balance" doesn't always mean a perfect 50/50 split
- Encourage communication between family members
- When mentioning research or scientific findings, refer to the studies in the knowledge base
- Suggest appropriate relationship strategies when workload issues arise`;
    
}
}

export default new ClaudeService();