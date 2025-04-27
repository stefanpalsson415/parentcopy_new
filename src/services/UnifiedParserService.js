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
      
      // Build a more precise system prompt with better instructions
      const systemPrompt = `You are Allie, a family assistant AI specialized in extracting calendar events.
      Your only task is to extract the specific ${type} details from the user's message.
      
      IMPORTANT: Return ONLY a valid JSON object without any explanation or extra text.
      Be extremely precise in extracting:
      - Event title (extract the specific appointment/event name)
      - Date and time
      - Location
      - People involved (children, doctors, etc.)
      - Type of event (appointment, meeting, etc.)
      
      For a message like "book a dentist appointment for Emma on Tuesday at 3pm", you would extract:
      {
        "title": "Dentist Appointment",
        "eventType": "dentist",
        "category": "appointment",
        "childName": "Emma",
        "dateTime": "..." (next Tuesday at 3pm in ISO format),
        "location": null
      }
      
      ${this.getTypeSpecificInstructions(type)}
      
      Return ONLY the JSON object. No explanations, no markdown formatting, no extra text.`;
      
      // Send only the current message to Claude with clearer instructions
      const response = await this.claudeService.generateResponse(
        [{ 
          role: 'user', 
          content: `Extract the exact ${type} information from: "${text}". Return ONLY a valid JSON object.` 
        }],
        { system: systemPrompt },
        { temperature: 0.1 } // Low temperature for precision
      );
      
      // Process the response with improved extraction
      return this.processResponse(response, type);
    } catch (error) {
      console.error(`Error parsing ${type} with minimal context:`, error);
      throw error;
    }
  }
  
  /**
   * Parse input with recent relevant context
   * @param {string} currentText - The current message text
   * @param {Array} recentMessages - Array of recent messages (3-5 messages)
   * @param {string} type - The type of content to extract
   * @param {object} context - Additional context (family members, etc.)
   * @returns {Promise<object>} Extracted structured information
   */
  async parseWithRecentContext(currentText, recentMessages = [], type, context = {}) {
    try {
      console.log(`Parsing ${type} with recent context`);
      
      // Filter recent messages to only include those related to this topic
      const relevantMessages = this.filterRelevantMessages(recentMessages, type);
      
      // Build context from relevant messages
      let contextText = "";
      if (relevantMessages.length > 0) {
        contextText = "Recent conversation context:\n" + 
          relevantMessages.map(msg => 
            `${msg.userName || 'User'}: ${msg.text}`
          ).join("\n");
      }
      
      // Build a focused system prompt with limited context
      const systemPrompt = `You are Allie, a family assistant AI. 
      Extract the information about the ${type} from the conversation.
      Focus primarily on the most recent message, but use context from previous messages if needed.
      
      ${this.getTypeSpecificInstructions(type)}
      
      Return a JSON object with ONLY the extracted information. No explanations or additional text.`;
      
      // Prepare the user message with context
      const userMessage = contextText ? 
        `${contextText}\n\nCurrent message: "${currentText}"\n\nExtract the ${type} information from this conversation.` :
        `Extract the ${type} information from: "${currentText}"`;
      
      // Send to Claude with the limited context
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt },
        { temperature: 0.1 } // Low temperature for precision
      );
      
      // Process the response
      return this.processResponse(response, type);
    } catch (error) {
      console.error(`Error parsing ${type} with recent context:`, error);
      throw error;
    }
  }

  /**
   * Get type-specific instructions for the AI
   * @param {string} type - The type of information being extracted
   * @returns {string} Detailed instructions for this type
   */
  getTypeSpecificInstructions(type) {
    switch (type) {
      case 'event':
        return `Extract the following details about the event or appointment:
        {
        "title": "string (event title or purpose)",
        "eventType": "string (general, appointment, activity, birthday, meeting, date-night, travel, playdate, etc.)",
        "category": "string (the category this event belongs to: appointment, activity, birthday, meeting, etc.)",
        "dateTime": "string (ISO date string, like 2023-04-16T15:30:00.000Z)",
        "duration": "number (duration in minutes, default 60)",
        "location": "string (where the event takes place)",
        "childId": "string (if event is for a specific child)",
        "childName": "string (if event is for a child)",
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
        },
        
        "birthdayDetails": {
          "birthdayChildName": "string",
          "birthdayChildAge": "number",
          "guestList": "string",
          "theme": "string",
          "foodArrangements": "string",
          "activities": "string",
          "budget": "string",
          "favors": "string",
          "setupCleanup": "string",
          "weatherBackup": "string",
          "isInvitation": "boolean",
          "rsvpDeadline": "string (ISO date)"
        },
        
        "dateNightDetails": {
          "venue": "string",
          "budget": "string",
          "transportation": "string",
          "childcareArranged": "boolean",
          "needsBabysitter": "boolean",
          "specialOccasion": "boolean",
          "occasionNote": "string"
        },
        
        "meetingDetails": {
          "agenda": "string",
          "issuesForDiscussion": "string",
          "followUpPlan": "string"
        },
        
        "providers": [
          {
            "name": "string",
            "type": "string",
            "specialty": "string",
            "id": "string (if known)"
          }
        ],
        
        "isRecurring": "boolean",
        "recurrence": {
          "frequency": "string (daily, weekly, monthly)",
          "days": ["string (day names like Monday, Tuesday)"],
          "endDate": "string (ISO date)"
        }
      }
      
      IMPORTANT RULES:
      1. Determine the most specific event type and category based on the content
      2. For appointments, extract doctor name, reason for visit, and any special requirements
      3. For activities, note equipment needs, parent attendance requirements, and schedules
      4. For birthdays, capture birthday child details, theme, and guest information
      5. For date nights, include venue, childcare needs, and special occasion details
      6. Extract recurring patterns if mentioned (weekly soccer practice, monthly check-ups)
      7. Include provider details when mentioned (doctor, coach, teacher names)`;
        
      case 'provider':
        return `Extract the following details about the provider:
        {
          "name": "string (full name of provider)",
          "type": "string (medical, dental, therapy, education, etc.)",
          "specialty": "string (pediatrician, orthodontist, math tutor, etc.)",
          "phone": "string (phone number if present)",
          "email": "string (email if present)",
          "address": "string (address if present)",
          "forChild": "string (child's name if the provider is specifically for a child)"
        }
        
        IMPORTANT RULES:
        1. Extract the full name, preserving titles like Dr., Mrs., etc.
        2. Determine type based on context.
        3. For education providers, use type "education" and appropriate specialty.
        4. If no child is specifically mentioned, leave forChild as null.`;
        
      case 'todo':
        return `Extract the following details about the todo item:
        {
          "text": "string (the task description)",
          "assignedTo": "string (person the task is assigned to)",
          "dueDate": "string (ISO date string when task is due, or null)",
          "category": "string (household, relationship, parenting, errands, etc.)",
          "notes": "string (any additional details)"
        }
        
        IMPORTANT RULES:
        1. Extract only the core task for the text field.
        2. If no specific person is mentioned for assignment, leave assignedTo null.
        3. Infer the category based on the task content.
        4. Convert relative dates (like 'next Tuesday') to actual dates.`;
        
      case 'document':
        return `Extract the following details about the document:
        {
          "title": "string (document title)",
          "category": "string (medical, school, event, financial, etc.)",
          "childName": "string (if document is related to a child)",
          "date": "string (ISO date string related to the document, or null)",
          "entities": {
            "dates": ["string"],
            "people": ["string"],
            "organizations": ["string"],
            "addresses": ["string"]
          }
        }
        
        IMPORTANT RULES:
        1. Extract as many relevant entities as possible.
        2. For medical documents, identify type of procedure, provider, and dates.
        3. For school documents, identify school name, teacher, grade level, and relevant dates.
        4. If no child is specifically mentioned, leave childName as null.`;
        
      default:
        return `Extract all relevant information from the text and return it as a JSON object.`;
    }
  }

  /**
   * Filter messages to only include those relevant to the current topic
   * @param {Array} messages - Array of message objects
   * @param {string} type - The type of information being extracted
   * @returns {Array} Filtered array of relevant messages
   */
  filterRelevantMessages(messages, type) {
    if (!messages || messages.length === 0) return [];
    
    // Get only messages from the last 5 minutes that might be relevant
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentMessages = messages.filter(msg => {
      if (!msg.timestamp) return false;
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime > fiveMinutesAgo;
    });
    
    // If we have less than 3 messages, just use those
    if (recentMessages.length <= 3) return recentMessages;
    
    // Otherwise, filter by relevance to the type
    const keywords = {
      'event': ['appointment', 'schedule', 'calendar', 'event', 'date', 'time', 'meeting', 'party', 'doctor'],
      'provider': ['doctor', 'dentist', 'teacher', 'provider', 'specialist', 'healthcare', 'professional', 'tutor'],
      'todo': ['todo', 'task', 'reminder', 'to-do', 'to do', 'assignment', 'deadline', 'due'],
      'document': ['document', 'file', 'paper', 'form', 'record', 'report', 'certificate']
    };
    
    // Get the relevant keywords for this type
    const relevantKeywords = keywords[type] || [];
    
    // Filter messages that contain relevant keywords
    const relevantMessages = recentMessages.filter(msg => {
      if (!msg.text) return false;
      const text = msg.text.toLowerCase();
      return relevantKeywords.some(keyword => text.includes(keyword));
    });
    
    // Return the most recent 3 relevant messages
    return relevantMessages.slice(-3);
  }

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
        result = JSON.parse(response.trim());
        console.log(`Successfully parsed direct JSON for ${type}`);
      } catch (directParseError) {
        // Continue to other methods if direct parsing fails
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
      
      // If all parsing attempts failed, try to create a smart fallback for events
      if (!result && type === 'event') {
        console.warn(`Failed to extract JSON for ${type}. Creating intelligent event fallback.`);
        
        // Extract title/event name with specific patterns for events
        const titleMatch = response.match(/title[:\s]+"([^"]+)"/i) || 
                           response.match(/appointment for ([^"]+?) on/i) ||
                           response.match(/meeting with ([^"]+?) on/i) ||
                           response.match(/event[:\s]+"?([^",]+)"?/i);
                           
        // Extract date with multiple patterns
        const dateMatch = response.match(/on ([A-Za-z]+ \d+(?:st|nd|rd|th)?)/i) || 
                         response.match(/date[:\s]+"?([^",]+)"?/i) ||
                         response.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
                         
        // Extract time with multiple patterns                
        const timeMatch = response.match(/at (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i) ||
                         response.match(/time[:\s]+"?([^",]+)"?/i);
                         
        // Extract location                
        const locationMatch = response.match(/location[:\s]+"?([^",]+)"?/i) ||
                             response.match(/at ([^,]+) (?:on|at)/i);
                             
        // Extract child name                
        const childMatch = response.match(/for ([A-Za-z]+?) (?:on|at)/i) ||
                         response.match(/childName[:\s]+"?([^",]+)"?/i);
        
        // Create a structured event from regex matches with good defaults
        result = {
          title: titleMatch ? titleMatch[1].trim() : "Appointment",
          eventType: response.toLowerCase().includes('dentist') ? 'dentist' : 
                    response.toLowerCase().includes('doctor') ? 'doctor' : 'general',
          category: response.toLowerCase().includes('appointment') ? 'appointment' : 'general',
          childName: childMatch ? childMatch[1].trim() : null,
          location: locationMatch ? locationMatch[1].trim() : null
        };
        
        // Handle date/time computation for the fallback
        if (dateMatch || timeMatch) {
          try {
            // Create a date string we can parse
            let dateString = '';
            
            if (dateMatch) {
              // Handle relative dates first
              if (dateMatch[1].toLowerCase().includes('tomorrow')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateString = tomorrow.toISOString().split('T')[0];
              } 
              else if (dateMatch[1].toLowerCase().match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
                const dayMatch = dateMatch[1].toLowerCase().match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetDay = dayNames.indexOf(dayMatch[1]);
                
                const now = new Date();
                const currentDay = now.getDay();
                const daysUntilTarget = (7 + targetDay - currentDay) % 7;
                
                now.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
                dateString = now.toISOString().split('T')[0];
              }
              else {
                // Try to parse different date formats
                dateString = dateMatch[1].trim();
              }
            }
            
            // Create a time string
            let timeString = timeMatch ? timeMatch[1].trim() : '12:00 PM';
            
            // Combine date and time
            const parsedDate = new Date(`${dateString} ${timeString}`);
            
            if (!isNaN(parsedDate.getTime())) {
              result.dateTime = parsedDate.toISOString();
            } else {
              // Set a default future date/time (tomorrow at noon)
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(12, 0, 0, 0);
              result.dateTime = tomorrow.toISOString();
            }
          } catch (dateError) {
            console.warn("Error parsing date/time for fallback event:", dateError);
            // Set default future date (tomorrow at noon)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);
            result.dateTime = tomorrow.toISOString();
          }
        } else {
          // No date/time info - default to tomorrow at noon
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(12, 0, 0, 0);
          result.dateTime = tomorrow.toISOString();
        }
        
        console.log("Created fallback event:", result);
      }
      
      // If we still don't have a result, use fallbacks
      if (!result) {
        throw new Error("All parsing methods failed");
      }
      
      // Type-specific post-processing
      switch (type) {
        case 'event':
          // Ensure dateTime is a valid Date object
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
            } catch (e) {
              console.warn("Invalid date format from Claude, using default", e);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(15, 0, 0, 0);
              result.dateTime = tomorrow.toISOString();
            }
          } else {
            // Default to tomorrow at 3 PM if no date provided
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(15, 0, 0, 0);
            result.dateTime = tomorrow.toISOString();
          }
          
          // Ensure other required fields have defaults
          result.title = result.title || "Untitled Event";
          result.eventType = result.eventType || "general";
          result.isInvitation = !!result.isInvitation;
          result.extraDetails = result.extraDetails || {};
          break;
          
        // Keep the rest of the post-processing cases...
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

  /**
   * Parse an event from text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context (family members, etc.)
   * @param {Array} recentMessages - Recent messages for context
   * @returns {Promise<object>} Extracted event details
   */
  async parseEvent(text, context = {}, recentMessages = []) {
    return recentMessages && recentMessages.length > 0 ?
      this.parseWithRecentContext(text, recentMessages, 'event', context) :
      this.parseWithMinimalContext(text, 'event', context);
  }
  
  /**
   * Parse a provider from text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context (family members, etc.)
   * @param {Array} recentMessages - Recent messages for context
   * @returns {Promise<object>} Extracted provider details
   */
  async parseProvider(text, context = {}, recentMessages = []) {
    return recentMessages && recentMessages.length > 0 ?
      this.parseWithRecentContext(text, recentMessages, 'provider', context) :
      this.parseWithMinimalContext(text, 'provider', context);
  }
  
  /**
   * Parse a todo from text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context (family members, etc.)
   * @param {Array} recentMessages - Recent messages for context
   * @returns {Promise<object>} Extracted todo details
   */
  async parseTodo(text, context = {}, recentMessages = []) {
    return recentMessages && recentMessages.length > 0 ?
      this.parseWithRecentContext(text, recentMessages, 'todo', context) :
      this.parseWithMinimalContext(text, 'todo', context);
  }
  
  /**
   * Parse a document from text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context (family members, etc.)
   * @param {Array} recentMessages - Recent messages for context
   * @returns {Promise<object>} Extracted document details
   */
  async parseDocument(text, context = {}, recentMessages = []) {
    return recentMessages && recentMessages.length > 0 ?
      this.parseWithRecentContext(text, recentMessages, 'document', context) :
      this.parseWithMinimalContext(text, 'document', context);
  }
  
  /**
   * Parse an image to extract text and then parse that text
   * @param {File} imageFile - The image file
   * @param {string} type - The type of information to extract
   * @param {object} context - Additional context
   * @returns {Promise<object>} Extracted structured information
   */
  async parseImage(imageFile, type, context = {}) {
    try {
      // First step: Extract text from image (using existing OCR service)
      const text = await this.extractTextFromImage(imageFile);
      
      if (!text || text.length < 10) {
        throw new Error("Couldn't extract sufficient text from image");
      }
      
      // Second step: Parse the extracted text
      return this.parseWithMinimalContext(text, type, context);
    } catch (error) {
      console.error(`Error parsing image for ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract text from an image using existing OCR service
   * @param {File} imageFile - The image file
   * @returns {Promise<string>} Extracted text from the image
   */
  async extractTextFromImage(imageFile) {
    // Import DocumentOCRService dynamically to avoid circular dependencies
    try {
      const DocumentOCRService = (await import('./DocumentOCRService')).default;
      
      const result = await DocumentOCRService.processImage(imageFile);
      return result.text || "";
    } catch (error) {
      console.error("Error extracting text from image:", error);
      
      // Try alternative approach if DocumentOCRService fails
      try {
        // Create a FormData object
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Call a backup OCR API endpoint if available
        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`OCR API returned ${response.status}`);
        }
        
        const result = await response.json();
        return result.text || "";
      } catch (backupError) {
        console.error("Backup OCR also failed:", backupError);
        throw error;
      }
    }
  }
  
  /**
   * Bulk parse - extract multiple entity types from a single text
   * @param {string} text - The text to parse
   * @param {object} context - Additional context
   * @returns {Promise<object>} Object containing all extracted entities
   */
  async bulkParse(text, context = {}) {
    try {
      // Build a comprehensive system prompt
      const systemPrompt = `You are Allie, a family assistant AI.
      Analyze the text and extract ALL of the following types of information that may be present:
      
      1. Events/Appointments
      2. Providers/Professionals
      3. Todo Items/Tasks
      
      Return a JSON object with the following structure:
      {
        "events": [array of event objects],
        "providers": [array of provider objects],
        "todos": [array of todo objects]
      }
      
      For events, include: title, eventType, dateTime, location, childName, isInvitation
      For providers, include: name, type, specialty, forChild
      For todos, include: text, assignedTo, dueDate, category
      
      Only include entities that are clearly mentioned in the text.`;
      
      // Send to Claude
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: `Extract all entities from: "${text}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Try to parse the response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Couldn't find JSON in Claude's response");
        }
        
        const result = JSON.parse(jsonMatch[0]);
        
        // Process each entity type
        if (result.events) {
          result.events = result.events.map(event => this.processEntityType(event, 'event'));
        }
        if (result.providers) {
          result.providers = result.providers.map(provider => this.processEntityType(provider, 'provider'));
        }
        if (result.todos) {
          result.todos = result.todos.map(todo => this.processEntityType(todo, 'todo'));
        }
        
        return result;
      } catch (parseError) {
        console.error("Error parsing bulk response:", parseError);
        return { events: [], providers: [], todos: [] };
      }
    } catch (error) {
      console.error("Error in bulk parsing:", error);
      return { events: [], providers: [], todos: [] };
    }
  }
  
  /**
   * Process individual entity from bulk parsing
   * @param {object} entity - The entity to process
   * @param {string} type - The type of entity
   * @returns {object} Processed entity
   */
  processEntityType(entity, type) {
    // Apply type-specific processing similar to processResponse method
    switch (type) {
      case 'event':
        // Process event-specific fields
        if (entity.dateTime) {
          try {
            const dateObj = new Date(entity.dateTime);
            if (isNaN(dateObj.getTime())) {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(15, 0, 0, 0);
              entity.dateTime = tomorrow.toISOString();
            }
          } catch (e) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(15, 0, 0, 0);
            entity.dateTime = tomorrow.toISOString();
          }
        }
        entity.title = entity.title || "Untitled Event";
        entity.eventType = entity.eventType || "general";
        break;
        
      case 'provider':
        entity.name = entity.name || "Unknown Provider";
        entity.type = entity.type || "medical";
        break;
        
      case 'todo':
        entity.text = entity.text || "Untitled Task";
        entity.category = entity.category || "general";
        break;
    }
    
    return entity;
  }
}

export default new UnifiedParserService();