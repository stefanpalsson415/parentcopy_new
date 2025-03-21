// src/services/ClaudeService.js
import { getFunctions, httpsCallable } from 'firebase/functions';

class ClaudeService {
  constructor() {
    try {
      const functions = getFunctions();
      this.claudeProxy = httpsCallable(functions, 'claudeProxy');
      this.useServerProxy = true;
    } catch (error) {
      console.error("Error initializing Firebase Functions:", error);
      this.useServerProxy = false;
      
      // Fallback to direct API (NOT RECOMMENDED FOR PRODUCTION)
      this.API_URL = 'https://api.anthropic.com/v1/messages';
      this.API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;
    }
  }

  async generateResponse(messages, familyContext) {
    try {
      // Format system prompt with family context
      const systemPrompt = this.formatSystemPrompt(familyContext);
      
      if (this.useServerProxy) {
        // Call the secure Cloud Function
        const result = await this.claudeProxy({
          system: systemPrompt,
          messages: messages
        });
        
        // Extract the response based on the shape of the function result
        return result.data.content[0].text;
      } else {
        // FALLBACK: Direct API call (FOR DEVELOPMENT ONLY)
        // WARNING: This exposes your API key in client-side code
        console.warn("Using direct API call - not recommended for production!");
        
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: "claude-3-7-sonnet-20240307",
            max_tokens: 1000,
            system: systemPrompt,
            messages: messages
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
      }
    } catch (error) {
      console.error("Error calling Claude API:", error);
      return "I'm having trouble connecting to my servers. Please try again later.";
    }
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
    
    ${familyContext.surveyData ? `
    Survey Data:
    Total Questions: ${familyContext.surveyData.totalQuestions || 0}
    Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
    Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%
    ` : ''}
    
    ${knowledgeBaseContent}
    
    ${relationshipContent}
    
    ${marketingContent}
    
    ${faqContent}
    
    You can help with:
    1. Explaining how to use the Allie app
    2. Providing insights about family survey results
    3. Offering research-backed parenting advice
    4. Suggesting ways to improve family balance
    5. Answering questions about the app's mission and methodology
    6. Giving relationship advice based on the 10 strategies
    7. Connecting workload balance to relationship health
    
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