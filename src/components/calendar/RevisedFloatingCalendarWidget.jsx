import React, { useState, useEffect, useRef } from 'react';
import { Calendar, PlusCircle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
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


/**
 * RevisedFloatingCalendarWidget - A comprehensive floating calendar with filtering, 
 * event management, and detail views. Now with proper component separation.
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
  
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [widgetHeight, setWidgetHeight] = useState(40);
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

  
  // Event collections
  const [allEvents, setAllEvents] = useState([]);
  const [childrenEvents, setChildrenEvents] = useState([]);
  const [childrenAppointments, setChildrenAppointments] = useState([]);
  const [childrenActivities, setChildrenActivities] = useState([]);
  const [eventCache, setEventCache] = useState(new Set());
  const [addedEvents, setAddedEvents] = useState({});
  const [showAddedMessage, setShowAddedMessage] = useState({});
  
  // Event detail/editing state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  
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
  
  // Load events when widget opens or refresh is triggered
  useEffect(() => {
    if (isOpen && familyId) {
      loadAllEvents();
    }
  }, [isOpen, familyId, lastRefresh, selectedDate]);
  
  // Listen for calendar update events
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log("Force calendar refresh triggered");
      setLastRefresh(Date.now());
      setEventCache(new Set());
      buildEventCache();
    };
    
    const refreshEvents = (e) => {
      console.log("Calendar event refresh triggered", e?.type || 'manual refresh');
      setEventCache(new Set());
      setLastRefresh(Date.now());
      setTimeout(() => buildEventCache(), 500);
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
  
  // Helper function to create event signature for caching
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
    } else if (event.dateObj) {
      dateStr = event.dateObj.toISOString();
    }
    
    // Extract just the date part for consistency
    const datePart = dateStr.split('T')[0] || '';
    
    // Create signature that will match similar events
    return `${childName}-${title}-${datePart}`.toLowerCase();
  };
  
  // Helper function to check if an event exists in cache
  const eventExists = (event) => {
    const signature = createEventSignature(event);
    return eventCache.has(signature);
  };
  
  // Build cache of existing events
  const buildEventCache = async () => {
    try {
      if (!currentUser?.uid || !familyId) return;
      
      const eventSignatures = new Set();
      
      // Process all events and add their signatures to the cache
      allEvents.forEach(event => {
        const signature = createEventSignature(event);
        eventSignatures.add(signature);
      });
      
      setEventCache(eventSignatures);
      console.log(`Cached ${eventSignatures.size} event signatures to prevent duplicates`);
    } catch (error) {
      console.error("Error building event cache:", error);
    }
  };
  
  // Helper function to get a unique key for an event
  const getEventKey = (event) => {
    if (!event) return null;
    
    let key = '';
    
    if (event.id) key += event.id; // Use ID first if available
    else {
      if (event.title) key += event.title;
      if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
      if (event.childName) key += '-' + event.childName;
      if (event.firestoreId) key += '-' + event.firestoreId;
    }
    
    return key.toLowerCase().replace(/\s+/g, '-');
  };
  
  // In src/components/calendar/RevisedFloatingCalendarWidget.jsx
// Enhance the loadAllEvents function:

// Load all calendar events
const loadAllEvents = async () => {
  try {
    setLoading(true);
    console.log("Loading all calendar events...");
    
    // Ensure we have the current user ID
    if (!currentUser?.uid) {
      console.warn("No user ID available, cannot load events");
      setLoading(false);
      return;
    }
    
    // Get general calendar events first
    const generalEvents = await loadGeneralCalendarEvents();
    console.log(`Loaded ${generalEvents.length} general calendar events`);
    
    // Process events to ensure they all have dateObj
    const processedGeneralEvents = generalEvents.map(event => {
      let dateObj = null;
      
      // Try to get a valid date from various possible fields
      if (event.start?.dateTime) {
        dateObj = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        dateObj = new Date(event.start.date);
      } else if (event.dateTime) {
        dateObj = new Date(event.dateTime);
      } else if (event.date) {
        dateObj = new Date(event.date);
      }
      
      // Skip events with invalid dates
      if (!dateObj || isNaN(dateObj.getTime())) {
        console.warn("Event has invalid date, using current date as fallback:", event.title || event.summary);
        dateObj = new Date();
      }
      
      return {
        ...event,
        dateObj,
        // Add missing title/summary if needed
        title: event.title || event.summary || "Untitled Event",
        summary: event.summary || event.title || "Untitled Event"
      };
    });
    
    // Get children data from Firebase
    const childrenData = await loadChildrenEvents();
    
    // Get family meeting data
    const familyMeetings = getUpcomingMeetings();
    
    // Get relationship events
    const relationshipEvents = await loadRelationshipEvents();
    
    // Get task events
    const taskEvents = await loadTaskEvents();
    
    // Track already added events
    const addedEventsMap = {};
    processedGeneralEvents.forEach(event => {
      const eventKey = getEventKey(event);
      if (eventKey) {
        addedEventsMap[eventKey] = true;
      }
    });
    setAddedEvents(addedEventsMap);
    
    // Combine all events
    const combined = [
      ...processedGeneralEvents,
      ...childrenData.childrenEvents || [],
      ...childrenData.childrenAppointments || [],
      ...childrenData.childrenActivities || [],
      ...familyMeetings,
      ...relationshipEvents,
      ...taskEvents
    ];
    
    // Process attendees for each event
    const processedEvents = combined.map(event => ({
      ...event,
      attendees: getEventAttendees(event)
    }));
    
    // Set all events
    setAllEvents(processedEvents);
    setLoading(false);
    
    console.log(`Final combined events: ${processedEvents.length}`);
    
    // Rebuild the event cache
    setTimeout(() => buildEventCache(), 300);
  } catch (error) {
    console.error("Error loading events:", error);
    setLoading(false);
  }
};
  
  // Load general calendar events from Firestore
  const loadGeneralCalendarEvents = async () => {
    return await CalendarService.getEventsForUser(
      currentUser?.uid, 
      new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
      new Date(new Date().setDate(new Date().getDate() + 365)) // 1 year ahead
    );
  };
  
  // Load children's events
  const loadChildrenEvents = async () => {
    // This function would extract events from familyMembers children data
    // Placeholder implementation - in a real app, you'd use your data-fetching logic
    const childrenData = { childrenEvents: [], childrenAppointments: [], childrenActivities: [] };
    
    // Update state
    setChildrenEvents(childrenData.childrenEvents || []);
    setChildrenAppointments(childrenData.childrenAppointments || []);
    setChildrenActivities(childrenData.childrenActivities || []);
    
    return childrenData;
  };
  
  // Load relationship events
  const loadRelationshipEvents = async () => {
    // Placeholder implementation - in a real app, you'd use your data-fetching logic
    const events = [];
    
    return events;
  };
  
  // Get upcoming family meetings
const getUpcomingMeetings = () => {
  const meetings = [];
  
  // Get family meeting for the current week if not completed
  if (weekStatus && weekStatus[currentWeek] && !weekStatus[currentWeek].completed) {
    const meetingDate = new Date();
    // If today is Sunday, set to today, otherwise set to next Sunday
    if (meetingDate.getDay() !== 0) {
      meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay())); // Next Sunday
    }
    meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
    
    // Create attendees list from all family members
    const attendees = familyMembers.map(member => ({
      id: member.id,
      name: member.name,
      profilePicture: member.profilePicture,
      role: member.role
    }));
    
    meetings.push({
      id: `meeting-${currentWeek}`,
      title: `Cycle ${currentWeek} Family Meeting`, // Changed "Week" to "Cycle"
      date: meetingDate.toISOString(),
      dateObj: meetingDate,
      category: 'meeting',
      eventType: 'meeting',
      weekNumber: currentWeek,
      linkedEntity: {
        type: 'meeting',
        id: currentWeek
      },
      attendees: attendees, // Add all family members as attendees
      attendingParentId: 'both' // Indicate both parents attending
    });
  }
  
  return meetings;
};
  
  // Load task events
  const loadTaskEvents = async () => {
    const events = [];
    
    // Convert task recommendations to calendar events
    if (taskRecommendations && taskRecommendations.length > 0) {
      taskRecommendations.forEach(task => {
        if (task.dueDate && !task.completed) {
          events.push({
            id: `task-${task.id}`,
            title: `Task Due: ${task.title}`,
            date: task.dueDate,
            dateObj: new Date(task.dueDate),
            category: 'task',
            eventType: 'task',
            assignedTo: task.assignedTo,
            assignedToName: task.assignedToName,
            linkedEntity: {
              type: 'task',
              id: task.id
            }
          });
        }
      });
    }
    
    return events;
  };
  
  // Get attendees for an event
const getEventAttendees = (event) => {
  let attendees = [];
  
  // For child events
  if (event.childName) {
    const child = familyMembers.find(m => m.id === event.childId || m.name === event.childName);
    if (child) {
      attendees.push({
        id: child.id,
        name: child.name,
        profilePicture: child.profilePicture,
        role: 'child'
      });
    } else if (event.childName) {
      attendees.push({
        id: event.childId || `child-${event.childName}`,
        name: event.childName,
        profilePicture: null,
        role: 'child'
      });
    }
  }
  
  // For siblings
  if (event.siblingIds && event.siblingIds.length > 0) {
    event.siblingIds.forEach(sibId => {
      const sibling = familyMembers.find(m => m.id === sibId);
      if (sibling && !attendees.some(a => a.id === sibling.id)) {
        attendees.push({
          id: sibling.id,
          name: sibling.name,
          profilePicture: sibling.profilePicture,
          role: 'child'
        });
      }
    });
  } else if (event.siblingNames && event.siblingNames.length > 0) {
    event.siblingNames.forEach(name => {
      const sibling = familyMembers.find(m => m.role === 'child' && m.name === name);
      if (sibling && !attendees.some(a => a.id === sibling.id)) {
        attendees.push({
          id: sibling.id,
          name: sibling.name,
          profilePicture: sibling.profilePicture,
          role: 'child'
        });
      } else if (!attendees.some(a => a.name === name)) {
        attendees.push({
          id: `sibling-${name}`,
          name: name,
          profilePicture: null,
          role: 'child'
        });
      }
    });
  }
  
  // For attendingParent
  if (event.attendingParentId) {
    if (event.attendingParentId === 'both') {
      // Add both parents
      const parents = familyMembers.filter(m => m.role === 'parent');
      parents.forEach(parent => {
        if (!attendees.some(a => a.id === parent.id)) {
          attendees.push({
            id: parent.id,
            name: parent.name,
            profilePicture: parent.profilePicture,
            role: 'parent'
          });
        }
      });
    } else if (event.attendingParentId !== 'undecided') {
      const parent = familyMembers.find(m => m.id === event.attendingParentId);
      if (parent && !attendees.some(a => a.id === parent.id)) {
        attendees.push({
          id: parent.id,
          name: parent.name,
          profilePicture: parent.profilePicture,
          role: 'parent'
        });
      }
    }
  }

  // For host parent (if available)
  if (event.hostParent) {
    // Try to find a parent with this name
    const hostParentName = event.hostParent;
    const hostParent = familyMembers.find(m => 
      m.role === 'parent' && m.name === hostParentName
    );
    
    if (hostParent && !attendees.some(a => a.id === hostParent.id)) {
      attendees.push({
        id: hostParent.id,
        name: hostParent.name,
        profilePicture: hostParent.profilePicture,
        role: 'parent'
      });
    } else if (!attendees.some(a => a.name === hostParentName)) {
      // If not found in family members, still add as generic attendee
      attendees.push({
        id: `host-${hostParentName}`,
        name: hostParentName,
        profilePicture: null,
        role: 'host'
      });
    }
  }
  
  return attendees;
};
  
  // In src/components/calendar/RevisedFloatingCalendarWidget.jsx
// Replace the getEventsForSelectedDate function with this improved version:

// Get events for the currently selected date, filtered by view and member
const getEventsForSelectedDate = () => {
  if (!selectedDate) return [];
  
  return allEvents.filter(event => {
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
      console.log("Skipping event with invalid date:", event.title || event.summary);
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
  
  // Filter events based on the current view type
  const filterEventsByView = (events) => {
    return events.filter(event => 
      view === 'all' || 
      (view === 'appointments' && (event.category === 'medical' || event.eventType === 'appointment')) ||
      (view === 'activities' && (event.category === 'activity' || event.eventType === 'activity')) ||
      (view === 'tasks' && (event.category === 'task' || event.eventType === 'task' || event.eventType === 'homework')) ||
      (view === 'meetings' && (event.category === 'meeting' || event.eventType === 'meeting'))
    );
  };
  
  // Get upcoming events, filtered by view and member
  const getUpcomingEvents = () => {
    // Apply member filter
    let filtered = allEvents.filter(event => {
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
    return filtered.sort((a, b) => a.dateObj - b.dateObj).slice(0, 5);
  };
  
  // Get filtered task recommendations
  const getFilteredTasks = () => {
    if (!taskRecommendations) return [];
    
    return taskRecommendations
      .filter(task => !task.completed)
      // Apply member filter for tasks
      .filter(task => {
        if (selectedMember === 'all') return true;
        return selectedMember === task.assignedTo || selectedMember === task.assignedToName;
      })
      .slice(0, 3);
  };
  
  // Add generic event handlers
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
    setIsEditingEvent(false);
    setEditedEvent(null);
  };
  
  const handleEventAdd = async (event) => {
    try {
      // Check if event already exists
      if (eventExists(event)) {
        console.log("Event already exists in calendar, preventing duplicate");
        CalendarService.showNotification("Event already exists in your calendar", "info");
        return;
      }
      
      // Determine event type and call appropriate handler
      if (event.eventType === 'appointment' || event.eventType === 'activity' || 
          event.eventType === 'event' || event.eventType === 'homework') {
        await handleAddChildEventToCalendar(event);
      } else if (event.eventType === 'meeting') {
        await handleAddMeetingToCalendar(event);
      } else if (event.eventType === 'task') {
        await handleAddTaskToCalendar(event);
      } else {
        await handleAddChildEventToCalendar(event);
      }
    } catch (error) {
      console.error("Error adding event:", error);
      CalendarService.showNotification("Failed to add event to calendar", "error");
    }
  };
  
  // Update the handleEventEdit function
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
  setShowEventDetails(true);
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
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      
      if (result.success) {
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
        await buildEventCache();
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
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      
      if (result.success) {
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
        await buildEventCache();
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
      
      // The implementaiton would use CalendarService to add the proper event type
      // For brevity, we're using a simplified version
      
      const calendarEvent = {
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start: {
          dateTime: event.dateObj.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(event.dateObj.getTime() + 60*60000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        linkedEntity: event.linkedEntity
      };
      
      // Add event to calendar
      const result = await CalendarService.addEvent(calendarEvent, currentUser.uid);
      
      if (result.success) {
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
        await buildEventCache();
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
      
      // Delete using CalendarService
      const result = await CalendarService.deleteEvent(eventId, currentUser?.uid);
      
      if (result.success) {
        // Update local state
        setAddedEvents(prev => {
          const newState = {...prev};
          delete newState[getEventKey(event)];
          return newState;
        });
        
        // Remove from all events array
        setAllEvents(prev => prev.filter(e => 
          e.firestoreId !== eventId && 
          e.universalId !== (event.universalId || eventId) && 
          e.id !== eventId
        ));
        
        // Close the details modal
        setShowEventDetails(false);
        
        // Refresh events
        setTimeout(() => {
          setLastRefresh(Date.now());
          buildEventCache();
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
      
      // Update event using CalendarService
      const result = await CalendarService.updateEvent(updatedEvent.firestoreId, eventUpdate, currentUser?.uid);
      
      if (result.success) {
        // Update local state
        setAllEvents(prev => 
          prev.map(event => 
            event.firestoreId === updatedEvent.firestoreId 
              ? { ...event, ...updatedEvent } 
              : event
          )
        );
        
        // Close edit mode and update selected event
        setIsEditingEvent(false);
        setSelectedEvent({
          ...selectedEvent,
          ...updatedEvent
        });
        
        // Show notification
        CalendarService.showNotification("Event updated successfully", "success");
        
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
  
  // Event date objects for calendar highlighting
const eventDates = allEvents
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
        className="bg-white border border-black shadow-lg rounded-lg flex flex-col relative"
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
          />
          {/* Add Event Button */}
<div className="mb-4 mt-1">
  <button
    onClick={() => {
      // Create a state variable for this at the top of the component
      setShowEventManager(true);
    }}
    className="w-full py-2 px-3 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors flex items-center justify-center"
  >
    <PlusCircle size={16} className="mr-2" />
    Add New Event
  </button>
</div>

{/* Then add at the bottom of the component, just before the final closing div: */}
{/* Event Manager Modal */}
{showEventManager && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <EnhancedEventManager
        selectedDate={selectedDate}
        onSave={(result) => {
          setShowEventManager(false);
          // Refresh events after saving
          setLastRefresh(Date.now());
          // Show success notification
          if (result?.success) {
            CalendarService.showNotification("Event added successfully", "success");
          }
        }}
        onCancel={() => setShowEventManager(false)}
      />
    </div>
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
            loading={loading}
            title={`Events for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            emptyMessage="No events scheduled for this date"
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
      
      {/* Event Details Modal - Use EnhancedEventManager for editing */}
{showEventDetails && selectedEvent && (
  isEditingEvent ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <EnhancedEventManager
          initialEvent={selectedEvent}
          onSave={(result) => {
            if (result?.success) {
              // Close the editor
              setShowEventDetails(false);
              setIsEditingEvent(false);
              
              // Update local data and refresh
              setLastRefresh(Date.now());
              CalendarService.showNotification("Event updated successfully", "success");
            }
          }}
          onCancel={() => {
            setShowEventDetails(false);
            setIsEditingEvent(false);
          }}
          mode="edit"
        />
      </div>
    </div>
  ) : (
    <EventDetails
      event={selectedEvent}
      onClose={() => {
        setShowEventDetails(false);
        setIsEditingEvent(false);
        setEditedEvent(null);
      }}
      onEdit={() => {
        setIsEditingEvent(true);
        setEditedEvent({...selectedEvent});
      }}
      onDelete={handleDeleteEvent}
      onUpdate={handleUpdateEvent}
      familyMembers={familyMembers}
      pendingAction={pendingAction}
      showSuccess={false}
    />
  )
)}
    </div>
  );
};

export default RevisedFloatingCalendarWidget;