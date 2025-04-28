// src/services/UnifiedParserService.js
import ClaudeService from './ClaudeService';

/**
 * Unified Parser Service
 * Uses Claude AI to parse different types of structured information from text and images
 * Handles events, providers, todos, and documents with appropriate context management
 */
class UnifiedParserService {
  constructor() {
    this.claudeService = ClaudeService;
  }

  /**
   * Parse input with minimal context (just the current message)
   * @param {string} text - The text to parse
   * @param {string} type - The type of information to extract
   * @param {object} context - Additional context (family members, etc.)
   * @returns {Promise<object>} Extracted structured information
   */
  async parseWithMinimalContext(text, type, context = {}) {
    try {
      console.log(`Parsing ${type} with minimal context from: "${text.substring(0, 100)}..."`);
      
      // Build a specialized system prompt with clear extraction instructions
      const systemPrompt = `You are Allie, a family assistant AI specialized in extracting calendar events.
      You must extract the specific ${type} details from the user's message.
      
      IMPORTANT: Return ONLY a valid JSON object without any explanation or extra text.
      Extract precisely and thoroughly:
      
      - Event title (extract the specific appointment/event name)
      - Date and time (convert to yyyy-mm-dd format)
      - Location (if mentioned)
      - People involved (children, doctors, etc.)
      - Type of event (doctor, dentist, activity, meeting, etc.)
      
      For example, with "schedule a doctor's appointment for Emma on Tuesday at 3pm with Dr. Smith":
      
      {
        "title": "Doctor's Appointment with Dr. Smith",
        "eventType": "doctor",
        "category": "appointment",
        "childName": "Emma",
        "doctorName": "Dr. Smith",
        "dateTime": "2025-04-30T15:00:00.000Z",
        "location": null
      }
      
      ${this.getTypeSpecificInstructions(type)}
      
      Return ONLY the JSON. No markdown code blocks, no explanations, no extra text.
      If you can't determine a field value, set it to null instead of omitting it.`;
      
      // Send only the current message to Claude with clearer instructions
      const response = await this.claudeService.generateResponse(
        [{ 
          role: 'user', 
          content: `Extract the exact ${type} information from this text (return ONLY a valid JSON object): "${text}"` 
        }],
        { system: systemPrompt },
        { temperature: 0.1 } // Very low temperature for precision
      );
      
      // Process the response with improved extraction
      return this.processResponse(response, type);
    } catch (error) {
      console.error(`Error parsing ${type} with minimal context:`, error);
      throw error;
    }
  }
  
  // Other methods remain unchanged...

  /**
   * Process Claude's response into a structured format
   * @param {string} response - The response from Claude
   * @param {string} type - The type of information being extracted
   * @returns {object} Structured data extracted from the response
   */
  // In src/services/UnifiedParserService.js, replace the processResponse method with this improved version:
processResponse(response, type) {
  try {
    // Enhanced JSON extraction logic with better fallbacks
    let result = null;
    console.log(`Processing ${type} response of length ${response.length}`);
    
    // First try: direct JSON parsing if response is already JSON
    try {
      // Trim the response to remove any whitespace
      response = response.trim();
      
      // Check if the response is already a valid JSON
      if (response.startsWith('{') && response.endsWith('}')) {
        try {
          result = JSON.parse(response);
          console.log(`Successfully parsed direct JSON for ${type}`);
          return result;
        } catch (e) {
          // Continue to other methods
        }
      }
      
      // If not a direct JSON, look for JSON in the text using a more robust extractor
      const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
      const matches = response.match(jsonRegex);
      
      if (matches && matches.length > 0) {
        for (const match of matches) {
          try {
            result = JSON.parse(match);
            console.log(`Extracted JSON using regex for ${type}`);
            return result;
          } catch (e) {
            // Try next match
            continue;
          }
        }
      }
    } catch (directParseError) {
      // Continue to markdown parsing if direct parsing fails
      console.log(`Direct JSON parsing failed: ${directParseError.message}`);
    }
    
    // Look for JSON in markdown code blocks
    const markdownJsonRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
    const markdownMatch = response.match(markdownJsonRegex);
    if (markdownMatch && markdownMatch[1]) {
      try {
        result = JSON.parse(markdownMatch[1]);
        console.log(`Found JSON in markdown code block for ${type}`);
        return result;
      } catch (markdownError) {
        console.warn(`Error parsing JSON from markdown for ${type}:`, markdownError);
      }
    }
    
    // If no valid JSON found, create a structured event from the response
    if (type === 'event') {
      console.log(`Creating intelligent event fallback for: "${response.substring(0, 100)}..."`);
      
      // Extract relevant information using regex
      result = this.createFallbackEvent(response);
      console.log("Created fallback event:", result);
      return result;
    }
    
    throw new Error("All parsing methods failed");
    
  } catch (error) {
    console.error(`Error processing ${type} response:`, error);
    
    // Return a basic fallback based on the type
    if (type === 'event') {
      return { 
        title: "Untitled Event", 
        eventType: "general", 
        dateTime: new Date().toISOString(), 
        endDateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
        extraDetails: {} 
      };
    }
    
    return {};
  }
}

// Add this new helper method to UnifiedParserService.js
createFallbackEvent(text) {
  // Determine if this is a medical appointment
  const isMedicalAppointment = 
    text.toLowerCase().includes('doctor') || 
    text.toLowerCase().includes('dentist') || 
    text.toLowerCase().includes('appointment');
  
  // Extract title with improved patterns
  let title = "Appointment";
  const titlePatterns = [
    /title[:\s]+"([^"]+)"/i,
    /appointment (?:for|with) ([^"]+?) (?:on|at)/i,
    /meeting with ([^"]+?) (?:on|at)/i,
    /event[:\s]+"?([^",]+)"?/i, 
    /(\w+(?:'s)? appointment)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }
  
  // Extract child name
  let childName = null;
  const childPatterns = [
    /for ([A-Za-z]+?)(?:'s)? (?:on|at|appointment)/i,
    /childName[:\s]+"?([^",]+)"?/i,
    /([A-Za-z]+?)(?:'s) appointment/i,
    /appointment for ([A-Za-z]+)/i
  ];
  
  for (const pattern of childPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      childName = match[1].trim();
      break;
    }
  }
  
  // Extract doctor name
  let doctorName = null;
  const doctorPatterns = [
    /(?:with|see) (?:Dr\.|Doctor) ([A-Za-z]+)/i,
    /doctorName[:\s]+"?([^",]+)"?/i,
    /Dr\. ([A-Za-z]+)/i,
    /Doctor ([A-Za-z]+)/i
  ];
  
  for (const pattern of doctorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      doctorName = `Dr. ${match[1].trim()}`;
      break;
    }
  }
  
  // Extract date and time
  let dateTime = new Date();
  dateTime.setDate(dateTime.getDate() + 1); // Default to tomorrow
  dateTime.setHours(15, 0, 0, 0); // Default to 3 PM
  
  const datePatterns = [
    /on ([A-Za-z]+ \d+(?:st|nd|rd|th)?)/i,
    /next ([a-z]+day)/i,
    /tomorrow/i
  ];
  
  const timePatterns = [
    /at (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  ];
  
  // Process date
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('tomorrow')) {
        // Already set to tomorrow by default
      } else if (match[0].toLowerCase().includes('next')) {
        // Handle "next Monday", "next Tuesday", etc.
        const dayName = match[1].toLowerCase();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.findIndex(d => dayName.includes(d));
        
        if (dayIndex >= 0) {
          const today = dateTime.getDay();
          let daysToAdd = (dayIndex - today + 7) % 7;
          if (daysToAdd === 0) daysToAdd = 7; // If today, go to next week
          dateTime.setDate(dateTime.getDate() + daysToAdd - 1); // -1 because we already added 1 day
        }
      } else {
        // Try to parse specific date like "January 5th"
        try {
          const dateStr = match[1];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            dateTime = parsedDate;
          }
        } catch (e) {
          // Keep default if parsing fails
        }
      }
      break;
    }
  }
  
  // Process time
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const timeStr = match[1].toLowerCase();
      const hourMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
      
      if (hourMatch) {
        let hours = parseInt(hourMatch[1]);
        const minutes = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
        const period = hourMatch[3] ? hourMatch[3].toLowerCase() : null;
        
        // Convert to 24-hour format if needed
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        dateTime.setHours(hours, minutes, 0, 0);
      }
      break;
    }
  }
  
  // Extract location
  let location = null;
  const locationPatterns = [
    /location[:\s]+"?([^",]+)"?/i,
    /at ([^,]+) (?:on|at)/i,
    /at the ([^,.]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      break;
    }
  }
  
  // Create end time (1 hour after start by default)
  const endDateTime = new Date(dateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);
  
  // Determine appropriate event type and category
  let eventType = "general";
  let category = "general";
  
  if (text.toLowerCase().includes('dentist') || text.toLowerCase().includes('dental')) {
    eventType = "dentist";
    category = "appointment";
  } else if (text.toLowerCase().includes('doctor') || text.toLowerCase().includes('appointment')) {
    eventType = "doctor";
    category = "appointment";
  } else if (text.toLowerCase().includes('meeting')) {
    eventType = "meeting";
    category = "meeting";
  }
  
  // Create appointment details if relevant
  let appointmentDetails = null;
  if (eventType === "doctor" || eventType === "dentist") {
    appointmentDetails = {
      doctorName: doctorName || "Unknown",
      reasonForVisit: "",
      duration: 60
    };
  }
  
  // Return the structured event
  return {
    title: title,
    eventType: eventType,
    category: category,
    childName: childName,
    doctorName: doctorName,
    location: location,
    dateTime: dateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    appointmentDetails: appointmentDetails,
    extraDetails: {
      parsedWithAI: true
    }
  };
}

  getTypeSpecificInstructions(type) {
    switch (type) {
      case 'event':
        return `Extract the following details about the event or appointment:
        {
        "title": "string (event title or purpose)",
        "eventType": "string (doctor, dentist, activity, birthday, meeting, date-night, travel, playdate, etc.)",
        "category": "string (appointment, activity, birthday, meeting, etc.)",
        "dateTime": "string (ISO date string, like 2023-04-16T15:30:00.000Z)",
        "duration": "number (duration in minutes, default 60)",
        "location": "string (where the event takes place)",
        "childId": "string (if event is for a specific child)",
        "childName": "string (if event is for a child)",
        "doctorName": "string (the doctor's name if this is a medical appointment)",
        "attendingParentId": "string (which parent will attend, 'both', or 'undecided')",
        
        "appointmentDetails": {
          "reasonForVisit": "string",
          "insuranceInfo": "string",
          "formsNeeded": "string",
          "fastingRequired": "boolean",
          "bringRecords": "boolean",
          "transportation": "string",
          "postCare": "string",
          "duration": "number (in minutes)",
          "followUpDate": "string (ISO date)",
          "costsAndCopays": "string",
          "doctorName": "string"
        },
        
        "activityDetails": {
          "equipmentNeeded": "string",
          "parentAttendance": "boolean",
          "weatherContingency": "string",
          "seasonDuration": "string",
          "fees": "string",
          "uniform": "string",
          "communicationMethod": "string",
          "coach": "string"
        }
      }
      
      BE EXTREMELY DETAILED when extracting event information.
      1. Medical appointments: Include doctor name, specialty, and reason for visit
      2. For dates, convert references like "next Thursday" to actual dates
      3. Try to determine the most specific event type possible
      4. For child-related events, make sure to extract the child's name
      5. Set any missing fields to null, don't omit them`;
        
      default:
        return `Extract all relevant information from the text and return it as a JSON object.`;
    }
  }

  /**
   * Parse an event from text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context (family members, etc.)
   * @param {Array} recentMessages - Recent messages for context
   * @returns {Promise<object>} Extracted event details
   */
  async parseEvent(text, context = {}, recentMessages = []) {
    console.log(`Parsing event from text: "${text.substring(0, 50)}..."`);
    
    // For medical-related terms, expand the context to improve accuracy
    const medicalTerms = ['doctor', 'dr.', 'dr ', 'dentist', 'appointment', 'checkup', 'check-up', 'pediatric'];
    const hasMedicalTerms = medicalTerms.some(term => text.toLowerCase().includes(term));
    
    if (hasMedicalTerms) {
      console.log("Detected medical appointment request, using enhanced parsing");
      // Add context for medical appointments
      const enhancedContext = {
        ...context,
        expectedEventType: 'doctor',
        keywords: ['appointment', 'doctor', 'medical', 'checkup']
      };
      
      return this.parseWithMinimalContext(text, 'event', enhancedContext);
    }
    
    return recentMessages && recentMessages.length > 0 ?
      this.parseWithRecentContext(text, recentMessages, 'event', context) :
      this.parseWithMinimalContext(text, 'event', context);
  }
}

export default new UnifiedParserService();