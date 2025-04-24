// src/components/dashboard/ChildDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Heart, Activity, Book, Award, Clock, 
  MessageCircle, Paperclip, FileText, User, Plus, 
  ChevronRight, ChevronDown, Edit, MapPin, Phone,
  Mic, AlertCircle, CheckCircle, Info, X
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../common/UserAvatar';
import { useEvents } from '../../contexts/EventContext';
import AllieAIService from '../../services/AllieAIService';
import { formatDistanceToNow, format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const ChildDashboard = ({ 
  child, 
  childData, 
  onOpenAppointment, 
  onOpenGrowth, 
  onOpenRoutine, 
  onOpenDocuments,
  onOpenProviders
}) => {
  const { currentUser, familyId } = useAuth();
  const { familyMembers } = useFamily();
  const { events, loading: eventsLoading } = useEvents();
  const [activeTab, setActiveTab] = useState('health');
  const [quickStats, setQuickStats] = useState({
    upcomingAppointments: 0,
    missingInfo: [],
    growthStatus: 'unknown',
    recentMilestones: []
  });
  const [timeline, setTimeline] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: `How can I help with ${child.name} today?` }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [suggestions, setSuggestions] = useState([
    `Schedule a doctor's appointment for ${child.name}`,
    `Record ${child.name}'s growth measurements`,
    `Add information about ${child.name}'s allergies`
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef(null);
  
  // Generate timeline and quick stats on load
  useEffect(() => {
    generateTimeline();
    generateQuickStats();
  }, [child, childData, events]);
  
  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // Generate timeline from events and child data
  const generateTimeline = () => {
    const timeline = [];
    
    // Add child-specific events from the events list
    if (events && events.length > 0) {
      const childEvents = events.filter(event => 
        event.childId === child.id || 
        (event.attendees && event.attendees.some(a => a.id === child.id))
      );
      
      childEvents.forEach(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || event.dateTime);
        if (eventDate >= new Date()) {
          timeline.push({
            type: 'event',
            title: event.summary || event.title,
            date: eventDate,
            details: event.description || '',
            location: event.location || '',
            category: event.category || 'general',
            data: event
          });
        }
      });
    }
    
    // Add appointments from childData
    if (childData?.medicalAppointments) {
      childData.medicalAppointments.forEach(apt => {
        if (!apt.completed && new Date(apt.date) >= new Date()) {
          timeline.push({
            type: 'appointment',
            title: apt.title,
            date: new Date(`${apt.date}T${apt.time || '09:00:00'}`),
            details: apt.notes || '',
            location: apt.location || '',
            category: 'medical',
            data: apt
          });
        }
      });
    }
    
    // Add routines from childData
    if (childData?.routines) {
      childData.routines.forEach(routine => {
        // Add routine for next occurrence based on day of week
        if (routine.days && routine.days.length > 0) {
          const today = new Date();
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Find the next day that this routine occurs
          const nextDayIndex = routine.days
            .map(day => dayNames.indexOf(day))
            .filter(dayIndex => dayIndex >= todayIndex)
            .sort((a, b) => a - b)[0] || routine.days.map(day => dayNames.indexOf(day)).sort()[0];
          
          const daysToAdd = (nextDayIndex - todayIndex + 7) % 7;
          const nextOccurrence = new Date(today);
          nextOccurrence.setDate(today.getDate() + daysToAdd);
          
          // Set time from routine
          if (routine.startTime) {
            const [hours, minutes] = routine.startTime.split(':');
            nextOccurrence.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            nextOccurrence.setHours(9, 0, 0, 0); // Default to 9:00 AM
          }
          
          timeline.push({
            type: 'routine',
            title: routine.title,
            date: nextOccurrence,
            details: routine.notes || '',
            days: routine.days,
            category: 'activity',
            data: routine
          });
        }
      });
    }
    
    // Sort by date
    timeline.sort((a, b) => a.date - b.date);
    
    // Set the timeline
    setTimeline(timeline);
  };
  
  // Generate quick stats for the child
  const generateQuickStats = () => {
    const stats = {
      upcomingAppointments: 0,
      missingInfo: [],
      growthStatus: 'unknown',
      recentMilestones: []
    };
    
    // Count upcoming appointments
    if (childData?.medicalAppointments) {
      stats.upcomingAppointments = childData.medicalAppointments.filter(
        apt => !apt.completed && new Date(apt.date) >= new Date()
      ).length;
      
      // Check for missing information in appointments
      childData.medicalAppointments
        .filter(apt => !apt.completed && new Date(apt.date) >= new Date())
        .forEach(apt => {
          if (!apt.doctor) {
            stats.missingInfo.push("Doctor's name for " + apt.title);
          }
          if (!apt.location) {
            stats.missingInfo.push("Location for " + apt.title);
          }
        });
    }
    
    // Check growth status
    if (childData?.growthData && childData.growthData.length > 0) {
      const latestGrowth = [...childData.growthData].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )[0];
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      stats.growthStatus = new Date(latestGrowth.date) > threeMonthsAgo 
        ? 'recent' 
        : 'needs_update';
    } else {
      stats.growthStatus = 'missing';
      stats.missingInfo.push("Growth measurements");
    }
    
    // Limit missing info to top 3
    stats.missingInfo = stats.missingInfo.slice(0, 3);
    
    setQuickStats(stats);
  };
  
  // Format date for display
  const formatTimelineDate = (date) => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else if (isThisWeek(date)) {
      return `${format(date, 'EEEE')}, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };
  
  
  
 
  

  // Helper to determine which details are required for each event type
  const calculateMissingDetails = (event) => {
    const missing = [];
    
    // Common essential details for all events
    if (!event.title || event.title.trim() === '') missing.push('Event title');
    if (!event.date) missing.push('Date');
    
    // Specific details based on event type
    if (event.category === 'medical' || event.type === 'appointment') {
      if (!event.doctor && !event.providerName) missing.push("Doctor's name");
      if (!event.location) missing.push('Office location');
      if (!event.phone) missing.push('Contact number');
      if (!event.insuranceInfo) missing.push('Insurance information');
    }
    else if (event.category === 'activity' || event.type === 'routine') {
      if (!event.location) missing.push('Location');
      if (!event.coach && !event.instructor) missing.push('Coach/instructor name');
      if (!event.equipment) missing.push('Required equipment');
      if (event.isRecurring && (!event.days || event.days.length === 0)) {
        missing.push('Schedule days');
      }
    }
    else if (event.category === 'party' || event.title?.toLowerCase().includes('birthday')) {
      if (!event.location) missing.push('Venue location');
      if (!event.guestList && !event.attendees) missing.push('Guest list');
      if (!event.theme) missing.push('Party theme');
    }
    
    return missing;
  };



// Add this EventDetails component within ChildDashboard.jsx before the main component
const EventDetails = ({ event, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [missingDetails, setMissingDetails] = useState([]);
  
  useEffect(() => {
    // Calculate missing details based on event type
    const missing = calculateMissingDetails(event);
    setMissingDetails(missing);
  }, [event]);
  

  
  return (
    <div className="border rounded-lg p-3 mb-3 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          {/* Event type icon */}
          <div className={`p-2 rounded-full mr-3 ${
            event.category === 'medical' ? 'bg-red-100 text-red-600' :
            event.category === 'activity' ? 'bg-green-100 text-green-600' :
            event.category === 'school' ? 'bg-blue-100 text-blue-600' :
            event.category === 'special' || event.category === 'party' ? 'bg-purple-100 text-purple-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {event.category === 'medical' ? <Heart size={16} /> :
             event.category === 'activity' ? <Activity size={16} /> :
             event.category === 'school' ? <Book size={16} /> :
             event.category === 'special' || event.category === 'party' ? <Award size={16} /> :
             <Calendar size={16} />}
          </div>
          
          <div>
            <h4 className="font-medium">{event.title}</h4>
            <p className="text-sm text-gray-600">
              {event.date && typeof event.date === 'string' 
                ? format(parseISO(event.date), 'MMM d, yyyy')
                : event.date 
                  ? format(event.date, 'MMM d, yyyy') 
                  : 'Date not set'} 
              {event.time && ` at ${event.time}`}
            </p>
            
            {/* Show key details based on event type */}
            {event.location && (
              <p className="text-sm text-gray-600 flex items-center mt-1">
                <MapPin size={12} className="mr-1" /> {event.location}
              </p>
            )}
            
            {(event.doctor || event.providerName) && (
              <p className="text-sm text-gray-600 flex items-center mt-1">
                <User size={12} className="mr-1" /> {event.providerName || `Dr. ${event.doctor}`}
              </p>
            )}
            
            {event.phone && (
              <p className="text-sm text-gray-600 flex items-center mt-1">
                <Phone size={12} className="mr-1" /> {event.phone}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-start">
          {/* Completeness indicator */}
          {missingDetails.length > 0 ? (
            <span className="inline-flex items-center px-2 py-1 mr-2 text-xs rounded-full bg-amber-100 text-amber-800">
              {15 - missingDetails.length}/15
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 mr-2 text-xs rounded-full bg-green-100 text-green-800">
              Complete
            </span>
          )}
          
          <button 
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            onClick={() => onEdit(event)}
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
      
      {/* Expandable details section */}
      <div className="mt-2">
        <button
          className="text-sm text-blue-600 flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={14} className="mr-1" /> : <ChevronRight size={14} className="mr-1" />}
          {expanded ? "Hide details" : "Show details"}
        </button>
        
        {expanded && (
          <div className="mt-2 space-y-2">
            {event.description && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <p>{event.description}</p>
              </div>
            )}
            
            {/* Missing information warnings */}
            {missingDetails.length > 0 && (
              <div className="p-2 bg-amber-50 rounded border border-amber-100">
                <p className="text-sm font-medium text-amber-800 mb-1">Missing information:</p>
                <ul className="text-sm text-amber-700 list-disc list-inside">
                  {missingDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Additional details specific to event type */}
            {event.category === 'medical' && (
              <div className="space-y-1">
                {event.insuranceInfo && (
                  <p className="text-sm"><span className="font-medium">Insurance:</span> {event.insuranceInfo}</p>
                )}
                {event.forms && (
                  <p className="text-sm"><span className="font-medium">Forms needed:</span> {event.forms}</p>
                )}
                {event.followUp && (
                  <p className="text-sm"><span className="font-medium">Follow-up:</span> {event.followUp}</p>
                )}
              </div>
            )}
            
            {event.category === 'activity' && (
              <div className="space-y-1">
                {event.equipment && (
                  <p className="text-sm"><span className="font-medium">Equipment:</span> {event.equipment}</p>
                )}
                {event.transportation && (
                  <p className="text-sm"><span className="font-medium">Transportation:</span> {event.transportation}</p>
                )}
                {event.isRecurring && event.days && (
                  <p className="text-sm"><span className="font-medium">Schedule:</span> {event.days.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add these functions to the main ChildDashboard component

// Function to get child-specific providers
const loadChildProviders = async () => {
  if (!child || !familyId) return [];
  
  try {
    const providersRef = collection(db, "healthcareProviders");
    const q = query(
      providersRef, 
      where("familyId", "==", familyId),
      where("forChild", "==", child.id)
    );
    
    const querySnapshot = await getDocs(q);
    const providers = [];
    
    querySnapshot.forEach((doc) => {
      providers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return providers;
  } catch (error) {
    console.error("Error loading child providers:", error);
    return [];
  }
};

// Enhanced version of the generateChatSuggestions function
const generateChatSuggestions = () => {
  const suggestions = [];
  
  // Basic suggestions for all children
  suggestions.push(`Schedule a doctor's appointment for ${child.name}`);
  
  // Check child data for personalized suggestions
  if (!childData?.growthData || childData.growthData.length === 0) {
    suggestions.push(`Add growth measurements for ${child.name}`);
  }
  
  if (!childData?.medicalAppointments || childData.medicalAppointments.length === 0) {
    suggestions.push(`Add medical info for ${child.name}`);
  }
  
  // Add activity based suggestions
  if (!childData?.routines || childData.routines.length === 0) {
    suggestions.push(`Add a regular activity for ${child.name}`);
  }
  
  // Check timeline for upcoming events needing more info
  const incompleteEvents = timeline.filter(event => {
    const missing = calculateMissingDetails(event);
    return missing.length > 0;
  });
  
  if (incompleteEvents.length > 0) {
    suggestions.push(`Complete details for ${incompleteEvents[0].title}`);
  }
  
  // Add document suggestions
  suggestions.push(`Upload a document for ${child.name}`);
  
  // Limit to 4 suggestions and return
  return suggestions.slice(0, 4);
};





  // Get timeline items for the selected tab
  const getTabTimeline = () => {
    switch (activeTab) {
      case 'health':
        return timeline.filter(item => 
          item.category === 'medical' || 
          item.category === 'health' ||
          item.type === 'appointment'
        );
      case 'activities':
        return timeline.filter(item => 
          item.category === 'activity' || 
          item.category === 'sport' ||
          item.type === 'routine'
        );
      case 'school':
        return timeline.filter(item => 
          item.category === 'school' || 
          item.category === 'education'
        );
        case 'providers':
            return []; // We'll handle providers differently
      default:
        return timeline;
    }
  };
  
  // Replace the existing renderTabContent function with this enhanced version
const renderTabContent = () => {
    const tabTimeline = getTabTimeline();
    
    if (activeTab === 'providers') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg flex items-center">
              <User size={18} className="mr-2 text-purple-500" />
              {child.name}'s Healthcare Providers
            </h3>
            <button
              onClick={() => onOpenProviders(child.id)}
              className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
            >
              <Plus size={14} className="mr-1" />
              Add Provider
            </button>
          </div>
          
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <User size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Manage healthcare providers for {child.name}</p>
            <button
              onClick={() => onOpenProviders(child.id)}
              className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
            >
              <Plus size={14} className="mr-1" />
              View Provider Directory
            </button>
          </div>
        </div>
      );
    }
  
    if (tabTimeline.length === 0) {
      return (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <Calendar size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No {activeTab} events found for {child.name}</p>
          <button 
            className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
            onClick={() => {
              switch (activeTab) {
                case 'health':
                  onOpenAppointment({ childId: child.id });
                  break;
                case 'activities':
                  onOpenRoutine({ childId: child.id });
                  break;
                case 'school':
                  onOpenAppointment({ childId: child.id, category: 'school', eventType: 'school' });
                  break;
                default:
                  break;
              }
            }}
          >
            <Plus size={14} className="mr-1" />
            Add {activeTab === 'health' ? 'Appointment' : 
                 activeTab === 'activities' ? 'Activity' :
                 activeTab === 'school' ? 'School Event' : 'Event'}
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {/* Events list using EventDetails component */}
        {tabTimeline.map((item, index) => (
          <EventDetails 
            key={index} 
            event={item} 
            onEdit={() => {
              // Handle different event types
              if (item.type === 'appointment') {
                onOpenAppointment({ childId: child.id, ...item.data });
              } else if (item.type === 'routine') {
                onOpenRoutine({ childId: child.id, ...item.data });
              } else if (item.type === 'event') {
                // Handle event based on category
                if (item.category === 'medical') {
                  onOpenAppointment({ childId: child.id, ...item.data });
                } else if (item.category === 'activity') {
                  onOpenRoutine({ childId: child.id, ...item.data });
                } else if (item.category === 'school') {
                  onOpenAppointment({ childId: child.id, category: 'school', eventType: 'school', ...item.data });
                }
              }
            }} 
          />
        ))}
      </div>
    );
  };
  
  // Render health-specific content
  const renderHealthTab = () => {
    // List of appointments
    const appointments = childData?.medicalAppointments || [];
    const upcomingAppointments = appointments
      .filter(apt => !apt.completed && new Date(apt.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const pastAppointments = appointments
      .filter(apt => apt.completed || new Date(apt.date) < new Date())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Growth data
    const growthEntries = childData?.growthData || [];
    const latestGrowth = growthEntries.length > 0
      ? [...growthEntries].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;
    
    return (
      <div className="space-y-6">
        {/* Upcoming Appointments */}
        <div>
          <h3 className="font-medium mb-2 text-lg flex items-center">
            <Calendar size={18} className="mr-2 text-blue-500" />
            Upcoming Appointments
          </h3>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 3).map((apt, index) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">{apt.title}</h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(apt.date), 'MMM d, yyyy')} 
                        {apt.time && ` at ${apt.time}`}
                      </p>
                      {apt.doctor && (
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <User size={12} className="mr-1" /> Dr. {apt.doctor}
                        </p>
                      )}
                      {apt.location && (
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <MapPin size={12} className="mr-1" /> {apt.location}
                        </p>
                      )}
                    </div>
                    
                    <button 
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      onClick={() => onOpenAppointment({ childId: child.id, ...apt })}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {upcomingAppointments.length > 3 && (
                <button className="w-full text-center py-2 text-blue-600 hover:bg-blue-50 rounded text-sm">
                  View all {upcomingAppointments.length} appointments
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Heart size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No upcoming appointments</p>
              <button 
                className="mt-3 px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
                onClick={() => onOpenAppointment({ childId: child.id })}
              >
                <Plus size={14} className="mr-1" />
                Add Appointment
              </button>
            </div>
          )}
        </div>
        
        {/* Latest Growth Data */}
        <div>
          <h3 className="font-medium mb-2 text-lg flex items-center">
            <Activity size={18} className="mr-2 text-green-500" />
            Growth Information
          </h3>
          
          {latestGrowth ? (
            <div className="border rounded-lg p-3">
              <div className="flex justify-between">
                <h4 className="font-medium">Latest Measurements</h4>
                <p className="text-sm text-gray-600">
                  {format(new Date(latestGrowth.date), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {latestGrowth.height && (
                  <div>
                    <p className="text-sm text-gray-600">Height</p>
                    <p className="font-medium">{latestGrowth.height}</p>
                  </div>
                )}
                {latestGrowth.weight && (
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-medium">{latestGrowth.weight}</p>
                  </div>
                )}
                {latestGrowth.shoeSize && (
                  <div>
                    <p className="text-sm text-gray-600">Shoe Size</p>
                    <p className="font-medium">{latestGrowth.shoeSize}</p>
                  </div>
                )}
                {latestGrowth.clothingSize && (
                  <div>
                    <p className="text-sm text-gray-600">Clothing Size</p>
                    <p className="font-medium">{latestGrowth.clothingSize}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 flex justify-end">
                <button 
                  className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
                  onClick={() => onOpenGrowth({ childId: child.id })}
                >
                  <Plus size={14} className="mr-1" />
                  Add New Measurement
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Activity size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No growth data recorded yet</p>
              <button 
                className="mt-3 px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 inline-flex items-center"
                onClick={() => onOpenGrowth({ childId: child.id })}
              >
                <Plus size={14} className="mr-1" />
                Add Measurements
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm mb-6">
      {/* Child Profile Header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        <UserAvatar user={child} size={64} className="mr-4" />
        <div>
          <h2 className="text-2xl font-bold">{child.name}</h2>
          <p className="text-gray-600">{child.age ? `${child.age} years old` : 'Age not specified'}</p>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">QUICK STATS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Upcoming Appointments */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center text-blue-600 mb-1">
              <Calendar size={16} className="mr-1" />
              <h4 className="font-medium">Appointments</h4>
            </div>
            <p className="text-gray-700">
              {quickStats.upcomingAppointments > 0 ? 
                `${quickStats.upcomingAppointments} upcoming` : 
                'No upcoming appointments'}
            </p>
          </div>
          
          {/* Missing Information */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center text-amber-600 mb-1">
              <AlertCircle size={16} className="mr-1" />
              <h4 className="font-medium">Missing Info</h4>
            </div>
            {quickStats.missingInfo.length > 0 ? (
              <ul className="text-gray-700 text-sm">
                {quickStats.missingInfo.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span> {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700">All information is complete</p>
            )}
          </div>
          
          {/* Growth Status */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center text-green-600 mb-1">
              <Activity size={16} className="mr-1" />
              <h4 className="font-medium">Growth Status</h4>
            </div>
            <p className="text-gray-700">
              {quickStats.growthStatus === 'recent' ? (
                <span className="flex items-center text-green-600">
                  <CheckCircle size={14} className="mr-1" /> Up to date
                </span>
              ) : quickStats.growthStatus === 'needs_update' ? (
                <span className="flex items-center text-amber-600">
                  <Info size={14} className="mr-1" /> Needs updating
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <AlertCircle size={14} className="mr-1" /> No data recorded
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium mb-3 text-lg">Upcoming Timeline</h3>
        
        {timeline.length > 0 ? (
          <div className="space-y-3 mb-4">
            {timeline.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-start">
                <div className={`p-2 rounded-full mr-3 ${
                  item.category === 'medical' ? 'bg-red-100 text-red-600' :
                  item.category === 'activity' ? 'bg-green-100 text-green-600' :
                  item.category === 'school' ? 'bg-blue-100 text-blue-600' :
                  item.category === 'special' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.category === 'medical' ? <Heart size={16} /> :
                   item.category === 'activity' ? <Activity size={16} /> :
                   item.category === 'school' ? <Book size={16} /> :
                   item.category === 'special' ? <Award size={16} /> :
                   <Calendar size={16} />}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-600">{formatTimelineDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No upcoming events</p>
          </div>
        )}
        
        {timeline.length > 3 && (
          <button className="w-full text-center py-2 text-blue-600 hover:bg-blue-50 rounded text-sm">
            View all {timeline.length} events
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('health')}
            className={`flex-1 py-2 px-3 rounded ${
              activeTab === 'health' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            <Heart size={16} className="mx-auto mb-1" />
            <span className="text-xs">Health</span>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-2 px-3 rounded ${
              activeTab === 'activities' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            <Activity size={16} className="mx-auto mb-1" />
            <span className="text-xs">Activities</span>
          </button>
          <button
            onClick={() => setActiveTab('school')}
            className={`flex-1 py-2 px-3 rounded ${
              activeTab === 'school' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
            }`}
          >
            <Book size={16} className="mx-auto mb-1" />
            <span className="text-xs">School</span>
          </button>
          <button
  onClick={() => setActiveTab('providers')}
  className={`flex-1 py-2 px-3 rounded ${
    activeTab === 'providers' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
  }`}
>
  <User size={16} className="mx-auto mb-1" />
  <span className="text-xs">Providers</span>
</button>
          <button
            onClick={() => onOpenDocuments(child.id)}
            className={`flex-1 py-2 px-3 rounded hover:bg-gray-200`}
          >
            <FileText size={16} className="mx-auto mb-1" />
            <span className="text-xs">Documents</span>
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-4 border-b border-gray-200">
        {activeTab === 'health' ? renderHealthTab() : renderTabContent()}
      </div>
      
      {/* Allie Chat Interface */}
<div className="p-4 rounded-b-lg">
  <h3 className="font-medium mb-3 text-lg flex items-center">
    <MessageCircle size={18} className="mr-2 text-purple-500" />
    Chat with Allie about {child.name}
  </h3>
  
  <button
    onClick={() => {
      // Dispatch the open-allie-chat event to trigger the global chat widget
      window.dispatchEvent(new CustomEvent('open-allie-chat', {
        detail: {
          message: `I need help with ${child.name}`
        }
      }));
    }}
    className="w-full py-3 bg-black text-white rounded-md hover:bg-gray-800 flex items-center justify-center"
  >
    <MessageCircle size={18} className="mr-2" />
    Chat with Allie
  </button>
  
  <div className="mt-2 text-center text-xs text-gray-500">
    Ask questions or get help managing {child.name}'s health, activities, or documents
  </div>
</div>
    </div>
  );
};

export default ChildDashboard;