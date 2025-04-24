// src/components/kanban/FamilyKanbanBoard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DndContext, 
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners 
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import KanbanAddCard from './KanbanAddCard';
import KanbanFilters from './KanbanFilters';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  where,
  serverTimestamp,
  addDoc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { Plus, Loader, AlertCircle, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import CalendarService from '../../services/CalendarService';
import UserAvatar from '../common/UserAvatar';



const FamilyKanbanBoard = ({ hideHeader = false, onMinimize = null }) => {
  const { familyId, familyMembers, selectedUser } = useFamily();
  const { currentUser } = useAuth();
  
  // Board state
  const [columns, setColumns] = useState([
    { id: 'upcoming', title: 'Upcoming', color: 'blue' },
    { id: 'this-week', title: 'This Week', color: 'purple' },
    { id: 'in-progress', title: 'In Progress', color: 'yellow' },
    { id: 'done', title: 'Done', color: 'green' },
    { id: 'needs-help', title: 'Needs Help', color: 'red' }
  ]);
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [viewMode, setViewMode] = useState('board');
  
  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Minimum drag distance for activation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Delay before touch activation (ms)
        tolerance: 5, // Tolerance for movement during delay
      },
    })
  );
  
  // Load tasks from Firestore
  useEffect(() => {
    if (!familyId) return;
    
    setLoading(true);
    setError(null);
    
    const q = query(
      collection(db, "kanbanTasks"),
      where("familyId", "==", familyId)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedTasks = [];
        snapshot.forEach((doc) => {
          loadedTasks.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTasks(loadedTasks);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading tasks:", err);
        setError("Failed to load tasks. Please try again.");
        setLoading(false);
      }
    );
    
    // Also listen for custom event when task is added from chat
  const handleTaskAdded = () => {
    console.log("New task added from chat, refreshing...");
    // No need to do anything as the Firestore listener will update automatically
  };

  window.addEventListener('kanban-task-added', handleTaskAdded);

  return () => {
    unsubscribe();
    window.removeEventListener('kanban-task-added', handleTaskAdded);
  };
    
  }, [familyId]);
  
  // Filter tasks based on search and filters
  const filteredTasks = useCallback(() => {
    return tasks.filter(task => {
      // Search query filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Member filter
      if (selectedMembers.length > 0 && !selectedMembers.includes(task.assignedTo)) {
        return false;
      }
      
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(task.category)) {
        return false;
      }
      
      return true;
    });
  }, [tasks, searchQuery, selectedMembers, selectedCategories]);
  
  // Group tasks by column
  const getTasksByColumn = useCallback((columnId) => {
    return filteredTasks()
      .filter(task => task.column === columnId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [filteredTasks]);
  
  // Save a new task or update existing one
  const saveTask = async (taskData) => {
    try {
      if (!familyId || !currentUser) {
        setError("You must be logged in to save tasks");
        return;
      }
      
      if (taskData.id) {
        // Update existing task
        const taskRef = doc(db, "kanbanTasks", taskData.id);
        await updateDoc(taskRef, {
          ...taskData,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
        
        // Update calendar event if due date exists
        if (taskData.dueDate && taskData.eventId) {
          try {
            await updateCalendarEvent(taskData);
          } catch (calendarError) {
            console.error("Error updating calendar event:", calendarError);
            // Don't block the task update if calendar fails
          }
        } else if (taskData.dueDate && !taskData.eventId) {
          // Create new calendar event
          try {
            await createCalendarEvent(taskData);
          } catch (calendarError) {
            console.error("Error creating calendar event:", calendarError);
          }
        }
      } else {
        // Create new task
        const newTaskData = {
          ...taskData,
          familyId,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          updatedAt: serverTimestamp(),
          position: tasks.filter(t => t.column === taskData.column).length // Position at end of column
        };
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, "kanbanTasks"), newTaskData);
        
        // If due date exists, create calendar event
        if (taskData.dueDate) {
          try {
            await createCalendarEvent({
              ...newTaskData,
              id: docRef.id
            });
          } catch (calendarError) {
            console.error("Error creating calendar event:", calendarError);
          }
        }
      }
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Failed to save task. Please try again.");
    }
  };
  
  // Delete a task
  const deleteTask = async (taskId) => {
    try {
      if (!familyId) return;
      
      const taskToDelete = tasks.find(t => t.id === taskId);
      
      // Delete from Firestore
      await deleteDoc(doc(db, "kanbanTasks", taskId));
      
      // If task had a calendar event, delete it
      if (taskToDelete?.eventId) {
        try {
          await CalendarService.deleteEvent(taskToDelete.eventId, currentUser.uid);
        } catch (calendarError) {
          console.error("Error deleting calendar event:", calendarError);
        }
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task. Please try again.");
    }
  };
  
  // Update subtask completion
  const updateSubtaskCompletion = async (taskId, subtaskId, completed) => {
    try {
      if (!familyId) return;
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const updatedSubtasks = task.subtasks.map(subtask => 
        subtask.id === subtaskId ? { ...subtask, completed } : subtask
      );
      
      // Check if all subtasks are completed
      const allCompleted = updatedSubtasks.every(subtask => subtask.completed);
      
      // Move to Done column if all subtasks are completed
      const newColumn = allCompleted && task.column !== 'done' ? 'done' : task.column;
      
      // Update in Firestore
      const taskRef = doc(db, "kanbanTasks", taskId);
      await updateDoc(taskRef, {
        subtasks: updatedSubtasks,
        updatedAt: serverTimestamp(),
        column: newColumn,
        ...(allCompleted && { completedAt: serverTimestamp() })
      });
      
      // Show confetti if task is completed
      if (allCompleted && newColumn === 'done') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error("Error updating subtask:", err);
      setError("Failed to update subtask. Please try again.");
    }
  };
  
  // Create calendar event from task
  const createCalendarEvent = async (task) => {
    if (!task.dueDate || !currentUser) return;
    
    // Calculate event times
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
    
    const endDate = new Date(dueDate);
    endDate.setHours(endDate.getHours() + 1); // 1 hour duration
    
    // Create event object
    // Create event object for the calendar
const calendarEvent = {
  summary: task.title,
  description: task.description || `Kanban Task: ${task.title}`,
  location: task.location || '',
  start: {
    dateTime: dueDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  end: {
    dateTime: endDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  category: 'task',
  eventType: 'kanban',
  color: task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'blue',
  familyId,
  // Add assigned user information
  attendingParentId: task.assignedTo,
  assignedToName: task.assignedToName,
  reminders: {
    useDefault: true
  }
};
    
    // Add to calendar
    const result = await CalendarService.addEvent(calendarEvent, currentUser.uid);
    
    if (result.success) {
      // Update task with event ID
      const taskRef = doc(db, "kanbanTasks", task.id);
      await updateDoc(taskRef, {
        eventId: result.eventId,
        updatedAt: serverTimestamp()
      });
    }
    
    return result;
  };
  
  // Update calendar event
  const updateCalendarEvent = async (task) => {
    if (!task.dueDate || !task.eventId || !currentUser) return;
    
    // Calculate event times
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
    
    const endDate = new Date(dueDate);
    endDate.setHours(endDate.getHours() + 1); // 1 hour duration
    
    // Create event object
    const calendarEvent = {
      title: task.title,
      description: task.description || `Kanban Task: ${task.title}`,
      start: {
        dateTime: dueDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Update in calendar
    return await CalendarService.updateEvent(task.eventId, calendarEvent, currentUser.uid);
  };
  
  // Handle drag start
  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task);
  };
  
  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTask(null);
      return;
    }
    
    // If task was dropped in a different column
    try {
      const task = tasks.find(t => t.id === active.id);
      
      if (task && task.column !== over.id && columns.find(col => col.id === over.id)) {
        const batch = writeBatch(db);
        
        // Get current position in target column
        const tasksInTargetColumn = tasks.filter(t => t.column === over.id);
        const newPosition = tasksInTargetColumn.length;
        
        // Update the task's column and position
        const taskRef = doc(db, "kanbanTasks", task.id);
        batch.update(taskRef, {
          column: over.id,
          position: newPosition,
          updatedAt: serverTimestamp()
        });
        
        // If moved to "done" column, update completed status
        if (over.id === 'done') {
          batch.update(taskRef, {
            completedAt: serverTimestamp()
          });
          
          // Show confetti animation
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        await batch.commit();
      }
    } catch (err) {
      console.error("Error updating task position:", err);
      setError("Failed to update task position");
    }
    
    setActiveTask(null);
  };
  
  // Handle drag over
  const handleDragOver = (event) => {
    const { active, over } = event;
    
    // Make sure we have valid over and it's a different column
    if (!over || active.id === over.id) return;
    
    const task = tasks.find(t => t.id === active.id);
    const isColumn = columns.find(col => col.id === over.id);
    
    // If dragging over a column, set it as active
    if (isColumn) {
      setActiveColumn(over.id);
    }
  };
  
  // Reorder tasks within a column
  const reorderTasks = async (columnId, startIndex, endIndex) => {
    try {
      const columnTasks = getTasksByColumn(columnId);
      const [removed] = columnTasks.splice(startIndex, 1);
      columnTasks.splice(endIndex, 0, removed);
      
      // Update positions in Firestore
      const batch = writeBatch(db);
      
      columnTasks.forEach((task, index) => {
        const taskRef = doc(db, "kanbanTasks", task.id);
        batch.update(taskRef, { position: index });
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Error reordering tasks:", err);
      setError("Failed to reorder tasks");
    }
  };
  
  // Open add card modal
  const handleAddCard = (columnId) => {
    setActiveColumn(columnId);
    setEditingTask(null);
    setAddCardOpen(true);
  };
  
  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setAddCardOpen(true);
  };
  
  return (
    <div className="family-kanban-board">
      {!hideHeader && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Family Task Board</h2>
          {onMinimize && (
            <button 
              onClick={onMinimize}
              className="p-1 hover:bg-gray-100 rounded"
              title="Minimize board"
            >
              <ChevronUp size={18} />
            </button>
          )}
        </div>
      )}
      
      {/* Filters */}
      <KanbanFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        familyMembers={familyMembers}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button 
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader size={30} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {/* Kanban board */}
          {viewMode === 'board' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            >
             <div className="flex gap-4 overflow-x-auto pb-4" style={{ 
  minHeight: tasks.length > 0 ? '300px' : '150px',
  maxHeight: tasks.length > 10 ? '60vh' : 'auto'
}}>
                <SortableContext 
                  items={columns.map(col => col.id)} 
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map(column => (
                    <KanbanColumn
                      key={column.id}
                      id={column.id}
                      title={column.title}
                      tasks={getTasksByColumn(column.id)}
                      onAddCard={handleAddCard}
                      onEditTask={handleEditTask}
                      onDeleteTask={deleteTask}
                      onCompleteSubtask={updateSubtaskCompletion}
                      familyMembers={familyMembers}
                      color={column.color}
                    />
                  ))}
                </SortableContext>
                
                <DragOverlay>
                  {activeTask ? (
                    <div className="w-[280px]">
                      <KanbanCard 
                        task={activeTask} 
                        familyMembers={familyMembers}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </div>
            </DndContext>
          ) : (
            /* List view */
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks().map(task => {
                    const assignedMember = familyMembers.find(m => m.id === task.assignedTo);
                    
                    return (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.column === 'done' 
                              ? 'bg-green-100 text-green-800' 
                              : task.column === 'needs-help'
                              ? 'bg-red-100 text-red-800'
                              : task.column === 'in-progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {columns.find(c => c.id === task.column)?.title || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignedMember ? (
                            <div className="flex items-center">
                              <UserAvatar user={assignedMember} size={20} className="mr-2" />
                              <div className="text-sm text-gray-900">{assignedMember.name}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.category && (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.category === 'household' 
                                ? 'bg-blue-100 text-blue-800' 
                                : task.category === 'relationship'
                                ? 'bg-pink-100 text-pink-800'
                                : task.category === 'parenting'
                                ? 'bg-purple-100 text-purple-800'
                                : task.category === 'errands'
                                ? 'bg-green-100 text-green-800'
                                : task.category === 'work'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEditTask(task)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredTasks().length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  <p>No tasks match your filters</p>
                </div>
              )}
              
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    setActiveColumn('upcoming');
                    setEditingTask(null);
                    setAddCardOpen(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-1" />
                  Add Task
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Add or edit task modal */}
      <KanbanAddCard
        isOpen={addCardOpen}
        onClose={() => {
          setAddCardOpen(false);
          setEditingTask(null);
        }}
        onSave={saveTask}
        initialData={editingTask || {}}
        familyMembers={familyMembers}
        columnId={activeColumn}
      />
    </div>
  );
};

export default FamilyKanbanBoard;