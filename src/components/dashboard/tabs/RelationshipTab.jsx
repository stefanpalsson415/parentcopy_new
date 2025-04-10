// src/components/dashboard/tabs/RelationshipTab.jsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, MessageCircle, 
  Brain, Info, CheckCircle, Lightbulb, Target, AlertCircle, 
  Bell, Award, X, RefreshCw, Clock, ArrowRight, Shield, Save, Plus, Star, Link,
  Trash2, Edit, CheckSquare, Square, DragHandleDots2, Tag, MoreHorizontal, Calendar as CalendarIcon
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
  arrayUnion, Timestamp, addDoc, deleteDoc 
} from 'firebase/firestore';
import CalendarService from '../../../services/CalendarService';
import RelationshipCalendarIntegration from '../../../services/RelationshipCalendarIntegration';
import EnhancedEventManager from '../../calendar/EnhancedEventManager';

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
  
  const inputRef = useRef(null);
  
  const categories = [
    { id: 'household', name: 'Household', color: 'bg-blue-100 text-blue-800' },
    { id: 'relationship', name: 'Relationship', color: 'bg-pink-100 text-pink-800' },
    { id: 'parenting', name: 'Parenting', color: 'bg-purple-100 text-purple-800' },
    { id: 'errands', name: 'Errands', color: 'bg-green-100 text-green-800' },
    { id: 'work', name: 'Work', color: 'bg-amber-100 text-amber-800' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];
  
  // Load todos from Firestore
  useEffect(() => {
    const loadTodos = async () => {
      if (!familyId) return;
      
      setLoading(true);
      try {
        const todosRef = collection(db, "relationshipTodos");
        const q = query(todosRef, where("familyId", "==", familyId));
        const querySnapshot = await getDocs(q);
        
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
          return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
        });
        
        setTodos(loadedTodos);
      } catch (error) {
        console.error("Error loading todos:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTodos();
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
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "relationshipTodos", todoId));
      
      // Update state
      setTodos(prev => prev.filter(todo => todo.id !== todoId));
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
                            <DragHandleDots2 size={16} />
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
    </div>
  );
};

/**
 * Component to track and manage relationship cycles
 */
const CycleManager = ({ cycle, cycleData, onStartQuestionnaire, onStartMeeting }) => {
  const [cycleProgress, setCycleProgress] = useState({
    questionnaire: false,
    meeting: false,
    results: false
  });

  useEffect(() => {
    // Update progress state based on cycleData
    setCycleProgress({
      questionnaire: cycleData?.questionnaireCompleted || false,
      meeting: !!cycleData?.meeting,
      results: !!cycleData?.metrics
    });
  }, [cycleData]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold font-roboto">Relationship Cycle {cycle}</h3>
          <p className="text-sm text-gray-600 font-roboto mt-1">
            Complete check-ins, meetings, and activities to strengthen your relationship
          </p>
        </div>
        <div className="bg-black text-white px-4 py-1 rounded-full text-sm font-roboto">
          Current Cycle
        </div>
      </div>
      
      <div className="relative mt-8 mb-6">
        {/* Cycle Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full w-full mb-8 relative">
          {/* Progress Indicators */}
          <div className={`absolute left-0 h-2 rounded-full transition-all duration-500 ${
            cycleProgress.questionnaire && cycleProgress.meeting && cycleProgress.results 
              ? 'w-full bg-green-500'
              : cycleProgress.questionnaire && cycleProgress.meeting
                ? 'w-2/3 bg-blue-500'
                : cycleProgress.questionnaire
                  ? 'w-1/3 bg-blue-300'
                  : 'w-0'
          }`}></div>
          
          {/* Step Markers */}
          <div className="absolute top-0 left-0 transform -translate-y-1/2 w-full">
            <div className="flex justify-between">
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  cycleProgress.questionnaire ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {cycleProgress.questionnaire ? <CheckCircle size={16} /> : '1'}
                </div>
                <div className="text-xs mt-1 text-center font-roboto w-20 -ml-6">Assessment</div>
              </div>
              
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  cycleProgress.meeting ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {cycleProgress.meeting ? <CheckCircle size={16} /> : '2'}
                </div>
                <div className="text-xs mt-1 text-center font-roboto w-20 -ml-6">Couple Meeting</div>
              </div>
              
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  cycleProgress.results ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {cycleProgress.results ? <CheckCircle size={16} /> : '3'}
                </div>
                <div className="text-xs mt-1 text-center font-roboto w-20 -ml-6">Results</div>
              </div>
            </div>
          </div>
        </div>
      
        {/* Action Buttons */}
        <div className="flex justify-center mt-6 space-x-4">
          <button 
            className={`px-4 py-2 rounded font-roboto flex items-center ${
              cycleProgress.questionnaire 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
            onClick={onStartQuestionnaire}
            disabled={cycleProgress.questionnaire}
          >
            {cycleProgress.questionnaire 
              ? <CheckCircle size={16} className="mr-2" /> 
              : <Shield size={16} className="mr-2" />
            }
            {cycleProgress.questionnaire ? 'Assessment Completed' : 'Start Assessment'}
          </button>
          
          <button 
            className={`px-4 py-2 rounded font-roboto flex items-center ${
              !cycleProgress.questionnaire 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : cycleProgress.meeting
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
            }`}
            onClick={onStartMeeting}
            disabled={!cycleProgress.questionnaire || cycleProgress.meeting}
          >
            {cycleProgress.meeting 
              ? <CheckCircle size={16} className="mr-2" /> 
              : <Users size={16} className="mr-2" />
            }
            {cycleProgress.meeting ? 'Meeting Completed' : 'Start Meeting'}
          </button>
          
          {cycleProgress.results && (
            <button 
              className="px-4 py-2 bg-black text-white rounded font-roboto flex items-center hover:bg-gray-800"
              onClick={() => {
                document.getElementById('relationship-charts')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Target size={16} className="mr-2" />
              View Results
            </button>
          )}
        </div>
      </div>
      
      {/* Metrics Display (only shown when results are available) */}
      {cycleProgress.results && cycleData?.metrics && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-500">{cycleData.metrics.satisfaction?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600 font-roboto">Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{cycleData.metrics.communication?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600 font-roboto">Communication</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">{cycleData.metrics.connection?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600 font-roboto">Connection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{cycleData.metrics.workload?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600 font-roboto">Workload Balance</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced questionnaire component that supports different question types
 */
const RelationshipQuestionnaire = ({ questions, onSubmit, cycle, previousData, onCancel }) => {
  const [responses, setResponses] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Group questions by category first
  const categorizedQuestions = questions.reduce((acc, question) => {
    // Determine question type based on content
    let questionType = 'scale';
    let category = 'general';
    
    // Detect question type
    if (question.text.toLowerCase().includes('which') || 
        question.text.toLowerCase().includes('select') ||
        question.text.toLowerCase().includes('choose') ||
        question.text.toLowerCase().includes('area')) {
      questionType = 'select';
    } else if (question.text.toLowerCase().includes('describe') || 
              question.text.toLowerCase().includes('explain') ||
              question.text.toLowerCase().includes('share') ||
              question.text.toLowerCase().includes('thoughts')) {
      questionType = 'text';
    }
    
    // Set question category
    if (question.category) {
      category = question.category;
    } else if (question.text.toLowerCase().includes('satisfaction') || 
              question.text.toLowerCase().includes('happy')) {
      category = 'satisfaction';
    } else if (question.text.toLowerCase().includes('communication') || 
              question.text.toLowerCase().includes('listen')) {
      category = 'communication';
    } else if (question.text.toLowerCase().includes('connect') || 
              question.text.toLowerCase().includes('intimacy')) {
      category = 'connection';
    } else if (question.text.toLowerCase().includes('workload') || 
              question.text.toLowerCase().includes('balance')) {
      category = 'workload';
    }
    
    // Add question type to the question object
    const enhancedQuestion = {
      ...question,
      type: questionType,
      category: category
    };
    
    // Add to the appropriate category
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(enhancedQuestion);
    return acc;
  }, {});
  
  // Create steps from categories
  const steps = Object.entries(categorizedQuestions).map(([category, questions]) => ({
    category,
    title: getCategoryTitle(category),
    questions
  }));
  
  // Load previous responses if available
  useEffect(() => {
    if (previousData?.questionnaireResponses) {
      setResponses(previousData.questionnaireResponses);
    }
  }, [previousData]);
  
  // Helper to get human-readable category title
  function getCategoryTitle(category) {
    const titles = {
      'satisfaction': 'Relationship Satisfaction',
      'communication': 'Communication Quality',
      'connection': 'Emotional Connection',
      'workload': 'Workload Balance',
      'general': 'Relationship Assessment'
    };
    
    return titles[category] || 'Relationship Assessment';
  }
  
  // Handle different types of responses
  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Check if current step is complete
  const isCurrentStepComplete = () => {
    if (steps.length === 0 || step >= steps.length) return false;
    
    const currentQuestions = steps[step].questions;
    return currentQuestions.every(q => responses[q.id] !== undefined);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await onSubmit(responses);
      
      setLoading(false);
      return result;
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      setError(err.message || "Failed to save questionnaire");
      setLoading(false);
      return false;
    }
  };
  
  // Navigate to next step
  const handleNext = async () => {
    if (!isCurrentStepComplete()) {
      setError("Please answer all questions before continuing");
      return;
    }
    
    setError(null);
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Last step, submit
      await handleSubmit();
    }
  };
  
  // Navigate to previous step
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  // Render a scale question (1-5)
  const renderScaleQuestion = (question) => (
    <div key={question.id} className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="mb-3 font-roboto">{question.text}</p>
      
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
        <span className="text-sm text-gray-500 font-roboto">Low</span>
        <div className="flex space-x-4">
          {[1, 2, 3, 4, 5].map(value => (
            <button
              key={value}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                responses[question.id] === value 
                  ? 'bg-black text-white' 
                  : 'bg-white border hover:bg-gray-100'
              }`}
              onClick={() => handleResponseChange(question.id, value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 font-roboto">High</span>
      </div>
    </div>
  );
  
  // Render a text input question
  const renderTextQuestion = (question) => (
    <div key={question.id} className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="mb-3 font-roboto">{question.text}</p>
      
      <textarea
        className="w-full p-3 border rounded min-h-[100px] font-roboto"
        placeholder="Share your thoughts here..."
        value={responses[question.id] || ''}
        onChange={(e) => handleResponseChange(question.id, e.target.value)}
      ></textarea>
    </div>
  );
  
  // Render a selection question
  const renderSelectQuestion = (question) => {
    // Generate options based on question type
    const options = getOptionsForQuestion(question);
    
    return (
      <div key={question.id} className="border rounded-lg p-4 bg-white shadow-sm">
        <p className="mb-3 font-roboto">{question.text}</p>
        
        <div className="space-y-2">
          {options.map(option => (
            <div 
              key={option}
              className={`p-3 border rounded cursor-pointer ${
                responses[question.id] === option
                  ? 'border-black bg-gray-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleResponseChange(question.id, option)}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border ${
                  responses[question.id] === option
                    ? 'border-black bg-black'
                    : 'border-gray-400'
                }`}></div>
                <span className="ml-2 font-roboto">{option}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Generate options based on the question content
  function getOptionsForQuestion(question) {
    if (question.text.toLowerCase().includes('area')) {
      return [
        'Communication',
        'Emotional Intimacy',
        'Quality Time',
        'Workload Balance',
        'Appreciation & Recognition',
        'Future Planning'
      ];
    } else if (question.text.toLowerCase().includes('frequency')) {
      return [
        'Daily',
        'Several times a week',
        'Weekly',
        'Every few weeks',
        'Monthly or less'
      ];
    } else {
      // Default options
      return [
        'Strongly Agree',
        'Agree',
        'Neutral',
        'Disagree',
        'Strongly Disagree'
      ];
    }
  }
  
  // Render the current step
  const renderCurrentStep = () => {
    if (steps.length === 0) return null;
    
    const currentStep = steps[step];
    
    return (
      <div>
        <h4 className="font-medium text-lg mb-4 font-roboto">{currentStep.title}</h4>
        
        <div className="space-y-6">
          {currentStep.questions.map(question => {
            if (question.type === 'text') {
              return renderTextQuestion(question);
            } else if (question.type === 'select') {
              return renderSelectQuestion(question);
            } else {
              return renderScaleQuestion(question);
            }
          })}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm font-roboto">
            {error}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          {step === 0 ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded font-roboto"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-roboto"
            >
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={loading || !isCurrentStepComplete()}
            className={`px-4 py-2 rounded font-roboto flex items-center ${
              loading || !isCurrentStepComplete()
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : step < steps.length - 1 ? (
              <>Next<ArrowRight size={16} className="ml-2" /></>
            ) : (
              <>Complete<CheckCircle size={16} className="ml-2" /></>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  // If no questions provided, show placeholder
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center p-6">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 font-roboto">No Questions Available</h3>
          <p className="text-gray-600 font-roboto">
            No relationship assessment questions are available at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Health Assessment</h3>
        <p className="text-gray-600 font-roboto">
          This assessment helps track your relationship health for Cycle {cycle}. 
          Your responses are confidential and will help provide personalized insights.
        </p>
      </div>
      
      {/* Progress indicators */}
      <div className="flex mb-6">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div 
              className={`h-2 ${
                i < step ? 'bg-black' : i === step ? 'bg-gray-400' : 'bg-gray-200'
              } ${i === 0 ? 'rounded-l' : i === steps.length - 1 ? 'rounded-r' : ''}`}
            ></div>
            <p className={`text-xs mt-1 text-center font-roboto ${
              i === step ? 'font-medium' : 'text-gray-500'
            }`}>
              {s.title}
            </p>
          </div>
        ))}
      </div>
      
      {renderCurrentStep()}
    </div>
  );
};

/**
 * Modal to display relationship templates
 */
const TemplateModal = ({ id, title, description, steps, onClose, onNavigate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold font-roboto">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-gray-600 mb-6 font-roboto">{description}</p>
          
          {steps && (
            <div className="mb-6">
              <h4 className="font-medium mb-3 font-roboto">Steps:</h4>
              <ol className="list-decimal pl-5 space-y-3">
                {steps.map((step, index) => (
                  <li key={index} className="font-roboto">
                    {typeof step === 'string' ? (
                      step
                    ) : (
                      <>
                        <span className="font-medium">{step.title}</span>: {step.description}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded font-roboto"
            >
              Close
            </button>
            
            <button
              onClick={onNavigate}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto"
            >
              Go to Tool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main RelationshipTab Component
 */
const RelationshipTab = ({ onOpenRelationshipMeeting }) => {
  const { 
    selectedUser, 
    familyMembers, 
    familyId,
    currentWeek,
    relationshipStrategies,
    coupleCheckInData,
    getCoupleCheckInData,
    getRelationshipTrendData,
    weekHistory,
    updateRelationshipStrategy,
    getRelationshipStrategies,
    saveCoupleCheckInData
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
    todos: true // New section for todos, expanded by default
  });
  
  const [relationshipQuestions, setRelationshipQuestions] = useState([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [insights, setInsights] = useState([]);
  const [cycleData, setCycleData] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [templateToShow, setTemplateToShow] = useState(null);
  const [hasError, setHasError] = useState(null);
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);
  const [hasEnoughDataForCharts, setHasEnoughDataForCharts] = useState(false);
  
  // Refs for scrolling
  const toolsRef = useRef(null);
  const chartsRef = useRef(null);
  const todosRef = useRef(null);
  
  // Preload key data components to improve first-click performance
  const preloadComponents = useCallback(async () => {
    try {
      // Preload components likely to be needed
      const promises = [
        import('../AIRelationshipInsights'),
        import('../../relationship/EnhancedRelationshipCycleHistory')
      ];
      
      // Start component preloading but don't wait for completion
      Promise.all(promises).catch(e => console.warn("Component preloading incomplete:", e));
    } catch (error) {
      console.warn("Error preloading components:", error);
    }
  }, []);
  
  // Load relationship data with performance optimizations
  useEffect(() => {
    const loadRelationshipData = async () => {
      setIsLoadingData(true);
      
      try {
        if (!familyId) {
          setIsLoadingData(false);
          return;
        }
        
        // Start preloading components
        preloadComponents();
        
        // Use Promise.all to parallelize data fetching
        const [strategies, questionsByCategory] = await Promise.all([
          getRelationshipStrategies(),
          getQuestionsByCategory('Relationship Health')
        ]);
        
        // Set relationship questions
        setRelationshipQuestions(questionsByCategory || []);
        
        // Get couple check-in data
        const coupleData = getCoupleCheckInData(currentCycle);
        setCycleData(coupleData);
        
        // Check if couple needs to complete questionnaire
        const needsToComplete = !coupleData || !coupleData.questionnaireCompleted;
        setShowQuestionnaire(false); // Don't show automatically, user can click button
        setQuestionnaireCompleted(!needsToComplete);
        
        // Load previous cycle history
        await loadCycleHistory();
        
        // Load AI insights without blocking initial UI rendering
        setTimeout(() => {
          loadAIInsights(familyId, currentCycle, strategies, coupleData)
            .catch(error => console.error("Error loading relationship insights:", error));
        }, 100);
        
        setIsLoadingData(false);
      } catch (error) {
        console.error("Error loading relationship data:", error);
        setHasError("There was an error loading your relationship data. Please try refreshing the page.");
        setIsLoadingData(false);
      }
    };
    
    loadRelationshipData();
  }, [familyId, currentCycle, getCoupleCheckInData, getRelationshipStrategies, getRelationshipTrendData, getQuestionsByCategory, preloadComponents]);
  
  // Separate function to load AI insights
  const loadAIInsights = async (famId, cycle, strategies, checkInData) => {
    try {
      console.log("Loading AI insights...");
      
      // Dynamically import to avoid circular dependencies
      const module = await import('../../../services/AllieAIService');
      const AllieAIService = module.default;
      
      const aiInsights = await AllieAIService.generateRelationshipInsights(
        famId,
        cycle,
        getRelationshipTrendData(),
        strategies || [],
        checkInData || {}
      );
      
      if (aiInsights && aiInsights.length > 0) {
        setInsights(aiInsights);
      }
    } catch (error) {
      console.error("Error loading relationship insights:", error);
      // Failure to load insights shouldn't block the whole tab
    }
  };
  
  // Load cycle history
  const loadCycleHistory = async () => {
    try {
      if (!familyId) return;
      
      // Query Firestore for all cycle data
      const coupleCheckInsRef = collection(db, "coupleCheckIns");
      const q = query(coupleCheckInsRef, where("familyId", "==", familyId));
      const querySnapshot = await getDocs(q);
      
      const history = [];
      
      // Process each document
      querySnapshot.forEach((doc) => {
        // Extract cycle number from document ID (format: familyId-weekX)
        const cycleMatch = doc.id.match(/-week(\d+)$/);
        if (cycleMatch && cycleMatch[1]) {
          const cycleNum = parseInt(cycleMatch[1]);
          const data = doc.data();
          
          history.push({
            cycle: cycleNum,
            data: data.data || {},
            date: data.completedAt?.toDate?.() || new Date().toISOString()
          });
        }
      });
      
      // Also add data from weekHistory
      Object.keys(weekHistory)
        .filter(key => key.startsWith('week') && key !== 'weekStatus')
        .forEach(weekKey => {
          const week = weekHistory[weekKey];
          const weekNum = parseInt(weekKey.replace('week', ''));
          
          // Only add if not already in history
          if (week && week.coupleCheckIn && !history.some(h => h.cycle === weekNum)) {
            history.push({
              cycle: weekNum,
              data: week.coupleCheckIn,
              date: week.completionDate || new Date().toISOString()
            });
          }
        });
      
      // Sort by cycle number (descending)
      history.sort((a, b) => b.cycle - a.cycle);
      setCycleHistory(history);
      
      // Check if we have enough data for charts (at least 2 check-ins)
      setHasEnoughDataForCharts(history.length >= 2);
      
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
  
  // Start the questionnaire
  const handleStartQuestionnaire = () => {
    setShowQuestionnaire(true);
  };
  
  // Handle relationship questionnaire submission
  const handleQuestionnaireSubmit = async (responses) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Get current couple data or initialize
      const currentData = getCoupleCheckInData(currentCycle) || {};
      
      // Create updated data with questionnaire responses
      const updatedData = {
        ...currentData,
        questionnaireResponses: responses,
        questionnaireCompleted: true,
        questionnaireCompletedAt: new Date().toISOString()
      };
      
      // Calculate relationship metrics based on responses
      const metrics = calculateRelationshipMetrics(responses);
      
      // Add metrics to the data
      updatedData.metrics = metrics;
      
      // Save to Firebase using the context method
      await saveCoupleCheckInData(familyId, currentCycle, updatedData);
      
      // Update local state
      setCycleData(updatedData);
      setQuestionnaireCompleted(true);
      setShowQuestionnaire(false);
      
      // Add to calendar
      await addQuestionnaireToCalendar();
      
      // Refresh cycle history
      await loadCycleHistory();
      
      return true;
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      setHasError("There was an error saving your questionnaire. Please try again.");
      return false;
    }
  };
  
  // Calculate relationship metrics from questionnaire
  const calculateRelationshipMetrics = (responses) => {
    // Calculate average scores for different dimensions
    const dimensions = {
      satisfaction: ['satisfaction', 'happiness', 'fulfillment'],
      communication: ['communication', 'listening', 'understanding'],
      connection: ['connection', 'intimacy', 'quality_time'],
      workload: ['workload_balance', 'task_sharing', 'mental_load']
    };
    
    const metrics = {};
    
    // Calculate averages for each dimension
    Object.entries(dimensions).forEach(([dimension, keys]) => {
      const values = [];
      
      // First try to find exact match questions
      Object.entries(responses).forEach(([questionId, value]) => {
        // Only include numerical responses for averages
        const numValue = typeof value === 'number' ? value : 
                       !isNaN(parseInt(value)) ? parseInt(value) : null;
        
        if (numValue !== null) {
          // Check if question contains any of the keywords
          const matchesKeyword = keys.some(key => 
            questionId.toLowerCase().includes(key) || 
            relationshipQuestions.find(q => q.id === questionId)?.text.toLowerCase().includes(key)
          );
          
          if (matchesKeyword) {
            values.push(numValue);
          }
        }
      });
      
      // If we have values, calculate average
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        metrics[dimension] = Math.min(5, Math.max(1, average)); // Ensure 1-5 range
      } else {
        // Default value if no matched questions
        metrics[dimension] = 3.0;
      }
    });
    
    // Calculate overall score (1-5 scale)
    const allScores = Object.values(metrics);
    metrics.overall = allScores.length > 0 
      ? allScores.reduce((sum, val) => sum + val, 0) / allScores.length
      : 3.0; // Default to middle if no data
    
    return metrics;
  };
  
  // Add completed questionnaire to calendar
  const addQuestionnaireToCalendar = async () => {
    try {
      if (!currentUser || !familyId) return;
      
      return await RelationshipCalendarIntegration.addCheckInToCalendar(
        currentUser.uid,
        currentCycle,
        getCoupleCheckInData(currentCycle)
      );
    } catch (error) {
      console.error("Error adding questionnaire to calendar:", error);
    }
  };
  
  // Show action template based on insight recommendation
  const showActionTemplate = (templateId) => {
    setTemplateToShow(templateId);
  };
  
  // Navigate to a section when template suggests a tool
  const navigateToTool = (toolId) => {
    setTemplateToShow(null);
    
    // Scroll to the appropriate section
    if (toolId === 'daily-checkin' || toolId === 'gratitude-practice') {
      setExpandedSections(prev => ({...prev, tools: true}));
      setTimeout(() => {
        toolsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setExpandedSections(prev => ({...prev, charts: true}));
      setTimeout(() => {
        chartsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
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
  
  // Generate relationship template
  const renderTemplate = (templateId) => {
    switch(templateId) {
      case 'daily-checkin':
        return (
          <TemplateModal
            id="daily-checkin"
            title="5-Minute Check-in Template"
            description="A quick daily check-in helps maintain connection amid busy lives. This simple format takes just 5 minutes but keeps your relationship strong."
            steps={[
              { title: "High point", description: "Each share one positive moment from today" },
              { title: "Challenge", description: "Each share one difficulty you faced" },
              { title: "Support", description: "Ask \"How can I support you tomorrow?\"" },
              { title: "Appreciation", description: "Express gratitude for one thing your partner did" },
              { title: "Connection", description: "Share a brief physical connection (hug, kiss, hand hold)" }
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('daily-checkin')}
          />
        );
        
      case 'gratitude-practice':
        return (
          <TemplateModal
            id="gratitude-practice"
            title="Daily Gratitude Practice"
            description="Research shows that expressing appreciation regularly strengthens relationships and increases happiness."
            steps={[
              "Use prompts like \"I appreciate the way you...\", \"Thank you for always...\", or \"I'm grateful that you...\"",
              "Be specific about what your partner did and how it affected you",
              "Express appreciation both verbally and in writing",
              "Aim for at least one expression of gratitude daily",
              "Notice the small things, not just big gestures"
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('gratitude-practice')}
          />
        );
        
      case 'date-night':
        return (
          <TemplateModal
            id="date-night"
            title="Meaningful Date Night"
            description="Regular date nights are essential for maintaining connection and romance in your relationship."
            steps={[
              "Schedule date night at least 2 weeks in advance",
              "Take turns planning - one person plans each date",
              "Create a no-phone rule during your time together",
              "Mix up activities - try something new alongside familiar favorites",
              "End with a meaningful conversation about your relationship"
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('date-night')}
          />
        );
        
      default:
        return null;
    }
  };
  
  // Modal to display cycle details
  const CycleDetailsModal = ({ cycle, onClose }) => {
    if (!cycle) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold font-roboto">Cycle {cycle.cycle} Details</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium font-roboto">Completed on {formatDate(cycle.date)}</h4>
              
              <div className="flex space-x-2">
                {cycle.data?.metrics && (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                    <Award size={12} className="mr-1" />
                    {cycle.data.metrics.overall?.toFixed(1) || "3.0"}/5 Overall
                  </span>
                )}
              </div>
            </div>
            
            {cycle.data?.metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-500">{cycle.data.metrics.satisfaction?.toFixed(1) || "3.0"}</div>
                  <div className="text-sm text-gray-600 font-roboto">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{cycle.data.metrics.communication?.toFixed(1) || "3.0"}</div>
                  <div className="text-sm text-gray-600 font-roboto">Communication</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{cycle.data.metrics.connection?.toFixed(1) || "3.0"}</div>
                  <div className="text-sm text-gray-600 font-roboto">Connection</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{cycle.data.metrics.workload?.toFixed(1) || "3.0"}</div>
                  <div className="text-sm text-gray-600 font-roboto">Workload</div>
                </div>
              </div>
            )}
            
            {/* Meeting Notes */}
            {cycle.data?.meeting && (
              <div>
                <h4 className="font-medium mb-2 font-roboto">Meeting Notes</h4>
                
                {cycle.data.meeting.topicResponses && Object.keys(cycle.data.meeting.topicResponses).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(cycle.data.meeting.topicResponses).map(([topic, response], index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <h5 className="text-sm font-medium mb-1 font-roboto">{topic}</h5>
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
            
            {/* Questionnaire Responses */}
            {cycle.data?.questionnaireResponses && Object.keys(cycle.data.questionnaireResponses).length > 0 && (
              <div>
                <h4 className="font-medium mb-2 font-roboto">Assessment Responses</h4>
                
                <div className="space-y-3">
                  {Object.entries(cycle.data.questionnaireResponses)
                    .slice(0, 5) // Show only the first 5 for brevity
                    .map(([questionId, response], index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium font-roboto">Question {index + 1}</h5>
                          </div>
                          <div className="ml-2">
                            <div className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                              <span className="text-sm font-medium font-roboto">
                                {typeof response === 'number' 
                                  ? `${response}/5` 
                                  : response?.length > 20 
                                    ? 'Text response' 
                                    : response}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {Object.keys(cycle.data.questionnaireResponses).length > 5 && (
                    <p className="text-sm text-center text-gray-500 font-roboto">
                      + {Object.keys(cycle.data.questionnaireResponses).length - 5} more responses
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
        <CycleManager 
          cycle={currentCycle}
          cycleData={cycleData}
          onStartQuestionnaire={handleStartQuestionnaire}
          onStartMeeting={onOpenRelationshipMeeting}
        />
      </div>

      {/* Relationship Health Questionnaire - Only show when needed */}
      {showQuestionnaire && (
        <RelationshipQuestionnaire 
          questions={relationshipQuestions}
          onSubmit={handleQuestionnaireSubmit}
          cycle={currentCycle}
          previousData={cycleData}
          onCancel={() => setShowQuestionnaire(false)}
        />
      )}

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
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  // Show loading message or spinner
                  const aiInsights = await (await import('../../../services/AllieAIService')).default.generateRelationshipInsights(
                    familyId,
                    currentCycle,
                    getRelationshipTrendData(),
                    await getRelationshipStrategies() || [],
                    getCoupleCheckInData(currentCycle) || {}
                  );
                  
                  if (aiInsights && aiInsights.length > 0) {
                    setInsights(aiInsights);
                  }
                } catch (error) {
                  console.error("Error refreshing insights:", error);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm flex items-center mb-4"
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh Insights
            </button>
          </div>
          
          <Suspense fallback={
            <div className="p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
            </div>
          }>
            <AIRelationshipInsights 
              insights={insights}
              onActionClick={showActionTemplate} 
            />
          </Suspense>
          
          {/* Template Modal */}
          {templateToShow && renderTemplate(templateToShow)}
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
                Complete at least two couple check-ins to see your relationship trends. 
                This will help you track progress over time.
              </p>
              <button
                onClick={handleStartQuestionnaire}
                disabled={questionnaireCompleted}
                className={`px-4 py-2 rounded font-roboto inline-flex items-center ${
                  questionnaireCompleted
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {questionnaireCompleted ? (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Assessment Completed
                  </>
                ) : (
                  <>
                    <Shield size={16} className="mr-2" />
                    Start Assessment
                  </>
                )}
              </button>
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
        <CycleDetailsModal 
          cycle={selectedHistoryCycle} 
          onClose={() => setSelectedHistoryCycle(null)} 
        />
      )}
    </div>
  );
};

export default RelationshipTab;