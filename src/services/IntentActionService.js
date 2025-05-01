// src/services/IntentActionService.js
import ClaudeService from './ClaudeService';
import { createSuccessResult, createErrorResult } from '../utils/ActionResultBuilder';
import { ActionTypes } from '../utils/ActionTypes';
import ConversationContext from './ConversationContext';
import ActionLearningSystem from './ActionLearningSystem';


/**
 * Intent Action Service
 * Unified service to orchestrate actions across the app based on user intent
 */
class IntentActionService {
  constructor() {
    // Define supported actions and their handlers
    this.actionHandlers = {
      [ActionTypes.ADD_PROVIDER]: this.handleAddProvider,
      [ActionTypes.UPDATE_PROVIDER]: this.handleUpdateProvider,
      [ActionTypes.DELETE_PROVIDER]: this.handleDeleteProvider,
      
      [ActionTypes.ADD_EVENT]: this.handleAddEvent,
      [ActionTypes.ADD_APPOINTMENT]: this.handleAddAppointment,
      [ActionTypes.UPDATE_EVENT]: this.handleUpdateEvent,
      [ActionTypes.DELETE_EVENT]: this.handleDeleteEvent,
      
      [ActionTypes.ADD_TASK]: this.handleAddTask,
      [ActionTypes.COMPLETE_TASK]: this.handleCompleteTask,
      [ActionTypes.REASSIGN_TASK]: this.handleReassignTask,
      
      [ActionTypes.TRACK_GROWTH]: this.handleTrackGrowth,
      [ActionTypes.ADD_MEDICAL_RECORD]: this.handleAddMedicalRecord,
      [ActionTypes.ADD_MILESTONE]: this.handleAddMilestone,
      
      [ActionTypes.ADD_DOCUMENT]: this.handleAddDocument,
      
      [ActionTypes.SCHEDULE_DATE_NIGHT]: this.handleScheduleDateNight,
      
      [ActionTypes.QUERY_CALENDAR]: this.handleQueryCalendar,
      [ActionTypes.QUERY_TASKS]: this.handleQueryTasks,
      [ActionTypes.QUERY_PROVIDERS]: this.handleQueryProviders
    };
      
    // In the constructor, replace this.intentMapping with:
this.intentMapping = {
    // This is now just used as a fallback if AI classification fails
    'add provider': ActionTypes.ADD_PROVIDER,
    'add event': ActionTypes.ADD_EVENT,
    'add task': ActionTypes.ADD_TASK,
    'track growth': ActionTypes.TRACK_GROWTH,
    'add document': ActionTypes.ADD_DOCUMENT,
    'query calendar': ActionTypes.QUERY_CALENDAR,
    'query tasks': ActionTypes.QUERY_TASKS,
    'query providers': ActionTypes.QUERY_PROVIDERS
  };
    
    // For tracking statistics
this.stats = {
    totalRequests: 0,
    successfulActions: 0,
    failedActions: 0,
    actionTypeCount: {}
  };
  
  this.claudeService = null;
  this.setClaudeService(ClaudeService);

  }

  /**
 * Process a user request from chat
 * @param {string} message - User message
 * @param {string} familyId - Family ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result of the action
 */
// Find the processUserRequest method in IntentActionService.js and replace it with this

async processUserRequest(message, familyId, userId) {
    try {
      console.log("Processing user request:", message);
      this.stats.totalRequests++;
      
      // Basic validation
      if (!message) {
        return createErrorResult("I need more information to process your request.");
      }
      
      // Step 1: Identify the intent using AI classification
      const intent = await this.identifyIntent(message);
      console.log("Identified intent:", intent);
      
      if (!intent) {
        // No intent identified - try direct Firebase operation based on content analysis
        try {
          const result = await this.tryDirectAction(message, familyId, userId);
          if (result && result.success) {
            return result;
          }
        } catch (directError) {
          console.warn("Direct action attempt failed:", directError);
        }
        
        return createErrorResult("I'm not sure what you'd like me to do. Could you please be more specific?");
      }
      
      // Track statistics
      this.stats.actionTypeCount[intent] = (this.stats.actionTypeCount[intent] || 0) + 1;
      
      // Step 2: Get the appropriate handler
      const handler = this.actionHandlers[intent];
      
      if (!handler) {
        return createErrorResult("I understand what you want to do, but I don't yet have the capability to handle that action. We're continuously improving!");
      }
      
      // Step 3: Execute the action
      const result = await handler.call(this, message, familyId, userId);
      
      // Track outcome
      if (result.success) {
        this.stats.successfulActions++;
      } else {
        this.stats.failedActions++;
      }
      
      // Record for learning
      await ActionLearningSystem.recordAction(
        intent,   
        message,   
        result.success,   
        {   
          error: result.error || null,
          entityCount: Object.keys(result.data || {}).length  
        }
      );
      
      return result;
      
    } catch (error) {
      console.error("Error processing user request:", error);
      this.stats.failedActions++;
      
      return createErrorResult("I encountered an error while processing your request. Please try again or provide more details.", error.message);
    }
  }
  
  // Add this new method to try direct action as a fallback
  async tryDirectAction(message, familyId, userId) {
    // Quick content analysis for common actions
    const lowerMessage = message.toLowerCase();
    
    // Check for provider patterns
    if (lowerMessage.includes('add') && 
        (lowerMessage.includes('doctor') || lowerMessage.includes('provider'))) {
      return this.handleAddProvider(message, familyId, userId);
    }
    
    // Check for appointment patterns
    if ((lowerMessage.includes('add') || lowerMessage.includes('schedule')) && 
        (lowerMessage.includes('appointment') || lowerMessage.includes('checkup'))) {
      return this.handleAddAppointment(message, familyId, userId);
    }
    
    // Check for growth tracking patterns
    if ((lowerMessage.includes('record') || lowerMessage.includes('track')) && 
        (lowerMessage.includes('height') || lowerMessage.includes('weight'))) {
      return this.handleTrackGrowth(message, familyId, userId);
    }
    
    // Check for task patterns
    if ((lowerMessage.includes('add') || lowerMessage.includes('create')) && 
        (lowerMessage.includes('task') || lowerMessage.includes('todo'))) {
      return this.handleAddTask(message, familyId, userId);
    }
    
    // No direct matches found
    return null;
  }
  
  /**
 * Identify the intent from the user message
 * @param {string} message - User message
 * @returns {Promise<string>} Intent identifier
 */
async identifyIntent(message) {
    try {
      console.log("Using Claude for intent classification");
      
      const systemPrompt = `You are an intent classifier for Allie, a family management assistant.
      Determine what action the user wants to perform from their message.
      
      Return ONE of the following intent labels without explanation:
      - add_provider (for adding healthcare providers, teachers, coaches)
      - add_event (for adding events to calendar)
      - add_appointment (for medical/dental appointments)
      - add_task (for creating tasks or todos)
      - track_growth (for recording children's measurements)
      - add_document (for uploading or storing documents)
      - add_medical_record (for medical records)
      - add_milestone (for child development milestones)
      - complete_task (for marking tasks as complete)
      - reassign_task (for reassigning tasks to other family members)
      - update_event (for modifying existing events)
      - delete_event (for removing events)
      - schedule_date_night (for couple activities)
      - query_calendar (for calendar questions)
      - query_tasks (for task-related questions)
      - query_providers (for provider directory questions)
      - unknown (if none of the above)
      
      Return ONLY the intent label, nothing else.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Classify this request: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Clean and extract the intent
      const rawIntent = response.trim().toLowerCase();
      const intent = rawIntent.replace(/[^a-z_]/g, ''); // Remove any unexpected characters
      
      console.log(`Claude classified intent as: ${intent}`);
      
      return this.actionHandlers[intent] ? intent : null;
    } catch (error) {
      console.error("Error identifying intent with Claude:", error);
      return null;
    }
  }
  
  /**
   * Get family context for action handlers
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Family context data
   */
  async getFamilyContext(familyId) {
    try {
      // Import dynamic to avoid circular dependencies
      const { default: EnhancedChatService } = await import('./EnhancedChatService');
      
      // Use existing method from EnhancedChatService
      return await EnhancedChatService.getFamilyContext(familyId);
    } catch (error) {
      console.error("Error getting family context in IntentActionService:", error);
      return {}; // Return empty context on error
    }
  }

  /**
   * Handle adding a provider
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding provider
   */
  // Find the handleAddProvider method in IntentActionService.js and replace it with this

async handleAddProvider(message, familyId, userId) {
    try {
      console.log("Handling add provider request:", message);
      
      if (!familyId) {
        console.error("No family ID provided to handleAddProvider");
        return createErrorResult("I need to know which family this provider belongs to.");
      }
      
      // Set context flag to avoid calendar detection interference
      if (this.claudeService) {
        this.claudeService.disableCalendarDetection = true;
      }
      
      // Extract provider details using AI
      const providerDetails = await ClaudeService.extractEntityWithAI(message, 'provider');
      
      if (!providerDetails || !providerDetails.name) {
        return createErrorResult("I couldn't identify the provider details. Could you please be more specific?");
      }
      
      // CRITICAL FIX: DIRECT FIREBASE OPERATION
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Prepare provider data
        const provider = {
          name: providerDetails.name || "Unknown Provider",
          type: providerDetails.type || "medical",
          specialty: providerDetails.specialty || "",
          phone: providerDetails.phone || "",
          email: providerDetails.email || "",
          address: providerDetails.address || "",
          notes: providerDetails.notes || "Added via Allie chat",
          familyId: familyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Add directly to Firestore
        console.log("Adding provider directly to Firestore:", provider);
        const docRef = await addDoc(collection(db, "providers"), provider);
        console.log("Provider added successfully with ID:", docRef.id);
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('provider-added', { 
            detail: { providerId: docRef.id } 
          }));
          window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
        }
        
        return createSuccessResult(
          `I've added ${provider.name} as a ${provider.type} provider to your directory.`,
          { providerId: docRef.id, provider }
        );
      } catch (firebaseError) {
        console.error("Firebase operation failed:", firebaseError);
        return createErrorResult(
          "I had trouble saving this provider. Let's try again with more specific information.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("Error handling add provider:", error);
      return createErrorResult("I encountered an error while adding this provider.", error.message);
    } finally {
      // Reset context flag
      if (this.claudeService) {
        this.claudeService.disableCalendarDetection = false;
      }
    }
  }

  /**
 * Debug method to test intent classification directly
 * @param {string} message - Message to classify
 * @returns {Promise<string>} Classified intent
 */
async debugClassifyIntent(message) {
    try {
      console.log("🔍 Debug classification for:", message);
      const intent = await this.identifyIntent(message);
      console.log("🔍 Classified as:", intent);
      return intent;
    } catch (error) {
      console.error("Error in debug classification:", error);
      return null;
    }
  }

  /**
   * Handle adding an event to calendar
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding event
   */
  async handleAddEvent(message, familyId, userId) {
    try {
      console.log("Handling add event request:", message);
      
      const { default: ClaudeService } = await import('./ClaudeService');
      
      // Extract and collect event details
      const result = await ClaudeService.extractAndCollectEventDetails(
        message, 
        userId, 
        familyId
      );
      
      if (result) {
        // Check if this is collection start or completion
        if (result.includes('I\'ve added') && result.includes('to your calendar')) {
          // Event was successfully added
          
          // Force UI refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            }, 1000);
          }
          
          return createSuccessResult(result);
        } else {
          // This is part of the collection flow
          return createSuccessResult(result);
        }
      }
      
      return createErrorResult("I couldn't process this calendar event. Please try again with more details about the event date, time, and title.");
    } catch (error) {
      console.error("Error handling add event:", error);
      
      return createErrorResult(
        "I encountered an error while adding this event to your calendar. Please try again with a clearer date and time.",
        error.message
      );
    }
  }

  /**
   * Handle adding a medical appointment
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding appointment
   */
  // Find the handleAddAppointment method and replace it with this

async handleAddAppointment(message, familyId, userId) {
    try {
      console.log("Handling add appointment request:", message);
      
      if (!familyId) {
        return createErrorResult("I need to know which family this appointment is for.");
      }
      
      // Extract appointment details
      const appointmentDetails = await ClaudeService.extractEntityWithAI(message, 'event');
      
      if (!appointmentDetails || !appointmentDetails.title) {
        return createErrorResult("I couldn't identify the appointment details. Could you provide more information?");
      }
      
      // Find mentioned child if any
      let childId = appointmentDetails.childId;
      let childName = appointmentDetails.childName;
      
      if (!childId && childName) {
        // Try to find child by name in context
        const familyContext = await this.getFamilyContext(familyId);
        const children = familyContext.children || [];
        const matchedChild = children.find(c => 
          c.name.toLowerCase() === childName.toLowerCase()
        );
        
        if (matchedChild) {
          childId = matchedChild.id;
          childName = matchedChild.name;
        }
      }
      
      // CRITICAL FIX: DIRECT FIREBASE OPERATION
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Prepare appointment data
        const eventDate = appointmentDetails.dateTime ? 
          new Date(appointmentDetails.dateTime) : new Date();
        
        const appointment = {
          title: appointmentDetails.title || "Medical Appointment",
          type: appointmentDetails.eventType || "medical",
          appointmentType: appointmentDetails.appointmentType || "general",
          date: eventDate,
          dateTime: eventDate,
          location: appointmentDetails.location || "",
          doctor: appointmentDetails.doctor || "",
          notes: appointmentDetails.description || "",
          completed: false,
          childId: childId,
          childName: childName,
          familyId: familyId,
          userId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Add to both calendar_events AND medicalAppointments collection
        console.log("Adding appointment directly to Firestore");
        
        // Save to medicalAppointments collection
        const appointmentRef = await addDoc(collection(db, "medicalAppointments"), appointment);
        
        // Also save to calendar_events collection for calendar integration
        const calendarEvent = {
          title: appointment.title,
          description: appointment.notes,
          location: appointment.location,
          start: { dateTime: eventDate.toISOString() },
          end: { dateTime: new Date(eventDate.getTime() + 3600000).toISOString() }, // 1 hour later
          eventType: "appointment",
          category: "medical",
          familyId: familyId,
          userId: userId,
          childId: childId,
          childName: childName,
          createdAt: serverTimestamp()
        };
        
        const calendarRef = await addDoc(collection(db, "calendar_events"), calendarEvent);
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('child-data-updated', { 
            detail: { childId, dataType: 'appointment' } 
          }));
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        return createSuccessResult(
          `I've scheduled a ${appointment.appointmentType} appointment${childName ? ` for ${childName}` : ''} on ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          { 
            appointmentId: appointmentRef.id, 
            calendarEventId: calendarRef.id, 
            appointment 
          }
        );
      } catch (firebaseError) {
        console.error("Firebase operation failed:", firebaseError);
        return createErrorResult(
          "I had trouble saving this appointment. Let's try again with more details.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("Error handling add appointment:", error);
      return createErrorResult("I encountered an error while adding this appointment.", error.message);
    }
  }

  /**
   * Handle adding a task
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding task
   */
  async handleAddTask(message, familyId, userId) {
    try {
      console.log("Handling add task request:", message);
      
      // Set context flag to avoid calendar detection interference
      if (this.claudeService) {
        this.claudeService.currentProcessingContext.isProcessingTask = true;
      }
      
      // Import services dynamically
      const { default: AllieAIService } = await import('./AllieAIService');
      
      // Process task creation
      const result = await AllieAIService.processTaskFromChat(message, familyId, userId);
      console.log("Task processing result:", result);
      
      // Clear context flag
      if (this.claudeService) {
        this.claudeService.currentProcessingContext.isProcessingTask = false;
      }
      
      if (result && result.success) {
        // Force UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kanban-task-added', {
            detail: { taskId: result.taskId }
          }));
        }
        
        return createSuccessResult(
          `I've added "${result.task.title}" to your tasks${result.task.assignedToName ? ` and assigned it to ${result.task.assignedToName}` : ''}.${result.task.dueDate ? ` It's due by ${new Date(result.task.dueDate).toLocaleDateString()}.` : ''} You can find it in ${result.task.column === 'in-progress' ? 'the In Progress column' : result.task.column === 'this-week' ? 'the This Week column' : 'the Upcoming column'} on your task board.`,
          result.task
        );
      }
      
      return createErrorResult(
        `I couldn't add this task. ${result.error || "Please try again with more details about what the task involves."}`,
        result.error
      );
    } catch (error) {
      console.error("Error handling add task:", error);
      
      return createErrorResult(
        "I encountered an error while adding this task. Please try being more specific about what needs to be done and who it's assigned to.",
        error.message
      );
    }
  }

  /**
   * Handle tracking child growth
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of tracking growth
   */
  // Add this new method to IntentActionService.js

async handleTrackGrowth(message, familyId, userId) {
    try {
      console.log("Handling track growth request:", message);
      
      if (!familyId) {
        return createErrorResult("I need to know which family this growth data is for.");
      }
      
      // Extract growth measurement details using AI
      const growthDetails = await ClaudeService.extractEntityWithAI(message, 'growth');
      
      if (!growthDetails) {
        return createErrorResult("I couldn't identify the growth measurement details. Could you provide more information?");
      }
      
      // Find mentioned child if any
      let childId = null;
      let childName = growthDetails.childName || null;
      
      if (childName) {
        // Try to find child by name in context
        const familyContext = await this.getFamilyContext(familyId);
        const children = familyContext.children || [];
        const matchedChild = children.find(c => 
          c.name.toLowerCase() === childName.toLowerCase()
        );
        
        if (matchedChild) {
          childId = matchedChild.id;
          childName = matchedChild.name;
        }
      }
      
      if (!childId) {
        return createErrorResult("I couldn't determine which child this measurement is for. Please specify the child's name.");
      }
      
      // DIRECT FIREBASE OPERATION
      try {
        const { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, arrayUnion } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Prepare growth data
        const growthEntry = {
          date: growthDetails.date || new Date().toISOString().split('T')[0],
          height: growthDetails.height || null,
          weight: growthDetails.weight || null,
          shoeSize: growthDetails.shoeSize || null,
          clothingSize: growthDetails.clothingSize || null,
          notes: `Added via Allie chat: "${message.substring(0, 100)}"`,
          childId: childId,
          childName: childName,
          createdAt: new Date().toISOString()
        };
        
        // First try to update existing child document
        const childDocRef = doc(db, "familyMembers", childId);
        const childDoc = await getDoc(childDocRef);
        
        if (childDoc.exists()) {
          // Get current growth data or initialize empty array
          const childData = childDoc.data();
          
          // Update with growth data
          await updateDoc(childDocRef, {
            growthData: arrayUnion(growthEntry),
            updatedAt: serverTimestamp()
          });
          
          console.log(`Growth data added for child: ${childId}`);
        } else {
          // If child document doesn't exist, create a standalone growth record
          await addDoc(collection(db, "growthMeasurements"), {
            ...growthEntry,
            familyId: familyId,
            createdAt: serverTimestamp()
          });
        }
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('child-data-updated', { 
            detail: { childId, dataType: 'growth' } 
          }));
        }
        
        // Build response message
        let responseMsg = `I've recorded the growth data for ${childName}. `;
        
        // Add details about what was recorded
        const details = [];
        if (growthEntry.height) details.push(`height: ${growthEntry.height}`);
        if (growthEntry.weight) details.push(`weight: ${growthEntry.weight}`);
        if (growthEntry.shoeSize) details.push(`shoe size: ${growthEntry.shoeSize}`);
        if (growthEntry.clothingSize) details.push(`clothing size: ${growthEntry.clothingSize}`);
        
        if (details.length > 0) {
          responseMsg += `I recorded ${details.join(', ')}.`;
        }
        
        responseMsg += ` You can view this data in the Children Tracking tab.`;
        
        return createSuccessResult(responseMsg, { childId, childName, growthEntry });
      } catch (firebaseError) {
        console.error("Firebase operation failed:", firebaseError);
        return createErrorResult(
          "I had trouble saving this growth data. Please try again with more specific measurements.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("Error handling track growth:", error);
      return createErrorResult("I encountered an error while recording this growth data.", error.message);
    }
  }

  /**
   * Handle calendar queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with calendar information
   */
  async handleQueryCalendar(message, familyId, userId) {
    try {
      console.log("Handling calendar query:", message);
      
      // Import necessary services
      const { default: EnhancedChatService } = await import('./EnhancedChatService');
      
      // Use the existing calendar lookup functionality
      const result = await EnhancedChatService.lookupCalendarEvent(message, familyId, userId);
      
      if (result.success) {
        return createSuccessResult(
          result.message,
          result.events || result.event
        );
      }
      
      return createErrorResult(
        result.message || "I couldn't find any matching events in your calendar.",
        "No matching events"
      );
    } catch (error) {
      console.error("Error handling calendar query:", error);
      
      return createErrorResult(
        "I encountered an error while searching your calendar. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Handle tasks queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with task information
   */
  async handleQueryTasks(message, familyId, userId) {
    try {
      console.log("Handling tasks query:", message);
      
      // Get family context for task data
      const familyContext = await this.getFamilyContext(familyId);
      const tasks = familyContext.tasks || [];
      
      // Extract query parameters using Claude
      const systemPrompt = `You are an AI assistant that extracts task query parameters.
      Extract the following information from the user's message:
      - assignee: Whose tasks they're asking about (if mentioned)
      - status: Task status (e.g., completed, pending, in progress)
      - timeframe: Time period (e.g., today, this week, upcoming)
      - category: Task category (if mentioned)
      
      Return ONLY a JSON object without any explanation.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Extract task query parameters from: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Parse the query parameters
      let queryParams;
      try {
        const jsonMatch = response.match(/({[\s\S]*})/);
        if (jsonMatch) {
          queryParams = JSON.parse(jsonMatch[0]);
        } else {
          queryParams = {}; // Default empty parameters
        }
      } catch (parseError) {
        console.error("Error parsing query parameters:", parseError);
        queryParams = {}; // Default empty parameters
      }
      
      // Filter tasks based on query parameters
      let filteredTasks = [...tasks];
      
      // Filter by assignee
      if (queryParams.assignee) {
        const assigneeLC = queryParams.assignee.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
          (task.assignedToName && task.assignedToName.toLowerCase().includes(assigneeLC)) ||
          (task.assignedTo && task.assignedTo.toLowerCase().includes(assigneeLC))
        );
      }
      
      // Filter by status
      if (queryParams.status) {
        const statusLC = queryParams.status.toLowerCase();
        if (statusLC.includes('complete') || statusLC.includes('done')) {
          filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (statusLC.includes('pending') || statusLC.includes('incomplete') || 
                  statusLC.includes('not done') || statusLC.includes('in progress')) {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        }
      } else {
        // Default to showing incomplete tasks unless specifically asked for completed
        filteredTasks = filteredTasks.filter(task => !task.completed);
      }
      
      // Filter by timeframe
      if (queryParams.timeframe) {
        const timeframeLC = queryParams.timeframe.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        
        if (timeframeLC.includes('today')) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
        } else if (timeframeLC.includes('this week') || timeframeLC.includes('upcoming')) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.dueDate) return true; // Include tasks with no due date
            const dueDate = new Date(task.dueDate);
            return dueDate <= endOfWeek;
          });
        }
      }
      
      // Filter by category
      if (queryParams.category) {
        const categoryLC = queryParams.category.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
          task.category && task.category.toLowerCase().includes(categoryLC)
        );
      }
      
      // Sort by due date (null dates at the end)
      filteredTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      // Generate response
      if (filteredTasks.length === 0) {
        // No matching tasks
        let noTasksMessage = "I couldn't find any matching tasks";
        if (queryParams.assignee) {
          noTasksMessage += ` assigned to ${queryParams.assignee}`;
        }
        if (queryParams.status && queryParams.status.includes('complete')) {
          noTasksMessage += " that are completed";
        } else if (queryParams.status) {
          noTasksMessage += " that are pending";
        }
        if (queryParams.timeframe) {
          noTasksMessage += ` for ${queryParams.timeframe}`;
        }
        if (queryParams.category) {
          noTasksMessage += ` in the ${queryParams.category} category`;
        }
        noTasksMessage += ".";
        
        return createSuccessResult(noTasksMessage, { tasks: [] });
      }
      
      // Generate response message for tasks found
      let responseMsg = `I found ${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`;
      
      if (queryParams.assignee) {
        responseMsg += ` assigned to ${queryParams.assignee}`;
      }
      
      if (queryParams.status && queryParams.status.includes('complete')) {
        responseMsg += " that are completed";
      } else if (queryParams.status) {
        responseMsg += " that are pending";
      } else {
        responseMsg += " that are pending"; // Default filter is pending
      }
      
      if (queryParams.timeframe) {
        responseMsg += ` for ${queryParams.timeframe}`;
      }
      
      if (queryParams.category) {
        responseMsg += ` in the ${queryParams.category} category`;
      }
      
      responseMsg += ":\n\n";
      
      // List the tasks (limit to top 5 for brevity)
      const tasksToShow = filteredTasks.slice(0, 5);
      tasksToShow.forEach((task, index) => {
        // Format due date if exists
        let dueStr = '';
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueStr = ` (due ${dueDate.toLocaleDateString()})`;
        }
        
        responseMsg += `${index + 1}. "${task.title}"${task.assignedToName ? ` assigned to ${task.assignedToName}` : ''}${dueStr}\n`;
      });
      
      // Add note if there are more tasks
      if (filteredTasks.length > 5) {
        responseMsg += `\n...and ${filteredTasks.length - 5} more tasks. You can see all tasks in the Tasks tab.`;
      }
      
      return createSuccessResult(responseMsg, { tasks: filteredTasks });
    } catch (error) {
      console.error("Error handling tasks query:", error);
      
      return createErrorResult(
        "I encountered an error while retrieving your tasks. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Handle provider queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with provider information
   */
  async handleQueryProviders(message, familyId, userId) {
    try {
      console.log("Handling providers query:", message);
      
      // Import necessary services
      const { default: ProviderService } = await import('./ProviderService');
      
      // Extract query parameters using Claude
      const systemPrompt = `You are an AI assistant that extracts provider query parameters.
      Extract the following information from the user's message:
      - providerName: Name of a specific provider (if mentioned)
      - providerType: Type of provider (e.g., medical, education, activity)
      - specialty: Provider specialty (if mentioned)
      
      Return ONLY a JSON object without any explanation.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Extract provider query parameters from: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Parse the query parameters
      let queryParams;
      try {
        const jsonMatch = response.match(/({[\s\S]*})/);
        if (jsonMatch) {
          queryParams = JSON.parse(jsonMatch[0]);
        } else {
          queryParams = {}; // Default empty parameters
        }
      } catch (parseError) {
        console.error("Error parsing query parameters:", parseError);
        queryParams = {}; // Default empty parameters
      }
      
      // Get all providers for this family
      const providers = await ProviderService.getProviders(familyId);
      
      // Filter providers based on query parameters
      let filteredProviders = [...providers];
      
      // Filter by name
      if (queryParams.providerName) {
        const nameLC = queryParams.providerName.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.name && provider.name.toLowerCase().includes(nameLC)
        );
      }
      
      // Filter by type
      if (queryParams.providerType) {
        const typeLC = queryParams.providerType.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.type && provider.type.toLowerCase().includes(typeLC)
        );
      }
      
      // Filter by specialty
      if (queryParams.specialty) {
        const specialtyLC = queryParams.specialty.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.specialty && provider.specialty.toLowerCase().includes(specialtyLC)
        );
      }
      
      // Generate response
      if (filteredProviders.length === 0) {
        // No matching providers
        let noProvidersMessage = "I couldn't find any matching providers";
        if (queryParams.providerName) {
          noProvidersMessage += ` named ${queryParams.providerName}`;
        }
        if (queryParams.providerType) {
          noProvidersMessage += ` of type ${queryParams.providerType}`;
        }
        if (queryParams.specialty) {
          noProvidersMessage += ` specializing in ${queryParams.specialty}`;
        }
        noProvidersMessage += " in your provider directory.";
        
        return createSuccessResult(noProvidersMessage, { providers: [] });
      }
      
      // Generate response message for providers found
      let responseMsg = `I found ${filteredProviders.length} ${filteredProviders.length === 1 ? 'provider' : 'providers'}`;
      
      if (queryParams.providerName) {
        responseMsg += ` named ${queryParams.providerName}`;
      }
      
      if (queryParams.providerType) {
        responseMsg += ` of type ${queryParams.providerType}`;
      }
      
      if (queryParams.specialty) {
        responseMsg += ` specializing in ${queryParams.specialty}`;
      }
      
      responseMsg += ":\n\n";
      
      // List the providers (limit to top 5 for brevity)
      const providersToShow = filteredProviders.slice(0, 5);
      providersToShow.forEach((provider, index) => {
        responseMsg += `${index + 1}. ${provider.name}`;
        
        if (provider.specialty) {
          responseMsg += ` (${provider.specialty})`;
        }
        
        if (provider.phone || provider.email) {
          responseMsg += `: `;
          if (provider.phone) responseMsg += `${provider.phone}`;
          if (provider.phone && provider.email) responseMsg += `, `;
          if (provider.email) responseMsg += `${provider.email}`;
        }
        
        responseMsg += `\n`;
      });
      
      // Add note if there are more providers
      if (filteredProviders.length > 5) {
        responseMsg += `\n...and ${filteredProviders.length - 5} more providers. You can see all providers in the Provider Directory.`;
      }
      
      return createSuccessResult(responseMsg, { providers: filteredProviders });
    } catch (error) {
      console.error("Error handling providers query:", error);
      
      return createErrorResult(
        "I encountered an error while retrieving providers. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Allow us to set ClaudeService instance to control flags
   * @param {Object} claudeService - ClaudeService instance
   */
  setClaudeService(claudeService) {
    this.claudeService = claudeService;
  }

  /**
   * Reset stats counters
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulActions: 0,
      failedActions: 0,
      actionTypeCount: {}
    };
  }

  /**
   * Get statistics about processed requests
   * @returns {Object} Stats information
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulActions / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Diagnostic test method to check if all action handlers are working
   * @returns {Object} Test results for each handler
   */
  async runDiagnosticTests() {
    const results = {};
    
    for (const [intent, handler] of Object.entries(this.actionHandlers)) {
      try {
        // Check if the handler is implemented (not just a stub)
        const isStub = handler.toString().includes('Not implemented yet') || 
                      handler.toString().includes('return createErrorResult("Not implemented');
        
        results[intent] = {
          implemented: !isStub,
          handlerExists: true
        };
      } catch (error) {
        results[intent] = {
          implemented: false,
          handlerExists: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
  
  // Stub methods that will be implemented as needed
  async handleUpdateProvider() {
    return createErrorResult("Not implemented yet - update provider functionality coming soon!");
  }
  
  async handleDeleteProvider() {
    return createErrorResult("Not implemented yet - delete provider functionality coming soon!");
  }
  
  async handleUpdateEvent() {
    return createErrorResult("Not implemented yet - update event functionality coming soon!");
  }
  
  async handleDeleteEvent() {
    return createErrorResult("Not implemented yet - delete event functionality coming soon!");
  }
  
  async handleCompleteTask() {
    return createErrorResult("Not implemented yet - complete task functionality coming soon!");
  }
  
  async handleReassignTask() {
    return createErrorResult("Not implemented yet - reassign task functionality coming soon!");
  }
  
  async handleAddMedicalRecord() {
    return createErrorResult("Not implemented yet - add medical record functionality coming soon!");
  }
  
  async handleAddMilestone() {
    return createErrorResult("Not implemented yet - add milestone functionality coming soon!");
  }
  
  async handleAddDocument() {
    return createErrorResult("Not implemented yet - add document functionality coming soon!");
  }
  
  async handleScheduleDateNight() {
    return createErrorResult("Not implemented yet - schedule date night functionality coming soon!");
  }
}

export default new IntentActionService();