// src/components/kanban/KanbanFilters.jsx
import React from 'react';
import { Search, Filter, User, Tag, Clock } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

const KanbanFilters = ({ 
  searchQuery,
  setSearchQuery,
  selectedMembers,
  setSelectedMembers,
  selectedCategories,
  setSelectedCategories,
  familyMembers,
  viewMode,
  setViewMode
}) => {
  const categories = [
    { id: 'household', name: 'Household', color: 'bg-blue-100 text-blue-800' },
    { id: 'relationship', name: 'Relationship', color: 'bg-pink-100 text-pink-800' },
    { id: 'parenting', name: 'Parenting', color: 'bg-purple-100 text-purple-800' },
    { id: 'errands', name: 'Errands', color: 'bg-green-100 text-green-800' },
    { id: 'work', name: 'Work', color: 'bg-amber-100 text-amber-800' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  // Toggle member selection
  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        {searchQuery && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>
      
      {/* Filter by family members */}
      <div>
        <div className="flex items-center mb-2">
          <User size={14} className="mr-1 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filter by family member</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {familyMembers.map(member => (
            <button
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`flex items-center p-1 rounded-md ${
                selectedMembers.includes(member.id) 
                  ? 'bg-blue-100 border border-blue-300' 
                  : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <UserAvatar user={member} size={24} className="mr-1" />
              <span className="text-xs">{member.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Filter by category */}
      <div>
        <div className="flex items-center mb-2">
          <Tag size={14} className="mr-1 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filter by category</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`text-xs px-3 py-1 rounded-md ${
                selectedCategories.includes(category.id) 
                  ? `${category.color} border border-gray-400` 
                  : category.color
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* View mode toggle */}
      <div className="flex justify-end">
        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 text-sm ${
              viewMode === 'board' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-sm ${
              viewMode === 'list' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            List
          </button>
        </div>
      </div>
    </div>
  );
};

export default KanbanFilters;