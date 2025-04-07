import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, X, MinusSquare, RefreshCw, ChevronLeft, ChevronRight, 
  ArrowUpRight, AlertCircle, Activity, BookOpen, Heart, Bell, 
  ChevronUp, ChevronDown, Users, MapPin, Clock, Info, User, Check,
  Edit, Trash2, Link, ExternalLink, Filter
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import AllieCalendarEvents from './AllieCalendarEvents';
import DatabaseService from '../../services/DatabaseService';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import CalendarErrorHandler from '../../utils/CalendarErrorHandler';

const FloatingCalendarWidget = () => {
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
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [childrenEvents, setChildrenEvents] = useState([]);
  const [childrenAppointments, setChildrenAppointments] = useState([]);
  const [childrenActivities, setChildrenActivities] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [view, setView] = useState('all'); // 'all', 'tasks', 'appointments', 'activities'
  const [loading, setLoading] = useState(false);
  const [widgetHeight, setWidgetHeight] = useState(40);
  const [widgetWidth, setWidgetWidth] = useState(64);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [addedEvents, setAddedEvents] = useState({});
  const [showAddedMessage, setShowAddedMessage] = useState({});
  const [isDragging, setIsDragging] = useState(null); // 'width', 'height', or 'both'
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 });
  const [selectedMember, setSelectedMember] = useState('all'); // New state for member filtering
  const [pendingAction, setPendingAction] = useState(null); // Track pending delete/update operations
  
  const widgetRef = useRef(null);
  const dragHandleRef = useRef(null);

  // Add event cache to prevent duplicate event creation
  const [eventCache, setEventCache] = useState(new Set());
  
  // Function to fetch all event IDs and cache them to prevent duplicates
const buildEventCache = async () => {
  try {
    if (!currentUser?.uid || !familyId) return;
    
    const eventsQuery = query(
      collection(db, "calendar_events"),
      where("userId", "==", currentUser.uid)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    const eventSignatures = new Set();
    
    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      // Create a unique signature for each event
      const signature = `${eventData.summary || eventData.title || ''}-${eventData.start?.dateTime || eventData.start?.date || ''}-${eventData.location || ''}`;
      eventSignatures.add(signature);
    });
    
    setEventCache(eventSignatures);
    console.log(`Cached ${eventSignatures.size} event signatures to prevent duplicates`);
  } catch (error) {
    console.error("Error building event cache:", error);
  }
};

// Helper function to check if an event already exists
const eventExists = (event) => {
  const signature = `${event.title || event.summary || ''}-${event.date || event.dateObj?.toISOString() || ''}-${event.location || ''}`;
  return eventCache.has(signature);
};

// Use effect for initializing event cache
useEffect(() => {
  if (isOpen && currentUser?.uid) {
    buildEventCache();
  }
}, [isOpen, currentUser]);
  
// Enhanced initialization to handle calendar-related errors cleanly
useEffect(() => {
  // Start error suppression for non-critical calendar errors
  CalendarErrorHandler.suppressApiErrors();
  
  // Clean up on unmount
  return () => {
    CalendarErrorHandler.restoreConsoleError();
  };
}, []);


  // Enhanced initialization to handle calendar-related errors cleanly
  useEffect(() => {
    // Start error suppression for non-critical calendar errors
    CalendarErrorHandler.suppressApiErrors();
    
    // Clean up on unmount
    return () => {
      CalendarErrorHandler.restoreConsoleError();
    };
  }, []);
  


  // Use effect for initializing event cache
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      buildEventCache();
    }
  }, [isOpen, currentUser]);
  
  // Helper function to get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Helper function to get day of week for first day of month
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const prevMonth = new Date(prev);
      prevMonth.setMonth(prev.getMonth() - 1);
      return prevMonth;
    });
  };
  
  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(prev.getMonth() + 1);
      return nextMonth;
    });
  };




// Use effect for initializing event cache
useEffect(() => {
  if (isOpen && currentUser?.uid) {
    buildEventCache();
  }
}, [isOpen, currentUser]);
  
  // Calculate today's day of month
  const today = new Date();
  const isToday = (date) => {
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Set up automatic refresh interval
  useEffect(() => {
    if (isOpen) {
      const refreshInterval = setInterval(() => {
        setLastRefresh(Date.now()); // Trigger a refresh
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [isOpen]);
  
  // Load all events when the widget opens or refresh is triggered
  useEffect(() => {
    if (isOpen && familyId) {
      loadAllEvents();
    }
  }, [isOpen, familyId, lastRefresh, selectedDate]);

  // Inside the FloatingCalendarWidget component, after the initial useEffect hooks
  useEffect(() => {
    // Function to reload events
    const refreshEvents = () => {
      setLastRefresh(Date.now());
    };
    
    // Set up event listener for calendar updates
    window.addEventListener('calendar-event-added', refreshEvents);
    
    // Clean up
    return () => {
      window.removeEventListener('calendar-event-added', refreshEvents);
    };
  }, []);
  
  // Drag to resize functionality
  useEffect(() => {
    if (!isDragging || !widgetRef.current) return;

    const handleMouseMove = (e) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startDragPos.x;
      const deltaY = e.clientY - startDragPos.y;
      
      // Calculate new dimensions based on drag direction
      if (isDragging === 'width' || isDragging === 'both') {
        const newWidth = Math.max(40, startDimensions.width + deltaX / 16); // Convert pixels to rem
        setWidgetWidth(newWidth);
      }
      
      if (isDragging === 'height' || isDragging === 'both') {
        const newHeight = Math.max(30, startDimensions.height + deltaY / 16); // Convert pixels to rem
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
  
  // Helper to generate a unique key for an event
  const getEventKey = (event) => {
    if (!event) return null;
    
    // Try to create a unique identifier based on event properties
    let key = '';
    
    if (event.id) key += event.id; // Use ID first if available
    else {
      if (event.title) key += event.title;
      if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
      if (event.childName) key += '-' + event.childName;
      // If ID was missing but we have firestoreId, add it
      if (event.firestoreId) key += '-' + event.firestoreId;
    }
    
    return key.toLowerCase().replace(/\s+/g, '-');
  };
  
  // Load general calendar events (from the calendar_events collection)
  const loadGeneralCalendarEvents = async () => {
    try {
      if (!currentUser?.uid || !familyId) {
        return [];
      }
      
      // Get date range
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30); // Include events from past month
      
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 365); // Show events up to a year ahead
      
      // Query Firestore to get all calendar events for this user
      const eventsQuery = query(
        collection(db, "calendar_events"),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        
        // Filter by date range if dates are provided
        const startTime = new Date(eventData.start?.dateTime || eventData.start?.date || eventData.date || Date.now());
        
        if (startTime >= timeMin && startTime <= timeMax) {
          events.push({
            id: doc.id,
            title: eventData.summary || eventData.title || 'Untitled Event',
            date: eventData.start?.dateTime || eventData.start?.date || eventData.date,
            dateObj: startTime,
            time: startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            category: eventData.category || 'calendar',
            eventType: eventData.eventType || 'general',
            location: eventData.location || '',
            description: eventData.description || '',
            attendees: eventData.attendees || [],
            firestoreId: doc.id, // Store Firestore document ID for deletion/updates
            dateEndObj: eventData.end?.dateTime ? new Date(eventData.end.dateTime) : null,
            linkedEntity: eventData.linkedEntity || null
          });
        }
      });
      
      console.log(`Found ${events.length} general calendar events`);
      return events;
    } catch (error) {
      console.error("Error loading general calendar events:", error);
      return [];
    }
  };
  
  // Load all events from various sources
  const loadAllEvents = async () => {
    try {
      setLoading(true);
      
      // Get children data from Firebase
      const childrenData = await loadChildrenEvents();
      
      // Get family meeting data
      const familyMeetings = getUpcomingMeetings();
      
      // Get relationship events
      const relationshipEvents = await loadRelationshipEvents();
      
      // Get task events
      const taskEvents = await loadTaskEvents();
      
      // Get general calendar events (including those added via chat)
      const generalEvents = await loadGeneralCalendarEvents();
      
      // Track already added events
      const addedEventsMap = {};
      generalEvents.forEach(event => {
        const eventKey = getEventKey(event);
        if (eventKey) {
          addedEventsMap[eventKey] = true;
        }
      });
      setAddedEvents(addedEventsMap);
      
      // Combine all events
      const combined = [
        ...childrenData.childrenEvents || [],
        ...childrenData.childrenAppointments || [],
        ...childrenData.childrenActivities || [],
        ...familyMeetings,
        ...relationshipEvents,
        ...taskEvents,
        ...generalEvents // Include chat-added events
      ];
      
      // Clean up events - ensure no duplicates by checking for similar events
      const cleanedEvents = [];
      const eventSignatures = new Set();
      
      combined.forEach(event => {
        // Create signature based on title and date
        const dateStr = event.dateObj ? event.dateObj.toISOString().split('T')[0] : '';
        const signature = `${event.title}-${dateStr}`;
        
        // Only add if we haven't seen this signature before
        if (!eventSignatures.has(signature)) {
          eventSignatures.add(signature);
          cleanedEvents.push(event);
        }
      });
      
      setAllEvents(cleanedEvents);
      setLoading(false);
    } catch (error) {
      console.error("Error loading events:", error);
      setLoading(false);
    }
  };

  // Load children's events from Firebase
  const loadChildrenEvents = async () => {
    try {
      if (!familyId) {
        return { childrenEvents: [], childrenAppointments: [], childrenActivities: [] };
      }
      
      // Get children data from Firebase using Firestore v9 syntax
      const docRef = doc(db, "families", familyId);
      const docSnapshot = await getDoc(docRef);
      const childrenData = { childrenEvents: [], childrenAppointments: [], childrenActivities: [] };
      
      if (docSnapshot.exists() && docSnapshot.data().childrenData) {
        const data = docSnapshot.data().childrenData;
        
        // Process appointments
        const appointments = [];
        const activities = [];
        const events = [];
        
        // Loop through each child's data
        Object.entries(data).forEach(([childId, childData]) => {
          const childName = getChildName(childId);
          
          // Medical appointments
          if (childData.medicalAppointments) {
            childData.medicalAppointments.forEach(appointment => {
              if (!appointment.completed && new Date(appointment.date) >= today) {
                const event = {
                  ...appointment,
                  childId,
                  childName,
                  eventType: 'appointment',
                  category: 'medical',
                  dateObj: new Date(appointment.date),
                  linkedEntity: {
                    type: 'child',
                    id: childId
                  }
                };
                appointments.push(event);
                events.push(event);
              }
            });
          }
          
          // Activities
          if (childData.activities) {
            childData.activities.forEach(activity => {
              if (new Date(activity.startDate) >= today) {
                const event = {
                  ...activity,
                  childId,
                  childName,
                  eventType: 'activity',
                  category: 'activity',
                  dateObj: new Date(activity.startDate),
                  linkedEntity: {
                    type: 'child',
                    id: childId
                  }
                };
                activities.push(event);
                events.push(event);
              }
            });
          }
          
          // Events
          if (childData.events) {
            childData.events.forEach(event => {
              if (new Date(event.date) >= today) {
                const calEvent = {
                  ...event,
                  childId,
                  childName,
                  eventType: 'event',
                  category: 'event',
                  dateObj: new Date(event.date),
                  linkedEntity: {
                    type: 'child',
                    id: childId
                  }
                };
                events.push(calEvent);
              }
            });
          }
          
          // Homework
          if (childData.homework) {
            childData.homework.forEach(homework => {
              if (!homework.completed && new Date(homework.dueDate) >= today) {
                const event = {
                  ...homework,
                  title: `${homework.title} Due`,
                  childId,
                  childName,
                  eventType: 'homework',
                  category: 'homework',
                  dateObj: new Date(homework.dueDate),
                  linkedEntity: {
                    type: 'child',
                    id: childId
                  }
                };
                events.push(event);
              }
            });
          }
        });
        
        // Sort by date
        appointments.sort((a, b) => a.dateObj - b.dateObj);
        activities.sort((a, b) => a.dateObj - b.dateObj);
        events.sort((a, b) => a.dateObj - b.dateObj);
        
        childrenData.childrenAppointments = appointments;
        childrenData.childrenActivities = activities;
        childrenData.childrenEvents = events;
      }
      
      // Set state values
      setChildrenEvents(childrenData.childrenEvents || []);
      setChildrenAppointments(childrenData.childrenAppointments || []);
      setChildrenActivities(childrenData.childrenActivities || []);
      
      return childrenData;
    } catch (error) {
      console.error("Error loading children events:", error);
      return { childrenEvents: [], childrenAppointments: [], childrenActivities: [] };
    }
  };
  
  // Load relationship events
  const loadRelationshipEvents = async () => {
    try {
      const events = [];
      
      // Get couple check-in data
      if (coupleCheckInData) {
        Object.entries(coupleCheckInData).forEach(([weekNum, data]) => {
          if (data.scheduledDate) {
            const checkInDate = new Date(data.scheduledDate);
            if (checkInDate >= today) {
              events.push({
                id: `couple-checkin-${weekNum}`,
                title: `Couple Check-in (Cycle ${weekNum})`, // Changed "Week" to "Cycle"
                date: data.scheduledDate,
                dateObj: checkInDate,
                category: 'relationship',
                eventType: 'relationship',
                linkedEntity: {
                  type: 'relationship',
                  id: weekNum
                }
              });
            }
          }
        });
      }
      
      // Get relationship strategies data using Firestore v9 syntax
      const stratDocRef = doc(db, "relationshipStrategies", familyId);
      const stratDocSnapshot = await getDoc(stratDocRef);
      
      if (stratDocSnapshot.exists()) {
        const strategies = stratDocSnapshot.data().strategies || [];
        
        strategies.forEach(strategy => {
          if (strategy.scheduledDate && new Date(strategy.scheduledDate) >= today) {
            events.push({
              id: `strategy-${strategy.id}`,
              title: `Relationship Strategy: ${strategy.name}`,
              date: strategy.scheduledDate,
              dateObj: new Date(strategy.scheduledDate),
              category: 'relationship',
              eventType: 'strategy',
              linkedEntity: {
                type: 'relationship',
                id: strategy.id
              }
            });
          }
        });
      }
      
      return events;
    } catch (error) {
      console.error("Error loading relationship events:", error);
      return [];
    }
  };
  
  // Load task events
  const loadTaskEvents = async () => {
    try {
      const events = [];
      
      // Get tasks with deadlines
      if (taskRecommendations && taskRecommendations.length > 0) {
        taskRecommendations.forEach(task => {
          // Add the current week family meeting based on the task tab data
          if (task.title && task.title.toLowerCase().includes('family meeting') && 
              !task.completed && !events.some(e => e.title && e.title.includes('Family Meeting'))) {
            
            // Set meeting date to the next Sunday or use task due date if available
            let meetingDate;
            if (task.dueDate) {
              meetingDate = new Date(task.dueDate);
            } else {
              meetingDate = new Date();
              // If today is Sunday, set to today, otherwise set to next Sunday
              if (meetingDate.getDay() !== 0) {
                meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay())); // Next Sunday
              }
              meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
            }
            
            events.push({
              id: `family-meeting-${currentWeek}`,
              title: `Cycle ${currentWeek} Family Meeting`, // Changed "Week" to "Cycle"
              date: meetingDate.toISOString(),
              dateObj: meetingDate,
              category: 'meeting',
              eventType: 'meeting',
              weekNumber: currentWeek,
              linkedEntity: {
                type: 'meeting',
                id: task.id
              }
            });
          }
          
          // Regular task due dates
          if (task.dueDate && !task.completed && new Date(task.dueDate) >= today) {
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
    } catch (error) {
      console.error("Error loading task events:", error);
      return [];
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get child name by ID
  const getChildName = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : "Unknown Child";
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
        }
      });
    }
    
    return meetings;
  };
  
  // Add task to calendar
  const handleAddTaskToCalendar = async (task) => {
    try {
      if (!currentUser || !task) return;
      
      // Prevent duplicate event creation by checking the event cache
      if (eventExists(task)) {
        console.log("Event already exists in calendar, preventing duplicate");
        CalendarService.showNotification("Event already exists in your calendar", "info");
        return;
      }
      
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
      
      // Add task's linkedEntity information to preserve the connection
      event.linkedEntity = {
        type: 'task',
        id: task.id
      };
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      
      if (result.success) {
        // Mark as added in our tracking
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(task)]: true
        }));
        
        // Show "Added" message temporarily, then replace with edit icons
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
        
        // Show a simple notification
        CalendarService.showNotification("Task added to calendar", "success");
        
        // Refresh events and event cache
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
      
      // Prevent duplicate event creation by checking the event cache
      if (eventExists(meeting)) {
        console.log("Event already exists in calendar, preventing duplicate");
        CalendarService.showNotification("Event already exists in your calendar", "info");
        return;
      }
      
      // Create event from meeting
      const event = CalendarService.createFamilyMeetingEvent(meeting.weekNumber, meeting.dateObj);
      
      // Rename from "Week" to "Cycle" in the title
      event.summary = event.summary.replace("Week", "Cycle");
      
      // Add meeting's linkedEntity information to preserve the connection
      event.linkedEntity = meeting.linkedEntity || {
        type: 'meeting',
        id: meeting.weekNumber
      };
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      
      if (result.success) {
        // Mark as added in our tracking
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(meeting)]: true
        }));
        
        // Show "Added" message temporarily, then replace with edit icons
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
        
        // Show a simple notification
        CalendarService.showNotification("Meeting added to calendar", "success");
        
        // Refresh events and event cache
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
      
      // Prevent duplicate event creation by checking the event cache
      if (eventExists(event)) {
        console.log("Event already exists in calendar, preventing duplicate");
        CalendarService.showNotification("Event already exists in your calendar", "info");
        return;
      }
      
      let calendarEvent;
      
      // Create different event types based on the event type
      switch(event.eventType) {
        case 'appointment':
          // Medical appointment
          calendarEvent = {
            summary: `${event.childName}'s ${event.title}`,
            description: event.notes || `Medical appointment: ${event.title}`,
            start: {
              dateTime: event.time 
                ? `${event.date}T${event.time}:00` 
                : `${event.date}T09:00:00`,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: event.time 
                ? `${event.date}T${event.time.split(':')[0]}:${parseInt(event.time.split(':')[1]) + 30}:00` 
                : `${event.date}T10:00:00`,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 } // 1 hour before
              ]
            },
            location: event.location || "TBD",
            linkedEntity: event.linkedEntity
          };
          break;
          
        case 'activity':
          // Activity (sports, classes, etc.)
          const startDate = new Date(event.startDate);
          
          // Set time if provided
          if (event.time) {
            const [hours, minutes] = event.time.split(':');
            startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            startDate.setHours(15, 0, 0, 0); // Default to 3:00 PM
          }
          
          // End date is either the provided end date or 1 hour after start
          const endDate = event.endDate 
            ? new Date(event.endDate) 
            : new Date(startDate.getTime() + 60*60000); // 1 hour
          
          // If end date is provided but no end time, use the same time as start
          if (event.endDate && !event.endTime) {
            endDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
          }
          
          // Add 1 hour to end time if same as start time
          if (endDate.getTime() === startDate.getTime()) {
            endDate.setTime(endDate.getTime() + 60*60000);
          }
          
          calendarEvent = {
            summary: `${event.childName}'s ${event.title}`,
            description: event.notes || `${event.type?.charAt(0).toUpperCase() + event.type?.slice(1) || 'Activity'}: ${event.title}`,
            location: event.location || "TBD",
            start: {
              dateTime: startDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 60 }, // 1 hour before
                { method: 'popup', minutes: 10 } // 10 minutes before
              ]
            },
            linkedEntity: event.linkedEntity
          };
          
          // Add recurrence if applicable
          if (event.repeatDay && event.repeatDay.length > 0) {
            const dayMap = {
              'Sunday': 'SU', 'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE',
              'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA'
            };
            
            const byday = event.repeatDay.map(day => dayMap[day]).join(',');
            calendarEvent.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`];
          }
          break;
          
        case 'event':
          // Special event
          const eventDate = new Date(event.date);
          
          // Set time if provided
          if (event.time) {
            const [hours, minutes] = event.time.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            // Default times based on event type
            if (event.type === 'birthday') {
              eventDate.setHours(14, 0, 0, 0); // 2:00 PM
            } else if (event.type === 'school') {
              eventDate.setHours(9, 0, 0, 0); // 9:00 AM
            } else {
              eventDate.setHours(12, 0, 0, 0); // 12:00 PM
            }
          }
          
          // End time is 2 hours after start
          const eventEndDate = new Date(eventDate.getTime() + 2*60*60000);
          
          calendarEvent = {
            summary: `${event.childName}'s ${event.title}`,
            description: event.description || `${event.type?.charAt(0).toUpperCase() + event.type?.slice(1) || 'Event'}: ${event.title}`,
            location: event.location || "TBD",
            start: {
              dateTime: eventDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: eventEndDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 } // 1 hour before
              ]
            },
            linkedEntity: event.linkedEntity
          };
          
          // If it's a birthday, make it recurring annually
          if (event.type === 'birthday') {
            calendarEvent.recurrence = ['RRULE:FREQ=YEARLY'];
          }
          break;
          
        case 'homework':
          // Homework due date
          const dueDate = new Date(event.dueDate);
          dueDate.setHours(17, 0, 0, 0); // Default to 5:00 PM
          
          calendarEvent = {
            summary: `${event.childName}'s ${event.subject} Homework Due`,
            description: event.description || `${event.title} - ${event.subject} assignment due`,
            location: "School",
            start: {
              dateTime: dueDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(dueDate.getTime() + 30*60000).toISOString(), // 30 minutes
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 120 } // 2 hours before
              ]
            },
            linkedEntity: event.linkedEntity
          };
          break;
          
        case 'general':
          // General events added through chat or other means
          const generalDate = event.dateObj;
          
          calendarEvent = {
            summary: event.title,
            description: event.description || '',
            location: event.location || "TBD",
            start: {
              dateTime: generalDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(generalDate.getTime() + 60*60000).toISOString(), // 1 hour duration
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            linkedEntity: event.linkedEntity
          };
          break;
          
        default:
          // Default event
          calendarEvent = {
            summary: event.title,
            description: event.description || event.notes || '',
            location: event.location || "TBD",
            start: {
              dateTime: event.dateObj.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(event.dateObj.getTime() + 60*60000).toISOString(), // 1 hour duration
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            linkedEntity: event.linkedEntity
          };
      }
      
      // Add event to calendar
      if (calendarEvent) {
        const result = await CalendarService.addEvent(calendarEvent, currentUser.uid);
        
        if (result.success) {
          // Mark as added in our tracking
          setAddedEvents(prev => ({
            ...prev,
            [getEventKey(event)]: true
          }));
          
          // Show "Added" message temporarily, then replace with edit icons
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
          CalendarService.showNotification(`${event.childName ? `${event.childName}'s ` : ''}${event.title || 'event'} added to calendar`, "success");
          
          // Refresh events and event cache
          await buildEventCache();
          setLastRefresh(Date.now());
        }
      }
    } catch (error) {
      console.error("Error adding child event to calendar:", error);
      CalendarService.showNotification("Failed to add event to calendar", "error");
    }
  };
  
  // Get events for the selected date based on member filter
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return allEvents.filter(event => {
      // Check date match
      const eventDate = event.dateObj;
      const dateMatch = eventDate.getDate() === selectedDate.getDate() &&
                          eventDate.getMonth() === selectedDate.getMonth() &&
                          eventDate.getFullYear() === selectedDate.getFullYear();
      
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
        const attendees = getEventAttendees(event);
        const hasSelectedMember = attendees.some(
          attendee => attendee.id === selectedMember || attendee.name === selectedMember
        );
        
        if (!hasSelectedMember && !event.childName && !event.assignedTo) {
          return false;
        }
      }
      
      return dateMatch;
    });
  };
  
  // Get icon for event type
  const getEventIcon = (event) => {
    switch (event.eventType) {
      case 'appointment':
        return <AlertCircle size={14} className="text-red-500 mr-1" />;
      case 'activity':
        return <Activity size={14} className="text-blue-500 mr-1" />;
      case 'homework':
        return <BookOpen size={14} className="text-green-500 mr-1" />;
      case 'event':
        return <Bell size={14} className="text-purple-500 mr-1" />;
      case 'meeting':
        return <Users size={14} className="text-indigo-500 mr-1" />;
      case 'relationship':
        return <Heart size={14} className="text-pink-500 mr-1" />;
      case 'task':
        return <Clock size={14} className="text-amber-500 mr-1" />;
      case 'general':
        return <Calendar size={14} className="text-blue-500 mr-1" />;
      default:
        return <Calendar size={14} className="text-gray-500 mr-1" />;
    }
  };
  
  // Get the attendees avatars for an event
  const getEventAttendees = (event) => {
    let attendees = [];
    
    // For child events
    if (event.childName) {
      const child = familyMembers.find(m => m.name === event.childName);
      if (child) {
        attendees.push({
          id: child.id,
          name: child.name,
          profilePicture: child.profilePicture
        });
      }
    }
    
    // For tasks
    if (event.assignedToName) {
      const member = familyMembers.find(m => m.name === event.assignedToName || m.roleType === event.assignedTo);
      if (member) {
        attendees.push({
          id: member.id,
          name: member.name,
          profilePicture: member.profilePicture
        });
      }
    }
    
    // For family meetings, include all family members
    if (event.eventType === 'meeting' && event.title && event.title.includes('Family Meeting')) {
      attendees = familyMembers.map(member => ({
        id: member.id,
        name: member.name,
        profilePicture: member.profilePicture
      }));
    }
    
    // For couple check-ins and relationship events, include parents
    if (event.category === 'relationship') {
      attendees = familyMembers
        .filter(member => member.role === 'parent')
        .map(member => ({
          id: member.id,
          name: member.name,
          profilePicture: member.profilePicture
        }));
    }
    
    // If we have explicit attendees from the event data, use those
    if (event.attendees && event.attendees.length > 0) {
      return event.attendees;
    }
    
    return attendees;
  };
  
  // Function to navigate to linked entity - Enhanced to properly handle family meetings
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
        // Open the family meeting dialog if available
        if (typeof window !== 'undefined') {
          // Method 1: Check if the global openFamilyMeeting function exists
          if (window.openFamilyMeeting) {
            window.openFamilyMeeting();
          } 
          // Method 2: Dispatch a custom event that the dashboard will listen for
          else {
            const meetingEvent = new CustomEvent('open-family-meeting', { 
              detail: { weekNumber: id } 
            });
            window.dispatchEvent(meetingEvent);
            
            // As fallback, also navigate to tasks tab where the meeting button is available
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
  
  // Delete event from calendar - Enhanced with error handling
  const deleteEvent = async (event) => {
    try {
      setPendingAction('delete');
      
      if (!event || !event.firestoreId) {
        CalendarService.showNotification("Cannot delete this event - no valid ID found", "error");
        setPendingAction(null);
        return;
      }
      
      // Delete from Firestore
      const docRef = doc(db, "calendar_events", event.firestoreId);
      await deleteDoc(docRef);
      
      // Update local state
      setAddedEvents(prev => {
        const newState = {...prev};
        delete newState[getEventKey(event)];
        return newState;
      });
      
      // Remove from all events array
      setAllEvents(prev => prev.filter(e => 
        e.firestoreId !== event.firestoreId
      ));
      
      // Close the details modal
      setShowEventDetails(false);
      
      // Show notification
      CalendarService.showNotification("Event deleted successfully", "success");
      
      // Refresh events
      setLastRefresh(Date.now());
      await buildEventCache();
      
      setPendingAction(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      CalendarService.showNotification("Failed to delete event: " + error.message, "error");
      setPendingAction(null);
    }
  };
  
  // Update event - Enhanced with error handling
  const updateEvent = async () => {
    try {
      setPendingAction('update');
      
      if (!editedEvent || !editedEvent.firestoreId) {
        CalendarService.showNotification("Cannot update this event - no valid ID found", "error");
        setPendingAction(null);
        return;
      }
      
      // Preserve linkedEntity when updating
      const linkedEntity = editedEvent.linkedEntity || selectedEvent?.linkedEntity;
      
      // Create updated event object
      const updatedEvent = {
        summary: editedEvent.title,
        description: editedEvent.description || '',
        location: editedEvent.location || 'TBD',
        linkedEntity
      };
      
      // Update date/time if changed
      if (editedEvent.dateObj) {
        updatedEvent.start = {
          dateTime: editedEvent.dateObj.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Calculate end time (preserve duration if available)
        const duration = editedEvent.dateEndObj && selectedEvent.dateObj 
          ? editedEvent.dateEndObj.getTime() - selectedEvent.dateObj.getTime()
          : 60 * 60 * 1000; // Default 1 hour
        
        const endDate = new Date(editedEvent.dateObj.getTime() + duration);
        
        updatedEvent.end = {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
      
      // Update in Firestore
      const docRef = doc(db, "calendar_events", editedEvent.firestoreId);
      await updateDoc(docRef, updatedEvent);
      
      // Update local state
      setAllEvents(prev => 
        prev.map(event => 
          event.firestoreId === editedEvent.firestoreId 
            ? { ...event, ...editedEvent } 
            : event
        )
      );
      
      // Close edit mode and update selected event
      setIsEditingEvent(false);
      setSelectedEvent({
        ...selectedEvent,
        ...editedEvent
      });
      
      // Show notification
      CalendarService.showNotification("Event updated successfully", "success");
      
      // Refresh events
      setLastRefresh(Date.now());
      
      setPendingAction(null);
    } catch (error) {
      console.error("Error updating event:", error);
      CalendarService.showNotification("Failed to update event: " + error.message, "error");
      setPendingAction(null);
    }
  };
  
  // Render the calendar days
  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Generate blank spaces for days before the first of the month
    const blanks = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      blanks.push(
        <div key={`blank-${i}`} className="h-8 w-8"></div>
      );
    }
    
    // Generate calendar days
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelectedDate = date.getDate() === selectedDate.getDate() && 
                            date.getMonth() === selectedDate.getMonth() && 
                            date.getFullYear() === selectedDate.getFullYear();
      
      // Check if this date has any events with member filter
      const hasEvents = allEvents.some(event => {
        const eventDate = event.dateObj;
        const dateMatch = eventDate.getDate() === date.getDate() &&
                         eventDate.getMonth() === date.getMonth() &&
                         eventDate.getFullYear() === date.getFullYear();
        
        // Apply member filter if set
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
          const attendees = getEventAttendees(event);
          if (!attendees.some(a => a.id === selectedMember || a.name === selectedMember)) {
            return false;
          }
        }
        
        return dateMatch;
      });
      
      days.push(
        <div 
          key={`day-${d}`}
          className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer text-sm font-roboto relative
            ${isSelectedDate ? 'bg-black text-white' : isToday(date) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          onClick={() => setSelectedDate(date)}
        >
          {d}
          {hasEvents && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </div>
      );
    }
    
    return [...blanks, ...days];
  };
  
  // Render family member filter chips
  const renderMemberFilterChips = () => {
    return (
      <div className="flex flex-wrap gap-1 mb-2 mt-2">
        <button 
          className={`text-xs px-2 py-1 rounded-full ${selectedMember === 'all' ? 'bg-black text-white' : 'bg-gray-100'}`}
          onClick={() => setSelectedMember('all')}
        >
          All Members
        </button>
        
        {/* Parents */}
        {familyMembers.filter(m => m.role === 'parent').map(member => (
          <button 
            key={member.id}
            className={`text-xs px-2 py-1 rounded-full flex items-center ${selectedMember === member.id || selectedMember === member.name ? 'bg-black text-white' : 'bg-gray-100'}`}
            onClick={() => setSelectedMember(member.id)}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden mr-1">
              <img 
                src={member.profilePicture || `/api/placeholder/24/24`}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            {member.name}
          </button>
        ))}
        
        {/* Children */}
        {familyMembers.filter(m => m.role === 'child').map(member => (
          <button 
            key={member.id}
            className={`text-xs px-2 py-1 rounded-full flex items-center ${selectedMember === member.id || selectedMember === member.name ? 'bg-black text-white' : 'bg-gray-100'}`}
            onClick={() => setSelectedMember(member.id)}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden mr-1">
              <img 
                src={member.profilePicture || `/api/placeholder/24/24`}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            {member.name}
          </button>
        ))}
      </div>
    );
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
  
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div 
        ref={widgetRef}
        className="bg-white border border-black shadow-lg rounded-lg flex flex-col relative"
        style={{ height: `${widgetHeight}rem`, width: `${widgetWidth}rem` }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b p-3">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2 flex-shrink-0">
              <Calendar size={16} />
            </div>
            <span className="font-medium font-roboto">Family Calendar</span>
          </div>
          <div className="flex">
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MinusSquare size={18} />
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1 hover:bg-gray-100 rounded ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Calendar content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Mini Calendar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={18} />
              </button>
              
              <h4 className="text-sm font-medium font-roboto">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1 font-roboto">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 justify-items-center font-roboto">
              {renderCalendarDays()}
            </div>
          </div>
          
          {/* Filter section - combined event type and family member filters */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <h5 className="text-sm font-medium font-roboto flex items-center">
                <Filter size={14} className="mr-1" />
                Filters
              </h5>
              <button 
                onClick={() => {
                  setView('all');
                  setSelectedMember('all');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset all
              </button>
            </div>
            
            {/* Event type filters */}
            <div className="flex flex-wrap gap-1 mb-2">
              <button 
                className={`text-xs px-2 py-1 rounded-full ${view === 'all' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setView('all')}
              >
                All Types
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded-full ${view === 'tasks' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setView('tasks')}
              >
                Tasks
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded-full ${view === 'appointments' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setView('appointments')}
              >
                Medical
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded-full ${view === 'activities' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setView('activities')}
              >
                Activities
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded-full ${view === 'meetings' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setView('meetings')}
              >
                Meetings
              </button>
            </div>
            
            {/* Family member filters */}
            {renderMemberFilterChips()}
          </div>
          
          {/* Selected Date */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 font-roboto">{formatDate(selectedDate)}</h4>
            <button
              onClick={() => setLastRefresh(Date.now())}
              className="text-xs text-blue-600 hover:underline flex items-center mt-1"
            >
              <RefreshCw size={12} className="mr-1" />
              Refresh events
            </button>
          </div>
          
          {/* Events for selected date */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 font-roboto">Events for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            ) : getEventsForSelectedDate().length > 0 ? (
              <div className="space-y-2">
                {getEventsForSelectedDate()
                  .filter(event => 
                    view === 'all' || 
                    (view === 'appointments' && (event.category === 'medical' || event.eventType === 'appointment')) ||
                    (view === 'activities' && (event.category === 'activity' || event.eventType === 'activity')) ||
                    (view === 'tasks' && (event.category === 'task' || event.eventType === 'task' || event.eventType === 'homework')) ||
                    (view === 'meetings' && (event.category === 'meeting' || event.eventType === 'meeting'))
                  )
                  .map((event, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetails(true);
                        setIsEditingEvent(false);
                        setEditedEvent(null);
                      }}
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            {getEventIcon(event)}
                            <p className="text-sm font-medium font-roboto">{event.title}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 font-roboto">
                              {event.time || event.dateObj?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {event.location && ` - ${event.location}`}
                            </p>
                            
                            {/* Attendee avatars */}
                            <div className="flex -space-x-2 ml-2">
                              {getEventAttendees(event).slice(0, 3).map((attendee, i) => (
                                <div key={i} className="w-6 h-6 rounded-full overflow-hidden border border-white">
                                  <img 
                                    src={attendee.profilePicture || `/api/placeholder/24/24`} 
                                    alt={attendee.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {getEventAttendees(event).length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border border-white text-xs">
                                  +{getEventAttendees(event).length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="ml-2 flex items-center">
                          {!addedEvents[getEventKey(event)] && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent opening details modal
                                if (event.eventType === 'appointment' || event.eventType === 'activity' || 
                                    event.eventType === 'event' || event.eventType === 'homework') {
                                  handleAddChildEventToCalendar(event);
                                } else if (event.eventType === 'meeting') {
                                  handleAddMeetingToCalendar(event);
                                } else if (event.eventType === 'task') {
                                  handleAddTaskToCalendar(event);
                                } else {
                                  handleAddChildEventToCalendar(event);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                            >
                              Add
                            </button>
                          )}
                          
                          {addedEvents[getEventKey(event)] && showAddedMessage[getEventKey(event)] && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                              <Check size={12} className="mr-1" />
                              Added
                            </span>
                          )}
                          
                          {addedEvents[getEventKey(event)] && !showAddedMessage[getEventKey(event)] && (
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening details modal
                                  setSelectedEvent(event);
                                  setShowEventDetails(true);
                                  setIsEditingEvent(true);
                                  setEditedEvent({...event});
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title="Edit event"
                              >
                                <Edit size={14} />
                              </button>
                              
                              {event.firestoreId && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening details modal
                                    if (window.confirm("Are you sure you want to delete this event?")) {
                                      deleteEvent(event);
                                    }
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                                  title="Delete event"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-roboto">No events scheduled for this date</p>
              </div>
            )}
          </div>
          
          {/* Upcoming Events Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 font-roboto">Upcoming Events</h4>
            {allEvents.length > 0 ? (
              <div className="space-y-2">
                {allEvents
                  // Apply member filter
                  .filter(event => {
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
                    const attendees = getEventAttendees(event);
                    return attendees.some(a => a.id === selectedMember || a.name === selectedMember);
                  })
                  // Apply event type filter
                  .filter(event => 
                    view === 'all' || 
                    (view === 'appointments' && (event.category === 'medical' || event.eventType === 'appointment')) ||
                    (view === 'activities' && (event.category === 'activity' || event.eventType === 'activity')) ||
                    (view === 'tasks' && (event.category === 'task' || event.eventType === 'task' || event.eventType === 'homework')) ||
                    (view === 'meetings' && (event.category === 'meeting' || event.eventType === 'meeting'))
                  )
                  .sort((a, b) => a.dateObj - b.dateObj)
                  .slice(0, 5)
                  .map((event, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetails(true);
                        setIsEditingEvent(false);
                        setEditedEvent(null);
                      }}
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            {getEventIcon(event)}
                            <p className="text-sm font-medium font-roboto">{event.title}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 font-roboto">
                              {formatDate(event.date || event.startDate || event.dueDate)}
                              {event.time && ` at ${event.time}`}
                            </p>
                            
                            {/* Attendee avatars */}
                            <div className="flex -space-x-2 ml-2">
                              {getEventAttendees(event).slice(0, 3).map((attendee, i) => (
                                <div key={i} className="w-6 h-6 rounded-full overflow-hidden border border-white">
                                  <img 
                                    src={attendee.profilePicture || `/api/placeholder/24/24`} 
                                    alt={attendee.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {getEventAttendees(event).length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border border-white text-xs">
                                  +{getEventAttendees(event).length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="ml-2 flex items-center">
                          {!addedEvents[getEventKey(event)] && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent opening details modal
                                if (event.eventType === 'appointment' || event.eventType === 'activity' || 
                                    event.eventType === 'event' || event.eventType === 'homework') {
                                  handleAddChildEventToCalendar(event);
                                } else if (event.eventType === 'meeting') {
                                  handleAddMeetingToCalendar(event);
                                } else if (event.eventType === 'task') {
                                  handleAddTaskToCalendar(event);
                                } else {
                                  handleAddChildEventToCalendar(event);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                            >
                              Add
                            </button>
                          )}
                          
                          {addedEvents[getEventKey(event)] && showAddedMessage[getEventKey(event)] && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                              <Check size={12} className="mr-1" />
                              Added
                            </span>
                          )}
                          
                          {addedEvents[getEventKey(event)] && !showAddedMessage[getEventKey(event)] && (
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening details modal
                                  setSelectedEvent(event);
                                  setShowEventDetails(true);
                                  setIsEditingEvent(true);
                                  setEditedEvent({...event});
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title="Edit event"
                              >
                                <Edit size={14} />
                              </button>
                              
                              {event.firestoreId && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening details modal
                                    if (window.confirm("Are you sure you want to delete this event?")) {
                                      deleteEvent(event);
                                    }
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                                  title="Delete event"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-roboto">No upcoming events</p>
              </div>
            )}
          </div>
          
          {/* Tasks for Selected Date */}
          {(view === 'all' || view === 'tasks') && (
            <div>
              <h4 className="text-sm font-medium mb-2 font-roboto">
                Add Tasks to Calendar
                <span className="text-xs text-gray-500 ml-1 font-roboto">(for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
              </h4>
              
              <div className="space-y-2">
                {taskRecommendations && taskRecommendations.length > 0 ? (
                  taskRecommendations
                    .filter(task => !task.completed)
                    // Apply member filter for tasks
                    .filter(task => {
                      if (selectedMember === 'all') return true;
                      return selectedMember === task.assignedTo || selectedMember === task.assignedToName;
                    })
                    .slice(0, 3)
                    .map(task => {
                      const taskKey = getEventKey(task);
                      return (
                        <div 
                          key={task.id} 
                          className="p-2 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            // Create a calendar event view of this task for details
                            const taskEvent = {
                              id: `task-${task.id}`,
                              title: task.title,
                              description: task.description,
                              assignedTo: task.assignedTo,
                              assignedToName: task.assignedToName,
                              dateObj: new Date(selectedDate),
                              category: 'task',
                              eventType: 'task',
                              linkedEntity: {
                                type: 'task',
                                id: task.id
                              }
                            };
                            setSelectedEvent(taskEvent);
                            setShowEventDetails(true);
                            setIsEditingEvent(false);
                            setEditedEvent(null);
                          }}
                        >
                          <div className="flex-1 pr-2">
                            <p className="text-sm font-medium truncate font-roboto">{task.title}</p>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-gray-500 font-roboto">For: {task.assignedToName}</p>
                              
                              {/* Assignee avatar */}
                              <div className="flex -space-x-2 ml-2">
                                {familyMembers
                                  .filter(m => m.name === task.assignedToName || m.roleType === task.assignedTo)
                                  .map((member, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full overflow-hidden border border-white">
                                      <img 
                                        src={member.profilePicture || `/api/placeholder/24/24`} 
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                          
                          {!addedEvents[taskKey] && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent details modal
                                handleAddTaskToCalendar(task);
                              }}
                              className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                            >
                              Add
                            </button>
                          )}
                          {addedEvents[taskKey] && showAddedMessage[taskKey] && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                              <Check size={12} className="mr-1" />
                              Added
                            </span>
                          )}
                          {addedEvents[taskKey] && !showAddedMessage[taskKey] && (
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening details modal
                                  const taskEvent = {
                                    id: `task-${task.id}`,
                                    title: task.title,
                                    description: task.description,
                                    assignedTo: task.assignedTo,
                                    assignedToName: task.assignedToName,
                                    dateObj: new Date(selectedDate),
                                    category: 'task',
                                    eventType: 'task',
                                    linkedEntity: {
                                      type: 'task',
                                      id: task.id
                                    }
                                  };
                                  setSelectedEvent(taskEvent);
                                  setShowEventDetails(true);
                                  setIsEditingEvent(true);
                                  setEditedEvent({...taskEvent});
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                title="Edit task"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening details modal
                                  navigate('/dashboard?tab=tasks');
                                }}
                                className="p-1 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-100"
                                title="Go to task"
                              >
                                <ExternalLink size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No active tasks available.</p>
                  </div>
                )}
              </div>
            </div>
          )}
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
      
      <button
        onClick={() => setIsOpen(true)}
        className="bg-black text-white p-3 rounded-full hover:bg-gray-800 shadow-lg"
      >
        <Calendar size={24} />
      </button>

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              {isEditingEvent ? (
                <input
                  type="text"
                  className="text-lg font-semibold font-roboto border p-1 rounded w-full"
                  value={editedEvent?.title || ''}
                  onChange={(e) => setEditedEvent({...editedEvent, title: e.target.value})}
                />
              ) : (
                <h3 className="text-lg font-semibold font-roboto">{selectedEvent.title}</h3>
              )}
              <button
                onClick={() => {
                  setShowEventDetails(false);
                  setIsEditingEvent(false);
                  setEditedEvent(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {/* Date and Time */}
                <div className="flex items-start">
                  <Clock size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm font-roboto">Date & Time</p>
                    {isEditingEvent ? (
                      <div className="space-y-2">
                        <input
                          type="date"
                          className="border p-1 rounded text-sm w-full"
                          value={editedEvent?.dateObj ? editedEvent.dateObj.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            // Preserve time from old date
                            if (editedEvent.dateObj) {
                              newDate.setHours(editedEvent.dateObj.getHours(), editedEvent.dateObj.getMinutes());
                            }
                            setEditedEvent({...editedEvent, dateObj: newDate});
                          }}
                        />
                        <input
                          type="time"
                          className="border p-1 rounded text-sm w-full"
                          value={editedEvent?.dateObj ? 
                            `${String(editedEvent.dateObj.getHours()).padStart(2, '0')}:${String(editedEvent.dateObj.getMinutes()).padStart(2, '0')}` : 
                            ''}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(editedEvent.dateObj);
                            newDate.setHours(hours, minutes);
                            setEditedEvent({...editedEvent, dateObj: newDate});
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 font-roboto">
                          {selectedEvent.dateObj?.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600 font-roboto">
                          {selectedEvent.time || selectedEvent.dateObj?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {selectedEvent.dateEndObj && ` - ${selectedEvent.dateEndObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Location */}
                <div className="flex items-start">
                  <MapPin size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm font-roboto">Location</p>
                    {isEditingEvent ? (
                      <input
                        type="text"
                        className="border p-1 rounded text-sm w-full"
                        placeholder="TBD"
                        value={editedEvent?.location || ''}
                        onChange={(e) => setEditedEvent({...editedEvent, location: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 font-roboto">{selectedEvent.location || "TBD"}</p>
                    )}
                  </div>
                </div>
                
                {/* Person */}
                {(selectedEvent.childName || selectedEvent.assignedToName) && (
                  <div className="flex items-start">
                    <User size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm font-roboto">For</p>
                      <div className="flex items-center">
                        {getEventAttendees(selectedEvent).map((attendee, i) => (
                          <div key={i} className="flex items-center mr-3">
                            <div className="w-6 h-6 rounded-full overflow-hidden mr-1">
                              <img 
                                src={attendee.profilePicture || `/api/placeholder/24/24`} 
                                alt={attendee.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-sm text-gray-600 font-roboto">{attendee.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                <div className="flex items-start">
                  <Info size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm font-roboto">Description</p>
                    {isEditingEvent ? (
                      <textarea
                        className="border p-1 rounded text-sm w-full min-h-[80px]"
                        placeholder="Add a description"
                        value={editedEvent?.description || ''}
                          onChange={(e) => setEditedEvent({...editedEvent, description: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 font-roboto whitespace-pre-line">
                        {selectedEvent.description || selectedEvent.notes || "No description provided"}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Linked Entity */}
                {selectedEvent.linkedEntity && (
                  <div className="flex items-start">
                    <Link size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm font-roboto">Linked to</p>
                      <button 
                        onClick={() => navigateToLinkedEntity(selectedEvent)}
                        className="text-sm text-blue-600 hover:underline font-roboto flex items-center"
                      >
                        {selectedEvent.linkedEntity.type === 'meeting' ? 'Open Family Meeting' :
                         selectedEvent.linkedEntity.type === 'task' ? 'View Task Details' :
                         selectedEvent.linkedEntity.type === 'relationship' ? 'View Relationship Section' :
                         selectedEvent.linkedEntity.type === 'child' ? 'View Child Profile' :
                         'View Details'}
                        <ArrowUpRight size={14} className="ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-between">
              {isEditingEvent ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditingEvent(false);
                      setEditedEvent(null);
                    }}
                    className="px-4 py-2 border rounded hover:bg-gray-50 font-roboto"
                    disabled={pendingAction === 'update'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateEvent}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto flex items-center"
                    disabled={pendingAction === 'update'}
                  >
                    {pendingAction === 'update' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <>
                  {selectedEvent.firestoreId && (
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this event?")) {
                          deleteEvent(selectedEvent);
                        }
                      }}
                      className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 font-roboto flex items-center"
                      disabled={pendingAction === 'delete'}
                    >
                      {pendingAction === 'delete' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-red-500 rounded-full animate-spin mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEditingEvent(true);
                      setEditedEvent({...selectedEvent});
                    }}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto flex items-center"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingCalendarWidget;