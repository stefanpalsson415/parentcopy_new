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

  formatSystemPrompt(familyContext) {
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
    
    You can help with:
    1. Explaining how to use the Allie app
    2. Providing insights about family survey results
    3. Offering research-backed parenting advice
    4. Suggesting ways to improve family balance
    5. Answering questions about the app's mission and methodology
    
    Always be supportive, practical, and focused on improving family dynamics through better balance.
    Remember that all data is confidential to this family.
    
    In your responses:
    - Be concise but friendly
    - Provide practical, actionable advice whenever possible
    - Focus on equity and balance rather than "traditional" gender roles
    - Remember that "balance" doesn't always mean a perfect 50/50 split
    - Encourage communication between family members`;
  }
}

export default new ClaudeService();