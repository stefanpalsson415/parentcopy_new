// src/components/chat/CalendarPromptChip.jsx
import React, { useState } from 'react';
import { Calendar, ChevronDown, X, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CalendarOperations from '../../services/CalendarOperations';

const CalendarPromptChip = ({ onClick, onSelectDate }) => {
  const { currentUser } = useAuth();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAMPM, setSelectedAMPM] = useState('AM');
  
  const handleDateSelect = () => {
    // Create a new date with selected time
    const date = new Date(selectedDate);
    let hour = selectedHour;
    
    // Convert to 24-hour format
    if (selectedAMPM === 'PM' && hour < 12) {
      hour += 12;
    } else if (selectedAMPM === 'AM' && hour === 12) {
      hour = 0;
    }
    
    date.setHours(hour, selectedMinute, 0, 0);
    
    // Pass the date up to parent
    if (onSelectDate) {
      onSelectDate(date);
    }
    
    // Close pickers
    setShowDatePicker(false);
    setShowTimePicker(false);
    
    // Call original onClick if provided
    if (onClick) {
      onClick();
    }
  };
  
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Generate array of hours
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate array of minutes (00, 15, 30, 45)
  const minutes = [0, 15, 30, 45];
  
  const handleButtonClick = () => {
    if (onClick && !onSelectDate) {
      // If only onClick is provided, just call it
      onClick();
    } else {
      // Otherwise show date picker
      setShowDatePicker(!showDatePicker);
      setShowTimePicker(false);
    }
  };
  
  return (
    <div className="relative">
      <button 
        onClick={handleButtonClick}
        className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
      >
        <Calendar size={14} className="mr-1" />
        <span>{onSelectDate ? "Add to calendar" : "Open calendar"}</span>
        {onSelectDate && <ChevronDown size={14} className="ml-1" />}
      </button>
      
      {/* Date Picker */}
      {showDatePicker && (
        <div className="absolute z-10 mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 font-roboto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Select Date</h3>
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={() => setShowDatePicker(false)}
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="mb-3">
            <input 
              type="date" 
              className="w-full border rounded p-2 text-sm"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </div>
          
          <div className="mb-3 flex justify-between items-center">
            <span className="text-sm">{formatDateForDisplay(selectedDate)}</span>
            <button
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => setShowTimePicker(!showTimePicker)}
            >
              <Clock size={14} className="mr-1" />
              {showTimePicker ? "Hide time" : "Add time"}
            </button>
          </div>
          
          {/* Time Picker */}
          {showTimePicker && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {/* Hour */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hour</label>
                <select 
                  className="w-full border rounded p-1 text-sm"
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                >
                  {hours.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
              
              {/* Minute */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minute</label>
                <select 
                  className="w-full border rounded p-1 text-sm"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                >
                  {minutes.map(minute => (
                    <option key={minute} value={minute}>{minute.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              
              {/* AM/PM */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">AM/PM</label>
                <select 
                  className="w-full border rounded p-1 text-sm"
                  value={selectedAMPM}
                  onChange={(e) => setSelectedAMPM(e.target.value)}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          )}
          
          <button
            onClick={handleDateSelect}
            className="w-full py-2 px-3 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
          >
            Select
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarPromptChip;