import React, { useState, useEffect } from 'react';
import { LogOut, Filter, Settings, Users, Heart, Info, Calendar, Bell } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import DashboardTab from './tabs/DashboardTab';
import TasksTab from './tabs/TasksTab';
import WeekHistoryTab from './tabs/WeekHistoryTab';
import RelationshipTab from './tabs/RelationshipTab';
import HowThisWorksScreen from '../education/HowThisWorksScreen';
import PersonalizedApproachScreen from '../education/PersonalizedApproachScreen';
import InitialSurveyTab from './tabs/InitialSurveyTab';
import UserSettingsScreen from '../user/UserSettingsScreen';
import FamilyMeetingScreen from '../meeting/FamilyMeetingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import AllieChat from '../chat/AllieChat';
import RelationshipMeetingScreen from '../meeting/RelationshipMeetingScreen';
import FloatingCalendarWidget from '../calendar/FloatingCalendarWidget';
import DashboardTutorial from '../onboarding/DashboardTutorial';
import ErrorBoundary from '../common/ErrorBoundary';
import ChildrenTrackingTab from './tabs/ChildrenTrackingTab';
import SurveyScreen from '../survey/SurveyScreen';


const DashboardScreen = ({ onOpenFamilyMeeting }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    selectedUser, 
    familyMembers,
    completedWeeks,
    currentWeek,
    familyName,
    familyId,
    familyPicture,
    taskRecommendations
  } = useFamily();
  
  const { loadFamilyData, currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('tasks');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeComponent, setActiveComponent] = useState(null);
  const [showFamilyMeeting, setShowFamilyMeeting] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [insights, setInsights] = useState([]);
  const [showRelationshipMeeting, setShowRelationshipMeeting] = useState(false);
  const [notifications, setNotifications] = useState({
    tasks: 0,
    relationships: 0,
    dashboard: 0
  });

  const [allieAIService, setAllieAIService] = useState(null);

  // Calculate notifications
  useEffect(() => {
    // Count incomplete tasks for task tab notification
    const incompleteTasks = taskRecommendations ? 
      taskRecommendations.filter(t => !t.completed && canCompleteTask(t)).length : 0;
    
    // Simple placeholder for relationship notifications (replace with real logic)
    const relationshipNotifs = selectedUser?.role === 'parent' ? 2 : 0;
    
    setNotifications({
      tasks: incompleteTasks,
      relationships: relationshipNotifs, 
      dashboard: 0  // Add dashboard notifications if needed
    });
  }, [taskRecommendations, selectedUser]);

  // Check if user can complete a task (helper for notifications)
  const canCompleteTask = (task) => {
    return selectedUser && 
           selectedUser.role === 'parent' && 
           (selectedUser.name === task.assignedToName || 
            selectedUser.roleType === task.assignedTo);
  };

  // Check if we should show the tutorial
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('dashboardTutorialCompleted');
    const isFirstDashboardVisit = !tutorialCompleted;
    
    if (isFirstDashboardVisit) {
      // We'll show the tutorial after a small delay to ensure dashboard is fully loaded
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

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
  }, [selectedUser, familyMembers, location, loadFamilyData, familyId, currentWeek]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // If we need to load family data, do it here
        if (familyId) {
          console.log(`Loading dashboard data for family: ${familyId}`);
          
          // Any other data loading you need to do...
          
          // Load AI insights if service is available
          if (currentWeek && allieAIService) {
            try {
              console.log("Loading AI insights...");
              const aiInsights = await allieAIService.generateDashboardInsights(
                familyId,
                currentWeek
              );
              setInsights(aiInsights);
              console.log("AI insights loaded:", aiInsights);
            } catch (insightError) {
              console.error("Error loading AI insights:", insightError);
              // Failure to load insights shouldn't block the whole dashboard
            }
          } else {
            console.log("Skipping AI insights - service not loaded yet or missing data");
          }
        } else {
          console.warn("No family ID available, can't load dashboard data");
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    
    loadDashboardData();
  }, [familyId, currentWeek]);

  // Load AllieAIService
  useEffect(() => {
    // Dynamically import the service to avoid circular dependencies
    import('../../services/AllieAIService').then(module => {
      setAllieAIService(module.default);
      console.log("AllieAIService loaded successfully");
      
      // If family data is available, try to load AI insights right away
      if (familyId && currentWeek && module.default) {
        module.default.generateDashboardInsights(familyId, currentWeek)
          .then(aiInsights => {
            if (aiInsights && aiInsights.length > 0) {
              setInsights(aiInsights);
              console.log("AI insights loaded:", aiInsights);
            }
          })
          .catch(err => console.error("Error loading initial AI insights:", err));
      }
    }).catch(error => {
      console.error("Failed to load AI  service:", error);
    });
  }, [familyId, currentWeek]);
  
  // Redirect if no user is selected after loading attempt completes
  // Redirect if no user is selected or initial survey incomplete
  useEffect(() => {
    if (!selectedUser && !loadingFamily) {
      navigate('/');
      return;
    }
    
    // If user exists but hasn't completed initial survey, redirect to survey
    if (selectedUser && !loadingFamily && !selectedUser.completed) {
      console.log("User hasn't completed initial survey, redirecting to survey");
      navigate('/survey');
    }
  }, [selectedUser, navigate, loadingFamily]);
  
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
    switch (activeTab) {
      case 'how-it-works':
        return <HowThisWorksScreen />;
      case 'personalized':
        return <PersonalizedApproachScreen />;
      case 'relationship':
        return <RelationshipTab onOpenRelationshipMeeting={handleOpenRelationshipMeeting} />;
      case 'dashboard':
        return <DashboardTab />;
      case 'tasks':
        return <TasksTab 
          onStartWeeklyCheckIn={handleStartWeeklyCheckIn} 
          onOpenFamilyMeeting={handleOpenFamilyMeeting} 
        />;
      case 'children':
        return <ChildrenTrackingTab />;
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
  
  // Calculate heights for fixed elements
  const headerHeight = "84px"; // 4rem or 64px is a common header height
  const navHeight = "56px";    // Typical height for navigation tabs
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-black text-white p-4 shadow-md" style={{ height: headerHeight }}>
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
      
      {/* Navigation Tabs */}
      <div 
        className="fixed left-0 right-0 z-10 bg-gray-50 border-b shadow-sm" 
        style={{ top: headerHeight, height: navHeight }}
      >
        <div className="container mx-auto flex overflow-x-auto px-4 py-2">
          <button 
            id="tasks-tab"
            className={`px-4 py-2 font-medium whitespace-nowrap font-roboto relative ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('tasks')}
          >
            {selectedUser ? `${selectedUser.name}'s Tasks` : 'My Tasks'}
            {notifications.tasks > 0 && (
              <span className="absolute top-1 right-0 transform translate-x-1/2 -translate-y-1/4 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {notifications.tasks}
              </span>
            )}
          </button>
          <button 
            id="dashboard-tab"
            className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Family Dashboard
          </button>
          
          {/* Relationship Tab */}
          {selectedUser && (
            <button 
              id="relationship-tab"
              className={`px-4 py-2 font-medium whitespace-nowrap font-roboto relative ${activeTab === 'relationship' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('relationship')}
            >
              Relationship
              {notifications.relationships > 0 && selectedUser.role === 'parent' && (
                <span className="absolute top-1 right-1 transform translate-x-1/2 -translate-y-1/4 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {notifications.relationships}
                </span>
              )}
            </button>
          )}
          
          {/* Children Tracking Tab */}
          <button 
            id="children-tab"
            className={`px-4 py-2 font-medium whitespace-nowrap font-roboto ${activeTab === 'children' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('children')}
          >
            Children Tracking
          </button>
          
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
      </div>
      
      {/* Main Content */}
      <div 
        className="container mx-auto px-4 pb-6" 
        style={{ paddingTop: `calc(${headerHeight} + ${navHeight} + 1rem)` }}
      >
        <ErrorBoundary>
          {/* Tab content */}
          {renderTabContent()}
        </ErrorBoundary>
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
      <div id="chat-button">
        <AllieChat />
      </div>
      
      {/* Floating Calendar Widget */}
      <FloatingCalendarWidget />

      {/* Tutorial */}
      {showTutorial && (
        <DashboardTutorial 
          onComplete={() => setShowTutorial(false)} 
        />
      )}
    </div>
  );
};

export default DashboardScreen;