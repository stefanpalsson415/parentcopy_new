// src/services/ClaudeResponseParser.js
/**
 * Dedicated utility for parsing Claude AI responses consistently
 * Addresses issues with parsing calendar events vs tasks
 */
class ClaudeResponseParser {
  /**
   * Parse a Claude response to extract structured content
   * @param {string} responseText - Raw text response from Claude
   * @param {string} type - Expected type of content (calendar, task, provider, etc)
   * @returns {Object} Parsed data or null if parsing failed
   */
  static parseResponse(responseText, type = 'general') {
    if (!responseText) return null;
    
    // Log the parsing request for debugging
    console.log(`🔍 Parsing Claude response as ${type}:`, 
      responseText.length > 100 ? responseText.substring(0, 100) + '...' : responseText);
    
    try {
      // Try to extract JSON content if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[0]);
          console.log("✅ Successfully parsed JSON from Claude response");
          return parsedJson;
        } catch (jsonError) {
          console.warn("⚠️ Found JSON-like content but couldn't parse it:", jsonError);
        }
      }
      
      // Type-specific parsing strategies
      switch (type.toLowerCase()) {
        case 'calendar':
          return this.parseCalendarEvent(responseText);
          
        case 'task':
          return this.parseTaskInfo(responseText);
          
        case 'provider':
          return this.parseProviderInfo(responseText);
          
        default:
          // Generic parsing based on content patterns
          if (responseText.toLowerCase().includes('task') && 
              (responseText.toLowerCase().includes('due') || 
               responseText.toLowerCase().includes('assigned'))) {
            return this.parseTaskInfo(responseText);
          }
          
          if (responseText.toLowerCase().includes('event') && 
              (responseText.toLowerCase().includes('date') || 
               responseText.toLowerCase().includes('calendar'))) {
            return this.parseCalendarEvent(responseText);
          }
          
          // Return simple object with the full text if no specific pattern found
          return { 
            fullText: responseText,
            parsed: false
          };
      }
    } catch (error) {
      console.error("❌ Error parsing Claude response:", error);
      return null;
    }
  }
  
  /**
   * Parse a response as a calendar event
   * @param {string} text - Text containing calendar event info
   * @returns {Object} Calendar event data
   */
  static parseCalendarEvent(text) {
    // Define common date/time patterns
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i;
    const timePattern = /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i;
    
    // Extract event title
    const titleMatches = text.match(/(?:event|appointment|meeting)[\s:]+"([^"]+)"|(?:event|appointment|meeting)[\s:]+([^,\.\n]+)/i);
    const title = titleMatches ? (titleMatches[1] || titleMatches[2]).trim() : "New Event";
    
    // Extract date
    const dateMatches = text.match(datePattern);
    const dateStr = dateMatches ? dateMatches[0] : new Date().toLocaleDateString();
    
    // Extract time
    const timeMatches = text.match(timePattern);
    const timeStr = timeMatches ? timeMatches[0] : "12:00 PM";
    
    // Attempt to create a valid date 
    let eventDate;
    try {
      eventDate = new Date(`${dateStr} ${timeStr}`);
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date();
      }
    } catch (e) {
      eventDate = new Date();
    }
    
    return {
      title,
      dateTime: eventDate.toISOString(),
      date: eventDate.toLocaleDateString(),
      time: eventDate.toLocaleTimeString(),
      isCalendarEvent: true,
      description: text,
      parsed: true
    };
  }
  
  /**
   * Parse a response as a task
   * @param {string} text - Text containing task info
   * @returns {Object} Task data
   */
  static parseTaskInfo(text) {
    // Extract task title
    const titleMatches = text.match(/task[\s:]+"([^"]+)"|task[\s:]+([^,\.\n]+)/i);
    const title = titleMatches ? (titleMatches[1] || titleMatches[2]).trim() : text.split('\n')[0].trim();
    
    // Look for assignee
    const assigneeMatches = text.match(/(?:assigned to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    const assignedToName = assigneeMatches ? assigneeMatches[1].trim() : null;
    
    // Look for due date
    const dueDateMatches = text.match(/due\s+(?:on|by)?\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i);
    const dueDate = dueDateMatches ? new Date(dueDateMatches[1]).toISOString() : null;
    
    return {
      title,
      description: text,
      assignedToName,
      dueDate,
      isTask: true,
      parsed: true
    };
  }
  
  /**
   * Parse a response as provider information
   * @param {string} text - Text containing provider info
   * @returns {Object} Provider data
   */
  static parseProviderInfo(text) {
    // Extract provider name
    const nameMatches = text.match(/name[\s:]+"([^"]+)"|name[\s:]+([^,\.\n]+)/i);
    const name = nameMatches ? (nameMatches[1] || nameMatches[2]).trim() : null;
    
    // Extract provider type
    const typeMatches = text.match(/type[\s:]+"([^"]+)"|type[\s:]+([^,\.\n]+)/i) || 
                        text.match(/(doctor|coach|teacher|trainer|therapist|specialist)/i);
    const type = typeMatches ? (typeMatches[1] || typeMatches[2] || typeMatches[0]).trim().toLowerCase() : 'provider';
    
    // Extract contact info
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    const email = emailMatches ? emailMatches[0] : null;
    
    const phoneMatches = text.match(/\b(?:\+?1[-\s]?)?(?:\(?\d{3}\)?[-\s]?)?\d{3}[-\s]?\d{4}\b/);
    const phone = phoneMatches ? phoneMatches[0] : null;
    
    // Extract child relation
    const childMatches = text.match(/(?:for|to)\s+([A-Z][a-z]+)'s/i) || 
                        text.match(/(?:for|to)\s+([A-Z][a-z]+)(?:\s|,|\.)/i);
    const childName = childMatches ? childMatches[1] : null;
    
    return {
      name,
      type,
      email,
      phone,
      childName,
      forChild: childName,
      isProvider: true,
      parsed: true
    };
  }
  
  /**
   * Detect whether a response contains calendar event information
   * @param {string} text - Response text
   * @returns {boolean} True if text appears to describe a calendar event
   */
  static containsCalendarEvent(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Check for event indicators
    const hasEventKeywords = lowerText.includes('event') || 
                            lowerText.includes('appointment') || 
                            lowerText.includes('schedule') || 
                            lowerText.includes('calendar');
                            
    // Check for date indicators
    const hasDatePatterns = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})\b/i.test(lowerText) || 
                          /\b(tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lowerText);
                          
    // Check for time indicators
    const hasTimePatterns = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\b/i.test(lowerText);
    
    // Only return true if we have both event keywords and time/date indicators
    return hasEventKeywords && (hasDatePatterns || hasTimePatterns);
  }
  
  /**
   * Detect whether a response contains task information
   * @param {string} text - Response text
   * @returns {boolean} True if text appears to describe a task
   */
  static containsTaskInfo(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Check for task indicators that are very unlikely to be calendar events
    return (lowerText.includes('task') || lowerText.includes('todo') || lowerText.includes('to-do')) && 
           (lowerText.includes('assigned') || 
            lowerText.includes('complete') || 
            lowerText.includes('done') || 
            lowerText.includes('pending'));
  }
}

export default ClaudeResponseParser;