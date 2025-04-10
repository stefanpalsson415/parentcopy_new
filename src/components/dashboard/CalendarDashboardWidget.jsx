import React, { useState, useEffect } from 'react';
import { Calendar, PlusCircle, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import { EventManager } from '../../components/calendar';

const CalendarDashboardWidget = () => {
  const { currentUser } = useAuth();
  const { 
    taskRecommendations, 
    currentWeek, 
    weekStatus 
  } = useFamily();
  
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
          className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer text-sm
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
  
  // Add task to Allie calendar
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
      CalendarService.showNotification("Task added to your calendar", "success");
      
    } catch (error) {
      console.error("Error adding task to calendar:", error);
      CalendarService.showNotification("Failed to add task to calendar", "error");
    }
  };
  
  // Add meeting to Allie calendar
  const handleAddMeetingToCalendar = async (meeting) => {
    try {
      if (!currentUser || !meeting) return;
      
      // Create event from meeting
      const event = CalendarService.createFamilyMeetingEvent(meeting.weekNumber, meeting.date);
      
      // Add event to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
      // Show a simple notification
      CalendarService.showNotification("Meeting added to your calendar", "success");
      
    } catch (error) {
      console.error("Error adding meeting to calendar:", error);
      CalendarService.showNotification("Failed to add meeting to calendar", "error");
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Calendar size={20} className="mr-2" />
          Calendar
        </h3>
      </div>
      
      {/* Mini Calendar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={18} />
          </button>
          
          <h4 className="text-sm font-medium">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          
          <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={18} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {renderCalendarDays()}
        </div>
      </div>
      
      {/* Selected Date */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700">{formatDate(selectedDate)}</h4>
      </div>
      
      {/* Calendar Status */}
      <div className="bg-green-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-green-700 flex items-center">
          <Calendar size={14} className="mr-1" />
          Allie Calendar is active
        </p>
      </div>
      
      {/* Upcoming Meetings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Upcoming Family Meetings</h4>
        
        {getUpcomingMeetings().length > 0 ? (
          <div className="space-y-2">
            {getUpcomingMeetings().map(meeting => (
              <div key={meeting.id} className="p-2 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <p className="text-xs text-gray-500">
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
                  className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                >
                  Add to Calendar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>
        )}
      </div>
      
      {/* Tasks for Selected Date */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          Add Tasks to Calendar
          <span className="text-xs text-gray-500 ml-1">(for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
        </h4>
        
        <div className="space-y-2">
          {taskRecommendations && taskRecommendations.length > 0 ? (
            taskRecommendations
              .filter(task => !task.completed)
              .slice(0, 3)
              .map(task => (
                <div key={task.id} className="p-2 border rounded-lg flex justify-between items-center">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">For: {task.assignedToName}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleAddTaskToCalendar(task)}
                    className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                  >
                    Add
                  </button>
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">No active tasks available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarDashboardWidget;