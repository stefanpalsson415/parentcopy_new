// src/services/EventParserService.js
import EnhancedNLU from './EnhancedNLU';
import { db, storage } from './firebase';
import { fetchSignedUrl } from './CloudFunctionService';

class EventParserService {
  constructor() {
    this.nlu = new EnhancedNLU();
  }

  /**
   * Parse text to extract event details
   * @param {string} text - Text to parse
   * @param {object} familyContext - Family data for context
   * @returns {object} Extracted event details
   */
  async parseEventText(text, familyContext) {
    try {
      // First, try to detect the language/region
      const region = this.detectRegion(text);
      
      // Extract event type (birthday, appointment, etc.)
      const eventType = this.detectEventType(text);
      
      // Extract date and time, considering regional format
      const dateTime = this.extractDateTime(text, region);
      
      // Extract location
      const location = this.extractLocation(text);
      
      // Extract child information
      const childInfo = this.extractChildInfo(text, familyContext);
      
      // Extract host information
      const hostInfo = this.extractHostInfo(text);
      
      // Extract any special notes
      const notes = this.extractNotes(text);
      
      // Create a structured event object
      const eventDetails = {
        eventType: eventType,
        title: this.generateEventTitle(eventType, childInfo, hostInfo),
        childId: childInfo.childId,
        childName: childInfo.childName,
        dateTime: dateTime,
        location: location,
        hostParent: hostInfo.name,
        extraDetails: {
          birthdayChildName: eventType === 'birthday' ? hostInfo.birthdayChildName : null,
          birthdayChildAge: eventType === 'birthday' ? hostInfo.birthdayChildAge : null,
          notes: notes
        },
        attendingParentId: null, // To be filled in by user
        creationSource: 'AI-parse-text',
        region: region, // Store the detected region for reference
        originalText: text // Store original text for reference
      };
      
      return eventDetails;
    } catch (error) {
      console.error("Error parsing event text:", error);
      throw error;
    }
  }
  
  /**
   * Process screenshot with OCR
   * @param {File} imageFile - Uploaded image file
   * @param {object} familyContext - Family data for context
   * @returns {object} Extracted event details
   */
  async parseEventImage(imageFile, familyContext) {
    try {
      // Upload the image to storage
      const imageUrl = await this.uploadImageForOCR(imageFile);
      
      // Call OCR API to extract text
      const extractedText = await this.performOCR(imageUrl);
      
      // Parse the extracted text
      return this.parseEventText(extractedText, familyContext);
    } catch (error) {
      console.error("Error parsing event image:", error);
      throw error;
    }
  }
  
  /* Helper methods */
  
  detectRegion(text) {
    // Check for Swedish indicators
    const swedishIndicators = [
      /\b(kl|kl\.|klockan)\s+\d{1,2}[:.]\d{2}\b/i, // Swedish time format (kl. 14:00)
      /\bkalas\b/i, // Birthday party in Swedish
      /\d{1,2}\/\d{1,2}\s+.+\d{1,2}[:.]\d{2}\b/i, // Date followed by 24h time
      /\b(välkommen|inbjuden|fyller)\b/i // Swedish words for welcome, invited, turns (age)
    ];
    
    // Check for US indicators
    const usIndicators = [
      /\b\d{1,2}:\d{2}\s*(am|pm)\b/i, // 12-hour clock
      /\bbirthday party\b/i, // Birthday party in English
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/i, // Month name + day
      /\binvited\b/i // English word for invited
    ];
    
    // Count matches for each region
    const swedishMatches = swedishIndicators.filter(pattern => pattern.test(text)).length;
    const usMatches = usIndicators.filter(pattern => pattern.test(text)).length;
    
    // Return the most likely region
    return swedishMatches > usMatches ? 'SE' : 'US';
  }
  
  detectEventType(text) {
    const text_lower = text.toLowerCase();
    
    // Check for birthday indicators
    if (text_lower.includes('birthday') || 
        text_lower.includes('kalas') || 
        text_lower.includes('fyller') ||
        text_lower.includes('turning') ||
        text_lower.includes('years old')) {
      return 'birthday';
    }
    
    // Check for appointment indicators
    if (text_lower.includes('appointment') || 
        text_lower.includes('doctor') || 
        text_lower.includes('dentist') ||
        text_lower.includes('läkare') ||
        text_lower.includes('tandläkare')) {
      return 'appointment';
    }
    
    // Check for playdate indicators
    if (text_lower.includes('playdate') || 
        text_lower.includes('play date') || 
        text_lower.includes('lekträff')) {
      return 'playdate';
    }
    
    // Default to other
    return 'other';
  }
  
  extractDateTime(text, region = 'US') {
    // Try to find date patterns based on region
    let datePatterns = region === 'SE' 
      ? [/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/] // DD/MM/YYYY in Sweden
      : [/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/]; // MM/DD/YYYY in US
    
    // More date pattern logic here...
    
    // Try to find time patterns
    const timePatterns = region === 'SE'
      ? [/(\d{1,2})[.:](\d{2})/] // 24-hour clock: 14:00 or 14.00
      : [/(\d{1,2}):(\d{2})\s*(am|pm)?/i]; // 12-hour clock: 2:00 pm
    
    // More time pattern logic here...
    
    // Combine parsed date and time
    // Return standardized DateTime object
    
    // This is simplified - we would need more complex logic here
    return new Date();
  }
  
  extractLocation(text) {
    // Pattern matching for locations
    const locationPatterns = [
      /\bat\s+([A-Za-z0-9\s'.,]+)(?:\s+(?:on|at|from))/i,
      /\blocation\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\bplace\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\bvenue\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\baddress\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  extractChildInfo(text, familyContext) {
    // Try to find which child is invited from family context
    const childInfo = {
      childId: null,
      childName: null
    };
    
    if (!familyContext || !familyContext.children) {
      return childInfo;
    }
    
    // For each child in the family, check if they're mentioned
    for (const child of familyContext.children) {
      const namePattern = new RegExp(`\\b${child.name}\\b`, 'i');
      if (namePattern.test(text)) {
        childInfo.childId = child.id;
        childInfo.childName = child.name;
        return childInfo;
      }
    }
    
    return childInfo;
  }
  
  extractHostInfo(text) {
    // Try to find host information
    const hostInfo = {
      name: null,
      birthdayChildName: null,
      birthdayChildAge: null
    };
    
    // Extract host name - this would be more complex in real implementation
    const hostPatterns = [
      /\bhosted by\s+([A-Za-z\s]+)(?:\b|$)/i,
      /\bfrom\s+([A-Za-z\s]+)(?:'s|\b)/i,
      /\b([A-Za-z\s]+)'s\s+(?:party|birthday|event)\b/i
    ];
    
    for (const pattern of hostPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        hostInfo.name = match[1].trim();
        break;
      }
    }
    
    // Extract birthday child and age
    const birthdayPatterns = [
      /\b([A-Za-z]+)\s+is\s+turning\s+(\d+)\b/i,
      /\b([A-Za-z]+)\s+turns\s+(\d+)\b/i,
      /\b([A-Za-z]+)\s+fyller\s+(\d+)\b/i, // Swedish
      /\b([A-Za-z]+)'s\s+(\d+)(?:st|nd|rd|th)?\s+birthday\b/i
    ];
    
    for (const pattern of birthdayPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        hostInfo.birthdayChildName = match[1].trim();
        hostInfo.birthdayChildAge = parseInt(match[2]);
        break;
      }
    }
    
    return hostInfo;
  }
  
  extractNotes(text) {
    // Extract special notes or instructions
    const notePatterns = [
      /\bnote\s*:?\s*([^\.]+)(?:\.|$)/i,
      /\bplease\s+([^\.]+)(?:\.|$)/i,
      /\bbring\s+([^\.]+)(?:\.|$)/i,
      /\bremember\s+to\s+([^\.]+)(?:\.|$)/i
    ];
    
    const notes = [];
    
    for (const pattern of notePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        notes.push(match[1].trim());
      }
    }
    
    return notes.join('. ');
  }
  
  generateEventTitle(eventType, childInfo, hostInfo) {
    if (eventType === 'birthday' && hostInfo.birthdayChildName && hostInfo.birthdayChildAge) {
      return `${hostInfo.birthdayChildName}'s ${hostInfo.birthdayChildAge}th Birthday`;
    }
    
    if (eventType === 'appointment') {
      return `${childInfo.childName}'s Appointment`;
    }
    
    if (eventType === 'playdate') {
      return `${childInfo.childName}'s Playdate`;
    }
    
    return 'New Event';
  }
  
  async uploadImageForOCR(imageFile) {
    // Logic to upload image to storage and get URL
    // This is simplified - would need actual implementation
    return "image_url";
  }
  
  async performOCR(imageUrl) {
    // Call OCR service to extract text from image
    // This would integrate with a service like Google Cloud Vision
    // For now, simplified as placeholder
    return "Extracted text would go here";
  }
}

export default new EventParserService();