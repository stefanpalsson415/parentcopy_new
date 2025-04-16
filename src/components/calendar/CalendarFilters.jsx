// src/components/calendar/CalendarFilters.jsx
import React from 'react';
import { Filter, X, BrainCircuit } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

/**
 * Component for filtering calendar events by type and family member
 * 
 * @param {Object} props
 * @param {string} props.view - Current view filter ('all', 'appointments', etc.)
 * @param {Function} props.onViewChange - Function to call when view changes
 * @param {string} props.selectedMember - Currently selected family member ID
 * @param {Function} props.onMemberChange - Function to call when member selection changes
 * @param {Array} props.familyMembers - Family members array
 * @param {Function} props.onResetFilters - Function to reset all filters
 * @param {Array} props.filterOptions - Options for filtering (optional)
 */
const CalendarFilters = ({
  view = 'all',
  onViewChange,
  selectedMember = 'all',
  onMemberChange,
  familyMembers = [],
  onResetFilters,
  filterOptions = []
}) => {
  // If no filter options provided, use defaults
  const options = filterOptions.length > 0 ? filterOptions : [
    { id: 'all', label: 'All Events' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'activities', label: 'Activities' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'ai-parsed', label: 'AI Parsed' }
  ];
  
  // Sorted family members (children first, then parents)
  const sortedMembers = [...familyMembers].sort((a, b) => {
    if (a.role === 'child' && b.role !== 'child') return -1;
    if (a.role !== 'child' && b.role === 'child') return 1;
    return 0;
  });
  
  // Check if any filters are active
  const hasActiveFilters = view !== 'all' || selectedMember !== 'all';
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium font-roboto">Filters</h4>
        
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
          >
            <X size={12} className="mr-1" />
            Clear
          </button>
        )}
      </div>
      
      {/* View filters */}
      <div className="flex flex-wrap gap-1 mb-3">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => onViewChange(option.id)}
            className={`px-3 py-1 rounded-full text-xs ${
              view === option.id ? 
              (option.id === 'ai-parsed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800') : 
              'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {option.id === 'ai-parsed' && <BrainCircuit size={12} className="inline mr-1" />}
            {option.label}
          </button>
        ))}
      </div>
      
      {/* Member filters */}
      <h5 className="text-xs font-medium mb-2 font-roboto">Family Members</h5>
      
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onMemberChange('all')}
          className={`px-3 py-1 rounded-full text-xs ${
            selectedMember === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          All Members
        </button>
        
        {sortedMembers.map(member => (
          <button
            key={member.id}
            onClick={() => onMemberChange(member.id)}
            className={`flex items-center px-3 py-1 rounded-full text-xs ${
              selectedMember === member.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <div className="w-4 h-4 mr-1">
              <UserAvatar user={member} size={16} />
            </div>
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarFilters;