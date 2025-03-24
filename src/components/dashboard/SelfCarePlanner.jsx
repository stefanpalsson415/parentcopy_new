// src/components/dashboard/SelfCarePlanner.jsx
import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Calendar, Plus, Heart, Clock, X, CheckCircle, Trash2, Edit, RefreshCw, User } from 'lucide-react';

const SelfCarePlanner = () => {
  const { familyId, familyMembers } = useFamily();
  
  const [selfCareActivities, setSelfCareActivities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    forParent: 'Mama', // Default to Mama
    date: '',
    duration: 60,
    completed: false
  });
  const [editIndex, setEditIndex] = useState(null);
  
  // Load self-care data
  useEffect(() => {
    // Mock data for demonstration - would be loaded from database in production
    const mockActivities = [
      { 
        id: '1', 
        title: 'Morning Yoga',
        description: 'Early morning yoga session for mental clarity',
        forParent: 'Mama',
        date: new Date().toISOString().split('T')[0],
        duration: 45,
        completed: false
      },
      { 
        id: '2', 
        title: 'Evening Reading',
        description: 'Quiet time with a book after kids are in bed',
        forParent: 'Papa',
        date: new Date().toISOString().split('T')[0],
        duration: 30,
        completed: true
      }
    ];
    
    setSelfCareActivities(mockActivities);
  }, [familyId]);
  
  // Add new self-care activity
  const addActivity = () => {
    if (!newActivity.title || !newActivity.date) return;
    
    const activity = {
      id: Date.now().toString(),
      ...newActivity
    };
    
    const updatedActivities = editIndex !== null 
      ? selfCareActivities.map((a, i) => i === editIndex ? activity : a)
      : [...selfCareActivities, activity];
    
    setSelfCareActivities(updatedActivities);
    
    // Reset form
    setNewActivity({
      title: '',
      description: '',
      forParent: 'Mama',
      date: '',
      duration: 60,
      completed: false
    });
    setShowAddModal(false);
    setEditIndex(null);
    
    // In a real implementation, save to database
  };
  
  // Toggle activity completion
  const toggleCompletion = (index) => {
    const updatedActivities = [...selfCareActivities];
    updatedActivities[index].completed = !updatedActivities[index].completed;
    
    setSelfCareActivities(updatedActivities);
    
    // In a real implementation, save to database
  };
  
  // Edit activity
  const editActivity = (index) => {
    const activity = selfCareActivities[index];
    
    setNewActivity({
      title: activity.title,
      description: activity.description,
      forParent: activity.forParent,
      date: activity.date,
      duration: activity.duration,
      completed: activity.completed
    });
    
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
  
  const stats = getBalanceStats();
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Self-Care Planner</h3>
          
          <button 
            onClick={() => {
              setNewActivity({
                title: '',
                description: '',
                forParent: 'Mama',
                date: '',
                duration: 60,
                completed: false
              });
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
      
      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-roboto">
                {editIndex !== null ? 'Edit Self-Care Activity' : 'Add Self-Care Activity'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              {/* Parent selection */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">For:</label>
                <div className="flex space-x-4">
                  <button 
                    className={`flex-1 py-2 px-3 rounded border font-roboto ${
                      newActivity.forParent === 'Mama' 
                      ? 'bg-purple-100 border-purple-300 text-purple-800' 
                      : 'bg-white border-gray-300'
                    }`}
                    onClick={() => setNewActivity({...newActivity, forParent: 'Mama'})}
                  >
                    Mama
                  </button>
                  <button 
                    className={`flex-1 py-2 px-3 rounded border font-roboto ${
                      newActivity.forParent === 'Papa' 
                      ? 'bg-blue-100 border-blue-300 text-blue-800' 
                      : 'bg-white border-gray-300'
                    }`}
                    onClick={() => setNewActivity({...newActivity, forParent: 'Papa'})}
                  >
                    Papa
                  </button>
                </div>
              </div>
              
              {/* Date and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 font-roboto">Date:</label>
                  <input
                    type="date"
                    value={newActivity.date}
                    onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
                    className="w-full border rounded p-2 text-sm font-roboto"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 font-roboto">Duration (minutes):</label>
                  <input
                    type="number"
                    value={newActivity.duration}
                    onChange={(e) => setNewActivity({...newActivity, duration: parseInt(e.target.value) || 30})}
                    className="w-full border rounded p-2 text-sm font-roboto"
                    min="5"
                    max="240"
                  />
                </div>
              </div>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Activity:</label>
                <input
                  type="text"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                  placeholder="What self-care activity?"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Description (optional):</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                  className="w-full border rounded p-2 text-sm h-20 font-roboto"
                  placeholder="Any additional details..."
                ></textarea>
              </div>
              
              {/* Activity Ideas */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Activity Ideas:</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {getActivitySuggestions(newActivity.forParent).map((suggestion, i) => (
                    <div 
                      key={i}
                      className="p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100 flex items-center font-roboto"
                      onClick={() => setNewActivity({...newActivity, title: suggestion})}
                    >
                      <Heart size={14} className="text-pink-500 mr-2 flex-shrink-0" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded font-roboto"
              >
                Cancel
              </button>
              <button
                onClick={addActivity}
                disabled={!newActivity.title || !newActivity.date}
                className={`px-4 py-2 rounded font-roboto ${
                  newActivity.title && newActivity.date 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {editIndex !== null ? 'Update' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfCarePlanner;