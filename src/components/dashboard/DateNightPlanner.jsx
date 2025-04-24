import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Heart, Star, X, Clock, CheckCircle, Trash2, Edit, Users, AlertCircle } from 'lucide-react';
import EnhancedEventManager from '../../components/calendar/EnhancedEventManager';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const DateNightPlanner = ({ onAddToCalendar }) => {
  const { familyId, familyMembers, selectedUser } = useFamily();
  const { currentUser } = useAuth();
  
  const [dateNights, setDateNights] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ideaCategory, setIdeaCategory] = useState('all');
  const [selectedDateIdea, setSelectedDateIdea] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(null);
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  
  // Load date night data
useEffect(() => {
  const loadDateNightData = async () => {
    if (!familyId) return;
    
    try {
      // Load real data from Firebase
      const dateNightsRef = collection(db, "dateNights");
      const q = query(
        dateNightsRef, 
        where("familyId", "==", familyId),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const loadedDateNights = [];
      
      querySnapshot.forEach((doc) => {
        loadedDateNights.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDateNights(loadedDateNights);
      setLoading(false);
    } catch (error) {
      console.error("Error loading date night data:", error);
      setDateNights([]);
      setLoading(false);
    }
  };
  
  loadDateNightData();
}, [familyId]);
  
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
  
  // Handle calendar event save
const handleEventSave = async (eventResult) => {
  try {
    setCalendarError(null);
    
    if (eventResult && eventResult.success) {
      // Extract date night specific details
      const { dateTime, location, description, providers, dateNightDetails } = eventResult;
      
      // Add to date nights list
      if (selectedDateIdea) {
        const newDateNight = {
          id: Date.now().toString(),
          title: selectedDateIdea,
          description: description || '',
          date: new Date(dateTime || Date.now()).toISOString().split('T')[0],
          time: new Date(dateTime || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          location: location || '',
          category: ideaCategory !== 'all' ? ideaCategory : 'entertainment',
          completed: false,
          participants: familyMembers
            .filter(m => m.role === 'parent')
            .map(m => ({ id: m.id, name: m.name })),
          inCalendar: true,
          providers: providers || [], // Store babysitter/provider information
          dateNightDetails: dateNightDetails || {} // Store date night specific details
        };
        
        setDateNights([...dateNights, newDateNight]);
      }
      
      // If editing, update the existing date night
      if (editIndex !== null) {
        const updatedDateNights = [...dateNights];
        updatedDateNights[editIndex] = {
          ...updatedDateNights[editIndex],
          description: eventResult.description || updatedDateNights[editIndex].description,
          location: eventResult.location || updatedDateNights[editIndex].location,
          date: new Date(eventResult.dateTime || Date.now()).toISOString().split('T')[0],
          time: new Date(eventResult.dateTime || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          providers: eventResult.providers || updatedDateNights[editIndex].providers || [],
          dateNightDetails: eventResult.dateNightDetails || updatedDateNights[editIndex].dateNightDetails || {},
          inCalendar: true
        };
        setDateNights(updatedDateNights);
      }
      
      setCalendarSuccess(true);
      setTimeout(() => setCalendarSuccess(false), 3000);
      setShowAddModal(false);
      setEditIndex(null);
      setSelectedDateIdea(null);
      
      // Also call the provided onAddToCalendar if it exists
      if (onAddToCalendar && typeof onAddToCalendar === 'function') {
        await onAddToCalendar({
          ...eventResult,
          eventType: 'date-night',
          category: 'relationship'
        });
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
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  
  // Get event data for EnhancedEventManager when editing
const getEventDataForEditing = () => {
  if (editIndex === null) return null;
  
  const dateNight = dateNights[editIndex];
  const startDate = new Date(`${dateNight.date}T${dateNight.time || '19:00'}`);
  
  return {
    title: `Date Night: ${dateNight.title}`,
    description: dateNight.description || 'Quality time together',
    location: dateNight.location || '',
    dateTime: startDate.toISOString(),
    category: 'relationship',
    eventType: 'date-night',
    duration: 120, // Default 2 hour duration
    childId: null,
    childName: null,
    attendingParentId: 'both',
    participants: dateNight.participants,
    providers: dateNight.providers || [], // Preserve babysitter/provider if set
    dateNightDetails: dateNight.dateNightDetails || {
      venue: dateNight.location || '',
      budget: '',
      transportation: '',
      childcareArranged: dateNight.providers && dateNight.providers.length > 0,
      needsBabysitter: true,
      specialOccasion: false
    }
  };
};
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Date Night Planner</h3>
          
          <button 
            onClick={() => {
              setEditIndex(null);
              setSelectedDateIdea(null);
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
        
        {/* Success message */}
        {calendarSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle size={16} className="text-green-600 mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm text-green-800 font-roboto">
              Success! Your date night has been added to the calendar.
            </p>
          </div>
        )}
        
        {/* Error message */}
        {calendarError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle size={16} className="text-red-600 mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm text-red-800 font-roboto">
              {calendarError}
            </p>
          </div>
        )}
        
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
      
      {/* Date Ideas Selection Modal */}
{showAddModal && !selectedDateIdea && editIndex === null && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-lg w-full p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold font-roboto">Plan a Date Night</h3>
        <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 font-roboto">Choose a date idea:</label>
        <select
          value={ideaCategory}
          onChange={(e) => setIdeaCategory(e.target.value)}
          className="w-full border rounded p-2 text-sm font-roboto mb-3"
        >
          <option value="all">All Ideas</option>
          <option value="dining">Dining</option>
          <option value="adventure">Adventure</option>
          <option value="entertainment">Entertainment</option>
          <option value="family">Family</option>
          <option value="budget">Budget-Friendly</option>
        </select>
        
        <div className="max-h-60 overflow-y-auto border rounded p-2">
          {getDateIdeas(ideaCategory).map((idea, i) => (
            <div 
              key={i}
              className="p-2 rounded cursor-pointer hover:bg-gray-100 mb-1 flex items-center"
              onClick={() => setSelectedDateIdea(idea)}
            >
              <Star size={14} className="text-yellow-500 mr-2" />
              <span className="text-sm font-roboto">{idea}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => setSelectedDateIdea("Custom Date Night")}
          className="text-blue-600 hover:text-blue-800 text-sm underline font-roboto"
        >
          Create a custom date night instead
        </button>
      </div>
    </div>
  </div>
)}

{/* Event Manager Modal - Direct (no wrapper) */}
{(selectedDateIdea || editIndex !== null) && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <EnhancedEventManager
        initialEvent={editIndex !== null ? getEventDataForEditing() : {
          title: `Date Night: ${selectedDateIdea}`,
          description: 'Quality time together',
          category: 'relationship',
          eventType: 'date-night',
          duration: 120, // 2 hours
          attendingParentId: 'both',
          dateNightDetails: {
            venue: '',
            budget: '',
            transportation: '',
            childcareArranged: false,
            needsBabysitter: true,
            specialOccasion: false
          },
          // Make sure parents are automatically assigned
          participants: familyMembers
            .filter(m => m.role === 'parent')
            .map(m => ({ id: m.id, name: m.name }))
        }}
        onSave={(result) => {
          handleEventSave(result);
          setSelectedDateIdea(null);
          setShowAddModal(false);
        }}
        onCancel={() => {
          setSelectedDateIdea(null);
          if (editIndex !== null) {
            setEditIndex(null);
          }
          setShowAddModal(false);
        }}
        eventType="date-night"
        selectedDate={new Date()}
        isCompact={false}
        mode={editIndex !== null ? 'edit' : 'create'}
      />
    </div>
  </div>
)}
    </div>
  );
};

export default DateNightPlanner;