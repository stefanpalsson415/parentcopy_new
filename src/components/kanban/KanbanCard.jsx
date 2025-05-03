// src/components/kanban/KanbanCard.jsx
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, Edit, Trash2, MessageCircle, CheckSquare, 
  Clock, Tag, User, MoreHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

const KanbanCard = ({ task, onEdit, onDelete, onComplete, familyMembers }) => {
  const [expanded, setExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: { task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  // Calculate completion percentage
  const completedSubtasks = task.subtasks?.filter(t => t.completed)?.length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const completionPercentage = totalSubtasks > 0 
    ? Math.round((completedSubtasks / totalSubtasks) * 100) 
    : 0;

  // Get category color
  const getCategoryColor = (category) => {
    const categories = {
      'household': 'bg-blue-100 text-blue-800',
      'relationship': 'bg-pink-100 text-pink-800',
      'parenting': 'bg-purple-100 text-purple-800',
      'errands': 'bg-green-100 text-green-800',
      'work': 'bg-amber-100 text-amber-800'
    };

    return categories[category] || 'bg-gray-100 text-gray-800';
  };

  // Format due date
  const formatDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get assigned member
  const getAssignedMember = () => {
    if (!task.assignedTo) return null;
    return familyMembers.find(m => m.id === task.assignedTo);
  };

  const assignedMember = getAssignedMember();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white rounded-lg shadow p-3 mb-2 border-l-4 ${
        task.completed 
          ? 'border-green-500' 
          : task.priority === 'high' 
            ? 'border-red-500' 
            : task.priority === 'medium' 
              ? 'border-amber-500' 
              : 'border-blue-500'
      }`}
    >
      {/* Card header with grip handle */}
      <div className="flex items-start mb-2">
        <div 
          className="mr-2 text-gray-400 cursor-grab px-1 py-2" 
          {...listeners}
        >
          <svg width="10" height="20" viewBox="0 0 10 20" fill="currentColor">
            <circle cx="2" cy="4" r="2" />
            <circle cx="8" cy="4" r="2" />
            <circle cx="2" cy="10" r="2" />
            <circle cx="8" cy="10" r="2" />
            <circle cx="2" cy="16" r="2" />
            <circle cx="8" cy="16" r="2" />
          </svg>
        </div>
        
        <div className="flex-grow">
          <h3 className="font-medium text-gray-900 break-words">{task.title}</h3>
        </div>
        
        <div className="flex ml-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      
      {/* Card metadata */}
      <div className="flex flex-wrap gap-y-2 text-xs text-gray-500">
        {task.category && (
          <span className={`flex items-center rounded-full px-2 py-1 mr-2 ${getCategoryColor(task.category)}`}>
            <Tag size={12} className="mr-1" />
            {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
          </span>
        )}
        
        {task.dueDate && (
          <span className="flex items-center mr-2">
            <Calendar size={12} className="mr-1" />
            {formatDate(task.dueDate)}
          </span>
        )}
        
        {assignedMember && (
          <span className="flex items-center mr-2">
            <UserAvatar user={assignedMember} size={16} className="mr-1" />
            {assignedMember.name}
          </span>
        )}
        
        {task.subtasks && task.subtasks.length > 0 && (
          <span className="flex items-center mr-2">
            <CheckSquare size={12} className="mr-1" />
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}
        
        {/* Kid token indicator */}
        {task.hasKidToken && (
          <span 
            className="flex items-center bg-yellow-100 text-yellow-800 rounded-full px-2 py-1"
            title="This task has a kid token assigned to it"
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="mr-1"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {task.kidTokenVerified ? "Verified" : "Token"}
          </span>
        )}
      </div>
      
      {/* Progress bar for subtasks */}
      {totalSubtasks > 0 && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-green-500 h-1.5 rounded-full" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      )}
      
      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t pt-3">
          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}
          
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2 mb-3">
              <h4 className="text-xs font-medium text-gray-700">Subtasks</h4>
              {task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-start">
                  <button 
                    className="mt-0.5 mr-2 flex-shrink-0"
                    onClick={() => onComplete(task.id, subtask.id, !subtask.completed)}
                  >
                    {subtask.completed ? (
                      <CheckSquare size={14} className="text-green-500" />
                    ) : (
                      <div className="w-3.5 h-3.5 border border-gray-400 rounded" />
                    )}
                  </button>
                  <span className={`text-xs ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-2">
            <button 
              onClick={() => onEdit(task)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanCard;