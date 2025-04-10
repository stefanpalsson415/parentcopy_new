import React from 'react';
import { Filter } from 'lucide-react';
import UserAvatar from '../common/UserAvatar'; // Add this import


/**
 * Calendar filters component for filtering events by type and family members
 * 
 * @param {Object} props
 * @param {string} props.view - Current view filter ('all', 'tasks', 'appointments', etc.)
 * @param {Function} props.onViewChange - Function to call when view filter changes
 * @param {string} props.selectedMember - Current member filter (ID or 'all')
 * @param {Function} props.onMemberChange - Function to call when member filter changes
 * @param {Array} props.familyMembers - Array of family members
 * @param {Function} props.onResetFilters - Function to call when resetting all filters
 */
const CalendarFilters = ({ 
  view = 'all', 
  onViewChange,
  selectedMember = 'all',
  onMemberChange,
  familyMembers = [],
  onResetFilters
}) => {
  // Event type filters
  const eventTypeFilters = [
    { id: 'all', label: 'All Types' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'appointments', label: 'Medical' },
    { id: 'activities', label: 'Activities' },
    { id: 'meetings', label: 'Meetings' }
  ];
  
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <h5 className="text-sm font-medium font-roboto flex items-center">
          <Filter size={14} className="mr-1" />
          Filters
        </h5>
        <button 
          onClick={onResetFilters}
          className="text-xs text-blue-600 hover:underline"
        >
          Reset all
        </button>
      </div>
      
      {/* Event type filters */}
      <div className="flex flex-wrap gap-1 mb-2">
        {eventTypeFilters.map(filter => (
          <button 
            key={filter.id}
            className={`text-xs px-2 py-1 rounded-full ${view === filter.id ? 'bg-black text-white' : 'bg-gray-100'}`}
            onClick={() => onViewChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Family member filters */}
      <div className="flex flex-wrap gap-1 mb-2 mt-2">
        <button 
          className={`text-xs px-2 py-1 rounded-full ${selectedMember === 'all' ? 'bg-black text-white' : 'bg-gray-100'}`}
          onClick={() => onMemberChange('all')}
        >
          All Members
        </button>
        
        {/* Parents */}
        {familyMembers.filter(m => m.role === 'parent').map(member => (
  <button 
    key={member.id}
    className={`text-xs px-2 py-1 rounded-full flex items-center ${selectedMember === member.id ? 'bg-black text-white' : 'bg-gray-100'}`}
    onClick={() => onMemberChange(member.id)}
  >
    <UserAvatar 
      user={member} 
      size={16} 
      className="mr-1" 
    />
    {member.name}
  </button>
))}

{/* Children */}
{familyMembers.filter(m => m.role === 'child').map(member => (
  <button 
    key={member.id}
    className={`text-xs px-2 py-1 rounded-full flex items-center ${selectedMember === member.id ? 'bg-black text-white' : 'bg-gray-100'}`}
    onClick={() => onMemberChange(member.id)}
  >
    <UserAvatar 
      user={member} 
      size={16} 
      className="mr-1" 
    />
    {member.name}
  </button>
))}
      </div>
    </div>
  );
};

export default CalendarFilters;