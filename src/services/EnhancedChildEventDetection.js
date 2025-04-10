// src/services/EnhancedChildEventDetection.js
/**
 * Enhanced detection for child-related events like activities and medical appointments
 * This specialized module works with EnhancedNLU to improve detection accuracy
 */

class EnhancedChildEventDetection {
    constructor() {
      // Activity types with common terms/keywords
      this.activityTypes = {
        sports: ['soccer', 'football', 'basketball', 'baseball', 'swimming', 'tennis', 'hockey', 'gymnastics', 'karate', 'martial arts', 'dance', 'ballet', 'volleyball', 'track', 'running', 'skiing', 'skating', 'golf'],
        arts: ['art class', 'painting', 'drawing', 'pottery', 'ceramics', 'music', 'piano', 'guitar', 'violin', 'drum', 'singing', 'choir', 'theater', 'drama', 'dance class', 'ballet class'],
        education: ['tutoring', 'math class', 'science class', 'coding', 'programming', 'robotics', 'chess', 'debate', 'language class', 'Spanish class', 'Chinese class', 'French class', 'reading group'],
        social: ['playdate', 'play date', 'birthday party', 'sleepover', 'camp', 'scout', 'youth group', 'club meeting']
      };
      
      // Medical appointment types
      this.medicalTypes = {
        general: ['doctor', 'pediatrician', 'physician', 'check-up', 'checkup', 'well visit', 'annual visit', 'physical'],
        dental: ['dentist', 'orthodontist', 'braces', 'teeth cleaning', 'filling', 'cavity'],
        vision: ['eye doctor', 'optometrist', 'ophthalmologist', 'vision test', 'glasses', 'contacts'],
        specialist: ['specialist', 'dermatologist', 'allergist', 'neurologist', 'cardiologist', 'orthopedist', 'therapist', 'psychologist', 'psychiatrist', 'speech', 'occupational therapy', 'physical therapy']
      };
    }
  
    /**
     * Detect if message contains child activity references
     * @param {string} text - Message text
     * @param {Array} children - Array of children objects
     * @returns {Object|null} - Activity details if detected
     */
    detectActivity(text, children = []) {
      const lowerText = text.toLowerCase();
      
      // Check for activity keywords
      let detectedType = null;
      let activityName = null;
      
      // Check each activity type
      for (const [type, keywords] of Object.entries(this.activityTypes)) {
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            detectedType = type;
            
            // Try to extract the full activity name using regex
            const activityRegex = new RegExp(`(?:(?:have|has|for|to)\\s+)?(${keyword}(?:\\s+(?:class|practice|lesson|session|game|match|tournament|meeting))?)`);
            const match = text.match(activityRegex);
            
            if (match && match[1]) {
              activityName = match[1].trim();
              // Capitalize first letter of each word
              activityName = activityName.replace(/\b\w/g, l => l.toUpperCase());
            } else {
              activityName = keyword.replace(/\b\w/g, l => l.toUpperCase());
            }
            
            break;
          }
        }
        if (detectedType) break;
      }
      
      if (!detectedType) return null;
      
      // Now try to identify which child this is for
      let childId = null;
      let childName = null;
      
      // Check if any child name is mentioned in the text
      for (const child of children) {
        if (lowerText.includes(child.name.toLowerCase())) {
          childId = child.id;
          childName = child.name;
          break;
        }
      }
      
      // If no child was found but there's only one child, assume it's for them
      if (!childId && children.length === 1) {
        childId = children[0].id;
        childName = children[0].name;
      }
      
      // Extract date and time - simplified version
      const dateTimeInfo = this.extractDateAndTime(text);
      
      // Return structured activity data
      return {
        eventType: 'activity',
        activityType: detectedType,
        activityName: activityName,
        title: activityName,
        childId,
        childName,
        dateTime: dateTimeInfo.dateTime,
        duration: dateTimeInfo.duration || 60, // Default to 1 hour
        isRecurring: this.detectRecurring(text),
        location: this.extractLocation(text),
        trackingType: 'activity'
      };
    }
  
    /**
 * Detect if message contains medical appointment references
 * @param {string} text - Message text
 * @param {Array} children - Array of children objects
 * @returns {Object|null} - Medical appointment details if detected
 */
detectMedicalAppointment(text, children = []) {
  const lowerText = text.toLowerCase();
  
  // Check if the message contains medical appointment indicators
  const hasMedicalTerms = [
    'doctor', 'appointment', 'check-up', 'checkup', 'pediatrician', 
    'dentist', 'orthodontist', 'eye doctor', 'optometrist', 'ophthalmologist',
    'therapy', 'therapist', 'vaccination', 'shot', 'booster', 'physical',
    'medical', 'hospital', 'clinic', 'health center', 'healthcare'
  ].some(term => lowerText.includes(term));
  
  if (!hasMedicalTerms) return null;
  
  // Determine type of medical appointment
  let appointmentType = 'general';
  let appointmentName = null;
  
  for (const [type, keywords] of Object.entries(this.medicalTypes)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        appointmentType = type;
        appointmentName = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Appointment`;
        break;
      }
    }
    if (appointmentName) break;
  }
  
  if (!appointmentName) {
    appointmentName = "Doctor's Appointment";
  }
  
  // Now try to identify which child this is for
  let childId = null;
  let childName = null;
  
  // Check if any child name is mentioned in the text
  for (const child of children) {
    if (lowerText.includes(child.name.toLowerCase())) {
      childId = child.id;
      childName = child.name;
      break;
    }
  }
  
  // If no child was found but there's only one child, assume it's for them
  if (!childId && children.length === 1) {
    childId = children[0].id;
    childName = children[0].name;
  }
  
  // Extract date and time
  const dateTimeInfo = this.extractDateAndTime(text);
  
  // Extract doctor information
  let doctor = null;
  let providerEmail = null;
  let providerPhone = null;
  
  // Look for doctor name patterns
  const doctorPatterns = [
    /(?:doctor|dr\.?)\s+([a-z]+)/i,
    /(?:with|see)\s+(?:doctor|dr\.?)\s+([a-z]+)/i,
    /(?:doctor|dr\.?|provider)(?:'s)?\s+name\s+is\s+([a-z]+)/i
  ];
  
  for (const pattern of doctorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      doctor = match[1];
      break;
    }
  }
  
  // Look for email
  const emailMatch = text.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch && emailMatch[1]) {
    providerEmail = emailMatch[1];
  }
  
  // Look for phone number
  const phoneMatch = text.match(/(\+?[\d\s()-]{10,})/);
  if (phoneMatch && phoneMatch[1]) {
    providerPhone = phoneMatch[1].replace(/\s+/g, '');
  }
  
  // Return structured medical appointment data with enhanced provider info
  return {
    eventType: 'appointment',
    appointmentType: appointmentType,
    title: appointmentName,
    childId,
    childName,
    dateTime: dateTimeInfo.dateTime,
    duration: dateTimeInfo.duration || 30, // Default to 30 minutes
    location: this.extractLocation(text),
    notes: this.extractNotes(text),
    trackingType: 'medical',
    doctor: doctor, // Add doctor name
    providerEmail: providerEmail, // Add provider email
    providerPhone: providerPhone, // Add provider phone
    // Add a flag to indicate this might need provider creation
    hasProviderInfo: !!(doctor || providerEmail || providerPhone)
  };
}
  
    /**
     * Extract date and time information from text
     * @param {string} text - Text to analyze
     * @returns {Object} - Date and time information
     */
    extractDateAndTime(text) {
      const result = {
        dateTime: new Date(),
        duration: null
      };
      
      // Set default time to a reasonable hour (like 3PM for activities, 10AM for appointments)
      result.dateTime.setHours(15, 0, 0, 0);
      
      // Simple date extraction - this could be expanded with a more robust library
      // Look for tomorrow, next week, weekday names, or specific dates
      
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        result.dateTime = tomorrow;
      } else if (lowerText.includes('next week')) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        result.dateTime = nextWeek;
      } else {
        // Try to find day of week mentions
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        for (let i = 0; i < daysOfWeek.length; i++) {
          if (lowerText.includes(daysOfWeek[i])) {
            const today = new Date();
            const currentDay = today.getDay();
            let daysToAdd = i - currentDay;
            
            // If the day is already past this week, go to next week
            if (daysToAdd <= 0) {
              daysToAdd += 7;
            }
            
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysToAdd);
            result.dateTime = targetDate;
            break;
          }
        }
      }
      
      // Time extraction - look for "at X" or "X o'clock" or "X:YY"
      const timeRegex = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
      const timeMatch = text.match(timeRegex);
      
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        // Convert to 24-hour time
        if (meridian === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridian === 'am' && hours === 12) {
          hours = 0;
        } else if (!meridian && hours < 12) {
          // If no am/pm specified, assume afternoon for activities
          hours += 12;
        }
        
        result.dateTime.setHours(hours, minutes, 0, 0);
      }
      
      // Duration extraction - look for "X hour(s)" or "X minute(s)"
      const durationRegex = /(\d+)\s+(hour|hr|minute|min)s?/i;
      const durationMatch = text.match(durationRegex);
      
      if (durationMatch) {
        const amount = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        
        if (unit.startsWith('hour') || unit === 'hr') {
          result.duration = amount * 60;
        } else if (unit.startsWith('minute') || unit === 'min') {
          result.duration = amount;
        }
      }
      
      return result;
    }
  
    /**
     * Extract location information from text
     * @param {string} text - Text to analyze
     * @returns {string|null} - Location if found
     */
    extractLocation(text) {
      // Look for location patterns like "at X" or "in X"
      const locationRegex = /(?:at|in)\s+([A-Za-z0-9\s]+(?:Center|School|Park|Hospital|Clinic|Office|Building|Field|Court|Pool|Studio|Gym|Arena|Hall))/i;
      const match = text.match(locationRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return null;
    }
  
    /**
     * Extract any notes from the text
     * @param {string} text - Text to analyze
     * @returns {string|null} - Notes if found
     */
    extractNotes(text) {
      // Look for phrases that might indicate notes
      const notesIndicators = ['remember to', 'notes:', 'please note', 'don\'t forget', 'bring', 'wear'];
      
      for (const indicator of notesIndicators) {
        const index = text.toLowerCase().indexOf(indicator);
        if (index !== -1) {
          // Extract everything after the indicator to the end of the sentence
          const fragment = text.substring(index);
          const sentenceEnd = fragment.search(/[.!?]/) + 1;
          
          if (sentenceEnd > 0) {
            return fragment.substring(0, sentenceEnd).trim();
          } else {
            return fragment.trim();
          }
        }
      }
      
      return null;
    }
  
    /**
     * Detect if event is recurring
     * @param {string} text - Text to analyze
     * @returns {boolean} - True if event appears to be recurring
     */
    detectRecurring(text) {
      const lowerText = text.toLowerCase();
      const recurringIndicators = [
        'every week', 'weekly', 'every monday', 'every tuesday', 'every wednesday', 
        'every thursday', 'every friday', 'every saturday', 'every sunday',
        'recurring', 'each week', 'regular', 'standing appointment'
      ];
      
      return recurringIndicators.some(indicator => lowerText.includes(indicator));
    }
  }
  
  export default EnhancedChildEventDetection;