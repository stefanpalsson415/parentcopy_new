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
            childName: "Which child is this dental appointment for?",
            doctorName: "Which dentist will you be seeing?",
            location: "Where is the dentist office located?",
            date: "What date is this appointment scheduled for?",
            time: "What time is the appointment?",
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
            childName: "Which child is this doctor appointment for?",
            doctorName: "Which doctor will you be seeing?",
            location: "Where is the doctor's office located?",
            date: "What date is this appointment scheduled for?",
            time: "What time is the appointment?",
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
            childName: "Which child is participating in this activity?",
            activityType: "What type of activity is this? (e.g., soccer, music, dance)",
            date: "What date is this activity scheduled for?",
            time: "What time does the activity start?",
            location: "Where will this activity take place?",
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
            childName: "Which of your children will be attending this birthday party?",
            birthdayChildName: "Whose birthday party is this?",
            birthdayChildAge: "How old will they be turning?",
            date: "What date is the birthday party?",
            time: "What time does the party start?",
            location: "Where will the party be held?",
            guestList: "Who's invited to the party?",
            theme: "Is there a theme for the birthday party?",
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
            title: "What's the title or purpose of this meeting?",
            date: "What date is the meeting scheduled for?",
            time: "What time is the meeting?",
            location: "Where will the meeting take place?",
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
            childName: "Which child is this parent-teacher conference for?",
            teacherName: "What's the teacher's name?",
            date: "What date is the conference scheduled for?",
            time: "What time is the conference?",
            location: "Where will the conference take place?",
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
            date: "What date is your date night planned for?",
            time: "What time will you be going out?",
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
            title: "What would you like to call this trip?",
            startDate: "When will you be departing?",
            endDate: "When will you be returning?",
            destination: "Where are you planning to go?",
            participants: "Who will be going on this trip?",
            childName: "Which children are going on this trip?",
            accommodation: "Where will you be staying?",
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
            title: "What would you like to call this vacation?",
            startDate: "When will your vacation begin?",
            endDate: "When will you be returning from vacation?",
            destination: "Where are you planning to vacation?",
            participants: "Who will be going on this vacation?",
            childName: "Which children are going on this vacation?",
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
            childName: "Which of your children is having the playdate?",
            otherChildren: "Which other children will be at the playdate?",
            date: "What date is the playdate scheduled for?",
            time: "What time will the playdate start?",
            location: "Where will the playdate take place?",
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
  // In EventDetailCollectorService.js, update the startCollection method

async startCollection(familyId, sessionId, initialData) {
    try {
      console.log("Starting event detail collection:", { familyId, sessionId, initialData });
      
      // Determine event type from initial data with better detection
      const eventType = this.determineEventType(initialData);
      
      // Enhance the initial data based on event type
      let enhancedInitialData = { ...initialData };
      
      // For medical appointments, ensure we capture doctor name correctly
      if (eventType === 'doctor' || eventType === 'dentist') {
        // If doctorName exists, make sure it's in appointmentDetails too
        if (initialData.doctorName && (!initialData.appointmentDetails || !initialData.appointmentDetails.doctorName)) {
          enhancedInitialData.appointmentDetails = {
            ...(initialData.appointmentDetails || {}),
            doctorName: initialData.doctorName
          };
        }
        // If it's in appointmentDetails but not at top level, add it
        else if (initialData.appointmentDetails?.doctorName && !initialData.doctorName) {
          enhancedInitialData.doctorName = initialData.appointmentDetails.doctorName;
        }
        
        // Ensure category is set to appointment
        enhancedInitialData.category = 'appointment';
      }
      
      // Initialize session data
      const sessionData = {
        familyId,
        eventType,
        collectedData: enhancedInitialData,
        currentStep: 0,
        missingFields: []
      };
      
      // Identify missing required fields
      const requirements = this.eventTypeRequirements[eventType] || this.eventTypeRequirements['general'];
      sessionData.missingFields = this.identifyMissingFields(sessionData.collectedData, requirements);
      
      // Log what fields we'll collect
      console.log(`Will collect these missing fields: ${sessionData.missingFields.join(', ')}`);
      
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
  
  determineEventType(initialData) {
    console.log("Determining event type from data:", initialData);
    
    // Check original text if available for broader context
    const originalText = initialData.originalText || "";
    
    // First check if we have an explicit event type
    if (initialData.eventType) {
      const type = initialData.eventType.toLowerCase();
      
      // Enhanced detection with more keywords
      if (type.includes('dentist') || type.includes('dental') || 
          (initialData.title && initialData.title.toLowerCase().includes('dentist')) ||
          (originalText.toLowerCase().includes('dentist'))) {
        console.log("Detected event type: dentist");
        return 'dentist';
      } else if (type.includes('doctor') || type.includes('medical') || type.includes('appointment') || 
                 type.includes('pediatr') || type.includes('check-up') || type.includes('checkup') ||
                 (initialData.title && (
                   initialData.title.toLowerCase().includes('doctor') || 
                   initialData.title.toLowerCase().includes('dr.') ||
                   initialData.title.toLowerCase().includes('checkup')
                 )) ||
                 (originalText.toLowerCase().includes('doctor') || 
                  originalText.toLowerCase().includes('dr.') || 
                  originalText.toLowerCase().match(/dr\s+[a-z]+/i))) {
        console.log("Detected event type: doctor");
        return 'doctor';
      } else if (type.includes('soccer') || type.includes('practice') || type.includes('lesson') || 
                  type.includes('class') || type.includes('music') || type.includes('sport') ||
                  (originalText.toLowerCase().match(/(?:soccer|basketball|baseball|dance|piano|guitar|swim)/i))) {
        console.log("Detected event type: activity");
        return 'activity';
      } else if (type.includes('birthday') || originalText.toLowerCase().includes('birthday')) {
        console.log("Detected event type: birthday");
        return 'birthday';
      } else if (type.includes('meeting') || originalText.toLowerCase().includes('meeting')) {
        console.log("Detected event type: meeting");
        return 'meeting';
      } else if (type.includes('conference') || type.includes('teacher') || 
                 originalText.toLowerCase().includes('parent-teacher') ||
                 originalText.toLowerCase().includes('teacher conference')) {
        console.log("Detected event type: parent-teacher");
        return 'parent-teacher';
      } else if (type.includes('date') || type.includes('night out') || 
                 originalText.toLowerCase().includes('date night')) {
        console.log("Detected event type: date-night");
        return 'date-night';
      } else if (type.includes('trip') || type.includes('travel') || 
                 originalText.toLowerCase().match(/(?:trip|travel|going to)/i)) {
        console.log("Detected event type: travel");
        return 'travel';
      } else if (type.includes('vacation') || originalText.toLowerCase().includes('vacation')) {
        console.log("Detected event type: vacation");
        return 'vacation';
      } else if (type.includes('playdate') || type.includes('play date') || 
                 originalText.toLowerCase().includes('playdate') ||
                 originalText.toLowerCase().includes('play date')) {
        console.log("Detected event type: playdate");
        return 'playdate';
      }
    }
    
    // Check for doctor by name pattern in original text
    // This catches phrases like "appointment with Dr. Smith"
    if (originalText.toLowerCase().match(/(?:with|see)\s+(?:dr\.?|doctor)\s+[a-z]+/i)) {
      console.log("Detected event type from doctor name pattern: doctor");
      return 'doctor';
    }
    
    // If no explicit type, check for doctor name which indicates a medical appointment
    if (initialData.doctorName || initialData.appointmentDetails?.doctorName) {
      console.log("Detected event type from doctor name field: doctor");
      return 'doctor';
    }
    
    // If we have a title, check for keywords
    if (initialData.title) {
      const title = initialData.title.toLowerCase();
      
      if (title.includes('dentist') || title.includes('dental')) {
        console.log("Detected event type from title: dentist");
        return 'dentist';
      } else if (title.includes('doctor') || title.includes('dr.') || 
                 title.includes('medical') || title.includes('appointment') ||
                 title.includes('checkup') || title.includes('check-up')) {
        console.log("Detected event type from title: doctor");
        return 'doctor';
      } else if (title.includes('birthday')) {
        console.log("Detected event type from title: birthday");
        return 'birthday';
      } else if (title.includes('practice') || title.includes('lesson') || 
                 title.includes('class') || title.includes('activity') ||
                 title.match(/(?:soccer|basketball|baseball|dance|piano|guitar|swim)/i)) {
        console.log("Detected event type from title: activity");
        return 'activity';
      }
    }
    
    // Check original text for more keywords
    if (originalText) {
      const text = originalText.toLowerCase();
      
      if (text.includes('appt') || text.includes('appointment')) {
        // Check if it's dental or medical
        if (text.includes('dental') || text.includes('dentist') || text.includes('teeth')) {
          console.log("Detected event type from text keywords: dentist");
          return 'dentist';
        } else {
          console.log("Detected event type from text keywords: doctor");
          return 'doctor';
        }
      }
    }
    
    // Default to general event type
    console.log("Could not determine specific event type, using: general");
    return 'general';
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
      
      // Get prompt for this field with improved defaults
const requirements = this.eventTypeRequirements[sessionData.eventType] || this.eventTypeRequirements['general'];
let prompt;

// If we have a specific prompt, use it
if (requirements.prompts && requirements.prompts[currentField]) {
  prompt = requirements.prompts[currentField];
} else {
  // Create a natural-sounding prompt based on the field name
  const fieldDisplayNames = {
    'childName': "which child this is for",
    'date': "what date",
    'time': "what time",
    'location': "where",
    'title': "what to call this event",
    'doctorName': "which doctor you'll be seeing",
    'reasonForVisit': "the reason for this visit",
    'endDateTime': "what time it ends",
    'duration': "how long it will last"
  };
  
  const displayName = fieldDisplayNames[currentField] || currentField.replace(/([A-Z])/g, ' $1').toLowerCase();
  prompt = `Could you tell me ${displayName} for this ${sessionData.eventType}?`;
}
      
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
    
    // Create different intro phrases based on progress
    const introVariations = sessionData.currentStep === 0 ? [
      // First question intros
      "Great! Let's get this on your calendar. ",
      "I'll add this to your calendar! ",
      "Let's get all the details for your calendar. "
    ] : [
      // Follow-up question intros
      "Thanks! Just a few more details. ",
      "Got it! Also, ",
      "Perfect! Now, "
    ];
    
    const intro = introVariations[Math.floor(Math.random() * introVariations.length)];
    
    // Create context-aware prompts based on event type and collected data
    let contextPrefix = "";
    
    // Add context about the event type and child if known
    if (data.childName && sessionData.eventType) {
      if (sessionData.eventType === 'doctor' || sessionData.eventType === 'dentist') {
        contextPrefix = `For ${data.childName}'s ${sessionData.eventType} appointment, `;
      } else if (sessionData.eventType === 'activity') {
        contextPrefix = `For ${data.childName}'s ${data.activityType || 'activity'}, `;
      } else if (sessionData.eventType === 'playdate') {
        contextPrefix = `For ${data.childName}'s playdate, `;
      } else {
        contextPrefix = `For ${data.childName}'s ${sessionData.eventType}, `;
      }
    } 
    // Just event type without child name
    else if (sessionData.eventType) {
      if (sessionData.eventType === 'doctor' || sessionData.eventType === 'dentist') {
        contextPrefix = `For this ${sessionData.eventType} appointment, `;
      } else if (sessionData.eventType === 'date-night') {
        contextPrefix = `For your date night, `;
      } else if (sessionData.eventType === 'travel' || sessionData.eventType === 'vacation') {
        contextPrefix = `For your ${sessionData.eventType}, `;
      } else {
        contextPrefix = `For this ${sessionData.eventType}, `;
      }
    }
    
    // Special field-specific conversational prompts
    let fieldPrompt = basePrompt;
    
    if (field === 'location') {
      fieldPrompt = `Where is this happening? I'll make sure everyone gets there on time!`;
    } else if (field === 'equipmentNeeded') {
      fieldPrompt = `Don't forget the gear! What equipment is needed for this?`;
    } else if (field === 'activities') {
      fieldPrompt = `What fun activities are planned? I'll make sure everyone's prepared!`;
    } else if (field === 'foodPlans') {
      fieldPrompt = `Time for the important question: what's the food situation?`;
    } else if (field === 'packingList') {
      fieldPrompt = `Would you like me to help create a packing list? (I'm really good at remembering essentials!)`;
    } else if (field === 'transportation') {
      fieldPrompt = `How is everyone getting there? (I can remind you about travel times later)`;
    }
    
    // Put it all together with variety based on step and progress
    let finalPrompt;
    
    // First question gets a full intro
    if (sessionData.currentStep === 0) {
      finalPrompt = `${intro}${contextPrefix}${fieldPrompt.toLowerCase()}`;
    } 
    // Later questions can be more direct
    else if (sessionData.currentStep < sessionData.missingFields.length - 1) {
      finalPrompt = `${intro}${contextPrefix}${fieldPrompt.toLowerCase()}`;
    } 
    // Last question gets a "almost done" intro
    else {
      finalPrompt = `Almost done! ${contextPrefix}${fieldPrompt.toLowerCase()}`;
    }
    
    return finalPrompt;
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
    
    console.log("Identifying missing fields for event type:", data.eventType);
    console.log("Current data:", JSON.stringify(data, null, 2));
    
    // Before checking required fields, check if we have child name in the original text
    if (!data.childName && data.originalText) {
      // Look for patterns like "for [name]" in the original text
      const childNameMatch = data.originalText.match(/for\s+(\w+)(?:\s+(?:next|on|at|this)|\s*$)/i);
      if (childNameMatch && childNameMatch[1]) {
        // Found a potential child name
        const potentialChildName = childNameMatch[1];
        // Check that it's not a common word
        const nonChildWords = ['myself', 'me', 'appointment', 'meeting', 'doctor', 'dentist'];
        if (!nonChildWords.includes(potentialChildName.toLowerCase())) {
          console.log(`Found child name "${potentialChildName}" in original text, using it`);
          data.childName = potentialChildName;
        }
      }
    }
    
    // Check required fields with better validation
    for (const field of requirements.required) {
      // More thorough check for field existence and meaningful content
      const hasValue = field in data && 
                       data[field] !== undefined && 
                       data[field] !== null && 
                       data[field] !== '';
      
      // Skip fields that are derived from other fields
      if (field === 'dateTime' && (data.date || data.time)) {
        continue;
      }
      
      // Skip title if we already have appointment type and other identifiers
      if (field === 'title' && 
          (data.eventType === 'doctor' || data.eventType === 'dentist') && 
          data.doctorName) {
        continue;
      }
      
      // Skip endDateTime if we have dateTime (we can calculate it)
      if (field === 'endDateTime' && data.dateTime) {
        continue;
      }
      
      // Skip childName if we have it in the 'for' field (common in medical appointments)
      if (field === 'childName' && data.for && typeof data.for === 'string') {
        console.log(`Using "for" field value "${data.for}" as childName`);
        data.childName = data.for;
        continue;
      }
      
      if (!hasValue) {
        missing.push(field);
        console.log(`Field '${field}' is missing`);
      }
    }
    
    // Only add high-priority optional fields if we have most required fields
    // This way we focus on essential information first
    if (missing.length <= 2) {
      // Add high-priority optional fields based on event type
      if ((data.eventType === 'doctor' || data.eventType === 'appointment') && 
          !data.reasonForVisit && !missing.includes('reasonForVisit')) {
        missing.push('reasonForVisit');
      }
      
      if (data.eventType === 'activity' && 
          !data.equipmentNeeded && !missing.includes('equipmentNeeded')) {
        missing.push('equipmentNeeded');
      }
      
      // For dentist visits, ask about insurance info
      if (data.eventType === 'dentist' && 
          !data.insuranceInfo && !missing.includes('insuranceInfo')) {
        missing.push('insuranceInfo');
      }
    }
    
    // Sort missing fields by importance
    const priorityOrder = ['date', 'time', 'childName', 'doctorName', 'location'];
    missing.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a);
      const bIndex = priorityOrder.indexOf(b);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    console.log("Identified missing fields:", missing);
    
    // Limit to 3 fields at a time to avoid overwhelming the user
    // This makes the experience more conversational
    return missing.slice(0, 3);
  }

  /**
   * Persist session data to Firestore
   * @param {string} sessionId - Session ID
   * @param {object} sessionData - Session data to persist
   */
  async persistSessionData(sessionId, sessionData) {
    try {
      // Create a clean copy of data with no undefined values
      const cleanData = { ...sessionData };
      
      // Check if collectedData exists
      if (cleanData.collectedData) {
        const cleanCollectedData = { ...cleanData.collectedData };
        
        // Ensure endDateTime is defined
        if (cleanCollectedData.endDateTime === undefined) {
          // If we have a dateTime, calculate endDateTime (1 hour later)
          if (cleanCollectedData.dateTime) {
            const startDate = new Date(cleanCollectedData.dateTime);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
            cleanCollectedData.endDateTime = endDate.toISOString();
          } else {
            // If no dateTime, don't include endDateTime
            delete cleanCollectedData.endDateTime;
          }
        }
        
        // Remove any other undefined values in collectedData
        Object.keys(cleanCollectedData).forEach(key => {
          if (cleanCollectedData[key] === undefined) {
            delete cleanCollectedData[key];
          }
        });
        
        cleanData.collectedData = cleanCollectedData;
      }
      
      // Remove any undefined values at the top level
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      const sessionRef = doc(db, "eventCollectionSessions", sessionId);
      await setDoc(sessionRef, {
        ...cleanData,
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