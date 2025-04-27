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
  processResponse(response, type) {
    try {
      // Enhanced JSON extraction logic with better fallbacks
      let result = null;
      console.log(`Processing ${type} response of length ${response.length}`);
      
      // First try: direct JSON parsing if response is already JSON
      try {
        response = response.trim();
        
        // Remove any text before and after potential JSON
        // This fixes cases where Claude adds explanation even when told not to
        const jsonStartIndex = response.indexOf('{');
        const jsonEndIndex = response.lastIndexOf('}') + 1;
        
        if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
          const potentialJson = response.substring(jsonStartIndex, jsonEndIndex);
          result = JSON.parse(potentialJson);
          console.log(`Successfully parsed direct JSON for ${type}`);
        }
      } catch (directParseError) {
        // Continue to other methods if direct parsing fails
        console.log(`Direct JSON parsing failed: ${directParseError.message}`);
      }
      
      // Second try: Look for JSON in markdown code blocks
      if (!result) {
        const markdownJsonRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
        const markdownMatch = response.match(markdownJsonRegex);
        if (markdownMatch && markdownMatch[1]) {
          try {
            result = JSON.parse(markdownMatch[1]);
            console.log(`Found JSON in markdown code block for ${type}`);
          } catch (markdownError) {
            console.warn(`Error parsing JSON from markdown for ${type}:`, markdownError);
            // Try to clean the JSON string before parsing again
            try {
              const cleanedJson = markdownMatch[1]
                .replace(/\\n/g, ' ')
                .replace(/\\"/g, '"')
                .replace(/\\/g, '\\')
                .replace(/\\t/g, ' ');
              result = JSON.parse(cleanedJson);
              console.log(`Parsed JSON with cleaning for ${type}`);
            } catch (cleaningError) {
              console.warn(`Cleaning failed for ${type}:`, cleaningError);
            }
          }
        }
      }
      
      // Third try: Standard regex extraction with better pattern
      if (!result) {
        const jsonPattern = /{[\s\S]*?(?:"[^"]*"[\s\S]*?:[\s\S]*?(?:,|})[\s\S]*?)*}/g;
        const jsonMatches = response.match(jsonPattern);
        
        if (jsonMatches && jsonMatches.length > 0) {
          for (const match of jsonMatches) {
            try {
              // Clean the JSON string to ensure it's valid
              const cleanJSON = match
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\n/g, ' ');
              
              result = JSON.parse(cleanJSON);
              console.log(`Extracted JSON using improved regex for ${type}`);
              break;
            } catch (regexError) {
              // Try next match if this one fails
              continue;
            }
          }
        }
      }
      
      // Enhanced fallback for events with better extraction from raw text
      if (!result && type === 'event') {
        console.warn(`Failed to extract JSON for ${type}. Creating intelligent event fallback.`);
        
        // Extract appointment/doctor specifics
        const isDoctorAppointment = response.toLowerCase().includes('doctor') || 
                                    response.toLowerCase().includes('dr.') ||
                                    response.toLowerCase().includes('appointment');
        
        const isDentistAppointment = response.toLowerCase().includes('dentist') || 
                                     response.toLowerCase().includes('dental');
        
        // Extract title/event name with improved patterns
        let titleMatch = null;
        const titlePatterns = [
          /title[:\s]+"([^"]+)"/i,
          /appointment (?:for|with) ([^"]+?) (?:on|at)/i,
          /meeting with ([^"]+?) (?:on|at)/i,
          /event[:\s]+"?([^",]+)"?/i, 
          /(\w+(?:'s)? appointment)/i,
          /(\w+(?:'s)? \w+ appointment)/i
        ];
        
        for (const pattern of titlePatterns) {
          const match = response.match(pattern);
          if (match && match[1]) {
            titleMatch = match;
            break;
          }
        }
        
        // Extract date with multiple patterns
        const datePatterns = [
          /on ([A-Za-z]+ \d+(?:st|nd|rd|th)?)/i,
          /date[:\s]+"?([^",]+)"?/i,
          /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
          /next ([a-z]+day)/i,
          /this ([a-z]+day)/i,
          /tomorrow/i,
          /today/i
        ];
        
        let dateMatch = null;
        for (const pattern of datePatterns) {
          const match = response.match(pattern);
          if (match) {
            dateMatch = match;
            break;
          }
        }
        
        // Extract time with multiple patterns
        const timePatterns = [
          /at (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
          /time[:\s]+"?([^",]+)"?/i,
          /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
        ];
        
        let timeMatch = null;
        for (const pattern of timePatterns) {
          const match = response.match(pattern);
          if (match) {
            timeMatch = match;
            break;
          }
        }
        
        // Extract location
        const locationPatterns = [
          /location[:\s]+"?([^",]+)"?/i,
          /at ([^,]+) (?:on|at)/i,
          /at the ([^,.]+)/i
        ];
        
        let locationMatch = null;
        for (const pattern of locationPatterns) {
          const match = response.match(pattern);
          if (match) {
            locationMatch = match;
            break;
          }
        }
        
        // Extract child name
        const childPatterns = [
          /for ([A-Za-z]+?)(?:'s)? (?:on|at|appointment)/i,
          /childName[:\s]+"?([^",]+)"?/i,
          /([A-Za-z]+?)(?:'s) appointment/i,
          /appointment for ([A-Za-z]+)/i
        ];
        
        let childMatch = null;
        for (const pattern of childPatterns) {
          const match = response.match(pattern);
          if (match) {
            childMatch = match;
            break;
          }
        }
        
        // Extract doctor name
        const doctorPatterns = [
          /(?:with|see) (?:Dr\.|Doctor) ([A-Za-z]+)/i,
          /doctorName[:\s]+"?([^",]+)"?/i,
          /Dr\. ([A-Za-z]+)/i,
          /Doctor ([A-Za-z]+)/i
        ];
        
        let doctorMatch = null;
        for (const pattern of doctorPatterns) {
          const match = response.match(pattern);
          if (match) {
            doctorMatch = match;
            break;
          }
        }
        
        // Create a structured event from regex matches with good defaults
        const eventType = isDoctorAppointment ? 'doctor' : 
                         isDentistAppointment ? 'dentist' : 'general';
        
        const childName = childMatch ? childMatch[1].trim() : null;
        
        // Construct appropriate title
        let title = titleMatch ? titleMatch[1].trim() : 
                   isDoctorAppointment ? "Doctor Appointment" :
                   isDentistAppointment ? "Dentist Appointment" : 
                   "Appointment";
                   
        // Add doctor name to title if available
        if (doctorMatch && !title.includes(doctorMatch[1])) {
          title += ` with Dr. ${doctorMatch[1]}`;
        }
        
        result = {
          title: title,
          eventType: eventType,
          category: eventType === 'general' ? 'general' : 'appointment',
          childName: childName,
          doctorName: doctorMatch ? `Dr. ${doctorMatch[1]}` : null,
          location: locationMatch ? locationMatch[1].trim() : null
        };
        
        // Handle date/time computation for the fallback with more robust date parsing
        if (dateMatch || timeMatch) {
          try {
            // Create a date object for the event
            let eventDate = new Date();
            
            // Handle date part
            if (dateMatch) {
              // Handle relative dates
              if (dateMatch[0].toLowerCase().includes('tomorrow')) {
                eventDate.setDate(eventDate.getDate() + 1);
              } 
              else if (dateMatch[0].toLowerCase().includes('today')) {
                // Keep today's date
              }
              else if (dateMatch[0].toLowerCase().includes('next')) {
                // Handle "next Monday", "next Tuesday", etc.
                const dayMatch = dateMatch[0].match(/next ([a-z]+day)/i);
                if (dayMatch && dayMatch[1]) {
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
                  
                  if (targetDay >= 0) {
                    const currentDay = eventDate.getDay();
                    const daysUntilTarget = (7 + targetDay - currentDay) % 7;
                    // If today is the target day, go to next week
                    eventDate.setDate(eventDate.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
                  }
                }
              }
              else if (dateMatch[0].toLowerCase().includes('this')) {
                // Handle "this Monday", "this Tuesday", etc.
                const dayMatch = dateMatch[0].match(/this ([a-z]+day)/i);
                if (dayMatch && dayMatch[1]) {
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
                  
                  if (targetDay >= 0) {
                    const currentDay = eventDate.getDay();
                    let daysUntilTarget = targetDay - currentDay;
                    // If target day is earlier in the week, go to next week
                    if (daysUntilTarget < 0) daysUntilTarget += 7;
                    eventDate.setDate(eventDate.getDate() + daysUntilTarget);
                  }
                }
              }
              else if (dateMatch[1].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                // Handle MM/DD/YYYY format
                const parts = dateMatch[1].split('/');
                const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
                const day = parseInt(parts[1]);
                const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                
                eventDate.setFullYear(year, month, day);
              }
              else {
                // Try to parse dates like "April 15th" or "June 3rd"
                const monthNames = [
                  'january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'
                ];
                
                // Extract month and day
                for (let i = 0; i < monthNames.length; i++) {
                  if (dateMatch[1].toLowerCase().includes(monthNames[i])) {
                    // Found month, now extract day
                    const dayMatch = dateMatch[1].match(/(\d+)(?:st|nd|rd|th)?/);
                    if (dayMatch && dayMatch[1]) {
                      const day = parseInt(dayMatch[1]);
                      
                      eventDate.setMonth(i);
                      eventDate.setDate(day);
                      break;
                    }
                  }
                }
              }
            }
            
            // Handle time part
            if (timeMatch) {
              const timeStr = timeMatch[1].toLowerCase();
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
                
                eventDate.setHours(hours, minutes, 0, 0);
              }
            } else {
              // Default to 9 AM if no time specified
              eventDate.setHours(9, 0, 0, 0);
            }
            
            // Format for ISO string
            result.dateTime = eventDate.toISOString();
            
            // Add end time (1 hour after start)
            const endDate = new Date(eventDate);
            endDate.setHours(endDate.getHours() + 1);
            result.endDateTime = endDate.toISOString();
            
          } catch (dateError) {
            console.warn("Error parsing date/time for fallback event:", dateError);
            // Set default future date (tomorrow at 9 AM)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            result.dateTime = tomorrow.toISOString();
            
            // Add end time (1 hour after start)
            const endDate = new Date(tomorrow);
            endDate.setHours(endDate.getHours() + 1);
            result.endDateTime = endDate.toISOString();
          }
        } else {
          // No date/time info - default to tomorrow at 9 AM
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          result.dateTime = tomorrow.toISOString();
          
          // Add end time (1 hour after start)
          const endDate = new Date(tomorrow);
          endDate.setHours(endDate.getHours() + 1);
          result.endDateTime = endDate.toISOString();
        }
        
        // Add extra appointment details for medical events
        if (eventType === 'doctor' || eventType === 'dentist') {
          result.appointmentDetails = {
            doctorName: doctorMatch ? `Dr. ${doctorMatch[1]}` : "Unknown",
            reasonForVisit: "",
            duration: 60 // Default to 1 hour
          };
        }
        
        console.log("Created fallback event:", result);
      }
      
      // If we still don't have a result, use fallbacks
      if (!result) {
        throw new Error("All parsing methods failed");
      }
      
      // Type-specific post-processing to ensure complete event data
      if (type === 'event') {
        // Ensure dateTime is valid
        if (result.dateTime) {
          try {
            const dateObj = new Date(result.dateTime);
            // Verify the date is valid
            if (isNaN(dateObj.getTime())) {
              // Fall back to a future date
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(15, 0, 0, 0); // Default to 3 PM tomorrow
              result.dateTime = tomorrow.toISOString();
            }
            
            // Add endDateTime if missing (1 hour after start)
            if (!result.endDateTime) {
              const endDate = new Date(dateObj);
              endDate.setHours(endDate.getHours() + 1);
              result.endDateTime = endDate.toISOString();
            }
          } catch (e) {
            console.warn("Invalid date format from Claude, using default", e);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(15, 0, 0, 0);
            result.dateTime = tomorrow.toISOString();
            
            // Add end time (1 hour after start)
            const endDate = new Date(tomorrow);
            endDate.setHours(endDate.getHours() + 1);
            result.endDateTime = endDate.toISOString();
          }
        } else {
          // Default to tomorrow at 3 PM if no date provided
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(15, 0, 0, 0);
          result.dateTime = tomorrow.toISOString();
          
          // Add end time (1 hour after start)
          const endDate = new Date(tomorrow);
          endDate.setHours(endDate.getHours() + 1);
          result.endDateTime = endDate.toISOString();
        }
        
        // Ensure other required fields have defaults
        result.title = result.title || "Untitled Event";
        result.eventType = result.eventType || "general";
        result.category = result.category || (
          result.eventType === 'doctor' || result.eventType === 'dentist' ? 
          'appointment' : result.eventType
        );
        result.isInvitation = !!result.isInvitation;
        result.extraDetails = result.extraDetails || {};
        
        // For doctor/dentist appointments, ensure we have appointmentDetails
        if ((result.eventType === 'doctor' || result.eventType === 'dentist') && !result.appointmentDetails) {
          result.appointmentDetails = {
            doctorName: result.doctorName || "Unknown",
            reasonForVisit: "",
            duration: 60 // Default to 1 hour
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing Claude's response for ${type}:`, error);
      // Return a basic object based on the type
      const fallbacks = {
        event: { 
          title: "Untitled Event", 
          eventType: "general", 
          dateTime: new Date().toISOString(), 
          endDateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
          extraDetails: {} 
        },
        provider: { name: "Unknown Provider", type: "medical" },
        todo: { text: "New Task", category: "general" },
        document: { 
          title: "Unknown Document", 
          category: "general",
          entities: { dates: [], people: [], organizations: [], addresses: [] }
        }
      };
      
      return fallbacks[type] || {};
    }
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