// src/services/EventParserService.js
import EnhancedNLU from './EnhancedNLU';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

class EventParserService {
  constructor() {
    this.nlu = new EnhancedNLU();
    this.ocrApiUrl = '/api/ocr'; // Will proxy to our Cloud Function
  }

  /**
   * Parse text to extract event details
   * @param {string} text - Text to parse
   * @param {object} familyContext - Family data for context
   * @returns {object} Extracted event details
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
      const dateTime = this.extractDateTime(text, region);
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
      
      // Create a structured event object
const eventDetails = {
    eventType: eventType,
    title: this.generateEventTitle(eventType, childInfo, birthdayInfo || hostInfo),
    childId: childInfo.childId,
    childName: childInfo.childName,
    dateTime: dateTime,
    location: location,
    hostParent: hostInfo.name,
    extraDetails: {
      birthdayChildName: birthdayInfo?.name || hostInfo.birthdayChildName,
      birthdayChildAge: birthdayInfo?.age || hostInfo.birthdayChildAge,
      notes: notes
    },
    attendingParentId: null, // To be filled in by user
    creationSource: 'AI-parse-text',
    region: region, // Store the detected region for reference
    originalText: text // Store original text for learning feedback
  };
      
      return eventDetails;
    } catch (error) {
      console.error("Error parsing event text:", error);
      throw error;
    }
  }
  
// Add to src/services/EventParserService.js

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
detectTextRegion(text) {
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
   * Process screenshot with OCR
   * @param {File} imageFile - Uploaded image file
   * @param {object} familyContext - Family data for context
   * @returns {object} Extracted event details
   */
  async parseEventImage(imageFile, familyContext) {
    try {
      console.log("Beginning OCR processing for image:", imageFile.name);
      
      // Upload the image to storage
      const imageUrl = await this.uploadImageForOCR(imageFile);
      console.log("Image uploaded successfully, URL:", imageUrl);
      
      // Call OCR API to extract text
      const extractedText = await this.performOCR(imageUrl);
      console.log("OCR extracted text:", extractedText.substring(0, 100) + "...");
      
      // Parse the extracted text
      return this.parseEventText(extractedText, familyContext);
    } catch (error) {
      console.error("Error parsing event image:", error);
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
  
  // Add this improved method to EventParserService.js (around line 140)

// Add this improved method to EventParserService.js (around line 140)

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
 * Process an image to extract event details with improved reliability
 * @param {File} imageFile - The image file to process
 * @param {Object} familyContext - Family context for better parsing
 * @returns {Promise<Object|null>} Extracted event details or null if unsuccessful
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
 * Process an image to extract event details with improved reliability
 * @param {File} imageFile - The image file to process
 * @param {Object} familyContext - Family context for better parsing
 * @returns {Promise<Object|null>} Extracted event details or null if unsuccessful
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
   * Call OCR API to extract text from image
   * @param {string} imageUrl - URL of the image to process
   * @returns {string} Extracted text from the image
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
  
  // In src/services/EventParserService.js
// Replace the existing extractDateTime method with this improved version:

extractDateTime(text, region = 'US') {
  const now = new Date();
  let date = new Date(now);
  date.setHours(0, 0, 0, 0); // Reset time
  
  // Try to find date patterns based on region
  const datePatterns = {
    'SE': [
      // DD/MM format (Sweden)
      {
        pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
        handler: (match) => {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // 0-indexed
          const year = match[3] ? parseInt(match[3]) : date.getFullYear();
          
          // Check if year is 2-digit
          const fullYear = year < 100 ? 2000 + year : year;
          
          return new Date(fullYear, month, day);
        }
      },
      // DD.MM format
      {
        pattern: /(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/,
        handler: (match) => {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // 0-indexed
          const year = match[3] ? parseInt(match[3]) : date.getFullYear();
          
          return new Date(year < 100 ? 2000 + year : year, month, day);
        }
      }
    ],
    'US': [
      // MM/DD format (US)
      {
        pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
        handler: (match) => {
          const month = parseInt(match[1]) - 1; // 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : date.getFullYear();
          
          return new Date(year < 100 ? 2000 + year : year, month, day);
        }
      },
      // MM-DD format
      {
        pattern: /(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?/,
        handler: (match) => {
          const month = parseInt(match[1]) - 1; // 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : date.getFullYear();
          
          return new Date(year < 100 ? 2000 + year : year, month, day);
        }
      }
    ]
  };
  
  // Month names pattern (works for both regions)
  const monthNamePattern = {
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i,
    handler: (match) => {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const shortMonthNames = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
      ];
      
      const monthName = match[1].toLowerCase();
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : date.getFullYear();
      
      let monthIndex = monthNames.findIndex(m => m === monthName);
      if (monthIndex === -1) {
        // Try short month names
        monthIndex = shortMonthNames.findIndex(m => m === monthName);
        
        // Special case for "sept"
        if (monthIndex === -1 && (monthName === 'sept' || monthName === 'sep')) {
          monthIndex = 8; // September
        }
      }
      
      if (monthIndex !== -1) {
        return new Date(year < 100 ? 2000 + year : year, monthIndex, day);
      }
      
      return null;
    }
  };
  
  // Try regional patterns first
  for (const pattern of datePatterns[region]) {
    const match = text.match(pattern.pattern);
    if (match) {
      const parsedDate = pattern.handler(match);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        date = parsedDate;
        break;
      }
    }
  }
  
  // If no regional pattern matched, try the month name pattern
  if (date.getTime() === now.setHours(0, 0, 0, 0)) {
    const match = text.match(monthNamePattern.pattern);
    if (match) {
      const parsedDate = monthNamePattern.handler(match);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
  }
  
  // Try to find time patterns
  const timePatterns = {
    'SE': [
      // 24-hour clock: 14:00 or 14.00
      {
        pattern: /(kl\.?|klockan)?\s*(\d{1,2})[.:](\d{2})\b/i,
        handler: (match) => {
          const hours = parseInt(match[2]);
          const minutes = parseInt(match[3]);
          
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            date.setHours(hours, minutes, 0, 0);
            return true;
          }
          return false;
        }
      }
    ],
    'US': [
      // 12-hour clock: 2:00 pm
      {
        pattern: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
        handler: (match) => {
          let hours = parseInt(match[1]);
          const minutes = match[2] ? parseInt(match[2]) : 0;
          const period = match[3].toLowerCase();
          
          // Adjust for AM/PM
          if (period === 'pm' && hours < 12) {
            hours += 12;
          } else if (period === 'am' && hours === 12) {
            hours = 0;
          }
          
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            date.setHours(hours, minutes, 0, 0);
            return true;
          }
          return false;
        }
      }
    ]
  };
  
  // Try time patterns for the detected region
  let timeFound = false;
  for (const pattern of timePatterns[region]) {
    const match = text.match(pattern.pattern);
    if (match) {
      timeFound = pattern.handler(match);
      if (timeFound) break;
    }
  }
  
  // If no time pattern matched, try the other region's patterns
  if (!timeFound) {
    const otherRegion = region === 'SE' ? 'US' : 'SE';
    for (const pattern of timePatterns[otherRegion]) {
      const match = text.match(pattern.pattern);
      if (match) {
        timeFound = pattern.handler(match);
        if (timeFound) break;
      }
    }
  }
  
  // If still no time found, set default based on event type
  if (!timeFound) {
    const eventType = this.detectEventType(text);
    
    switch (eventType) {
      case 'birthday':
        date.setHours(14, 0, 0, 0); // 2:00 PM default for birthdays
        break;
      case 'doctor':
      case 'dental':
        date.setHours(10, 0, 0, 0); // 10:00 AM default for appointments
        break;
      case 'playdate':
        date.setHours(15, 0, 0, 0); // 3:00 PM default for playdates
        break;
      case 'sports':
        date.setHours(16, 0, 0, 0); // 4:00 PM default for sports
        break;
      case 'music':
      case 'dance':
      case 'art':
      case 'coding':
      case 'tutoring':
        date.setHours(16, 30, 0, 0); // 4:30 PM default for after-school activities
        break;
      case 'school':
        date.setHours(18, 0, 0, 0); // 6:00 PM default for school events
        break;
      case 'sleepover':
        date.setHours(17, 0, 0, 0); // 5:00 PM default for sleepovers
        break;
      case 'family':
      case 'religious':
        date.setHours(10, 0, 0, 0); // 10:00 AM default for family/religious events (often weekend mornings)
        break;
      case 'community':
        date.setHours(11, 0, 0, 0); // 11:00 AM default for community events
        break;
      case 'camp':
        date.setHours(9, 0, 0, 0); // 9:00 AM default for camps
        break;
      default:
        date.setHours(12, 0, 0, 0); // Noon default for other events
    }
  }
  
  // Make sure the date is in the future
  const currentDate = new Date();
  if (date < currentDate) {
    // If the date is today but the time has passed, keep it
    if (date.toDateString() === currentDate.toDateString()) {
      // Keep the date as is
    } else {
      // If it's a past date, push it to next year
      date.setFullYear(date.getFullYear() + 1);
    }
  }
  
  return date;
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
  
// Add to src/services/EventParserService.js

// Add this improved parsing for birthday events
extractEventDetails(text, familyMembers = []) {
  try {
    // Determine likely region (US or SE)
    const region = this.detectTextRegion(text);
    
    // Extract event type
    const eventType = this.detectEventType(text);
    
    // Special handling for birthday parties
    if (eventType === 'birthday' || text.toLowerCase().includes('birthday') || text.toLowerCase().includes('party')) {
      const birthdayPatterns = [
        /(?:invited to|join us for)\s+([A-Za-z]+(?:'s)?)\s+(?:birthday|party)/i,
        /([A-Za-z]+(?:'s)?)\s+(?:\d+(?:st|nd|rd|th)?\s+)?birthday\s+party/i,
        /party\s+for\s+([A-Za-z]+)/i,
        /([A-Za-z]+)\s+is\s+turning\s+(\d+)/i,
        /([A-Za-z]+)\s+turns\s+(\d+)/i
      ];

      let birthdayChild = null;
      let birthdayAge = null;

      // Try to extract birthday child name
      for (const pattern of birthdayPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          birthdayChild = match[1].replace(/'s$/, '').trim(); // Remove possessive if present
          if (match[2] && !isNaN(parseInt(match[2]))) {
            birthdayAge = parseInt(match[2]);
          }
          break;
        }
      }

      // Look for age if not found with name
      if (!birthdayAge) {
        const agePattern = /turning\s+(\d+)|(\d+)(?:st|nd|rd|th)?\s+birthday/i;
        const ageMatch = text.match(agePattern);
        if (ageMatch) {
          birthdayAge = parseInt(ageMatch[1] || ageMatch[2]);
        }
      }

      // Extract location
      const locationPatterns = [
        /at\s+([A-Za-z0-9\s'.]+?)(?:[,.]|\s+on|\s+at|\s+from)/i,
        /at\s+([A-Za-z0-9\s'.]+?)$/i,
        /location\s*:?\s*([A-Za-z0-9\s'.]+?)(?:[,.]|$)/i
      ];

      let location = null;
      for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          location = match[1].trim();
          break;
        }
      }

      // Extract date and time using existing functions
      const dateTime = this.extractDateTime(text, region);

      // Construct the event
      const eventDetails = {
        eventType: 'birthday',
        title: birthdayChild ? `${birthdayChild}'s Birthday Party` : 'Birthday Party',
        dateTime: dateTime,
        location: location,
        extraDetails: {
          birthdayChildName: birthdayChild,
          birthdayChildAge: birthdayAge,
          notes: text // Include original text for reference
        }
      };

      // Try to match a child if it's for one of the family's children
      if (birthdayChild && familyMembers.length > 0) {
        const matchedChild = familyMembers.find(child => 
          child.name.toLowerCase() === birthdayChild.toLowerCase()
        );
        
        if (matchedChild) {
          eventDetails.childId = matchedChild.id;
          eventDetails.childName = matchedChild.name;
        }
      }

      return eventDetails;
    }
    
    // Continue with original method for other event types
    // Extract date and time considering regional formats
    const dateTime = this.extractEventDateTime(text, region);
    
    // Extract location
    const location = this.extractEventLocation(text);
    
    // Extract child info
    const childInfo = this.extractChildReference(text, familyMembers);
    
    // Extract host info
    const hostInfo = this.extractHostInfo(text);
    
    // Extract birthday child info if relevant
    const birthdayInfo = eventType === 'birthday' ? this.extractBirthdayInfo(text) : null;
    
    // Extract notes or special instructions
    const notes = this.extractEventNotes(text);
    
    // Create comprehensive event object
    const eventDetails = {
      eventType: eventType,
      title: this.generateEventTitle(eventType, childInfo.name, birthdayInfo),
      childId: childInfo.id,
      childName: childInfo.name,
      dateTime: dateTime,
      location: location,
      hostParent: hostInfo.name,
      extraDetails: {
        birthdayChildName: birthdayInfo?.name,
        birthdayChildAge: birthdayInfo?.age,
        notes: notes
      },
      attendingParentId: null, // To be filled by user
      creationSource: 'AI-parse-text',
      region: region
    };
    
    return eventDetails;
  } catch (error) {
    console.error("Error extracting event details:", error);
    throw error;
  }
}


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
}

export default new EventParserService();