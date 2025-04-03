import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, MinusSquare, RefreshCw, ChevronLeft, ChevronRight, ArrowUpRight, AlertCircle, Activity, BookOpen, Heart, Bell, ChevronUp, ChevronDown, Users, MapPin, Clock, Info, User, Check } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import AllieCalendarEvents from './AllieCalendarEvents';
import DatabaseService from '../../services/DatabaseService';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const FloatingCalendarWidget = () => {
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
  const [widgetHeight, setWidgetHeight] = useState(68); // Default height (in rems)
  const [widgetWidth, setWidgetWidth] = useState(80); // Default width in rem
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [addedEvents, setAddedEvents] = useState({});
  
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
  
  // Helper to generate a unique key for an event
  const getEventKey = (event) => {
    if (!event) return null;
    
    // Try to create a unique identifier based on event properties
    let key = '';
    
    if (event.title) key += event.title;
    if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
    if (event.childName) key += '-' + event.childName;
    if (event.id) key += '-' + event.id;
    
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
            category: 'calendar',
            eventType: 'general',
            location: eventData.location || '',
            description: eventData.description || ''
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
      
      setAllEvents(combined);
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
                  dateObj: new Date(appointment.date)
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
                  dateObj: new Date(activity.startDate)
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
                  dateObj: new Date(event.date)
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
                  dateObj: new Date(homework.dueDate)
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
                title: `Couple Check-in (Week ${weekNum})`,
                date: data.scheduledDate,
                dateObj: checkInDate,
                category: 'relationship',
                eventType: 'relationship'
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
              eventType: 'strategy'
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
          if (task.dueDate && !task.completed && new Date(task.dueDate) >= today) {
            events.push({
              id: `task-${task.id}`,
              title: `Task Due: ${task.title}`,
              date: task.dueDate,
              dateObj: new Date(task.dueDate),
              category: 'task',
              eventType: 'task',
              assignedTo: task.assignedTo,
              assignedToName: task.assignedToName
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
      meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay())); // Next Sunday
      meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
      
      meetings.push({
        id: `meeting-${currentWeek}`,
        title: `Week ${currentWeek} Family Meeting`,
        date: meetingDate.toISOString(),
        dateObj: meetingDate,
        category: 'meeting',
        eventType: 'meeting',
        weekNumber: currentWeek
      });
    }
    
    return meetings;
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
      
      // Add event to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
      // Mark as added in our tracking
      setAddedEvents(prev => ({
        ...prev,
        [getEventKey(task)]: true
      }));
      
      // Show a simple notification
      CalendarService.showNotification("Task added to calendar", "success");
      
      // Refresh events
      setLastRefresh(Date.now());
      
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
      
      // Add event to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
      // Mark as added in our tracking
      setAddedEvents(prev => ({
        ...prev,
        [getEventKey(meeting)]: true
      }));
      
      // Show a simple notification
      CalendarService.showNotification("Meeting added to calendar", "success");
      
      // Refresh events
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error("Error adding meeting to calendar:", error);
      CalendarService.showNotification("Failed to add meeting to calendar", "error");
    }
  };
  
  // Add child event to calendar
  const handleAddChildEventToCalendar = async (event) => {
    try {
      if (!currentUser || !event) return;
      
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
            }
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
            location: event.location || '',
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
            }
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
            location: event.location || '',
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
            }
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
            }
          };
          break;
          
        case 'general':
          // General events added through chat or other means
          const generalDate = event.dateObj;
          
          calendarEvent = {
            summary: event.title,
            description: event.description || '',
            location: event.location || '',
            start: {
              dateTime: generalDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(generalDate.getTime() + 60*60000).toISOString(), // 1 hour duration
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          };
          break;
          
        default:
          // Default event
          calendarEvent = {
            summary: event.title,
            description: event.description || event.notes || '',
            start: {
              dateTime: event.dateObj.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(event.dateObj.getTime() + 60*60000).toISOString(), // 1 hour duration
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          };
      }
      
      // Add event to calendar
      if (calendarEvent) {
        await CalendarService.addEvent(calendarEvent, currentUser.uid);
        
        // Mark as added in our tracking
        setAddedEvents(prev => ({
          ...prev,
          [getEventKey(event)]: true
        }));
        
        // Show notification
        CalendarService.showNotification(`${event.childName ? `${event.childName}'s ` : ''}${event.title || 'event'} added to calendar`, "success");
        
        // Refresh events
        setLastRefresh(Date.now());
      }
    } catch (error) {
      console.error("Error adding child event to calendar:", error);
      CalendarService.showNotification("Failed to add event to calendar", "error");
    }
  };
  
  // Get events for the selected date
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return allEvents.filter(event => {
      const eventDate = event.dateObj;
      return eventDate.getDate() === selectedDate.getDate() &&
             eventDate.getMonth() === selectedDate.getMonth() &&
             eventDate.getFullYear() === selectedDate.getFullYear();
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
  
  // Increase widget height
  const increaseHeight = () => {
    setWidgetHeight(prev => Math.min(prev + 10, 140)); // Max height 140rem
  };

  // Decrease widget height
  const decreaseHeight = () => {
    setWidgetHeight(prev => Math.max(prev - 10, 56)); // Min height 56rem
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
      
      // Check if this date has any events
      const hasEvents = allEvents.some(event => {
        const eventDate = event.dateObj;
        return eventDate.getDate() === date.getDate() &&
               eventDate.getMonth() === date.getMonth() &&
               eventDate.getFullYear() === date.getFullYear();
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
        className="bg-white border border-black shadow-lg rounded-lg flex flex-col"
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
            {/* Width controls */}
            <button 
              onClick={() => setWidgetWidth(prev => Math.max(prev - 10, 80))} 
              className="p-1 hover:bg-gray-100 rounded"
              title="Decrease width"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setWidgetWidth(prev => Math.min(prev + 10, 140))} 
              className="p-1 hover:bg-gray-100 rounded"
              title="Increase width"
            >
              <ChevronRight size={18} />
            </button>
            
            {/* Height controls */}
            <button 
              onClick={decreaseHeight} 
              className="p-1 hover:bg-gray-100 rounded"
              title="Decrease widget height"
            >
              <ChevronDown size={18} />
            </button>
            <button 
              onClick={increaseHeight} 
              className="p-1 hover:bg-gray-100 rounded"
              title="Increase widget height"
            >
              <ChevronUp size={18} />
            </button>
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
          
          {/* View filters */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button 
              className={`text-xs px-2 py-1 rounded-full ${view === 'all' ? 'bg-black text-white' : 'bg-gray-100'}`}
              onClick={() => setView('all')}
            >
              All
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
                      }}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            {getEventIcon(event)}
                            <p className="text-sm font-medium font-roboto">{event.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 font-roboto">
                            {event.childName && `For: ${event.childName}`}
                            {event.childName && event.time && ` at ${event.time}`}
                            {event.childName && event.location && ` - ${event.location}`}
                            {event.assignedToName && `Assigned to: ${event.assignedToName}`}
                            {!event.childName && !event.assignedToName && event.time && `At ${event.time}`}
                          </p>
                        </div>
                        {/* Only show Add button if event is not already added */}
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
                                // Default handling
                                handleAddChildEventToCalendar(event);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                          >
                            Add
                          </button>
                        )}
                        {addedEvents[getEventKey(event)] && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                            <Check size={12} className="mr-1" />
                            Added
                          </span>
                        )}
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
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            {getEventIcon(event)}
                            <p className="text-sm font-medium font-roboto">{event.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 font-roboto">
                            {formatDate(event.date || event.startDate || event.dueDate)}
                            {event.time && ` at ${event.time}`}
                          </p>
                        </div>
                        {/* Only show Add button if event is not already added */}
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
                                // Default handling
                                handleAddChildEventToCalendar(event);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                          >
                            Add
                          </button>
                        )}
                        {addedEvents[getEventKey(event)] && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                            <Check size={12} className="mr-1" />
                            Added
                          </span>
                        )}
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
                    .slice(0, 3)
                    .map(task => {
                      const taskKey = getEventKey(task);
                      return (
                        <div key={task.id} className="p-2 border rounded-lg flex justify-between items-center">
                          <div className="flex-1 pr-2">
                            <p className="text-sm font-medium truncate font-roboto">{task.title}</p>
                            <p className="text-xs text-gray-500 font-roboto">For: {task.assignedToName}</p>
                          </div>
                          
                          {!addedEvents[taskKey] && (
                            <button 
                              onClick={() => handleAddTaskToCalendar(task)}
                              className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                            >
                              Add
                            </button>
                          )}
                          {addedEvents[taskKey] && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
                              <Check size={12} className="mr-1" />
                              Added
                            </span>
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
              <h3 className="text-lg font-semibold font-roboto">{selectedEvent.title}</h3>
              <button
                onClick={() => setShowEventDetails(false)}
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
                    </p>
                  </div>
                </div>
                
                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-start">
                    <MapPin size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm font-roboto">Location</p>
                      <p className="text-sm text-gray-600 font-roboto">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
                
                {/* Person */}
                {(selectedEvent.childName || selectedEvent.assignedToName) && (
                  <div className="flex items-start">
                    <User size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm font-roboto">For</p>
                      <p className="text-sm text-gray-600 font-roboto">
                        {selectedEvent.childName || selectedEvent.assignedToName}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {selectedEvent.description && (
                  <div className="flex items-start">
                    <Info size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm font-roboto">Description</p>
                      <p className="text-sm text-gray-600 font-roboto whitespace-pre-wrap">
                        {selectedEvent.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingCalendarWidget;