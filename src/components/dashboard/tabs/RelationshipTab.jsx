// src/components/dashboard/tabs/RelationshipTab.jsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, MessageCircle, 
  Brain, Info, CheckCircle, Lightbulb, Target, AlertCircle, 
  Bell, Award, X, RefreshCw, Clock, ArrowRight, Shield, Save, Plus, Star, Link,
  Trash2, Edit, CheckSquare, Square, GripVertical, Tag, MoreHorizontal, Calendar as CalendarIcon,
  Clipboard
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
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
import { useAuth } from '../../../contexts/AuthContext';
import CycleJourney from '../../cycles/CycleJourney';





// Lazy load heavy components to improve initial load performance
const DailyCheckInTool = lazy(() => import('../DailyCheckInTool'));
const GratitudeTracker = lazy(() => import('../GratitudeTracker'));
const DateNightPlanner = lazy(() => import('../DateNightPlanner'));
const SelfCarePlanner = lazy(() => import('../SelfCarePlanner'));
const CoupleRelationshipChart = lazy(() => import('../CoupleRelationshipChart'));
const RelationshipProgressChart = lazy(() => import('../RelationshipProgressChart'));
const AIRelationshipInsights = lazy(() => import('../AIRelationshipInsights'));
const EnhancedRelationshipCycleHistory = lazy(() => import('../../relationship/EnhancedRelationshipCycleHistory'));

// Helper to format date consistently
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
 * Combined History and Charts component
 */
const CombinedHistoryAndCharts = ({ hasEnoughDataForCharts }) => {
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);

  // Handle cycle selection
  const handleSelectHistoryCycle = (cycleNum) => {
    // Find the cycle data
    setSelectedHistoryCycle(cycleNum);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-bold mb-4 font-roboto flex items-center">
        <Target size={20} className="mr-2 text-purple-600" />
        Relationship Progress & History
      </h3>

      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 font-roboto ${
            activeTab === 'progress' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-600'
          }`}
        >
          Progress Charts
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`px-4 py-2 font-roboto ${
            activeTab === 'trend' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-600'
          }`}
        >
          Relationship Trends
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-roboto ${
            activeTab === 'history' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-600'
          }`}
        >
          Cycle History
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'progress' && (
          <Suspense fallback={<div className="py-8 text-center"><div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto"></div></div>}>
            {hasEnoughDataForCharts ? (
              <RelationshipProgressChart />
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Target size={48} className="mx-auto text-gray-400 mb-3" />
                <h4 className="text-lg font-medium mb-2 font-roboto">Chart Data Not Available Yet</h4>
                <p className="text-gray-600 mb-4 font-roboto">
                  Complete your first relationship cycle to see your relationship progress. 
                  This will help you track improvements over time.
                </p>
              </div>
            )}
          </Suspense>
        )}

        {activeTab === 'trend' && (
          <Suspense fallback={<div className="py-8 text-center"><div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto"></div></div>}>
            {hasEnoughDataForCharts ? (
              <CoupleRelationshipChart />
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Target size={48} className="mx-auto text-gray-400 mb-3" />
                <h4 className="text-lg font-medium mb-2 font-roboto">Chart Data Not Available Yet</h4>
                <p className="text-gray-600 mb-4 font-roboto">
                  Complete your first relationship cycle to see your relationship trends. 
                  This will help you understand patterns over time.
                </p>
              </div>
            )}
          </Suspense>
        )}

        {activeTab === 'history' && (
          <Suspense fallback={<div className="py-8 text-center"><div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto"></div></div>}>
            <EnhancedRelationshipCycleHistory 
              onSelectCycle={handleSelectHistoryCycle} 
              compact={false}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

/**
 * Enhanced component to track and manage relationship cycles
 */
const CycleManager = ({ cycle }) => {
  const { 
    familyId, 
    familyMembers,
    getRelationshipCycleData,
    completeRelationshipAssessment,
    completeRelationshipPrework,
    scheduleCouplesMeeting,
    completeCouplesMeeting,
    selectedUser
  } = useFamily();

  const { currentUser } = useAuth();
  
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // UI state for the different components
  const [showAssessment, setShowAssessment] = useState(false);
  const [showPrework, setShowPrework] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  
  // State for CycleJourney component
  const [memberProgress, setMemberProgress] = useState({});
  const [formattedCycleData, setFormattedCycleData] = useState({});
  
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

  // Prepare member progress for CycleJourney
  useEffect(() => {
    if (!cycleData || loading) return;
    
    const progress = {};
    
    // Add progress for each parent
    familyMembers
      .filter(member => member.role === 'parent')
      .forEach(member => {
        const memberData = {
          step: 1, // Start at step 1 (assessment)
          completedAssessment: false,
          completedPrework: false,
          completedMeeting: false
        };
        
        // Check assessment completion
        if (cycleData.assessments?.[member.id]?.completed) {
          memberData.completedAssessment = true;
          memberData.step = 2; // Move to step 2 (prework)
        }
        
        // Check prework completion
        if (cycleData.prework?.[member.id]?.completed) {
          memberData.completedPrework = true;
          memberData.step = 3; // Move to step 3 (meeting)
        }
        
        // Check meeting completion
        if (cycleData.meeting?.completed) {
          memberData.completedMeeting = true;
        }
        
        progress[member.id] = memberData;
      });
    
    setMemberProgress(progress);
    
    // Format cycle data for CycleJourney
    setFormattedCycleData({
      assessmentsCompleted: cycleData.assessmentsCompleted,
      preworkCompleted: cycleData.preworkCompleted,
      meeting: {
        scheduled: cycleData.meeting?.scheduled || false,
        scheduledDate: cycleData.meeting?.scheduledDate,
        completed: cycleData.meeting?.completed || false
      },
      metrics: cycleData.metrics || null
    });
    
  }, [cycleData, loading, familyMembers]);

  useEffect(() => {
    // Refresh cycle data if both parents have completed assessments but flag isn't set
    const checkAndUpdateAssessmentsComplete = async () => {
      if (!cycleData || loading) return;
      
      const myComplete = isCurrentUserComplete('assessments');
      const partnerComplete = isPartnerComplete('assessments');
      
      // If both are complete but flag is not set, refresh data
      if (myComplete && partnerComplete && !cycleData.assessmentsCompleted) {
        console.log("Both assessments complete but flag not set, refreshing data...");
        
        try {
          const freshData = await getRelationshipCycleData(cycle);
          if (freshData) {
            setCycleData(freshData);
          } else {
            // Force the flag if database fetch fails
            setCycleData(prev => ({
              ...prev,
              assessmentsCompleted: true,
              assessmentsCompletedDate: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.error("Error refreshing cycle data:", err);
        }
      }
    };
    
    checkAndUpdateAssessmentsComplete();
  }, [cycleData, loading, isCurrentUserComplete, isPartnerComplete, getRelationshipCycleData, cycle]);

  useEffect(() => {
    // Check for all required data
    if (!loading) {
      if (!familyId) {
        setError("Missing family data. Please try refreshing the page.");
        return;
      }
    }
    
    // Clear any previous errors if we have the required data
    if (familyId && error) {
      setError(null);
    }
  }, [loading, familyId, error]);

  const handleScheduleMeeting = async (event) => {
    try {
      // Format the data for the calendar using standardized format
      const meetingDate = new Date(event.start.dateTime);
      
      // Call the context function using the relationship calendar integration
      const result = await RelationshipCalendarIntegration.addRelationshipMeetingToCalendar(
        currentUser?.uid,
        cycle,
        meetingDate
      );
      
      if (result.success) {
        // Update local state
        setCycleData(prev => ({
          ...prev,
          meeting: {
            ...prev.meeting,
            scheduled: true,
            scheduledDate: meetingDate.toISOString(),
            calendarEventId: result.eventId || result.id
          }
        }));
        
        setShowScheduleModal(false);
      } else {
        throw new Error("Failed to add meeting to calendar");
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      setError("Failed to schedule the meeting. Please try again.");
    }
  };

  const handleAssessmentSubmit = async (responses) => {
    try {
      // Get the currentUser.uid directly and add proper null checking
      if (!currentUser || !currentUser.uid) {
        setError("You need to be signed in to complete the assessment.");
        return false;
      }
      
      const userId = currentUser.uid;
      
      // First save to database
      await completeRelationshipAssessment(cycle, responses);
      
      // Fetch the latest data after saving to ensure we have the most up-to-date state
      const latestCycleData = await getRelationshipCycleData(cycle);
      
      // If we successfully got updated data, use it - otherwise update locally
      if (latestCycleData) {
        setCycleData(latestCycleData);
      } else {
        // Update local state as fallback
        const updatedData = { ...cycleData };
        if (!updatedData.assessments) updatedData.assessments = {};
        
        updatedData.assessments[userId] = {
          completed: true,
          completedDate: new Date().toISOString(),
          responses: responses
        };
        
        const bothComplete = parentIds.every(id => 
          updatedData.assessments[id]?.completed || (id === userId)
        );
        
        if (bothComplete) {
          updatedData.assessmentsCompleted = true;
          updatedData.assessmentsCompletedDate = new Date().toISOString();
        }
        
        setCycleData(updatedData);
      }
      
      setShowAssessment(false);
      return true;
    } catch (err) {
      console.error("Error completing assessment:", err);
      setError("Error completing assessment. Please try again.");
      return false;
    }
  };
  
  // Handle prework completion with added null check
  const handlePreworkSubmit = async (preworkData) => {
    try {
      if (!currentUser) {
        setError("You need to be signed in to complete the pre-work.");
        return false;
      }
      
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
  
  // Handler for CycleJourney onStartStep
  const handleStartStep = (action, step) => {
    switch(action) {
      case "assessment":
        setShowAssessment(true);
        break;
      case "prework":
        setShowPrework(true);
        break;
      case "meeting":
        if (cycleData?.meeting?.scheduled) {
          setShowMeeting(true);
        } else {
          setShowScheduleMeeting(true);
        }
        break;
      default:
        console.log("Unknown action:", action);
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
  
  // Get meeting date for use in CycleJourney
  const meetingDate = cycleData?.meeting?.scheduledDate 
    ? new Date(cycleData.meeting.scheduledDate) 
    : null;

  return (
    <>
      {/* CycleJourney Component */}
      <CycleJourney
        cycleType="relationship"
        currentCycle={cycle}
        cycleData={formattedCycleData}
        familyMembers={familyMembers}
        currentUser={selectedUser || currentUser}
        memberProgress={memberProgress}
        onStartStep={handleStartStep}
        dueDate={meetingDate}
        onChangeDueDate={() => setShowScheduleMeeting(true)}
        loading={loading}
        error={error}
      />
      
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
              previousData={cycleData?.assessments?.[currentUser?.uid] || null}
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
              onSave={processScheduleMeeting}
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
    </>
  );
};

/**
 * Communication Suggestions Component
 */
const CommunicationSuggestions = () => {
  const { familyMembers } = useFamily();
  const { currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState([
    {
      title: "Active Listening Practice",
      description: "Take turns sharing thoughts without interruption for 5 minutes each. The listener should paraphrase what they heard before responding.",
      category: "communication"
    },
    {
      title: "Emotion Check-ins",
      description: "Share how you're feeling using 'I' statements like 'I feel...when...' to express emotions without blame.",
      category: "connection"
    },
    {
      title: "Appreciation Exchange",
      description: "Each day, share something specific you appreciate about your partner's actions or qualities.",
      category: "gratitude"
    }
  ]);
  
  // State for showing event manager modal
  const [showEventManager, setShowEventManager] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Handle scheduling an activity
  const handleScheduleActivity = (suggestion) => {
    // Set the selected activity
    setSelectedActivity(suggestion);
    
    // Show the event manager modal
    setShowEventManager(true);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h3 className="text-lg font-bold mb-4 font-roboto flex items-center">
        <MessageCircle size={20} className="mr-2 text-blue-600" />
        Communication Suggestions
      </h3>
      <p className="text-sm text-gray-600 mb-4 font-roboto">
        Try these research-backed communication techniques to strengthen your connection.
      </p>
      
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${
              suggestion.category === 'communication' ? 'bg-blue-50 border-blue-200' :
              suggestion.category === 'connection' ? 'bg-pink-50 border-pink-200' :
              'bg-amber-50 border-amber-200'
            }`}
          >
            <h4 className="font-medium mb-2 font-roboto">{suggestion.title}</h4>
            <p className="text-sm font-roboto">{suggestion.description}</p>
            <button 
              className="mt-3 text-sm flex items-center text-blue-600 hover:text-blue-800"
              onClick={() => handleScheduleActivity(suggestion)}
            >
              <Calendar size={14} className="mr-1" />
              Schedule this activity
            </button>
          </div>
        ))}
      </div>
      
      {/* Event Manager Modal */}
      {showEventManager && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EnhancedEventManager
              initialEvent={{
                title: selectedActivity.title,
                description: selectedActivity.description,
                category: 'relationship',
                eventType: selectedActivity.category === 'gratitude' ? 'general' : 
                           selectedActivity.category === 'communication' ? 'check-in' : 'activity',
                // Set default attendees to both parents
                attendees: familyMembers
                  .filter(m => m.role === 'parent')
                  .map(m => ({ id: m.id, name: m.name, role: m.role })),
                duration: 30 // Default 30 minutes
              }}
              onSave={() => {
                setShowEventManager(false);
                setSelectedActivity(null);
              }}
              onCancel={() => {
                setShowEventManager(false);
                setSelectedActivity(null);
              }}
              selectedDate={new Date()}
              isCompact={false}
              mode="create"
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
    charts: true,
    resources: false,
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasError, setHasError] = useState(null);
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);
  const [hasEnoughDataForCharts, setHasEnoughDataForCharts] = useState(false);
  const [cycleHistory, setCycleHistory] = useState([]);

  
  // Refs for scrolling to sections
  const toolsRef = useRef(null);
  const chartsRef = useRef(null);
  const communicationRef = useRef(null);
  
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
  
  // Handle when a user clicks on an AI insight to navigate to the relevant section
  const handleInsightClick = (category) => {
    // Scroll to the appropriate section based on the insight category
    if (category === 'connection' || category === 'communication' || category === 'gratitude') {
      // Expand the communication section if it's collapsed
      setExpandedSections(prev => ({ ...prev, communication: true }));
      // Scroll to the communication section
      communicationRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (category === 'workload' || category === 'division') {
      // Expand the charts section if it's collapsed
      setExpandedSections(prev => ({ ...prev, charts: true }));
      // Scroll to the charts section
      chartsRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Default to tools section for other categories
      setExpandedSections(prev => ({ ...prev, tools: true }));
      // Scroll to the tools section
      toolsRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  const canAccessFeatures = !!selectedUser;

// If no user selected at all, show a more generic message
if (!canAccessFeatures) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Heart size={60} className="mx-auto text-pink-500 mb-4" />
        <h3 className="text-xl font-bold mb-3 font-roboto">Relationship Features</h3>
        <p className="text-gray-600 mb-4 font-roboto">
          These features help you strengthen your relationship and balance family responsibilities.
        </p>
        <button 
          onClick={window.location.reload}
          className="px-4 py-2 bg-black text-white rounded font-roboto inline-flex items-center"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Page
        </button>
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
            <AIRelationshipInsights 
              onActionClick={handleInsightClick} 
            />
          </Suspense>
        </div>
      )}

      {/* Communication & Connection Section */}
      {renderSectionHeader(
        "Communication & Connection", 
        "communication", 
        "Strategies to improve how you communicate and connect",
        "border-pink-500", 
        <MessageCircle size={20} className="mr-2 text-pink-600" />
      )}
      {expandedSections.communication && (
        <div ref={communicationRef}>
          <CommunicationSuggestions />
        </div>
      )}

      {/* Combined History and Charts Section */}
      {renderSectionHeader(
        "Relationship Progress & History", 
        "charts", 
        "Track your relationship progress over time",
        "border-black", 
        <Target size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.charts && (
        <div id="relationship-charts" ref={chartsRef}>
          <CombinedHistoryAndCharts hasEnoughDataForCharts={hasEnoughDataForCharts} />
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
      {
        ...dateNight,
        category: 'relationship',
        eventType: 'date-night'
      }
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
              <h3 className="text-lg font-bold font-roboto">Cycle {selectedHistoryCycle} Details</h3>
              <button
                onClick={() => setSelectedHistoryCycle(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Cycle details would go here */}
              <p className="text-center text-gray-600">Loading cycle details...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTab;