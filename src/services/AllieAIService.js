// src/services/AllieAIService.js
// Consolidated AI service combining EnhancedAIService and AllieAIEngineService

import ClaudeService from './ClaudeService';
import UnifiedParserService from './UnifiedParserService';
import ProviderService from './ProviderService';
import CalendarService from './CalendarService';
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
  orderBy,
  increment,
  serverTimestamp,
  limit,
  addDoc
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
// Replace the safelyParseJSON method in AllieAIService.js
safelyParseJSON(jsonString, defaultValue) {
  try {
    // Handle empty or null responses
    if (!jsonString || typeof jsonString !== 'string') {
      console.warn("Invalid input for JSON parsing:", jsonString);
      return defaultValue;
    }

    // NEW: Check if response contains markdown code blocks and extract the content
    const markdownJsonRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
    const markdownMatch = jsonString.match(markdownJsonRegex);
    if (markdownMatch && markdownMatch[1]) {
      console.log("Found JSON in markdown code block, extracting...");
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (markdownError) {
        console.warn("Error parsing JSON from markdown:", markdownError);
        // Continue with other parsing methods
      }
    }
    
    // Check if the response is a plain text insight rather than JSON
    if (jsonString.trim().startsWith("Here are") || 
        jsonString.trim().startsWith("Based on") ||
        jsonString.trim().startsWith("I can help")) {
      console.log("Received text response instead of JSON, creating structured format");
      
      // Extract meaningful content from the text
      const textLines = jsonString.split('\n').filter(line => line.trim().length > 0);
      
      // Create structured insights from text
      return {
        insights: [
          {
            title: "AI Analysis",
            type: "recommendation",
            content: textLines.slice(0, 3).join(' '),
            priority: "medium",
            childId: null
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
 * Generate balance impact data based on family history
 * @param {string} familyId - Family ID
 * @param {number} currentWeek - Current week number
 * @returns {Promise<Object>} Impact metrics object
 */
async generateBalanceImpactData(familyId, currentWeek) {
  try {
    console.log(`Generating balance impact data for family ${familyId}, week ${currentWeek}`);
    
    // First try to get family data for context - use the correct function name
    const familyData = await this.getFamilyContext(familyId);
    
    // Create a prompt for Claude to generate impact insights
    const systemPrompt = `You are Allie, a family balance assistant. Based on the family's data and progress,
    generate quantifiable impact metrics for their balance improvements.
    
    Return a JSON object with these fields:
    - timeSaved: Number of hours saved per week (0-10)
    - relationshipBoost: Relationship satisfaction percentage (0-100)
    - stressReduction: Stress reduction percentage (0-100)
    - completedHabits: Number of completed habits/tasks
    
    Base your estimates on:
    - Current week: ${currentWeek}
    - Completed tasks: ${familyData?.completedTasks?.length || 0}
    - Current balance scores: ${JSON.stringify(familyData?.weightedScores || {})}
    
    Be realistic but optimistic. The goal is to motivate the family by showing tangible benefits.`;
    
    // Call Claude API
    const impactResponse = await this.claudeService.generateResponse(
      [{ role: 'user', content: `Generate balance impact metrics for this family based on their progress through week ${currentWeek}.` }],
      { system: systemPrompt }
    );
    
    // Parse response - handle both direct JSON and text with JSON
    let impactData;
    try {
      // Try direct parsing
      impactData = JSON.parse(impactResponse);
    } catch (e) {
      // Extract JSON from text response
      const jsonMatch = impactResponse.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          impactData = JSON.parse(jsonMatch[0]);
        } catch (err) {
          console.error("Failed to parse impact data from response:", err);
          throw new Error("Invalid response format");
        }
      } else {
        throw new Error("Couldn't extract JSON from response");
      }
    }
    
    // Validate the data structure
    if (!impactData || typeof impactData !== 'object') {
      throw new Error("Invalid impact data structure");
    }
    
    // Ensure all required fields are present
    const defaultData = {
      timeSaved: Math.min(currentWeek, 10),
      relationshipBoost: 50 + Math.min(currentWeek * 5, 40),
      stressReduction: 40 + Math.min(currentWeek * 4, 35),
      completedHabits: familyData?.completedTasks?.length || Math.max(1, currentWeek * 2)
    };
    
    return {
      ...defaultData,
      ...impactData
    };
  } catch (error) {
    console.error("Error generating balance impact data:", error);
    // Return sensible defaults if we can't generate data
    return {
      timeSaved: Math.min(currentWeek, 5),
      relationshipBoost: 55,
      stressReduction: 45,
      completedHabits: currentWeek * 2
    };
  }
}

/**
 * Generate balance experiments for families to try
 * @param {string} familyId - Family ID
 * @param {Object} weightedScores - Family's weighted balance scores
 * @returns {Promise<Array>} Array of experiment objects
 */
async generateBalanceExperiments(familyId, weightedScores) {
  try {
    console.log(`Generating balance experiments for family ${familyId}`);
    
    // Get family context
    const familyData = await this.getFamilyDataForContext(familyId);
    
    // Create prompt for Claude to generate experiment ideas
    const systemPrompt = `You are Allie, a family balance assistant. Based on the family's data and current balance scores,
    suggest 3-4 specific experiments they could try to improve their balance.
    
    Return an array of experiment objects, each with:
    - title: Short, action-oriented title
    - description: Clear explanation of the experiment (1-2 sentences)
    - estimatedImpact: Projected impact if implemented (e.g., "May improve balance by ~7% in targeted categories")
    - difficulty: "easy", "moderate", or "challenging"
    - actionable: true (all experiments should be actionable)
    - targeted: true if targeting their most imbalanced category
    
    Most imbalanced categories: ${JSON.stringify(
      Object.entries(weightedScores?.categoryBalance || {})
        .sort((a, b) => Math.abs(b[1].imbalance) - Math.abs(a[1].imbalance))
        .slice(0, 2)
        .map(([category, data]) => ({ 
          category, 
          imbalance: Math.abs(data.imbalance), 
          dominant: data.mama > data.papa ? "Mama" : "Papa" 
        }))
    )}`;
    
    // Call Claude API
    const experimentsResponse = await this.claudeService.generateResponse(
      [{ role: 'user', content: `Based on this family's balance data, suggest experiments they could try to improve their balance.` }],
      { system: systemPrompt }
    );
    
    // Parse response - handle both direct JSON and text with JSON
    let experimentsData;
    try {
      // Try to find array pattern first
      const arrayMatch = experimentsResponse.match(/(\[[\s\S]*\])/);
      if (arrayMatch) {
        experimentsData = JSON.parse(arrayMatch[0]);
      } else {
        // Try parsing the whole response as JSON
        experimentsData = JSON.parse(experimentsResponse);
      }
    } catch (e) {
      console.error("Failed to parse experiments from response:", e);
      throw new Error("Invalid response format");
    }
    
    // Validate the experiments array
    if (!Array.isArray(experimentsData)) {
      throw new Error("Experiments data is not an array");
    }
    
    // Return the experiments
    return experimentsData;
  } catch (error) {
    console.error("Error generating balance experiments:", error);
    // Return default experiments if we can't generate data
    return [
      {
        title: "Weekly Role Reversal",
        description: "Switch roles for one day each cycle - the parent who usually handles meals tries childcare, and vice versa.",
        estimatedImpact: "May improve balance by ~7% in targeted categories",
        difficulty: "moderate",
        actionable: true
      },
      {
        title: "Shared Calendar Day",
        description: "Dedicate 30 minutes each Sunday to joint calendar review and habit planning for the cycle ahead.",
        estimatedImpact: "Can reduce invisible work imbalance by ~12%",
        difficulty: "easy",
        actionable: true
      },
      {
        title: "Mental Load Shift",
        description: "Explicitly transfer responsibility for one 'invisible' household system (meal planning, gift buying, etc.) to the less-involved parent.",
        estimatedImpact: "Potential 15-20% improvement in invisible household category",
        difficulty: "challenging",
        actionable: true
      }
    ];
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

// In src/services/AllieAIService.js
extractProviderDetails(message) {
  try {
    // Start with empty details object
    const providerDetails = {
      name: null,
      type: 'education', // Default to education for teachers
      specialty: '',
      email: '',
      phone: '',
      address: '',
      notes: message // Keep original message as notes
    };
    
    console.log("Extracting provider details from:", message.substring(0, 100));
    
    // Extract provider name
    const namePatterns = [
      /(?:his|her) name is ([a-zA-Z\s]+)/i,
      /name is ([a-zA-Z\s]+)/i,
      /add (?:a|the) ([a-zA-Z\s]+) (?:teacher|instructor|doctor|therapist)/i,
      /add ([a-zA-Z\s]+) (?:as|to)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        providerDetails.name = match[1].trim();
        console.log("Found provider name:", providerDetails.name);
        break;
      }
    }
    
    // Determine provider type and specialty
    if (message.toLowerCase().includes("violin teacher") || 
        message.toLowerCase().includes("music teacher") ||
        message.toLowerCase().includes("teacher")) {
      providerDetails.type = "education";
      
      // Extract specific teacher type
      if (message.toLowerCase().includes("violin")) {
        providerDetails.specialty = "Violin Teacher";
      } else if (message.toLowerCase().includes("piano")) {
        providerDetails.specialty = "Piano Teacher";
      } else if (message.toLowerCase().includes("music")) {
        providerDetails.specialty = "Music Teacher";
      } else {
        providerDetails.specialty = "Teacher";
      }
    } else if (message.toLowerCase().includes("doctor") || 
               message.toLowerCase().includes("dr.") || 
               message.toLowerCase().includes("pediatrician")) {
      providerDetails.type = "medical";
      providerDetails.specialty = "Doctor";
    }
    
    // Extract email
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = message.match(emailPattern);
    if (emailMatches && emailMatches.length > 0) {
      providerDetails.email = emailMatches[0];
      console.log("Found email:", providerDetails.email);
    }
    
    // If we still don't have a name, make a best guess
    if (!providerDetails.name) {
      // Look for capitalized names
      const nameGuessPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/;
      const nameGuess = message.match(nameGuessPattern);
      if (nameGuess && nameGuess[1]) {
        providerDetails.name = nameGuess[1];
        console.log("Guessed provider name from capitalization:", providerDetails.name);
      }
    }
    
    // Add family member match if it appears to be for a child
    if (message.toLowerCase().includes("for ")) {
      const forPattern = /for\s+([a-zA-Z]+)/i;
      const forMatch = message.match(forPattern);
      if (forMatch && forMatch[1]) {
        providerDetails.forChild = forMatch[1];
        console.log("Provider appears to be for child:", providerDetails.forChild);
      }
    }
    
    // Log the extracted data
    console.log("Extracted provider details:", providerDetails);
    
    return providerDetails;
  } catch (error) {
    console.error("Error extracting provider details:", error);
    return {
      name: "Unknown Provider",
      type: "education",
      specialty: "Teacher",
      email: "",
      notes: message
    };
  }
}

// In src/services/AllieAIService.js
// Add or replace the processProviderFromChat method with this improved version

async processProviderFromChat(message, familyId) {
  try {
    if (!familyId) {
      console.error("Missing familyId in processProviderFromChat");
      return { success: false, error: "Family ID is required" };
    }
    
    console.log("⭐ DIAGNOSTIC: Processing provider request");
    console.log(`Message: "${message.substring(0, 100)}..."`);
    console.log(`Family ID: ${familyId}`);
    
    // Extract provider details from message
    const providerDetails = this.extractProviderDetails(message);
    
    // Ensure we have a valid name
    if (!providerDetails.name || providerDetails.name === "Unknown Provider") {
      console.error("Could not extract provider name from message");
      return { 
        success: false, 
        error: "I couldn't determine the provider's name. Please specify their name clearly." 
      };
    }
    
    // Add familyId to provider details
    providerDetails.familyId = familyId;
    
    // Log what we're about to do
    console.log(`Attempting to save provider "${providerDetails.name}" for family ${familyId}`);
    
    // SIMPLIFIED: Use a clean approach - import the service explicitly
    const { default: ProviderService } = await import('./ProviderService');
    
    // Save provider using the service
    const result = await ProviderService.saveProvider(familyId, providerDetails);
    
    console.log("Provider save result:", result);
    
    if (result.success) {
      // Force UI updates in case events aren't working properly
      if (typeof window !== 'undefined') {
        console.log("Dispatching UI refresh events");
        window.dispatchEvent(new CustomEvent('provider-added'));
        setTimeout(() => window.dispatchEvent(new CustomEvent('directory-refresh-needed')), 500);
      }
      
      return { 
        success: true, 
        providerId: result.providerId,
        providerDetails,
        isNew: true,
        message: `I've added ${providerDetails.name} to your provider directory.`
      };
    } else {
      throw new Error(result.error || "Failed to save provider");
    }
  } catch (error) {
    console.error("Error processing provider request:", error);
    
    // Better error recovery
    if (error.message?.includes("permission") || error.code === "permission-denied") {
      return { 
        success: false, 
        error: "I don't have permission to add providers to your directory. Please check your account settings." 
      };
    }
    
    return { 
      success: false, 
      error: "I encountered a technical issue while adding this provider. Please try again or add them directly through the Provider Directory." 
    };
  }
}


// In src/services/AllieAIService.js

/**
 * Special method to handle babysitter-specific requests
 * @param {string} message - The chat message
 * @param {string} familyId - Family ID
 * @param {string} childId - Optional child ID
 * @returns {Promise<object>} Result of babysitter creation
 */
async processBabysitterRequest(message, familyId, childId = null) {
  try {
    console.log("Processing babysitter request:", message);
    
    // Extract babysitter information from the message
    const babysitterInfo = {
      name: null,
      email: null,
      phone: null,
      childName: null,
      childId: childId
    };
    
    // Extract name using patterns
    const nameMatches = message.match(/name(?:\s+is)?\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i) || 
                         message.match(/([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:is|as)\s+(?:a|the)?\s+babysitter/i);
    
    if (nameMatches && nameMatches[1]) {
      babysitterInfo.name = nameMatches[1].trim();
    }
    
    // Extract email
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
    if (emailMatch && emailMatch[1]) {
      babysitterInfo.email = emailMatch[1];
    }
    
    // Extract phone number if present
    const phoneMatch = message.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch && phoneMatch[1]) {
      babysitterInfo.phone = phoneMatch[1];
    }
    
    // Extract child information if not provided
    if (!childId) {
      const childMatch = message.match(/for\s+([a-zA-Z]+)/i);
      if (childMatch && childMatch[1]) {
        babysitterInfo.childName = childMatch[1].trim();
        
        // Try to get child ID if family context is available
        try {
          const familyContext = await this.getFamilyContext(familyId);
          if (familyContext && familyContext.children) {
            const matchedChild = familyContext.children.find(
              child => child.name.toLowerCase() === babysitterInfo.childName.toLowerCase()
            );
            
            if (matchedChild) {
              babysitterInfo.childId = matchedChild.id;
            }
          }
        } catch (contextError) {
          console.warn("Error getting family context:", contextError);
        }
      }
    }
    
    // Prepare provider data for saving
    const providerData = {
      name: babysitterInfo.name,
      type: "childcare",
      specialty: "Babysitter",
      email: babysitterInfo.email || "",
      phone: babysitterInfo.phone || "",
      notes: babysitterInfo.childName ? `Babysitter for ${babysitterInfo.childName}` : "",
      childId: babysitterInfo.childId
    };
    
    console.log("Creating babysitter as provider:", providerData);
    
    // Use our provider processing logic to save the babysitter
    return await this.processProviderFromChat(message, familyId);
  } catch (error) {
    console.error("Error processing babysitter request:", error);
    return { success: false, error: error.message };
  }
}


// Enhanced version of processChildChat
async processChildChat(message, child, childData, familyId, contextData = null) {
  try {
    console.log("Processing child chat message:", message);
    
    // Check for direct action patterns first
    const actionResult = this.extractChildChatAction(message, child);
    if (actionResult) {
      return actionResult;
    }
    
    // Create a more detailed prompt with enhanced context
    const systemPrompt = `You are Allie, a helpful assistant for managing children's information and events.
    You are currently helping with a child named ${child.name}.
    
    CHILD INFORMATION:
    - Name: ${child.name}
    - Age: ${child?.age || 'Unknown'}
    - ID: ${child.id}
    
    CONTEXT FOR YOUR RESPONSE:
    ${contextData ? `
    - Recent events: ${contextData.recentEvents?.map(e => e.title).join(', ') || 'None'}
    - Missing information: ${contextData.missingInformation?.join(', ') || 'None'}
    ` : ''}
    
    GUIDELINES:
    1. ALWAYS focus your responses on ${child.name} specifically
    2. If you detect a request to add information or events, extract as many details as possible
    3. Keep responses brief and actionable
    4. When appropriate, suggest opening a specific form or taking a specific action
    5. Reference the 15 key details needed for different event types
    
    For medical appointments, key details include: date/time, doctor's name, location, insurance info, etc.
    For activities, key details include: schedule, location, equipment needed, transportation, etc.
    For special events, key details include: venue, guest list, theme, etc.
    
    IMPORTANT: If the user's message contains details about an event, return them in a structured format to auto-fill forms.`;
    
    // Call Claude API with specific child context
    const claudeResponse = await ClaudeService.generateResponse(
      [{ role: 'user', content: message }],
      { system: systemPrompt, childContext: { childId: child.id, childName: child.name } }
    );
    
    // Process the response to extract any actions or structured data
    const processedResponse = this.processChildResponse(claudeResponse, message, child);
    
    return processedResponse;
  } catch (error) {
    console.error("Error in processChildChat:", error);
    return {
      message: "I'm sorry, I encountered an error while processing your request. Could you try again?",
      error: error.message
    };
  }
}

// New helper method for extracting actions from child chat messages
extractChildChatAction(message, child) {
  const lowerMsg = message.toLowerCase();
  
  // Direct appointment scheduling pattern
  if ((lowerMsg.includes('schedule') || lowerMsg.includes('book') || lowerMsg.includes('make')) && 
      (lowerMsg.includes('appointment') || lowerMsg.includes('doctor') || lowerMsg.includes('dentist'))) {
    
    // Try to extract appointment type
    let appointmentType = 'checkup';
    if (lowerMsg.includes('dentist')) appointmentType = 'dentist';
    else if (lowerMsg.includes('eye') || lowerMsg.includes('vision')) appointmentType = 'eye exam';
    
    // Try to extract date
    let dateMatch = message.match(/on\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
    let dateStr = '';
    
    if (dateMatch) {
      const month = dateMatch[1];
      const day = dateMatch[2];
      const year = new Date().getFullYear();
      dateStr = `${month} ${day}, ${year}`;
    }
    
    return {
      message: `I'll help you schedule a ${appointmentType} appointment for ${child.name}${dateStr ? ` on ${dateStr}` : ''}. Let me open the appointment form for you.`,
      action: {
        type: 'openAppointmentForm',
        data: {
          title: `${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)}`,
          date: dateStr ? new Date(dateStr) : undefined,
          category: 'medical',
          eventType: 'appointment'
        }
      }
    };
  }
  
  // Growth recording pattern
  if ((lowerMsg.includes('growth') || lowerMsg.includes('height') || lowerMsg.includes('weight')) && 
      (lowerMsg.includes('record') || lowerMsg.includes('track') || lowerMsg.includes('add'))) {
    
    return {
      message: `Let's record ${child.name}'s growth measurements. I'll open the form for you.`,
      action: {
        type: 'openGrowthForm',
        data: {
          title: `Growth Measurement`,
          date: new Date(),
          category: 'growth',
          eventType: 'growth'
        }
      }
    };
  }
  
  // Activity/routine pattern
  if ((lowerMsg.includes('activity') || lowerMsg.includes('class') || lowerMsg.includes('practice') || lowerMsg.includes('lesson')) && 
      (lowerMsg.includes('add') || lowerMsg.includes('record') || lowerMsg.includes('schedule'))) {
    
    // Try to extract activity type
    let activityType = 'activity';
    if (lowerMsg.includes('soccer')) activityType = 'soccer practice';
    else if (lowerMsg.includes('swim')) activityType = 'swimming lesson';
    else if (lowerMsg.includes('piano') || lowerMsg.includes('music')) activityType = 'music lesson';
    
    return {
      message: `I'll help you add a ${activityType} for ${child.name}. Opening the activity form now.`,
      action: {
        type: 'openRoutineForm',
        data: {
          title: activityType.charAt(0).toUpperCase() + activityType.slice(1),
          category: 'activity',
          eventType: 'activity',
          isRecurring: true
        }
      }
    };
  }
  
  // No direct action detected
  return null;
}

// Helper to process Claude responses for child chat
processChildResponse(response, originalMessage, child) {
  // Default response structure
  const result = {
    message: response,
    action: null
  };
  
  // Check if there's structured data in the response (JSON format)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[0]);
      
      // If there's action data, extract it
      if (jsonData.action) {
        result.action = jsonData.action;
        
        // Clean up the message to remove the JSON
        result.message = response.replace(jsonMatch[0], '').trim();
      }
      
      // If there's extracted event data, use it
      if (jsonData.eventDetails) {
        result.action = {
          type: jsonData.eventDetails.category === 'medical' ? 'openAppointmentForm' : 
                jsonData.eventDetails.category === 'activity' ? 'openRoutineForm' : 
                'completeEventDetails',
          data: {
            ...jsonData.eventDetails,
            childId: child.id,
            childName: child.name
          }
        };
      }
    } catch (error) {
      console.warn("Failed to parse JSON from Claude response:", error);
    }
  }
  
  // If we couldn't extract an action but the message suggests one
  const lowerResponse = response.toLowerCase();
  
  if (!result.action) {
    if (lowerResponse.includes('appointment form') || lowerResponse.includes('schedule appointment')) {
      result.action = {
        type: 'openAppointmentForm',
        data: { childId: child.id }
      };
    } 
    else if (lowerResponse.includes('growth form') || lowerResponse.includes('record growth')) {
      result.action = {
        type: 'openGrowthForm',
        data: { childId: child.id }
      };
    }
    else if (lowerResponse.includes('activity form') || lowerResponse.includes('routine form')) {
      result.action = {
        type: 'openRoutineForm',
        data: { childId: child.id }
      };
    }
    else if (lowerResponse.includes('document') || lowerResponse.includes('upload')) {
      result.action = {
        type: 'openDocuments',
        data: { childId: child.id }
      };
    }
  }
  
  return result;
}



// In src/services/AllieAIService.js, add or replace the extractProviderDetails method
async extractProviderDetails(message) {
  try {
    console.log("Extracting provider details from message:", message);
    
    // Check for direct name mentions using common patterns
    let name = null;
    let type = "medical"; // Default type
    let specialty = "";
    let email = "";
    let childName = null;
    
    // Enhanced type detection - check for babysitter/childcare first
    if (message.toLowerCase().includes("babysitter") || 
        message.toLowerCase().includes("baby sitter") || 
        message.toLowerCase().includes("nanny") || 
        message.toLowerCase().includes("childcare")) {
      type = "childcare";
      specialty = message.toLowerCase().includes("nanny") ? "Nanny" : "Babysitter";
      console.log("Detected childcare provider type:", specialty);
      
      // Look for patterns specific to babysitters like "for [child name]"
      const childPattern = /(?:for|watching)\s+([A-Za-z]+)(?:\s|,|\.)/i;
      const childMatch = message.match(childPattern);
      if (childMatch && childMatch[1]) {
        childName = childMatch[1].trim();
        console.log("Found child name for babysitter:", childName);
      }
    }
    // Then check other provider types
    else if (message.toLowerCase().includes("music teacher") || 
        message.toLowerCase().includes("guitar teacher") ||
        message.toLowerCase().includes("piano teacher")) {
      type = "education";
      specialty = message.toLowerCase().includes("guitar") ? "Guitar Teacher" : 
                message.toLowerCase().includes("piano") ? "Piano Teacher" : "Music Teacher";
      console.log("Detected education provider type:", specialty);
    } else if (message.toLowerCase().includes("teacher")) {
      type = "education";
      specialty = "Teacher";
      console.log("Detected general teacher");
    } else if (message.toLowerCase().includes("dentist") || 
              message.toLowerCase().includes("dental")) {
      type = "medical";
      specialty = "Dentist";
      console.log("Detected dental provider");
    }
    
    // Try to extract name using pattern "name is X" - general for all provider types
    const nameIsPattern = /(?:(?:her|his|their)?\s*name is|named|called)\s+([A-Za-z]+(?: [A-Za-z]+){0,2})/i;
    const nameIsMatch = message.match(nameIsPattern);
    if (nameIsMatch && nameIsMatch[1]) {
      name = nameIsMatch[1].trim();
      console.log("Found name using 'name is' pattern:", name);
    }
    
    // Additional extraction patterns for babysitters
    if (type === "childcare" && !name) {
      // For babysitters, try these patterns
      const babysitterPatterns = [
        /([A-Za-z]+(?: [A-Za-z]+){0,2})\s+(?:is|as)\s+(?:a|the)?\s+babysitter/i,
        /new\s+babysitter\s+(?:named|called)?\s+([A-Za-z]+(?: [A-Za-z]+){0,2})/i,
        /babysitter(?:'s| is| named| called)?\s+([A-Za-z]+(?: [A-Za-z]+){0,2})/i
      ];
      
      for (const pattern of babysitterPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          name = match[1].trim();
          console.log("Found babysitter name using pattern:", name);
          break;
        }
      }
    }
    
    // Extract email if present - works for all provider types
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch && emailMatch[1]) {
      email = emailMatch[1].trim();
      console.log("Found email:", email);
    }
    
    // Extract phone if present
    const phoneMatch = message.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    const phone = phoneMatch ? phoneMatch[0] : "";
    if (phone) {
      console.log("Found phone number:", phone);
    }
    
    // If we still don't have a name, try to use Claude to extract the details
    if (!name) {
      try {
        console.log("Using Claude to extract structured provider data");
        // Use Claude API to extract structured data
        const systemPrompt = `You are an AI that extracts provider information from text.
        Extract the following details in a structured JSON format:
        - name: Provider's name (e.g., Dr. Smith, Jane Doe, or any full name mentioned)
        - type: Provider type (e.g., medical, education, activity, childcare, services)
        - specialty: Provider's specialty (e.g., pediatrician, dentist, piano teacher, tutor, babysitter)
        - email: Provider's email if mentioned
        - phone: Provider's phone if mentioned
        - childName: Name of child this provider is for (if mentioned)
        
        IMPORTANT: Return ONLY valid JSON with no other text. Be very careful to extract full names correctly.`;
        
        const userMessage = `Extract provider details from this message: "${message}"`;
        
        const response = await ClaudeService.generateResponse(
          [{ role: 'user', content: userMessage }],
          { system: systemPrompt },
          { temperature: 0.1 } // Lower temperature for more accurate extraction
        );
        
        // Try to find JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : null;
        
        if (jsonString) {
          const details = JSON.parse(jsonString);
          console.log("Claude extracted data:", details);
          
          if (details.name) {
            name = details.name;
            console.log("Claude extracted name:", name);
          }
          if (details.type) type = details.type;
          if (details.specialty) specialty = details.specialty;
          if (details.email) email = details.email;
          if (details.phone) phone = details.phone;
          if (details.childName && !childName) childName = details.childName;
        }
      } catch (claudeError) {
        console.error("Error using Claude to extract provider details:", claudeError);
        // Continue with manual extraction if Claude fails
      }
    }
    
    // Last resort extraction for any type of name reference
    if (!name) {
      const possibleNames = [];
      
      // Check for teacher/doctor prefix patterns
      const prefixPattern = /(?:(?:doctor|dr\.?|teacher|instructor|provider)\s+([a-z]+(?: [a-z]+){0,2}))/i;
      const prefixMatch = message.match(prefixPattern);
      if (prefixMatch && prefixMatch[1]) possibleNames.push(prefixMatch[1].trim());
      
      // Look for words that might be names (simplistic but can help)
      const words = message.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        // Look for capitalized words that could be names
        if (/^[A-Z][a-z]{2,}$/.test(words[i]) && 
            (i+1 < words.length && /^[A-Z][a-z]{2,}$/.test(words[i+1]))) {
          possibleNames.push(`${words[i]} ${words[i+1]}`);
        }
      }
      
      // For single word names (more common with babysitters)
      if (possibleNames.length === 0) {
        for (const word of words) {
          if (/^[A-Z][a-z]{2,}$/.test(word)) {
            possibleNames.push(word);
          }
        }
      }
      
      // If we found possible names, use the longest one (most likely to be a full name)
      if (possibleNames.length > 0) {
        name = possibleNames.sort((a, b) => b.length - a.length)[0];
        console.log("Found name from possible names:", name);
      }
    }
    
    // Final fallback
    if (!name || name.length < 3) {
      name = "Unknown Provider";
    }
    
    // Create notes field that includes child information if available
    let notes = message; // Default to original message
    if (childName) {
      notes = `Babysitter for ${childName}. ${message}`;
    }
    
    const result = {
      name: name,
      type: type,
      specialty: specialty,
      email: email || "",
      phone: phone || "",
      address: "",
      notes: notes,
      childName: childName // Include child name in the result
    };
    
    console.log("Final extracted provider details:", result);
    return result;
  } catch (error) {
    console.error("Error extracting provider details:", error);
    // Return basic structure in case of error
    return {
      name: "Unknown Provider",
      type: "medical",
      specialty: "",
      email: "",
      phone: "",
      address: "",
      notes: message // Use original message as notes
    };
  }
}

async createOrFindProvider(familyId, name, specialty, email, phone) {
  try {
    if (!familyId || !name) {
      console.warn("Missing required parameters in createOrFindProvider");
      return null;
    }
    
    // CRITICAL FIX: Use "providers" collection consistently
    const providersRef = collection(db, "providers");
    const q = query(
      providersRef, 
      where("familyId", "==", familyId),
      where("name", "==", name)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Return existing provider
      const providerId = querySnapshot.docs[0].id;
      console.log(`Found existing provider ${providerId} for ${name}`);
      return providerId;
    }
    
    // Create new provider
    const providerData = {
      name,
      specialty: specialty || "General Practitioner",
      email: email || "",
      phone: phone || "",
      address: "",
      notes: "",
      familyId,
      type: specialty?.toLowerCase()?.includes('dentist') ? 'medical' : 
           specialty?.toLowerCase()?.includes('teacher') ? 'education' : 'medical',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log(`Creating new provider for ${name} in providers collection`);
    const docRef = await addDoc(providersRef, providerData);
    
    // Trigger refresh events
    if (typeof window !== 'undefined') {
      // Delay event to ensure Firebase operation completes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('provider-added', {
          detail: {
            providerId: docRef.id,
            isNew: true,
            provider: providerData
          }
        }));
      }, 500);
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating/finding provider:", error);
    return null;
  }
}


async processEventFromChat(message, familyId, eventType = null, childId = null) {
  try {
    if (!familyId) return { success: false, error: "Family ID is required" };
    
    console.log(`Processing ${eventType || 'event'} from chat:`, message);
    
    // Get family context for better parsing
    const familyContext = await this.getFamilyContext(familyId);
    
    // Use UnifiedParserService to extract event details
    const UnifiedParserService = (await import('./UnifiedParserService')).default;
    const eventDetails = await UnifiedParserService.parseEvent(message, familyContext);
    
    if (!eventDetails || !eventDetails.title) {
      return { 
        success: false, 
        error: "Could not determine event details from your message" 
      };
    }
    
    console.log("Parsed event details:", eventDetails);
    
    // If no child ID is provided, try to identify from the message
    if (!childId && eventDetails.childName) {
      const childrenMatches = familyContext.children
        .filter(child => eventDetails.childName.toLowerCase().includes(child.name.toLowerCase()));
      
      if (childrenMatches.length > 0) {
        childId = childrenMatches[0].id;
        eventDetails.childId = childId;
      } else if (familyContext.children.length === 1) {
        // If only one child, assume it's for them
        childId = familyContext.children[0].id;
        eventDetails.childId = childId;
        eventDetails.childName = familyContext.children[0].name;
      }
    }
    
    // For date nights, both parents should be included
    if (eventDetails.eventType === 'date-night') {
      eventDetails.attendingParentId = 'both';
    }
    
    // Handle providers if mentioned
    if (eventDetails.providers && eventDetails.providers.length > 0) {
      for (const providerData of eventDetails.providers) {
        const providerId = await this.createOrFindProvider(
          familyId, 
          providerData.name,
          providerData.specialty,
          providerData.email,
          providerData.phone
        );
        
        if (providerId) {
          providerData.id = providerId;
        }
      }
    }
    
    // Create complete event object
    const completeEvent = {
      ...eventDetails,
      familyId,
      userId: familyContext.currentUser?.uid,
      // Create standardized date/time format
      dateObj: new Date(eventDetails.dateTime),
      start: {
        dateTime: new Date(eventDetails.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(new Date(eventDetails.dateTime).getTime() + (eventDetails.duration || 60) * 60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Use UnifiedEventService instead of directly calling useEvents or EventStore
    // Import UnifiedEventService dynamically
    const UnifiedEventService = (await import('./UnifiedEventService')).default;
    
    // Use the userId from the family context or fallback to a default
    const userId = familyContext.currentUser?.uid || 'default-user';
    
    // Save event using the unified service
    const result = await UnifiedEventService.addEvent(
      completeEvent, 
      userId, 
      familyId,
      { 
        source: 'ai-service',
        messageSource: message.substring(0, 100) // Store a snippet of the source message
      }
    );
    
    if (result.success) {
      return { 
        success: true, 
        eventId: result.eventId,
        eventDetails: completeEvent,
        message: `Successfully added ${
          eventDetails.eventType === 'appointment' ? 'appointment' :
          eventDetails.eventType === 'activity' ? 'activity' :
          eventDetails.eventType === 'date-night' ? 'date night' :
          'event'
        } to your calendar.`
      };
    } else {
      return { 
        success: false, 
        error: result.error || "Failed to add event to calendar" 
      };
    }
  } catch (error) {
    console.error("Error processing event from chat:", error);
    return { success: false, error: error.message };
  }
}

async processAppointmentFromChat(message, familyId, childId = null) {
  try {
    if (!familyId) return { success: false, error: "Family ID is required" };
    
    // Extract appointment details from message
    const appointmentDetails = await this.extractAppointmentDetails(message);
    
    // If no child ID is provided, try to identify from the message
    if (!childId) {
      const familyContext = await this.getFamilyContext(familyId);
      
      // Look for child names in the message
      const childrenMatches = familyContext.children
        .filter(child => message.toLowerCase().includes(child.name.toLowerCase()));
      
      if (childrenMatches.length > 0) {
        childId = childrenMatches[0].id;
        appointmentDetails.childId = childId;
        appointmentDetails.childName = childrenMatches[0].name;
      } else if (familyContext.children.length === 1) {
        // If only one child, assume it's for them
        childId = familyContext.children[0].id;
        appointmentDetails.childId = childId;
        appointmentDetails.childName = familyContext.children[0].name;
      } else {
        return { 
          success: false, 
          error: "Couldn't determine which child this appointment is for" 
        };
      }
    }
    
    // Check if we need to create a healthcare provider
    let providerId = null;
    if (appointmentDetails.providerName) {
      providerId = await this.createOrFindProvider(
        familyId, 
        appointmentDetails.providerName,
        appointmentDetails.providerSpecialty,
        appointmentDetails.providerEmail,
        appointmentDetails.providerPhone
      );
      
      if (providerId) {
        appointmentDetails.providerId = providerId;
      }
    }
    
    // Create appointment in the database
    const result = await this.saveAppointmentToDatabase(familyId, childId, appointmentDetails);
    
    // Also add to calendar
    if (result.success) {
      await this.addAppointmentToCalendar(appointmentDetails);
    }
    
    return result;
  } catch (error) {
    console.error("Error processing appointment from chat:", error);
    return { success: false, error: error.message };
  }
}

// Helper method to extract appointment details
async extractAppointmentDetails(message) {
  // Use Claude API to extract structured data
  const systemPrompt = `You are an AI that extracts medical appointment information from text.
  Extract the following details in a structured JSON format:
  - appointmentType: Type of appointment (e.g., checkup, dental, specialist)
  - date: Appointment date (in YYYY-MM-DD format, use today's date if not specified)
  - time: Appointment time (in HH:MM format, use 10:00 as default)
  - providerName: Doctor or provider name
  - providerSpecialty: Specialty of the provider
  - providerEmail: Provider's email if mentioned
  - providerPhone: Provider's phone if mentioned
  - location: Location or address
  - notes: Any additional information
  
  If information isn't available, use null for that field.`;
  
  const userMessage = `Extract appointment details from this message: "${message}"`;
  
  const response = await ClaudeService.generateResponse(
    [{ role: 'user', content: userMessage }],
    { system: systemPrompt }
  );
  
  try {
    const details = JSON.parse(response);
    // Set default date and time if not provided
    if (!details.date) {
      details.date = new Date().toISOString().split('T')[0];
    }
    if (!details.time) {
      details.time = "10:00";
    }
    return details;
  } catch (error) {
    console.error("Error parsing appointment details:", error);
    // Return basic structure if parsing fails
    return {
      appointmentType: "checkup",
      date: new Date().toISOString().split('T')[0],
      time: "10:00",
      providerName: null,
      providerSpecialty: null,
      providerEmail: null,
      providerPhone: null,
      location: null,
      notes: message // Use original message as notes
    };
  }
}

// Helper to create or find a healthcare provider
async createOrFindProvider(familyId, name, specialty, email, phone) {
  try {
    // Check if provider already exists
    const providersRef = collection(db, "healthcareProviders");
    const q = query(
      providersRef, 
      where("familyId", "==", familyId),
      where("name", "==", name)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Return existing provider
      return querySnapshot.docs[0].id;
    }
    
    // Create new provider
    const providerData = {
      name,
      specialty: specialty || "General Practitioner",
      email: email || "",
      phone: phone || "",
      address: "",
      notes: "",
      familyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(providersRef, providerData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating/finding provider:", error);
    return null;
  }
}

// Save appointment to database
async saveAppointmentToDatabase(familyId, childId, appointmentDetails) {
  try {
    // Format appointment data
    const appointmentData = {
      id: Date.now().toString(),
      title: appointmentDetails.appointmentType || "Doctor's Appointment",
      date: appointmentDetails.date,
      time: appointmentDetails.time,
      doctor: appointmentDetails.providerName || "",
      providerId: appointmentDetails.providerId,
      notes: appointmentDetails.notes || "",
      location: appointmentDetails.location || "",
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    // If we have provider details, add them
    if (appointmentDetails.providerId) {
      try {
        const providerRef = doc(db, "healthcareProviders", appointmentDetails.providerId);
        const providerSnap = await getDoc(providerRef);
        
        if (providerSnap.exists()) {
          const providerData = providerSnap.data();
          appointmentData.providerDetails = {
            id: appointmentDetails.providerId,
            name: providerData.name,
            specialty: providerData.specialty,
            phone: providerData.phone,
            email: providerData.email,
            address: providerData.address
          };
        }
      } catch (error) {
        console.error("Error getting provider details:", error);
      }
    }
    
    // Update the child's records
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: "Family not found" };
    }
    
    const familyData = docSnap.data();
    const childrenData = familyData.childrenData || {};
    
    // Make sure child exists in data structure
    if (!childrenData[childId]) {
      childrenData[childId] = {
        medicalAppointments: [],
        growthData: [],
        routines: [],
        clothesHandMeDowns: []
      };
    }
    
    // Add the appointment
    if (!childrenData[childId].medicalAppointments) {
      childrenData[childId].medicalAppointments = [];
    }
    
    childrenData[childId].medicalAppointments.push(appointmentData);
    
    // Save to Firebase
    await updateDoc(docRef, {
      [`childrenData.${childId}.medicalAppointments`]: childrenData[childId].medicalAppointments
    });
    
    return { 
      success: true, 
      appointmentId: appointmentData.id,
      appointmentData: appointmentData
    };
  } catch (error) {
    console.error("Error saving appointment to database:", error);
    return { success: false, error: error.message };
  }
}


async processTaskFromChat(message, familyId, userId) {
  try {
    if (!familyId) return { success: false, error: "Family ID is required" };
    
    console.log("Processing task from chat:", message);
    
    // Get family context for additional info
    const familyContext = await this.getFamilyContext(familyId);
    
    // Use UnifiedParserService to extract task details
    const UnifiedParserService = (await import('./UnifiedParserService')).default;
    const taskDetails = await UnifiedParserService.parseTodo(message, familyContext);
    
    if (!taskDetails || !taskDetails.text) {
      return { 
        success: false, 
        error: "Could not determine task details from your message" 
      };
    }
    
    console.log("Parsed task details:", taskDetails);
    
    // Determine which family member this task is assigned to
    let assignedTo = null;
    let assignedToName = null;
    
    // Check if a specific family member was mentioned
    if (taskDetails.assignedTo) {
      // Check if this matches any family member
      const familyMembers = familyContext.familyMembers || [];
      const matchedMember = familyMembers.find(member => 
        member.name.toLowerCase().includes(taskDetails.assignedTo.toLowerCase())
      );
      
      if (matchedMember) {
        assignedTo = matchedMember.id;
        assignedToName = matchedMember.name;
      }
    }
    
    // Determine category based on parsed category or infer from content
    let category = taskDetails.category || "household";
    if (category === "general") {
      // Try to infer a better category from the content
      const taskText = taskDetails.text.toLowerCase();
      if (taskText.includes("kid") || taskText.includes("child") || 
          taskText.includes("school") || taskText.includes("homework")) {
        category = "parenting";
      } else if (taskText.includes("shop") || taskText.includes("buy") || 
                taskText.includes("store") || taskText.includes("pick up")) {
        category = "errands";
      } else if (taskText.includes("talk") || taskText.includes("date") || 
                taskText.includes("partner") || taskText.includes("spouse")) {
        category = "relationship";
      } else if (taskText.includes("work") || taskText.includes("office") || 
                taskText.includes("email") || taskText.includes("boss")) {
        category = "work";
      }
    }
    
    // Determine priority based on content and words like "urgent", "important", etc.
    let priority = "medium";
    const taskText = taskDetails.text.toLowerCase();
    if (taskText.includes("urgent") || taskText.includes("emergency") || 
        taskText.includes("asap") || taskText.includes("immediately")) {
      priority = "high";
    } else if (taskText.includes("low priority") || taskText.includes("when you get a chance") || 
              taskText.includes("eventually") || taskText.includes("sometime")) {
      priority = "low";
    }
    
    // Determine which column to add the task to based on due date
    let column = "upcoming";
    if (taskDetails.dueDate) {
      const dueDate = new Date(taskDetails.dueDate);
      const today = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(today.getDate() + 7);
      
      if (dueDate <= oneWeekFromNow) {
        column = "this-week";
      }
      
      // If due date is today or past due, put in "in-progress"
      if (dueDate.setHours(0, 0, 0, 0) <= today.setHours(0, 0, 0, 0)) {
        column = "in-progress";
      }
    }
    
    // Create the task object for Kanban
    const task = {
      title: taskDetails.text,
      description: taskDetails.notes || "",
      dueDate: taskDetails.dueDate,
      priority: priority,
      category: category,
      assignedTo: assignedTo,
      assignedToName: assignedToName,
      column: column,
      familyId: familyId,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      subtasks: [],
      comments: [],
      completed: false
    };
    
    // Add to Firestore kanbanTasks collection
    try {
      const db = (await import('./firebase')).db;
      const { collection, addDoc } = (await import('firebase/firestore'));
      
      const docRef = await addDoc(collection(db, "kanbanTasks"), task);
      console.log("Task added with ID:", docRef.id);
      
      // Add a calendar event if due date exists
      if (taskDetails.dueDate) {
        try {
          const CalendarService = (await import('./CalendarService')).default;
          
          const dueDate = new Date(taskDetails.dueDate);
          // Set to 9:00 AM if no specific time
          if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
            dueDate.setHours(9, 0, 0, 0);
          }
          
          // End time is 30 minutes later
          const endDate = new Date(dueDate);
          endDate.setMinutes(endDate.getMinutes() + 30);
          
          const calendarEvent = {
            title: `Task: ${taskDetails.text}`,
            summary: `Task: ${taskDetails.text}`,
            description: taskDetails.notes || `Task from Allie chat`,
            location: '',
            start: {
              dateTime: dueDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            category: "task",
            eventType: "task",
            familyId: familyId,
            taskId: docRef.id,
            // Add assigned user information
            attendingParentId: task.assignedTo,
            assignedToName: task.assignedTo ? familyContext.familyMembers.find(m => m.id === task.assignedTo)?.name : null,
            reminders: {
              useDefault: true
            }
          };
          
          await CalendarService.addEvent(calendarEvent, userId);
        } catch (calendarError) {
          console.error("Error creating calendar event for task:", calendarError);
          // Continue - calendar event is not critical
        }
      }
      
      // Force a UI refresh by dispatching a custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kanban-task-added', {
          detail: { taskId: docRef.id }
        }));
      }
      
      return { 
        success: true, 
        taskId: docRef.id,
        task: task,
        message: `Successfully added "${taskDetails.text}" to your tasks${assignedToName ? ` and assigned it to ${assignedToName}` : ''}.`
      };
    } catch (firestoreError) {
      console.error("Error saving task to Firestore:", firestoreError);
      return { success: false, error: firestoreError.message };
    }
  } catch (error) {
    console.error("Error processing task from chat:", error);
    return { success: false, error: error.message };
  }
}

async addAppointmentToCalendar(appointmentDetails) {
  try {
    // Parse date and time
    const appointmentDate = new Date(`${appointmentDetails.date}T${appointmentDetails.time}`);
    
    // End time is 30 minutes after start
    const endDate = new Date(appointmentDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    
    // Create event object for the calendar
    const calendarEvent = {
      summary: `${appointmentDetails.childName}'s ${appointmentDetails.appointmentType || "Doctor's Appointment"}`,
      title: `${appointmentDetails.childName}'s ${appointmentDetails.appointmentType || "Doctor's Appointment"}`,
      description: appointmentDetails.notes || `Medical appointment: ${appointmentDetails.appointmentType || "Doctor's Appointment"}`,
      location: appointmentDetails.location || '',
      start: {
        dateTime: appointmentDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      childId: appointmentDetails.childId,
      childName: appointmentDetails.childName,
      category: 'medical',
      eventType: 'appointment',
      familyId: appointmentDetails.familyId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      },
      // Add a unique identifier to prevent duplicates
      uniqueId: `appointment-${appointmentDetails.childId}-${Date.now()}`
    };
    
    // Use CalendarService directly
    const result = await CalendarService.addEvent(calendarEvent, appointmentDetails.userId);
    return result.success;
  } catch (error) {
    console.error("Error adding appointment to calendar:", error);
    return false;
  }
}

// Add to AllieAIService.js
async processActivityFromChat(message, familyId, childId = null) {
  try {
    if (!familyId) return { success: false, error: "Family ID is required" };
    
    // Extract activity details from message
    const activityDetails = await this.extractActivityDetails(message);
    
    // If no child ID is provided, try to identify from the message
    if (!childId) {
      const familyContext = await this.getFamilyContext(familyId);
      
      // Look for child names in the message
      const childrenMatches = familyContext.children
        .filter(child => message.toLowerCase().includes(child.name.toLowerCase()));
      
      if (childrenMatches.length > 0) {
        childId = childrenMatches[0].id;
        activityDetails.childId = childId;
        activityDetails.childName = childrenMatches[0].name;
      } else if (familyContext.children.length === 1) {
        // If only one child, assume it's for them
        childId = familyContext.children[0].id;
        activityDetails.childId = childId;
        activityDetails.childName = familyContext.children[0].name;
      } else {
        return { 
          success: false, 
          error: "Couldn't determine which child this activity is for" 
        };
      }
    }
    
    // Create activity in the database
    const result = await this.saveActivityToDatabase(familyId, childId, activityDetails);
    
    // Also add to calendar
    if (result.success) {
      await this.addActivityToCalendar(activityDetails);
    }
    
    return result;
  } catch (error) {
    console.error("Error processing activity from chat:", error);
    return { success: false, error: error.message };
  }
}

// Helper method to extract activity details
async extractActivityDetails(message) {
  // Use Claude API to extract structured data
  const systemPrompt = `You are an AI that extracts activity information from text.
  Extract the following details in a structured JSON format:
  - activityType: Type of activity (e.g., soccer, music, dance)
  - date: Activity date (in YYYY-MM-DD format, use today's date if not specified)
  - time: Activity time (in HH:MM format)
  - location: Location or address
  - coach: Coach or instructor name
  - equipmentNeeded: Equipment needed
  - parentAttendance: Whether parent attendance is required (true/false)
  - notes: Any additional information
  
  If information isn't available, use null for that field.`;
  
  const userMessage = `Extract activity details from this message: "${message}"`;
  
  const response = await ClaudeService.generateResponse(
    [{ role: 'user', content: userMessage }],
    { system: systemPrompt }
  );
  
  try {
    const details = JSON.parse(response);
    // Set default date and time if not provided
    if (!details.date) {
      details.date = new Date().toISOString().split('T')[0];
    }
    if (!details.time) {
      details.time = "15:00"; // Default to 3 PM
    }
    return details;
  } catch (error) {
    console.error("Error parsing activity details:", error);
    // Return basic structure if parsing fails
    return {
      activityType: "practice",
      date: new Date().toISOString().split('T')[0],
      time: "15:00",
      location: null,
      coach: null,
      equipmentNeeded: null,
      parentAttendance: false,
      notes: message // Use original message as notes
    };
  }
}

// Similar methods for other event types
async processBirthdayFromChat(message, familyId, childId = null) {
  // Similar implementation
}

async processMeetingFromChat(message, familyId) {
  // Similar implementation
}

async processDateNightFromChat(message, familyId) {
  // Similar implementation
}

async processTravelFromChat(message, familyId) {
  // Similar implementation
}


/**
 * Generate personalized insights for children based on their data
 * @param {string} familyId - Family ID
 * @param {object} childrenData - Data about children including medical, growth, routines, etc.
 * @returns {Promise<Array>} Array of personalized insights
 */
// Corrected generateChildInsights method for src/services/AllieAIService.js
// NEW CODE to replace it with improved loop protection
async generateChildInsights(familyId, childrenData) {
  try {
    if (!familyId || !childrenData) {
      console.warn("Missing required parameters in generateChildInsights");
      return [];
    }
    
    // ADD LOOP PROTECTION - Check if we're already processing insights for this family
    if (this._processingInsights && this._processingInsights[familyId]) {
      console.log("Already processing insights for this family, returning fallback");
      return this.getFallbackChildInsights(childrenData);
    }
    
    // Set processing flag
    if (!this._processingInsights) this._processingInsights = {};
    this._processingInsights[familyId] = true;
    
    // Set timeout to clear flag after 10 seconds no matter what
    setTimeout(() => {
      if (this._processingInsights) this._processingInsights[familyId] = false;
    }, 10000);
    
    console.log("Generating child insights for family:", familyId);
    
    // Always generate local insights first as a fallback
    const localInsights = this.getFallbackChildInsights(childrenData);
    
    try {
      // Try to get enhanced insights from AI service with a longer timeout
      console.log("Requesting AI-generated child insights from Claude API");
      
      // Prepare system prompt for Claude
      const systemPrompt = `You are Allie's child development and healthcare expert AI. 
Analyze the provided child data and create 3-6 personalized, actionable insights.

For each insight, include:
1. A specific title related to the child's health, growth, or routine
2. A category (medical, growth, routine, recommendation, etc.)
3. Specific content with a data point from the child's records
4. A priority level (high, medium, low) based on importance
5. The relevant childId

VERY IMPORTANT: Your response must be in valid JSON format with this structure, DO NOT use markdown code blocks, just return the raw JSON:
{
  "insights": [
    {
      "title": "string (concise, specific title)",
      "type": "string (medical, growth, recommendation, clothes, routine)",
      "content": "string (insight with specific data point)",
      "priority": "string (high, medium, low)",
      "childId": "string (child's ID)"
    }
  ]
}

DO NOT wrap your response in markdown code blocks or use \`\`\`json. Return ONLY the raw JSON.`;
      
      // Create a concise version of the data to avoid token limits
      const processedData = {};
      Object.keys(childrenData).forEach(childId => {
        const child = childrenData[childId];
        
        // Only include essential data for insights
        processedData[childId] = {
          medicalAppointments: (child.medicalAppointments || [])
            .slice(0, 10)  // Limit to recent appointments
            .map(apt => ({
              title: apt.title,
              date: apt.date,
              completed: apt.completed,
              notes: apt.notes?.substring(0, 100) // Limit note length
            })),
          growthData: (child.growthData || [])
            .slice(0, 10)  // Limit to recent measurements
            .map(entry => ({
              date: entry.date,
              height: entry.height,
              weight: entry.weight,
              shoeSize: entry.shoeSize,
              clothingSize: entry.clothingSize
            })),
          routines: (child.routines || []).slice(0, 5),
          clothesHandMeDowns: (child.clothesHandMeDowns || [])
            .filter(item => !item.used)
            .slice(0, 5)
        };
      });
      
      const userMessage = `Generate child health and development insights based on this data:
      
      Children Data:
      ${JSON.stringify(processedData)}
      
      IMPORTANT: Create specific, data-driven insights for each child in the family. Return ONLY JSON with no extra text.`;
      
      // Call Claude API with timeout handling
      let claudeResponse = null;
      try {
        const messages = [{ role: 'user', content: userMessage }];
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI insights request timed out")), 20000) // 20 seconds timeout
        );
        
        claudeResponse = await Promise.race([
          ClaudeService.generateResponse(
            messages, 
            { system: systemPrompt },
            { temperature: 0.3 } // Lower temperature for more predictable JSON responses
          ),
          timeoutPromise
        ]);
        
        if (!claudeResponse) {
          console.warn("Empty response from Claude API");
          return localInsights;
        }
      } catch (timeoutError) {
        console.error("Claude API timed out:", timeoutError);
        return localInsights;
      }
      
      // Parse JSON response with enhanced error handling
      const responseData = this.safelyParseJSON(claudeResponse, { insights: [] });
      
      // Validate structure
      if (!responseData.insights || !Array.isArray(responseData.insights) || responseData.insights.length === 0) {
        console.warn("Invalid insights structure returned");
        return localInsights;
      }
      
      return responseData.insights;
    } catch (error) {
      console.error("Error generating child insights:", error);
      // Clear processing flag
      if (this._processingInsights) this._processingInsights[familyId] = false;
      return localInsights;
    }
  } catch (error) {
    console.error("Error in insight generation:", error);
    // Clear processing flag
    if (this._processingInsights) this._processingInsights[familyId] = false;
    return this.getFallbackChildInsights(childrenData);
  } finally {
    // Make sure we always clear the processing flag
    if (this._processingInsights) this._processingInsights[familyId] = false;
  }
}

/**
 * Get fallback child insights if AI generation fails
 * @param {object} childrenData - Children data
 * @returns {Array} Array of fallback insights
 */
getFallbackChildInsights(childrenData) {
  const insights = [];
  
  // Process data for each child
  Object.keys(childrenData || {}).forEach(childId => {
    const child = childrenData[childId];
    
    // Medical appointment insights
    if (child.medicalAppointments && child.medicalAppointments.length > 0) {
      // Check for upcoming appointments
      const upcomingAppointments = child.medicalAppointments.filter(apt => 
        !apt.completed && new Date(apt.date) > new Date()
      );
      
      if (upcomingAppointments.length > 0) {
        const nextAppointment = upcomingAppointments.sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        )[0];
        
        insights.push({
          title: "Upcoming Medical Appointment",
          type: "medical",
          content: `Appointment scheduled for ${new Date(nextAppointment.date).toLocaleDateString()} - ${nextAppointment.title}`,
          priority: "medium",
          childId: childId
        });
      }
    }
    
    // Growth insights
    if (child.growthData && child.growthData.length > 1) {
      // Compare latest two measurements
      const sortedGrowth = [...child.growthData].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      const latest = sortedGrowth[0];
      const previous = sortedGrowth[1];
      
      if (latest && previous) {
        // Check if measurements were updated
        if (latest.height !== previous.height) {
          insights.push({
            title: "Height Change Detected",
            type: "growth",
            content: `Height has changed from ${previous.height} to ${latest.height}`,
            priority: "low",
            childId: childId
          });
        }
        
        if (latest.weight !== previous.weight) {
          insights.push({
            title: "Weight Change Detected",
            type: "growth",
            content: `Weight has changed from ${previous.weight} to ${latest.weight}`,
            priority: "low",
            childId: childId
          });
        }
      }
      
      // Check if growth data is outdated
      if (latest) {
        const lastMeasurementDate = new Date(latest.date);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        if (lastMeasurementDate < threeMonthsAgo) {
          insights.push({
            title: "Growth Data Needs Update",
            type: "recommendation",
            content: `Last growth measurements were recorded on ${lastMeasurementDate.toLocaleDateString()}, more than 3 months ago`,
            priority: "medium",
            childId: childId
          });
        }
      }
    }
    
    // Recommendations for missing data
    if (!child.medicalAppointments || child.medicalAppointments.length === 0) {
      insights.push({
        title: "No Medical Records",
        type: "recommendation",
        content: "Consider adding medical appointments to track health history",
        priority: "high",
        childId: childId
      });
    }
    
    if (!child.growthData || child.growthData.length === 0) {
      insights.push({
        title: "No Growth Data",
        type: "recommendation",
        content: "Start tracking height and weight to monitor development",
        priority: "medium",
        childId: childId
      });
    }
    
    // Hand-me-down insights
    if (child.clothesHandMeDowns && child.clothesHandMeDowns.length > 0) {
      const readyItems = child.clothesHandMeDowns.filter(item => 
        !item.used && new Date(item.readyDate) <= new Date()
      );
      
      if (readyItems.length > 0) {
        insights.push({
          title: "Clothing Items Ready to Use",
          type: "clothes",
          content: `${readyItems.length} saved clothing items are ready to be used`,
          priority: "low",
          childId: childId
        });
      }
    }
  });
  
  return insights;
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
 * Generate couples meeting agenda based on both partners' assessments and prework
 * @param {string} familyId - Family ID
 * @param {number} cycleNumber - Cycle number
 * @param {object} cycleData - Cycle data with assessments and prework
 * @returns {Promise<object>} Generated meeting agenda
 */
async generateCouplesMeetingAgenda(familyId, cycleNumber, cycleData) {
  try {
    if (!familyId || !cycleData) {
      console.warn("Missing required parameters in generateCouplesMeetingAgenda");
      return this.getFallbackMeetingAgenda(cycleNumber);
    }
    
    // Prepare data for Claude analysis
    const assessmentData = cycleData.assessments || {};
    const preworkData = cycleData.prework || {};
    
    // Get parent IDs
    const parentIds = Object.keys(assessmentData);
    if (parentIds.length < 2) {
      console.warn("Need at least two parents' data to generate meaningful agenda");
      return this.getFallbackMeetingAgenda(cycleNumber);
    }
    
    // Prepare structured data for prompt
    const parent1 = {
      id: parentIds[0],
      assessment: assessmentData[parentIds[0]]?.responses || {},
      prework: preworkData[parentIds[0]] || {}
    };
    
    const parent2 = {
      id: parentIds[1],
      assessment: assessmentData[parentIds[1]]?.responses || {},
      prework: preworkData[parentIds[1]] || {}
    };
    
    // Create prompt for Claude
    const systemPrompt = `You are Allie's relationship expert AI. Analyze both partners' relationship assessments and prework to create a personalized meeting agenda.

    Your agenda should include:
    1. A welcoming introduction that acknowledges their commitment
    2. Areas of alignment where both partners agree
    3. Areas of misalignment that need discussion
    4. Specific discussion questions for each topic
    5. Suggested action items based on their identified challenges
    6. A structured closing that encourages commitment to action
    
    The agenda should be deeply personalized to their specific situation and should highlight patterns in their responses.
    
    Your response should be in valid JSON format with this structure:
    {
      "title": "string (Personalized title for the meeting)",
      "introduction": "string (Welcoming paragraph)",
      "topics": [
        {
          "title": "string (Topic title)",
          "description": "string (Why this topic matters)",
          "alignment": "string (Where partners align or differ)",
          "questions": ["string (Discussion question)", "string (Discussion question)"],
          "suggestedActions": ["string (Action item)", "string (Action item)"]
        }
      ],
      "closingReflection": "string (Final thoughts and next steps)"
    }`;
    
    const userMessage = `Generate a personalized couple's meeting agenda for Cycle ${cycleNumber} based on this data:
    
    Partner 1 Assessment:
    ${JSON.stringify(parent1.assessment)}
    
    Partner 1 Prework:
    ${JSON.stringify(parent1.prework)}
    
    Partner 2 Assessment:
    ${JSON.stringify(parent2.assessment)}
    
    Partner 2 Prework:
    ${JSON.stringify(parent2.prework)}`;
    
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
      return this.getFallbackMeetingAgenda(cycleNumber);
    }
    
    if (!claudeResponse) {
      console.warn("Empty response from Claude API");
      return this.getFallbackMeetingAgenda(cycleNumber);
    }
    
    // Parse JSON response with enhanced error handling
    const responseData = this.safelyParseJSON(claudeResponse, this.getFallbackMeetingAgenda(cycleNumber));
    
    // Validate structure
    if (!responseData.title || !responseData.topics || !Array.isArray(responseData.topics)) {
      console.warn("Invalid meeting agenda structure returned");
      return this.getFallbackMeetingAgenda(cycleNumber);
    }
    
    return responseData;
  } catch (error) {
    console.error("Error generating couples meeting agenda:", error);
    return this.getFallbackMeetingAgenda(cycleNumber);
  }
}

getFallbackMeetingAgenda(cycleNumber) {
  return {
    title: `Cycle ${cycleNumber}: Strengthening Your Partnership`,
    introduction: "Welcome to your couple's meeting! This is a time to connect, understand each other better, and work together on strengthening your relationship. Today's discussion will focus on celebrating what's working well and addressing areas where you can grow together.",
    topics: [
      {
        title: "Communication Patterns",
        description: "How you communicate affects every aspect of your relationship and family dynamics.",
        alignment: "You may have different communication styles that can complement each other when understood.",
        questions: [
          "When do you feel most heard and understood by your partner?",
          "What communication challenges come up most frequently?",
          "How can you signal to each other when you need more support?"
        ],
        suggestedActions: [
          "Practice active listening by summarizing what your partner says before responding",
          "Establish a regular check-in routine that works with your schedule"
        ]
      },
      {
        title: "Workload Balance",
        description: "Balancing family responsibilities affects relationship satisfaction.",
        alignment: "Finding a fair division of visible and invisible work benefits both partners.",
        questions: [
          "Which responsibilities feel imbalanced right now?",
          "What tasks do you notice your partner handling that you appreciate?",
          "How can you better support each other with family responsibilities?"
        ],
        suggestedActions: [
          "Identify one 'invisible' task your partner does and offer to share it",
          "Create a shared system for tracking household responsibilities"
        ]
      },
      {
        title: "Quality Time & Connection",
        description: "Making time for connection strengthens your partnership amid family demands.",
        alignment: "Both partners benefit from dedicated time together.",
        questions: [
          "What type of quality time makes you feel most connected?",
          "How can you create more meaningful moments together?",
          "What obstacles prevent you from having regular quality time?"
        ],
        suggestedActions: [
          "Schedule a weekly date night (even at home)",
          "Create a 'no phones' policy during certain times"
        ]
      }
    ],
    closingReflection: "As you finish this meeting, take a moment to appreciate the commitment you're both showing to your relationship. Choose 1-2 actions to focus on before your next meeting, and remember that small, consistent efforts create significant positive change over time."
  };
}

/**
 * Get fallback meeting agenda if AI generation fails
 * @param {number} cycleNumber - Cycle number
 * @returns {object} Fallback meeting agenda
 */
getFallbackMeetingAgenda(cycleNumber) {
  return {
    title: `Cycle ${cycleNumber}: Strengthening Your Partnership`,
    introduction: "Welcome to your couple's meeting! This is a time to connect, understand each other better, and work together on strengthening your relationship. Today's discussion will focus on celebrating what's working well and addressing areas where you can grow together.",
    topics: [
      {
        title: "Communication Patterns",
        description: "How you communicate affects every aspect of your relationship and family dynamics.",
        alignment: "You may have different communication styles that can complement each other when understood.",
        questions: [
          "When do you feel most heard and understood by your partner?",
          "What communication challenges come up most frequently?",
          "How can you signal to each other when you need more support?"
        ],
        suggestedActions: [
          "Practice active listening by summarizing what your partner says before responding",
          "Establish a regular check-in routine that works with your schedule"
        ]
      },
      {
        title: "Workload Balance",
        description: "Balancing family responsibilities affects relationship satisfaction.",
        alignment: "Finding a fair division of visible and invisible work benefits both partners.",
        questions: [
          "Which responsibilities feel imbalanced right now?",
          "What tasks do you notice your partner handling that you appreciate?",
          "How can you better support each other with family responsibilities?"
        ],
        suggestedActions: [
          "Identify one 'invisible' task your partner does and offer to share it",
          "Create a shared system for tracking household responsibilities"
        ]
      },
      {
        title: "Quality Time & Connection",
        description: "Making time for connection strengthens your partnership amid family demands.",
        alignment: "Both partners benefit from dedicated time together.",
        questions: [
          "What type of quality time makes you feel most connected?",
          "How can you create more meaningful moments together?",
          "What obstacles prevent you from having regular quality time?"
        ],
        suggestedActions: [
          "Schedule a weekly date night (even at home)",
          "Create a 'no phones' policy during certain times"
        ]
      }
    ],
    closingReflection: "As you finish this meeting, take a moment to appreciate the commitment you're both showing to your relationship. Choose 1-2 actions to focus on before your next meeting, and remember that small, consistent efforts create significant positive change over time."
  };
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