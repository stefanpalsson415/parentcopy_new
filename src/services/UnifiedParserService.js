// src/services/UnifiedParserService.js
import ClaudeService from './ClaudeService';

class UnifiedParserService {
  constructor() {
    this.claudeService = ClaudeService;
  }

  /**
   * Parse any type of input using Claude to extract structured information
   * @param {string} text - The text to parse
   * @param {string} type - The type of information to extract (event, document, provider, todo)
   * @param {object} context - Additional context like familyMembers, etc.
   * @returns {Promise<object>} The extracted structured information
   */
  async parseInput(text, type, context = {}) {
    try {
      console.log(`Parsing ${type} using Claude from text: "${text.substring(0, 100)}..."`);
      
      // Build type-specific system prompt
      const systemPrompt = this.buildSystemPrompt(type, context);
      
      // Send to Claude for parsing
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: text }],
        { system: systemPrompt },
        { temperature: 0.1 } // Lower temperature for more precise extraction
      );
      
      // Process the response based on type
      return this.processResponse(response, type);
    } catch (error) {
      console.error(`Error parsing ${type} with Claude:`, error);
      throw error;
    }
  }
  
  /**
   * Build a specialized system prompt based on the type of information to extract
   */
  buildSystemPrompt(type, context) {
    const basePrompt = `You are an AI assistant specialized in extracting structured information from text. 
    Extract ONLY the requested information in valid JSON format with no additional text.`;
    
    switch (type) {
      case 'event':
        return `${basePrompt}
        
        Extract event details with this JSON structure:
        {
          "title": "string (event title)",
          "eventType": "string (birthday, dental, doctor, meeting, etc.)",
          "dateTime": "string (ISO date string, like 2023-04-16T15:30:00.000Z)",
          "location": "string (where the event takes place)",
          "childName": "string (if event is for a child)",
          "isInvitation": boolean (true if a child is invited to someone else's event),
          "hostName": "string (if it's an invitation, who is hosting)",
          "extraDetails": {
            "birthdayChildName": "string (for birthday parties)",
            "birthdayChildAge": number (for birthday parties),
            "notes": "string (any special instructions or details)"
          }
        }
        
        IMPORTANT RULES:
        1. If the date/time is ambiguous, prefer dates in the future.
        2. For times like "3", assume 3:00 PM unless context clearly indicates morning.
        3. For birthdays, extract both the name and age of the birthday child.
        4. Set isInvitation to true if the text indicates a child is being invited to attend someone else's event.`;
        
      case 'provider':
        return `${basePrompt}
        
        Extract healthcare provider details with this JSON structure:
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
        3. For education providers, use type "education" and appropriate specialty.`;
        
      case 'todo':
        return `${basePrompt}
        
        Extract todo item details with this JSON structure:
        {
          "text": "string (the task description)",
          "assignedTo": "string (person the task is assigned to)",
          "dueDate": "string (ISO date string when task is due, or null)",
          "category": "string (household, relationship, parenting, errands, etc.)",
          "priority": "string (high, medium, low)",
          "notes": "string (any additional details)"
        }
        
        IMPORTANT RULES:
        1. Extract only the core task for the text field.
        2. If no specific person is mentioned for assignment, leave assignedTo null.
        3. Infer the category based on the task content.`;
        
      case 'document':
        return `${basePrompt}
        
        Extract document details with this JSON structure:
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
        3. For school documents, identify school name, teacher, grade level, and relevant dates.`;
        
      default:
        return basePrompt;
    }
  }
  
  /**
   * Process Claude's response into a structured format
   */
  processResponse(response, type) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Couldn't find JSON in Claude's response");
      }
      
      // Parse the JSON
      const result = JSON.parse(jsonMatch[0]);
      
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
          }
          break;
          
        case 'todo':
          // Ensure dueDate is a valid date or null
          if (result.dueDate) {
            try {
              const dateObj = new Date(result.dueDate);
              if (isNaN(dateObj.getTime())) {
                result.dueDate = null;
              }
            } catch (e) {
              result.dueDate = null;
            }
          }
          break;
      }
      
      return result;
    } catch (error) {
      console.error(`Error processing Claude's response for ${type}:`, error);
      // Return a basic object based on the type
      const fallbacks = {
        event: { title: "Untitled Event", eventType: "general", dateTime: new Date().toISOString() },
        provider: { name: "Unknown Provider", type: "medical" },
        todo: { text: "New Task" },
        document: { title: "Unknown Document", category: "general" }
      };
      
      return fallbacks[type] || {};
    }
  }

  /**
   * Parse an event from text
   */
  async parseEvent(text, context = {}) {
    return this.parseInput(text, 'event', context);
  }
  
  /**
   * Parse a provider from text
   */
  async parseProvider(text, context = {}) {
    return this.parseInput(text, 'provider', context);
  }
  
  /**
   * Parse a todo from text
   */
  async parseTodo(text, context = {}) {
    return this.parseInput(text, 'todo', context);
  }
  
  /**
   * Parse a document from text
   */
  async parseDocument(text, context = {}) {
    return this.parseInput(text, 'document', context);
  }
  
  /**
   * Parse an image to extract text and then parse that text
   * @param {File} imageFile - The image file
   * @param {string} type - The type of information to extract
   * @param {object} context - Additional context
   */
  async parseImage(imageFile, type, context = {}) {
    try {
      // First step: Extract text from image (using existing OCR service)
      const text = await this.extractTextFromImage(imageFile);
      
      if (!text || text.length < 10) {
        throw new Error("Couldn't extract sufficient text from image");
      }
      
      // Second step: Parse the extracted text
      return this.parseInput(text, type, context);
    } catch (error) {
      console.error(`Error parsing image for ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract text from an image using existing OCR service
   * This method would use your existing OCR implementation
   */
  async extractTextFromImage(imageFile) {
    // Import DocumentOCRService dynamically to avoid circular dependencies
    const DocumentOCRService = (await import('./DocumentOCRService')).default;
    
    try {
      const result = await DocumentOCRService.processImage(imageFile);
      return result.text || "";
    } catch (error) {
      console.error("Error extracting text from image:", error);
      throw error;
    }
  }
}

export default new UnifiedParserService();