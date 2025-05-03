// src/services/ClaudeMobileService.js
/**
 * Mobile adaptation of the Claude-first approach for NLU
 * Implements the same architecture for the mobile experience
 */

import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// API endpoint for Claude
const CLAUDE_API_ENDPOINT = 'https://europe-west1-parentload-ba995.cloudfunctions.net/claude';

class ClaudeMobileService {
  constructor() {
    this.auth = auth;
    this.db = db;
    
    // These would be set in a real implementation
    this.model = 'claude-3-5-sonnet-20240620';
    this.authContext = {
      userId: null,
      familyId: null,
      timestamp: Date.now()
    };
    
    // Set auth context if user is already logged in
    if (auth.currentUser) {
      this.authContext.userId = auth.currentUser.uid;
    }
  }
  
  /**
   * Get response from Claude using Claude-first approach
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {Array} context - Previous messages for context
   * @returns {Promise<string>} Claude's response
   */
  async getResponse(message, familyId, context = []) {
    try {
      console.log("ClaudeMobileService processing:", message);
      
      if (!familyId) {
        console.warn("No familyId provided to getResponse");
        return "I need to know which family you're talking about. Please try again.";
      }
      
      // Update auth context
      this.authContext.familyId = familyId;
      if (auth.currentUser) {
        this.authContext.userId = auth.currentUser.uid;
      }
      
      // Get family context for personalization
      const familyContext = await this.getFamilyContext(familyId);
      
      // Step 1: Process message with Claude-first approach
      // This would call the processMessage method in a real implementation
      // For this demo, we'll skip directly to generating a response
      
      // Create comprehensive context for Claude
      const systemContext = this.createSystemContext(familyContext, context);
      
      // Generate response
      const response = await this.generateResponse(
        [{ role: 'user', content: message }],
        systemContext
      );
      
      return response;
    } catch (error) {
      console.error("Error in getResponse:", error);
      return "I'm sorry, I encountered an error processing your request. Please try again.";
    }
  }
  
  /**
   * Generate response from Claude API
   * @param {Array} messages - Conversation messages
   * @param {Object} systemContext - System context for Claude
   * @returns {Promise<string>} Claude's response
   */
  async generateResponse(messages, systemContext) {
    try {
      // In the real implementation, this would call the Claude API
      // For this demo, we'll return a mock response
      
      const mockResponses = {
        default: "I'm Allie, your family assistant. How can I help you today?",
        calendar: "I can help you with your calendar. Would you like to add an event or check your schedule?",
        task: "I can help you manage your tasks. Do you want to add a new task or check your existing ones?",
        provider: "I can help you with providers. Would you like to see your list of providers or add a new one?",
        relationship: "I can help you with relationship matters. Would you like to schedule some quality time together?",
        child: "I can help you with child-related matters. What would you like to know about your children?",
      };
      
      // Simple matching to determine which mock response to use
      const userMessage = messages[0].content.toLowerCase();
      
      if (userMessage.includes('calendar') || userMessage.includes('event') || userMessage.includes('schedule')) {
        return mockResponses.calendar;
      } else if (userMessage.includes('task') || userMessage.includes('todo') || userMessage.includes('to-do')) {
        return mockResponses.task;
      } else if (userMessage.includes('provider') || userMessage.includes('doctor') || userMessage.includes('babysitter')) {
        return mockResponses.provider;
      } else if (userMessage.includes('relationship') || userMessage.includes('partner') || userMessage.includes('date')) {
        return mockResponses.relationship;
      } else if (userMessage.includes('child') || userMessage.includes('kid') || userMessage.includes('baby')) {
        return mockResponses.child;
      }
      
      return mockResponses.default;
      
      // In the real implementation, we would call the Claude API like this:
      /*
      const response = await fetch(CLAUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          system: systemContext.system,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
      
      const data = await response.json();
      return data.content;
      */
    } catch (error) {
      console.error("Error generating response:", error);
      return "I'm sorry, I encountered an error communicating with Claude. Please try again.";
    }
  }
  
  /**
   * Get family context for personalization
   * @param {string} familyId - Family ID
   * @returns {Promise<Object>} Family context
   */
  async getFamilyContext(familyId) {
    try {
      // Get family document
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Basic context
        const contextData = {
          familyId: familyId,
          familyName: data.familyName,
          adults: data.familyMembers.filter(m => m.role === 'parent').length,
          children: data.familyMembers.filter(m => m.role === 'child'),
          familyMembers: data.familyMembers,
          currentWeek: data.currentWeek,
        };
        
        return contextData;
      }
      
      return {};
    } catch (error) {
      console.error("Error getting family context:", error);
      return {};
    }
  }
  
  /**
   * Create system context for Claude
   * @param {Object} familyContext - Family context
   * @param {Array} messageContext - Previous messages for context
   * @returns {Object} System context
   */
  createSystemContext(familyContext, messageContext = []) {
    // Create system context for Claude
    const systemContext = {
      system: `You are Allie, a thoughtful and insightful family assistant. 
      
You help families with balance, coordination, and organization.

FAMILY CONTEXT:
Family Name: ${familyContext.familyName || 'Your family'}
Adults: ${familyContext.adults || 2}
Children: ${familyContext.children?.length || 0}
Current Week: ${familyContext.currentWeek || 1}

KEY FAMILY MEMBERS:
${familyContext.familyMembers?.map(m => `- ${m.name} (${m.role})`).join('\n') || 'Your family members'}

IMPORTANT:
- Be conversational and friendly, not formal or robotic
- Keep responses concise (1-3 paragraphs) unless the user asks for detail
- Provide practical, actionable suggestions when appropriate
- Balance emotional support with practical organization
- Respect family privacy and be supportive of all family structures
- Ground your responses in the specific family context provided above
- Answer in first person as Allie, the family assistant
`,
      userId: this.authContext?.userId,
      familyId: familyContext.familyId,
      messageContext: messageContext.slice(-5) // Last 5 messages for context
    };
    
    return systemContext;
  }
}

export default new ClaudeMobileService();