// src/components/calendar/RevisedFloatingCalendarWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, PlusCircle, Filter, X, Check, AlertCircle, Info } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventContext'; // Import EventContext
import CalendarService from '../../services/CalendarService';
import CalendarErrorHandler from '../../utils/CalendarErrorHandler';
import { useNavigate } from 'react-router-dom';

// Import sub-components
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarFilters from './CalendarFilters';
import EventsList from './EventsList';
import EventDetails from './EventDetails';
import EnhancedEventManager from './EnhancedEventManager';
import EventSourceBadge from './EventSourceBadge';

/**
 * RevisedFloatingCalendarWidget - A comprehensive floating calendar with filtering, 
 * event management, and detail views with improved metadata handling and duplicate prevention.
 */
const RevisedFloatingCalendarWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    taskRecommendations, 
    currentWeek, 
    weekStatus,
    familyMembers,
    familyId,
    coupleCheckInData
  } = useFamily();
  
  // Get events from EventContext
  const { 
    events, 
    loading: eventsLoading, 
    addEvent, 
    updateEvent, 
    deleteEvent 
  } = useEvents();
  
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [widgetHeight, setWidgetHeight] = useState(45);
  const [widgetWidth, setWidgetWidth] = useState(64);
  const [isDragging, setIsDragging] = useState(null);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 });
  
  // Calendar/Event State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('all'); // 'all', 'tasks', 'appointments', 'activities', etc.
  const [selectedMember, setSelectedMember] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [showEventManager, setShowEventManager] = useState(false);
  const [showAiParseInfo, setShowAiParseInfo] = useState(false);

  // Event collections
  const [eventCache, setEventCache] = useState(new Map()); // Cache for deduplication
  const [addedEvents, setAddedEvents] = useState({});
  const [showAddedMessage, setShowAddedMessage] = useState({});
  const [conflictingEvents, setConflictingEvents] = useState([]);
  
  // Event detail/editing state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Refs
  const widgetRef = useRef(null);
  const dragHandleRef = useRef(null);
  
  // Initialize error handling
  useEffect(() => {
    CalendarErrorHandler.suppressApiErrors();
    return () => {
      CalendarErrorHandler.restoreConsoleError();
    };
  }, []);
  
  // Set up automatic refresh interval
  useEffect(() => {
    if (isOpen) {
      const refreshInterval = setInterval(() => {
        setLastRefresh(Date.now()); // Trigger a refresh
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [isOpen]);
  
  // Listen for calendar update events
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log("Force calendar refresh triggered");
      setLastRefresh(Date.now());
      resetEventCache();
    };
    
    const refreshEvents = (e) => {
      console.log("Calendar event refresh triggered", e?.type || 'manual refresh');
      resetEventCache();
      setLastRefresh(Date.now());
    };
    
    window.addEventListener('force-calendar-refresh', handleForceRefresh);
    window.addEventListener('calendar-event-added', refreshEvents);
    window.addEventListener('calendar-child-event-added', refreshEvents);
    
    return () => {
      window.removeEventListener('force-calendar-refresh', handleForceRefresh);
      window.removeEventListener('calendar-event-added', refreshEvents);
      window.removeEventListener('calendar-child-event-added', refreshEvents);
    };
  }, []);
  
  // Drag to resize functionality
  useEffect(() => {
    if (!isDragging || !widgetRef.current) return;

    const handleMouseMove = (e) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startDragPos.x;
      const deltaY = e.clientY - startDragPos.y;
      
      if (isDragging === 'width' || isDragging === 'both') {
        const newWidth = Math.max(40, startDimensions.width + deltaX / 16);
        setWidgetWidth(newWidth);
      }
      
      if (isDragging === 'height' || isDragging === 'both') {
        const newHeight = Math.max(30, startDimensions.height + deltaY / 16);
        setWidgetHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startDragPos, startDimensions]);
  
  // Start drag operation
  const startDrag = (e, direction) => {
    e.preventDefault();
    setIsDragging(direction);
    setStartDragPos({ x: e.clientX, y: e.clientY });
    setStartDimensions({ width: widgetWidth, height: widgetHeight });
  };
  
  /**
   * Generate a unique event signature for deduplication
   * @param {Object} event - Calendar event
   * @returns {String} - Unique event signature
   */
  const createEventSignature = (event) => {
    // Normalize title/summary
    const title = event.summary || event.title || '';
    
    // Get child name if available
    const childName = event.childName || '';
    
    // Normalize date format
    let dateStr = '';
    if (event.start?.dateTime) {
      dateStr = event.start.dateTime;
    } else if (event.start?.date) {
      dateStr = event.start.date;
    } else if (event.date) {
      dateStr = event.date;
    } else if (event.dateTime) {
      dateStr = typeof event.dateTime === 'object' ? 
        event.dateTime.toISOString() : event.dateTime;
    } else if (event.dateObj) {
      dateStr = event.dateObj.toISOString();
    }
    
    // Extract just the date part for consistency
    const datePart = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
    
    // Include event type for better uniqueness
    const eventType = event.eventType || event.category || 'event';
    
    // Create signature that will match similar events
    return `${childName}-${title}-${datePart}-${eventType}`.toLowerCase();
  };
  
  /**
   * Reset the event cache for fresh loading
   */
  const resetEventCache = () => {
    setEventCache(new Map());
  };
  
  /**
   * Check if an event exists in cache to prevent duplicates
   * @param {Object} event - Event to check
   * @returns {Boolean} - True if event exists in cache
   */
  const eventExists = (event) => {
    const signature = createEventSignature(event);
    return eventCache.has(signature);
  };
  
  /**
   * Add event to cache to prevent future duplicates
   * @param {Object} event - Event to add to cache
   */
  const addEventToCache = (event) => {
    const signature = createEventSignature(event);
    const updatedCache = new Map(eventCache);
    updatedCache.set(signature, true);
    setEventCache(updatedCache);
  };
  
  /**
   * Helper function to get a unique key for an event
   * @param {Object} event - Event to get key for
   * @returns {String} - Unique key for event
   */
  const getEventKey = (event) => {
    if (!event) return null;
    
    let key = '';
    
    if (event.id) key += event.id; // Use ID first if available
    else if (event.firestoreId) key += event.firestoreId; // Then try firestoreId
    else if (event.universalId) key += event.universalId; // Then try universalId
    else {
      // Otherwise create a compound key
      if (event.title) key += event.title;
      if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
      if (event.childName) key += '-' + event.childName;
    }
    
    return key.toLowerCase().replace(/\s+/g, '-');
  };
  
  // Handle form cancellation
  const handleCancel = () => {
    // Simply close the widget, since there's no onCancel prop
    setIsOpen(false);
  };
  
  // Add event handlers
  // In RevisedFloatingCalendarWidget.jsx
const handleEventClick = async (event) => {
  // Create a properly formatted event object for the editor
  const formattedEvent = {
    ...event,
    // Make sure we have these fields properly set
    title: event.title || event.summary,
    description: event.description || '',
    location: event.location || '',
    dateTime: event.dateObj?.toISOString() || event.start?.dateTime || new Date().toISOString(),
    endDateTime: event.dateEndObj?.toISOString() || event.end?.dateTime,
    childId: event.childId || null,
    childName: event.childName || null,
    attendingParentId: event.attendingParentId || null,
    eventType: event.eventType || 'general',
    category: event.category || 'general',
    siblingIds: event.siblingIds || [],
    siblingNames: event.siblingNames || [],
    // Make sure we have the ID for updating
    firestoreId: event.firestoreId || event.id
  };
  
  setSelectedEvent(formattedEvent);
  
  // Check for conflicts
  const conflicts = await checkForEventConflicts(event);
  setConflictingEvents(conflicts);
  
  // Skip EventDetails and go directly to EnhancedEventManager
  setShowEventDetails(false);
  setIsEditingEvent(true);
  setEditedEvent(formattedEvent);
};
  
const handleEventAdd = async (event) => {
  try {
    // Check if event already exists locally
    if (eventExists(event)) {
      console.log("Event already exists in calendar, preventing duplicate");
      CalendarService.showNotification("Event already exists in your calendar", "info");
      return;
    }
    
    // Add the event using EventContext
    const result = await addEvent(event);
    
    if (result.success) {
      // Check if this was a duplicate detected server-side
      if (result.isDuplicate) {
        console.log("Server detected duplicate event:", result.existingEvent?.firestoreId);
        
        // Still mark as added to prevent further addition attempts
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(event)]: true
        }));
        
        // Show message but make it clear it was already there
        CalendarService.showNotification("This event already exists in your calendar", "info");
        
        // Refresh events to make sure we show the existing event
        setLastRefresh(Date.now());
        return;
      }
      
      // Add to cache to prevent duplicates
      addEventToCache({
        ...event,
        id: result.eventId,
        firestoreId: result.firestoreId,
        universalId: result.universalId
      });
      
      // Mark as added
      setAddedEvents(prev => ({
        ...prev,
        [getEventKey(event)]: true
      }));
      
      // Show "Added" message temporarily
      setShowAddedMessage(prev => ({
        ...prev,
        [getEventKey(event)]: true
      }));
      
      setTimeout(() => {
        setShowAddedMessage(prev => ({
          ...prev,
          [getEventKey(event)]: false
        }));
      }, 3000);
      
      // Show notification
      CalendarService.showNotification("Event added to calendar", "success");
      
      // Refresh events
      setLastRefresh(Date.now());
    }
  } catch (error) {
    console.error("Error adding event:", error);
    CalendarService.showNotification("Failed to add event to calendar", "error");
  }
};
  
  const handleEventEdit = (event) => {
    // Create a properly formatted event object for the editor
    const formattedEvent = {
      ...event,
      // Make sure we have these fields properly set
      title: event.title || event.summary,
      description: event.description || '',
      location: event.location || '',
      dateTime: event.dateObj?.toISOString() || event.start?.dateTime || new Date().toISOString(),
      endDateTime: event.dateEndObj?.toISOString() || event.end?.dateTime,
      childId: event.childId || null,
      childName: event.childName || null,
      attendingParentId: event.attendingParentId || null,
      eventType: event.eventType || 'general',
      category: event.category || 'general',
      siblingIds: event.siblingIds || [],
      siblingNames: event.siblingNames || [],
      // Make sure we have the ID for updating
      firestoreId: event.firestoreId || event.id
    };
    
    setSelectedEvent(formattedEvent);
    setShowEventDetails(false);
    setIsEditingEvent(true);
    setEditedEvent(formattedEvent);
  };
  
  // Add task to calendar
  const handleAddTaskToCalendar = async (task) => {
    try {
      if (!currentUser || !task) return;
      
      // Create event from task
      const event = CalendarService.createEventFromTask(task);
      
      // Use selected date
      if (selectedDate) {
        const customDate = new Date(selectedDate);
        customDate.setHours(10, 0, 0, 0); // Set to 10 AM
        
        event.start.dateTime = customDate.toISOString();
        const endTime = new Date(customDate);
        endTime.setHours(endTime.getHours() + 1);
        event.end.dateTime = endTime.toISOString();
      }
      
      // Add task's linkedEntity information
      event.linkedEntity = {
        type: 'task',
        id: task.id
      };
      
      // Add event using EventContext
      const result = await addEvent(event);
      
      if (result.success) {
        // Add to cache to prevent duplicates
        addEventToCache({
          ...event,
          id: result.eventId,
          firestoreId: result.firestoreId,
          universalId: result.universalId
        });
        
        // Mark as added
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(task)]: true
        }));
        
        // Show "Added" message temporarily
        setShowAddedMessage(prev => ({
          ...prev,
          [getEventKey(task)]: true
        }));
        
        setTimeout(() => {
          setShowAddedMessage(prev => ({
            ...prev,
            [getEventKey(task)]: false
          }));
        }, 3000);
        
        // Show notification
        CalendarService.showNotification("Task added to calendar", "success");
        
        // Refresh events
        setLastRefresh(Date.now());
      }
    } catch (error) {
      console.error("Error adding task to calendar:", error);
      CalendarService.showNotification("Failed to add task to calendar", "error");
    }
  };
  
  // Add meeting to calendar
  const handleAddMeetingToCalendar = async (meeting) => {
    try {
      if (!currentUser || !meeting) return;
      
      // Create event from meeting
      const event = CalendarService.createFamilyMeetingEvent(meeting.weekNumber, meeting.dateObj);
      
      // Rename from "Week" to "Cycle" in the title
      event.summary = event.summary.replace("Week", "Cycle");
      
      // Add meeting's linkedEntity information
      event.linkedEntity = meeting.linkedEntity || {
        type: 'meeting',
        id: meeting.weekNumber
      };
      
      // Add event using EventContext
      const result = await addEvent(event);
      
      if (result.success) {
        // Add to cache to prevent duplicates
        addEventToCache({
          ...event,
          id: result.eventId,
          firestoreId: result.firestoreId,
          universalId: result.universalId
        });
        
        // Mark as added
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(meeting)]: true
        }));
        
        // Show "Added" message temporarily
        setShowAddedMessage(prev => ({
          ...prev,
          [getEventKey(meeting)]: true
        }));
        
        setTimeout(() => {
          setShowAddedMessage(prev => ({
            ...prev,
            [getEventKey(meeting)]: false
          }));
        }, 3000);
        
        // Show notification
        CalendarService.showNotification("Meeting added to calendar", "success");
        
        // Refresh events
        setLastRefresh(Date.now());
      }
    } catch (error) {
      console.error("Error adding meeting to calendar:", error);
      CalendarService.showNotification("Failed to add meeting to calendar", "error");
    }
  };
  
  // Add child event to calendar
  const handleAddChildEventToCalendar = async (event) => {
    try {
      if (!currentUser || !event) return;
      
      // Format child event using CalendarOperations
      const calendarEvent = {
        title: event.title,
        description: event.description || '',
        dateTime: event.dateObj || new Date(event.dateTime),
        location: event.location || '',
        duration: 60, // Default to 1 hour
        childId: event.childId,
        childName: event.childName,
        attendingParentId: event.attendingParentId,
        eventType: event.eventType || 'other',
        extraDetails: {
          ...(event.extraDetails || {}),
          parsedWithAI: event.extraDetails?.parsedWithAI || false,
          extractionConfidence: event.extraDetails?.extractionConfidence || null,
          parsedFromImage: event.extraDetails?.parsedFromImage || false,
          originalText: event.extraDetails?.originalText || '',
          creationSource: event.extraDetails?.creationSource || 'manual'
        }
      };
      
      // Add event using EventContext
      const result = await addEvent(calendarEvent);
      
      if (result.success) {
        // Add to cache to prevent duplicates
        addEventToCache({
          ...calendarEvent,
          id: result.eventId,
          firestoreId: result.firestoreId,
          universalId: result.universalId
        });
        
        // Mark as added
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(event)]: true
        }));
        
        // Show "Added" message temporarily
        setShowAddedMessage(prev => ({
          ...prev,
          [getEventKey(event)]: true
        }));
        
        setTimeout(() => {
          setShowAddedMessage(prev => ({
            ...prev,
            [getEventKey(event)]: false
          }));
        }, 3000);
        
        // Show notification
        const eventDescription = event.childName ? `${event.childName}'s ${event.title}` : event.title;
        CalendarService.showNotification(`${eventDescription} added to calendar`, "success");
        
        // Refresh events
        setLastRefresh(Date.now());
      }
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      CalendarService.showNotification("Failed to add event to calendar", "error");
    }
  };
  
  // Delete event
  const handleDeleteEvent = async (event) => {
    try {
      setPendingAction('delete');
      
      if (!event) {
        CalendarService.showNotification("No event selected to delete", "error");
        setPendingAction(null);
        return;
      }
      
      if (!window.confirm("Are you sure you want to delete this event?")) {
        setPendingAction(null);
        return;
      }
      
      // Use Firestore ID if available, or universal ID, or regular ID
      const eventId = event.firestoreId || event.universalId || event.id;
      
      if (!eventId) {
        CalendarService.showNotification("Cannot delete this event - no valid ID found", "error");
        setPendingAction(null);
        return;
      }
      
      // Delete using EventContext
      const result = await deleteEvent(eventId);
      
      if (result.success) {
        // Remove from cache
        const signature = createEventSignature(event);
        const updatedCache = new Map(eventCache);
        updatedCache.delete(signature);
        setEventCache(updatedCache);
        
        // Update local state
        setAddedEvents(prev => {
          const newState = {...prev};
          delete newState[getEventKey(event)];
          return newState;
        });
        
        // Close the details modal
        setShowEventDetails(false);
        
        // Refresh events
        setTimeout(() => {
          setLastRefresh(Date.now());
        }, 300);
      } else {
        CalendarService.showNotification(result.error || "Failed to delete event", "error");
      }
      
      setPendingAction(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      CalendarService.showNotification("Failed to delete event: " + error.message, "error");
      setPendingAction(null);
    }
  };
  
  // Update event
  // Update event
const handleUpdateEvent = async (updatedEvent) => {
  try {
    setPendingAction('update');
    
    if (!updatedEvent || !updatedEvent.firestoreId) {
      CalendarService.showNotification("Cannot update this event - no valid ID found", "error");
      setPendingAction(null);
      return;
    }
    
    // Create updated event object with required fields
    const eventUpdate = {
      summary: updatedEvent.title,
      description: updatedEvent.description || '',
      location: updatedEvent.location || '',
      
      // Include document and provider references
      documents: updatedEvent.documents || [],
      providers: updatedEvent.providers || [],
      
      // Include attendees
      attendees: updatedEvent.attendees || [],
      
      // Child and parent associations
      childId: updatedEvent.childId,
      childName: updatedEvent.childName,
      attendingParentId: updatedEvent.attendingParentId,
      siblingIds: updatedEvent.siblingIds || [],
      siblingNames: updatedEvent.siblingNames || [],
      
      // Reminders and additional context
      reminders: updatedEvent.reminders,
      notes: updatedEvent.notes || updatedEvent.extraDetails?.notes
    };
    
    // Add date/time if available
    if (updatedEvent.dateObj) {
      eventUpdate.start = {
        dateTime: updatedEvent.dateObj.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      // Calculate end time
      const endDate = updatedEvent.dateEndObj || new Date(updatedEvent.dateObj.getTime() + 60 * 60 * 1000);
      eventUpdate.end = {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Ensure we preserve AI metadata
    eventUpdate.extraDetails = {
      ...(updatedEvent.extraDetails || {}),
      parsedWithAI: updatedEvent.extraDetails?.parsedWithAI || false,
      extractionConfidence: updatedEvent.extraDetails?.extractionConfidence || null,
      parsedFromImage: updatedEvent.extraDetails?.parsedFromImage || false,
      originalText: updatedEvent.extraDetails?.originalText || '',
      creationSource: updatedEvent.extraDetails?.creationSource || 'manual',
      
      // Provider details for appointments
      ...(updatedEvent.category === 'appointment' && updatedEvent.providers?.[0] ? {
        providerName: updatedEvent.providers[0].name,
        providerSpecialty: updatedEvent.providers[0].specialty,
        providerPhone: updatedEvent.providers[0].phone,
        providerAddress: updatedEvent.providers[0].address
      } : {}),
      
      // Birthday details
      ...(updatedEvent.category === 'birthday' ? {
        birthdayChildName: updatedEvent.extraDetails?.birthdayChildName,
        birthdayChildAge: updatedEvent.extraDetails?.birthdayChildAge
      } : {})
    };
      
      // Update event using EventContext
      const result = await updateEvent(updatedEvent.firestoreId, eventUpdate);
      
      if (result.success) {
        // Close edit mode and update selected event
        setIsEditingEvent(false);
        setSelectedEvent({
          ...selectedEvent,
          ...updatedEvent
        });
        
        // Show notification
        CalendarService.showNotification("Event updated successfully", "success");
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
        
        // Refresh events
        setLastRefresh(Date.now());
      } else {
        CalendarService.showNotification(result.error || "Failed to update event", "error");
      }
      
      setPendingAction(null);
    } catch (error) {
      console.error("Error updating event:", error);
      CalendarService.showNotification("Failed to update event: " + error.message, "error");
      setPendingAction(null);
    }
  };
  
  // Navigate to a different view based on the event's linked entity
  const navigateToLinkedEntity = (event) => {
    if (!event.linkedEntity) return;
    
    const { type, id } = event.linkedEntity;
    
    switch(type) {
      case 'task':
        navigate('/dashboard?tab=tasks');
        break;
      case 'relationship':
        navigate('/dashboard?tab=relationship');
        break;
      case 'child':
        navigate('/dashboard?tab=children');
        break;
      case 'meeting':
        if (typeof window !== 'undefined') {
          if (window.openFamilyMeeting) {
            window.openFamilyMeeting();
          } else {
            const meetingEvent = new CustomEvent('open-family-meeting', { 
              detail: { weekNumber: id } 
            });
            window.dispatchEvent(meetingEvent);
            navigate('/dashboard?tab=tasks');
          }
        } else {
          navigate('/dashboard?tab=tasks');
        }
        break;
      default:
        // Do nothing
    }
    
    // Close the details modal
    setShowEventDetails(false);
  };
  
  /**
   * Check for scheduling conflicts for a given event
   * @param {Object} event - Event to check for conflicts
   * @returns {Promise<Array>} Conflicting events
   */
  const checkForEventConflicts = async (event) => {
    if (!event) return [];
    
    try {
      // Get event date and time
      let eventDate;
      if (event.dateObj) {
        eventDate = new Date(event.dateObj);
      } else if (event.dateTime) {
        eventDate = new Date(event.dateTime);
      } else if (event.start?.dateTime) {
        eventDate = new Date(event.start.dateTime);
      } else {
        return []; // No valid date to check
      }
      
      // Define time window to check for conflicts (1 hour before to 1 hour after)
      const startCheck = new Date(eventDate);
      startCheck.setHours(startCheck.getHours() - 1);
      
      const endCheck = new Date(eventDate);
      endCheck.setHours(endCheck.getHours() + 1);
      
      // Find events within the time window - use events from context
      return events.filter(existingEvent => {
        // Skip the event itself
        if (existingEvent.id === event.id || 
            existingEvent.firestoreId === event.firestoreId ||
            existingEvent.universalId === event.universalId) {
          return false;
        }
        
        // Get event time
        let existingDate;
        if (existingEvent.dateObj) {
          existingDate = existingEvent.dateObj;
        } else if (existingEvent.dateTime) {
          existingDate = new Date(existingEvent.dateTime);
        } else if (existingEvent.start?.dateTime) {
          existingDate = new Date(existingEvent.start.dateTime);
        } else {
          return false; // No valid date
        }
        
        // Check if dates are on the same day
        const sameDay = existingDate.getDate() === eventDate.getDate() &&
                        existingDate.getMonth() === eventDate.getMonth() &&
                        existingDate.getFullYear() === eventDate.getFullYear();
        
        if (!sameDay) return false;
        
        // Check if times overlap
        const startTime = existingDate.getTime();
        const endTime = existingDate.getTime() + 60 * 60 * 1000; // Add 1 hour
        
        return (startTime <= endCheck.getTime() && endTime >= startCheck.getTime());
      });
    } catch (error) {
      console.error("Error checking for conflicts:", error);
      return [];
    }
  };
  
  // Handle filter changes
  const handleViewChange = (newView) => {
    setView(newView);
  };
  
  const handleMemberChange = (memberId) => {
    setSelectedMember(memberId);
  };
  
  const handleResetFilters = () => {
    setView('all');
    setSelectedMember('all');
  };
  
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white p-3 rounded-full hover:bg-gray-800 shadow-lg"
        >
          <Calendar size={24} />
        </button>
      </div>
    );
  }
  
  /**
   * Get events for currently selected date with filtering
   * @returns {Array} Filtered events for selected date
   */
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return events.filter(event => {
      // Ensure we have a valid date object
      let eventDate = null;
      
      if (event.dateObj instanceof Date && !isNaN(event.dateObj)) {
        eventDate = event.dateObj;
      } else if (event.start?.dateTime) {
        eventDate = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        eventDate = new Date(event.start.date);
      } else if (event.dateTime) {
        eventDate = new Date(event.dateTime);
      } else if (event.date) {
        eventDate = new Date(event.date);
      }
      
      // Skip events with invalid dates
      if (!eventDate || isNaN(eventDate.getTime())) {
        return false;
      }
      
      // Check date match - only compare year, month, day (not time)
      const dateMatch = eventDate.getDate() === selectedDate.getDate() &&
                       eventDate.getMonth() === selectedDate.getMonth() &&
                       eventDate.getFullYear() === selectedDate.getFullYear();
      
      // If date doesn't match, return false immediately
      if (!dateMatch) return false;
      
      // Check member filter
      if (selectedMember !== 'all') {
        // For child events
        if (event.childName && selectedMember !== event.childId && selectedMember !== event.childName) {
          return false;
        }
        
        // For parent-assigned tasks
        if (event.assignedTo && selectedMember !== event.assignedTo && 
            event.assignedToName && selectedMember !== event.assignedToName) {
          return false;
        }
        
        // For family events, check attendees
        const hasSelectedMember = event.attendees?.some(
          attendee => attendee.id === selectedMember || attendee.name === selectedMember
        );
        
        if (!hasSelectedMember && !event.childName && !event.assignedTo) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  /**
   * Filter events based on the current view type including AI parsed events
   * @param {Array} events - Events to filter
   * @returns {Array} Filtered events
   */
  const filterEventsByView = (events) => {
    return events.filter(event => 
      view === 'all' || 
      (view === 'appointments' && (event.category === 'medical' || event.eventType === 'appointment')) ||
      (view === 'activities' && (event.category === 'activity' || event.eventType === 'activity')) ||
      (view === 'tasks' && (event.category === 'task' || event.eventType === 'task' || event.eventType === 'homework')) ||
      (view === 'meetings' && (event.category === 'meeting' || event.eventType === 'meeting')) ||
      (view === 'ai-parsed' && event.extraDetails?.parsedWithAI)
    );
  };
  
  /**
   * Get upcoming events, filtered by view and member
   * @returns {Array} Upcoming filtered events
   */
  const getUpcomingEvents = () => {
    // Apply member filter
    let filtered = events.filter(event => {
      if (selectedMember === 'all') return true;
      
      // For child events
      if (event.childName && 
          (selectedMember === event.childId || selectedMember === event.childName)) {
        return true;
      }
      
      // For tasks
      if ((event.assignedTo && selectedMember === event.assignedTo) || 
          (event.assignedToName && selectedMember === event.assignedToName)) {
        return true;
      }
      
      // For other events, check attendees
      return event.attendees?.some(a => a.id === selectedMember || a.name === selectedMember);
    });
    
    // Apply view filter
    filtered = filterEventsByView(filtered);
    
    // Sort by date (upcoming first)
    return filtered.sort((a, b) => {
      // Convert to date objects if they aren't already
      const dateA = a.dateObj instanceof Date ? a.dateObj : new Date(a.dateObj);
      const dateB = b.dateObj instanceof Date ? b.dateObj : new Date(b.dateObj);
      return dateA - dateB;
    }).slice(0, 5);
  };
  
  // Event date objects for calendar highlighting
  const eventDates = events
    .filter(event => {
      // Apply member filter
      if (selectedMember !== 'all') {
        // For child events
        if (event.childName && selectedMember !== event.childId && selectedMember !== event.childName) {
          return false;
        }
        // For tasks
        if (event.assignedTo && selectedMember !== event.assignedTo && 
            event.assignedToName && selectedMember !== event.assignedToName) {
          return false;
        }
        // For other events, check attendees
        if (!event.attendees?.some(a => a.id === selectedMember || a.name === selectedMember)) {
          return false;
        }
      }
      // Make sure the event has a valid dateObj before including it
      return event.dateObj instanceof Date && !isNaN(event.dateObj);
    })
    .map(event => event.dateObj);
  
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div 
        ref={widgetRef}
        className="bg-white border border-black shadow-lg rounded-lg flex flex-col relative overflow-hidden"
        style={{ height: `${widgetHeight}rem`, width: `${widgetWidth}rem` }}
      >
        {/* Header Component */}
        <CalendarHeader 
          onClose={() => setIsOpen(false)} 
          onMinimize={() => setIsOpen(false)}
          onRefresh={() => setLastRefresh(Date.now())}
        />
        
        {/* Calendar content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Calendar Grid Component */}
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onPrevMonth={() => {
              const prevMonth = new Date(currentMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setCurrentMonth(prevMonth);
            }}
            onNextMonth={() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth);
            }}
            eventDates={eventDates}
            selectedMember={selectedMember}
          />
          
          {/* Filters Component */}
          <CalendarFilters
            view={view}
            onViewChange={handleViewChange}
            selectedMember={selectedMember}
            onMemberChange={handleMemberChange}
            familyMembers={familyMembers}
            onResetFilters={handleResetFilters}
            // Add AI filtered view to the filter options
            filterOptions={[
              { id: 'all', label: 'All Events' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'activities', label: 'Activities' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'meetings', label: 'Meetings' },
              { id: 'ai-parsed', label: 'AI Parsed' }
            ]}
          />
          
          {/* Add Event Button */}
          <div className="mb-4 mt-1">
            <button
              onClick={() => setShowEventManager(true)}
              className="w-full py-2 px-3 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              <PlusCircle size={16} className="mr-2" />
              Add New Event
            </button>
          </div>
          
          {/* AI Parse Info Button - only show if we have AI parsed events */}
          {events.some(event => event.extraDetails?.parsedWithAI) && (
            <div className="mb-4">
              <button
                onClick={() => setShowAiParseInfo(!showAiParseInfo)}
                className={`w-full py-2 px-3 ${showAiParseInfo ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'} rounded text-xs hover:bg-purple-200 transition-colors flex items-center justify-center`}
              >
                <Info size={14} className="mr-1" />
                {showAiParseInfo ? 'Hide AI Event Info' : 'What are AI Parsed Events?'}
              </button>
              
              {showAiParseInfo && (
                <div className="mt-2 p-2 bg-purple-50 rounded-md text-xs text-purple-800 border border-purple-200">
                  <p className="mb-1"><span className="font-medium">AI Parsed Events</span> are automatically extracted from messages, images, or emails.</p>
                  <p>We use AI to identify event details like dates, times, and locations from text. Look for the <span className="bg-purple-100 text-purple-800 px-1 rounded text-xs font-medium">AI</span> badge to see which events were created this way.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Selected Date Events Component */}
<EventsList
  events={filterEventsByView(getEventsForSelectedDate())}
  onEventClick={handleEventClick}
  onEventAdd={handleEventAdd}
  onEventEdit={handleEventEdit}
  onEventDelete={handleDeleteEvent}
  addedEvents={addedEvents}
  showAddedMessage={showAddedMessage}
  loading={eventsLoading || loading}
  title={`Events for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
  emptyMessage="No events scheduled for this date"
  showActionButtons={true} /* Show action buttons for selected date events */
  renderBadges={(event) => (
    <>
      {event.extraDetails?.parsedWithAI && (
        <span className="ml-1 bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs font-medium flex items-center">
          <span className="mr-1">AI</span>
          {event.extraDetails.extractionConfidence && (
            <span className="text-xs">
              {Math.round(event.extraDetails.extractionConfidence * 100)}%
            </span>
          )}
        </span>
      )}
    </>
  )}
/>

{/* Upcoming Events Component */}

<EventsList
  events={getUpcomingEvents()}
  onEventClick={handleEventClick}
  onEventAdd={handleEventAdd}
  onEventEdit={handleEventEdit}
  onEventDelete={handleDeleteEvent}
  addedEvents={addedEvents}
  showAddedMessage={showAddedMessage}
  loading={eventsLoading || loading}
  title="Upcoming Events"
  emptyMessage="No upcoming events"
  showActionButtons={false} /* Don't show action buttons for upcoming events */
  renderBadges={(event) => (
    <>
      {event.extraDetails?.parsedWithAI && (
        <span className="ml-1 bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs font-medium flex items-center">
          <span className="mr-1">AI</span>
          {event.extraDetails.extractionConfidence && (
            <span className="text-xs">
              {Math.round(event.extraDetails.extractionConfidence * 100)}%
            </span>
          )}
        </span>
      )}
    </>
  )}
  familyMembers={familyMembers} // Add this to pass family members
/>
          
        </div>
        
        {/* Resize handles */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 bg-gray-200 rounded-bl-lg cursor-nwse-resize flex items-center justify-center"
          onMouseDown={(e) => startDrag(e, 'both')}
          ref={dragHandleRef}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M9 1L1 9M6 1L1 6M9 4L4 9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        
        <div 
          className="absolute bottom-0 right-1/2 w-16 h-3 bg-gray-200 rounded-t-lg cursor-ns-resize transform translate-x-1/2"
          onMouseDown={(e) => startDrag(e, 'height')}
        >
          <div className="flex justify-center items-center h-full">
            <div className="w-4 h-1 bg-gray-400 rounded"></div>
          </div>
        </div>
        
        <div 
          className="absolute right-0 top-1/2 h-16 w-3 bg-gray-200 rounded-l-lg cursor-ew-resize transform -translate-y-1/2"
          onMouseDown={(e) => startDrag(e, 'width')}
        >
          <div className="flex justify-center items-center h-full">
            <div className="h-4 w-1 bg-gray-400 rounded"></div>
          </div>
        </div>
      </div>
      
      {/* Calendar icon button - remains visible when widget is open */}
      <button
        onClick={() => setIsOpen(false)}
        className="bg-black text-white p-3 rounded-full hover:bg-gray-800 shadow-lg"
      >
        <Calendar size={24} />
      </button>
      
      {/* Enhanced Event Manager - handles both creating new events and viewing/editing existing ones */}
{(showEventManager || (selectedEvent && isEditingEvent)) && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <EnhancedEventManager
        initialEvent={isEditingEvent ? selectedEvent : null}
        selectedDate={selectedDate}
        onSave={(result) => {
          if (result?.success) {
            // Close the editor/creator
            setShowEventManager(false);
            setShowEventDetails(false);
            setIsEditingEvent(false);
            
            // Update local data and refresh
            setLastRefresh(Date.now());
            
            // Show success animation
            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
            }, 2000);
            
            CalendarService.showNotification(
              isEditingEvent ? "Event updated successfully" : "Event added successfully", 
              "success"
            );
          }
        }}
        onCancel={() => {
          setShowEventManager(false);
          setShowEventDetails(false);
          setIsEditingEvent(false);
        }}
        mode={isEditingEvent ? (selectedEvent.viewOnly ? "view" : "edit") : "create"}
        conflictingEvents={conflictingEvents}
        showAiMetadata={true}
        onDelete={isEditingEvent ? handleDeleteEvent : null}
      />
    </div>
  </div>
)}

      
      
      {/* Success animation */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
          <div className="bg-white rounded-lg p-6 shadow-lg animate-bounce">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-green-100 mb-3">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium">
                {isEditingEvent ? 'Event Updated!' : 'Event Added!'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Successfully {isEditingEvent ? 'updated in' : 'added to'} your calendar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisedFloatingCalendarWidget;