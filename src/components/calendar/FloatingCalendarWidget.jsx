import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, MinusSquare, ChevronLeft, ChevronRight, ArrowUpRight, AlertCircle, Activity, BookOpen, Heart, Bell } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import AllieCalendarEvents from './AllieCalendarEvents';
import DatabaseService from '../../services/DatabaseService';

const FloatingCalendarWidget = () => {
  const { currentUser } = useAuth();
  const { 
    taskRecommendations, 
    currentWeek, 
    weekStatus,
    familyMembers,
    familyId
  } = useFamily();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [childrenEvents, setChildrenEvents] = useState([]);
  const [childrenAppointments, setChildrenAppointments] = useState([]);
  const [childrenActivities, setChildrenActivities] = useState([]);
  const [view, setView] = useState('all'); // 'all', 'tasks', 'appointments', 'activities'
  const [loading, setLoading] = useState(false);
  
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
  
  // Load children's events when the widget opens
  useEffect(() => {
    if (isOpen && familyId) {
      loadChildrenEvents();
    }
  }, [isOpen, familyId, selectedDate]);
  
  // Load children's events from Firebase
  const loadChildrenEvents = async () => {
    try {
      setLoading(true);
      
      // Get children data from Firebase
      const docRef = await DatabaseService.db.collection("families").doc(familyId).get();
      if (docRef.exists && docRef.data().childrenData) {
        const childrenData = docRef.data().childrenData;
        
        // Process appointments
        const appointments = [];
        const activities = [];
        const events = [];
        
        // Loop through each child's data
        Object.entries(childrenData).forEach(([childId, data]) => {
          const childName = getChildName(childId);
          
          // Medical appointments
          if (data.medicalAppointments) {
            data.medicalAppointments.forEach(appointment => {
              if (!appointment.completed && new Date(appointment.date) >= today) {
                appointments.push({
                  ...appointment,
                  childId,
                  childName,
                  eventType: 'appointment',
                  dateObj: new Date(appointment.date)
                });
              }
            });
          }
          
          // Activities
          if (data.activities) {
            data.activities.forEach(activity => {
              if (new Date(activity.startDate) >= today) {
                activities.push({
                  ...activity,
                  childId,
                  childName,
                  eventType: 'activity',
                  dateObj: new Date(activity.startDate)
                });
              }
            });
          }
          
          // Events
          if (data.events) {
            data.events.forEach(event => {
              if (new Date(event.date) >= today) {
                events.push({
                  ...event,
                  childId,
                  childName,
                  eventType: 'event',
                  dateObj: new Date(event.date)
                });
              }
            });
          }
          
          // Homework
          if (data.homework) {
            data.homework.forEach(homework => {
              if (!homework.completed && new Date(homework.dueDate) >= today) {
                events.push({
                  ...homework,
                  title: `${homework.title} Due`,
                  childId,
                  childName,
                  eventType: 'homework',
                  dateObj: new Date(homework.dueDate)
                });
              }
            });
          }
        });
        
        // Sort by date
        appointments.sort((a, b) => a.dateObj - b.dateObj);
        activities.sort((a, b) => a.dateObj - b.dateObj);
        events.sort((a, b) => a.dateObj - b.dateObj);
        
        setChildrenAppointments(appointments);
        setChildrenActivities(activities);
        setChildrenEvents([...appointments, ...activities, ...events]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading children events:", error);
      setLoading(false);
    }
  };
  
  // Generate calendar days
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
      const hasEvents = childrenEvents.some(event => {
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
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return "Not scheduled";
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
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
        date: meetingDate,
        type: 'meeting',
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
      
      // Show a simple notification
      const notification = document.createElement('div');
      notification.innerText = "Task added to calendar";
      notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: #4caf50;
        color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Roboto, sans-serif;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
    } catch (error) {
      console.error("Error adding task to calendar:", error);
    }
  };
  
  // Add meeting to calendar
  const handleAddMeetingToCalendar = async (meeting) => {
    try {
      if (!currentUser || !meeting) return;
      
      // Create event from meeting
      const event = CalendarService.createFamilyMeetingEvent(meeting.weekNumber, meeting.date);
      
      // Add event to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
      // Show a simple notification
      const notification = document.createElement('div');
      notification.innerText = "Meeting added to calendar";
      notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: #4caf50;
        color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Roboto, sans-serif;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
    } catch (error) {
      console.error("Error adding meeting to calendar:", error);
    }
  };
  
  // Add child event to calendar
  const handleAddChildEventToCalendar = async (event) => {
    try {
      if (!currentUser || !event) return;
      
      let calendarEvent;
      
      // Create different event types based on the event type
      if (event.eventType === 'appointment') {
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
      } else if (event.eventType === 'activity') {
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
          description: event.notes || `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} activity: ${event.title}`,
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
      } else if (event.eventType === 'event') {
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
        const endDate = new Date(eventDate.getTime() + 2*60*60000);
        
        calendarEvent = {
          summary: `${event.childName}'s ${event.title}`,
          description: event.description || `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} event: ${event.title}`,
          location: event.location || '',
          start: {
            dateTime: eventDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDate.toISOString(),
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
      } else if (event.eventType === 'homework') {
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
      }
      
      // Add event to calendar
      if (calendarEvent) {
        await CalendarService.addEvent(calendarEvent, currentUser.uid);
        
        // Show a simple notification
        const notification = document.createElement('div');
        notification.innerText = `${event.childName}'s ${event.title || 'event'} added to calendar`;
        notification.style.cssText = `
          position: fixed; bottom: 20px; right: 20px; background: #4caf50;
          color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Roboto, sans-serif;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (error) {
      console.error("Error adding child event to calendar:", error);
    }
  };
  
  // Get events for the selected date
  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    return childrenEvents.filter(event => {
      const eventDate = event.dateObj;
      return eventDate.getDate() === selectedDate.getDate() &&
             eventDate.getMonth() === selectedDate.getMonth() &&
             eventDate.getFullYear() === selectedDate.getFullYear();
    });
  };
  
  // Get icon for event type
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'appointment':
        return <AlertCircle size={14} className="text-red-500 mr-1" />;
      case 'activity':
        return <Activity size={14} className="text-blue-500 mr-1" />;
      case 'homework':
        return <BookOpen size={14} className="text-green-500 mr-1" />;
      case 'event':
        return <Bell size={14} className="text-purple-500 mr-1" />;
      default:
        return <Calendar size={14} className="text-gray-500 mr-1" />;
    }
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
      <div className="bg-white border border-black shadow-lg rounded-lg w-80 flex flex-col h-96 mb-2">
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
          
          {/* View filters */}
          <div className="flex space-x-1 mb-2">
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
              Appointments
            </button>
            <button 
              className={`text-xs px-2 py-1 rounded-full ${view === 'activities' ? 'bg-black text-white' : 'bg-gray-100'}`}
              onClick={() => setView('activities')}
            >
              Activities
            </button>
          </div>
          
          {/* Selected Date */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 font-roboto">{formatDate(selectedDate)}</h4>
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
                    (view === 'appointments' && event.eventType === 'appointment') ||
                    (view === 'activities' && event.eventType === 'activity') ||
                    (view === 'tasks' && event.eventType === 'homework')
                  )
                  .map((event, index) => (
                    <div key={index} className="border rounded-lg p-2 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            {getEventIcon(event.eventType)}
                            <p className="text-sm font-medium font-roboto">{event.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 font-roboto">
                            For: {event.childName}
                            {event.time && ` at ${event.time}`}
                            {event.eventType === 'activity' && event.location && ` - ${event.location}`}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleAddChildEventToCalendar(event)}
                          className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                        >
                          Add
                        </button>
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
          
          {/* Upcoming children's appointments */}
          {(view === 'all' || view === 'appointments') && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 font-roboto">Upcoming Medical Appointments</h4>
              
              {childrenAppointments.length > 0 ? (
                <div className="space-y-2">
                  {childrenAppointments.slice(0, 3).map((appointment, index) => (
                    <div key={index} className="border rounded-lg p-2 flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <AlertCircle size={14} className="text-red-500 mr-1" />
                          <p className="text-sm font-medium font-roboto">{appointment.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 font-roboto">
                          {appointment.childName} - {formatDate(appointment.date)}
                          {appointment.time && ` at ${appointment.time}`}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleAddChildEventToCalendar(appointment)}
                        className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 font-roboto">No upcoming appointments</p>
                </div>
              )}
            </div>
          )}
          
          {/* Upcoming children's activities */}
          {(view === 'all' || view === 'activities') && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 font-roboto">Upcoming Activities</h4>
              
              {childrenActivities.length > 0 ? (
                <div className="space-y-2">
                  {childrenActivities.slice(0, 3).map((activity, index) => (
                    <div key={index} className="border rounded-lg p-2 flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <Activity size={14} className="text-blue-500 mr-1" />
                          <p className="text-sm font-medium font-roboto">{activity.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 font-roboto">
                          {activity.childName} - {formatDate(activity.startDate)}
                          {activity.time && ` at ${activity.time}`}
                          {activity.location && ` (${activity.location})`}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleAddChildEventToCalendar(activity)}
                        className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 font-roboto">No upcoming activities</p>
                </div>
              )}
            </div>
          )}
          
          {/* Upcoming family meetings */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 font-roboto">Upcoming Family Meetings</h4>
            
            {getUpcomingMeetings().length > 0 ? (
              <div className="space-y-2">
                {getUpcomingMeetings().map(meeting => (
                  <div key={meeting.id} className="p-2 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium font-roboto">{meeting.title}</p>
                      <p className="text-xs text-gray-500 font-roboto">
                        {meeting.date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => handleAddMeetingToCalendar(meeting)}
                      className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-roboto">No upcoming meetings scheduled.</p>
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
                    .map(task => (
                      <div key={task.id} className="p-2 border rounded-lg flex justify-between items-center">
                        <div className="flex-1 pr-2">
                          <p className="text-sm font-medium truncate font-roboto">{task.title}</p>
                          <p className="text-xs text-gray-500 font-roboto">For: {task.assignedToName}</p>
                        </div>
                        
                        <button 
                          onClick={() => handleAddTaskToCalendar(task)}
                          className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
                        >
                          Add
                        </button>
                      </div>
                    ))
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
    </div>
  );
};

export default FloatingCalendarWidget;