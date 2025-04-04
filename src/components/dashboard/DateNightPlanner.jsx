import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Calendar, Plus, Heart, Star, X, Clock, CheckCircle, Trash2, Edit, Users, AlertCircle } from 'lucide-react';
import CalendarService from '../../services/CalendarService';

const EnhancedDateNightPlanner = () => {
  const { familyId, familyMembers, selectedUser } = useFamily();
  
  const [dateNights, setDateNights] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ideaCategory, setIdeaCategory] = useState('all');
  const [newDateNight, setNewDateNight] = useState({
    title: '',
    description: '',
    date: '',
    time: '19:00',
    category: 'dining',
    completed: false,
    participants: []
  });
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  
  // Load date night data
  useEffect(() => {
    const loadDateNightData = async () => {
      if (!familyId) return;
      
      try {
        // In a real implementation, this would load from database
        // For now, using mock data
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const mockDateNights = [
          { 
            id: '1', 
            title: 'Dinner at Giovanni\'s',
            description: 'That Italian place we\'ve been wanting to try',
            date: nextWeek.toISOString().split('T')[0],
            time: '19:00',
            category: 'dining',
            completed: false,
            participants: familyMembers
              .filter(m => m.role === 'parent')
              .map(m => ({ id: m.id, name: m.name }))
          },
          { 
            id: '2', 
            title: 'Movie Night',
            description: 'Watch that new movie that just came out',
            date: '2023-10-15', // Past date
            time: '20:00',
            category: 'entertainment',
            completed: true,
            participants: familyMembers.map(m => ({ id: m.id, name: m.name }))
          }
        ];
        
        setDateNights(mockDateNights);
        setLoading(false);
      } catch (error) {
        console.error("Error loading date night data:", error);
        setLoading(false);
      }
    };
    
    loadDateNightData();
  }, [familyId, familyMembers]);
  
  // Add new date night
  const addDateNight = () => {
    if (!newDateNight.title || !newDateNight.date) return;
    
    const dateNight = {
      id: Date.now().toString(),
      ...newDateNight
    };
    
    const updatedDateNights = editIndex !== null 
      ? dateNights.map((d, i) => i === editIndex ? dateNight : d)
      : [...dateNights, dateNight];
    
    // Sort by date
    updatedDateNights.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    setDateNights(updatedDateNights);
    
    // Reset form
    setNewDateNight({
      title: '',
      description: '',
      date: '',
      time: '19:00',
      category: 'dining',
      completed: false,
      participants: []
    });
    setShowAddModal(false);
    setEditIndex(null);
    
    // In a real implementation, save to database
    // await saveFamilyData({ dateNights: updatedDateNights }, familyId);
  };
  
  // Toggle date night completion
  const toggleCompletion = (index) => {
    const updatedDateNights = [...dateNights];
    updatedDateNights[index].completed = !updatedDateNights[index].completed;
    
    setDateNights(updatedDateNights);
    
    // In a real implementation, save to database
    // await saveFamilyData({ dateNights: updatedDateNights }, familyId);
  };
  
  // Edit date night
  const editDateNight = (index) => {
    const dateNight = dateNights[index];
    
    setNewDateNight({
      title: dateNight.title,
      description: dateNight.description,
      date: dateNight.date,
      time: dateNight.time,
      category: dateNight.category,
      completed: dateNight.completed,
      participants: dateNight.participants || []
    });
    
    setEditIndex(index);
    setShowAddModal(true);
  };
  
  // Delete date night
  const deleteDateNight = (index) => {
    const confirmed = window.confirm("Are you sure you want to delete this date night?");
    if (!confirmed) return;
    
    const updatedDateNights = dateNights.filter((_, i) => i !== index);
    setDateNights(updatedDateNights);
    
    // In a real implementation, save to database
    // await saveFamilyData({ dateNights: updatedDateNights }, familyId);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Toggle participant selection
  const toggleParticipant = (memberId) => {
    const isSelected = newDateNight.participants.some(p => p.id === memberId);
    
    if (isSelected) {
      // Remove participant
      setNewDateNight({
        ...newDateNight,
        participants: newDateNight.participants.filter(p => p.id !== memberId)
      });
    } else {
      // Add participant
      const member = familyMembers.find(m => m.id === memberId);
      if (member) {
        setNewDateNight({
          ...newDateNight,
          participants: [...newDateNight.participants, { id: member.id, name: member.name }]
        });
      }
    }
  };
  
  // Add to calendar
  const addToCalendar = async (dateNight) => {
    setIsAddingToCalendar(true);
    setCalendarError(null);
    
    try {
      // Create date objects
      const startDate = new Date(`${dateNight.date}T${dateNight.time || '19:00'}`);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration
      
      // Create participants string
      const participantsStr = dateNight.participants && dateNight.participants.length > 0
        ? `with ${dateNight.participants.map(p => p.name).join(', ')}`
        : '';
      
      // Create event object
      const event = {
        summary: `Date Night: ${dateNight.title}`,
        description: `${dateNight.description || 'Quality time together'} ${participantsStr}`,
        location: '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        category: 'relationship'
      };
      
      // Add to calendar
      const result = await CalendarService.addEvent(event, selectedUser?.id);
      
      if (result.success) {
        // Close modal
        setShowAddModal(false);
        
        // Add to date night
        if (editIndex !== null) {
          const updatedDateNights = [...dateNights];
          updatedDateNights[editIndex] = {
            ...updatedDateNights[editIndex],
            inCalendar: true
          };
          setDateNights(updatedDateNights);
        } else {
          addDateNight();
        }
      } else {
        setCalendarError("Failed to add to calendar. Please try again.");
      }
    } catch (error) {
      console.error("Error adding to calendar:", error);
      setCalendarError("Error adding to calendar: " + (error.message || "Unknown error"));
    } finally {
      setIsAddingToCalendar(false);
    }
  };
  
  // Get date ideas by category
  const getDateIdeas = (category) => {
    const ideas = {
      dining: [
        "Try a new restaurant in town",
        "Cook a fancy meal together at home",
        "Have a picnic in the park",
        "Take a cooking class together",
        "Food truck tour of the city"
      ],
      adventure: [
        "Go hiking on a new trail",
        "Take a day trip to a nearby town",
        "Try rock climbing",
        "Go for a bike ride",
        "Visit a theme park"
      ],
      entertainment: [
        "Watch a movie at the theater",
        "Attend a concert or live music event",
        "Go to a comedy show",
        "Visit a museum or art gallery",
        "Attend a local sporting event"
      ],
      family: [
        "Family game night",
        "Backyard camping",
        "Visit a children's museum",
        "Go to the zoo or aquarium",
        "Family bike ride or hike"
      ],
      budget: [
        "Game night at home",
        "Free concert in the park",
        "Visit a local farmer's market",
        "Take a self-guided walking tour",
        "Free museum day"
      ]
    };
    
    if (category === 'all') {
      return Object.values(ideas).flat();
    }
    
    return ideas[category] || [];
  };
  
  // Check if date is in the past
  const isPastDate = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    return date < today;
  };
  
  // Check if date is coming up soon (within 7 days)
  const isUpcomingSoon = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    const difference = date - today;
    return difference >= 0 && difference <= 7 * 24 * 60 * 60 * 1000;
  };
  
  // Filter date nights for display
  const filteredDateNights = dateNights.filter(dateNight => 
    !isPastDate(dateNight.date) || !dateNight.completed
  );
  
  // Get next upcoming date night
  const getNextDateNight = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dateNights.find(dateNight => 
      new Date(dateNight.date) >= today && !dateNight.completed
    );
  };
  
  const nextDateNight = getNextDateNight();
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Date Night Planner</h3>
          
          <button 
            onClick={() => {
              setNewDateNight({
                title: '',
                description: '',
                date: '',
                time: '19:00',
                category: 'dining',
                completed: false,
                participants: []
              });
              setEditIndex(null);
              setShowAddModal(true);
            }}
            className="px-3 py-1 bg-black text-white rounded-full flex items-center text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Plan Date Night
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Regular date nights are essential for maintaining a healthy relationship and reconnecting with your loved ones.
        </p>
        
        {/* Next Date Night */}
        {nextDateNight ? (
          <div className={`p-4 rounded-lg mb-5 border ${
            isUpcomingSoon(nextDateNight.date) ? 'bg-pink-50 border-pink-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <h4 className="font-medium mb-2 flex items-center font-roboto">
              {isUpcomingSoon(nextDateNight.date) ? (
                <>
                  <Heart size={16} className="text-pink-600 mr-2" />
                  Upcoming Date Night!
                </>
              ) : (
                <>
                  <Calendar size={16} className="text-blue-600 mr-2" />
                  Next Planned Date Night
                </>
              )}
            </h4>
            
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold font-roboto">{nextDateNight.title}</div>
                <p className="text-sm font-roboto">{nextDateNight.description}</p>
                <div className="flex items-center mt-1 text-sm font-roboto">
                  <Calendar size={14} className="mr-1 text-gray-500" />
                  <span>{formatDate(nextDateNight.date)}</span>
                  <Clock size={14} className="ml-3 mr-1 text-gray-500" />
                  <span>{nextDateNight.time}</span>
                </div>
                
                {/* Participants */}
                {nextDateNight.participants && nextDateNight.participants.length > 0 && (
                  <div className="flex items-center mt-2">
                    <Users size={14} className="mr-1 text-gray-500" />
                    <span className="text-sm text-gray-600 font-roboto">
                      {nextDateNight.participants.map(p => p.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`px-2 py-1 rounded text-xs font-roboto ${
                nextDateNight.category === 'dining' ? 'bg-green-100 text-green-700' :
                nextDateNight.category === 'adventure' ? 'bg-orange-100 text-orange-700' :
                nextDateNight.category === 'entertainment' ? 'bg-purple-100 text-purple-700' :
                nextDateNight.category === 'family' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {nextDateNight.category.charAt(0).toUpperCase() + nextDateNight.category.slice(1)}
              </div>
            </div>
            
            {isUpcomingSoon(nextDateNight.date) && (
              <div className="mt-3 text-xs text-pink-700 font-roboto">
                Don't forget to arrange childcare if needed!
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg mb-5 text-center border border-gray-200">
            <Heart size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 font-roboto">No upcoming date nights planned</p>
            <p className="text-sm text-gray-500 mt-1 font-roboto">
              Click "Plan Date Night" to schedule some quality time together
            </p>
          </div>
        )}
        
        {/* Upcoming Date Nights */}
        <div>
          <h4 className="font-medium mb-3 font-roboto">Your Schedule</h4>
          
          {filteredDateNights.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded">
              <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 font-roboto">No date nights scheduled</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredDateNights.map((dateNight, index) => (
                <div 
                  key={dateNight.id} 
                  className={`border rounded-lg p-3 ${
                    dateNight.completed ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          dateNight.completed 
                            ? 'bg-green-100 text-green-600' 
                            : isPastDate(dateNight.date)
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {dateNight.completed ? (
                          <CheckCircle size={16} />
                        ) : isPastDate(dateNight.date) ? (
                          <Clock size={16} />
                        ) : (
                          <Calendar size={16} />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div 
                            className={`font-bold ${
                              dateNight.completed ? 'text-gray-500' : ''
                            } font-roboto`}
                          >
                            {dateNight.title}
                          </div>
                          <div className="flex items-center mt-1 text-xs font-roboto">
                            <Calendar size={12} className="mr-1 text-gray-500" />
                            <span className="text-gray-600">{formatDate(dateNight.date)}</span>
                            <Clock size={12} className="ml-2 mr-1 text-gray-500" />
                            <span className="text-gray-600">{dateNight.time}</span>
                          </div>
                          
                          {/* Participants */}
                          {dateNight.participants && dateNight.participants.length > 0 && (
                            <div className="flex items-center mt-1">
                              <Users size={12} className="mr-1 text-gray-500" />
                              <span className="text-xs text-gray-600 font-roboto">
                                With: {dateNight.participants.map(p => p.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => toggleCompletion(dateNights.indexOf(dateNight))}
                            className={`p-1 rounded-full ${
                              dateNight.completed 
                                ? 'text-green-600 hover:bg-green-100' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={dateNight.completed ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            onClick={() => editDateNight(dateNights.indexOf(dateNight))}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => deleteDateNight(dateNights.indexOf(dateNight))}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {dateNight.description && (
                        <p className={`text-sm mt-1 ${
                          dateNight.completed ? 'text-gray-500' : 'text-gray-600'
                        } font-roboto`}>
                          {dateNight.description}
                        </p>
                      )}
                      
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-roboto ${
                          dateNight.category === 'dining' ? 'bg-green-100 text-green-700' :
                          dateNight.category === 'adventure' ? 'bg-orange-100 text-orange-700' :
                          dateNight.category === 'entertainment' ? 'bg-purple-100 text-purple-700' :
                          dateNight.category === 'family' ? 'bg-blue-100 text-blue-700' :
                          dateNight.category === 'budget' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {dateNight.category.charAt(0).toUpperCase() + dateNight.category.slice(1)}
                        </span>
                        
                        {dateNight.inCalendar && (
                          <span className="text-xs ml-2 bg-black text-white px-2 py-0.5 rounded-full font-roboto">
                            In Calendar
                          </span>
                        )}
                      </div>
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
                {editIndex !== null ? 'Edit Date Night' : 'Plan a Date Night'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 font-roboto">Date:</label>
                  <input
                    type="date"
                    value={newDateNight.date}
                    onChange={(e) => setNewDateNight({...newDateNight, date: e.target.value})}
                    className="w-full border rounded p-2 text-sm font-roboto"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 font-roboto">Time:</label>
                  <input
                    type="time"
                    value={newDateNight.time}
                    onChange={(e) => setNewDateNight({...newDateNight, time: e.target.value})}
                    className="w-full border rounded p-2 text-sm font-roboto"
                  />
                </div>
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Category:</label>
                <select
                  value={newDateNight.category}
                  onChange={(e) => setNewDateNight({...newDateNight, category: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                >
                  <option value="dining">Dining</option>
                  <option value="adventure">Adventure</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="family">Family Activity</option>
                  <option value="budget">Budget-Friendly</option>
                </select>
              </div>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Title:</label>
                <input
                  type="text"
                  value={newDateNight.title}
                  onChange={(e) => setNewDateNight({...newDateNight, title: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                  placeholder="What's your plan?"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Description (optional):</label>
                <textarea
                  value={newDateNight.description}
                  onChange={(e) => setNewDateNight({...newDateNight, description: e.target.value})}
                  className="w-full border rounded p-2 text-sm h-20 font-roboto"
                  placeholder="Any additional details..."
                ></textarea>
              </div>
              
              {/* Participants */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Participants:</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                  {familyMembers.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        id={`participant-${member.id}`}
                        checked={newDateNight.participants.some(p => p.id === member.id)}
                        onChange={() => toggleParticipant(member.id)}
                        className="mr-2"
                      />
                      <label 
                        htmlFor={`participant-${member.id}`}
                        className="text-sm font-roboto cursor-pointer flex-1"
                      >
                        {member.name} {member.role === 'parent' ? '(Parent)' : '(Child)'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Date Ideas */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium font-roboto">Need inspiration?</label>
                  <select
                    value={ideaCategory}
                    onChange={(e) => setIdeaCategory(e.target.value)}
                    className="text-xs border rounded p-1 font-roboto"
                  >
                    <option value="all">All Ideas</option>
                    <option value="dining">Dining</option>
                    <option value="adventure">Adventure</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="family">Family</option>
                    <option value="budget">Budget-Friendly</option>
                  </select>
                </div>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {getDateIdeas(ideaCategory).map((idea, i) => (
                    <div 
                      key={i}
                      className="p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100 flex items-center font-roboto"
                      onClick={() => setNewDateNight({...newDateNight, title: idea})}
                    >
                      <Star size={14} className="text-yellow-500 mr-2 flex-shrink-0" />
                      {idea}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Calendar error message */}
              {calendarError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-roboto flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>{calendarError}</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded font-roboto"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={addDateNight}
                  disabled={!newDateNight.title || !newDateNight.date}
                  className={`px-4 py-2 rounded font-roboto ${
                    newDateNight.title && newDateNight.date 
                      ? 'bg-black text-white' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {editIndex !== null ? 'Update' : 'Schedule'}
                </button>
                {newDateNight.title && newDateNight.date && (
                  <button
                    onClick={() => addToCalendar(newDateNight)}
                    disabled={isAddingToCalendar}
                    className={`px-4 py-2 border rounded font-roboto flex items-center ${
                      isAddingToCalendar ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAddingToCalendar ? (
                      <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Calendar size={16} className="mr-2" />
                    )}
                    Add to Calendar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDateNightPlanner;