import React, { useState, useEffect } from 'react';
import { Calendar, X, MinusSquare, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import AllieCalendarEvents from './AllieCalendarEvents';

const FloatingCalendarWidget = () => {
  const { currentUser } = useAuth();
  const { 
    taskRecommendations, 
    currentWeek, 
    weekStatus 
  } = useFamily();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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
      
      days.push(
        <div 
          key={`day-${d}`}
          className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer text-sm font-roboto
            ${isSelectedDate ? 'bg-black text-white' : isToday(date) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          onClick={() => setSelectedDate(date)}
        >
          {d}
        </div>
      );
    }
    
    return [...blanks, ...days];
  };
  
  // Format date for display
  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
            <span className="font-medium font-roboto">Calendar</span>
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
          
          {/* Upcoming Allie Calendar Events */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Upcoming Calendar Events</h4>
            <AllieCalendarEvents selectedDate={selectedDate} />
          </div>

          {/* Selected Date */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 font-roboto">{formatDate(selectedDate)}</h4>
          </div>
          
          {/* Upcoming Meetings */}
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
              <p className="text-sm text-gray-500 font-roboto">No upcoming meetings scheduled.</p>
            )}
          </div>
          
          {/* Tasks for Selected Date */}
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
                <p className="text-sm text-gray-500 font-roboto">No active tasks available.</p>
              )}
            </div>
          </div>
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