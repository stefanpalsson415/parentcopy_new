// src/services/ClaudeService.js
import CalendarService from './CalendarService';
import { auth } from './firebase';

class ClaudeService {
  constructor() {
    // Determine environment type
    const hostname = window.location.hostname;
    const isProduction = hostname === 'checkallie.com' || hostname === 'www.checkallie.com';
    const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1');
    
    // Set the appropriate API URL based on environment
    if (isProduction) {
      this.proxyUrl = 'https://checkallie.com/api/claude';
    } else if (isLocalhost) {
      // For local development, use the port-specific proxy
      const port = window.location.port || '3001';
this.proxyUrl = `http://localhost:${port === '3000' ? '3001' : port}/api/claude`;
    } else {
      // Fallback for any other environment
      this.proxyUrl = '/api/claude';
    }
      
    this.model = 'claude-3-7-sonnet-20250219'; // Latest model
this.mockMode = false; // Explicitly disable mock mode
    
    console.log(`Claude service initialized to use ${isProduction ? 'production' : isLocalhost ? 'local' : 'unknown'} proxy server at ${this.proxyUrl}`);
  }
  
  // Add a test method to verify connectivity
  async testConnection() {
    try {
      const response = await fetch(`${this.proxyUrl}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log("Claude API connection successful");
        return true;
      } else {
        console.warn(`Claude API connection failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Claude API connectivity test failed:", error);
      return false;
    }
  }
  
// In ClaudeService.js
async testProxyConnection() {
  try {
    console.log("Testing proxy connection at:", this.proxyUrl);
    
    const response = await fetch(`${this.proxyUrl}/test`, {
      method: 'GET'
    });
    
    console.log("Proxy test response status:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log("Proxy test response data:", data);
      return true;
    } else {
      console.error("Proxy test failed:", await response.text());
      return false;
    }
  } catch (error) {
    console.error("Error testing proxy connection:", error);
    return false;
  }
}

async generateResponse(messages, context, options = {}) {
  try {
    // Format system prompt with family context
    const systemPrompt = this.formatSystemPrompt(context || {});
    
    // Log for debugging
    console.log("Claude API request via proxy:", { 
      messagesCount: messages.length, 
      systemPromptLength: systemPrompt.length,
      model: this.model,
      mockMode: this.mockMode,
      temperature: options.temperature ||.7,
      maxTokens: options.maxTokens || 4000
    });
    
    // Check if messages is an array of our internal message format
    let formattedMessages;
    if (messages.length > 0 && messages[0].sender) {
      // Convert to Claude's expected format
      formattedMessages = messages.map(msg => ({
        role: msg.sender === 'allie' ? 'assistant' : 'user',
        content: msg.text || ""
      }));
    } else {
      // Assume messages are already in Claude's format
      formattedMessages = messages;
    }
    
    // Reduce context size if needed (Claude has token limits)
    // Keep the most recent messages, ensuring we have context but don't exceed limits
    if (formattedMessages.length > 20) {
      const contextLimit = 20;
      // Always keep the last message
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      
      // Pick a selection of older messages for context
      // Get every other message from the rest to reduce context size
      const oldMessages = formattedMessages.slice(0, formattedMessages.length - 1)
        .filter((_, index) => index % 2 === 0)
        .slice(-contextLimit + 1);
      
      formattedMessages = [...oldMessages, lastMessage];
      
      console.log(`Reduced message context from ${messages.length} to ${formattedMessages.length} messages`);
    }
    
    // Check if this is a calendar-related request in the last message
    const lastUserMessage = formattedMessages[formattedMessages.length - 1].content || "";
    
    // Check if the last message appears to be a standalone calendar request
    const calendarIndicators = [
      'add to calendar', 'schedule', 'appointment', 'meeting', 'event',
      'create a', 'make a', 'add a', 'book a', 'plan a',
      'dentist', 'doctor', 'birthday', 'party', 'invitation'
    ];
    
    const isLikelyCalendarRequest = calendarIndicators.some(indicator => 
      lastUserMessage.toLowerCase().includes(indicator)
    );
    
    if (isLikelyCalendarRequest) {
      console.log("Detected likely calendar request in latest message");
      const calendarEventData = this.extractCalendarRequest(lastUserMessage);
      
      if (calendarEventData) {
        // Process only the calendar request from the most recent message
        console.log("Successfully extracted calendar data, processing only this request");
        return this.processCalendarRequest(calendarEventData, context);
      }
    }
    
    // If we have too many messages, consider using a focused subset
    // for non-calendar queries to avoid responding to everything at once
    if (formattedMessages.length > 5) {
      // Check if the last message is a specific, standalone question
      const standaloneIndicators = [
        'what', 'why', 'how', 'when', 'who', 
        'can you', 'could you', 'will you', 'would you',
        '?'
      ];
      
      const isLikelyStandaloneQuestion = standaloneIndicators.some(indicator => 
        lastUserMessage.toLowerCase().includes(indicator)
      );
      
      if (isLikelyStandaloneQuestion) {
        console.log("Detected standalone question, focusing response on latest message");
        // Create a focused subset of messages: some context + latest message
        const focusedMessages = [
          ...formattedMessages.slice(-3, -1), // Some context
          formattedMessages[formattedMessages.length - 1] // Latest message
        ];
        
        // Update for logging
        console.log(`Using focused context of ${focusedMessages.length} messages`);
        formattedMessages = focusedMessages;
      }
    }
    
    // Prepare request payload for Claude API
    const payload = {
      model: this.model,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      messages: formattedMessages,
      system: systemPrompt
    };
    
    // Add a timeout to the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout to 45 seconds
    
    // Make the API call through our proxy server with better error handling
    console.log("Attempting to connect to proxy at:", this.proxyUrl);
    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn("Claude proxy returned error status:", response.status);
        // Try to get more details about the error
        let errorDetails = "";
        try {
          const errorText = await response.text();
          errorDetails = errorText.substring(0, 200); // Get first 200 chars of error
          console.warn("Error details from proxy:", errorDetails);
        } catch (e) {}
        
        // Return a personalized response
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      // Try to parse the JSON with better error handling
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Error parsing JSON from Claude API:", jsonError);
        // Try to get the raw text to see what's wrong
        const rawText = await response.text();
        console.warn("Raw response text (first 200 chars):", rawText.substring(0, 200));
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      // Check for valid response
      if (!result || !result.content || !result.content[0]) {
        console.error("Invalid response format from Claude API:", result);
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      return result.content[0].text;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error in Claude API call:", error.message);
      
      // Only use fallback for certain errors
      if (error.message?.includes("timeout") || error.message?.includes("network")) {
        console.log("Using fallback response due to network/timeout error");
        return this.createPersonalizedResponse(
          typeof messages[messages.length - 1] === 'object' 
            ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "") 
            : "", 
          context
        );
      }
      
      // For other errors, retry with simpler prompt
      try {
        console.log("Retrying with simplified prompt...");
        // Create a more focused system prompt
        const simplifiedSystemPrompt = `You are Allie, an AI assistant focused on family workload balance.
        Today's date is ${new Date().toLocaleDateString()}.
        
        IMPORTANT: Give specific answers about the family data you have access to:
        - Family: ${context.familyName || 'Unknown'}
        - Survey data: ${context.surveyData?.mamaPercentage ? `Mama: ${context.surveyData.mamaPercentage.toFixed(1)}%, Papa: ${(100 - context.surveyData.mamaPercentage).toFixed(1)}%` : 'Not yet available'}
        - Tasks: ${context.tasks?.length || 0} active tasks
        
        REMEMBER: Always be specific and precise when referring to this family's data.
        DO NOT say "I have access to the family's data" - instead SHOW that access by mentioning specific data points.
        
        ABOUT SURVEY QUESTIONS: Be informative about all survey questions. Explain why they're asked, how their weights are calculated, and the impact of each factor (frequency, invisibility, emotional labor, child development) on task importance.`;
        
        // Extract last user message for the retry
        const lastMessageContent = typeof messages[messages.length - 1] === 'object'
          ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
          : "";
        
        // Make a simpler request
        const response = await fetch(this.proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 2000,
            temperature: 0.7,
            messages: [{ role: "user", content: lastMessageContent }],
            system: simplifiedSystemPrompt
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result && result.content && result.content[0]) {
            return result.content[0].text;
          }
        }
        
        // If retry fails, fall back to default response
        return this.createPersonalizedResponse(
          lastMessageContent, 
          context
        );
      } catch (retryError) {
        console.error("Retry also failed:", retryError);
        return this.createPersonalizedResponse(
          typeof messages[messages.length - 1] === 'object'
            ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
            : "",
          context
        );
      }
    }
  } catch (error) {
    console.error("Error in Claude API call:", error.message);
    
    // Return fallback response
    return this.createPersonalizedResponse(
      typeof messages[messages.length - 1] === 'object'
        ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
        : "",
      context
    );
  }
}
  
  // Extract calendar event data from user message
  extractCalendarRequest(message) {
    // Check if this is a calendar-related request
    const calendarKeywords = [
      'add to calendar', 'schedule', 'appointment', 'meeting', 'event', 
      'calendar', 'book', 'plan', 'sync', 'reminder', 'save date', 'date'
    ];
    
    const isCalendarRequest = calendarKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (!isCalendarRequest) return null;
    
    // If it's a calendar request, try to extract details
    const eventData = {
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      childName: null
    };
    
    // Extract title - check for date/dinner context first
    if (message.toLowerCase().includes('date') && 
        !message.toLowerCase().includes('date for') && 
        !message.toLowerCase().includes('date with')) {
      eventData.title = 'Dinner Date';
    }
    
    // Extract title from common patterns
    const titlePatterns = [
      /(?:add|create|schedule|book)\s+(?:a|an)\s+([a-z\s]+)(?:\s+with|\s+for|\s+on|\s+at)/i,
      /(?:add|create|schedule|book)\s+(?:a|an)\s+([a-z\s]+)/i,
    ];
    
    for (const pattern of titlePatterns) {
      const match = message.match(pattern);
      if (match) {
        eventData.title = match[1].trim();
        // If we found "date" as the title
        if (eventData.title.toLowerCase() === 'date') {
          eventData.title = 'Dinner Date';
        }
        break;
      }
    }
    
    // If no title found but message mentions date night, dinner, etc.
    if (!eventData.title && (
      message.toLowerCase().includes('dinner') || 
      message.toLowerCase().includes('date night') ||
      message.toLowerCase().includes('date with')
    )) {
      eventData.title = 'Dinner Date';
    }
    
    // Extract relative date keywords (today, tomorrow, next week, this weekend)
    if (message.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      eventData.date = tomorrow.toISOString().split('T')[0];
    } else if (message.toLowerCase().includes('today')) {
      const today = new Date();
      eventData.date = today.toISOString().split('T')[0];
    } else if (message.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      eventData.date = nextWeek.toISOString().split('T')[0];
    } else if (message.toLowerCase().includes('this weekend')) {
      const thisWeekend = new Date();
      // Find next Saturday
      const daysToSaturday = 6 - thisWeekend.getDay();
      thisWeekend.setDate(thisWeekend.getDate() + daysToSaturday);
      eventData.date = thisWeekend.toISOString().split('T')[0];
    }
    
    // Extract specific days of week (next Monday, Tuesday, etc.)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      const dayName = dayNames[i];
      if (message.toLowerCase().includes(`next ${dayName}`)) {
        const date = new Date();
        const currentDay = date.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        date.setDate(date.getDate() + daysToAdd);
        eventData.date = date.toISOString().split('T')[0];
        break;
      } else if (message.toLowerCase().includes(dayName) && 
               (message.toLowerCase().includes('this') || 
                !message.toLowerCase().includes('next'))) {
        // "This Thursday" or just "Thursday"
        const date = new Date();
        const currentDay = date.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd < 0) daysToAdd += 7;
        date.setDate(date.getDate() + daysToAdd);
        eventData.date = date.toISOString().split('T')[0];
        break;
      }
    }
    
    // Extract specific dates (April 15, 4/15, etc.)
    if (!eventData.date) {
      const datePatterns = [
        /(?:on|for)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
        /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
        /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i
      ];
      
      for (const pattern of datePatterns) {
        const match = message.match(pattern);
        if (match) {
          eventData.date = match[1];
          break;
        }
      }
    }
    
    // Extract time with improved patterns
  const timePatterns = [
    /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|[ap]\.m\.))/i,     // "at 3 pm" or "at 3:30 pm"
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|[ap]\.m\.))\s+(?:on|next|with|at|for)/i,  // "3 pm on Friday" or "3 pm with doctor"
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|[ap]\.m\.))/i,           // Just "3 pm" anywhere
    /at\s+(\d{1,2})(?:\s+o'?clock)?/i,              // "at 3" or "at 3 o'clock"
    /starts\s+at\s+(\d{1,2}(?::\d{2})?)/i,           // "starts at 3"
    /begins\s+at\s+(\d{1,2}(?::\d{2})?)/i,           // "begins at 3"
    /\s+at\s+(\d{1,2})(?:\s+|$)/i                   // Simple "at 3" pattern
  ];
  
  let timeFound = false;
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      eventData.time = match[1].trim();
      console.log("Extracted time:", eventData.time);
      timeFound = true;
      break;
    }
  }
  
  // Special case for when exact patterns fail - look for numbers after time-related words
  if (!timeFound) {
    const simpleTimePatterns = [
      /at\s+(\d{1,2})/i,
      /starts\s+at\s+(\d{1,2})/i,
      /(\d{1,2})\s*(?:pm|am)/i,
      /(\d{1,2})\s+(?:o'?clock)/i
    ];
    
    for (const pattern of simpleTimePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        eventData.time = match[1].trim();
        console.log("Extracted time using simple pattern:", eventData.time);
        break;
      }
    }
  }
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      eventData.time = match[1].trim();
      console.log("Extracted time:", eventData.time);
      break;
    }
  }
  
  // Extract location keywords (at Restaurant, in Central Park)
  const locationPatterns = [
    /at\s+([A-Za-z\s]+(?:restaurant|cafe|park|theater|cinema|mall|store))(?:\s+on|\s+at|\s+for)/i,
    /in\s+([A-Za-z\s]+(?:park|mall|area|district|neighborhood))(?:\s+on|\s+at|\s+for)/i,
    /with\s+(?:doctor|dr\.?)\s+([A-Za-z\s]+)/i,   // "with doctor berry"
    /at\s+([A-Za-z][A-Za-z\s'&]+)(?:\s|$)/i       // "at Mayo Clinic" (more general location)
  ];
  
  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match) {
      eventData.location = match[1];
      break;
    }
  }
    
    // Extract food keywords for restaurant inference
    const foodKeywords = ['dinner', 'lunch', 'breakfast', 'brunch', 'chinese', 'italian', 'mexican', 'indian', 'sushi', 'thai', 'food'];
    for (const food of foodKeywords) {
      if (message.toLowerCase().includes(food)) {
        if (!eventData.location) eventData.location = 'Restaurant';
        if (!eventData.title) eventData.title = `${food.charAt(0).toUpperCase() + food.slice(1)} Date`;
        break;
      }
    }
    
    // Extract participants (who is involved)
    const personPatterns = [
      /with\s+(\w+)(?:\s+and\s+(\w+))?/i,
      /for\s+(\w+)(?:\s+and\s+(\w+))?/i,
      /(\w+)\s+and\s+(\w+)/i
    ];
    
    for (const pattern of personPatterns) {
      const match = message.match(pattern);
      if (match) {
        // Ignore common words that might match this pattern
        const commonWords = ['me', 'myself', 'you', 'my', 'the', 'our', 'us', 'this', 'that', 'these', 'those'];
        if (match[1] && !commonWords.includes(match[1].toLowerCase())) {
          eventData.childName = match[1];
        }
        break;
      }
    }
    
    // Process the extracted data to create a valid event
    if (eventData.title || eventData.date || eventData.time) {
      // Default title if none provided
      if (!eventData.title) {
        eventData.title = 'New Event';
      }
      
      // Convert relative date to actual date object
      let startDate;
      
      if (eventData.date) {
        try {
          // Try to parse the date string
          startDate = new Date(eventData.date);
          
          // If date is invalid, try a more flexible approach
          if (isNaN(startDate.getTime())) {
            // Try to parse with Date.parse
            const timestamp = Date.parse(eventData.date);
            if (!isNaN(timestamp)) {
              startDate = new Date(timestamp);
            } else {
              // If still invalid, default to tomorrow
              startDate = new Date();
              startDate.setDate(startDate.getDate() + 1);
            }
          }
          
          // Ensure the date is in the future
          const now = new Date();
          if (startDate < now && startDate.getDate() === now.getDate()) {
            // Same day but earlier time, keep the date
          } else if (startDate < now) {
            // If date is in the past, adjust to next occurrence
            const currentYear = now.getFullYear();
            startDate.setFullYear(currentYear);
            
            // If still in the past, add a year
            if (startDate < now) {
              startDate.setFullYear(currentYear + 1);
            }
          }
        } catch (e) {
          console.error("Error parsing date:", e);
          startDate = new Date();
          startDate.setDate(startDate.getDate() + 1); // Default to tomorrow
        }
      } else {
        // No date provided, default to tomorrow
        startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Set time if provided with improved parsing
  if (eventData.time) {
    const timeMatch = eventData.time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      // Preserve explicit AM/PM specification
      if (period === 'pm' && hour < 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      } else if (!period) {
        // If no AM/PM specified, consider the context
        const messageText = message.toLowerCase();
        const timeContext = messageText.substring(Math.max(0, messageText.indexOf(eventData.time) - 15), 
                                               Math.min(messageText.length, messageText.indexOf(eventData.time) + 15));
        
        // Check if context contains AM/PM indicators
        if (timeContext.includes('afternoon') || 
            timeContext.includes('evening') || 
            timeContext.includes('night') ||
            (hour > 0 && hour < 7)) { // Assuming times like 3 without AM/PM are usually PM
          if (hour < 12) hour += 12;
        }
      }
      
      console.log(`Setting time to ${hour}:${minute} based on extracted "${eventData.time}"`);
      startDate.setHours(hour, minute, 0, 0);
    } else {
      // Default based on event type only if no specific time was found
      console.log("No valid time format found, using event type defaults");
      if (eventData.title.toLowerCase().includes('dinner') || 
          eventData.title.toLowerCase().includes('date')) {
        startDate.setHours(19, 0, 0, 0);
      } else if (eventData.title.toLowerCase().includes('lunch')) {
        startDate.setHours(12, 0, 0, 0);
      } else if (eventData.title.toLowerCase().includes('breakfast')) {
        startDate.setHours(8, 0, 0, 0);
      } else {
        startDate.setHours(9, 0, 0, 0); 
      }
    }
  } else {
    // No time was extracted, so check for time-related words in the message
    const messageText = message.toLowerCase();
    
    // Look for time indicators
    if (messageText.includes('afternoon')) {
      startDate.setHours(14, 0, 0, 0); // 2 PM for afternoon
    } else if (messageText.includes('evening')) {
      startDate.setHours(18, 0, 0, 0); // 6 PM for evening
    } else if (messageText.includes('morning')) {
      startDate.setHours(9, 0, 0, 0);  // 9 AM for morning
    } else if (eventData.title.toLowerCase().includes('dinner') || 
        eventData.title.toLowerCase().includes('date')) {
      startDate.setHours(19, 0, 0, 0); // 7 PM for dinner events
    } else if (eventData.title.toLowerCase().includes('lunch')) {
      startDate.setHours(12, 0, 0, 0);
    } else if (eventData.title.toLowerCase().includes('breakfast')) {
      startDate.setHours(8, 0, 0, 0);
    } else if (messageText.includes('appt') || 
               messageText.includes('appointment') || 
               messageText.includes('doctor') || 
               messageText.includes('doc')) {
      startDate.setHours(14, 0, 0, 0); // 2 PM default for medical appointments
    } else {
      startDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }
  }
      
      // Create end time (default 1.5 hours after start for meals, 1 hour for other events)
      const endDate = new Date(startDate);
      if (eventData.title.toLowerCase().includes('dinner') || 
          eventData.title.toLowerCase().includes('lunch') ||
          eventData.title.toLowerCase().includes('breakfast') ||
          eventData.title.toLowerCase().includes('date')) {
        endDate.setMinutes(endDate.getMinutes() + 90); // 1.5 hours for meals
      } else {
        endDate.setHours(endDate.getHours() + 1); // 1 hour default
      }
      
      // Create the final event data object
  const finalEventData = {
    type: eventData.title.toLowerCase().includes('date') ? 'date' : 
          message.toLowerCase().includes('doctor') || message.toLowerCase().includes('appt') ? 'appointment' : 'event',
    title: eventData.title,
    person: eventData.childName,
    startDate,
    endDate,
    location: eventData.location || (eventData.title.toLowerCase().includes('dinner') ? 'Restaurant' : ''),
    description: `Added from Allie chat: ${message}`,
    originalText: message  // Store original message for context
  };

  // Add detailed logging to debug time extraction issues
  console.log("Final extracted calendar event:", {
    type: finalEventData.type,
    title: finalEventData.title,
    startTime: startDate.toLocaleTimeString(),
    extractedTime: eventData.time,
    person: eventData.childName,
    location: finalEventData.location,
    originalMessage: message
  });

  return finalEventData;
}

return null;
  }
  
  /// Process calendar request and add event to calendar
  async processCalendarRequest(eventData, context) {
    try {
      console.log("Processing calendar request with data:", JSON.stringify(eventData, null, 2));
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return "I need you to be logged in to add events to your calendar. Please log in and try again.";
      }
      
      // Get family ID from context or currentUser
      const familyId = context?.familyId || '';
      
      // Parse date and time
      let eventDate;
      if (eventData.date) {
        // Try to parse date string
        eventDate = new Date(eventData.date);
        // If date is invalid, try a more flexible approach
        if (isNaN(eventDate.getTime())) {
          const dateStr = eventData.date.replace(/(st|nd|rd|th)/, '');
          eventDate = new Date(dateStr);
          
          // If still invalid, try to extract date parts
          if (isNaN(eventDate.getTime())) {
            console.warn("Could not parse date directly:", eventData.date);
            // Default to tomorrow
            eventDate = new Date();
            eventDate.setDate(eventDate.getDate() + 1);
          }
        }
      } else if (eventData.startDate) {
        // Use startDate if provided
        eventDate = new Date(eventData.startDate);
      } else {
        // Default to tomorrow if no date provided
        eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);
      }
      
      // Set time if provided - enhanced version with better handling
  if (eventData.time) {
    // Parse time string (e.g., "3:00 PM", "14:00", "2pm")
    const timeStr = eventData.time.toLowerCase();
    const hour12Match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    const hour24Match = timeStr.match(/(\d{1,2})(?::(\d{2}))?/);
    
    if (hour12Match) {
      // 12-hour format
      let hours = parseInt(hour12Match[1]);
      const minutes = hour12Match[2] ? parseInt(hour12Match[2]) : 0;
      const ampm = hour12Match[3];
      
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      console.log(`Setting time to ${hours}:${minutes} (12-hour format from "${timeStr}")`);
      eventDate.setHours(hours, minutes, 0, 0);
    } else if (hour24Match) {
      // 24-hour format
      const hours = parseInt(hour24Match[1]);
      const minutes = hour24Match[2] ? parseInt(hour24Match[2]) : 0;
      
      // If no AM/PM but hour is 1-7, assume PM (common assumption for appointments)
      let adjustedHours = hours;
      const originalMessage = eventData.originalText || '';
      
      if (hours > 0 && hours < 8 && !timeStr.includes('am') && 
          !originalMessage.toLowerCase().includes('morning')) {
        adjustedHours = hours + 12;
        console.log(`Assuming PM for time ${hours}, adjusting to ${adjustedHours}`);
      }
      
      console.log(`Setting time to ${adjustedHours}:${minutes} (24-hour format from "${timeStr}")`);
      eventDate.setHours(adjustedHours, minutes, 0, 0);
    } else {
      // Try to extract numeric time without am/pm
      const numericMatch = timeStr.match(/(\d{1,2})/);
      if (numericMatch) {
        let hours = parseInt(numericMatch[1]);
        
        // If number is 1-7 without AM/PM, likely PM
        if (hours > 0 && hours < 8) {
          hours += 12;
        }
        
        console.log(`Setting time to ${hours}:00 (numeric-only time from "${timeStr}")`);
        eventDate.setHours(hours, 0, 0, 0);
      } else {
        // Check original message for context clues before defaulting
        const originalMessage = eventData.originalText || '';
        if (originalMessage.toLowerCase().includes('afternoon')) {
          console.log('Setting time to 3:00 PM based on "afternoon" context');
          eventDate.setHours(15, 0, 0, 0);
        } else if (originalMessage.toLowerCase().includes('evening')) {
          console.log('Setting time to 6:00 PM based on "evening" context');
          eventDate.setHours(18, 0, 0, 0);
        } else if (originalMessage.toLowerCase().includes('morning')) {
          console.log('Setting time to 9:00 AM based on "morning" context');
          eventDate.setHours(9, 0, 0, 0);
        } else {
          // Set event-specific defaults as last resort
          const eventType = eventData.type?.toLowerCase() || '';
          console.log(`No time context found, using event type "${eventType}" for default`);
          
          if (eventType === 'doctor' || eventType === 'dental' || eventType === 'appointment') {
            eventDate.setHours(14, 0, 0, 0); // 2 PM for appointments
          } else if (eventType === 'birthday' || eventType === 'party') {
            eventDate.setHours(14, 0, 0, 0); // 2 PM for parties
          } else {
            eventDate.setHours(12, 0, 0, 0); // Noon default
          }
        }
      }
    }
  } else {
    // No time information provided at all
    // Look for time clues in original text
    const originalMessage = eventData.originalText || '';
    
    if (originalMessage.toLowerCase().includes('afternoon')) {
      console.log('Setting time to 3:00 PM based on "afternoon" context');
      eventDate.setHours(15, 0, 0, 0);
    } else if (originalMessage.toLowerCase().includes('evening')) {
      console.log('Setting time to 6:00 PM based on "evening" context');
      eventDate.setHours(18, 0, 0, 0);
    } else if (originalMessage.toLowerCase().includes('morning')) {
      console.log('Setting time to 9:00 AM based on "morning" context');
      eventDate.setHours(9, 0, 0, 0);
    } else {
      // Set event-specific defaults as last resort
      const eventType = eventData.type?.toLowerCase() || '';
      
      if (eventType === 'doctor' || eventType === 'dental' || eventType === 'appointment') {
        eventDate.setHours(14, 0, 0, 0); // 2 PM for appointments
      } else if (eventType === 'birthday' || eventType === 'party') {
        eventDate.setHours(14, 0, 0, 0); // 2 PM for parties
      } else {
        eventDate.setHours(12, 0, 0, 0); // Noon default
      }
    }
  }
      
      // Create end time (1 hour after start by default)
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 1);
      
      // Handle child-specific events
      let childId = null;
      let childName = null;
      
      // Try to find a matching child if a name or type is provided
      if (eventData.person && context && context.children) {
        // Look for child by name
        const matchingChild = context.children.find(
          child => child.name.toLowerCase() === eventData.person.toLowerCase()
        );
        
        if (matchingChild) {
          childId = matchingChild.id;
          childName = matchingChild.name;
        }
      }
      
      // Create calendar event object with enhanced metadata
      const event = {
        summary: eventData.title || 'New Event',
        title: eventData.title || 'New Event', // Ensure both title and summary are set
        description: eventData.description || `Event added via Allie chat`,
        location: eventData.location || '',
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: true
        },
        // Add child metadata if available
        childId: childId,
        childName: childName || eventData.person,
        // Add event type and category
        eventType: eventData.type?.toLowerCase() || 'event',
        category: eventData.type?.toLowerCase() || 'event',
        // Include context
        familyId: familyId,
        // Add source information for tracking
        source: 'chat',
        // Add extra details and parsing metadata
        extraDetails: {
          creationSource: 'chat',
          parsedWithAI: true,
          extractionConfidence: 0.9,
          originalText: eventData.originalText || (typeof eventData === 'object' ? JSON.stringify(eventData) : 'Unknown original text')
        }
      };
      
      console.log("Adding calendar event:", JSON.stringify(event, null, 2));
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      console.log("Calendar add result:", result);
      
      // Format response
      if (result && result.success) {
        // Trigger a UI refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const formattedTime = eventDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit'
        });
        
        let response = `I've added the following event to your family's shared calendar:\n\n`;
        response += `Event: ${eventData.title || 'New Event'}\n`;
        response += `Date: ${formattedDate}\n`;
        response += `Time: ${formattedTime}\n`;
        
        if (eventData.location) {
          response += `Location: ${eventData.location}\n`;
        }
        
        if (childName || eventData.person) {
          response += `I've noted that this is for ${childName || eventData.person}.`;
        }
        
        response += `\nThis has been added to your family's shared calendar. You can view and manage this in your calendar.`;
        
        return response;
      } else {
        return "I tried to add the event to your calendar, but encountered an issue. Please try again or add it manually through the calendar widget.";
      }
    } catch (error) {
      console.error("Error processing calendar request:", error);
      return "I wasn't able to process your calendar request due to a technical issue. You can try again or add the event directly through the calendar widget.";
    }
  }
  
  // Test Hello World function
  async testHelloWorld() {
    try {
      console.log("Testing Hello World function via proxy...");
      
      // Simple test to check API connectivity through proxy
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: "Say hello world!"
            }
          ],
          system: "You are a helpful assistant that responds with just 'Hello World!'"
        })
      });
      
      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        message: "Claude API connection via proxy successful!",
        content: result.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Detailed error in Hello World test:", error);
      throw error;
    }
  }
  
  // Create personalized response from context
  createPersonalizedResponse(userMessage, context) {
    const userMessageLower = userMessage.toLowerCase();
    
    // Get family name
    const familyName = context.familyName || "your family";
    
    // Try to give responses based on actual data
    if (userMessageLower.includes("survey") || userMessageLower.includes("result")) {
      if (context.surveyData && context.surveyData.mamaPercentage) {
        return `Based on your family's survey data, Mama is currently handling about ${context.surveyData.mamaPercentage.toFixed(1)}% of tasks overall, while Papa is handling ${(100 - context.surveyData.mamaPercentage).toFixed(1)}%. Would you like me to break this down by category?`;
      }
    }
    
    // Handle survey question explanations
    if (userMessageLower.includes("why") && userMessageLower.includes("question")) {
      return `The survey questions are designed to measure both visible and invisible work in your family. Each question has a weighted impact score based on factors like frequency (how often the task is done), invisibility (how often the work goes unnoticed), emotional labor required, and impact on child development. This helps create a comprehensive picture of your family's workload distribution.`;
    }
    
    // Handle weight/scoring explanations
    if (userMessageLower.includes("weight") || userMessageLower.includes("score") || userMessageLower.includes("impact")) {
      return `Task weights in Allie are calculated using several factors: Base Weight (time required), Frequency (daily tasks have higher weight than monthly ones), Invisibility (tasks that go unnoticed have higher weight), Emotional Labor (mental and emotional energy required), and Child Development Impact (how the task affects children's growth). These factors combine to create the total weight you see for each question.`;
    }
    
    if (userMessageLower.includes("task") || userMessageLower.includes("what") && userMessageLower.includes("do")) {
      if (context.tasks && context.tasks.length > 0) {
        const pendingTasks = context.tasks.filter(t => !t.completed);
        if (pendingTasks.length > 0) {
          return `The ${familyName} family currently has ${pendingTasks.length} pending tasks. The next task due is "${pendingTasks[0].title}" assigned to ${pendingTasks[0].assignedTo}. Would you like more details about this task?`;
        }
      }
    }
    
    if (userMessageLower.includes("balance") || userMessageLower.includes("imbalance")) {
      if (context.balanceScores && context.balanceScores.categoryBalance) {
        const mostImbalanced = Object.entries(context.balanceScores.categoryBalance)
          .sort((a, b) => b[1].imbalance - a[1].imbalance)[0];
        
        if (mostImbalanced) {
          return `The greatest imbalance in the ${familyName} family is in ${mostImbalanced[0]}, with a ${mostImbalanced[1].imbalance.toFixed(1)}% difference. ${mostImbalanced[1].mama > mostImbalanced[1].papa ? "Mama" : "Papa"} is currently handling most of these tasks.`;
        }
      }
    }
    
    // Calendar-related contextual response
    if (userMessageLower.includes("calendar") || userMessageLower.includes("schedule") || userMessageLower.includes("appointment")) {
      return `I can help you manage your family's calendar. You can add events by saying something like "Add a dentist appointment for Emma on Tuesday at 2pm" or "Schedule a family dinner on Friday at 6pm". What would you like to add to your calendar?`;
    }
    
    // Relationship-related contextual response
    if (userMessageLower.includes("relationship") || userMessageLower.includes("partner") || userMessageLower.includes("spouse")) {
      if (context.relationshipData) {
        return `Based on your family data, you've implemented about ${context.relationshipData.avgImplementation?.toFixed(0) || 0}% of relationship strategies. Your strongest strategy is "${context.relationshipData.topStrategy || 'spending time together'}". Would you like suggestions for strengthening your relationship further?`;
      } else {
        return `Maintaining a strong relationship while balancing family responsibilities is important. I can suggest relationship strategies, help plan date nights, or provide insights based on research. What aspect of your relationship would you like to focus on?`;
      }
    }
    
    // Child-related contextual response
    if (userMessageLower.includes("child") || userMessageLower.includes("kid") || userMessageLower.includes("son") || userMessageLower.includes("daughter")) {
      if (context.children && context.children.length > 0) {
        return `You can track various aspects of your ${context.children.length > 1 ? 'children' : 'child'} including medical appointments, growth metrics, emotional wellbeing, and academic progress. Would you like to add new information or view existing data?`;
      } else {
        return `I can help you track information about your children, including medical appointments, growth metrics, emotional wellbeing, and academic progress. Would you like me to explain how the child tracking features work?`;
      }
    }
    
    // If we can't give a specific response based on data, default to something generic but personalized
    return `I'm here to help with your family balance needs. I can answer questions about survey weights, task distribution, and relationship strategies. What would you like to know about?`;
  }
  
  // Format system prompt with family context
  formatSystemPrompt(familyContext) {
    // Log the context data for debugging
    console.log("Formatting system prompt with context:", Object.keys(familyContext));
    
    // Get knowledge base if available
    const kb = familyContext.knowledgeBase || {};
    
    // Current date and time information for Claude
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Add special sections based on intent if available
    let intentSpecificContext = '';
    if (familyContext.currentIntent) {
      const intent = familyContext.currentIntent;
      const intentCategory = intent.split('.')[0];
      
      // Add special context for calendar requests
      if (intentCategory === 'calendar') {
        intentSpecificContext += `
        === CALENDAR CONTEXT ===
        The user is asking about calendar functionality. Allie supports:
        - Adding events to the family calendar
        - Scheduling appointments, meetings, and reminders
        - Creating date nights and relationship activities
        - Setting up family meetings
        
        Calendar requests should be handled precisely. Extract the following details:
        - Event title/type
        - Date and time
        - Location (if specified)
        - Participants (if specified)
        - Duration (if specified)
        
        Be very specific in your responses about the exact date, time, and details.
        `;
      }
      
      // Add special context for relationship questions
      else if (intentCategory === 'relationship') {
        intentSpecificContext += `
        === RELATIONSHIP CONTEXT ===
        The user is asking about relationship features. Allie supports:
        - Planning date nights and couple activities
        - Scheduling relationship check-ins
        - Managing relationship strategies
        - Providing relationship insights based on family data
        
        When answering relationship questions, be emotionally supportive and practical. Balance research insights with actionable suggestions.
        `;
        
        // Add relationship data if available
        if (familyContext.relationshipData) {
          intentSpecificContext += `
          Current Relationship Data:
          - Implemented strategies: ${familyContext.relationshipData.implementedStrategies?.join(', ') || 'None'}
          - Top strategy: ${familyContext.relationshipData.topStrategy || 'None'}
          - Average implementation: ${familyContext.relationshipData.avgImplementation?.toFixed(0) || 0}%
          `;
        }
      }
      
      // Add special context for child-related questions
      else if (intentCategory === 'child') {
        intentSpecificContext += `
        === CHILD TRACKING CONTEXT ===
        The user is asking about child tracking features. Allie supports:
        - Tracking medical appointments and growth metrics
        - Monitoring emotional wellbeing
        - Managing homework and academic data
        - Recording milestones and achievements
        
        Be helpful in guiding the user on how to use the child tracking features, or offer to help them record this information in the app.
        `;
      }
      
      // Add special context for task-related questions
      else if (intentCategory === 'task') {
        intentSpecificContext += `
        === TASK MANAGEMENT CONTEXT ===
        The user is asking about task management. Allie supports:
        - Adding new tasks to the family task list
        - Marking tasks as complete
        - Reassigning tasks between family members
        - Querying task status and distribution
        
        When discussing tasks, focus on how they contribute to overall family balance.
        `;
        
        // Add current tasks data if available
        if (familyContext.tasks && familyContext.tasks.length > 0) {
          intentSpecificContext += `
          Current Tasks Summary:
          - Total tasks: ${familyContext.tasks.length}
          - Completed tasks: ${familyContext.tasks.filter(t => t.completed).length}
          - Mama's tasks: ${familyContext.tasks.filter(t => t.assignedTo === 'Mama').length}
          - Papa's tasks: ${familyContext.tasks.filter(t => t.assignedTo === 'Papa').length}
          `;
        }
      }
      
      // Add special context for survey-related questions
      else if (intentCategory === 'survey' || intentCategory === 'balance' || intentCategory === 'data') {
        intentSpecificContext += `
        === SURVEY DATA CONTEXT ===
        The user is asking about survey results or family data analysis. When discussing survey data:
        - Be specific about percentages and distributions
        - Highlight the most imbalanced categories
        - Connect data to practical implications
        - Suggest concrete actions based on the data
        
        Avoid generic responses - use the actual survey data to provide personalized insights.
        `;
      }
    }
    
    // Add conversation history context if available
    let conversationContext = '';
    if (familyContext.conversationContext && familyContext.conversationContext.recentTopics) {
      const recentTopics = familyContext.conversationContext.recentTopics.slice(0, 3);
      if (recentTopics.length > 0) {
        conversationContext = `
        === RECENT CONVERSATION TOPICS ===
        ${recentTopics.map((topic, index) => `${index + 1}. ${topic.query || 'Previous topic'}`).join('\n')}
        
        When responding, maintain conversation continuity by referencing previous topics when relevant. Keep your tone consistent throughout the conversation.
        `;
      }
    }
    
    // Create knowledge base section
    let knowledgeBaseContent = '';
    if (kb.whitepapers) {
      knowledgeBaseContent = `
      === ALLIE KNOWLEDGE BASE ===
      
      TASK CATEGORIES:
      - Visible Household: ${kb.whitepapers.taskCategories?.visibleHousehold || ''}
      - Invisible Household: ${kb.whitepapers.taskCategories?.invisibleHousehold || ''}
      - Visible Parental: ${kb.whitepapers.taskCategories?.visibleParental || ''}
      - Invisible Parental: ${kb.whitepapers.taskCategories?.invisibleParental || ''}
      
      RESEARCH FINDINGS:
      - Mental Load: ${kb.whitepapers.research?.mentalLoad || ''}
      - Relationship Impact: ${kb.whitepapers.research?.relationshipImpact || ''}
      - Child Development: ${kb.whitepapers.research?.childDevelopment || ''}
      
      METHODOLOGY:
      - Task Weighting: ${kb.whitepapers.methodology?.taskWeighting || ''}
      - Improvement Framework: ${kb.whitepapers.methodology?.improvementFramework || ''}

      Calendar Integration Knowledge:
Allie supports calendar integration with:
1. Google Calendar - requires sign-in through settings
2. Apple Calendar - available on macOS devices 
3. ICS downloads - works with any calendar system

IMPORTANT: You HAVE a calendar system in this app. When users ask about adding something to their calendar, you should:
      1. Extract the event details (title, date, time, location)
      2. Offer to add it to their calendar
      3. Confirm when it's been added successfully
      4. NEVER say you don't have a calendar system or don't know the date

      // Around line 400 in the knowledge base section, add:
DAD JOKES:
1. "I'm on a seafood diet. I see food and I eat it!"
2. "Why don't scientists trust atoms? Because they make up everything!"
3. "What did the ocean say to the beach? Nothing, it just waved."
4. "I used to be a baker, but I couldn't make enough dough."
5. "Why don't eggs tell jokes? They'd crack each other up."
6. "What's brown and sticky? A stick!"
7. "Why did the scarecrow win an award? Because he was outstanding in his field!"
8. "I'm reading a book about anti-gravity. It's impossible to put down!"
9. "What do you call cheese that isn't yours? Nacho cheese!"
10. "I wouldn't buy anything with velcro. It's a total rip-off."

When asked about dates or calendar requests, remember you ARE able to handle calendar functionality through the app's built-in calendar service.
      
      PARENTING STRATEGIES:
      1. Positive Reinforcement: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.research || ''}
      
      2. Responsibility Development: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.research || ''}
      
      3. Emotional Support: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.research || ''}
      
      4. Integrated Approach: ${kb.whitepapers.parentingStrategies?.integratedApproach?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.integratedApproach?.research || ''}
      `;
    }
    
    // Add entity extraction information if available
    let entityContext = '';
    if (familyContext.currentEntities && Object.keys(familyContext.currentEntities).length > 0) {
      entityContext = `
      === EXTRACTED ENTITIES ===
      ${Object.entries(familyContext.currentEntities).map(([type, entities]) => {
        return `${type.toUpperCase()}: ${JSON.stringify(entities)}`;
      }).join('\n')}
      
      Use these extracted entities to provide a more contextually relevant response.
      `;
    }

    // Special task weight section to improve answers about survey questions
    const taskWeightSection = `
    === TASK WEIGHTS AND SURVEY METHODOLOGY ===
    
    SURVEY DESIGN:
    The survey is designed to capture the distribution of both visible and invisible work in the family.
    Questions are organized into four main categories:
    1. Visible Household Tasks - Observable tasks like cleaning, cooking, and home maintenance
    2. Invisible Household Tasks - Tasks like planning, scheduling, and anticipating needs that often go unrecognized
    3. Visible Parental Tasks - Direct childcare activities like driving kids and helping with homework
    4. Invisible Parental Tasks - Emotional labor, monitoring development, and coordinating children's needs
    
    TASK WEIGHT CALCULATION:
    Each task is weighted based on several factors:
    
    1. Base Weight (1-5): The basic time commitment required for the task
       - 1: Very quick, takes minutes
       - 3: Moderate time investment
       - 5: Significant time commitment
       
    2. Frequency Multiplier:
       - Daily: 1.5x multiplier
       - Several times weekly: 1.3x multiplier
       - Weekly: 1.2x multiplier
       - Monthly: 1.0x multiplier
       - Quarterly: 0.8x multiplier
       
    3. Invisibility Multiplier (how often the work goes unnoticed):
       - Highly visible: 1.0x multiplier
       - Partially visible: 1.2x multiplier
       - Mostly invisible: 1.35x multiplier
       - Completely invisible: 1.5x multiplier
       
    4. Emotional Labor Multiplier:
       - Minimal: 1.0x multiplier
       - Low: 1.1x multiplier
       - Moderate: 1.2x multiplier
       - High: 1.3x multiplier
       - Extreme: 1.4x multiplier
       
    5. Research Impact Multiplier (based on research findings):
       - High: 1.3x multiplier
       - Medium: 1.15x multiplier
       - Standard: 1.0x multiplier
       
    6. Child Development Multiplier (how the task impacts children):
       - High: 1.25x multiplier
       - Moderate: 1.15x multiplier
       - Limited: 1.0x multiplier
       
    7. Priority Multiplier (based on family priorities):
       - Highest priority: 1.5x multiplier
       - Secondary priority: 1.3x multiplier
       - Tertiary priority: 1.1x multiplier
       - None: 1.0x multiplier
       
    The final weight is calculated by multiplying the base weight by all applicable multipliers.
    
    INTERPRETING WEIGHTS:
    - 12+ points: Very high impact task - significant contributor to workload imbalance
    - 9-12 points: High impact task - important for family balance
    - 6-9 points: Medium impact task - contributes moderately to workload
    - <6 points: Standard impact task - routine but necessary
    
    When a user asks about a specific question or weight, use this framework to explain why certain tasks have higher weights than others, focusing on the multipliers that apply to that specific task.
    `;

    // New section specifically about survey questions
    const surveyQuestionsSection = `
    === SURVEY QUESTIONS AND THEIR PURPOSE ===

    PURPOSE OF THE SURVEY:
    The survey is designed to measure the current distribution of family workload across different categories of tasks. It has several key purposes:

    1. Data Collection: Gather objective data about who handles which tasks
    2. Awareness Building: Help families recognize both visible and invisible work
    3. Pattern Identification: Reveal patterns of imbalance that may not be obvious
    4. Baseline Establishment: Create a starting point to measure improvement
    5. Discussion Facilitation: Provide structure for family conversations about balance

    WHAT HAPPENS WITH RESPONSES:
    When families complete the survey:
    1. Each response is recorded and weighted based on task importance
    2. Category-specific imbalances are calculated
    3. AI-generated insights highlight key imbalance patterns
    4. Personalized task recommendations are created based on identified imbalances
    5. Weekly check-ins measure progress over time

    COMMON QUESTIONS ABOUT THE SURVEY:

    "Why do you ask about who cleans/cooks/etc.?"
    These visible household tasks form the foundation of family work distribution. While they're easily observable, they can still create imbalance when primarily handled by one person.

    "Why are there questions about planning and organizing?"
    These measure invisible household tasks - mental load work that often goes unnoticed but requires significant cognitive and emotional energy.

    "Why do you ask about who drives kids places?"
    These visible parental tasks help us understand the distribution of direct childcare responsibilities.

    "Why are there questions about anticipating children's needs?"
    These measure invisible parental labor - the mental and emotional work of parenting that isn't immediately obvious but is time and energy intensive.

    "Why are tasks weighted differently?"
    Not all tasks have equal impact on overall workload. Tasks that occur daily, require emotional labor, or go unnoticed create more imbalance than occasional, visible tasks.

    WHY THIS MATTERS:
    Research shows that imbalanced distribution of family responsibilities leads to:
    1. Relationship dissatisfaction and increased conflict
    2. Higher stress levels and burnout for the overburdened partner
    3. Modeling of unequal gender roles for children
    4. Reduced career advancement for the partner handling most family tasks
    5. Decreased overall family wellbeing

    When user asks about survey questions, provide specific, detailed explanations about why the question is important and how it helps measure family balance.
    `;
    
    // Create a context-rich system prompt
    return `You are Allie, an AI assistant specialized in family workload balance. 
    Your purpose is to help families distribute responsibilities more equitably and improve their dynamics.
    
    Today's date is ${formattedDate}.
    Current time: ${currentDate.toLocaleTimeString()}.
    
    Family Information:
    Family Name: ${familyContext.familyName || 'Unknown'}
    Number of Adults: ${familyContext.adults || 2}
    Number of Children: ${familyContext.children?.length || 0}
    Current Week: ${familyContext.currentWeek || 1}
    Family ID: ${familyContext.familyId || 'Unknown'}
    
    ${familyContext.familyMembers ? `
    Family Members:
    ${familyContext.familyMembers.map(m => `- ${m.name}: ${m.role} (${m.roleType || 'Child'})`).join('\n')}
    ` : ''}
    
    ${familyContext.surveyData ? `
    Survey Data:
    Total Questions: ${familyContext.surveyData.totalQuestions || 0}
    Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
    Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%
    
    Category Breakdown:
    ${Object.entries(familyContext.surveyData.categories || {}).map(([category, data]) => 
      `- ${category}: Mama ${data.mamaPercent?.toFixed(1) || 0}%, Papa ${data.papaPercent?.toFixed(1) || 0}%`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.tasks && familyContext.tasks.length > 0 ? `
    Current Tasks:
    ${familyContext.tasks.map(task => 
      `- "${task.title}" assigned to ${task.assignedTo} (${task.completed ? 'Completed' : 'Pending'}): ${task.description}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.impactInsights && familyContext.impactInsights.length > 0 ? `
    Family Insights:
    ${familyContext.impactInsights.map(insight => 
      `- ${insight.type || 'Insight'} for ${insight.category || 'Family'}: ${insight.message}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.balanceScores ? `
    Current Balance Scores:
    - Overall Balance: Mama ${familyContext.balanceScores.overallBalance?.mama?.toFixed(1) || 50}%, Papa ${familyContext.balanceScores.overallBalance?.papa?.toFixed(1) || 50}%
    ${Object.entries(familyContext.balanceScores.categoryBalance || {}).map(([category, scores]) => 
      `- ${category}: Mama ${scores.mama?.toFixed(1) || 0}%, Papa ${scores.papa?.toFixed(1) || 0}%, Imbalance: ${scores.imbalance?.toFixed(1) || 0}%`
    ).join('\n')}
    ` : ''}
    
    ${knowledgeBaseContent}
    
    ${taskWeightSection}
    
    ${surveyQuestionsSection}
    
    ${intentSpecificContext}
    
    ${conversationContext}
    
    ${entityContext}
    
    ${familyContext.relationshipData ? `
    === RELATIONSHIP DATA ===
    
    Relationship Strategies:
    ${familyContext.relationshipData.allStrategies?.map((strategy, index) => 
      `${index + 1}. ${strategy.name}: ${strategy.implementation || 0}% implemented`
    ).join('\n') || 'No strategy data available'}
    ` : ''}
    
    ${familyContext.coupleData ? `
    Couple Check-in Data:
    - Last Check-in: ${familyContext.coupleData.lastCheckIn || 'None recorded'}
    - Satisfaction Score: ${familyContext.coupleData.satisfaction || 'Not recorded'}
    - Communication Score: ${familyContext.coupleData.communication || 'Not recorded'}
    ` : ''}
    
    ${familyContext.weekHistory && Object.keys(familyContext.weekHistory).length > 0 ? `
    Recent Progress:
    ${Object.entries(familyContext.weekHistory).slice(0, 3).map(([week, data]) => 
      `- Week ${week.replace('week', '')}: ${data.completionStatus || 'In progress'}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.surveyData && familyContext.surveyData.responses ? `
    IMPORTANT: You have access to detailed survey responses for this family. When asked about specific tasks or categories, reference this data to provide personalized insights rather than general information.
    ` : ''}
    
    You can help with:
    1. Explaining how to use the Allie app
    2. Providing insights about family survey results
    3. Offering research-backed parenting advice
    4. Suggesting ways to improve family balance
    5. Answering questions about the app's mission and methodology
    6. Giving relationship advice based on the 10 strategies
    7. Connecting workload balance to relationship health
    8. Adding tasks and meetings to calendars
    9. Managing calendar integrations
    10. Analyzing their specific survey data and tasks
    
    ABOUT THE SURVEY AND QUESTIONS:
    - When a user asks about a specific survey question, explain its purpose and importance in detail
    - Explain task weights in detail when asked, using the Task Weights section above
    - Relate survey questions to research on family dynamics and balance
    - Help users understand the difference between visible and invisible work
    - Connect individual questions to larger categories and patterns
    
    Always be supportive, practical, and focused on improving family dynamics through better balance.
    Remember that all data is confidential to this family.
    
    In your responses:
    - Be concise but friendly
    - Provide practical, actionable advice whenever possible
    - Focus on equity and balance rather than "traditional" gender roles
    - Remember that "balance" doesn't always mean a perfect 50/50 split
    - Encourage communication between family members
    - When mentioning research or scientific findings, refer to the studies in the knowledge base
    - Suggest appropriate relationship strategies when workload issues arise
    
    VERY IMPORTANT: NEVER respond with "I have access to the family's data" or similar generic phrases. Always demonstrate your knowledge by sharing specific data points relevant to their question. If you don't have specific data for their question, be honest about what you do know instead of making vague statements.
    
    CURRENT DETECTED INTENT: ${familyContext.currentIntent || 'unknown'}`;
  }
}

export default new ClaudeService();