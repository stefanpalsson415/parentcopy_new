// src/services/ClaudeService.js
class ClaudeService {
  constructor() {
    this.proxyUrl = 'http://localhost:3001/api/claude';
    this.model = 'claude-3-haiku-20240307'; // Using a more cost-effective model
    this.mockMode = false; // Explicitly disable mock mode
    
    console.log("Claude service initialized to use local proxy server");
  }
  
  async generateResponse(messages, context) {
    try {
      // Format system prompt with family context
      const systemPrompt = this.formatSystemPrompt(context || {});
      
      // Log for debugging
      console.log("Claude API request via proxy:", { 
        messagesCount: messages.length, 
        systemPromptLength: systemPrompt.length,
        model: this.model,
        mockMode: this.mockMode
      });
      
      // Get the last user message
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      
      // Prepare request payload for Claude API
      const payload = {
        model: this.model,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: lastUserMessage
          }
        ],
        system: systemPrompt
      };
      
      // Add a timeout to the API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Make the API call through our proxy server
      console.log("Attempting to connect to proxy at:", this.proxyUrl);
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn("Claude proxy returned error status:", response.status);
        // Instead of throwing, return a personalized response
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      const result = await response.json();
      
      // Check for valid response
      if (!result || !result.content || !result.content[0]) {
        console.error("Invalid response format from Claude API:", result);
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      return result.content[0].text;
    } catch (error) {
      console.error("Error in Claude API call:", error);
      
      // Fall back to personalized response on failure
      return this.createPersonalizedResponse(
        messages[messages.length - 1]?.content || "", 
        context
      );
    }
  }
  
  // Test Hello World function
  async testHelloWorld() {
    try {
      console.log("Testing Hello World function via proxy...");
      
      // Simple test to check API connectivity through proxy
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: "Say hello world!"
            }
          ],
          system: "You are a helpful assistant that responds with just 'Hello World!'"
        })
      });
      
      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        message: "Claude API connection via proxy successful!",
        content: result.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Detailed error in Hello World test:", error);
      throw error;
    }
  }
  
  // Create personalized response from context
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
  
  // Format system prompt with family context
  formatSystemPrompt(familyContext) {
    // Log the context data for debugging
    console.log("Formatting system prompt with context:", Object.keys(familyContext));
    
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
    
    // Create relationship strategies section
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