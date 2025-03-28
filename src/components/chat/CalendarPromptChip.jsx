import React from 'react';
import { Calendar, PlusCircle } from 'lucide-react';

const CalendarPromptChip = ({ onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
    >
      <Calendar size={14} className="mr-1" />
      <span>Add to calendar</span>
    </button>
  );
};

export default CalendarPromptChip;