// src/components/kanban/KanbanColumn.jsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { Plus } from 'lucide-react';

const KanbanColumn = ({ 
  id, 
  title, 
  tasks, 
  onAddCard, 
  onEditTask, 
  onDeleteTask, 
  onCompleteSubtask,
  familyMembers,
  color = 'blue' 
}) => {
  const { setNodeRef } = useDroppable({
    id
  });

  // Get color class based on column type
  const getColorClass = () => {
    switch (color) {
      case 'red': return 'bg-red-100 border-red-200 text-red-800';
      case 'yellow': return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'green': return 'bg-green-100 border-green-200 text-green-800';
      case 'purple': return 'bg-purple-100 border-purple-200 text-purple-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[280px] bg-gray-50 rounded-lg shadow">
      {/* Column header */}
      <div className={`p-3 ${getColorClass()} rounded-t-lg border-b flex justify-between items-center`}>
        <h3 className="font-medium text-sm">
          {title} {tasks.length > 0 && <span className="ml-1">({tasks.length})</span>}
        </h3>
        <button 
          onClick={() => onAddCard(id)}
          className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
          aria-label="Add card"
        >
          <Plus size={18} />
        </button>
      </div>
      
      {/* Cards container */}
      <div 
  ref={setNodeRef}
  className="flex-grow p-2 overflow-y-auto"
  style={{ 
    maxHeight: tasks.length > 0 ? 'calc(100vh - 450px)' : '150px',
    minHeight: tasks.length === 0 ? '50px' : '100px'
  }}
>
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <KanbanCard 
              key={task.id} 
              task={task} 
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteSubtask}
              familyMembers={familyMembers}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm italic">
            Drag cards here or add a new one
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;