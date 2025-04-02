// src/services/ChatService.js
import { db, auth } from './firebase';
import ClaudeService from './ClaudeService';
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, limit } from 'firebase/firestore';
import CalendarService from './CalendarService';  // Add this line

class ChatService {
  // Load messages for a family
  async loadMessages(familyId) {
    try {
      if (!familyId) {
        console.warn("No familyId provided to loadMessages");
        return [];
      }

      const q = query(
        collection(db, "chatMessages"),
        where("familyId", "==", familyId),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      const messages = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Loaded ${messages.length} messages for family ${familyId}`);
      return messages;
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  }
  
  // Save a message to the database
  async saveMessage(message) {
    try {
      if (!message.familyId) {
        console.error("Cannot save message without familyId", message);
        return false;
      }

      const docRef = await addDoc(collection(db, "chatMessages"), {
        ...message,
        createdAt: serverTimestamp()
      });
      
      console.log(`Message saved with ID: ${docRef.id}`);
      return true;
    } catch (error) {
      console.error("Error saving message:", error);
      return false;
    }
  }
  
  // In src/services/ChatService.js - Update the handleCalendarRequest method

  // Enhanced helper function to handle calendar-related requests
  async handleCalendarRequest(text, familyContext, userId) {
    // Check if this is a calendar-related request
    const isCalendarRequest = text.toLowerCase().includes('calendar') &&
      (text.toLowerCase().includes('add') || 
       text.toLowerCase().includes('schedule') || 
       text.toLowerCase().includes('book') ||
       text.toLowerCase().includes('appointment') ||
       text.toLowerCase().includes('create event') ||
       text.toLowerCase().includes('sync'));
       
    if (!isCalendarRequest) return null;
    
    // If we don't have a user ID, we can't create calendar events
    if (!userId) {
      return "I'd like to add this to your calendar, but I need you to be logged in first.";
    }
    
    try {
      // Extract potential event details from the request
      const eventDetails = this.extractEventDetails(text);
      
      if (eventDetails) {
        // Create the event
        console.log("Creating calendar event:", eventDetails);
        
        // Format the event for CalendarService
        const event = {
          summary: eventDetails.title,
          description: eventDetails.description || '',
          location: eventDetails.location || '',
          start: {
            dateTime: eventDetails.startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: eventDetails.endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };
        
        // Add the event to the calendar
        const result = await CalendarService.addEvent(event, userId);
        
        if (result.success) {
          return `I've added "${eventDetails.title}" to your calendar for ${eventDetails.startDate.toLocaleDateString()} at ${eventDetails.startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
        } else {
          return "I tried to add that to your calendar, but there was an issue. Please try again or add it manually through the calendar widget.";
        }
      }
      
      // If we couldn't extract event details but it's a calendar request,
      // return a helpful message about general calendar functionality
      const tasks = familyContext.tasks || [];
      const pendingTasks = tasks.filter(t => !t.completed).slice(0, 3);
      
      // Get family meetings
      const familyMeetings = [];
      if (familyContext.currentWeek) {
        const meetingDate = new Date();
        meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay())); // Next Sunday
        meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
        
        familyMeetings.push({
          id: `meeting-${familyContext.currentWeek}`,
          title: `Week ${familyContext.currentWeek} Family Meeting`,
          date: meetingDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        });
      }
      
      // Create a helpful response about calendar integration
      return `I'd be happy to help with your calendar! You can add tasks and meetings to your calendar in a few ways:

1. **For tasks**: Click the "Add to Calendar" button on any task card in the Tasks tab
2. **For family meetings**: Go to the Calendar widget and click "Add to Calendar" next to the upcoming meeting
3. **For relationship events**: In the Relationship tab, you can schedule date nights and add them directly to your calendar

${pendingTasks.length > 0 ? `**Here are your current tasks that could be added to your calendar:**
${pendingTasks.map(task => `- ${task.title} (assigned to ${task.assignedToName})`).join('\n')}` : ''}

${familyMeetings.length > 0 ? `**Upcoming family meeting:**
- ${familyMeetings[0].title} (${familyMeetings[0].date})` : ''}

To create a specific event, you can tell me what event you want to add and when. For example, "Add a haircut appointment for Tegner on April 5th at 2pm in Stockholm."`;
    } catch (error) {
      console.error("Error handling calendar request:", error);
      return "I had trouble processing your calendar request. Please try again with more specific details.";
    }
  }
  
// ChatService.js - Add this improved method after the existing handleCalendarRequest method
processCalendarRequest = async (eventData, context) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return "I need you to be logged in to add events to your calendar. Please log in and try again.";
    }
    
    // Parse date and time
    let eventDate = new Date();
    if (eventData.date) {
      try {
        eventDate = new Date(eventData.date);
        // If date is invalid, try a more flexible approach
        if (isNaN(eventDate.getTime())) {
          const dateStr = eventData.date.replace(/(st|nd|rd|th)/, '');
          eventDate = new Date(dateStr);
        }
      } catch (e) {
        console.log("Error parsing date, using today:", e);
        eventDate = new Date();
      }
    }
    
    // Default to tomorrow if no date provided or parsing failed
    if (isNaN(eventDate.getTime())) {
      eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);
    }
    
    // Create calendar event object
    const event = {
      summary: eventData.title || 'New Event',
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(eventDate.getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: true
      }
    };
    
    // Add event to calendar
    const result = await CalendarService.addEvent(event, currentUser.uid);
    
    if (result && result.success) {
      return `I've added "${event.summary}" to your calendar for ${eventDate.toLocaleDateString()}. You can see this and other events in the calendar widget.`;
    } else {
      return "I tried to add the event to your calendar, but encountered an issue. Please try again or add it manually through the calendar widget.";
    }
  } catch (error) {
    console.error("Error processing calendar request:", error);
    return "I wasn't able to process your calendar request due to a technical issue. You can try again or add the event directly through the calendar widget.";
  }
}



  // New helper method to extract event details from text
  extractEventDetails(text) {
    // Simple regex-based extraction of event details
    let eventType = null;
    let title = null;
    let person = null;
    let date = null;
    let time = null;
    let location = null;
    
    // Try to extract event type
    if (text.toLowerCase().includes('haircut') || text.toLowerCase().includes('barber')) {
      eventType = 'appointment';
      title = 'Haircut Appointment';
    } else if (text.toLowerCase().includes('doctor') || text.toLowerCase().includes('medical')) {
      eventType = 'appointment';
      title = 'Doctor Appointment';
    } else if (text.toLowerCase().includes('dinner') || text.toLowerCase().includes('date')) {
      eventType = 'date';
      title = 'Dinner Date';
    } else if (text.toLowerCase().includes('meeting')) {
      eventType = 'meeting';
      title = 'Meeting';
    } else if (text.toLowerCase().includes('appointment')) {
      eventType = 'appointment';
      title = 'Appointment';
    }
    
    // Try to extract person
    const personMatches = text.match(/for\s+(\w+)/i);
    if (personMatches) {
      person = personMatches[1];
      // Update title if we know the person
      if (title) {
        title = `${person}'s ${title}`;
      }
    }
    
    // Try to extract date
    const dateMatches = text.match(/(today|tomorrow|on\s+([a-zA-Z]+\s+\d+)(st|nd|rd|th)?|on\s+([a-zA-Z]+)|next\s+([a-zA-Z]+)|\d{1,2}\/\d{1,2}\/\d{2,4}|[a-zA-Z]+\s+\d{1,2}(st|nd|rd|th)?)/i);
    if (dateMatches) {
      if (dateMatches[0].toLowerCase().includes('today')) {
        date = new Date();
      } else if (dateMatches[0].toLowerCase().includes('tomorrow')) {
        date = new Date();
        date.setDate(date.getDate() + 1);
      } else if (dateMatches[0].toLowerCase().includes('next')) {
        const dayOfWeek = dateMatches[5].toLowerCase();
        date = this.getNextDayOfWeek(dayOfWeek);
      } else {
        // Try to parse the date string
        try {
          date = new Date(dateMatches[0].replace(/on\s+/i, ''));
          if (isNaN(date.getTime())) {
            // If parsing fails, try other formats
            const monthMatch = dateMatches[0].match(/([a-zA-Z]+)\s+(\d{1,2})/i);
            if (monthMatch) {
              const month = monthMatch[1];
              const day = parseInt(monthMatch[2]);
              const year = new Date().getFullYear();
              date = new Date(`${month} ${day}, ${year}`);
            }
          }
        } catch (e) {
          console.error("Error parsing date:", e);
          date = null;
        }
      }
    }
    
    // Try to extract time
    const timeMatches = text.match(/at\s+(\d{1,2})(:\d{2})?\s*(am|pm)?/i);
    if (timeMatches) {
      let hour = parseInt(timeMatches[1]);
      const minute = timeMatches[2] ? parseInt(timeMatches[2].substring(1)) : 0;
      const period = timeMatches[3]?.toLowerCase();
      
      // Adjust for AM/PM
      if (period === 'pm' && hour < 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
      
      if (date) {
        date.setHours(hour, minute, 0, 0);
      } else {
        date = new Date();
        date.setHours(hour, minute, 0, 0);
      }
    } else if (date) {
      // Default to noon if no time specified
      date.setHours(12, 0, 0, 0);
    }
    
    // Try to extract location
    const locationMatches = text.match(/in\s+([a-zA-Z\s]+)/i);
    if (locationMatches) {
      location = locationMatches[1].trim();
    }
    
    // If we have a valid event type and date, create the event details
    if (eventType && date && title) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(endDate.getHours() + 1); // Default 1-hour duration
      
      return {
        type: eventType,
        title,
        person,
        startDate,
        endDate,
        location,
        description: `Added from Allie chat: ${text}`
      };
    }
    
    return null;
  }
  
  // Helper to get the next occurrence of a day of the week
  getNextDayOfWeek(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(dayName.toLowerCase());
    if (dayIndex === -1) return null;
    
    const today = new Date();
    const currentDayIndex = today.getDay();
    
    // Calculate days until the next occurrence
    let daysUntilNext = dayIndex - currentDayIndex;
    if (daysUntilNext <= 0) {
      daysUntilNext += 7; // Wrap around to next week
    }
    
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + daysUntilNext);
    return nextDay;
  }

  // Get AI response to a message
  // In src/services/ChatService.js - Update getAIResponse method

async getAIResponse(text, familyId, previousMessages) {
  try {
    // Log request with more details for debugging
    console.log("Allie Chat request:", { 
      text, 
      familyId, 
      previousMessagesCount: previousMessages?.length || 0
    });
    
    // Better error handling for missing familyId
    if (!familyId) {
      console.warn("getAIResponse called without familyId");
      return "I need access to your family data to provide personalized responses. Please ensure you're logged in correctly.";
    }
    
    // Verify we have the minimally required data to proceed
    if (!text || text.trim() === '') {
      console.warn("Empty message text received");
      return "I didn't receive any message to respond to. Please try again.";
    }
    
    // Add a start timestamp for performance tracking
    const startTime = Date.now();
    console.log(`Starting AI response generation at ${new Date().toISOString()}`);
      
    // Get family data from Firestore for context
    let familyData = {};
    try {
      console.log("Getting family context for:", familyId);
      familyData = await this.getFamilyContext(familyId);
      console.log("Got family context with keys:", Object.keys(familyData));
    } catch (contextError) {
      console.error("Error getting family context:", contextError);
      return "I'm having trouble accessing your family data right now. Please try again in a moment.";
    }
      
    // Check if we actually got meaningful family data
    if (!familyData || Object.keys(familyData).length < 3) {
      console.warn("Insufficient family data for personalized response");
      return "I couldn't retrieve your complete family data. Please try refreshing the page or logging in again.";
    }
    
    // Get the current user's ID
    let userId = null;
    try {
      // Try to get from the last message
      const lastMessage = previousMessages[previousMessages.length - 1];
      if (lastMessage && lastMessage.sender !== 'allie') {
        userId = lastMessage.sender;
      }
    } catch (e) {
      console.warn("Error getting user ID from messages:", e);
    }
    
    // Check for calendar-related requests - PASS USERID HERE
    const calendarResponse = await this.handleCalendarRequest(text, familyData, userId);
    if (calendarResponse) {
      console.log("Handling calendar-related request");
      return calendarResponse;
    }
      
    // Add knowledge base to context
    familyData.knowledgeBase = knowledgeBase;
      
    // Format messages for Claude API
    const formattedMessages = previousMessages
      .slice(-10) // Last 10 messages for context
      .map(msg => ({
        role: msg.sender === 'allie' ? 'assistant' : 'user',
        content: msg.text
      }));

    // Add the current message
    formattedMessages.push({
      role: 'user',
      content: text
    });
    
    console.log("Sending to Claude API via proxy:", {
      messageCount: formattedMessages.length,
      contextSize: JSON.stringify(familyData).length,
      familyDataKeys: Object.keys(familyData)
    });
      
    // Call the Claude API through our service with updated code
    let response;
    try {
      response = await ClaudeService.generateResponse(
        formattedMessages, 
        familyData
      );
      console.log("Claude API call succeeded with response length:", response?.length);
    } catch (apiError) {
      console.error("Claude API error details:", apiError);
      // Try fallback response first before giving up
      response = ClaudeService.createPersonalizedResponse(text, familyData);
      console.log("Using fallback personalized response:", response?.substring(0, 50) + "...");
    }
      
    // If we got a response, return it
    if (response && response.length > 0) {
      return response;
    }
      
    // If we got here, something went wrong but didn't throw an error
    return "I should be able to answer this with your family's data, but I'm having trouble processing it right now. Could you try asking in a different way?";
  } catch (error) {
    console.error("Error getting AI response:", error);
      
    // Provide more specific error message for common issues
    if (error.message?.includes("timeout")) {
      return "I'm taking longer than expected to process your question. This might be due to high demand. Please try again in a moment.";
    }
      
    if (text.toLowerCase().includes("survey") || text.toLowerCase().includes("data")) {
      return "I'd like to analyze your survey data, but I'm having trouble accessing it right now. Please try refreshing the page or asking again in a few moments.";
    }
      
    return "I'm having trouble processing your question right now. While I'm reconnecting, you can explore the dashboard for insights or check your tasks in the Tasks tab.";
  }
}

  // Get family context for AI response
  async getFamilyContext(familyId) {
    try {
      // Get family data from Firestore
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // NEW: Get survey responses from the surveyResponses collection
        const surveyResponsesQuery = query(
          collection(db, "surveyResponses"), 
          where("familyId", "==", familyId)
        );
        const surveyResponsesSnapshot = await getDocs(surveyResponsesQuery);
        
        // Process and merge all responses
        const completeResponses = {};
        surveyResponsesSnapshot.forEach((doc) => {
          const responseData = doc.data();
          if (responseData.responses) {
            // Merge all responses together
            Object.assign(completeResponses, responseData.responses);
          }
        });
        
        console.log("Retrieved survey responses:", Object.keys(completeResponses).length);
        
        // Extract survey data if available
        let surveyData = {};
        if (completeResponses && Object.keys(completeResponses).length > 0) {
          surveyData = {
            totalQuestions: Object.keys(completeResponses).length,
            mamaPercentage: this.calculateMamaPercentage(completeResponses),
            categories: this.getCategoryBreakdown(completeResponses),
            responses: completeResponses  // Include the actual responses
          };
        } else {
          // Check if responses are directly in the family document (fallback)
          if (data.surveyResponses && Object.keys(data.surveyResponses).length > 0) {
            surveyData = {
              totalQuestions: Object.keys(data.surveyResponses).length,
              mamaPercentage: this.calculateMamaPercentage(data.surveyResponses),
              categories: this.getCategoryBreakdown(data.surveyResponses),
              responses: data.surveyResponses
            };
          }
        }
        
        // Get the full task list
        const tasks = data.tasks || [];
        
        // Get week history data for insights
        const weekHistory = data.weekHistory || {};
        
        // Get impactInsights if available
        const impactInsights = data.impactInsights || [];
        
        // Get balance scores if available
        let balanceScores = null;
        try {
          // Try to calculate current weighted balance scores
          if (data.weightedScores) {
            balanceScores = data.weightedScores;
          }
        } catch (e) {
          console.warn("Error getting balance scores:", e);
        }
        
        // Get relationship strategies data
        let relationshipData = {};
        try {
          const stratDocRef = doc(db, "relationshipStrategies", familyId);
          const stratDocSnap = await getDoc(stratDocRef);
          
          if (stratDocSnap.exists()) {
            const strategies = stratDocSnap.data().strategies || [];
            
            relationshipData = {
              implementedStrategies: strategies.filter(s => s.implementation > 50).map(s => s.name),
              topStrategy: strategies.sort((a, b) => b.implementation - a.implementation)[0]?.name,
              avgImplementation: strategies.length > 0 
                ? strategies.reduce((sum, s) => sum + s.implementation, 0) / strategies.length 
                : 0,
              allStrategies: strategies  // Include all strategies
            };
          }
        } catch (e) {
          console.error("Error getting relationship strategies:", e);
        }
        
        // Get couple check-in data
        let coupleData = {};
        try {
          const checkInQuery = query(
            collection(db, "coupleCheckIns"),
            where("familyId", "==", familyId),
            orderBy("completedAt", "desc"),
            limit(5)  // Get the last 5 check-ins for trend analysis
          );
          
          const checkInSnapshot = await getDocs(checkInQuery);
          if (!checkInSnapshot.empty) {
            const checkIns = checkInSnapshot.docs.map(doc => doc.data());
            
            coupleData = {
              lastCheckIn: checkIns[0].completedAt?.toDate?.().toISOString() || null,
              satisfaction: checkIns[0].data?.satisfaction || null,
              communication: checkIns[0].data?.communication || null,
              history: checkIns  // Include full history of check-ins
            };
          }
        } catch (e) {
          console.error("Error getting couple check-in data:", e);
        }
        
        // Create the return object
        const contextData = {
          familyId: familyId,
          familyName: data.familyName,
          adults: data.familyMembers.filter(m => m.role === 'parent').length,
          children: data.familyMembers.filter(m => m.role === 'child'),
          familyMembers: data.familyMembers,  // Include all family members
          currentWeek: data.currentWeek,
          completedWeeks: data.completedWeeks || [],
          surveyData,
          tasks,  // Include all tasks
          weekHistory,  // Include week history
          impactInsights,  // Include impact insights
          balanceScores,  // Include balance scores
          relationshipData,
          coupleData
        };
  
        // Log the context data for debugging
        console.log("Family context generated:", {
          dataKeys: Object.keys(contextData),
          hasResponses: !!contextData.surveyData?.responses,
          responseCount: contextData.surveyData?.responses ? Object.keys(contextData.surveyData.responses).length : 0,
          tasksCount: contextData.tasks?.length || 0
        });
  
        return contextData;
      }
      
      return {};
    } catch (error) {
      console.error("Error getting family context:", error);
      return {};
    }
  }
  
  // Helper method to calculate mama percentage from survey responses
  calculateMamaPercentage(responses) {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses).forEach(response => {
      if (response === 'Mama' || response === 'Papa') {
        totalCount++;
        if (response === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    return totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
  }
  
  // Helper method to get category breakdown from survey responses
  getCategoryBreakdown(responses) {
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Simple categorization based on question IDs (approximate)
    // In a real implementation, you would have a mapping of question IDs to categories
    Object.entries(responses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question number if possible
      const match = key.match(/q(\d+)/);
      if (!match) return;
      
      const qNum = parseInt(match[1]);
      let category;
      
      if (qNum <= 20) {
        category = "Visible Household Tasks";
      } else if (qNum <= 40) {
        category = "Invisible Household Tasks";
      } else if (qNum <= 60) {
        category = "Visible Parental Tasks";
      } else {
        category = "Invisible Parental Tasks";
      }
      
      categories[category].total++;
      if (value === 'Mama') {
        categories[category].mama++;
      } else {
        categories[category].papa++;
      }
    });
    
    // Calculate percentages
    Object.keys(categories).forEach(category => {
      const { mama, total } = categories[category];
      if (total > 0) {
        categories[category].mamaPercent = (mama / total) * 100;
        categories[category].papaPercent = 100 - (mama / total) * 100;
      } else {
        categories[category].mamaPercent = 50;
        categories[category].papaPercent = 50;
      }
    });
    
    return categories;
  }
}

export default new ChatService();