// src/components/kanban/KanbanAddCard.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, User, AlertCircle, Plus, Star } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { useFamily } from '../../contexts/FamilyContext';

const KanbanAddCard = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData = {}, 
  familyMembers = [],
  columnId
}) => {
  const { familyMembers: allMembers } = useFamily();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('household');
  const [assignedTo, setAssignedTo] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [hasKidToken, setHasKidToken] = useState(false);
  const [selectedKidId, setSelectedKidId] = useState('');
  const [errors, setErrors] = useState({});
  
  // Filter to get just child members
  const childMembers = allMembers.filter(m => m.role === 'child');

  useEffect(() => {
    if (isOpen) {
      if (initialData.id) {
        // Edit mode - populate fields
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
        setPriority(initialData.priority || 'medium');
        setCategory(initialData.category || 'household');
        setAssignedTo(initialData.assignedTo || '');
        setSubtasks(initialData.subtasks || []);
        setHasKidToken(initialData.hasKidToken || false);
        setSelectedKidId(initialData.kidTokenChildId || '');
      } else {
        // Create mode - initialize with defaults
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('medium');
        setCategory('household');
        setAssignedTo('');
        setSubtasks([]);
        setHasKidToken(false);
        setSelectedKidId('');
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors = {};
    if (!title.trim()) newErrors.title = "Title is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const taskData = {
      title,
      description,
      dueDate: dueDate || null,
      priority,
      category,
      assignedTo: assignedTo || null,
      subtasks,
      column: columnId || initialData.column || 'upcoming',
      // Add kid token properties
      hasKidToken,
      kidTokenChildId: hasKidToken ? selectedKidId : null,
      kidTokenVerified: initialData.kidTokenVerified || false,
      childVerified: initialData.childVerified || false,
      ...(initialData.id && { id: initialData.id })
    };
    
    onSave(taskData);
    onClose();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const newSubtaskItem = {
      id: `subtask-${Date.now()}`,
      title: newSubtask,
      completed: false
    };
    
    setSubtasks([...subtasks, newSubtaskItem]);
    setNewSubtask('');
  };

  const removeSubtask = (id) => {
    setSubtasks(subtasks.filter(task => task.id !== id));
  };

  const categories = [
    { id: 'household', name: 'Household', color: 'bg-blue-100 text-blue-800' },
    { id: 'relationship', name: 'Relationship', color: 'bg-pink-100 text-pink-800' },
    { id: 'parenting', name: 'Parenting', color: 'bg-purple-100 text-purple-800' },
    { id: 'errands', name: 'Errands', color: 'bg-green-100 text-green-800' },
    { id: 'work', name: 'Work', color: 'bg-amber-100 text-amber-800' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const priorities = [
    { id: 'low', name: 'Low Priority', color: 'bg-blue-100 text-blue-800' },
    { id: 'medium', name: 'Medium Priority', color: 'bg-amber-100 text-amber-800' },
    { id: 'high', name: 'High Priority', color: 'bg-red-100 text-red-800' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium">
            {initialData.id ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title*
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Task title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.title}
              </p>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              placeholder="Add details about this task..."
            />
          </div>
          
          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar size={14} className="mr-1" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Tag size={14} className="mr-1" />
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-2 rounded-md text-xs text-center ${
                    category === cat.id 
                      ? `${cat.color} border-2 border-gray-800` 
                      : cat.color
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <div className="flex space-x-2">
              {priorities.map(pri => (
                <button
                  key={pri.id}
                  type="button"
                  onClick={() => setPriority(pri.id)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs text-center ${
                    priority === pri.id 
                      ? `${pri.color} border-2 border-gray-800` 
                      : pri.color
                  }`}
                >
                  {pri.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <User size={14} className="mr-1" />
              Assign To
            </label>
            <div className="grid grid-cols-4 gap-2">
              {familyMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setAssignedTo(member.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-md ${
                    assignedTo === member.id 
                      ? 'bg-blue-100 border-2 border-blue-500' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <UserAvatar user={member} size={32} className="mb-1" />
                  <span className="text-xs truncate max-w-full">{member.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtasks
            </label>
            <div className="space-y-2">
              {subtasks.map(task => (
                <div key={task.id} className="flex items-center">
                  <span className="text-sm flex-grow">{task.title}</span>
                  <button 
                    type="button"
                    onClick={() => removeSubtask(task.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              
              <div className="flex">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                  placeholder="Add a subtask..."
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md text-sm"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-r-md hover:bg-gray-200"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Kid Token Section - only show if assignedTo is a parent */}
          {assignedTo && familyMembers.find(m => m.id === assignedTo)?.role === 'parent' && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Star size={14} className="text-yellow-500 mr-2" />
                  Kid Token Verification
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasKidToken}
                    onChange={() => setHasKidToken(!hasKidToken)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {hasKidToken ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
              
              {hasKidToken && (
                <div className="bg-yellow-50 p-3 rounded-md mb-2">
                  <p className="text-sm text-yellow-800 mb-2">
                    A child will verify when this task is completed, earning a "Family Buck" token.
                  </p>
                  
                  {childMembers.length > 0 ? (
                    <>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">
                        Select Child Verifier:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {childMembers.map(child => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setSelectedKidId(child.id)}
                            className={`flex flex-col items-center p-2 rounded-md ${
                              selectedKidId === child.id 
                                ? 'bg-yellow-200 border-2 border-yellow-500' 
                                : 'bg-yellow-100 hover:bg-yellow-200'
                            }`}
                          >
                            <UserAvatar user={child} size={24} className="mb-1" />
                            <span className="text-xs truncate max-w-full">{child.name}</span>
                          </button>
                        ))}
                      </div>
                      {hasKidToken && !selectedKidId && (
                        <p className="text-xs text-red-600 mt-1">
                          Please select a child to verify this task.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-yellow-800">
                      No children available in this family. Add children to use this feature.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
            >
              {initialData.id ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KanbanAddCard;