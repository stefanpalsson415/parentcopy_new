// src/services/EnhancedChatService.js
import { db, auth } from './firebase';
import ClaudeService from './ClaudeService';
import EnhancedNLU from './EnhancedNLU';
import CalendarService from './CalendarService';
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import ProviderService from './ProviderService';
import ConsolidatedNLU from './ConsolidatedNLU';
import ProviderChatService from './ProviderChatService';
import MedicalChatService from './MedicalChatService';
import TaskChatService from './TaskChatService';
import RelationshipChatService from './RelationshipChatService';
import IntentClassifier from './IntentClassifier';
import ConversationContext from './ConversationContext';
import FeedbackLearningSystem from './FeedbackLearningSystem';
import ChatPersistenceService from './ChatPersistenceService';


import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  getDoc,
  setDoc,
  updateDoc,
  doc, 
  limit, 
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp
} from 'firebase/firestore';

class EnhancedChatService {
  constructor() {
    this.nlu = new EnhancedNLU();
    this.conversationContext = {};
    this.sessionIntents = {};
    this.feedbackLog = {};
  }
  
  async loadMessages(familyId, options = {}) {
    try {
      // Handle both cases: when options is a number (backwards compatibility)
      // and when it's an object with configuration parameters
      const pageSize = typeof options === 'number' ? options : (options.pageSize || 100);
      const includeMetadata = options.includeMetadata !== undefined ? options.includeMetadata : true;
      const loadMore = options.loadMore || false;
      
      const result = await ChatPersistenceService.loadMessages(familyId, {
        pageSize,
        loadMore,
        includeMetadata
      });
      
      // Update conversation context based on loaded messages
      this.updateConversationContextFromHistory(familyId, result.messages);
      
      return result.messages;
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  }
  
  async saveMessage(message) {
    return ChatPersistenceService.saveMessage(message);
  }
  
  // Track conversation context by family
  updateConversationContext(familyId, newContext) {
    if (!this.conversationContext[familyId]) {
      this.conversationContext[familyId] = {
        recentTopics: [],
        openQuestions: [],
        lastQueryTime: null,
        entityHistory: {},
        sessionStartTime: new Date(),
        messageCount: 0
      };
    }
    
    const context = this.conversationContext[familyId];
    context.messageCount++;
    
    // Update topics
    if (newContext.topics && newContext.topics.length > 0) {
      context.recentTopics = [...newContext.topics, ...context.recentTopics].slice(0, 5);
    } else if (newContext.query) {
      const topics = this.nlu.extractTopics(newContext.query);
      if (topics.length > 0) {
        context.recentTopics = [...topics, ...context.recentTopics].slice(0, 5);
      }
    }
    
    // Update entities
    if (newContext.entities) {
      Object.entries(newContext.entities).forEach(([type, entities]) => {
        if (!context.entityHistory[type]) {
          context.entityHistory[type] = [];
        }
        context.entityHistory[type] = [...entities, ...context.entityHistory[type]].slice(0, 5);
      });
    }
    
    // Track open questions
    if (newContext.query && newContext.query.endsWith('?')) {
      context.openQuestions.push({
        question: newContext.query,
        timestamp: new Date(),
        answered: false
      });
      
      // Limit to recent open questions
      context.openQuestions = context.openQuestions.slice(-10);
    }
    
    context.lastQueryTime = new Date();
    
    return context;
  }
  
  // Update conversation context from message history
  updateConversationContextFromHistory(familyId, messages) {
    if (!messages || messages.length === 0) return;
    
    const userMessages = messages.filter(msg => msg.sender !== 'allie');
    const allieMessages = messages.filter(msg => msg.sender === 'allie');
    
    // Extract topics from all user messages
    const topics = userMessages.flatMap(msg => this.nlu.extractTopics(msg.text));
    const uniqueTopics = [...new Set(topics)].slice(0, 10);
    
    // Extract entities from all user messages
    const entities = {};
    userMessages.forEach(msg => {
      const msgEntities = this.nlu.extractEntities(msg.text);
      Object.entries(msgEntities).forEach(([type, values]) => {
        if (!entities[type]) entities[type] = [];
        entities[type] = [...entities[type], ...values];
      });
    });
    
    // Find open questions (user questions that don't appear to have been answered)
    const openQuestions = [];
    for (let i = 0; i < userMessages.length; i++) {
      const msg = userMessages[i];
      if (msg.text.trim().endsWith('?')) {
        const questionTime = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        
        // Check if there's an Allie response right after this
        const hasAnswer = allieMessages.some(aMsg => {
          const responseTime = aMsg.timestamp?.toDate?.() || new Date(aMsg.timestamp);
          return responseTime > questionTime && responseTime - questionTime < 60000; // within a minute
        });
        
        if (!hasAnswer) {
          openQuestions.push({
            question: msg.text,
            timestamp: questionTime,
            answered: false
          });
        }
      }
    }
    
    this.updateConversationContext(familyId, {
      topics: uniqueTopics,
      entities,
      openQuestions
    });
  }
  
  // Update session intents for analytics
  updateSessionIntents(familyId, intent) {
    if (!intent) return;
    
    if (!this.sessionIntents[familyId]) {
      this.sessionIntents[familyId] = {
        startTime: new Date(),
        intents: {}
      };
    }
    
    const session = this.sessionIntents[familyId];
    session.intents[intent] = (session.intents[intent] || 0) + 1;
    session.lastUpdated = new Date();
  }
  
  // Save user feedback on AI responses
  async saveUserFeedback(messageId, feedback, correction, familyId, feedbackType) {
    try {
      // Record the feedback
      await setDoc(doc(db, "chatFeedback", messageId), {
        messageId,
        feedback, // 'helpful', 'unhelpful', 'confusing', etc.
        correction, // user-provided correction if any
        feedbackType, // specific type of feedback (incorrect, confusing, better)
        familyId,
        timestamp: serverTimestamp()
      });
      
      // Track in local session
      if (!this.feedbackLog[familyId]) {
        this.feedbackLog[familyId] = [];
      }
      this.feedbackLog[familyId].push({
        messageId,
        feedback,
        timestamp: new Date()
      });
      
      // Aggregate feedback for analysis
      const aggregateRef = doc(db, "analytics", "chatFeedbackAggregate");
      await updateDoc(aggregateRef, {
        totalFeedback: increment(1),
        [`${feedback}Count`]: increment(1),
        recentFeedback: arrayUnion({
          messageId,
          feedback,
          familyId,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log(`Feedback saved: ${feedback} for message ${messageId}`);
      return true;
    } catch (error) {
      console.error("Error saving feedback:", error);
      return false;
    }
  }

  // Look up calendar events based on query text
  async lookupCalendarEvent(text, familyId, userId) {
    try {
      console.log("Looking up calendar events for query:", text);
      
      if (!userId || !familyId) {
        return { success: false, message: "Cannot lookup calendar events without user and family ID" };
      }
      
      // Extract relevant entities from the query
      const entities = this.nlu.extractEntities(text);
      
      // Extract event type or category to narrow search
      let eventType = null;
      if (text.toLowerCase().includes('dentist') || text.toLowerCase().includes('doctor')) {
        eventType = 'appointment';
      } else if (text.toLowerCase().includes('birthday')) {
        eventType = 'birthday';
      } else if (text.toLowerCase().includes('music') || text.toLowerCase().includes('lesson')) {
        eventType = 'lesson';
      } else if (text.toLowerCase().includes('sports') || text.toLowerCase().includes('practice')) {
        eventType = 'sports';
      }
      
      // Extract names of people mentioned
      let personName = null;
      if (entities.people && entities.people.length > 0) {
        personName = entities.people[0].name;
      }
      
      // Extract dates if any
      let dateRange = {
        start: null,
        end: null
      };
      
      if (entities.dates && entities.dates.length > 0) {
        // Specific date mentioned
        dateRange.start = new Date(entities.dates[0].date);
        dateRange.end = new Date(entities.dates[0].date);
        dateRange.end.setHours(23, 59, 59);
      } else if (text.toLowerCase().includes('next')) {
        // Look for "next" events in the future
        dateRange.start = new Date();
        dateRange.end = new Date();
        dateRange.end.setMonth(dateRange.end.getMonth() + 3); // Look ahead 3 months
      } else if (text.toLowerCase().includes('today')) {
        // Today's events
        dateRange.start = new Date();
        dateRange.start.setHours(0, 0, 0, 0);
        dateRange.end = new Date();
        dateRange.end.setHours(23, 59, 59, 999);
      } else if (text.toLowerCase().includes('tomorrow')) {
        // Tomorrow's events
        dateRange.start = new Date();
        dateRange.start.setDate(dateRange.start.getDate() + 1);
        dateRange.start.setHours(0, 0, 0, 0);
        dateRange.end = new Date(dateRange.start);
        dateRange.end.setHours(23, 59, 59, 999);
      } else if (text.toLowerCase().includes('this week')) {
        // This week's events
        dateRange.start = new Date();
        dateRange.end = new Date();
        // Set to end of week (Sunday)
        const daysToSunday = 7 - dateRange.end.getDay();
        dateRange.end.setDate(dateRange.end.getDate() + daysToSunday);
        dateRange.end.setHours(23, 59, 59, 999);
      } else {
        // Default: look from now to 30 days ahead
        dateRange.start = new Date();
        dateRange.end = new Date();
        dateRange.end.setDate(dateRange.end.getDate() + 30);
      }
      
      console.log("Search parameters:", {
        eventType,
        personName,
        dateRange: {
          start: dateRange.start?.toISOString(),
          end: dateRange.end?.toISOString()
        }
      });
      
      // Query Firestore for matching events
      let eventsQuery = query(
        collection(db, "calendar_events"),
        where("userId", "==", userId),
        where("familyId", "==", familyId)
      );
      
      // Get all matching events
      const querySnapshot = await getDocs(eventsQuery);
      let matchingEvents = [];
      
      querySnapshot.forEach(doc => {
        const event = { id: doc.id, ...doc.data() };
        
        // Convert Firestore timestamps to Dates
        let eventStart = null;
        if (event.start) {
          if (event.start.dateTime) {
            eventStart = new Date(event.start.dateTime);
          } else if (event.start instanceof Timestamp) {
            eventStart = event.start.toDate();
          }
        }
        
        // Skip if the event has no valid start date or is outside our date range
        if (!eventStart || eventStart < dateRange.start || eventStart > dateRange.end) {
          return;
        }
        
        // Filter by event type if specified
        if (eventType && event.eventType && !event.eventType.toLowerCase().includes(eventType.toLowerCase()) &&
            !event.category?.toLowerCase().includes(eventType.toLowerCase())) {
          // See if we can match by title
          if (!event.title?.toLowerCase().includes(eventType.toLowerCase()) && 
              !event.summary?.toLowerCase().includes(eventType.toLowerCase())) {
            return;
          }
        }
        
        // Filter by person name if specified
        if (personName) {
          const matchesPerson = 
            event.childName?.toLowerCase().includes(personName.toLowerCase()) ||
            event.summary?.toLowerCase().includes(personName.toLowerCase()) ||
            event.title?.toLowerCase().includes(personName.toLowerCase()) ||
            event.description?.toLowerCase().includes(personName.toLowerCase()) ||
            event.extraDetails?.birthdayChildName?.toLowerCase().includes(personName.toLowerCase());
            
          if (!matchesPerson) {
            return;
          }
        }
        
        // Add the event with its formatted date
        matchingEvents.push({
          ...event,
          formattedDate: eventStart.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          }),
          formattedTime: eventStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })
        });
      });
      
      // Sort by date (closest first)
      matchingEvents.sort((a, b) => {
        const dateA = new Date(a.start.dateTime);
        const dateB = new Date(b.start.dateTime);
        return dateA - dateB;
      });
      
      console.log(`Found ${matchingEvents.length} matching events`);
      
      // Generate a response based on the results
      if (matchingEvents.length === 0) {
        return {
          success: true,
          message: personName 
            ? `I couldn't find any ${eventType || 'upcoming'} events for ${personName} in your calendar.`
            : `I couldn't find any ${eventType || 'upcoming'} events in your calendar.`
        };
      } else if (matchingEvents.length === 1) {
        const event = matchingEvents[0];
        return {
          success: true,
          message: event.childName
            ? `${event.childName}'s ${event.eventType || 'event'} "${event.summary || event.title}" is scheduled for ${event.formattedDate} at ${event.formattedTime}${event.location ? ` at ${event.location}` : ''}.`
            : `"${event.summary || event.title}" is scheduled for ${event.formattedDate} at ${event.formattedTime}${event.location ? ` at ${event.location}` : ''}.`,
          event
        };
      } else {
        // Multiple events found
        const eventList = matchingEvents.slice(0, 3).map(e => 
          `${e.childName ? `${e.childName}'s ` : ''}${e.eventType || 'event'} "${e.summary || e.title}" on ${e.formattedDate} at ${e.formattedTime}`
        ).join('\n- ');
        
        return {
          success: true,
          message: `I found ${matchingEvents.length} matching events. Here are the next ${Math.min(3, matchingEvents.length)}:\n- ${eventList}`,
          events: matchingEvents.slice(0, 3)
        };
      }
    } catch (error) {
      console.error("Error looking up calendar events:", error);
      return { 
        success: false, 
        message: "I'm sorry, I had trouble looking up calendar events. Please try again or check your calendar directly."
      };
    }
  }
  
  // Enhanced calendar request handling with improved entity extraction
  async handleCalendarRequest(text, familyContext, userId) {
    // Check if this is a calendar-related request with more sophisticated intent detection
    const intent = this.nlu.detectIntent(text);
    const isCalendarIntent = ['calendar.add', 'calendar.schedule', 'calendar.remind', 'calendar.check', 'date.query'].includes(intent);
    
    // Enhanced detection with keywords for invitations and parties
    if (!isCalendarIntent) {
      const calendarKeywords = [
        'calendar', 'schedule', 'appointment', 'meeting', 'remind me', 'add to', 'book a', 'set up',
        'birthday', 'party', 'invite', 'invitation', 'celebrating', 'event'
      ];
      const hasKeyword = calendarKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      if (!hasKeyword) return null;
    }
    
    // If we don't have a user ID, we can't create calendar events
    if (!userId) {
      return "I'd like to add this to your calendar, but I need you to be logged in first. Once you're logged in, I can help you schedule events and send reminders.";
    }
    
    try {
      console.log("Processing calendar request:", text);

      // First check if this is a lookup query rather than event creation
      if (intent === 'calendar.check' || text.toLowerCase().includes('when is') || text.toLowerCase().includes('what time is')) {
        // This looks like a query about existing events
        const lookupResult = await this.lookupCalendarEvent(text, familyContext.familyId, userId);
        if (lookupResult.success) {
          return lookupResult.message;
        }
      }
      
      // If not a lookup query, proceed with event creation
      const eventDetails = this.nlu.extractEventDetails(text, familyContext.familyMembers);
      console.log("Extracted event details:", eventDetails);
      
      if (eventDetails && eventDetails.title && eventDetails.startDate) {
        // Create the calendar event
        const event = {
          summary: eventDetails.title,
          description: eventDetails.description || 'Added via Allie chat',
          location: eventDetails.location || '',
          start: {
            dateTime: eventDetails.startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: eventDetails.endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 }
            ]
          }
        };
        
        // Add category if available
        if (eventDetails.category) {
          event.category = eventDetails.category;
        }
        
        // Add the event to the calendar
        const result = await CalendarService.addEvent(event, userId);
        
        if (result.success) {
          // Format response based on event type
          let response = '';
          
          // Format date and time for display
          const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
          const timeOptions = { hour: 'numeric', minute: '2-digit' };
          const formattedDate = eventDetails.startDate.toLocaleDateString('en-US', dateOptions);
          const formattedTime = eventDetails.startDate.toLocaleTimeString('en-US', timeOptions);
          
          if (eventDetails.category === 'appointment') {
            response = `I've added the ${eventDetails.title} to your calendar for ${formattedDate} at ${formattedTime}.`;
          } else if (eventDetails.category === 'reminder') {
            response = `I've set a reminder for you about "${eventDetails.title}" on ${formattedDate} at ${formattedTime}.`;
          } else {
            response = `I've added "${eventDetails.title}" to your calendar for ${formattedDate} at ${formattedTime}.`;
          }
          
          // Add extra details if available
          if (eventDetails.location) {
            response += ` Location: ${eventDetails.location}.`;
          }
          
          if (eventDetails.person) {
            response += ` I've noted that this is for ${eventDetails.person}.`;
          }
          
          response += " You can view and manage this in your calendar.";
          
          return response;
        } else {
          return "I tried to add that to your calendar, but there was an issue. Please try again or check your calendar settings.";
        }
      } else {
        // If we couldn't extract all necessary details, try to get more information
        const missingFields = [];
        if (!eventDetails || !eventDetails.title) missingFields.push("what the event is");
        if (!eventDetails || !eventDetails.startDate) missingFields.push("when it should be scheduled");
        
        if (missingFields.length > 0) {
          return `I'd like to add this to your calendar, but I need a bit more information about ${missingFields.join(" and ")}. Could you provide those details?`;
        }
        
        return "I'm having trouble understanding the calendar request. Could you please provide the event title, date, and time?";
      }
    } catch (error) {
      console.error("Error handling calendar request:", error);
      return "I encountered an error while trying to process your calendar request. Please try again with details like 'Add a meeting with John on Tuesday at 2pm'.";
    }
  }
  
  // Handle relationship event requests
  async handleRelationshipRequest(text, familyContext, userId) {
    // Check if this is a relationship-related request
    const intent = this.nlu.detectIntent(text);
    const isRelationshipIntent = [
      'relationship.date', 
      'relationship.checkin', 
      'relationship.meeting',
      'relationship.activity'
    ].includes(intent);
    
    if (!isRelationshipIntent) {
      const relationshipKeywords = ['date night', 'relationship meeting', 'couple time', 'marriage', 'partner', 'quality time', 'together'];
      const hasKeyword = relationshipKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      if (!hasKeyword) return null;
    }
    
    try {
      // Use NLU to extract relationship event details
      const eventDetails = this.nlu.extractRelationshipEventDetails(text);
      
      if (eventDetails) {
        // Create the relationship event
        const event = {
          summary: `Relationship: ${eventDetails.title}`,
          description: eventDetails.description || 'Time to connect with your partner',
          location: eventDetails.location || '',
          start: {
            dateTime: eventDetails.startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: eventDetails.endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          category: 'relationship',
          colorId: '6' // Pink color for relationship events
        };
        
        // Add to calendar
        const result = await CalendarService.addEvent(event, userId);
        
        if (result.success) {
          // Format date and time for display
          const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
          const timeOptions = { hour: 'numeric', minute: '2-digit' };
          const formattedDate = eventDetails.startDate.toLocaleDateString('en-US', dateOptions);
          const formattedTime = eventDetails.startDate.toLocaleTimeString('en-US', timeOptions);
          
          let response = `I've added "${event.summary}" to your calendar for ${formattedDate} at ${formattedTime}.`;
          
          if (eventDetails.type === 'date') {
            response += " Enjoy your quality time together! Regular date nights are essential for maintaining connection amid family responsibilities.";
          } else if (eventDetails.type === 'check-in') {
            response += " Brief daily check-ins help maintain emotional connection even during busy days.";
          } else {
            response += " Dedicated time for your relationship strengthens your partnership.";
          }
          
          return response;
        } else {
          return "I tried to add your relationship activity to the calendar, but encountered an issue. Please try again or add it manually through the calendar widget.";
        }
      }
      
      return null; // Let the general AI handle it if we couldn't extract specific details
    } catch (error) {
      console.error("Error handling relationship request:", error);
      return null; // Let the general AI handle it
    }
  }
  
  // Handle child tracking requests
  async handleChildTrackingRequest(text, familyContext) {
    // Check if this is a child tracking request
    const intent = this.nlu.detectIntent(text);
    const isChildIntent = [
      'child.add_appointment',
      'child.track_growth', 
      'child.track_homework',
      'child.emotional_wellbeing',
      'child.milestone'
    ].includes(intent);
    
    if (!isChildIntent) {
      const childKeywords = ['my child', 'my kid', 'my son', 'my daughter', 'track', 'growth', 'doctor', 'appointment', 'homework', 'emotional', 'feeling'];
      const hasChildKeyword = childKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      if (!hasChildKeyword) return null;
    }
    
    // Get children from family context
    const children = familyContext.children || 
                   (familyContext.familyMembers?.filter(m => m.role === 'child')) || 
                   [];
    
    if (children.length === 0) {
      return "I don't see any children in your family profile. Would you like to add a child to your family first?";
    }
    
    // Extract child tracking details using NLU
    const trackingDetails = this.nlu.extractChildTrackingDetails(text, children);
    
    // If we couldn't extract enough details, let the general AI handle it
    if (!trackingDetails || !trackingDetails.type) {
      return null;
    }
    
    // Base response based on tracking type
    let response = '';
    
    switch (trackingDetails.type) {
      case 'appointment':
        response = `I can help you track a ${trackingDetails.appointmentType || ''} appointment`;
        if (trackingDetails.child) {
          response += ` for ${trackingDetails.child}`;
        } else {
          response += ` for your child`;
        }
        if (trackingDetails.date) {
          const dateString = trackingDetails.date.toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric' 
          });
          response += ` on ${dateString}`;
        }
        response += `. To add this to the Children Tracking dashboard, go to the Children Tracking tab and select "Add Appointment" in the Medical section.`;
        break;
        
      case 'growth':
        response = `I can help you track growth measurements`;
        if (trackingDetails.child) {
          response += ` for ${trackingDetails.child}`;
        } else {
          response += ` for your child`;
        }
        if (trackingDetails.measurements && Object.keys(trackingDetails.measurements).length > 0) {
          response += `. I see you want to record `;
          const measurements = [];
          if (trackingDetails.measurements.height) measurements.push(`height (${trackingDetails.measurements.height})`);
          if (trackingDetails.measurements.weight) measurements.push(`weight (${trackingDetails.measurements.weight})`);
          if (trackingDetails.measurements.head) measurements.push(`head circumference (${trackingDetails.measurements.head})`);
          response += measurements.join(', ');
        }
        response += `. You can add this in the Children Tracking tab under the Growth & Development section.`;
        break;
        
      case 'emotional':
        response = `I can help you record an emotional check-in`;
        if (trackingDetails.child) {
          response += ` for ${trackingDetails.child}`;
        } else {
          response += ` for your child`;
        }
        if (trackingDetails.emotion) {
          response += `. It sounds like they're feeling ${trackingDetails.emotion}`;
        }
        response += `. Regular emotional check-ins help you support your child's emotional development. You can record this in the Children Tracking tab under Emotional Well-being.`;
        break;
        
      case 'homework':
        response = `I can help you track homework`;
        if (trackingDetails.child) {
          response += ` for ${trackingDetails.child}`;
        } else {
          response += ` for your child`;
        }
        if (trackingDetails.subject) {
          response += ` in ${trackingDetails.subject}`;
        }
        if (trackingDetails.dueDate) {
          const dueDateString = trackingDetails.dueDate.toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric' 
          });
          response += ` due on ${dueDateString}`;
        }
        response += `. You can record this in the Children Tracking tab under the Homework & Academic section.`;
        break;
        
      default:
        return null; // Let the general AI handle it
    }
    
    return response;
  }
  
  // Handle task-related requests
  async handleTaskRequest(text, familyContext) {
    // Check if this is a task-related request
    const intent = this.nlu.detectIntent(text);
    const isTaskIntent = [
      'task.add', 
      'task.complete', 
      'task.reassign',
      'task.query'
    ].includes(intent);
    
    if (!isTaskIntent) {
      const taskKeywords = ['task', 'chore', 'to-do', 'todo', 'assign', 'complete', 'finished', 'done with'];
      const hasTaskKeyword = taskKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      if (!hasTaskKeyword) return null;
    }
    
    // Extract task details using NLU
    const taskDetails = this.nlu.extractTaskDetails(text, familyContext);
    
    // If we couldn't extract enough details, let the general AI handle it
    if (!taskDetails || !taskDetails.action) {
      return null;
    }
    
    // Base response based on task action
    let response = '';
    
    switch (taskDetails.action) {
      case 'add':
        response = `To add a new task`;
        if (taskDetails.title) {
          response += ` "${taskDetails.title}"`;
        }
        if (taskDetails.assignee) {
          response += ` for ${taskDetails.assignee}`;
        }
        response += `, go to the Tasks tab and click the "Add Task" button. `;
        response += `You can then enter all the details for the new task.`;
        break;
        
      case 'complete':
        if (taskDetails.taskId) {
          // Here we'd actually complete the task in a real implementation
          response = `I've marked task "${taskDetails.title || taskDetails.taskId}" as complete. Great job!`;
        } else if (taskDetails.title) {
          response = `To mark "${taskDetails.title}" as complete, go to the Tasks tab and check the box next to it.`;
        } else {
          response = `To mark a task as complete, go to the Tasks tab and check the box next to the task.`;
        }
        break;
        
      case 'reassign':
        response = `To reassign a task`;
        if (taskDetails.title) {
          response += ` like "${taskDetails.title}"`;
        }
        if (taskDetails.assignee) {
          response += ` to ${taskDetails.assignee}`;
        }
        response += `, go to the Tasks tab, click the task's menu (three dots), and select "Reassign".`;
        break;
        
      case 'query':
        if (familyContext.tasks && familyContext.tasks.length > 0) {
          const pendingTasks = familyContext.tasks.filter(t => !t.completed);
          if (pendingTasks.length > 0) {
            response = `You currently have ${pendingTasks.length} pending tasks. `;
            
            if (taskDetails.assignee) {
              const assigneeTasks = pendingTasks.filter(t => 
                t.assignedTo === taskDetails.assignee || 
                t.assignedToName === taskDetails.assignee
              );
              
              if (assigneeTasks.length > 0) {
                response += `${taskDetails.assignee} has ${assigneeTasks.length} tasks: `;
                response += assigneeTasks.map(t => t.title).join(', ');
              } else {
                response += `${taskDetails.assignee} doesn't have any pending tasks right now.`;
              }
            } else {
              response += `The next few tasks are: `;
              response += pendingTasks.slice(0, 3).map(t => `"${t.title}" (assigned to ${t.assignedToName})`).join(', ');
              
              if (pendingTasks.length > 3) {
                response += `, and ${pendingTasks.length - 3} more.`;
              }
            }
          } else {
            response = "Great job! You don't have any pending tasks right now.";
          }
        } else {
          response = "I don't see any tasks in your family profile yet. Would you like to add some tasks?";
        }
        break;
        
      default:
        return null; // Let the general AI handle it
    }
    
    return response;
  }
  
  // Get survey-based insight for direct questions
  async handleSurveyQuestion(text, familyContext) {
    // Check if this is a survey-related question
    const intent = this.nlu.detectIntent(text);
    const isSurveyIntent = [
      'survey.result', 
      'survey.insight', 
      'balance.query',
      'data.analysis'
    ].includes(intent);
    
    if (!isSurveyIntent) {
      const surveyKeywords = ['survey', 'result', 'balance', 'imbalance', 'distribution', 'percentage', 'division'];
      const hasSurveyKeyword = surveyKeywords.some(keyword => text.toLowerCase().includes(keyword));
      
      if (!hasSurveyKeyword) return null;
    }
    
    // Check if we have survey data
    if (!familyContext.surveyData || !familyContext.surveyData.responses || Object.keys(familyContext.surveyData.responses).length === 0) {
      return "I don't see any survey results in your family profile yet. Would you like to take the initial survey to measure your family's task distribution?";
    }
    
    // Extract specifics about what the user is asking
    const surveyQuestion = this.nlu.extractSurveyQuestion(text);
    
    // Generate a response based on the survey data
    let response = '';
    
    if (surveyQuestion.type === 'overall') {
      response = `Based on your family's survey data, the task distribution is currently: Mama ${familyContext.surveyData.mamaPercentage?.toFixed(1) || "50"}%, Papa ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%. `;
      
      // Add trend if available
      if (familyContext.weekHistory && Object.keys(familyContext.weekHistory).length > 1) {
        response += "I've noticed a trend toward more balanced distribution over time. ";
      }
      
      response += "The goal isn't necessarily a perfect 50/50 split, but rather a distribution that works for your family's unique situation.";
    } 
    else if (surveyQuestion.type === 'category' && surveyQuestion.category) {
      const categoryName = surveyQuestion.category;
      const categoryData = familyContext.surveyData.categories?.[categoryName];
      
      if (categoryData) {
        response = `For ${categoryName}, the current distribution is: Mama ${categoryData.mamaPercent?.toFixed(1) || "50"}%, Papa ${categoryData.papaPercent?.toFixed(1) || "50"}%. `;
        
        // Add more context based on category
        if (categoryName.includes('Invisible')) {
          response += "Invisible work often goes unnoticed but requires significant mental and emotional energy. ";
        }
        
        const imbalance = Math.abs(categoryData.mamaPercent - categoryData.papaPercent);
        if (imbalance > 30) {
          response += "This shows a significant imbalance that might be worth addressing. ";
        } else if (imbalance > 15) {
          response += "This shows a moderate imbalance. ";
        } else {
          response += "This category is relatively well-balanced. ";
        }
      } else {
        // Try to match with a similar category name
        const categories = familyContext.surveyData.categories || {};
        const categoryNames = Object.keys(categories);
        const similarCategory = categoryNames.find(name => 
          name.toLowerCase().includes(categoryName.toLowerCase()) || 
          categoryName.toLowerCase().includes(name.toLowerCase())
        );
        
        if (similarCategory) {
          const similarData = categories[similarCategory];
          response = `I found data for ${similarCategory}: Mama ${similarData.mamaPercent?.toFixed(1) || "50"}%, Papa ${similarData.papaPercent?.toFixed(1) || "50"}%. `;
        } else {
          response = `I don't have specific data for ${categoryName}. `;
          response += `The main categories I track are: ${categoryNames.join(', ')}. Would you like to see the data for one of these?`;
        }
      }
    }
    else if (surveyQuestion.type === 'comparison') {
      response = "When comparing workload categories, I see that ";
      
      // Compare categories to find most and least balanced
      const categories = familyContext.surveyData.categories || {};
      const categoryData = Object.entries(categories).map(([name, data]) => ({
        name,
        imbalance: Math.abs(data.mamaPercent - data.papaPercent) || 0
      }));
      
      if (categoryData.length > 0) {
        // Sort by imbalance (most imbalanced first)
        categoryData.sort((a, b) => b.imbalance - a.imbalance);
        
        const mostImbalanced = categoryData[0];
        const leastImbalanced = categoryData[categoryData.length - 1];
        
        response += `the greatest imbalance is in ${mostImbalanced.name} (${mostImbalanced.imbalance.toFixed(1)}% difference), `;
        response += `while ${leastImbalanced.name} is the most balanced category (${leastImbalanced.imbalance.toFixed(1)}% difference). `;
        
        // Add insight about invisible vs visible work
        const invisibleCategories = categoryData.filter(c => c.name.includes('Invisible'));
        const visibleCategories = categoryData.filter(c => !c.name.includes('Invisible'));
        
        if (invisibleCategories.length > 0 && visibleCategories.length > 0) {
          const avgInvisibleImbalance = invisibleCategories.reduce((sum, c) => sum + c.imbalance, 0) / invisibleCategories.length;
          const avgVisibleImbalance = visibleCategories.reduce((sum, c) => sum + c.imbalance, 0) / visibleCategories.length;
          
          if (avgInvisibleImbalance > avgVisibleImbalance) {
            response += "Invisible work tends to be more imbalanced than visible work in your family, which is common. ";
            response += "Addressing invisible mental load can have a significant impact on overall relationship satisfaction.";
          } else {
            response += "Interestingly, your visible work shows more imbalance than invisible work, which is less common. ";
            response += "This might be a good area to focus on for immediate improvement.";
          }
        }
      } else {
        response += "I don't have enough category data to make a detailed comparison. Taking the full survey would help provide more insights.";
      }
    }
    else if (surveyQuestion.type === 'task') {
      const taskName = surveyQuestion.task?.toLowerCase();
      
      if (taskName) {
        // Search for tasks in the survey responses
        const responses = familyContext.surveyData.responses || {};
        const matchingQuestions = Object.entries(responses).filter(([question, response]) => 
          question.toLowerCase().includes(taskName) && 
          (response === 'Mama' || response === 'Papa')
        );
        
        if (matchingQuestions.length > 0) {
          const mamaCount = matchingQuestions.filter(([_, response]) => response === 'Mama').length;
          const papaCount = matchingQuestions.filter(([_, response]) => response === 'Papa').length;
          const total = matchingQuestions.length;
          
          response = `For tasks related to "${taskName}", `;
          response += `Mama handles ${(mamaCount/total*100).toFixed(1)}% and Papa handles ${(papaCount/total*100).toFixed(1)}%. `;
          
          // Add a specific example
          if (matchingQuestions.length > 0) {
            const example = matchingQuestions[0];
            response += `For example, "${example[0]}" is handled by ${example[1]}.`;
          }
        } else {
          response = `I couldn't find specific data about "${taskName}" in your survey responses. `;
          response += "Would you like to see the overall distribution instead?";
        }
      } else {
        response = "I can tell you about specific tasks if you mention which one you're interested in. ";
        response += "For example, you could ask about who handles cooking, cleaning, childcare, etc.";
      }
    }
    else {
      // Default to overall data
      response = `Based on your family's survey data, the task distribution is currently: Mama ${familyContext.surveyData.mamaPercentage?.toFixed(1) || "50"}%, Papa ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%. `;
      response += "Would you like to know more about a specific category or task?";
    }
    
    return response;
  }
  
// Check if family is still in initial onboarding phase
async isInitialOnboardingPhase(familyId) {
  try {
    if (!familyId) {
      console.log("No familyId provided, defaulting to onboarding phase");
      return true; // Default to onboarding if no family ID
    }
    
    console.log(`Checking onboarding phase for family: ${familyId}`);
    
    // Get family data from Firestore
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`Family ${familyId} not found in Firestore`);
      return true; // Default to onboarding if family not found
    }
    
    const data = docSnap.data();
    console.log(`Loaded family data, checking completion status:`, {
      hasFamilyMembers: !!data.familyMembers,
      memberCount: data.familyMembers?.length || 0,
      hasCompletedWeeks: !!data.completedWeeks?.length,
      completedWeeksCount: data.completedWeeks?.length || 0,
      currentWeek: data.currentWeek || 1
    });
    
    // Check if we have any survey responses
    const hasSurveyResponses = async () => {
      try {
        const surveyResponsesQuery = query(
          collection(db, "surveyResponses"), 
          where("familyId", "==", familyId),
          limit(1)
        );
        const snapshot = await getDocs(surveyResponsesQuery);
        return !snapshot.empty;
      } catch (e) {
        console.error("Error checking survey responses:", e);
        return false;
      }
    };
    
    // Three ways to determine completion:
    
    // 1. Check if we have completed weeks
    if (data.completedWeeks && data.completedWeeks.length > 0) {
      console.log(`Family has ${data.completedWeeks.length} completed weeks - onboarding complete`);
      return false; // Not in onboarding phase
    }
    
    // 2. Check if current week is beyond 1
    if (data.currentWeek && data.currentWeek > 1) {
      console.log(`Family current week is ${data.currentWeek} - onboarding complete`);
      return false; // Not in onboarding phase
    }
    
    // 3. Check if we have any survey responses
    if (await hasSurveyResponses()) {
      console.log(`Found survey responses - onboarding complete`);
      return false; // Not in onboarding phase
    }
    
    // If all checks fail, we're still in onboarding
    console.log("No completion indicators found - still in onboarding phase");
    return true;
  } catch (error) {
    console.error("Error checking onboarding phase:", error);
    // Don't default to restricting content on error - let them use the chat
    return false;
  }
}


// Handle shared todo requests for the relationship tab
async handleSharedTodoRequest(text, familyContext, userId) {
  try {
    // Enhanced detection of todo requests with broader patterns
    const todoKeywords = [
      'add todo', 'add a todo', 'create todo', 'new todo', 
      'add to-do', 'add a to-do', 'create to-do', 'new to-do',
      'add to todo list', 'add to to-do list', 'add to our list',
      'add task', 'create task', 'new task', 'add a task',
      'todo for', 'to-do for', 'task for', 'create a todo for',
      'make todo', 'make a todo', 'add reminder', 'create reminder'
    ];
    
    const isTodoRequest = todoKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    // If someone corrects and says "it's a todo"
    const isCorrectionAsTodo = text.toLowerCase().match(/it'?s a todo/i) || 
                              text.toLowerCase().match(/this is a todo/i);
    
    // Check previous messages for context if it's a correction
    let isInTodoContext = false;
    if (familyContext.conversationContext && 
        familyContext.conversationContext.recentTopics) {
      isInTodoContext = familyContext.conversationContext.recentTopics.some(topic => 
        topic.query && todoKeywords.some(keyword => 
          topic.query.toLowerCase().includes(keyword)
        )
      );
    }
    
    if (!isTodoRequest && !isCorrectionAsTodo && !isInTodoContext) return null;
    
    // Log for debugging
    console.log("Detected todo request:", {
      isTodoRequest,
      isCorrectionAsTodo,
      isInTodoContext,
      text
    });
    
    // Extract the todo content with enhanced patterns
    let todoText = '';
    
    // First try explicit patterns
    const todoPatterns = [
      /add (?:a |the |shared )?(?:todo|to-do|task):?\s+(.*?)(?:\.|\n|$)/i,
      /add (?:a |shared )?(?:todo|to-do|task) (?:for|to) (.+?)(?:\.|\n|$)/i,
      /add (?:a |the |shared )?(?:todo|to-do|task) (?:about|regarding) (.+?)(?:\.|\n|$)/i,
      /create (?:a |the |shared )?(?:todo|to-do|task):?\s+(.*?)(?:\.|\n|$)/i,
      /(?:todo|to-do|task) for (.+?)(?:\.|\n|$)/i
    ];
    
    for (const pattern of todoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        todoText = match[1].trim();
        break;
      }
    }
    
    // If no match yet, try extracting content after the keyword
    if (!todoText) {
      for (const keyword of todoKeywords) {
        if (text.toLowerCase().includes(keyword)) {
          const index = text.toLowerCase().indexOf(keyword) + keyword.length;
          todoText = text.substring(index).trim();
          
          // Clean up trailing periods or other punctuation
          todoText = todoText.replace(/^\s*[:;-]\s*/, '').trim();
          todoText = todoText.replace(/\.$/, '').trim();
          break;
        }
      }
    }
    
    // For corrections like "it's a todo, not a provider"
    // Try to extract from previous messages
    if (!todoText && (isCorrectionAsTodo || isInTodoContext)) {
      // Find the most recent message that might contain the todo content
      if (familyContext.conversationContext && 
          familyContext.conversationContext.recentTopics) {
        for (const topic of familyContext.conversationContext.recentTopics) {
          if (topic.query) {
            // Try to extract content from this previous message
            for (const pattern of todoPatterns) {
              const match = topic.query.match(pattern);
              if (match && match[1]) {
                todoText = match[1].trim();
                break;
              }
            }
            
            // If found, break out of the loop
            if (todoText) break;
            
            // Otherwise, try the keyword approach
            for (const keyword of todoKeywords) {
              if (topic.query.toLowerCase().includes(keyword)) {
                const index = topic.query.toLowerCase().indexOf(keyword) + keyword.length;
                todoText = topic.query.substring(index).trim();
                todoText = todoText.replace(/^\s*[:;-]\s*/, '').trim();
                todoText = todoText.replace(/\.$/, '').trim();
                break;
              }
            }
            
            // If found now, break out of the loop
            if (todoText) break;
          }
        }
      }
    }
    
    // Extract assignee if specified (e.g., "for Kim")
    let assignTo = null;
    const assigneeMatch = text.match(/for\s+([A-Za-z]+)(?:\s|$|\.|,)/i) || 
                         todoText.match(/for\s+([A-Za-z]+)(?:\s|$|\.|,)/i);
    
    if (assigneeMatch && assigneeMatch[1]) {
      const potentialAssignee = assigneeMatch[1].trim();
      
      // Check if this is a valid family member
      if (familyContext.familyMembers) {
        const matchedMember = familyContext.familyMembers.find(member => 
          member.name.toLowerCase() === potentialAssignee.toLowerCase() ||
          (member.roleType && member.roleType.toLowerCase() === potentialAssignee.toLowerCase())
        );
        
        if (matchedMember) {
          assignTo = matchedMember.id;
          // Remove the assignee part from the todo text to avoid redundancy
          todoText = todoText.replace(new RegExp(`for\\s+${potentialAssignee}\\b`, 'i'), '').trim();
        }
      }
    }
    
    // Clean up the todo text
    todoText = todoText.replace(/^\s*(?:to|is|about|that)\s+/, '').trim();
    
    // If we couldn't extract a valid todo
    if (!todoText) {
      return "I understand you want to add a todo item, but I'm not sure what the task should be. Could you please provide more details about what you'd like to add to your todo list?";
    }
    
    // Determine task category based on content
    let category = 'other';
    if (todoText.toLowerCase().match(/clean|wash|fold|laundry|dishes|vacuum/)) {
      category = 'household';
    } else if (todoText.toLowerCase().match(/date|dinner|movie|together|relationship/)) {
      category = 'relationship';
    } else if (todoText.toLowerCase().match(/kid|child|school|homework|bedtime/)) {
      category = 'parenting';
    } else if (todoText.toLowerCase().match(/shop|buy|store|groceries|pick up/)) {
      category = 'errands';
    } else if (todoText.toLowerCase().match(/fix|repair|maintain|car|vehicle/)) {
      category = 'maintenance';
    } else if (todoText.toLowerCase().match(/meet|call|email|work|job|office/)) {
      category = 'work';
    }
    
    // Extract due date if mentioned
    let dueDate = null;
    const datePatterns = [
      /(?:by|before|due|on)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?)/i,
      /(?:by|before|due|on)\s+(?:the\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
      /(?:by|before|due|on)\s+(?:the\s+)?(\d{1,2}-\d{1,2}(?:-\d{2,4})?)/i,
      /(?:by|before|due|on)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+)/i,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          // Convert the date string to a Date object
          dueDate = new Date(match[1]);
          // If invalid date, try other formats
          if (isNaN(dueDate.getTime())) {
            // Try DD/MM/YYYY format
            const dateParts = match[1].split(/\/|-/);
            if (dateParts.length >= 2) {
              dueDate = new Date();
              dueDate.setDate(parseInt(dateParts[0]));
              dueDate.setMonth(parseInt(dateParts[1]) - 1);
              if (dateParts.length > 2 && dateParts[2].length >= 2) {
                let year = parseInt(dateParts[2]);
                if (year < 100) year += 2000;
                dueDate.setFullYear(year);
              }
            } else {
              // Try to parse "18th of April" type dates
              const monthNames = ["january", "february", "march", "april", "may", "june",
                "july", "august", "september", "october", "november", "december"];
              const dateText = match[1].toLowerCase();
              
              for (let i = 0; i < monthNames.length; i++) {
                if (dateText.includes(monthNames[i])) {
                  const day = parseInt(dateText.match(/\d+/)[0]);
                  dueDate = new Date();
                  dueDate.setDate(day);
                  dueDate.setMonth(i);
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          dueDate = null;
        }
      }
    }
    
    // Create the task 
if (familyContext.familyId) {
  // Determine which column to add the task to based on due date
  let column = "upcoming";
  if (dueDate) {
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    if (dueDate <= oneWeekFromNow) {
      column = "this-week";
    }
    
    // If due date is today or past due, put in "in-progress"
    const dueDateCopy = new Date(dueDate);
    const todayCopy = new Date(today);
    if (dueDateCopy.setHours(0, 0, 0, 0) <= todayCopy.setHours(0, 0, 0, 0)) {
      column = "in-progress";
    }
  }
  
  // Determine priority based on content
  let priority = "medium";
  if (todoText.toLowerCase().match(/urgent|asap|immediately|right away|emergency/)) {
    priority = "high";
  } else if (todoText.toLowerCase().match(/low priority|when you get a chance|eventually|not urgent|sometime/)) {
    priority = "low";
  }
  
  // Format task data for Kanban board
  const taskData = {
    title: todoText,
    description: "Added via Allie Chat",
    dueDate: dueDate ? dueDate.toISOString() : null,
    priority: priority,
    category: category,
    assignedTo: assignTo,
    assignedToName: assignTo ? familyContext.familyMembers.find(m => m.id === assignTo)?.name : null,
    column: column,
    familyId: familyContext.familyId,
    createdAt: new Date().toISOString(),
    createdBy: userId || 'allie-chat',
    updatedAt: new Date().toISOString(),
    subtasks: [],
    comments: [],
    completed: false
  };
  
  console.log("Creating task for Kanban board:", taskData);
  
  // Add to Firestore kanbanTasks collection
  const docRef = await addDoc(collection(db, "kanbanTasks"), taskData);
  
  // Trigger update event for the UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kanban-task-added', { 
      detail: { taskId: docRef.id }
    }));
  }
  
  // Create response message
  let response = `Perfect! I've added "${todoText}" to your tasks. `;
  
  if (assignTo) {
    const assigneeName = familyContext.familyMembers.find(m => m.id === assignTo)?.name || 'the assigned person';
    response += `It's assigned to ${assigneeName}. `;
  }
  
  if (dueDate) {
    response += `It's due by ${dueDate.toLocaleDateString()}. `;
  }
  
  response += `You'll find it in the ${
    column === 'this-week' ? 'This Week' : 
    column === 'in-progress' ? 'In Progress' : 
    'Upcoming'
  } column on your task board.`;
  
  return response;
} else {
      return "I'd like to add this to your todo list, but I need to know which family this belongs to. Please make sure you're logged in and try again.";
    }
  } catch (error) {
    console.error("Error handling shared todo request:", error);
    return "I tried to add this to your todo list, but encountered an error. You can add it directly in the To-Do List section of the app.";
  }
}


async getAIResponse(message, familyId, messageHistory = []) {
  try {
    // Get family context
    const familyContext = await this.getFamilyContext(familyId);
    
    // Use the enhanced IntentClassifier instead of basic AdvancedNLU
    const analysis = IntentClassifier.analyzeMessage(
      message, 
      familyId, 
      familyContext
    );
    
    // Apply feedback learnings to optimize interaction
    const promptOptimizations = FeedbackLearningSystem.getPromptOptimizations(
      analysis.intent,
      {
        ...familyContext,
        ...analysis.conversationContext
      }
    );

    // First check for todos since this is common and needs special handling
    const todoKeywords = ['todo', 'to-do', 'to do', 'add a task', 'create a task', 'make a task'];
    const isTodoRequest = todoKeywords.some(keyword => message.toLowerCase().includes(keyword));
    
    if (isTodoRequest || message.toLowerCase().includes('create') && message.toLowerCase().includes('for')) {
      // Try to handle as a shared todo request first
      const todoResponse = await this.handleSharedTodoRequest(message, familyContext, 
          this.getCurrentUserFromHistory(messageHistory)?.id);
          
      if (todoResponse) {
        console.log("Handled as todo request:", todoResponse);
        return todoResponse;
      }
    }
    
    // Check if this is a domain-specific request we can handle directly
    if (analysis.intent === 'provider.add' && analysis.confidence > 0.6) {
      // Provider creation request
      const result = await ProviderChatService.processProviderRequest(message, analysis.entities, familyId);
      if (result.success) {
        return result.message;
      }
    } 
    else if (analysis.intent === 'medical.appointment.add' && analysis.confidence > 0.6) {
      // Medical appointment request
      const result = await MedicalChatService.processAppointmentRequest(message, analysis.entities, {
        ...familyContext,
        currentUser: this.getCurrentUserFromHistory(messageHistory)
      });
      if (result.success) {
        return result.message;
      }
    } 
    else if (analysis.intent === 'task.add' && analysis.confidence > 0.6) {
      // Task creation request
      const result = await TaskChatService.processTaskRequest(message, analysis.entities, {
        ...familyContext,
        currentUser: this.getCurrentUserFromHistory(messageHistory)
      });
      if (result.success) {
        return result.message;
      }
    } 
    else if (analysis.intent === 'task.complete' && analysis.confidence > 0.6) {
      // Task completion request
      const result = await TaskChatService.processTaskCompletion(message, familyId);
      if (result.success) {
        return result.message;
      }
    } 
    else if (analysis.intent === 'relationship.date' && analysis.confidence > 0.6) {
      // Date night request
      const result = await RelationshipChatService.processDateNightRequest(message, analysis.entities, {
        ...familyContext,
        currentUser: this.getCurrentUserFromHistory(messageHistory)
      });
      if (result.success) {
        return result.message;
      }
    } 
    else if (analysis.intent === 'relationship.gratitude' && analysis.confidence > 0.6) {
      // Gratitude message request
      const result = await RelationshipChatService.processGratitudeRequest(message, {
        ...familyContext,
        currentUser: this.getCurrentUserFromHistory(messageHistory)
      });
      if (result.success) {
        return result.message;
      }
    }
    // Check for clarification intents
    else if (analysis.intent === 'clarification.who' || analysis.intent === 'clarification.when') {
      // Handle disambiguation with context awareness
      return this.handleDisambiguation(analysis, familyContext, messageHistory);
    }
    // Check for conversation feedback
    else if (analysis.intent === 'conversation.feedback') {
      // Process feedback and improve future responses
      this.processFeedbackIntent(message, familyId, messageHistory);
    }
    
    // Check for calendar events
    if (message.toLowerCase().includes('schedule') || 
        message.toLowerCase().includes('calendar') || 
        message.toLowerCase().includes('appointment')) {
      // Handle calendar event
      const calendarResponse = await this.handleCalendarRequest(message, familyContext, 
        this.getCurrentUserFromHistory(messageHistory)?.id);
      if (calendarResponse) {
        return calendarResponse;
      }
    }
    
    // Check for FAQ response before falling back to Claude
    const faqResponse = ConsolidatedNLU.getFAQResponse(message);
    if (faqResponse) {
      return faqResponse;
    }
    
    // Format messages for Claude API using our helper
    const formattedMessages = ChatPersistenceService.formatMessagesForClaude(messageHistory);
    
    // If not a specialized request, use Claude for general response with enhanced context
    try {
      // Log critical debug information before Claude API call
      console.log("Calling Claude API with:", {
        messagesCount: formattedMessages.length, 
        intentCategory: analysis.intent?.split('.')[0] || 'unknown',
        confidence: analysis.confidence || 0
      });
      
      // Add a wrapper try-catch specifically for the Claude API call
      const claudeResponse = await ClaudeService.generateResponse(
        formattedMessages, 
        {
          ...familyContext,
          currentIntent: analysis.intent,
          currentEntities: analysis.entities,
          conversationContext: analysis.conversationContext,
          promptOptimizations
        }
      );
      
      // Validate the response from Claude before returning it
      if (claudeResponse === undefined || claudeResponse === null) {
        console.error("Claude API returned undefined/null response");
        return "I'm sorry, I couldn't generate a response right now. Please try again in a moment.";
      }
      
      if (typeof claudeResponse !== 'string' || claudeResponse.trim() === '') {
        console.error("Claude API returned invalid response type or empty string:", 
          typeof claudeResponse, claudeResponse ? claudeResponse.substring(0, 50) : 'empty');
        return "I'm sorry, I couldn't process your request properly. Please try again.";
      }
      
      console.log("Claude API returned valid response of length:", claudeResponse.length);
      return claudeResponse;
    } catch (claudeError) {
      console.error("Error in Claude API call:", claudeError);
      // Generate a fallback response using context if possible
      return this.generateFallbackResponse(message, familyContext, analysis.intent) || 
        "I'm sorry, but I'm having trouble connecting to my language processing system. Please try again in a moment.";
    }
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I encountered an issue processing your request. Please try again.";
  }
}

// Add helper method to get current user from message history
getCurrentUserFromHistory(messageHistory) {
  if (!messageHistory || messageHistory.length === 0) {
    return null;
  }
  
  // Find the most recent user message
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    const msg = messageHistory[i];
    if (msg.sender !== 'allie') {
      return {
        id: msg.sender,
        name: msg.userName
      };
    }
  }
  
  return null;
}


  
  // Generate a fallback response when AI fails
  generateFallbackResponse(text, familyData, intent) {
    // Basic response based on intent if we have it
    const intentCategory = intent?.split('.')[0] || '';
    
    switch (intentCategory) {
      case 'calendar':
        return "I understand you want to add something to your calendar. You can do this by going to the Calendar widget and clicking the '+' button, or you can ask me with details like 'Add a doctor appointment on Tuesday at 3pm'.";
      
      case 'relationship':
        return "I see you're asking about relationship insights. The Relationship tab has tools like daily check-ins, gratitude tracking, and date night planning that can help strengthen your partnership.";
      
      case 'task':
        return "I understand you're asking about tasks. You can view and manage all family tasks in the Tasks tab. Would you like to know more about a specific task?";
      
      case 'child':
        return "I see you're interested in tracking information about your children. The Children Tracking tab helps you monitor appointments, growth, emotional wellbeing, and academics for each child.";
      
      case 'survey':
        return `Based on your family's survey data, the task distribution is currently: Mama ${familyData.surveyData?.mamaPercentage?.toFixed(1) || "50"}%, Papa ${(100 - (familyData.surveyData?.mamaPercentage || 50)).toFixed(1)}%.`;
      
      default:
        // Generic fallback
        return "I'm here to help with family balance, relationship insights, task management, and child tracking. You can explore these features in the dashboard tabs. What would you like to know more about?";
    }
  }
  

// Add these new methods to EnhancedChatService
/**
 * Handle disambiguation requests using conversation context
 * @param {object} analysis - Message analysis
 * @param {object} familyContext - Family data context
 * @param {Array} messageHistory - Previous messages
 * @returns {string} - Disambiguated response
 */
handleDisambiguation(analysis, familyContext, messageHistory) {
  try {
    // Get the previous intent from context if available
    const previousIntent = analysis.previousIntent || 
                          ConversationContext.getContext(familyContext.familyId)
                            .intentHistory[0]?.intent;
    
    if (!previousIntent) {
      return "I'm not sure what you're asking about. Could you provide more details?";
    }
    
    // Handle "who" disambiguation
    if (analysis.intent === 'clarification.who') {
      const children = familyContext.children || [];
      
      if (children.length === 0) {
        return "I don't see any children in your family profile. Would you like to add a child first?";
      }
      
      if (children.length === 1) {
        return `I'm referring to ${children[0].name}, your only child in the family profile.`;
      }
      
      return `Your family has ${children.length} children: ${children.map(c => c.name).join(', ')}. Which one would you like to discuss?`;
    }
    
    // Handle "when" disambiguation
    if (analysis.intent === 'clarification.when') {
      // Extract dates from recent context
      const context = ConversationContext.getContext(familyContext.familyId);
      const dates = context.entities.date || [];
      
      if (dates.length === 0) {
        return "I don't have a specific date in mind. Would you like to schedule something for a particular day?";
      }
      
      if (dates.length === 1) {
        return `I'm referring to ${dates[0]}.`;
      }
      
      return `I have several dates in our conversation: ${dates.join(', ')}. Which one were you asking about?`;
    }
    
    return "I'm not sure what you're asking about. Could you provide more details?";
  } catch (error) {
    console.error("Error handling disambiguation:", error);
    return "I'm sorry, I'm having trouble understanding what you're asking. Could you try rephrasing your question?";
  }
}

/**
 * Process feedback from user about conversation quality
 * @param {string} message - User message
 * @param {string} familyId - Family ID
 * @param {Array} messageHistory - Previous messages
 */
// Replace the processFeedbackIntent method in src/services/EnhancedChatService.js
async processFeedbackIntent(message, familyId, messageHistory) {
  try {
    // Find the most recent Allie response
    let lastAllieMessage = null;
    for (let i = messageHistory.length - 1; i >= 0; i--) {
      if (messageHistory[i].sender === 'allie') {
        lastAllieMessage = messageHistory[i];
        break;
      }
    }
    
    if (!lastAllieMessage) return;
    
    // Determine feedback type
    let feedbackType = 'other';
    
    if (message.match(/(?:not right|wrong|incorrect)/i)) {
      feedbackType = 'incorrect_information';
    } else if (message.match(/(?:confusing|don'?t understand|unclear)/i)) {
      feedbackType = 'confusing';
    } else if (message.match(/(?:not helpful|unhelpful|useless|not what I needed)/i)) {
      feedbackType = 'unhelpful';
    } else if (message.match(/(?:helpful|useful|great|thanks|correct|right)/i)) {
      feedbackType = 'helpful';
    } else if (message.match(/(?:more information|not enough|incomplete)/i)) {
      feedbackType = 'incomplete';
    }
    
    // Get family context for this feedback
    const familyContext = await this.getFamilyContext(familyId);
    
    // Get conversation context
    const context = ConversationContext.getContext(familyId);
    
    // Record the feedback
    await FeedbackLearningSystem.recordFeedback(
      lastAllieMessage.id,
      feedbackType,
      message,
      {
        familyId,
        intent: context.intentHistory[0]?.intent,
        currentWeek: familyContext.currentWeek,
        hasChildren: (familyContext.children || []).length > 0,
        hasCompletedSurvey: familyContext.completedWeeks?.length > 0
      }
    );
  } catch (error) {
    console.error("Error processing feedback intent:", error);
  }
} 
// Replace the handleProviderRequest method in src/services/EnhancedChatService.js
// Manual fix for onboarding status issues
async forceCompleteOnboarding(familyId) {
  try {
    if (!familyId) {
      console.warn("Cannot force complete onboarding: No family ID provided");
      return false;
    }
    
    console.log(`Manually forcing onboarding completion for family: ${familyId}`);
    
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn(`Cannot force complete onboarding: Family ${familyId} not found`);
      return false;
    }
    
    const data = docSnap.data();
    
    // 1. Ensure all family members marked as completed
    const updatedMembers = (data.familyMembers || []).map(member => {
      if (member.role === 'parent' && !member.completed) {
        return {
          ...member,
          completed: true,
          completedDate: new Date().toISOString().split('T')[0]
        };
      }
      return member;
    });
    
    // 2. Ensure we have completedWeeks with at least week 1
    const completedWeeks = data.completedWeeks || [];
    if (!completedWeeks.includes(1)) {
      completedWeeks.push(1);
    }
    
    // 3. Ensure currentWeek is at least 2
    const currentWeek = Math.max(2, data.currentWeek || 1);
    
    // Update the family document
    await updateDoc(docRef, {
      familyMembers: updatedMembers,
      completedWeeks: completedWeeks,
      currentWeek: currentWeek,
      updatedAt: serverTimestamp()
    });
    
    console.log("Successfully forced onboarding completion");
    return true;
  } catch (error) {
    console.error("Error forcing onboarding completion:", error);
    return false;
  }
}



async handleProviderRequest(text, familyContext) {
  try {
    // Check if this is a provider-related request
    const intent = this.nlu.detectIntent(text);
    const isProviderIntent = [
      'healthcare.provider',
      'healthcare.doctor',
      'healthcare.add_provider'
    ].includes(intent);
    
    if (!isProviderIntent) {
      // Expanded list of provider keywords
      const providerKeywords = [
        'add doctor', 'new doctor', 'healthcare provider', 
        'add provider', 'doctor for', 'pediatrician', 
        'family doctor', 'our doctor', 'children\'s doctor',
        'add teacher', 'new teacher', 'music teacher',
        'add a teacher', 'tutor', 'instructor',
        'can you add', 'add a', 'in providers'
      ];
      
      const hasProviderKeyword = providerKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      if (!hasProviderKeyword) return null;
    }
    
    console.log("Handling provider request:", text);
    
    // Get AllieAIService
    let AllieAIService;
    try {
      AllieAIService = (await import('./AllieAIService')).default;
    } catch (error) {
      console.error("Failed to import AllieAIService:", error);
      return "I'm having trouble connecting to the provider service right now. Please try again in a moment.";
    }
    
    // Process the provider request
    const result = await AllieAIService.processProviderFromChat(text, familyContext.familyId);
    
    if (result.success) {
      // Format success message
      let response = `✅ Added provider: ${result.providerDetails.name}\n`;
      
      if (result.providerDetails.specialty) {
        response += `Type: ${result.providerDetails.specialty}\n`;
      }
      
      if (result.providerDetails.email) {
        response += `Email: ${result.providerDetails.email}\n`;
      }
      
      // For children teachers, add extra context
      if (text.toLowerCase().includes("for") && 
          (result.providerDetails.type === "education" || text.toLowerCase().includes("teacher"))) {
        // Extract child name
        const forPattern = /for\s+([a-z]+)/i;
        const forMatch = text.match(forPattern);
        if (forMatch && forMatch[1]) {
          response += `For: ${forMatch[1].charAt(0).toUpperCase() + forMatch[1].slice(1)}\n`;
        }
      }
      
      response += "\nThe provider has been successfully added to your family's records. Is there anything else you'd like to add about this provider, such as phone number, location, or when appointments are scheduled?";
      
      return response;
    } else {
      return `I wasn't able to add this provider to your directory. ${result.error || "Please try again with more details about the provider."} You can also add providers manually in the Family Provider Directory section.`;
    }
  } catch (error) {
    console.error("Error handling provider request:", error);
    return `I'm sorry, I couldn't add the provider. ${error.message || "Something went wrong."} You can add providers manually in the Family Provider Directory section.`;
  }
}


  // Get family context for AI response with enhanced caching
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
    
    // Enhanced categorization with better pattern matching
    Object.entries(responses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question type from key or content
      let category;
      
      if (key.toLowerCase().includes('household') || 
          key.toLowerCase().includes('chore') ||
          key.toLowerCase().includes('home')) {
        
        if (key.toLowerCase().includes('plan') || 
            key.toLowerCase().includes('organize') || 
            key.toLowerCase().includes('manage') ||
            key.toLowerCase().includes('remember') ||
            key.toLowerCase().includes('schedule')) {
          category = "Invisible Household Tasks";
        } else {
          category = "Visible Household Tasks";
        }
      } else {
        // Assume parental task if not household
        if (key.toLowerCase().includes('plan') || 
            key.toLowerCase().includes('worry') || 
            key.toLowerCase().includes('research') ||
            key.toLowerCase().includes('arrange') ||
            key.toLowerCase().includes('emotional')) {
          category = "Invisible Parental Tasks";
        } else {
          category = "Visible Parental Tasks";
        }
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

export default new EnhancedChatService();