// src/utils/ClaudeResponseHandler.js
import { safelyParseJSON, logError } from './errorHandling';

/**
 * Utility to handle Claude API responses and JSON parsing
 */
const ClaudeResponseHandler = {
  /**
   * Process a Claude API response with enhanced error handling
   * @param {String} responseText - Raw text response from Claude API
   * @param {Object} defaultValue - Default value to return if parsing fails
   * @param {Object} context - Error context information
   * @returns {Object} - Parsed JSON or default value
   */
  processResponse: (responseText, defaultValue = {}, context = {}) => {
    if (!responseText || typeof responseText !== 'string') {
      logError(new Error("Empty or invalid Claude response"), {
        location: context.location || "ClaudeResponseHandler",
        responsePreview: responseText ? 
          (typeof responseText === 'string' ? responseText.substring(0, 100) : typeof responseText) : 
          'null'
      });
      return defaultValue;
    }
    
    // Extract JSON from the response - Claude sometimes includes markdown or text outside the JSON
    let jsonContent = responseText;
    
    // Check for markdown code blocks
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonContent = jsonBlockMatch[1].trim();
    }
    
    // Try to parse the JSON
    const result = safelyParseJSON(jsonContent, null);
    
    if (result) {
      return result;
    }
    
    // If parsing failed, log with detailed context
    logError(new Error("Failed to parse Claude API response"), {
      location: context.location || "ClaudeResponseHandler",
      responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
      context
    });
    
    return defaultValue;
  },

  /**
   * Safely handle Claude API requests with enhanced error handling
   * @param {Function} requestFn - Function that makes the Claude API request
   * @param {Object} defaultValue - Default value to return on error
   * @param {Object} context - Error context information
   * @returns {Promise} - Parsed response or default value
   */
  safeRequest: async (requestFn, defaultValue = {}, context = {}) => {
    try {
      // Set a timeout for Claude API requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Claude API request timed out")), 20000)
      );
      
      // Race the request against the timeout
      const response = await Promise.race([
        requestFn(),
        timeoutPromise
      ]);
      
      // Process the response
      return ClaudeResponseHandler.processResponse(response, defaultValue, context);
    } catch (error) {
      logError(error, {
        ...context,
        location: context.location || "ClaudeResponseHandler.safeRequest"
      });
      
      return defaultValue;
    }
  },

  /**
   * Get usable fallback content when Claude API fails
   * @param {String} contentType - Type of content needed
   * @param {Object} context - Additional context for customizing fallback
   * @returns {Object} - Fallback content object
   */
  getFallbackContent: (contentType, context = {}) => {
    // Default fallbacks for common content types
    const fallbacks = {
      tasks: [
        {
          id: `${context.weekNumber || 1}-1`,
          title: `Task Planning`,
          description: "Take charge of planning family tasks for the week",
          assignedTo: "Papa",
          assignedToName: "Papa",
          focusArea: "Family Planning",
          category: "Invisible Household Tasks",
          aiInsight: "Planning is often an invisible task that creates mental load. Taking it on can significantly improve workload balance.",
          isAIGenerated: true,
          subTasks: [
            {
              id: `${context.weekNumber || 1}-1-1`,
              title: "Create weekly plan",
              description: "Plan tasks for each day of the week"
            },
            {
              id: `${context.weekNumber || 1}-1-2`,
              title: "Assign responsibilities",
              description: "Determine who will handle each task"
            }
          ]
        },
        {
          id: `${context.weekNumber || 1}-2`,
          title: `Homework Support`,
          description: "Take a more active role in children's schoolwork",
          assignedTo: "Mama",
          assignedToName: "Mama",
          focusArea: "Education",
          category: "Parental Tasks",
          aiInsight: "Sharing educational responsibility builds stronger parent-child bonds.",
          isAIGenerated: true,
          subTasks: [
            {
              id: `${context.weekNumber || 1}-2-1`,
              title: "Review assignments",
              description: "Check homework assignments for the week"
            },
            {
              id: `${context.weekNumber || 1}-2-2`,
              title: "Create study schedule",
              description: "Help organize study time"
            }
          ]
        }
      ],
      insights: [
        {
          title: "Workload Balance",
          category: "Household Tasks",
          description: "Consider reviewing how household tasks are divided to ensure fair distribution of responsibilities.",
          actionItem: "Create a shared task list that both partners contribute to equally."
        },
        {
          title: "Family Communication",
          category: "Relationship",
          description: "Regular family meetings can improve coordination and reduce misunderstandings.",
          actionItem: "Schedule a 15-minute weekly check-in to discuss upcoming responsibilities."
        }
      ],
      agenda: {
        introduction: "Let's review our progress and plan for the coming week.",
        timeEstimate: "30 minutes",
        sections: [
          {
            title: "Celebrate Wins",
            items: ["Review completed tasks", "Acknowledge progress made"],
            notes: "Start with positives"
          },
          {
            title: "Discuss Challenges",
            items: ["Identify obstacles", "Brainstorm solutions"],
            notes: "Focus on solutions"
          }
        ],
        discussionQuestions: [
          "What went well this week?",
          "What could we improve next week?"
        ],
        closingThoughts: "Remember that balance is an ongoing process."
      },
      relationshipInsights: [
        {
          id: "default-1",
          title: "Communication",
          description: "Regular check-ins help maintain connection.",
          actionable: "Try a daily 5-minute check-in this week.",
          category: "connection"
        },
        {
          id: "default-2",
          title: "Appreciation",
          description: "Expressing gratitude strengthens bonds.",
          actionable: "Share one appreciation daily.",
          category: "gratitude"
        }
      ]
    };
    
    return fallbacks[contentType] || {};
  }
};

export default ClaudeResponseHandler;