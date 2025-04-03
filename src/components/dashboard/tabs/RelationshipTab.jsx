import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, Clock, 
  MessageCircle, Brain, Info, CheckCircle, Lightbulb, Target,
  AlertCircle, Bell, PhoneOutgoing, Book, Star
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DailyCheckInTool from '../DailyCheckInTool';
import GratitudeTracker from '../GratitudeTracker';
import DateNightPlanner from '../DateNightPlanner';
import SelfCarePlanner from '../SelfCarePlanner';
import CoupleRelationshipChart from '../CoupleRelationshipChart';
import RelationshipProgressChart from '../RelationshipProgressChart';
import AIRelationshipInsights from '../AIRelationshipInsights';
import StrategicActionsTracker from '../StrategicActionsTracker';
import RelationshipHealthQuestionnaire from '../relationship/RelationshipHealthQuestionnaire';
import AllieAIEngineService from '../../../services/AllieAIEngineService';
import { db } from '../../../services/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import CalendarService from '../../../services/CalendarService';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
};

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

  // State variables
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    questionnaire: true,
    tools: true,
    quality: true,
    tracking: true,
    strategies: true,
    resources: true
  });
  
  const [relationshipQuestions, setRelationshipQuestions] = useState([]);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState({
    mama: '',
    papa: ''
  });
  const [notificationTimers, setNotificationTimers] = useState({});
  const [insights, setInsights] = useState([]);
  const [cycleData, setCycleData] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [templateToShow, setTemplateToShow] = useState(null);
  const [hasError, setHasError] = useState(null);

  // Rename context week to cycle for clarity
  const currentCycle = currentWeek;
  
  // Load relationship data
  useEffect(() => {
    const loadRelationshipData = async () => {
      setIsLoadingData(true);
      try {
        if (!familyId) return;
        
        // Load relationship strategies
        const strategies = await getRelationshipStrategies();
        
        // Get cycle check-in data
        const coupleData = getCoupleCheckInData(currentCycle);
        setCycleData(coupleData);
        
        // Load relationship questions
        const questions = getQuestionsByCategory('Relationship Health') || [];
        setRelationshipQuestions(questions);
        
        // Check if couple needs to complete questionnaire
        const needsToComplete = !coupleData || !coupleData.questionnaireCompleted;
        setNeedsQuestionnaire(needsToComplete);
        setQuestionnaireCompleted(!needsToComplete);
        
        // Load previous cycle history
        loadCycleHistory();
        
        // Load AI insights
        try {
          if (AllieAIEngineService) {
            const aiInsights = await AllieAIEngineService.generateRelationshipInsights(
              familyId,
              currentCycle,
              getRelationshipTrendData(),
              strategies || [],
              coupleData || {}
            );
            
            if (aiInsights && aiInsights.length > 0) {
              setInsights(aiInsights);
            }
          }
        } catch (insightError) {
          console.error("Error loading relationship insights:", insightError);
        }
        
        // Load phone numbers for SMS
        loadPhoneNumbers();
        
        setIsLoadingData(false);
      } catch (error) {
        console.error("Error loading relationship data:", error);
        setHasError("There was an error loading your relationship data. Please try refreshing the page.");
        setIsLoadingData(false);
      }
    };
    
    loadRelationshipData();
  }, [familyId, currentCycle, getCoupleCheckInData, getRelationshipStrategies, getRelationshipTrendData, getQuestionsByCategory]);
  
  // Load cycle history
  const loadCycleHistory = useCallback(async () => {
    try {
      if (!familyId) return;
      
      const history = [];
      
      // Look through week history for relationship data
      Object.keys(weekHistory)
        .filter(key => key.startsWith('week') && key !== 'weekStatus')
        .forEach(weekKey => {
          const week = weekHistory[weekKey];
          const weekNum = parseInt(weekKey.replace('week', ''));
          
          if (week && week.coupleCheckIn) {
            history.push({
              cycle: weekNum,
              data: week.coupleCheckIn,
              date: week.completionDate || new Date().toISOString()
            });
          }
        });
      
      // Sort by cycle number
      history.sort((a, b) => b.cycle - a.cycle);
      setCycleHistory(history);
      
    } catch (error) {
      console.error("Error loading cycle history:", error);
    }
  }, [familyId, weekHistory]);
  
  // Load phone numbers for SMS feature
  const loadPhoneNumbers = async () => {
    try {
      if (!familyId) return;
      
      // Try to get parent phone numbers from user profiles
      const mamaParent = familyMembers.find(m => m.roleType === 'Mama');
      const papaParent = familyMembers.find(m => m.roleType === 'Papa');
      
      // Check if phone numbers already exist in context
      const phonesExist = mamaParent?.phoneNumber && papaParent?.phoneNumber;
      
      if (phonesExist) {
        setPhoneNumbers({
          mama: mamaParent.phoneNumber,
          papa: papaParent.phoneNumber
        });
        setSmsEnabled(true);
      } else {
        // Try to get from Firebase
        const docRef = doc(db, "familyProfiles", familyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().phoneNumbers) {
          const phones = docSnap.data().phoneNumbers;
          setPhoneNumbers(phones);
          setSmsEnabled(Object.values(phones).some(p => p));
        }
      }
    } catch (error) {
      console.error("Error loading phone numbers:", error);
    }
  };
  
  // Save phone numbers for SMS
  const savePhoneNumbers = async (phoneData) => {
    try {
      if (!familyId) return;
      
      setPhoneNumbers(phoneData);
      
      // Save to Firebase
      const docRef = doc(db, "familyProfiles", familyId);
      await setDoc(docRef, {
        phoneNumbers: phoneData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSmsEnabled(Object.values(phoneData).some(p => p));
      return true;
    } catch (error) {
      console.error("Error saving phone numbers:", error);
      return false;
    }
  };
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle relationship meeting
  const handleOpenRelationshipMeeting = () => {
    if (onOpenRelationshipMeeting) {
      onOpenRelationshipMeeting();
    }
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
      setNeedsQuestionnaire(false);
      
      // Add to calendar
      addQuestionnaireToCalendar();
      
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
      const values = keys
        .map(key => {
          const matchingQuestion = Object.entries(responses).find(([qId, _]) => qId.includes(key));
          return matchingQuestion ? parseInt(matchingQuestion[1]) : null;
        })
        .filter(val => val !== null);
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        metrics[dimension] = Math.min(5, Math.max(1, average)); // Ensure 1-5 range
      }
    });
    
    // Calculate overall score (1-5 scale)
    const allScores = Object.values(metrics);
    metrics.overall = allScores.length > 0 
      ? allScores.reduce((sum, val) => sum + val, 0) / allScores.length
      : 3; // Default to middle if no data
    
    return metrics;
  };
  
  // Add completed questionnaire to calendar
  const addQuestionnaireToCalendar = async () => {
    try {
      if (!currentUser || !familyId) return;
      
      // Create calendar event
      const event = {
        summary: `Relationship Questionnaire (Cycle ${currentCycle})`,
        description: `Completed the relationship health questionnaire for cycle ${currentCycle}`,
        start: {
          dateTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date().getTime() + 30*60000).toISOString(), // 30 min after
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      // Add to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
    } catch (error) {
      console.error("Error adding questionnaire to calendar:", error);
    }
  };
  
  // Send gratitude via SMS
  const sendGratitudeSms = async (gratitude) => {
    try {
      if (!smsEnabled) return false;
      
      // Get recipient phone number
      const recipientRole = gratitude.toId === familyMembers.find(m => m.roleType === 'Mama')?.id ? 'mama' : 'papa';
      const senderRole = gratitude.fromId === familyMembers.find(m => m.roleType === 'Mama')?.id ? 'mama' : 'papa';
      
      const recipientPhone = phoneNumbers[recipientRole];
      if (!recipientPhone) return false;
      
      // Create message text
      const message = `💌 From ${gratitude.fromName}: ${gratitude.text}`;
      
      // Call serverless function to send SMS
      // This would normally connect to a Firebase function or other backend service
      const response = await fetch('/api/sendSms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: recipientPhone,
          message: message,
          familyId: familyId
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error("Error sending SMS:", error);
      return false;
    }
  };
  
  // Show action template based on insight recommendation
  const showActionTemplate = (templateId) => {
    setTemplateToShow(templateId);
  };
  
  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, borderColor = "border-pink-500", icon = <Heart size={20} className="mr-2" />, notificationCount = 0) => (
    <div className={`border-l-4 ${borderColor} p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2`} 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto">{title}</h4>
        {notificationCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
            {notificationCount}
          </span>
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
  
  // Generate relationship health templates
  const renderTemplate = (templateId) => {
    switch(templateId) {
      case 'daily-checkin':
        return (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-3 font-roboto">5-Minute Check-in Template</h3>
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              A quick daily check-in helps maintain connection amid busy lives. Try this simple format:
            </p>
            <ol className="list-decimal pl-5 space-y-3 mb-4">
              <li className="font-roboto">
                <span className="font-medium">High point</span>: Each share one positive moment from today
              </li>
              <li className="font-roboto">
                <span className="font-medium">Challenge</span>: Each share one difficulty you faced
              </li>
              <li className="font-roboto">
                <span className="font-medium">Support</span>: Ask "How can I support you tomorrow?"
              </li>
              <li className="font-roboto">
                <span className="font-medium">Appreciation</span>: Express gratitude for one thing your partner did
              </li>
              <li className="font-roboto">
                <span className="font-medium">Connection</span>: Share a brief physical connection (hug, kiss, hand hold)
              </li>
            </ol>
            
            <div className="flex justify-between items-center">
              <button 
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-900"
                onClick={() => {
                  setTemplateToShow(null);
                  // Navigate to daily check-in tool
                  const toolsSection = document.getElementById('daily-connection-tools');
                  if (toolsSection) {
                    toolsSection.scrollIntoView({ behavior: 'smooth' });
                    setExpandedSections(prev => ({...prev, tools: true}));
                  }
                }}
              >
                Go to Daily Check-in Tool
              </button>
              
              <button 
                className="px-4 py-2 border border-gray-300 rounded font-roboto"
                onClick={() => setTemplateToShow(null)}
              >
                Close
              </button>
            </div>
          </div>
        );
        
      case 'gratitude-practice':
        return (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-3 font-roboto">Daily Gratitude Practice</h3>
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Research shows that expressing appreciation regularly strengthens relationships and increases happiness.
            </p>
            
            <h4 className="font-medium mb-2 font-roboto">Try these gratitude prompts:</h4>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li className="font-roboto">I appreciate the way you...</li>
              <li className="font-roboto">Thank you for always...</li>
              <li className="font-roboto">I'm grateful that you...</li>
              <li className="font-roboto">It meant a lot when you...</li>
              <li className="font-roboto">I admire how you...</li>
            </ul>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800 font-roboto">
                <strong>Pro tip:</strong> Be specific about what your partner did and how it affected you. 
                For example: "Thank you for making dinner last night when I was exhausted. It made me feel cared for."
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <button 
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-900"
                onClick={() => {
                  setTemplateToShow(null);
                  // Navigate to gratitude tracker
                  const gratitudeSection = document.getElementById('gratitude-tracker');
                  if (gratitudeSection) {
                    gratitudeSection.scrollIntoView({ behavior: 'smooth' });
                    setExpandedSections(prev => ({...prev, tools: true}));
                  }
                }}
              >
                Go to Gratitude Tracker
              </button>
              
              <button 
                className="px-4 py-2 border border-gray-300 rounded font-roboto"
                onClick={() => setTemplateToShow(null)}
              >
                Close
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
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
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
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
        <div className="flex items-start mb-6">
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

        {/* Relationship Meeting Card */}
        <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Users size={20} className="text-pink-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-roboto">Couple Relationship Meeting</h3>
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                Spend 15-20 minutes with your partner discussing your relationship for Cycle {currentCycle}
              </p>
              
              <div className="mt-3">
                <div className="text-sm text-gray-600 flex items-center mb-3">
                  <Clock size={14} className="mr-1 text-gray-500" />
                  <span className="font-roboto">Recommended: 15-20 minutes</span>
                </div>
                
                <button
                  onClick={handleOpenRelationshipMeeting}
                  className="px-4 py-2 rounded-md flex items-center font-roboto bg-pink-100 text-pink-800 hover:bg-pink-200"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Start Relationship Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Questionnaire Section */}
      {renderSectionHeader(
        "Relationship Health Questionnaire", 
        "questionnaire", 
        "border-purple-500", 
        <Book size={20} className="mr-2 text-purple-600" />, 
        needsQuestionnaire ? 1 : 0
      )}
      {expandedSections.questionnaire && (
        <div className="space-y-4">
          {needsQuestionnaire ? (
            <RelationshipHealthQuestionnaire 
              questions={relationshipQuestions}
              onSubmit={handleQuestionnaireSubmit}
              cycle={currentCycle}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center text-green-600 mb-4">
                <CheckCircle className="mr-2" size={24} />
                <h3 className="text-lg font-bold font-roboto">Questionnaire Completed</h3>
              </div>
              <p className="text-gray-600 mb-4 font-roboto">
                You've completed the relationship health questionnaire for Cycle {currentCycle}.
                The results are reflected in your relationship charts below.
              </p>
              
              {cycleData?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 text-center">
                    <div className="text-2xl font-bold text-pink-700">{cycleData.metrics.satisfaction?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-pink-700">Satisfaction</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">{cycleData.metrics.communication?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-blue-700">Communication</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                    <div className="text-2xl font-bold text-purple-700">{cycleData.metrics.connection?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-purple-700">Connection</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                    <div className="text-2xl font-bold text-green-700">{cycleData.metrics.workload?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-green-700">Workload Balance</div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm"
                  onClick={() => setNeedsQuestionnaire(true)}
                >
                  Take Again
                </button>
                
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm flex items-center"
                  onClick={() => {
                    // Scroll to charts
                    const chartsSection = document.getElementById('relationship-charts');
                    if (chartsSection) {
                      chartsSection.scrollIntoView({ behavior: 'smooth' });
                      setExpandedSections(prev => ({...prev, tracking: true}));
                    }
                  }}
                >
                  <Target size={16} className="mr-1" />
                  View Charts
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Insights Section */}
      {renderSectionHeader("AI Relationship Insights", "insights", "border-purple-500", <Brain size={20} className="mr-2 text-purple-600" />)}
      {expandedSections.insights && (
        <div className="space-y-4">
          <AIRelationshipInsights onActionClick={showActionTemplate} />
          
          {/* Template Modal */}
          {templateToShow && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 m-4">
                {renderTemplate(templateToShow)}
              </div>
            </div>
          )}
          
          <div id="relationship-charts">
            <CoupleRelationshipChart />
          </div>
        </div>
      )}

      {/* Daily Connection Tools Section */}
      {renderSectionHeader(
        "Daily Connection Tools", 
        "tools", 
        "border-blue-500", 
        <Clock size={20} className="mr-2 text-blue-600" />
      )}
      {expandedSections.tools && (
        <div id="daily-connection-tools" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DailyCheckInTool />
          
          <div id="gratitude-tracker">
            <GratitudeTracker 
              smsEnabled={smsEnabled} 
              onSendSms={sendGratitudeSms}
              onEnableSms={() => {
                // Show phone number setup modal
                return savePhoneNumbers({
                  mama: phoneNumbers.mama || prompt("Enter Mama's phone number:"),
                  papa: phoneNumbers.papa || prompt("Enter Papa's phone number:")
                });
              }}
            />
          </div>
          
          {/* SMS Setup Section */}
          {!smsEnabled && (
            <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
              <div className="flex items-start">
                <PhoneOutgoing size={24} className="text-blue-600 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium font-roboto">Enable SMS for Gratitude Messages</h4>
                  <p className="text-sm text-gray-600 mt-1 mb-3 font-roboto">
                    Add your phone numbers to send gratitude messages directly to each other's phones.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 font-roboto">Mama's Phone</label>
                      <input
                        type="tel"
                        className="w-full p-2 border rounded font-roboto"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumbers.mama}
                        onChange={(e) => setPhoneNumbers(prev => ({...prev, mama: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 font-roboto">Papa's Phone</label>
                      <input
                        type="tel"
                        className="w-full p-2 border rounded font-roboto"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumbers.papa}
                        onChange={(e) => setPhoneNumbers(prev => ({...prev, papa: e.target.value}))}
                      />
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 bg-black text-white rounded font-roboto"
                    onClick={() => savePhoneNumbers(phoneNumbers)}
                  >
                    Enable SMS
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quality Time Section */}
      {renderSectionHeader(
        "Quality Time Planning", 
        "quality", 
        "border-pink-500", 
        <Calendar size={20} className="mr-2 text-pink-600" />
      )}
      {expandedSections.quality && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateNightPlanner />
          <SelfCarePlanner />
        </div>
      )}

      {/* Progress Tracking Section */}
      {renderSectionHeader(
        "Progress Tracking", 
        "tracking", 
        "border-green-500", 
        <Target size={20} className="mr-2 text-green-600" />
      )}
      {expandedSections.tracking && (
        <div className="space-y-6">
          <RelationshipProgressChart />
        </div>
      )}

      {/* Strategy Section */}
      {renderSectionHeader(
        "Strategic Actions", 
        "strategies", 
        "border-yellow-500", 
        <Lightbulb size={20} className="mr-2 text-yellow-600" />
      )}
      {expandedSections.strategies && (
        <div className="space-y-4">
          <StrategicActionsTracker />
        </div>
      )}

      {/* Research Section */}
      {renderSectionHeader(
        "Relationship Resources", 
        "resources", 
        "border-gray-500", 
        <Info size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.resources && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-medium mb-4 font-roboto">Research-Backed Resources</h4>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Connection Between Balance and Relationship Health
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Studies show that couples who share household and parenting responsibilities more equitably report 37% higher relationship satisfaction and are 45% more likely to describe their relationship as "thriving."
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                How Children Benefit from Strong Parental Relationships
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Children in homes with strong parental bonds show better emotional regulation, higher academic achievement, and fewer behavioral problems regardless of family structure.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Ten Essential Habits of Balanced Families
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Based on a study of over 1,000 families, researchers identified ten key habits that help parents maintain both strong relationships and balanced family workloads.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the guide →</a>
            </div>
            
            {/* Recommended Books */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-roboto flex items-center">
                <Book size={18} className="mr-2" />
                Recommended Books
              </h4>
              
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
          </div>
        </div>
      )}

      {/* Cycle History Section */}
      {cycleHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-medium mb-4 font-roboto flex items-center">
            <Bell size={20} className="mr-2" />
            Relationship Cycle History
          </h4>
          
          <div className="space-y-4">
            {cycleHistory.map((cycle, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h5 className="font-medium mb-2 font-roboto flex items-center">
                  Cycle {cycle.cycle} 
                  <span className="text-sm text-gray-500 ml-2 font-roboto">
                    {formatDate(cycle.date)}
                  </span>
                </h5>
                
                {cycle.data?.metrics && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-pink-700">{cycle.data.metrics.satisfaction?.toFixed(1) || "N/A"}</div>
                      <div className="text-xs text-gray-600">Satisfaction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-700">{cycle.data.metrics.communication?.toFixed(1) || "N/A"}</div>
                      <div className="text-xs text-gray-600">Communication</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-700">{cycle.data.metrics.connection?.toFixed(1) || "N/A"}</div>
                      <div className="text-xs text-gray-600">Connection</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-700">{cycle.data.metrics.workload?.toFixed(1) || "N/A"}</div>
                      <div className="text-xs text-gray-600">Workload</div>
                    </div>
                  </div>
                )}
                
                <button 
                  className="text-sm text-blue-600 hover:underline font-roboto"
                  onClick={() => {
                    // Navigate to the specific cycle tab
                    const cycleTab = document.querySelector(`[data-cycle="${cycle.cycle}"]`);
                    if (cycleTab) {
                      cycleTab.click();
                    }
                  }}
                >
                  View details →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTab;