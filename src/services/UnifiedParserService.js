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
  
  // Process date with enhanced relative date handling
for (const pattern of datePatterns) {
  const match = text.match(pattern);
  if (match) {
    if (match[0].toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0);
      dateTime = tomorrow;
      console.log("Set date to tomorrow:", dateTime.toISOString());
    } else if (match[0].toLowerCase().includes('next')) {
      // Handle "next Monday", "next Tuesday", etc.
      const dayName = match[1].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = days.findIndex(d => dayName.includes(d));
      
      if (dayIndex >= 0) {
        // Get today's day
        const today = new Date().getDay();
        // Calculate days to add to get to the next occurrence of that day
        let daysToAdd = (dayIndex - today + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // If today, go to next week
        
        // Create a new date for the target day
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        // Keep the time from dateTime
        targetDate.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0);
        dateTime = targetDate;
        console.log(`Set date to next ${days[dayIndex]}:`, dateTime.toISOString());
      }
    } else if (match[0].toLowerCase().includes('today')) {
      // Handle "today" references
      const today = new Date();
      today.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0);
      dateTime = today;
      console.log("Set date to today:", dateTime.toISOString());
    } else {
      // Try to parse specific date like "January 5th"
      try {
        const dateStr = match[1];
        // Handle formats like "January 5th" and "Jan 5"
        let parsedDate;
        
        // Try parsing with different formats
        if (dateStr.match(/\d{1,2}(?:st|nd|rd|th)?/)) {
          // Handle "5th of January" type formats
          const monthMatch = dateStr.match(/([A-Za-z]+)/i);
          const dayMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?/);
          
          if (monthMatch && dayMatch) {
            const monthName = monthMatch[1];
            const day = parseInt(dayMatch[1]);
            
            // Get month index
            const months = ['january','february','march','april','may','june',
                           'july','august','september','october','november','december'];
            const monthIndex = months.findIndex(m => monthName.toLowerCase().includes(m.toLowerCase()));
            
            if (monthIndex >= 0 && day > 0 && day <= 31) {
              parsedDate = new Date();
              parsedDate.setMonth(monthIndex);
              parsedDate.setDate(day);
              // Keep the time from dateTime
              parsedDate.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0);
            }
          }
        } else {
          // Try standard date parsing
          parsedDate = new Date(dateStr);
        }
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          dateTime = parsedDate;
          console.log("Parsed specific date:", dateTime.toISOString());
        }
      } catch (e) {
        console.warn("Error parsing specific date:", e);
        // Keep default if parsing fails
      }
    }
    break;
  }
}
  
  // Process time with enhanced time format support
for (const pattern of timePatterns) {
  const match = text.match(pattern);
  if (match && match[1]) {
    const timeStr = match[1].toLowerCase();
    // Enhanced pattern to capture different time formats
    const hourMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    
    if (hourMatch) {
      let hours = parseInt(hourMatch[1]);
      const minutes = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
      
      // Get period (am/pm) - either explicitly mentioned or inferred
      let period = hourMatch[3] ? hourMatch[3].toLowerCase() : null;
      
      // If no period specified but hour is 1-11, assume PM for times like "3:00" (3 PM)
      // This is a reasonable assumption for most appointments
      if (!period && hours >= 1 && hours <= 11) {
        period = 'pm';
      }
      
      // Convert to 24-hour format if needed
      if (period === 'pm' && hours < 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      // Set the time
      dateTime.setHours(hours, minutes, 0, 0);
      console.log(`Set time to ${hours}:${minutes} (${period || '24hr'})`, dateTime.toLocaleTimeString());
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
      
      case 'todo':
      case 'task':
        return `Extract the following details about the task/todo item:
        {
          "text": "string (the main task description)",
          "notes": "string (any additional details about the task)",
          "assignedTo": "string (the person who should do the task - extract name only like 'mom', 'dad', 'papa')",
          "dueDate": "string (ISO date string when task needs to be completed, like 2023-05-07T00:00:00.000Z)",
          "category": "string (household, parenting, work, errands, relationship, personal)"
        }
        
        VERY IMPORTANT INSTRUCTIONS FOR DUE DATES:
        1. Be EXTREMELY precise about extracting due dates
        2. Look carefully for phrases like "by May 7th", "due next Tuesday", "has to do it by", etc.
        3. If a specific date is mentioned with phrases like "by", "before", "due", "needs to be done by", that MUST be used as the dueDate
        4. Convert relative dates (tomorrow, next Friday, etc.) to actual ISO dates
        5. Do NOT default to today's date unless explicitly stated as "today"
        6. If no due date is specified, set dueDate to null
        
        For task categorization:
        - "household" for cleaning, repairs, maintenance
        - "parenting" for child-related responsibilities
        - "work" for professional tasks
        - "errands" for shopping, appointments
        - "relationship" for couple/family activities
        - "personal" for self-care, health
        
        Set any missing fields to null, don't omit them.`;
        
      default:
        return `Extract all relevant information from the text and return it as a JSON object.`;
    }
  }

/**
 * Parse task/todo information from text
 * @param {string} text - The text to parse
 * @param {object} context - Additional context (family members, etc.)
 * @param {Array} recentMessages - Recent messages for context
 * @returns {Promise<object>} Extracted task details
 */
async parseTodo(text, context = {}, recentMessages = []) {
  console.log(`Parsing todo/task from text: "${text.substring(0, 50)}..."`);
  
  // Extract task-specific keywords to improve classification
  const taskTerms = ['task', 'todo', 'to-do', 'to do', 'assignment', 'chore', 'reminder'];
  const hasTaskTerms = taskTerms.some(term => text.toLowerCase().includes(term));
  
  // Look for due date indicators
  const dueDateTerms = ['by', 'due', 'before', 'until', 'prior to', 'no later than', 'has to do it by'];
  const hasDueDateTerms = dueDateTerms.some(term => text.toLowerCase().includes(term));
  
  let enhancedContext = {...context};
  
  if (hasTaskTerms) {
    console.log("Detected explicit task request, using enhanced parsing");
    enhancedContext.expectedTaskType = 'task';
    enhancedContext.keywords = ['task', 'todo', 'assign'];
  }
  
  if (hasDueDateTerms) {
    console.log("Detected due date in task request, ensuring due date extraction");
    enhancedContext.hasDueDate = true;
    enhancedContext.expectDueDate = true;
  }
  
  return recentMessages && recentMessages.length > 0 ?
    this.parseWithRecentContext(text, recentMessages, 'task', enhancedContext) :
    this.parseWithMinimalContext(text, 'task', enhancedContext);
}

/**
 * Parse provider information from text
 * @param {string} text - The text to parse
 * @param {object} context - Additional context (family members, etc.)
 * @returns {Promise<object>} Extracted provider details
 */
async parseProvider(text, context = {}) {
  try {
    console.log(`Parsing provider information from text: "${text.substring(0, 50)}..."`);
    
    // Prepare system prompt for Claude
    const systemPrompt = `You are Allie's provider extraction AI. 
Extract provider information from the user's message.

Extract the following fields in JSON format:
- name: Provider's name (required)
- type: Provider type (medical, education, activity, childcare, services, etc.)
- specialty: Provider's specific role or specialty
- email: Provider's email if mentioned
- phone: Provider's phone number if mentioned
- address: Provider's address or location if mentioned
- notes: Any additional relevant information

Return ONLY valid JSON without any markdown code blocks or extra text:
{
  "name": "string (provider name)",
  "type": "string (provider type)",
  "specialty": "string (provider specialty)",
  "email": "string or null",
  "phone": "string or null",
  "address": "string or null",
  "notes": "string or null"
}`;

    // Create user message
    const userMessage = `Extract provider details from this text: "${text}"`;
    
    // Call Claude API with minimal temperature for more predictable extraction
    const response = await this.claudeService.generateResponse(
      [{ role: 'user', content: userMessage }],
      { system: systemPrompt },
      { temperature: 0.1 }
    );
    
    // Process response - handle both direct JSON and text with JSON
    const extractedData = this.processResponse(response, 'provider');
    
    // If we successfully extracted provider details, return them
    if (extractedData && extractedData.name) {
      console.log("Successfully extracted provider details:", extractedData);
      return extractedData;
    }
    
    // If extraction failed, return minimal structure
    console.log("Failed to extract complete provider details, returning minimal structure");
    return {
      name: "Unknown Provider",
      type: "medical",
      specialty: "",
      email: null,
      phone: null,
      address: null,
      notes: text // Include original text as notes
    };
  } catch (error) {
    console.error("Error parsing provider information:", error);
    // Return minimal structure in case of error
    return {
      name: "Unknown Provider",
      type: "medical",
      specialty: "",
      email: null,
      phone: null,
      address: null,
      notes: text
    };
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