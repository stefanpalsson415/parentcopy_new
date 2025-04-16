// src/services/EventParserService.js
import ConsolidatedNLU from './ConsolidatedNLU';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import * as chrono from 'chrono-node';

class EventParserService {
  constructor() {
    this.nlu = ConsolidatedNLU;
    this.ocrApiUrl = '/api/ocr';
  }

  /**
   * Parse text to extract event details
   * @param {string} text - Text to parse
   * @param {object} familyContext - Family data for context
   * @returns {Promise<object>} Extracted event details
   */
  async parseEventText(text, familyContext) {
    try {
      console.log("Parsing event text:", text.substring(0, 100) + "...");
      
      // First, try to detect the language/region
      const region = this.detectRegion(text);
      console.log("Detected region:", region);
      
      // Extract event type (birthday, appointment, etc.)
      const eventType = this.detectEventType(text);
      console.log("Detected event type:", eventType);
      
      // Extract date and time, considering regional format
      const dateTime = await this.extractDateTime(text, region);
      console.log("Extracted date/time:", dateTime);
      
      // Extract location
      const location = this.extractLocation(text);
      console.log("Extracted location:", location);
      
      // Extract child information
      const childInfo = this.extractChildInfo(text, familyContext);
      console.log("Extracted child info:", childInfo);
      
      // Extract host information
      const hostInfo = this.extractHostInfo(text);
      console.log("Extracted host info:", hostInfo);
      
      // Extract special information for birthdays
      let birthdayInfo = null;
      if (eventType === 'birthday') {
        birthdayInfo = this.extractBirthdayInfo(text);
        console.log("Extracted birthday info:", birthdayInfo);
      }
      
      // Extract any special notes
      const notes = this.extractNotes(text);
      console.log("Extracted notes:", notes);
      
      // Determine if the child is hosting or attending the event
      const eventRelationship = this.determineEventRelationship(text, childInfo.childName);
      console.log("Determined event relationship:", eventRelationship);
      
      // Set the correct title based on whether the child is hosting or attending
      let title;
      if (eventRelationship.relationship === "attending" && eventRelationship.hostName) {
        title = `${eventRelationship.hostName}'s ${eventType === 'birthday' ? 'Birthday Party' : 'Event'}`;
        if (birthdayInfo?.age || hostInfo.birthdayChildAge) {
          title += ` (${birthdayInfo?.age || hostInfo.birthdayChildAge})`;
        }
      } else {
        title = this.generateEventTitle(eventType, childInfo, birthdayInfo || hostInfo);
      }
      
      // Create a structured event object
      const eventDetails = {
        eventType: eventType,
        title: title,
        childId: childInfo.childId,
        childName: childInfo.childName,
        dateTime: dateTime,
        location: location,
        hostParent: hostInfo.name,
        extraDetails: {
          birthdayChildName: birthdayInfo?.name || hostInfo.birthdayChildName,
          birthdayChildAge: birthdayInfo?.age || hostInfo.birthdayChildAge,
          notes: notes,
          eventRelationship: eventRelationship.relationship,
          hostName: eventRelationship.hostName || null
        },
        attendingParentId: null,
        creationSource: 'AI-parse-text',
        region: region,
        originalText: text,
        isInvitation: eventRelationship.relationship === "attending"
      };
      
      return eventDetails;
    } catch (error) {
      console.error("Error parsing event text:", error);
      throw error;
    }
  }

  /**
   * Extract date and time using Claude API
   * @param {string} text - Text containing date/time information
   * @returns {Promise<Date>} - Parsed date object
   */
  async extractDateTimeUsingClaude(text) {
    try {
      console.log("Using Claude API to extract date/time from:", text);
      
      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 100,
          system: "You are an expert at extracting date and time information from text. Extract the specific date and time mentioned in the user's text. Return ONLY an ISO-8601 formatted date-time string (YYYY-MM-DDTHH:MM:SS.sssZ). If no specific time is mentioned, use a reasonable default based on the type of event (evening for social events, morning for appointments, etc.). Always favor future dates over past dates.",
          messages: [{
            role: "user", 
            content: `Extract the date and time from: "${text}"`
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Extract ISO date string from Claude's response
      // Claude should respond with just an ISO string, but we'll handle other responses too
      let isoDateString = result.content[0].text.trim();
      
      // Clean up the response if needed (remove quotes, etc.)
      isoDateString = isoDateString.replace(/["'`]/g, '').trim();
      
      // Validate the date string
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(isoDateString)) {
        console.warn("Claude didn't return a valid ISO date:", isoDateString);
        throw new Error("Invalid date format returned");
      }
      
      console.log("Claude parsed date/time:", isoDateString);
      return new Date(isoDateString);
    } catch (error) {
      console.error("Error using Claude for date extraction:", error);
      // Fallback to default
      return this.getDefaultDateTime(text);
    }
  }

  /**
   * Extract recurring event pattern from text
   * @param {string} text - Text to analyze
   * @returns {Object|null} Recurrence pattern or null if not found
   */
  extractRecurrencePattern(text) {
    // Initialize empty recurrence pattern
    const recurrence = {
      frequency: null,
      days: [],
      interval: 1,
      endDate: null,
      count: null
    };
    
    // Check for frequency patterns
    const dailyPattern = /\b(?:every day|daily|each day)\b/i;
    const weeklyPattern = /\b(?:every week|weekly|each week)\b/i;
    const biweeklyPattern = /\b(?:every two weeks|bi-weekly|biweekly|every other week)\b/i;
    const monthlyPattern = /\b(?:every month|monthly|each month)\b/i;
    const yearlyPattern = /\b(?:every year|yearly|annually|each year)\b/i;
    
    // Check for day of week patterns
    const mondayPattern = /\b(?:every|each)?\s*monday(?:s)?\b/i;
    const tuesdayPattern = /\b(?:every|each)?\s*tuesday(?:s)?\b/i;
    const wednesdayPattern = /\b(?:every|each)?\s*wednesday(?:s)?\b/i;
    const thursdayPattern = /\b(?:every|each)?\s*thursday(?:s)?\b/i;
    const fridayPattern = /\b(?:every|each)?\s*friday(?:s)?\b/i;
    const saturdayPattern = /\b(?:every|each)?\s*saturday(?:s)?\b/i;
    const sundayPattern = /\b(?:every|each)?\s*sunday(?:s)?\b/i;
    
    // Check for recurrence end patterns
    const untilDatePattern = /\b(?:until|through|till)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
    const forCountPattern = /\b(?:for|repeat)\s+(\d+)\s+(?:times|weeks|months|occurrences)\b/i;
    
    // Determine frequency
    if (dailyPattern.test(text)) {
      recurrence.frequency = 'DAILY';
    } else if (biweeklyPattern.test(text)) {
      recurrence.frequency = 'WEEKLY';
      recurrence.interval = 2;
    } else if (weeklyPattern.test(text)) {
      recurrence.frequency = 'WEEKLY';
    } else if (monthlyPattern.test(text)) {
      recurrence.frequency = 'MONTHLY';
    } else if (yearlyPattern.test(text)) {
      recurrence.frequency = 'YEARLY';
    }
    
    // Determine days of week
    if (mondayPattern.test(text)) recurrence.days.push('MO');
    if (tuesdayPattern.test(text)) recurrence.days.push('TU');
    if (wednesdayPattern.test(text)) recurrence.days.push('WE');
    if (thursdayPattern.test(text)) recurrence.days.push('TH');
    if (fridayPattern.test(text)) recurrence.days.push('FR');
    if (saturdayPattern.test(text)) recurrence.days.push('SA');
    if (sundayPattern.test(text)) recurrence.days.push('SU');
    
    // Extract "until date"
    const untilMatch = text.match(untilDatePattern);
    if (untilMatch && untilMatch[1]) {
      try {
        const untilDate = new Date(untilMatch[1]);
        if (!isNaN(untilDate.getTime())) {
          recurrence.endDate = untilDate;
        }
      } catch (e) {
        console.warn("Error parsing 'until' date:", e);
      }
    }
    
    // Extract count
    const countMatch = text.match(forCountPattern);
    if (countMatch && countMatch[1]) {
      recurrence.count = parseInt(countMatch[1]);
    }
    
    // If no frequency was detected but days are specified, assume weekly
    if (!recurrence.frequency && recurrence.days.length > 0) {
      recurrence.frequency = 'WEEKLY';
    }
    
    // If no recurrence information was found, return null
    if (!recurrence.frequency && recurrence.days.length === 0) {
      return null;
    }
    
    return recurrence;
  }

  /**
   * Detect if text is likely to be in US or Swedish regional format
   * @param {string} text - Text to analyze
   * @returns {string} 'US' or 'SE'
   */
  detectRegion(text) {
    const text_lower = text.toLowerCase();
    
    // Count Swedish indicators
    let swedishScore = 0;
    if (text_lower.match(/\bkl\.?\s+\d{1,2}[\.:]\d{2}\b/)) swedishScore += 3; // kl. 14:00
    if (text_lower.match(/\bkalas\b/)) swedishScore += 2;
    if (text_lower.match(/\bvälkommen\b/)) swedishScore += 2;
    if (text_lower.match(/\bfyller\b/)) swedishScore += 2;
    if (text_lower.match(/\blir\b/)) swedishScore += 1;
    if (text_lower.match(/\d{1,2}[\.:]\d{2}\b/)) swedishScore += 1; // 24h time
    
    // Count US indicators
    let usScore = 0;
    if (text_lower.match(/\b\d{1,2}:\d{2}\s*(am|pm)\b/i)) usScore += 3; // 2:00 pm
    if (text_lower.match(/\bbirthday\s+party\b/)) usScore += 2;
    if (text_lower.match(/\binvited\b/)) usScore += 1;
    if (text_lower.match(/\bplease\s+join\b/)) usScore += 1;
    if (text_lower.match(/\bcelebrating\b/)) usScore += 1;
    
    return swedishScore > usScore ? 'SE' : 'US';
  }

  /**
   * Process image to extract event details
   * @param {File} imageFile - Uploaded image file
   * @param {object} familyContext - Family data for context
   * @returns {Promise<object>} Extracted event details
   */
  async parseEventImage(imageFile, familyContext) {
    try {
      console.log("Starting enhanced event parsing from image");
      
      // 1. Upload the image to storage for OCR processing
      const imageUrl = await this.uploadImageForOCR(imageFile);
      console.log("Image uploaded successfully, URL:", imageUrl);
      
      // 2. Extract text using enhanced OCR
      let extractedText;
      try {
        extractedText = await this.performEnhancedOCR(imageUrl);
        console.log("OCR extracted text length:", extractedText.length);
      } catch (ocrError) {
        console.error("OCR failed, falling back to basic extraction:", ocrError);
        // Fallback to basic OCR if enhanced fails
        extractedText = await this.performOCR(imageUrl);
      }
      
      // Early exit if we couldn't extract text
      if (!extractedText || extractedText.trim().length < 10) {
        console.warn("Insufficient text extracted from image");
        return null;
      }
      
      // 3. Try to determine if this is an invitation (especially for events/birthdays)
      const isInvitation = this.isLikelyInvitation(extractedText);
      
      // 4. Parse the extracted text using the appropriate strategy
      let eventDetails;
      if (isInvitation) {
        console.log("Detected likely invitation, using invitation parsing strategy");
        eventDetails = await this.parseInvitationText(extractedText, familyContext);
      } else {
        console.log("Using standard event parsing for extracted text");
        eventDetails = await this.parseEventText(extractedText, familyContext);
      }
      
      // 5. Add confidence level based on the quality of extraction
      if (eventDetails) {
        eventDetails.extractionConfidence = this.calculateExtractionConfidence(eventDetails);
        eventDetails.originalText = extractedText;
        eventDetails.parsedFromImage = true;
      }
      
      return eventDetails;
    } catch (error) {
      console.error("Error parsing event from image:", error);
      throw error;
    }
  }

  /**
   * Upload image to Firebase Storage for OCR processing
   * @param {File} imageFile - The image file to upload
   * @returns {string} The URL of the uploaded image
   */
  async uploadImageForOCR(imageFile) {
    try {
      if (!imageFile) throw new Error("No image file provided");
      
      // Create a unique filename
      const fileExtension = imageFile.name.split('.').pop().toLowerCase();
      const filename = `ocr-temp/${uuidv4()}.${fileExtension}`;
      
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, filename);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, imageFile);
      console.log("Image uploaded successfully:", snapshot.metadata.fullPath);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image for OCR:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Enhanced OCR processing function that extracts text from images with better accuracy
   * @param {string} imageUrl - URL of the image to process
   * @returns {Promise<string>} Extracted text from the image
   */
  async performEnhancedOCR(imageUrl) {
    try {
      console.log("Starting enhanced OCR processing for image:", imageUrl);
      
      // First try calling our OCR API endpoint
      const response = await fetch(this.ocrApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl, enhancedMode: true })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`OCR API returned ${response.status}: ${errorText}`);
        throw new Error(`OCR API error: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.text) {
        console.warn("OCR API returned empty text");
        throw new Error("No text detected in image");
      }
      
      console.log("OCR successful, processing extracted text");
      
      // Post-process the extracted text to improve quality
      const processedText = this.postProcessOCRText(result.text);
      
      return processedText;
    } catch (error) {
      console.error("Enhanced OCR processing failed:", error);
      throw error;
    }
  }

  /**
   * Call OCR API to extract text from image
   * @param {string} imageUrl - URL of the image to process
   * @returns {Promise<string>} Extracted text from the image
   */
  async performOCR(imageUrl) {
    try {
      console.log("Calling OCR API for image:", imageUrl);
      
      // Call our OCR API endpoint
      const response = await fetch(this.ocrApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR API returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.text) {
        throw new Error("OCR API returned no text");
      }
      
      return result.text;
    } catch (error) {
      console.error("Error performing OCR:", error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Post-process OCR text to improve quality
   * @param {string} text - Raw OCR text
   * @returns {string} Processed text
   */
  postProcessOCRText(text) {
    // Replace common OCR errors
    let processed = text
      .replace(/(\d)l(\d)/g, '$1/$2') // Fix common "1" instead of "/" error in dates
      .replace(/(\d)I(\d)/g, '$1/$2')
      .replace(/\bI\b/g, '1')         // Fix standalone "I" as "1"
      .replace(/\bO\b/g, '0')         // Fix standalone "O" as "0"
      .replace(/(\d)O/g, '$10')       // Fix "O" as "0" after numbers
      .replace(/\bAM\b/g, 'AM')       // Correct time notation
      .replace(/\bPM\b/g, 'PM')
      .replace(/\bam\b/g, 'am')
      .replace(/\bpm\b/g, 'pm');
      
    // Try to normalize line breaks (invitations often have weird formatting)
    processed = processed
      .replace(/([.:!?])\s*\n/g, '$1 ')  // Remove line breaks after punctuation
      .replace(/(\d)\s*\n\s*(\d)/g, '$1$2')  // Join split numbers
      .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1$2')  // Join hyphenated words
      .replace(/\n{3,}/g, '\n\n');  // Normalize multiple line breaks
      
    console.log("Post-processed OCR text:", processed);
    return processed;
  }

  /**
   * Determine if text is likely an invitation
   * @param {string} text - The text to analyze
   * @returns {boolean} True if the text appears to be an invitation
   */
  isLikelyInvitation(text) {
    const invitationKeywords = [
      'invite', 'invitation', 'invited', 'join us', 'celebrate', 'celebration',
      'birthday', 'party', 'rsvp', 'please join', 'honor', 'pleasure', 'attending',
      'cordially', 'occasion'
    ];
    
    const textLower = text.toLowerCase();
    const matchCount = invitationKeywords.filter(keyword => textLower.includes(keyword)).length;
    
    // If we match multiple invitation keywords, it's likely an invitation
    return matchCount >= 2;
  }

  /**
   * Parse text specifically as an invitation with specialized extraction
   * @param {string} text - The invitation text
   * @param {Object} familyContext - Family context for better parsing
   * @returns {Promise<Object|null>} Extracted event details
   */
  async parseInvitationText(text, familyContext) {
    try {
      console.log("Parsing invitation text");
      
      // Use our regular parsing as a base
      const baseDetails = await this.parseEventText(text, familyContext);
      
      // Enhanced extraction specifically for invitations
      const invitationSpecificFields = {
        rsvpBy: this.extractRSVPDeadline(text),
        hostContact: this.extractHostContact(text),
        giftInfo: this.extractGiftInformation(text)
      };
      
      // Merge the information
      const enhancedDetails = {
        ...baseDetails,
        ...invitationSpecificFields,
        isInvitation: true
      };
      
      return enhancedDetails;
    } catch (error) {
      console.error("Error parsing invitation text:", error);
      // Fall back to standard parsing
      return this.parseEventText(text, familyContext);
    }
  }

  /**
   * Extract RSVP deadline from invitation text
   * @param {string} text - The invitation text
   * @returns {string|null} RSVP deadline or null if not found
   */
  extractRSVPDeadline(text) {
    const rsvpPatterns = [
      /rsvp\s+by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /please\s+respond\s+by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /respond\s+by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /rsvp\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i
    ];
    
    for (const pattern of rsvpPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Extract host contact information from invitation text
   * @param {string} text - The invitation text
   * @returns {Object|null} Host contact info or null if not found
   */
  extractHostContact(text) {
    // Phone pattern
    const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
    const phoneMatch = text.match(phonePattern);
    
    // Email pattern
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = text.match(emailPattern);
    
    if (phoneMatch || emailMatch) {
      return {
        phone: phoneMatch ? phoneMatch[1] : null,
        email: emailMatch ? emailMatch[1] : null
      };
    }
    
    return null;
  }

  /**
   * Extract gift information from invitation text
   * @param {string} text - The invitation text
   * @returns {string|null} Gift information or null if not found
   */
  extractGiftInformation(text) {
    const giftPatterns = [
      /gifts?:?\s+([^\.]+\.)/i,
      /presents?:?\s+([^\.]+\.)/i,
      /registry:?\s+([^\.]+\.)/i,
      /(?:no\s+gifts|no\s+presents)/i
    ];
    
    for (const pattern of giftPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  /**
   * Calculate confidence level in extraction based on available details
   * @param {Object} eventDetails - The extracted event details
   * @returns {number} Confidence score from 0-1
   */
  calculateExtractionConfidence(eventDetails) {
    let score = 0;
    let totalFactors = 0;
    
    // Add points for each successfully extracted piece of information
    if (eventDetails.eventType) { score += 0.2; totalFactors += 0.2; }
    if (eventDetails.title) { score += 0.2; totalFactors += 0.2; }
    if (eventDetails.dateTime || eventDetails.startDate) { score += 0.3; totalFactors += 0.3; }
    if (eventDetails.location) { score += 0.15; totalFactors += 0.15; }
    if (eventDetails.hostParent || eventDetails.extraDetails?.birthdayChildName) { score += 0.15; totalFactors += 0.15; }
    
    // Calculate final score (normalize if needed)
    return totalFactors > 0 ? score / totalFactors : 0;
  }

  /**
   * Extract date and time from text
   * @param {string} text - Text to analyze
   * @param {string} region - 'US' or 'SE' for regional date formats
   * @returns {Promise<Date>} - Extracted date
   */
  async extractDateTime(text, region = 'US') {
    try {
      console.log(`Extracting date/time with region: ${region} from text: "${text}"`);
      
      // First try using chrono-node
      const refDate = new Date();
      const options = { forwardDate: true };
      
      try {
        // Handle Swedish text if needed
        let processedText = text;
        if (region === 'SE') {
          const swedishContext = this.detectSwedishDateContext(text);
          if (swedishContext) {
            processedText = `${swedishContext} ${text}`;
          }
        }
        
        // Parse with chrono-node
        const parsedResults = chrono.parse(processedText, refDate, options);
        
        if (parsedResults && parsedResults.length > 0) {
          const parsedDate = parsedResults[0].start.date();
          console.log(`Chrono-node extracted date/time: ${parsedDate.toISOString()}`);
          
          // Check if the time component seems correct (not defaulting to noon)
          // Look for time indicators in the text
          const timePatterns = [
            /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
            /\b(\d{1,2})(am|pm)\b/i,
            /\b(?:at|@)?\s*(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i
          ];
          
          const hasTimeIndicator = timePatterns.some(pattern => pattern.test(text));
          const isParsedTimeDefault = parsedDate.getHours() === 12 && parsedDate.getMinutes() === 0;
          
          // If there's a time indicator but chrono defaulted to noon, don't trust it
          if (!hasTimeIndicator || !isParsedTimeDefault) {
            return parsedDate;
          }
        }
        
        // If chrono-node fails or returns suspicious results, fallback to Claude
        console.log("Chrono-node failed or returned suspicious results, using Claude API");
      } catch (chronoError) {
        console.warn("Chrono-node parsing error:", chronoError);
      }
      
      // Use Claude API as a fallback
      return await this.extractDateTimeUsingClaude(text);
    } catch (error) {
      console.error("Error in extractDateTime:", error);
      return this.getDefaultDateTime(text); // Use default on error
    }
  }

  /**
   * Detect Swedish date context for better parsing
   * @param {string} text - Text to analyze
   * @returns {string} Context string to help with parsing
   */
  detectSwedishDateContext(text) {
    // If Swedish month names are detected, add English equivalents to help chrono
    const swedishMonths = {
      'januari': 'January', 'februari': 'February', 'mars': 'March',
      'april': 'April', 'maj': 'May', 'juni': 'June',
      'juli': 'July', 'augusti': 'August', 'september': 'September',
      'oktober': 'October', 'november': 'November', 'december': 'December'
    };
    
    // If Swedish day names are detected, add English equivalents to help chrono
    const swedishDays = {
      'måndag': 'Monday', 'tisdag': 'Tuesday', 'onsdag': 'Wednesday',
      'torsdag': 'Thursday', 'fredag': 'Friday', 'lördag': 'Saturday', 
      'söndag': 'Sunday'
    };
    
    // Check for Swedish time indicators
    const hasSwedishTimeFormat = text.match(/\b(kl\.?|klockan)\s+\d{1,2}([:.])\d{2}\b/i);
    
    // Build context string if needed
    let context = '';
    
    // Check for month names
    for (const [swedish, english] of Object.entries(swedishMonths)) {
      if (text.toLowerCase().includes(swedish)) {
        context += `${english} `;
        break;
      }
    }
    
    // Check for day names
    for (const [swedish, english] of Object.entries(swedishDays)) {
      if (text.toLowerCase().includes(swedish)) {
        context += `${english} `;
        break;
      }
    }
    
    return context.trim();
  }

  /**
   * Get default date/time when parsing fails
   * @param {string} text - Text to analyze
   * @returns {Date} Default date based on event type
   */
  getDefaultDateTime(text) {
    const now = new Date();
    const eventType = this.detectEventType(text);
    
    // Look for evening indicators
    const eveningIndicators = /\b(?:evening|dinner|night)\b/i;
    const isEvening = eveningIndicators.test(text);
    
    if (isEvening) {
      now.setHours(19, 0, 0, 0); // 7:00 PM default for evening events
    } else {
      switch (eventType) {
        case 'birthday':
          now.setHours(14, 0, 0, 0); // 2:00 PM default for birthdays
          break;
        case 'doctor':
        case 'dental':
          now.setHours(10, 0, 0, 0); // 10:00 AM default for appointments
          break;
        case 'playdate':
          now.setHours(15, 0, 0, 0); // 3:00 PM default for playdates
          break;
        default:
          now.setHours(12, 0, 0, 0); // Noon default for other events
      }
    }
    
    return now;
  }

  /**
   * Extract location from text
   * @param {string} text - Text to analyze
   * @returns {string|null} Extracted location or null if not found
   */
  extractLocation(text) {
    // Pattern matching for locations
    const locationPatterns = [
      /\bat\s+([A-Za-z0-9\s'.,]+)(?:\s+(?:on|at|from))/i,
      /\blocation\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\bplace\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\bvenue\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\baddress\s*:?\s*([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      /\bsomewhere\s+([A-Za-z0-9\s'.,]+)(?:\b|$)/i // Added for "somewhere Italian"
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Check for cuisine/restaurant types
    const cuisinePattern = /\b(?:italian|chinese|mexican|japanese|thai|indian|french)\b/i;
    const cuisineMatch = text.match(cuisinePattern);
    if (cuisineMatch) {
      return cuisineMatch[0].trim() + " restaurant";
    }
    
    // Check for common venue types
    const venueKeywords = [
      'laserdome', 'playground', 'park', 'school', 'restaurant',
      'center', 'centre', 'arena', 'gym', 'pool', 'museum', 'theater'
    ];
    
    for (const keyword of venueKeywords) {
      const keywordPattern = new RegExp(`\\b(${keyword}\\s+[A-Za-z0-9\\s'.,]+)\\b`, 'i');
      const match = text.match(keywordPattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract child information from text
   * @param {string} text - Text to analyze
   * @param {object} familyContext - Family data for context
   * @returns {object} Child information
   */
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

  /**
   * Extract host information from text
   * @param {string} text - Text to analyze
   * @returns {object} Host information
   */
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
      /\b([A-Za-z\s]+)'s\s+(?:party|birthday|event)\b/i,
      /\bh[oö]st(?:ed)?\s+(?:by)?\s+([A-Za-z\s]+)(?:\b|$)/i // Include Swedish
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

  /**
   * Determine if the child is hosting or attending an event
   * @param {string} text - Text to analyze
   * @param {string} childName - Name of the child
   * @returns {object} Relationship information
   */
  determineEventRelationship(text, childName) {
    if (!childName) return { relationship: "unknown" };
    
    // Check if the text indicates the child is invited/attending someone else's event
    const invitedPatterns = [
      new RegExp(`\\b${childName}\\s+(?:is|has been)\\s+invited\\b`, 'i'),
      new RegExp(`\\binvite\\s+${childName}\\b`, 'i'),
      new RegExp(`\\b${childName}\\s+(?:to attend|to go to|is going to)\\b`, 'i')
    ];
    
    // Check if the pattern indicates it's the child's own event
    const hostingPatterns = [
      new RegExp(`\\b${childName}'s\\s+(?:birthday|party)\\b`, 'i'),
      new RegExp(`\\b${childName}\\s+is\\s+(?:having|hosting)\\b`, 'i'),
      new RegExp(`\\bfor\\s+${childName}['s]?\\b`, 'i')
    ];
    
    // First check if child is invited to someone else's event
    for (const pattern of invitedPatterns) {
      if (pattern.test(text)) {
        return { 
          relationship: "attending",
          childName: childName
        };
      }
    }
    
    // Then check if it's the child's own event
    for (const pattern of hostingPatterns) {
      if (pattern.test(text)) {
        return { 
          relationship: "hosting",
          childName: childName
        };
      }
    }
    
    // Look for another person who might be hosting
    const otherHostPattern = /\b([A-Za-z]+)['']s\s+(?:birthday|party)\b/i;
    const otherHostMatch = text.match(otherHostPattern);
    
    if (otherHostMatch && otherHostMatch[1] && 
        otherHostMatch[1].toLowerCase() !== childName.toLowerCase()) {
      return {
        relationship: "attending",
        childName: childName,
        hostName: otherHostMatch[1]
      };
    }
    
    // Default to hosting if we can't determine
    return { relationship: "unknown", childName: childName };
  }

  /**
   * Extract birthday-specific information from text
   * @param {string} text - Text to analyze
   * @returns {object|null} Birthday information or null if not found
   */
  extractBirthdayInfo(text) {
    // Extract birthday-specific information
    const birthdayInfo = {
      name: null,
      age: null
    };
    
    // Common patterns for birthday child and age
    const birthdayPatterns = [
      /\b([A-Za-z]+)\s+is\s+turning\s+(\d+)\b/i,
      /\b([A-Za-z]+)\s+turns\s+(\d+)\b/i,
      /\b([A-Za-z]+)\s+fyller\s+(\d+)\b/i, // Swedish
      /\b([A-Za-z]+)'s\s+(\d+)(?:st|nd|rd|th)?\s+birthday\b/i,
      /\b([A-Za-z]+)\s+blir\s+(\d+)\s+[åa]r\b/i // Swedish "becomes X years"
    ];
    
    for (const pattern of birthdayPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        birthdayInfo.name = match[1].trim();
        birthdayInfo.age = parseInt(match[2]);
        return birthdayInfo;
      }
    }
    
    // Try to find just a name with birthday context
    const nameWithBirthdayPatterns = [
      /\b([A-Za-z]+)'s\s+birthday\b/i,
      /\bbirthday\s+(?:party|celebration)\s+for\s+([A-Za-z]+)\b/i,
      /\bkalas\s+f[öo]r\s+([A-Za-z]+)\b/i // Swedish
    ];
    
    for (const pattern of nameWithBirthdayPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        birthdayInfo.name = match[1].trim();
        
        // Try to find age separately
        const agePatterns = [
          /\b(\d+)(?:st|nd|rd|th)?\s+birthday\b/i,
          /\bturning\s+(\d+)\b/i,
          /\bfyller\s+(\d+)\b/i, // Swedish
          /\b(\d+)\s+[åa]r\b/i // Swedish "X years"
        ];
        
        for (const agePattern of agePatterns) {
          const ageMatch = text.match(agePattern);
          if (ageMatch && ageMatch[1]) {
            birthdayInfo.age = parseInt(ageMatch[1]);
            break;
          }
        }
        
        return birthdayInfo;
      }
    }
    
    return null;
  }

  /**
   * Extract special notes or instructions from text
   * @param {string} text - Text to analyze
   * @returns {string} Extracted notes
   */
  extractNotes(text) {
    // Extract special notes or instructions
    const notePatterns = [
      /\bnote(?:s)?\s*:?\s*([^\.]+)(?:\.|$)/i,
      /\bplease\s+(?:remember\s+)?(?:to\s+)?([^\.]+)(?:\.|$)/i,
      /\bbring\s+([^\.]+)(?:\.|$)/i,
      /\bremember\s+to\s+([^\.]+)(?:\.|$)/i,
      /\bdon'?t\s+forget\s+(?:to\s+)?([^\.]+)(?:\.|$)/i
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

  /**
   * Detect event type from text
   * @param {string} text - Text to analyze
   * @returns {string} Detected event type
   */
  detectEventType(text) {
    // Handle null or empty input
    if (!text) return 'event';
    
    const text_lower = text.toLowerCase();
    
    // Define event type patterns with confidence weights
    const eventTypes = [
      {
        type: 'birthday',
        patterns: ['birthday', 'kalas', 'fyller', 'turning', 'years old', 'celebration', 'cake', 'party for', 'year-old', 'år', 'födelsedag'],
        confidence: 0
      },
      {
        type: 'dental',
        patterns: ['dentist', 'dental', 'teeth', 'tooth', 'orthodontist', 'braces', 'cleaning', 'checkup', 'cavity', 'tandläkare', 'tand'],
        confidence: 0
      },
      {
        type: 'doctor',
        patterns: ['doctor', 'physician', 'pediatrician', 'medical', 'checkup', 'vaccination', 'shot', 'health', 'clinic', 'hospital', 'läkare', 'vaccination', 'hälsa'],
        confidence: 0
      },
      {
        type: 'playdate',
        patterns: ['playdate', 'play date', 'lekträff', 'come over', 'play together', 'playgroup', 'play with us', 'come play', 'hang out'],
        confidence: 0
      },
      {
        type: 'sports',
        patterns: ['practice', 'game', 'training', 'match', 'soccer', 'football', 'baseball', 'basketball', 'hockey', 'gym', 'swimming', 'tournament', 'competition', 'team', 'coach'],
        confidence: 0
      },
      {
        type: 'music',
        patterns: ['music', 'lesson', 'recital', 'concert', 'piano', 'guitar', 'violin', 'band', 'orchestra', 'choir', 'singing', 'performance'],
        confidence: 0
      },
      {
        type: 'dance',
        patterns: ['dance', 'ballet', 'jazz', 'tap', 'hip hop', 'choreography', 'studio', 'dancing', 'dancer', 'recital', 'performance'],
        confidence: 0
      },
      {
        type: 'school',
        patterns: ['school', 'class', 'parent-teacher', 'conference', 'open house', 'field trip', 'pta', 'assembly', 'principal', 'teacher', 'classroom', 'skola', 'föräldramöte'],
        confidence: 0
      },
      {
        type: 'camp',
        patterns: ['camp', 'summer', 'holiday', 'break', 'day camp', 'overnight', 'wilderness', 'retreat', 'program', 'adventure', 'outdoor'],
        confidence: 0
      },
      {
        type: 'tutoring',
        patterns: ['tutor', 'tutoring', 'study', 'homework', 'help', 'academic', 'session', 'learning', 'education', 'teacher', 'mentor'],
        confidence: 0
      },
      {
        type: 'art',
        patterns: ['art', 'craft', 'drawing', 'painting', 'pottery', 'creative', 'studio', 'workshop', 'project', 'supplies', 'museum', 'gallery', 'exhibition'],
        confidence: 0
      },
      {
        type: 'coding',
        patterns: ['coding', 'programming', 'computer', 'tech', 'robotics', 'stem', 'science', 'minecraft', 'scratch', 'class', 'workshop', 'lab'],
        confidence: 0
      },
      {
        type: 'sleepover',
        patterns: ['sleepover', 'overnight', 'stay over', 'sleeping bag', 'pajamas', 'spend the night', 'sleep at', 'staying at', 'pajama party'],
        confidence: 0
      },
      {
        type: 'family',
        patterns: ['family', 'gathering', 'reunion', 'holiday', 'celebration', 'dinner', 'relative', 'aunt', 'uncle', 'grandparent', 'cousin', 'thanksgiving', 'christmas', 'easter'],
        confidence: 0
      },
      {
        type: 'religious',
        patterns: ['church', 'synagogue', 'mosque', 'temple', 'worship', 'sunday school', 'youth group', 'bible', 'faith', 'prayer', 'religious', 'spiritual'],
        confidence: 0
      },
      {
        type: 'community',
        patterns: ['community', 'volunteer', 'service', 'town', 'neighborhood', 'local', 'fair', 'festival', 'parade', 'charity', 'drive', 'donation'],
        confidence: 0
      }
    ];
  
    // Calculate confidence scores based on pattern matches
    eventTypes.forEach(eventType => {
      eventType.patterns.forEach(pattern => {
        if (text_lower.includes(pattern)) {
          eventType.confidence += 1;
          
          // Boost confidence for exact matches or strong indicators
          if (new RegExp(`\\b${pattern}\\b`, 'i').test(text_lower)) {
            eventType.confidence += 0.5;
          }
        }
      });
    });
  
    // Sort by confidence score
    eventTypes.sort((a, b) => b.confidence - a.confidence);
    
    // If we have a confident match (at least 1 match)
    if (eventTypes[0].confidence >= 1) {
      console.log(`Detected event type: ${eventTypes[0].type} with confidence ${eventTypes[0].confidence}`);
      return eventTypes[0].type;
    }
    
    // Map appointment types to more specific categories
    if (text_lower.includes('appointment') || text_lower.includes('visit') || text_lower.includes('checkup')) {
      if (text_lower.includes('dentist') || text_lower.includes('dental') || text_lower.includes('tooth') || text_lower.includes('teeth')) {
        return 'dental';
      }
      if (text_lower.includes('doctor') || text_lower.includes('medical') || text_lower.includes('health') || text_lower.includes('pediatrician')) {
        return 'doctor';
      }
    }
    
    // Default to generic event
    return 'event';
  }

  /**
   * Generate title for an event based on event type and context
   * @param {string} eventType - Type of event
   * @param {object} childInfo - Child information
   * @param {object} hostInfo - Host or birthday information
   * @returns {string} Generated event title
   */
  generateEventTitle(eventType, childInfo, hostInfo) {
    if (eventType === 'birthday' && hostInfo?.name) {
      let title = `${hostInfo.name}'s`;
      
      // Add age if available
      if (hostInfo.age) {
        title += ` ${hostInfo.age}${this.getOrdinalSuffix(hostInfo.age)}`;
      }
      
      title += ' Birthday';
      return title;
    }
    
    if (eventType === 'appointment') {
      return `${childInfo.childName || 'Child'}'s Appointment`;
    }
    
    if (eventType === 'playdate') {
      return `${childInfo.childName || 'Child'}'s Playdate`;
    }
    
    if (eventType === 'sports') {
      return `${childInfo.childName || 'Child'}'s Sports Event`;
    }
    
    return 'New Event';
  }

  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
   * @param {number} num - Number to get suffix for
   * @returns {string} Ordinal suffix
   */
  getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  }

  /**
   * Parse event details from a processed document
   * @param {object} document - Document data with extracted text
   * @returns {Promise<object|null>} Event details or null if not found
   */
  async parseEventFromDocument(document) {
    if (!document || !document.content) return null;
    
    try {
      // Create a simple family context
      const familyContext = {
        familyId: document.familyId,
        children: [] // We don't have child data here, will be filled by caller if needed
      };
      
      // Parse the document content
      return await this.parseEventText(document.content, familyContext);
    } catch (error) {
      console.error("Error parsing event from document:", error);
      return null;
    }
  }
}

export default new EventParserService();