import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Heart, Clock, X, CheckCircle, Trash2, Edit, RefreshCw, User } from 'lucide-react';
import EnhancedEventManager from '../calendar/EnhancedEventManager';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';



const SelfCarePlanner = ({ onAddToCalendar }) => {
  const { familyId, familyMembers } = useFamily();
  const { currentUser } = useAuth();
  
  const [selfCareActivities, setSelfCareActivities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  
  // Load self-care data
useEffect(() => {
  const loadSelfCareData = async () => {
    if (!familyId) return;
    
    try {
      // Load real data from Firebase
      const selfCareRef = collection(db, "selfCareActivities");
      const q = query(
        selfCareRef, 
        where("familyId", "==", familyId),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const loadedActivities = [];
      
      querySnapshot.forEach((doc) => {
        loadedActivities.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setSelfCareActivities(loadedActivities);
    } catch (error) {
      console.error("Error loading self-care data:", error);
      setSelfCareActivities([]);
    }
  };
  
  loadSelfCareData();
}, [familyId]);
  
  // Toggle activity completion
  const toggleCompletion = (index) => {
    const updatedActivities = [...selfCareActivities];
    updatedActivities[index].completed = !updatedActivities[index].completed;
    
    setSelfCareActivities(updatedActivities);
    
    // In a real implementation, save to database
  };
  
  // Edit activity
  const editActivity = (index) => {
    setEditIndex(index);
    setShowAddModal(true);
  };
  
  // Delete activity
  const deleteActivity = (index) => {
    const confirmed = window.confirm("Are you sure you want to delete this self-care activity?");
    if (!confirmed) return;
    
    const updatedActivities = selfCareActivities.filter((_, i) => i !== index);
    setSelfCareActivities(updatedActivities);
    
    // In a real implementation, save to database
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Get self-care activity suggestions
  const getActivitySuggestions = (parent) => {
    const suggestions = {
      'Mama': [
        "Take a bubble bath with a good book",
        "Go for a solo walk in nature",
        "Schedule a massage or spa treatment",
        "Join a yoga or fitness class",
        "Meet a friend for coffee"
      ],
      'Papa': [
        "Watch a game or favorite show uninterrupted",
        "Go for a bike ride or run",
        "Meet friends for a social activity",
        "Work on a hobby project",
        "Listen to a podcast or audiobook while relaxing"
      ]
    };
    
    return suggestions[parent] || suggestions['Mama'];
  };
  
  // Calculate balance stats
  const getBalanceStats = () => {
    const mamaActivities = selfCareActivities.filter(a => a.forParent === 'Mama');
    const papaActivities = selfCareActivities.filter(a => a.forParent === 'Papa');
    
    const mamaTime = mamaActivities.reduce((sum, a) => sum + a.duration, 0);
    const papaTime = papaActivities.reduce((sum, a) => sum + a.duration, 0);
    
    const mamaCompleted = mamaActivities.filter(a => a.completed).length;
    const papaCompleted = papaActivities.filter(a => a.completed).length;
    
    return {
      mamaTime,
      papaTime,
      mamaCompleted,
      papaCompleted,
      mamaActivities: mamaActivities.length,
      papaActivities: papaActivities.length
    };
  };
  
  // Handle calendar event save
  const handleEventSave = async (eventResult) => {
    try {
      setCalendarError(null);
      
      if (eventResult && eventResult.success) {
        // If editing, update the existing activity
        if (editIndex !== null) {
          const updatedActivities = [...selfCareActivities];
          updatedActivities[editIndex] = {
            ...updatedActivities[editIndex],
            inCalendar: true
          };
          setSelfCareActivities(updatedActivities);
        } else {
          // Add new activity
          const newActivity = {
            id: Date.now().toString(),
            title: eventResult.title || 'Self-Care Activity',
            description: eventResult.description || '',
            forParent: eventResult.forParent || 'Mama',
            date: new Date(eventResult.dateTime || Date.now()).toISOString().split('T')[0],
            duration: eventResult.duration || 60,
            completed: false,
            inCalendar: true
          };
          
          setSelfCareActivities([...selfCareActivities, newActivity]);
        }
        
        setCalendarSuccess(true);
        setTimeout(() => setCalendarSuccess(false), 3000);
        setShowAddModal(false);
        setEditIndex(null);
        
        // Also call the provided onAddToCalendar if it exists
        if (onAddToCalendar && typeof onAddToCalendar === 'function') {
          await onAddToCalendar(eventResult);
        }
      } else {
        throw new Error("Failed to add to calendar");
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      setCalendarError('Failed to add to calendar. Please try again.');
      setTimeout(() => setCalendarError(null), 5000);
    }
  };
  
  // Get event data for EnhancedEventManager when editing
  const getEventDataForEditing = () => {
    if (editIndex === null) return null;
    
    const activity = selfCareActivities[editIndex];
    
    return {
      title: activity.title,
      description: activity.description || 'Self-care time',
      category: 'self-care',
      eventType: 'self-care',
      dateTime: new Date(`${activity.date}T10:00:00`).toISOString(), // Default to 10 AM if no time
      duration: activity.duration || 60,
      forParent: activity.forParent,
      attendingParentId: activity.forParent === 'Mama' ? 
        familyMembers.find(m => m.roleType === 'Mama')?.id : 
        familyMembers.find(m => m.roleType === 'Papa')?.id
    };
  };
  
  const stats = getBalanceStats();
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Self-Care Planner</h3>
          
          <button 
            onClick={() => {
              setEditIndex(null);
              setShowAddModal(true);
            }}
            className="px-3 py-1 bg-black text-white rounded-full flex items-center text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Add Self-Care Activity
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Research shows that prioritizing regular self-care improves relationship health and reduces family stress.
        </p>
        
        {/* Success message */}
        {calendarSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle size={16} className="text-green-600 mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm text-green-800 font-roboto">
              Success! Your self-care activity has been added to the calendar.
            </p>
          </div>
        )}
        
        {/* Error message */}
        {calendarError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <X size={16} className="text-red-600 mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm text-red-800 font-roboto">
              {calendarError}
            </p>
          </div>
        )}
        
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h4 className="font-medium mb-2 font-roboto flex items-center">
              <User size={16} className="mr-2 text-purple-600" />
              Mama's Self-Care
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Planned activities:</span>
                <span className="font-roboto">{stats.mamaActivities}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Completed:</span>
                <span className="font-roboto">{stats.mamaCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Total time:</span>
                <span className="font-roboto">{stats.mamaTime} minutes</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-medium mb-2 font-roboto flex items-center">
              <User size={16} className="mr-2 text-blue-600" />
              Papa's Self-Care
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Planned activities:</span>
                <span className="font-roboto">{stats.papaActivities}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Completed:</span>
                <span className="font-roboto">{stats.papaCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-roboto">Total time:</span>
                <span className="font-roboto">{stats.papaTime} minutes</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
          <h4 className="font-medium mb-2 font-roboto">Why Self-Care Matters for Relationships</h4>
          <p className="text-sm font-roboto">
            Couples who protect time for individual self-care report 37% higher relationship satisfaction and are better able to manage parenting stress. Self-care isn't selfish—it's essential for family balance.
          </p>
        </div>
        
        {/* Activities List */}
        <div>
          <h4 className="font-medium mb-3 font-roboto">Planned Self-Care</h4>
          
          {selfCareActivities.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded">
              <Heart size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 font-roboto">No self-care activities planned yet</p>
              <p className="text-sm text-gray-400 mt-1 font-roboto">
                Taking care of yourself helps you care for others better
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selfCareActivities.map((activity, index) => (
                <div key={activity.id} className={`border rounded-lg p-3 relative ${
                  activity.completed ? 'bg-gray-50' : ''
                }`}>
                  <div className="flex items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                      activity.forParent === 'Mama' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <User size={18} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`font-medium font-roboto ${
                            activity.completed ? 'text-gray-500' : ''
                          }`}>
                            {activity.title}
                          </div>
                          <div className="flex items-center mt-1 text-xs font-roboto">
                            <Calendar size={12} className="mr-1 text-gray-500" />
                            <span className="text-gray-600">{formatDate(activity.date)}</span>
                            <Clock size={12} className="ml-3 mr-1 text-gray-500" />
                            <span className="text-gray-600">{activity.duration} minutes</span>
                            <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-roboto bg-gray-100">{activity.forParent}</span>
                            
                            {activity.inCalendar && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-roboto bg-black text-white">In Calendar</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => toggleCompletion(index)}
                            className={`p-1 rounded-full ${
                              activity.completed 
                                ? 'text-green-600 hover:bg-green-100' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={activity.completed ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => editActivity(index)}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => deleteActivity(index)}
                            className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {activity.description && (
                        <p className={`text-sm mt-2 ${
                          activity.completed ? 'text-gray-500' : 'text-gray-600'
                        } font-roboto`}>
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add/Edit Modal with EnhancedEventManager */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-roboto">
                {editIndex !== null ? 'Edit Self-Care Activity' : 'Add Self-Care Activity'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <EnhancedEventManager
              initialEvent={editIndex !== null ? getEventDataForEditing() : {
                title: '',
                description: '',
                category: 'self-care',
                eventType: 'self-care',
                duration: 60 // Default 60 minutes
              }}
              onSave={handleEventSave}
              onCancel={() => {
                setShowAddModal(false);
                setEditIndex(null);
              }}
              eventType="self-care"
              selectedDate={new Date()}
              isCompact={true}
              mode={editIndex !== null ? 'edit' : 'create'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfCarePlanner;