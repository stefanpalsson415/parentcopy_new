import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Mini calendar grid component
 * 
 * @param {Object} props
 * @param {Date} props.currentMonth - Current month being displayed
 * @param {Date} props.selectedDate - Currently selected date
 * @param {Function} props.onDateSelect - Function to call when a date is selected
 * @param {Function} props.onPrevMonth - Function to call to go to previous month
 * @param {Function} props.onNextMonth - Function to call to go to next month
 * @param {Array} props.eventDates - Array of dates that have events (for highlighting)
 * @param {string} props.selectedMember - Selected family member ID for filtering
 */
const CalendarGrid = ({ 
  currentMonth, 
  selectedDate, 
  onDateSelect, 
  onPrevMonth, 
  onNextMonth,
  eventDates = [],
  selectedMember = 'all'
}) => {
  
  // Helper function to get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Helper function to get day of week for first day of month
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Calculate today's day of month
  const today = new Date();
  const isToday = (date) => {
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Check if a date has events
  const hasEvents = (date) => {
    return eventDates.some(eventDate => 
      eventDate.getDate() === date.getDate() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getFullYear() === date.getFullYear()
    );
  };
  
  // Render calendar days
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
      
      // Check if this date has any events (filtered by member if applicable)
      const dateHasEvents = hasEvents(date);
      
      days.push(
        <div 
          key={`day-${d}`}
          className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer text-sm font-roboto relative
            ${isSelectedDate ? 'bg-black text-white' : isToday(date) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          onClick={() => onDateSelect(date)}
        >
          {d}
          {dateHasEvents && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </div>
      );
    }
    
    return [...blanks, ...days];
  };
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onPrevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft size={18} />
        </button>
        
        <h4 className="text-sm font-medium font-roboto">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        
        <button onClick={onNextMonth} className="p-1 hover:bg-gray-100 rounded">
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
  );
};

export default CalendarGrid;