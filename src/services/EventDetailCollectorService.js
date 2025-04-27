// src/services/EventDetailCollectorService.js
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

class EventDetailCollectorService {
  constructor() {
    // Define required fields for each event type
    this.eventTypeRequirements = {
      'dentist': {
        required: ['date', 'time', 'childName', 'location', 'doctorName', 'insuranceInfo'],
        optional: ['formsNeeded', 'fastingRequired', 'bringRecords', 'transportation', 'followUpDate', 'costsAndCopays'],
        prompts: {
          doctorName: "Which dentist will you be seeing?",
          location: "Where is the dentist office located?",
          insuranceInfo: "Should I note any insurance information for this appointment?",
          formsNeeded: "Are there any forms you need to complete beforehand?",
          fastingRequired: "Is any fasting required before this appointment?",
          bringRecords: "Do you need to bring previous dental records?",
          transportation: "How will you get to the appointment?",
          followUpDate: "Would you like to schedule a follow-up appointment?",
          costsAndCopays: "Should I note any expected costs or copays?"
        }
      },
      'doctor': {
        required: ['date', 'time', 'childName', 'location', 'doctorName', 'reasonForVisit'],
        optional: ['insuranceInfo', 'formsNeeded', 'fastingRequired', 'bringRecords', 'transportation', 'followUpDate', 'costsAndCopays'],
        prompts: {
          doctorName: "Which doctor will you be seeing?",
          location: "Where is the doctor's office located?",
          reasonForVisit: "What's the reason for this visit?",
          insuranceInfo: "Should I note any insurance information?",
          formsNeeded: "Are there any forms needed for this appointment?",
          transportation: "How will you get to the appointment?"
        }
      },
      'activity': {
        required: ['activityType', 'date', 'time', 'location', 'childName'],
        optional: ['coach', 'equipmentNeeded', 'parentAttendance', 'weatherContingency', 'fees', 'uniform', 'teammates', 'duration', 'carpooling'],
        prompts: {
          activityType: "What type of activity is this? (e.g., soccer, music, dance)",
          coach: "Who's the coach or instructor for this activity?",
          equipmentNeeded: "Is there any equipment needed for this activity?",
          parentAttendance: "Does a parent need to stay for this activity?",
          duration: "How long does this activity usually last?",
          carpooling: "Are there carpooling arrangements for this activity?",
          uniform: "Is there a specific uniform or dress code required?"
        }
      },
      'birthday': {
        required: ['date', 'time', 'location', 'birthdayChildName', 'birthdayChildAge', 'guestList'],
        optional: ['theme', 'foodArrangements', 'activities', 'budget', 'gifts', 'favors', 'setupCleanup', 'weatherBackup', 'rsvpDeadline'],
        prompts: {
          theme: "Is there a theme for the birthday party?",
          guestList: "Who's invited to the party?",
          foodArrangements: "What are the plans for food and cake?",
          activities: "What activities are planned for the party?",
          budget: "Is there a budget you'd like to set for the party?",
          gifts: "Any gift preferences to note?",
          favors: "Will there be party favors for guests?",
          setupCleanup: "Who's helping with setup and cleanup?",
          weatherBackup: "Is there a backup plan if weather is bad?"
        }
      },
      'meeting': {
        required: ['title', 'date', 'time', 'agenda'],
        optional: ['location', 'participants', 'issuesForDiscussion', 'meetingGoals', 'trackingMethod', 'followUpPlan'],
        prompts: {
          agenda: "What items should be on the agenda for this meeting?",
          issuesForDiscussion: "What specific issues need to be discussed?",
          participants: "Who needs to attend this meeting?",
          meetingGoals: "What do you hope to accomplish in this meeting?",
          followUpPlan: "How will you follow up after the meeting?"
        }
      },
      'parent-teacher': {
        required: ['date', 'time', 'location', 'childName', 'teacherName'],
        optional: ['academicPerformance', 'concernsToDiscuss', 'questionsToAsk', 'previousGoals', 'upcomingGoals', 'testSchedules'],
        prompts: {
          teacherName: "What's the teacher's name?",
          academicPerformance: "Are there specific subjects to discuss?",
          concernsToDiscuss: "Are there any specific concerns you want to address?",
          questionsToAsk: "Do you have specific questions for the teacher?",
          previousGoals: "What goals were set in the previous conference?",
          upcomingGoals: "What goals would you like to set going forward?"
        }
      },
      'date-night': {
        required: ['date', 'time', 'childcareArranged'],
        optional: ['venue', 'budget', 'transportation', 'needsBabysitter', 'specialOccasion', 'reservations', 'dresscode'],
        prompts: {
          venue: "Where are you planning to go for your date night?",
          childcareArranged: "Have you arranged childcare for the kids?",
          needsBabysitter: "Do you need help finding a babysitter?",
          budget: "Do you have a budget in mind for this date night?",
          transportation: "How will you get there?",
          specialOccasion: "Is this for a special occasion?",
          reservations: "Should I note any reservation details?"
        }
      },
      'travel': {
        required: ['title', 'startDate', 'endDate', 'destination', 'participants'],
        optional: ['accommodation', 'transportation', 'packingList', 'petCare', 'houseSecurity', 'emergencyContacts', 'travelDocuments', 'activities'],
        prompts: {
          destination: "Where are you planning to go?",
          accommodation: "Where will you be staying?",
          participants: "Who will be going on this trip?",
          transportation: "How will you be traveling there?",
          packingList: "Would you like to create a packing list for this trip?",
          activities: "Are there specific activities planned for this trip?",
          petCare: "Do you need to arrange pet care during your absence?",
          houseSecurity: "Any house security arrangements to note?"
        }
      },
      'vacation': {
        required: ['title', 'startDate', 'endDate', 'destination', 'participants'],
        optional: ['accommodation', 'transportation', 'packingList', 'petCare', 'houseSecurity', 'emergencyContacts', 'travelDocuments', 'activities', 'budget'],
        prompts: {
          destination: "Where are you planning to vacation?",
          accommodation: "Where will you be staying?",
          transportation: "How will you be traveling there?",
          budget: "What's the budget for this vacation?",
          activities: "Any specific activities or excursions planned?",
          packingList: "Would you like to create a packing list for everyone?",
          petCare: "Do you need to arrange pet care while away?",
          houseSecurity: "Any house security arrangements to note?"
        }
      },
      'playdate': {
        required: ['date', 'time', 'location', 'childName', 'otherChildren'],
        optional: ['activities', 'foodPlans', 'transportation', 'dropoffPickup', 'endTime', 'parentStaying', 'specialNeeds'],
        prompts: {
          otherChildren: "Which other children will be at the playdate?",
          activities: "What activities are planned for the playdate?",
          foodPlans: "What are the plans for food or snacks?",
          endTime: "What time will the playdate end?",
          parentStaying: "Will a parent be staying for the playdate?",
          dropoffPickup: "Who will be handling drop-off and pickup?",
          specialNeeds: "Are there any allergies or special needs to note?"
        }
      }
    };

    // In-memory store for active collection sessions
    this.activeCollectionSessions = {};
  }

  /**
   * Start a new detail collection flow
   * @param {string} familyId - Family ID
   * @param {string} sessionId - Unique session ID
   * @param {object} initialData - Initially extracted event data
   * @returns {Promise<object>} First prompt for missing information
   */
  async startCollection(familyId, sessionId, initialData) {
    try {
      console.log("Starting event detail collection:", { familyId, sessionId, initialData });
      
      // Determine event type from initial data
      const eventType = this.determineEventType(initialData);
      
      // Initialize session data
      const sessionData = {
        familyId,
        eventType,
        collectedData: { ...initialData },
        currentStep: 0,
        missingFields: []
      };
      
      // Identify missing required fields
      const requirements = this.eventTypeRequirements[eventType] || this.eventTypeRequirements['general'];
      sessionData.missingFields = this.identifyMissingFields(sessionData.collectedData, requirements);
      
      // Save session data
      this.activeCollectionSessions[sessionId] = sessionData;
      
      // Store in Firestore for persistence
      await this.persistSessionData(sessionId, sessionData);
      
      // Get next prompt
      return this.getNextPrompt(sessionId);
    } catch (error) {
      console.error("Error starting collection flow:", error);
      throw error;
    }
  }

  /**
   * Process user response and update collection state
   * @param {string} sessionId - Collection session ID
   * @param {string} userResponse - User's response to the prompt
   * @returns {Promise<object>} Next prompt or completion status
   */
  async processResponse(sessionId, userResponse) {
    try {
      // Get session data
      let sessionData = this.activeCollectionSessions[sessionId];
      
      if (!sessionData) {
        // Try to retrieve from Firestore
        sessionData = await this.retrieveSessionData(sessionId);
        
        if (!sessionData) {
          throw new Error("Collection session not found");
        }
        
        // Store in local cache
        this.activeCollectionSessions[sessionId] = sessionData;
      }
      
      // Get current field being collected
      const currentField = sessionData.missingFields[sessionData.currentStep];
      
      if (!currentField) {
        return { 
          status: 'completed',
          message: "All required information has been collected!",
          collectedData: sessionData.collectedData
        };
      }
      
      // Process user response for this field
      const fieldData = this.processFieldResponse(currentField, userResponse, sessionData.eventType);
      
      // Update collected data
      sessionData.collectedData[currentField] = fieldData;
      
      // Move to next step
      sessionData.currentStep++;
      
      // Update persistence
      await this.persistSessionData(sessionId, sessionData);
      
      // Check if we're done
      if (sessionData.currentStep >= sessionData.missingFields.length) {
        return {
          status: 'completed',
          message: "Thanks! I've got all the information I need.",
          collectedData: sessionData.collectedData
        };
      }
      
      // Get next prompt
      return this.getNextPrompt(sessionId);
    } catch (error) {
      console.error("Error processing response:", error);
      throw error;
    }
  }

  /**
   * Get the next prompt for missing information
   * @param {string} sessionId - Collection session ID
   * @returns {Promise<object>} Prompt information
   */
  async getNextPrompt(sessionId) {
    try {
      // Get session data
      const sessionData = this.activeCollectionSessions[sessionId];
      
      if (!sessionData) {
        throw new Error("Collection session not found");
      }
      
      // Get current field
      const currentField = sessionData.missingFields[sessionData.currentStep];
      
      if (!currentField) {
        return { 
          status: 'completed',
          message: "All required information has been collected!",
          collectedData: sessionData.collectedData
        };
      }
      
      // Get prompt for this field
      const requirements = this.eventTypeRequirements[sessionData.eventType] || this.eventTypeRequirements['general'];
      const prompt = requirements.prompts[currentField] || `What is the ${currentField} for this ${sessionData.eventType}?`;
      
      // Add some context and a fun tone
      let contextualPrompt = this.addContextToPrompt(prompt, currentField, sessionData);
      
      return {
        status: 'in_progress',
        field: currentField,
        prompt: contextualPrompt,
        step: sessionData.currentStep + 1,
        totalSteps: sessionData.missingFields.length,
        progress: `${sessionData.currentStep + 1}/${sessionData.missingFields.length}`,
        collectedSoFar: sessionData.collectedData
      };
    } catch (error) {
      console.error("Error getting next prompt:", error);
      throw error;
    }
  }

  /**
   * Add context and fun tone to prompts
   * @param {string} basePrompt - Base prompt for the field
   * @param {string} field - Field being collected
   * @param {object} sessionData - Current session data
   * @returns {string} Contextual prompt
   */
  addContextToPrompt(basePrompt, field, sessionData) {
    // Add context based on what we already know
    const data = sessionData.collectedData;
    
    // Add some variety and personality to the prompts
    const promptVariations = [
      // Fun intros
      `Ooh, let's make sure we get all the details right! ${basePrompt}`,
      `Almost there! ${basePrompt}`,
      `Let's keep building this out. ${basePrompt}`,
      
      // Context-aware prompts
      data.childName ? `For ${data.childName}'s ${sessionData.eventType}, ${basePrompt.toLowerCase()}` : basePrompt,
      
      // Field-specific fun prompts
      field === 'location' ? `Where is this happening? I'll make sure everyone gets there on time!` : null,
      field === 'equipmentNeeded' ? `Don't forget the gear! What equipment is needed for this?` : null,
      field === 'activities' ? `What fun activities are planned? I'll make sure everyone's prepared!` : null,
      field === 'foodPlans' ? `Time for the important question: what's the food situation?` : null,
      
      // Informative prompts with tips
      field === 'packingList' ? `Would you like me to help create a packing list? (I'm really good at remembering essentials!)` : null,
      field === 'transportation' ? `How is everyone getting there? (I can remind you about travel times later)` : null
    ].filter(Boolean);
    
    // Pick a random variation that applies
    const randomPrompt = promptVariations[Math.floor(Math.random() * promptVariations.length)];
    
    return randomPrompt;
  }

  /**
   * Process and standardize user's response for a specific field
   * @param {string} field - Field being collected
   * @param {string} response - User's response
   * @param {string} eventType - Type of event
   * @returns {any} Processed field value
   */
  processFieldResponse(field, response, eventType) {
    // Standardize response based on field type
    switch (field) {
      case 'date':
        // Try to parse date from response
        try {
          const dateMatch = response.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?|(?:next|this) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|today/i);
          if (dateMatch) {
            // Convert to standard format
            const date = new Date();
            // Handle relative dates like "next Tuesday"
            if (dateMatch[4]) {
              const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const targetDay = days.indexOf(dateMatch[4].toLowerCase());
              const currentDay = date.getDay();
              let daysToAdd = targetDay - currentDay;
              if (daysToAdd <= 0) daysToAdd += 7;
              date.setDate(date.getDate() + daysToAdd);
            } else if (response.toLowerCase().includes('tomorrow')) {
              date.setDate(date.getDate() + 1);
            } else if (dateMatch[1] && dateMatch[2]) {
              // Handle MM/DD format
              date.setMonth(parseInt(dateMatch[1]) - 1);
              date.setDate(parseInt(dateMatch[2]));
              if (dateMatch[3]) {
                const year = parseInt(dateMatch[3]);
                date.setFullYear(year < 100 ? 2000 + year : year);
              }
            }
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn("Error parsing date:", e);
        }
        // If parsing fails, return as is
        return response;
        
      case 'time':
        // Try to parse time
        try {
          const timeMatch = response.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3]?.toLowerCase();
            
            // Convert to 24-hour format
            if (period === 'pm' && hours < 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;
            
            // Format as HH:MM
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
        } catch (e) {
          console.warn("Error parsing time:", e);
        }
        // If parsing fails, return as is
        return response;
        
      case 'childcareArranged':
      case 'parentAttendance':
      case 'fastingRequired':
      case 'bringRecords':
        // Convert yes/no responses to boolean
        const yesResponses = ['yes', 'yeah', 'yep', 'sure', 'true', 'absolutely', 'definitely'];
        const noResponses = ['no', 'nope', 'nah', 'not', 'false', 'don\'t think so'];
        
        const responseLower = response.toLowerCase();
        
        if (yesResponses.some(yes => responseLower.includes(yes))) {
          return true;
        } else if (noResponses.some(no => responseLower.includes(no))) {
          return false;
        }
        
        // If can't determine, return as is
        return response;
        
      default:
        // For other fields, return response as is
        return response;
    }
  }

  /**
   * Determine event type from initial data
   * @param {object} initialData - Initially extracted event data
   * @returns {string} Event type
   */
  determineEventType(initialData) {
    // First check if we have an explicit event type
    if (initialData.eventType) {
      const type = initialData.eventType.toLowerCase();
      
      if (type.includes('dentist') || type.includes('dental')) {
        return 'dentist';
      } else if (type.includes('doctor') || type.includes('medical') || type.includes('appointment')) {
        return 'doctor';
      } else if (type.includes('soccer') || type.includes('practice') || type.includes('lesson') || 
                 type.includes('class') || type.includes('music')) {
        return 'activity';
      } else if (type.includes('birthday')) {
        return 'birthday';
      } else if (type.includes('meeting')) {
        return 'meeting';
      } else if (type.includes('conference') || type.includes('teacher')) {
        return 'parent-teacher';
      } else if (type.includes('date') || type.includes('night out')) {
        return 'date-night';
      } else if (type.includes('trip') || type.includes('travel')) {
        return 'travel';
      } else if (type.includes('vacation')) {
        return 'vacation';
      } else if (type.includes('playdate') || type.includes('play date')) {
        return 'playdate';
      }
    }
    
    // If no explicit type, try to infer from title or content
    const title = initialData.title || '';
    const content = JSON.stringify(initialData).toLowerCase();
    
    if (content.includes('dentist') || content.includes('dental')) {
      return 'dentist';
    } else if (content.includes('doctor') || content.includes('medical') || content.includes('appointment')) {
      return 'doctor';
    } else if (content.includes('soccer') || content.includes('practice') || content.includes('lesson')) {
      return 'activity';
    } else if (content.includes('birthday')) {
      return 'birthday';
    } else if (content.includes('meeting')) {
      return 'meeting';
    } else if (content.includes('conference') || content.includes('teacher')) {
      return 'parent-teacher';
    } else if (content.includes('date night') || (content.includes('date') && content.includes('babysitter'))) {
      return 'date-night';
    } else if (content.includes('vacation')) {
      return 'vacation';
    } else if (content.includes('trip') || content.includes('travel') || content.includes('weekend')) {
      return 'travel';
    } else if (content.includes('playdate') || content.includes('play date')) {
      return 'playdate';
    }
    
    // Default to general event type
    return 'general';
  }

  /**
   * Identify missing required fields
   * @param {object} data - Currently collected data
   * @param {object} requirements - Field requirements
   * @returns {Array} List of missing required fields
   */
  identifyMissingFields(data, requirements) {
    const missing = [];
    
    // Check required fields
    for (const field of requirements.required) {
      if (!data[field] || data[field] === '') {
        missing.push(field);
      }
    }
    
    // Add high-priority optional fields based on event type
    if (data.eventType === 'appointment' && !data.reasonForVisit) {
      missing.push('reasonForVisit');
    }
    
    if (data.eventType === 'activity' && !data.equipmentNeeded) {
      missing.push('equipmentNeeded');
    }
    
    // Limit to 5 fields at a time to avoid overwhelming the user
    return missing.slice(0, 5);
  }

  /**
   * Persist session data to Firestore
   * @param {string} sessionId - Session ID
   * @param {object} sessionData - Session data to persist
   */
  async persistSessionData(sessionId, sessionData) {
    try {
      const sessionRef = doc(db, "eventCollectionSessions", sessionId);
      await setDoc(sessionRef, {
        ...sessionData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error persisting session data:", error);
      // Non-critical error, continue without persistence
    }
  }

  /**
   * Retrieve session data from Firestore
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} Session data
   */
  async retrieveSessionData(sessionId) {
    try {
      const sessionRef = doc(db, "eventCollectionSessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (sessionSnap.exists()) {
        return sessionSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error("Error retrieving session data:", error);
      return null;
    }
  }

  /**
   * Complete a collection session
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} Collected data
   */
  async completeSession(sessionId) {
    try {
      const sessionData = this.activeCollectionSessions[sessionId];
      
      if (!sessionData) {
        // Try to retrieve from Firestore
        const firestoreData = await this.retrieveSessionData(sessionId);
        
        if (!firestoreData) {
          throw new Error("Collection session not found");
        }
        
        return firestoreData.collectedData;
      }
      
      // Clean up
      delete this.activeCollectionSessions[sessionId];
      
      return sessionData.collectedData;
    } catch (error) {
      console.error("Error completing session:", error);
      throw error;
    }
  }
}

export default new EventDetailCollectorService();