import React, { useState, useEffect } from 'react';
import { LogOut, Filter, Settings, Users, Heart } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import DashboardTab from './tabs/DashboardTab';
import TasksTab from './tabs/TasksTab';
import WeekHistoryTab from './tabs/WeekHistoryTab';
import HowThisWorksScreen from '../education/HowThisWorksScreen';
import PersonalizedApproachScreen from '../education/PersonalizedApproachScreen';
import InitialSurveyTab from './tabs/InitialSurveyTab';
import UserSettingsScreen from '../user/UserSettingsScreen';
import FamilyMeetingScreen from '../meeting/FamilyMeetingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CoupleRelationshipChart from './CoupleRelationshipChart';
import AllieChat from '../chat/AllieChat';
// At the top of the file, add these imports
import AllieAIEngineService from '../../services/AllieAIEngineService';
import { Brain, Lightbulb } from 'lucide-react';
import StrategicActionsTracker from './StrategicActionsTracker';
import RelationshipMeetingScreen from '../meeting/RelationshipMeetingScreen';
import RelationshipProgressChart from './RelationshipProgressChart';
import DailyCheckInTool from './DailyCheckInTool';
import GratitudeTracker from './GratitudeTracker';
import DateNightPlanner from './DateNightPlanner';
import AIRelationshipInsights from './AIRelationshipInsights';




const DashboardScreen = ({ onOpenFamilyMeeting }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    selectedUser, 
    familyMembers,
    completedWeeks,
    currentWeek,
    familyName,
    familyId,  // Add this line to get familyId from context
    familyPicture  // Added this line to get familyPicture from context

  } = useFamily();
  
  const { loadFamilyData } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showFamilyMeeting, setShowFamilyMeeting] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [insights, setInsights] = useState([]);
  const [showRelationshipMeeting, setShowRelationshipMeeting] = useState(false);


  // Consolidated family loading from all possible sources
  useEffect(() => {
    const loadFamilyFromAllSources = async () => {
      // Don't try loading if we already have data or are already loading
      if (loadingFamily || (selectedUser && familyMembers && familyMembers.length > 0)) {
        console.log("Family already loaded or loading in progress, skipping additional loading attempts");
        return;
      }
      
      setLoadingFamily(true);
      setLoadError(null);
      
      try {
        // Check URL parameters first
        const params = new URLSearchParams(window.location.search);
        const urlFamilyId = params.get('forceFamilyId') || params.get('family');
        
        // Then check router state
        const routerFamilyId = location.state?.directAccess && location.state?.familyId;
        
        // Then check localStorage
        let storageFamilyId;
        try {
          const directAccess = localStorage.getItem('directFamilyAccess');
          if (directAccess) {
            const { familyId, timestamp } = JSON.parse(directAccess);
            // Check if this is recent (within last 30 seconds)
            const now = new Date().getTime();
            if (now - timestamp < 30000) {
              storageFamilyId = familyId;
            } else {
              localStorage.removeItem('directFamilyAccess');
            }
          }
        } catch (e) {
          console.error("Error reading from localStorage:", e);
          localStorage.removeItem('directFamilyAccess');
        }
        
        // Then check regular localStorage
        const regularStorageFamilyId = localStorage.getItem('selectedFamilyId');
        
        // Use the first valid ID we find, in priority order
        const familyIdToLoad = urlFamilyId || routerFamilyId || storageFamilyId || regularStorageFamilyId;
        
        if (familyIdToLoad) {
          console.log("Loading family from detected source:", familyIdToLoad);
          await loadFamilyData(familyIdToLoad);
          console.log("Family loaded successfully");
          
          // Clear storage after successful load
          if (regularStorageFamilyId) {
            localStorage.removeItem('selectedFamilyId');
          }
          if (storageFamilyId) {
            localStorage.removeItem('directFamilyAccess');
          }
        }
      } catch (error) {
        console.error("Error in family loading process:", error);
        setLoadError(error.message || "Failed to load family data");
      } finally {
        setLoadingFamily(false);
      }
    };
    
    loadFamilyFromAllSources();
  }, [selectedUser, familyMembers, location, loadFamilyData,familyId, currentWeek]); // Dependencies cover all possible sources

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Keep all your existing loading code
        
        // Add this section at the end of the try block
        if (familyId && currentWeek) {
          try {
            console.log("Loading AI insights...");
            const aiInsights = await AllieAIEngineService.generateDashboardInsights(
              familyId,
              currentWeek
            );
            setInsights(aiInsights);
            console.log("AI insights loaded:", aiInsights);
          } catch (insightError) {
            console.error("Error loading AI insights:", insightError);
            // Failure to load insights shouldn't block the whole dashboard
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    
    loadDashboardData();
  }, [familyId, currentWeek, /* keep any existing dependencies */]);
  
  // Redirect if no user is selected after loading attempt completes
  useEffect(() => {
    if (!selectedUser && !loadingFamily) {
      navigate('/');
    }
  }, [selectedUser, navigate, loadingFamily]);
  
  // Check if all family members have completed the survey
  const allSurveysCompleted = familyMembers.every(member => member.completed);
  
  // Handle logout/switch user
  const handleLogout = () => {
    navigate('/login');
  };
  
  const handleOpenRelationshipMeeting = () => {
    setShowRelationshipMeeting(true);
  };
  
  const handleCloseRelationshipMeeting = () => {
    setShowRelationshipMeeting(false);
  };


  // Start weekly check-in
  const handleStartWeeklyCheckIn = () => {
    navigate('/weekly-check-in');
  };

  // Handle settings toggle
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Handle Family Meeting open/close
  const handleOpenFamilyMeeting = () => {
    console.log("Opening family meeting dialog");
    setShowFamilyMeeting(true);
  };
  
  const handleCloseFamilyMeeting = () => {
    console.log("Closing family meeting dialog");
    setShowFamilyMeeting(false);
  };
  
  // If still loading, show a loading indicator
  if (loadingFamily) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-roboto">Loading your family data...</p>
          <p className="text-sm text-gray-500 font-roboto mt-2">This will just take a moment</p>
        </div>
      </div>
    );
  }
  
  // If we have a load error, show error screen
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 font-roboto">Error Loading Family</h2>
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
            {loadError}
          </div>
          <p className="mb-4 font-roboto">Please try the following:</p>
          <ul className="list-disc pl-5 mb-6 space-y-2 font-roboto">
            <li>Check your internet connection</li>
            <li>Refresh the page</li>
            <li>Log in again</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto"
            >
              Refresh Page
            </button>
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 border border-black text-black rounded hover:bg-gray-50 font-roboto"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Generate tab content based on active tab
  const renderTabContent = () => {
    // If not all surveys are completed, show waiting screen
    if (!allSurveysCompleted) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-6">
            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-amber-100 text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Waiting for All Survey Responses</h3>
            <p className="text-gray-600 mb-4 font-roboto">
              All family members need to complete the initial survey before we can generate accurate reports.
            </p>
              
            <div className="mb-6">
              <h4 className="font-medium mb-2 font-roboto">Family Progress</h4>
              <div className="flex flex-wrap justify-center gap-3 max-w-sm mx-auto">
                {familyMembers.map(member => (
                  <div key={member.id} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden mb-1 border-2 border-gray-200">
                      <img 
                        src={member.profilePicture} 
                        alt={member.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-roboto">{member.name}</span>
                    <span className={`text-xs ${member.completed ? 'text-green-500' : 'text-amber-500'} font-roboto`}>
                      {member.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
              
            <div className="flex space-x-3">
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleLogout}
              >
                Switch User
              </button>
              {!selectedUser.completed && (
                <button
                  className="px-4 py-2 bg-black text-white rounded font-roboto"
                  onClick={() => navigate('/survey')}
                >
                  Start Initial Survey
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Render appropriate tab content
    switch (activeTab) {
      case 'how-it-works':
        return <HowThisWorksScreen />;
      case 'personalized':
        return <PersonalizedApproachScreen />;
        case 'relationship':
  return (
    <div className="space-y-6">
      <AIRelationshipInsights />
      <CoupleRelationshipChart />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailyCheckInTool />
        <GratitudeTracker />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DateNightPlanner />
        <RelationshipProgressChart />
      </div>
      <StrategicActionsTracker />
    </div>
  );
      case 'dashboard':
        return <DashboardTab />;
      case 'tasks':
        return <TasksTab 
          onStartWeeklyCheckIn={handleStartWeeklyCheckIn} 
          onOpenFamilyMeeting={handleOpenFamilyMeeting} 
        />;
      case 'initial-survey':
        return <InitialSurveyTab />;
      default:
        // Handle week history tabs
        if (activeTab.startsWith('week-')) {
          const weekNumber = parseInt(activeTab.split('-')[1]);
          return <WeekHistoryTab weekNumber={weekNumber} />;
        }
        return <div>Select a tab</div>;
    }
  };
  
  // Generate dynamic tabs for completed weeks
  const weekTabs = completedWeeks.map(week => ({
    id: `week-${week}`,
    name: `Week ${week}`
  }));
  
  // If no user is selected, return loading
  if (!selectedUser) {
    return <div className="flex items-center justify-center h-screen font-roboto">Loading...</div>;
  }

  // Format family name for display
  const displayFamilyName = familyName || "Family";
  const formattedFamilyName = `${displayFamilyName} Family AI Balancer`;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4">
  <div className="container mx-auto flex justify-between items-center">
    <div className="flex items-center">
      {/* Family photo */}
      <div className="mr-4 hidden md:block">
        <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <img 
            src={familyPicture || '/api/placeholder/150/150'}
            alt={`${familyName || 'Family'} Photo`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl font-bold font-roboto">Allie</h1>
        <p className="text-sm font-roboto">Balance family responsibilities together</p>
        <p className="text-xs text-gray-300 font-roboto">The {familyName ? familyName.split(' ')[0] : ''} Family</p>
      </div>
    </div>
    <div className="flex items-center">
      <div 
        className="w-8 h-8 rounded-full overflow-hidden mr-2 cursor-pointer border-2 border-white"
        onClick={toggleSettings}
      >
        <img 
          src={selectedUser.profilePicture}
          alt={selectedUser.name}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="mr-3 font-roboto">{selectedUser.name}</span>
      <button 
        onClick={handleLogout}
        className="flex items-center text-sm bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded font-roboto"
      >
        <LogOut size={14} className="mr-1" />
        Switch User
      </button>
    </div>
  </div>
</div>
      
      {/* Main content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto sticky top-0 bg-gray-50 z-10 px-4" style={{ marginBottom: "1.5rem" }}>
  <button 
    className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
    onClick={() => setActiveTab('tasks')}
  >
    {selectedUser ? `${selectedUser.name}'s Tasks` : 'My Tasks'}
  </button>
  <button 
    className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
    onClick={() => setActiveTab('dashboard')}
  >
    Family Dashboard
  </button>
  
  {/* Relationship Tab */}
  {selectedUser && selectedUser.role === 'parent' && (
    <button 
      className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'relationship' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
      onClick={() => setActiveTab('relationship')}
    >
      Relationship
    </button>
  )}
  
  <div className="mt-6">
  <button 
    className="px-4 py-2 bg-pink-100 text-pink-800 rounded-md flex items-center hover:bg-pink-200 font-roboto"
    onClick={handleOpenRelationshipMeeting}
  >
    <Heart size={16} className="mr-2" />
    Start Relationship Meeting
  </button>
</div>

  <button 
    className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'initial-survey' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
    onClick={() => setActiveTab('initial-survey')}
  >
    Initial Survey
  </button>
  
  {/* Add completed weeks as tabs */}
  {weekTabs.map(tab => (
    <button 
      key={tab.id}
      className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.name.replace('Week', 'Cycle')}
      <span className="text-xs block text-gray-500 font-roboto">Flexible timeframe</span>
    </button>
  ))}
</div>
          
        {/* Tab content */}
        {renderTabContent()}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <UserSettingsScreen onClose={toggleSettings} />
      )}

      {/* Family Meeting Modal */}
      {showFamilyMeeting && (
        <FamilyMeetingScreen onClose={handleCloseFamilyMeeting} />
      )}

      {/* Relationship Meeting Modal */}
{showRelationshipMeeting && (
  <RelationshipMeetingScreen onClose={handleCloseRelationshipMeeting} />
)}
      
      {/* Allie Chat Widget */}
      <AllieChat />
    </div>
  );
};

export default DashboardScreen;