// src/components/dashboard/tabs/RelationshipTab.jsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, MessageCircle, 
  Brain, Info, CheckCircle, Lightbulb, Target, AlertCircle, 
  Bell, Award, X, RefreshCw, Clock, ArrowRight, Shield, Save, Plus, Star, Link,
  Trash2, Edit, CheckSquare, Square, GripVertical, Tag, MoreHorizontal, Calendar as CalendarIcon
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import confetti from 'canvas-confetti';
import { db } from '../../../services/firebase';
import { 
  doc, setDoc, getDoc, serverTimestamp, 
  updateDoc, collection, query, where, getDocs,
  arrayUnion, Timestamp, addDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import CalendarService from '../../../services/CalendarService';
import RelationshipCalendarIntegration from '../../../services/RelationshipCalendarIntegration';
import EnhancedEventManager from '../../calendar/EnhancedEventManager';
import RelationshipAssessment from '../../relationship/RelationshipAssessment';
import RelationshipPrework from '../../relationship/RelationshipPrework';
import CouplesMeeting from '../../relationship/CouplesMeeting';
import UserAvatar from '../../common/UserAvatar';


// Lazy load heavy components to improve initial load performance
const DailyCheckInTool = lazy(() => import('../DailyCheckInTool'));
const GratitudeTracker = lazy(() => import('../GratitudeTracker'));
const DateNightPlanner = lazy(() => import('../DateNightPlanner'));
const SelfCarePlanner = lazy(() => import('../SelfCarePlanner'));
const CoupleRelationshipChart = lazy(() => import('../CoupleRelationshipChart'));
const RelationshipProgressChart = lazy(() => import('../RelationshipProgressChart'));
const AIRelationshipInsights = lazy(() => import('../AIRelationshipInsights'));
const EnhancedRelationshipCycleHistory = lazy(() => import('../../relationship/EnhancedRelationshipCycleHistory'));



// Helper to format date consistently throughout the component
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
};

/**
 * Shared Todo List Component for couples
 */
const SharedTodoList = ({ familyId, familyMembers }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [selectedTodoForCalendar, setSelectedTodoForCalendar] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState('');
  const [editingTodoCategory, setEditingTodoCategory] = useState('');
  const { currentUser } = useAuth();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  
  
  const inputRef = useRef(null);
  
  const categories = [
    { id: 'household', name: 'Household', color: 'bg-blue-100 text-blue-800' },
    { id: 'relationship', name: 'Relationship', color: 'bg-pink-100 text-pink-800' },
    { id: 'parenting', name: 'Parenting', color: 'bg-purple-100 text-purple-800' },
    { id: 'errands', name: 'Errands', color: 'bg-green-100 text-green-800' },
    { id: 'work', name: 'Work', color: 'bg-amber-100 text-amber-800' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];
  


  
  // Load todos from Firestore with real-time updates
  useEffect(() => {
    if (!familyId) return;
    
    setLoading(true);
    
    // Create a real-time listener for todos
    const todosRef = collection(db, "relationshipTodos");
    const q = query(todosRef, where("familyId", "==", familyId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedTodos = [];
      querySnapshot.forEach((doc) => {
        loadedTodos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by position first, then by most recently created
      loadedTodos.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        // Fall back to creation time if position not available
        return new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0);
      });
      
      setTodos(loadedTodos);
      setLoading(false);
    }, (error) => {
      console.error("Error loading todos:", error);
      setLoading(false);
    });
    
    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, [familyId]);  
  
  // Add new todo
  const addTodo = async () => {
    if (!newTodoText.trim() || !familyId) return;
    
    try {
      const newTodo = {
        text: newTodoText.trim(),
        completed: false,
        familyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
        assignedTo: null, // Not assigned to any parent initially
        category: 'other', // Default category
        position: todos.length, // Add to the end of the list
        notes: '',
        dueDate: null
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "relationshipTodos"), newTodo);
      
      // Update state with the new todo
      setTodos(prev => [...prev, { 
        id: docRef.id,
        ...newTodo,
        createdAt: new Date() // Local version needs a JS date object
      }]);
      
      // Clear input
      setNewTodoText('');
      
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };
  
  // Toggle todo completion
  const toggleTodo = async (todoId) => {
    try {
      const todoIndex = todos.findIndex(todo => todo.id === todoId);
      if (todoIndex === -1) return;
      
      const updatedTodo = {...todos[todoIndex], completed: !todos[todoIndex].completed};
      
      // Update Firestore
      const todoRef = doc(db, "relationshipTodos", todoId);
      await updateDoc(todoRef, {
        completed: updatedTodo.completed,
        updatedAt: serverTimestamp()
      });
      
      // Update state
      const newTodos = [...todos];
      newTodos[todoIndex] = updatedTodo;
      setTodos(newTodos);
      
      // Trigger confetti animation if completed
      if (updatedTodo.completed) {
        const todoElement = document.getElementById(`todo-${todoId}`);
        if (todoElement) {
          const rect = todoElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { 
              x: x / window.innerWidth, 
              y: y / window.innerHeight 
            },
            colors: ['#4ade80', '#3b82f6', '#8b5cf6'],
            zIndex: 9999
          });
        }
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };
  
  // Start editing a todo
  const startEditTodo = (todo) => {
    setEditingTodo(todo.id);
    setEditingTodoText(todo.text);
    setEditingTodoCategory(todo.category);
    
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      const editInput = document.getElementById(`edit-todo-${todo.id}`);
      if (editInput) editInput.focus();
    }, 50);
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingTodo(null);
    setEditingTodoText('');
    setEditingTodoCategory('');
  };
  
  // Save edited todo
  const saveEditedTodo = async (todoId) => {
    if (!editingTodoText.trim()) return cancelEdit();
    
    try {
      const todoIndex = todos.findIndex(todo => todo.id === todoId);
      if (todoIndex === -1) return;
      
      const updatedTodo = {
        ...todos[todoIndex],
        text: editingTodoText.trim(),
        category: editingTodoCategory || 'other',
        updatedAt: new Date()
      };
      
      // Update Firestore
      const todoRef = doc(db, "relationshipTodos", todoId);
      await updateDoc(todoRef, {
        text: updatedTodo.text,
        category: updatedTodo.category,
        updatedAt: serverTimestamp()
      });
      
      // Update state
      const newTodos = [...todos];
      newTodos[todoIndex] = updatedTodo;
      setTodos(newTodos);
      
      // Reset editing state
      cancelEdit();
      
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };
  
  // Delete todo
  const deleteTodo = async (todoId) => {
    setTodoToDelete(todoId);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete todo
  const confirmDeleteTodo = async () => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "relationshipTodos", todoToDelete));
      
      // Update state
      setTodos(prev => prev.filter(todo => todo.id !== todoToDelete));
      
      // Reset states
      setTodoToDelete(null);
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };
  
  // Reassign todo to a different parent
  const reassignTodo = async (todoId, parentId) => {
    try {
      const todoIndex = todos.findIndex(todo => todo.id === todoId);
      if (todoIndex === -1) return;
      
      // Find parent name
      const parent = familyMembers.find(m => m.id === parentId);
      
      const updatedTodo = {
        ...todos[todoIndex],
        assignedTo: parentId,
        assignedToName: parent?.name || 'Unknown'
      };
      
      // Update Firestore
      const todoRef = doc(db, "relationshipTodos", todoId);
      await updateDoc(todoRef, {
        assignedTo: updatedTodo.assignedTo,
        assignedToName: updatedTodo.assignedToName,
        updatedAt: serverTimestamp()
      });
      
      // Update state
      const newTodos = [...todos];
      newTodos[todoIndex] = updatedTodo;
      setTodos(newTodos);
      
    } catch (error) {
      console.error("Error reassigning todo:", error);
    }
  };
  


  
  // Add a due date via calendar integration
  const openCalendarForTodo = (todo) => {
    setSelectedTodoForCalendar(todo);
    setShowAddCalendar(true);
  };
  
  // Handle todo drag and drop
  const handleDragEnd = async (result) => {
    // Drop outside a droppable area
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    // No change
    if (sourceIndex === destinationIndex) return;
    
    try {
      // Reorder the todos
      const filteredTodos = filterTodos();
      const draggedTodo = filteredTodos[sourceIndex];
      
      // Create new array with the moved todo
      const newFilteredTodos = [...filteredTodos];
      newFilteredTodos.splice(sourceIndex, 1);
      newFilteredTodos.splice(destinationIndex, 0, draggedTodo);
      
      // Update the position of all todos in the filtered view
      const updatedAllTodos = [...todos];
      
      // Update positions in the full list based on the new filtered order
      filteredTodos.forEach((todo, oldIndex) => {
        const newIndex = newFilteredTodos.findIndex(t => t.id === todo.id);
        if (oldIndex !== newIndex) {
          const fullListIndex = updatedAllTodos.findIndex(t => t.id === todo.id);
          if (fullListIndex !== -1) {
            updatedAllTodos[fullListIndex] = {
              ...updatedAllTodos[fullListIndex],
              position: newIndex
            };
          }
        }
      });
      
      // Update state immediately for better UX
      setTodos(updatedAllTodos);
      
      // Batch update positions in Firestore
      for (const todo of updatedAllTodos) {
        if (todo.id === draggedTodo.id) {
          const todoRef = doc(db, "relationshipTodos", todo.id);
          await updateDoc(todoRef, { 
            position: todo.position,
            updatedAt: serverTimestamp()
          });
        }
      }
      
    } catch (error) {
      console.error("Error reordering todos:", error);
    }
  };
  
  // Handle successful calendar event addition
  const handleCalendarEventAdded = (eventResult) => {
    if (!eventResult || !eventResult.success || !selectedTodoForCalendar) return;
    
    // Update the todo with the due date and event ID
    updateTodoDueDate(selectedTodoForCalendar.id, eventResult);
    
    // Reset state
    setShowAddCalendar(false);
    setSelectedTodoForCalendar(null);
  };
  
  // Update todo with due date info
  const updateTodoDueDate = async (todoId, eventResult) => {
    try {
      const todoIndex = todos.findIndex(todo => todo.id === todoId);
      if (todoIndex === -1) return;
      
      const updatedTodo = {
        ...todos[todoIndex],
        dueDate: new Date().toISOString(),
        eventId: eventResult.eventId,
        universalId: eventResult.universalId || eventResult.eventId
      };
      
      // Update Firestore
      const todoRef = doc(db, "relationshipTodos", todoId);
      await updateDoc(todoRef, {
        dueDate: updatedTodo.dueDate,
        eventId: updatedTodo.eventId,
        universalId: updatedTodo.universalId,
        updatedAt: serverTimestamp()
      });
      
      // Update state
      const newTodos = [...todos];
      newTodos[todoIndex] = updatedTodo;
      setTodos(newTodos);
      
    } catch (error) {
      console.error("Error updating todo due date:", error);
    }
  };
  
  // Filter todos based on current filters
  const filterTodos = () => {
    return todos.filter(todo => {
      // Filter by completion status
      if (!showCompleted && todo.completed) return false;
      
      // Filter by category
      if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false;
      
      return true;
    });
  };
  
  // Get category display info
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(c => c.id === categoryId) || categories.find(c => c.id === 'other');
    return category;
  };
  
  // Handle keypress in new todo input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };
  
  // Get parent name
  const getParentName = (parentId) => {
    const parent = familyMembers.find(m => m.id === parentId);
    return parent?.name || 'Unassigned';
  };
  
  // Filtered todos
  const filteredTodos = filterTodos();
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-bold flex items-center mb-4 font-roboto">
        <CheckSquare size={20} className="mr-2 text-blue-600" />
        Shared To-Do List
      </h3>
      
      {/* Quick Add Task */}
      <div className="flex items-center mb-4">
        <input
          ref={inputRef}
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new task..."
          className="flex-1 border rounded-l-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-roboto"
        />
        <button
          onClick={addTodo}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors font-roboto flex items-center"
        >
          <Plus size={16} className="mr-1" />
          Add
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-600 mr-1 font-roboto">Filter:</span>
        
        <button
          onClick={() => setCategoryFilter('all')}
          className={`text-xs px-3 py-1 rounded-full transition-colors font-roboto ${
            categoryFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setCategoryFilter(category.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors font-roboto ${
              categoryFilter === category.id ? category.color : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
        
        <div className="ml-auto flex items-center">
          <input
            type="checkbox"
            id="show-completed"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)}
            className="mr-2"
          />
          <label htmlFor="show-completed" className="text-sm font-roboto">
            Show completed
          </label>
        </div>
      </div>
      
      {/* Todo List with Drag and Drop */}
      {loading ? (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-roboto">Loading tasks...</p>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed rounded-lg">
          <p className="text-gray-500 font-roboto">No tasks found</p>
          <p className="text-sm text-gray-400 font-roboto mt-1">
            {!showCompleted && todos.some(t => t.completed) ? 
              'There are completed tasks. Check "Show completed" to view them.' : 
              'Add your first task using the input above!'}
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="todos-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {filteredTodos.map((todo, index) => (
                  <Draggable key={todo.id} draggableId={todo.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border rounded-lg p-3 ${
                          todo.completed ? 'bg-gray-50' : 'bg-white'
                        } ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                        id={`todo-${todo.id}`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-move flex-shrink-0 text-gray-400 p-1 self-center"
                          >
                            <GripVertical size={16} />
                          </div>
                          
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="flex-shrink-0 mt-0.5"
                          >
                            {todo.completed ? (
                              <CheckSquare size={18} className="text-blue-500" />
                            ) : (
                              <Square size={18} className="text-gray-400" />
                            )}
                          </button>
                          
                          {/* Todo Content */}
                          <div className="flex-1 min-w-0">
                            {editingTodo === todo.id ? (
                              <div className="space-y-2">
                                <input
                                  id={`edit-todo-${todo.id}`}
                                  type="text"
                                  value={editingTodoText}
                                  onChange={(e) => setEditingTodoText(e.target.value)}
                                  className="w-full border rounded p-1 text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') saveEditedTodo(todo.id);
                                  }}
                                />
                                
                                <select
                                  value={editingTodoCategory}
                                  onChange={(e) => setEditingTodoCategory(e.target.value)}
                                  className="w-full border rounded p-1 text-sm"
                                >
                                  {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelEdit}
                                    className="px-2 py-1 text-xs border rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveEditedTodo(todo.id)}
                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm break-words font-roboto ${
                                    todo.completed ? 'text-gray-400 line-through' : ''
                                  }`}>
                                    {todo.text}
                                  </p>
                                </div>
                                
                                <div className="flex items-center flex-wrap gap-2 mt-2">
                                  {/* Category Tag */}
                                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                                    getCategoryInfo(todo.category).color
                                  }`}>
                                    <Tag size={10} className="mr-1" />
                                    {getCategoryInfo(todo.category).name}
                                  </span>
                                  
                                  {/* Assigned To */}
                                  {todo.assignedTo && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                                      Assigned to: {getParentName(todo.assignedTo)}
                                    </span>
                                  )}
                                  
                                  {/* Due Date */}
                                  {todo.dueDate && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center">
                                      <CalendarIcon size={10} className="mr-1" />
                                      Due: {new Date(todo.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Actions - Only show when not editing */}
                          {editingTodo !== todo.id && (
                            <div className="flex items-center space-x-1">
                              {/* Calendar Button */}
                              <button
                                onClick={() => openCalendarForTodo(todo)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                title="Add to calendar"
                              >
                                <CalendarIcon size={16} />
                              </button>
                              
                              {/* Assign Menu */}
                              <div className="relative group">
                                <button
                                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                  title="Assign task"
                                >
                                  <Users size={16} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-1 hidden group-hover:block bg-white shadow-lg rounded-md border py-1 z-10 w-32">
                                  {familyMembers
                                    .filter(m => m.role === 'parent')
                                    .map(parent => (
                                      <button
                                        key={parent.id}
                                        onClick={() => reassignTodo(todo.id, parent.id)}
                                        className={`w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${
                                          todo.assignedTo === parent.id ? 'font-medium' : ''
                                        }`}
                                      >
                                        {parent.name}
                                      </button>
                                    ))}
                                  <button
                                    onClick={() => reassignTodo(todo.id, null)}
                                    className="w-full text-left px-3 py-1 text-sm hover:bg-gray-100 border-t"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              </div>
                              
                              {/* Edit Button */}
                              <button
                                onClick={() => startEditTodo(todo)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                title="Edit task"
                              >
                                <Edit size={16} />
                              </button>
                              
                              {/* Delete Button */}
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      
      {/* Calendar Modal */}
      {showAddCalendar && selectedTodoForCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add Task to Calendar</h3>
              <button
                onClick={() => {
                  setShowAddCalendar(false);
                  setSelectedTodoForCalendar(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            
            <EnhancedEventManager
              initialEvent={{
                title: selectedTodoForCalendar.text,
                description: `Todo: ${selectedTodoForCalendar.text}`,
                category: 'task',
                eventType: 'task',
              }}
              selectedDate={new Date()}
              onSave={handleCalendarEventAdded}
              onCancel={() => {
                setShowAddCalendar(false);
                setSelectedTodoForCalendar(null);
              }}
              isCompact={true}
              mode="create"
            />
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Delete Task</h3>
            <p className="mb-6">Are you sure you want to delete this task?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTodo}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced component to track and manage relationship cycles
 */
const CycleManager = ({ cycle }) => {
  const { 
    familyId, 
    currentUser,
    familyMembers,
    getRelationshipCycleData,
    completeRelationshipAssessment,
    completeRelationshipPrework,
    scheduleCouplesMeeting,
    completeCouplesMeeting
  } = useFamily();
  
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  

  
  // UI state for the different components
  const [showAssessment, setShowAssessment] = useState(false);
  const [showPrework, setShowPrework] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  
  // Get parent IDs for tracking progress
  const parentIds = familyMembers
    .filter(m => m.role === 'parent')
    .map(p => p.id);
  
  // Helper for checking completion status
  const isCurrentUserComplete = (section) => {
    if (!cycleData || !currentUser) return false;
    return cycleData[section]?.[currentUser.uid]?.completed || false;
  };
  
  const isPartnerComplete = (section) => {
    if (!cycleData || !currentUser || parentIds.length < 2) return false;
    
    // Find partner ID (other parent)
    const partnerId = parentIds.find(id => id !== currentUser.uid);
    if (!partnerId) return false;
    
    return cycleData[section]?.[partnerId]?.completed || false;
  };
  
  const isSectionComplete = (section) => {
    if (!cycleData) return false;
    return cycleData[`${section}Completed`] || false;
  };
  


  
  // Load cycle data
  useEffect(() => {
    const loadCycleData = async () => {
      if (!familyId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getRelationshipCycleData(cycle);
        setCycleData(data);
      } catch (err) {
        console.error("Error loading cycle data:", err);
        setError("Failed to load relationship cycle data");
      } finally {
        setLoading(false);
      }
    };
    
    loadCycleData();
  }, [cycle, familyId, getRelationshipCycleData]);
  
// Inside the CycleManager component in RelationshipTab.jsx





// Handle meeting scheduling
const handleScheduleMeeting = async (event) => {
  try {
    // Format the data for the calendar
    const meetingDate = new Date(event.start.dateTime);
    
    // Call the context function
    await scheduleCouplesMeeting(cycle, meetingDate);
    
    // Update local state
    setCycleData(prev => ({
      ...prev,
      meeting: {
        ...prev.meeting,
        scheduled: true,
        scheduledDate: meetingDate.toISOString()
      }
    }));
    
    setShowScheduleModal(false);
  } catch (error) {
    console.error("Error scheduling meeting:", error);
    setError("Failed to schedule the meeting. Please try again.");
  }
};

useEffect(() => {
  // Only show auth error if we're definitely not loading AND there's no user
  if (!loading && !currentUser && familyId) {
    console.log("Auth check - no currentUser but familyId exists:", familyId);
    // Instead of showing error immediately, try to get user from context
    if (familyMembers && familyMembers.length > 0 && familyMembers.some(m => m.role === 'parent')) {
      console.log("Found family members, proceeding without currentUser");
      // We have family data, so we can continue even without currentUser
      return;
    }
    setError("Authentication required. Please sign in to continue.");
  }
}, [currentUser, loading, familyId, familyMembers]);



  // Handle assessment completion
  const handleAssessmentSubmit = async (responses) => {
    try {
      if (!currentUser?.uid) {
        setError("You need to be signed in to complete the assessment");
        return false;
      }
      
      await completeRelationshipAssessment(cycle, responses);
  
      
      // Update local state
      const updatedData = { ...cycleData };
      if (!updatedData.assessments) updatedData.assessments = {};
      
      updatedData.assessments[currentUser.uid] = {
        completed: true,
        completedDate: new Date().toISOString(),
        responses: responses
      };
      
      const bothComplete = parentIds.every(id => 
        updatedData.assessments[id]?.completed
      );
      
      if (bothComplete) {
        updatedData.assessmentsCompleted = true;
        updatedData.assessmentsCompletedDate = new Date().toISOString();
      }
      
      setCycleData(updatedData);
      setShowAssessment(false);
      
      return true;
    } catch (err) {
      console.error("Error completing assessment:", err);
      throw err;
    }
  };
  
  // Handle prework completion
  const handlePreworkSubmit = async (preworkData) => {
    try {
      await completeRelationshipPrework(cycle, preworkData);
      
      // Update local state
      const updatedData = { ...cycleData };
      if (!updatedData.prework) updatedData.prework = {};
      
      updatedData.prework[currentUser.uid] = {
        completed: true,
        completedDate: new Date().toISOString(),
        ...preworkData
      };
      
      const bothComplete = parentIds.every(id => 
        updatedData.prework[id]?.completed
      );
      
      if (bothComplete) {
        updatedData.preworkCompleted = true;
        updatedData.preworkCompletedDate = new Date().toISOString();
      }
      
      setCycleData(updatedData);
      setShowPrework(false);
      
      return true;
    } catch (err) {
      console.error("Error completing prework:", err);
      throw err;
    }
  };
  
  // Handle meeting scheduling
  const processScheduleMeeting = async (eventData) => {
    try {
      // Extract date from the event data
      const meetingDate = new Date(eventData.start.dateTime);
      
      await scheduleCouplesMeeting(cycle, meetingDate);
      
      // Update local state
      const updatedData = { ...cycleData };
      if (!updatedData.meeting) updatedData.meeting = {};
      
      updatedData.meeting.scheduled = true;
      updatedData.meeting.scheduledDate = meetingDate.toISOString();
      
      setCycleData(updatedData);
      setShowScheduleMeeting(false);
      
      return true;
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      throw err;
    }
  };
  
  // Handle meeting completion
  const handleMeetingComplete = async (meetingData) => {
    try {
      await completeCouplesMeeting(cycle, meetingData);
      
      // Update local state
      const updatedData = { ...cycleData };
      if (!updatedData.meeting) updatedData.meeting = {};
      
      updatedData.meeting.completed = true;
      updatedData.meeting.completedDate = new Date().toISOString();
      updatedData.meeting.notes = meetingData.notes || {};
      updatedData.meeting.actionItems = meetingData.actionItems || [];
      updatedData.meeting.nextMeeting = meetingData.nextMeeting;
      
      updatedData.status = "completed";
      updatedData.endDate = new Date().toISOString();
      
      setCycleData(updatedData);
      setShowMeeting(false);
      
      return true;
    } catch (err) {
      console.error("Error completing meeting:", err);
      throw err;
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-medium font-roboto">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
  
  const myAssessmentComplete = isCurrentUserComplete('assessments');
  const partnerAssessmentComplete = isPartnerComplete('assessments');
  const assessmentsComplete = isSectionComplete('assessments');
  
  const myPreworkComplete = isCurrentUserComplete('prework');
  const partnerPreworkComplete = isPartnerComplete('prework');
  const preworkComplete = isSectionComplete('prework');
  
  const meetingScheduled = cycleData?.meeting?.scheduled || false;
  const meetingDate = cycleData?.meeting?.scheduledDate;
  const meetingComplete = cycleData?.meeting?.completed || false;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold font-roboto">Relationship Cycle {cycle}</h3>
          <p className="text-sm text-gray-600 font-roboto mt-1">
            Complete your individual assessments, then work together to strengthen your relationship.
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-roboto shadow-md">
          Current Cycle
        </div>
      </div>
      
{/* Progress Indicator with Parent Profiles */}
<div className="mt-8 mb-8">
  {/* Step Labels MOVED ABOVE the progress bar */}
  <div className="flex justify-between mb-2">
    <div className="text-center w-1/3">
      <div className={`text-sm font-medium ${
        myAssessmentComplete || partnerAssessmentComplete ? 'text-purple-600' : 'text-gray-500'
      }`}>
        STEP 1
      </div>
      <div className="text-xs text-gray-600">Assessments</div>
    </div>
    <div className="text-center w-1/3">
      <div className={`text-sm font-medium ${preworkComplete ? 'text-purple-600' : 'text-gray-500'}`}>
        STEP 2
      </div>
      <div className="text-xs text-gray-600">Pre-Meeting Work</div>
    </div>
    <div className="text-center w-1/3">
      <div className={`text-sm font-medium ${meetingComplete ? 'text-purple-600' : 'text-gray-500'}`}>
        STEP 3
      </div>
      <div className="text-xs text-gray-600">Couple Meeting</div>
    </div>
  </div>

  {/* Progress Bar */}
  <div className="relative mb-10">
    <div className="h-2 bg-gray-200 rounded-full w-full relative">
      <div className={`absolute left-0 h-2 rounded-full transition-all duration-500 ${
        meetingComplete ? 'w-full bg-gradient-to-r from-green-400 to-green-500' :
        preworkComplete ? 'w-2/3 bg-gradient-to-r from-purple-500 to-pink-500' :
        myAssessmentComplete && partnerAssessmentComplete ? 'w-1/3 bg-gradient-to-r from-blue-400 to-purple-500' :
        'w-0'
      }`}></div>
    </div>
    
    {/* Step Number Markers */}
    <div className="absolute top-0 left-0 transform -translate-y-1/2 w-full">
      <div className="flex justify-between">
        {/* Step 1 */}
        <div className="relative flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 ${
            myAssessmentComplete || partnerAssessmentComplete 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}>
            1
          </div>
        </div>
        
        {/* Step 2 */}
        <div className="relative flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 ${
            preworkComplete 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}>
            2
          </div>
        </div>
        
        {/* Step 3 */}
        <div className="relative flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 ${
            meetingComplete 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}>
            3
          </div>
        </div>
      </div>
    </div>
  </div>
  
  {/* Parent Profile Pictures - Moved down and fixed position calculation */}
  <div className="flex justify-center gap-4">
    {familyMembers.filter(m => m.role === 'parent').map((parent, index) => {
      const isCurrentUser = currentUser && parent.id === currentUser.uid;
      const hasCompleted = isCurrentUser ? myAssessmentComplete : partnerAssessmentComplete;
      
      // Always show at step 1 before completing assessment
      let stepPosition = 1;
      if (hasCompleted) {
        if (preworkComplete) stepPosition = 2;
        if (meetingComplete) stepPosition = 3;
      }
      
      return (
        <div key={parent.id} className="flex flex-col items-center">
          <div className="relative">
            <UserAvatar 
              user={parent} 
              size={40}
              className={`border-2 ${hasCompleted ? 'border-green-500' : 'border-gray-300'}`}
            />
            
            {hasCompleted && (
              <span className="absolute -top-1 -right-1">
                <CheckCircle size={16} className="text-green-500 bg-white rounded-full" />
              </span>
            )}
          </div>
          <span className="text-xs mt-1 font-medium">{parent.name}</span>
          <span className="text-xs text-gray-500">Step {stepPosition}</span>
        </div>
      );
    })}
  </div>
</div>          
  

        {/* Action Buttons - Shows different options based on progress */}
<div className="flex flex-wrap justify-center mt-4 gap-4">
  {/* Step 1: Assessment */}
  {!myAssessmentComplete && (
    <button 
      className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center shadow-md transition-all duration-300 bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg"
      onClick={() => {
        if (currentUser?.uid) {
          setShowAssessment(true);
        } else {
          setError("You need to be signed in to complete the assessment");
        }
      }}
    >
      <Shield size={16} className="mr-2" />
      Complete Your Assessment
    </button>
  )}
  
  {myAssessmentComplete && !partnerAssessmentComplete && (
    <div className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center bg-gray-100 text-gray-500">
      <CheckCircle size={16} className="mr-2" />
      Your Assessment Complete
      <span className="ml-2 text-xs">Waiting for partner</span>
    </div>
  )}
  
  {/* Step 2: Pre-Meeting Work */}
  {assessmentsComplete && !myPreworkComplete && (
    <button 
      className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center shadow-md transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg"
      onClick={() => setShowPrework(true)}
    >
      <Brain size={16} className="mr-2" />
      Complete Pre-Meeting Work
    </button>
  )}
  
  {myPreworkComplete && !partnerPreworkComplete && (
    <div className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center bg-gray-100 text-gray-500">
      <CheckCircle size={16} className="mr-2" />
      Your Pre-Work Complete
      <span className="ml-2 text-xs">Waiting for partner</span>
    </div>
  )}
  
  {/* Step 3: Couple Meeting */}
  {preworkComplete && !meetingScheduled && (
    <button 
      className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center shadow-md transition-all duration-300 bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:shadow-lg"
      onClick={() => setShowScheduleMeeting(true)}
    >
      <Calendar size={16} className="mr-2" />
      Schedule Couple Meeting
    </button>
  )}
  
  {meetingScheduled && !meetingComplete && (
    <div className="flex flex-wrap gap-4 justify-center w-full">
      <div className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center bg-amber-100 text-amber-800">
        <Calendar size={16} className="mr-2" />
        Meeting Scheduled: {formatDate(meetingDate)}
      </div>
      
      <button 
        className="px-4 py-2.5 rounded-lg font-medium font-roboto flex items-center shadow-md transition-all duration-300 bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg"
        onClick={() => setShowMeeting(true)}
      >
        <Users size={16} className="mr-2" />
        Start Meeting Now
      </button>
    </div>
  )}
  
  {/* Completed Cycle */}
  {meetingComplete && (
    <button 
      className="px-4 py-2.5 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg font-medium font-roboto flex items-center shadow-md hover:shadow-lg transition-all duration-300"
      onClick={() => {
        document.getElementById('relationship-charts')?.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      <Target size={16} className="mr-2" />
      View Cycle Results
    </button>
  )}
</div>
      
      
      {/* Metrics Display if complete */}
      {cycleData?.metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mt-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              {cycleData.metrics.satisfaction?.toFixed(1) || "3.0"}
            </div>
            <div className="text-xs text-gray-600 font-roboto">Satisfaction</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              {cycleData.metrics.communication?.toFixed(1) || "3.0"}
            </div>
            <div className="text-xs text-gray-600 font-roboto">Communication</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
              {cycleData.metrics.connection?.toFixed(1) || "3.0"}
            </div>
            <div className="text-xs text-gray-600 font-roboto">Connection</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-500">
              {cycleData.metrics.workload?.toFixed(1) || "3.0"}
            </div>
            <div className="text-xs text-gray-600 font-roboto">Workload Balance</div>
          </div>
        </div>
      )}
      
      {/* Assessment Modal */}
      {showAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <RelationshipAssessment
              questions={[
                { id: 'satisfaction', text: 'How satisfied are you with your relationship overall?', category: 'satisfaction' },
                { id: 'communication', text: 'How would you rate communication in your relationship?', category: 'communication' },
                { id: 'conflict', text: 'How well do you and your partner handle conflicts?', category: 'communication' },
                { id: 'connection', text: 'How emotionally connected do you feel to your partner?', category: 'connection' },
                { id: 'intimacy', text: 'How satisfied are you with the level of intimacy in your relationship?', category: 'connection' },
                { id: 'workload', text: 'How fair do you feel the distribution of household responsibilities is?', category: 'workload' },
                { id: 'parenting', text: 'How well do you work together as parents?', category: 'workload' },
                { id: 'support', text: 'How supported do you feel by your partner?', category: 'connection' },
                { id: 'priorities', text: 'How well does your partner understand your priorities?', category: 'communication' },
                { id: 'appreciation', text: 'How appreciated do you feel in your relationship?', category: 'connection' },
                { id: 'challenges', text: 'Describe the biggest challenges in your relationship right now.', category: 'satisfaction' },
                { id: 'strengths', text: 'What do you see as the greatest strengths of your relationship?', category: 'satisfaction' }
              ]}
              onSubmit={handleAssessmentSubmit}
              cycle={cycle}
              previousData={cycleData?.assessments?.[currentUser.uid] || null}
              onCancel={() => setShowAssessment(false)}
            />
          </div>
        </div>
      )}
      
      {/* Prework Modal */}
      {showPrework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <RelationshipPrework
              cycle={cycle}
              onSubmit={handlePreworkSubmit}
              onCancel={() => setShowPrework(false)}
            />
          </div>
        </div>
      )}
      
      {/* Schedule Meeting Modal */}
      {showScheduleMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Schedule Couple's Meeting</h3>
              <button
                onClick={() => setShowScheduleMeeting(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            
            <EnhancedEventManager
              initialEvent={{
                title: `Couple's Meeting - Cycle ${cycle}`,
                description: "Relationship strengthening discussion based on your individual assessments.",
                category: 'relationship',
                eventType: 'couple-meeting',
              }}
              selectedDate={new Date()}
              onSave={handleScheduleMeeting}
              onCancel={() => setShowScheduleMeeting(false)}
              isCompact={true}
              mode="create"
            />
          </div>
        </div>
      )}
      
      {/* Meeting Modal */}
      {showMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CouplesMeeting
              cycle={cycle}
              meetingData={cycleData}
              onComplete={handleMeetingComplete}
              onCancel={() => setShowMeeting(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main RelationshipTab Component
 */
const RelationshipTab = () => {
  const { 
    selectedUser, 
    familyMembers, 
    familyId,
    currentWeek,
    relationshipStrategies,
    getRelationshipTrendData,
    weekHistory
  } = useFamily();
  
  const { currentUser } = useAuth();
  const { getQuestionsByCategory } = useSurvey();

  // We'll use currentCycle instead of currentWeek for clarity
  const currentCycle = currentWeek;

  // State variables
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    tools: true,
    charts: false,
    history: true,
    resources: false,
    todos: true
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasError, setHasError] = useState(null);
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);
  const [hasEnoughDataForCharts, setHasEnoughDataForCharts] = useState(false);
  const [cycleHistory, setCycleHistory] = useState([]);

  
  // Refs for scrolling
  const toolsRef = useRef(null);
  const chartsRef = useRef(null);
  const todosRef = useRef(null);
  
  // Load relationship data
  useEffect(() => {
    const loadRelationshipData = async () => {
      setIsLoadingData(true);
      
      try {
        if (!familyId) {
          setIsLoadingData(false);
          return;
        }
        
        // Load cycle history to check if we have enough data for charts
        await loadCycleHistory();
        
        setIsLoadingData(false);
      } catch (error) {
        console.error("Error loading relationship data:", error);
        setHasError("There was an error loading your relationship data. Please try refreshing the page.");
        setIsLoadingData(false);
      }
    };
    
    loadRelationshipData();
  }, [familyId, currentCycle]);
  
  // Load cycle history
  const loadCycleHistory = async () => {
    try {
      if (!familyId) return;
      
      // Query Firestore for all cycle data
      const relationshipCyclesRef = collection(db, "relationshipCycles");
      const q = query(relationshipCyclesRef, where("familyId", "==", familyId));
      const querySnapshot = await getDocs(q);
      
      const history = [];
      
      // Process each document
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Extract cycle number from document ID (format: familyId-cycleX)
        const cycleMatch = doc.id.match(/-cycle(\d+)$/);
        if (cycleMatch && cycleMatch[1]) {
          const cycleNum = parseInt(cycleMatch[1]);
          
          history.push({
            cycle: cycleNum,
            data: data,
            date: data.endDate || data.startDate || new Date().toISOString()
          });
        }
      });
      
      // Check if we have enough data for charts (at least 1 completed cycle)
      const completedCycles = history.filter(cycle => cycle.data.status === 'completed');
      setHasEnoughDataForCharts(completedCycles.length > 0);
      
    } catch (error) {
      console.error("Error loading cycle history:", error);
    }
  };
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle switching to a history cycle
  const handleSelectHistoryCycle = (cycleNum) => {
    // Find the cycle data
    const cycleData = cycleHistory.find(c => c.cycle === cycleNum);
    if (cycleData) {
      setSelectedHistoryCycle(cycleData);
    }
  };
  
  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, description, borderColor = "border-black", icon = <Heart size={20} className="mr-2" />, notificationCount = 0) => (
    <div className={`border-l-4 ${borderColor} p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2`} 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex-1">
        <div className="flex items-center">
          {icon}
          <h4 className="font-medium text-lg font-roboto">{title}</h4>
          {notificationCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
              {notificationCount}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600 mt-1 font-roboto ml-7">{description}</p>
        )}
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100">
        {expandedSections[sectionKey] ? 
          <ChevronUp size={20} className="text-gray-400" /> : 
          <ChevronDown size={20} className="text-gray-400" />
        }
      </button>
    </div>
  );

  // Check if user is a parent
  const isParent = selectedUser && selectedUser.role === 'parent';

  // If user is not a parent, show limited view
  if (!isParent) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Heart size={60} className="mx-auto text-pink-500 mb-4" />
          <h3 className="text-xl font-bold mb-3 font-roboto">Relationship Features</h3>
          <p className="text-gray-600 mb-4 font-roboto">
            These features are designed for parents to strengthen their relationship.
          </p>
          <p className="text-gray-600 font-roboto">
            Please log in as a parent to access these tools.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 font-roboto">Loading relationship data...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if there was a problem
  if (hasError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="mr-2" size={24} />
          <h3 className="text-lg font-bold font-roboto">Error Loading Relationship Data</h3>
        </div>
        <p className="text-gray-600 mb-4 font-roboto">{hasError}</p>
        <button 
          className="px-4 py-2 bg-black text-white rounded font-roboto"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Main view for parents
  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start mb-4">
          <div className="mr-4 flex-shrink-0">
            <Heart size={32} className="text-pink-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Strength</h3>
            <p className="text-gray-600 font-roboto">
              Research shows that a strong parental relationship directly impacts family balance and children's wellbeing. 
              Use these tools to nurture your partnership while balancing family responsibilities.
            </p>
          </div>
        </div>

        {/* Cycle Manager */}
        <CycleManager cycle={currentCycle} />
      </div>

      {/* Shared To Do List Section */}
      {renderSectionHeader(
        "Shared To-Do List", 
        "todos", 
        "Manage tasks together with your partner",
        "border-green-500", 
        <CheckSquare size={20} className="mr-2 text-green-600" />
      )}
      
      {expandedSections.todos && (
        <div ref={todosRef}>
          <SharedTodoList 
            familyId={familyId}
            familyMembers={familyMembers}
          />
        </div>
      )}

      {/* AI Insights Section */}
      {renderSectionHeader(
        "AI Relationship Insights", 
        "insights", 
        "Personalized recommendations based on your relationship data",
        "border-black", 
        <Brain size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.insights && (
        <div className="space-y-4">
          <Suspense fallback={
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
            </div>
          }>
            <AIRelationshipInsights />
          </Suspense>
        </div>
      )}

      {/* Relationship Charts Section */}
      {renderSectionHeader(
        "Relationship Charts", 
        "charts", 
        "Track your relationship progress over time",
        "border-black", 
        <Target size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.charts && (
        <div id="relationship-charts" ref={chartsRef} className="space-y-6">
          {hasEnoughDataForCharts ? (
            <Suspense fallback={
              <div className="p-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            }>
              <>
                <CoupleRelationshipChart />
                <RelationshipProgressChart />
              </>
            </Suspense>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <Target size={48} className="mx-auto text-gray-400 mb-3" />
              <h4 className="text-lg font-medium mb-2 font-roboto">Chart Data Not Available Yet</h4>
              <p className="text-gray-600 mb-4 font-roboto">
                Complete your first relationship cycle to see your relationship trends. 
                This will help you track progress over time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Relationship Tools Section */}
      {renderSectionHeader(
        "Relationship Tools", 
        "tools", 
        "Tools to strengthen your connection daily",
        "border-black", 
        <Clock size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.tools && (
        <div id="relationship-tools" ref={toolsRef} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Suspense fallback={
              <div className="p-6 border rounded-lg flex justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            }>
              <DailyCheckInTool 
                onAddToCalendar={event => RelationshipCalendarIntegration.addCheckInToCalendar(
                  currentUser?.uid, 
                  currentCycle,
                  event
                )}
              />
            </Suspense>
            
            <Suspense fallback={
              <div className="p-6 border rounded-lg flex justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            }>
              <GratitudeTracker 
                onAddToCalendar={event => RelationshipCalendarIntegration.addSelfCareToCalendar(
                  currentUser?.uid,
                  {
                    ...event,
                    title: "Gratitude Practice",
                    category: "self-care"
                  }
                )}
                enableTexting={true}
              />
            </Suspense>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Suspense fallback={
              <div className="p-6 border rounded-lg flex justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            }>
              <DateNightPlanner 
                onAddToCalendar={dateNight => RelationshipCalendarIntegration.addDateNightToCalendar(
                  currentUser?.uid,
                  dateNight
                )}
              />
            </Suspense>
            
            <Suspense fallback={
              <div className="p-6 border rounded-lg flex justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
              </div>
            }>
              <SelfCarePlanner 
                onAddToCalendar={activity => RelationshipCalendarIntegration.addSelfCareToCalendar(
                  currentUser?.uid,
                  activity
                )}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Relationship History Section */}
      {renderSectionHeader(
        "Relationship History", 
        "history", 
        "View your past relationship cycles and progress",
        "border-black", 
        <Calendar size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.history && (
        <Suspense fallback={
          <div className="p-6 border rounded-lg flex justify-center">
            <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
          </div>
        }>
          <EnhancedRelationshipCycleHistory 
            onSelectCycle={handleSelectHistoryCycle} 
            compact={false}
          />
        </Suspense>
      )}

      {/* Research Section */}
      {renderSectionHeader(
        "Relationship Resources", 
        "resources", 
        "Research-backed information to strengthen your relationship",
        "border-black", 
        <Info size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.resources && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-gray-600" />
                The Connection Between Balance and Relationship Health
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Studies show that couples who share household and parenting responsibilities more equitably report 37% higher relationship satisfaction and are 45% more likely to describe their relationship as "thriving."
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-gray-600" />
                How Children Benefit from Strong Parental Relationships
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Children in homes with strong parental bonds show better emotional regulation, higher academic achievement, and fewer behavioral problems regardless of family structure.
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-gray-600" />
                Building Connection During Busy Family Life
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Daily micro-connections of just 5-10 minutes have been shown to maintain relationship satisfaction even during highly stressful family periods. Quality matters more than quantity.
              </p>
            </div>
            
            {/* Recommended Books */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-roboto">Recommended Books</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">The 5 Love Languages</h5>
                      <p className="text-xs text-gray-600 font-roboto">Gary Chapman</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">Fair Play</h5>
                      <p className="text-xs text-gray-600 font-roboto">Eve Rodsky</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">And Baby Makes Three</h5>
                      <p className="text-xs text-gray-600 font-roboto">John & Julie Gottman</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Link to Allie Chat */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <MessageCircle size={20} className="text-blue-500 mr-2 mt-1" />
                <div>
                  <h5 className="font-medium mb-1 font-roboto">Ask Allie</h5>
                  <p className="text-sm text-gray-600 font-roboto">
                    Need relationship advice? Ask Allie for tips, schedule date nights, or set up couple check-ins directly in the chat.
                  </p>
                  <button 
                    onClick={() => {
                      // Dispatch event to open Allie chat
                      window.dispatchEvent(new CustomEvent('open-allie-chat'));
                    }}
                    className="mt-2 px-4 py-2 bg-black text-white rounded text-sm flex items-center justify-center w-auto inline-block"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Chat with Allie
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Cycle View Modal */}
      {selectedHistoryCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold font-roboto">Cycle {selectedHistoryCycle.cycle} Details</h3>
              <button
                onClick={() => setSelectedHistoryCycle(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium font-roboto">Completed on {formatDate(selectedHistoryCycle.date)}</h4>
                
                <div className="flex space-x-2">
                  {selectedHistoryCycle.data?.metrics && (
                    <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                      <Award size={12} className="mr-1" />
                      {selectedHistoryCycle.data.metrics.satisfaction?.toFixed(1) || "3.0"}/5 Satisfaction
                    </span>
                  )}
                </div>
              </div>
              
              {selectedHistoryCycle.data?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-500">{selectedHistoryCycle.data.metrics.satisfaction?.toFixed(1) || "3.0"}</div>
                    <div className="text-sm text-gray-600 font-roboto">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{selectedHistoryCycle.data.metrics.communication?.toFixed(1) || "3.0"}</div>
                    <div className="text-sm text-gray-600 font-roboto">Communication</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{selectedHistoryCycle.data.metrics.connection?.toFixed(1) || "3.0"}</div>
                    <div className="text-sm text-gray-600 font-roboto">Connection</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{selectedHistoryCycle.data.metrics.workload?.toFixed(1) || "3.0"}</div>
                    <div className="text-sm text-gray-600 font-roboto">Workload</div>
                  </div>
                </div>
              )}
              
              {/* Meeting Notes */}
              {selectedHistoryCycle.data?.meeting?.notes && (
                <div>
                  <h4 className="font-medium mb-2 font-roboto">Meeting Notes</h4>
                  
                  {selectedHistoryCycle.data.meeting.notes.topicResponses && Object.keys(selectedHistoryCycle.data.meeting.notes.topicResponses).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedHistoryCycle.data.meeting.notes.topicResponses).map(([topic, response], index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h5 className="text-sm font-medium mb-1 font-roboto">Topic {index + 1}</h5>
                          <p className="text-sm text-gray-600 font-roboto whitespace-pre-wrap">{response}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No detailed meeting notes available.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Items */}
              {selectedHistoryCycle.data?.meeting?.actionItems && selectedHistoryCycle.data.meeting.actionItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 font-roboto">Action Items</h4>
                  <div className="space-y-2">
                    {selectedHistoryCycle.data.meeting.actionItems.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start">
                          <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5" />
                          <p className="text-sm font-roboto">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTab;