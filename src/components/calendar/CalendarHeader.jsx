import React from 'react';
import { Calendar, X, MinusSquare, RefreshCw } from 'lucide-react';

/**
 * Calendar widget header component
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Function to call when closing the calendar
 * @param {Function} props.onMinimize - Function to call when minimizing the calendar
 * @param {Function} props.onRefresh - Function to call when refreshing events
 */
const CalendarHeader = ({ onClose, onMinimize, onRefresh }) => {
  return (
    <div className="flex justify-between items-center border-b p-3">
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2 flex-shrink-0">
          <Calendar size={16} />
        </div>
        <span className="font-medium font-roboto">Family Calendar</span>
      </div>
      <div className="flex">
        {onRefresh && (
          <button 
            onClick={onRefresh} 
            className="p-1 hover:bg-gray-100 rounded mr-1" 
            title="Refresh events"
          >
            <RefreshCw size={18} />
          </button>
        )}
        {onMinimize && (
          <button 
            onClick={onMinimize} 
            className="p-1 hover:bg-gray-100 rounded" 
            title="Minimize"
          >
            <MinusSquare size={18} />
          </button>
        )}
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded ml-1" 
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarHeader;