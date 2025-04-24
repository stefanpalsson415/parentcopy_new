// src/components/dashboard/tabs/ChildrenTrackingTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar, AlertCircle, 
  Activity, Users, Search, X, RefreshCw, 
  User, PlusCircle, Mic, CheckCircle, Info
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEvents } from '../../../contexts/EventContext';
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AllieAIService from '../../../services/AllieAIService';
import UserAvatar from '../../common/UserAvatar';
import EnhancedEventManager from '../../calendar/EnhancedEventManager';
import DocumentLibrary from '../../document/DocumentLibrary';
import ProviderDirectory from '../../document/ProviderDirectory';
import FamilyKanbanBoard from '../../kanban/FamilyKanbanBoard';
import ChildDashboard from '../ChildDashboard';

const ChildrenTrackingTab = () => {
  // Context hooks
  const { 
    selectedUser, 
    familyMembers,
    familyId,
    currentWeek
  } = useFamily();

  const { currentUser } = useAuth();

  // Local state
  const [childrenData, setChildrenData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [tabError, setTabError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allieMessage, setAllieMessage] = useState(null);
  const [newVoiceEntry, setNewVoiceEntry] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    taskBoard: true
  });

  // Healthcare provider management 
  const [healthcareProviders, setHealthcareProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [activeComponent, setActiveComponent] = useState(null);
  
  // Refs
  const searchInputRef = useRef(null);
  const microphoneRef = useRef(null);
  const fileInputRef = useRef(null);

  // Use events hook
  const { events, loading: eventsLoading } = useEvents();

  // Helper function to get child name
  const getChildName = useCallback((childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : 'Unknown Child';
  }, [familyMembers]);

  // Add a useEffect for a safety timer to ensure component always renders
  useEffect(() => {
    // Safety timer to prevent infinite loading state
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.log("Safety timeout triggered - forcing render");
        setLoading(false);
        setTabError("Loading timeout occurred. Some data may be unavailable.");
        
        // Ensure we have some basic fallback data
        if (Object.keys(childrenData).length === 0) {
          const fallbackData = {};
          
          // Create empty structures for each child
          familyMembers
            .filter(member => member.role === 'child')
            .forEach(child => {
              fallbackData[child.id] = {
                medicalAppointments: [],
                growthData: [],
                routines: [],
                clothesHandMeDowns: []
              };
            });
          
          setChildrenData(fallbackData);
        }
        
        // Ensure we always have some insights
        if (!aiInsights || aiInsights.length === 0) {
          setAiInsights([{
            title: "Getting Started",
            type: "recommendation",
            content: "Start tracking your children's health, growth, and routines to get personalized insights.",
            priority: "medium",
            childId: null
          }]);
        }
      }
    }, 15000); // 15 second safety timeout
    
    return () => clearTimeout(safetyTimer);
  }, [loading, childrenData, aiInsights, familyMembers]);

  // Effect to load children's data
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    const loadChildrenData = async () => {
      try {
        if (!familyId) return;
        
        setLoading(true);
        console.log("Loading children data...");
        
        // Add a timeout to prevent UI freeze if Firebase is slow
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Loading children data timed out")), 10000)
        );
        
        // Create the main data loading function
        const dataLoadingPromise = async () => {
          const docRef = doc(db, "families", familyId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const familyData = docSnap.data();
            
            // Check if we have children data structure, if not create it
            if (!familyData.childrenData) {
              console.log("No children data found, initializing structure");
              // Initialize empty children data structure
              const initialChildrenData = {};
              
              // Create entry for each child in the family
              familyMembers
                .filter(member => member.role === 'child')
                .forEach(child => {
                  initialChildrenData[child.id] = {
                    medicalAppointments: [],
                    growthData: [],
                    routines: [],
                    clothesHandMeDowns: []
                  };
                });
              
              return initialChildrenData;
            } else {
              console.log("Found existing children data");
              return familyData.childrenData;
            }
          } else {
            console.warn("Family document not found");
            return {};
          }
        };
        
        // Race the data loading against the timeout
        let childrenDataResult;
        try {
          childrenDataResult = await Promise.race([dataLoadingPromise(), timeoutPromise]);
        } catch (timeoutError) {
          console.warn("Children data loading timed out, showing empty state");
          childrenDataResult = {}; // Empty state if timeout
          if (isMounted) {
            setTabError("Loading took too long. Some data may be unavailable.");
          }
        }
        
        // Set the children data if component is still mounted
        if (isMounted) {
          setChildrenData(childrenDataResult);
          
          // Set active child to the first child if none is selected
          if (!activeChild && familyMembers.filter(m => m.role === 'child').length > 0) {
            setActiveChild(familyMembers.filter(m => m.role === 'child')[0].id);
          }
          
          // Set loading to false before AI generation
          setLoading(false);
        }
        
        // Generate local insights
        if (isMounted && Object.keys(childrenDataResult).length > 0) {
          try {
            const localInsights = generateLocalInsights(childrenDataResult);
            if (localInsights && localInsights.length > 0) {
              setAiInsights(localInsights);
            }
          } catch (insightError) {
            console.error("Failed to generate insights:", insightError);
          }
        }
      } catch (error) {
        console.error("Error loading children data:", error);
        if (isMounted) {
          setLoading(false);
          setTabError("There was an error loading children data. Please try refreshing the page.");
          setChildrenData({});
          setAiInsights([{
            title: "Getting Started",
            type: "recommendation",
            content: "Start tracking your children's health, growth, and routines to get personalized insights.",
            priority: "medium",
            childId: null
          }]);
        }
      }
    };
    
    loadChildrenData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [familyId, familyMembers, activeChild]);
  
  // Restore selected user from localStorage if available
  useEffect(() => {
    if (familyMembers.length > 0 && !activeChild) {
      const children = familyMembers.filter(member => member.role === 'child');
      if (children.length > 0) {
        const storedChildId = localStorage.getItem('selectedChildId');
        if (storedChildId) {
          const childFromStorage = children.find(child => child.id === storedChildId);
          if (childFromStorage) {
            console.log("Restoring selected child from localStorage:", childFromStorage.name);
            setActiveChild(childFromStorage.id);
          } else {
            // If stored child not found, select the first child
            setActiveChild(children[0].id);
          }
        } else {
          // If no stored selection, select the first child
          setActiveChild(children[0].id);
        }
      }
    }
  }, [familyMembers, activeChild]);

  // Save active child to localStorage when changed
  useEffect(() => {
    if (activeChild) {
      localStorage.setItem('selectedChildId', activeChild);
    }
  }, [activeChild]);

  // Generate local insights function
  const generateLocalInsights = useCallback((data) => {
    try {
      // For a simplified version, create some dynamic insights based on the data
      const insights = [];
      
      // Safely process data for each child
      if (!data || typeof data !== 'object') {
        console.warn("Invalid data provided to generateLocalInsights", data);
        return getDefaultInsights();
      }
      
      // Process children data
      Object.keys(data).forEach(childId => {
        try {
          const childData = data[childId];
          if (!childData) return;
          
          const childName = getChildName(childId) || "Your child";
          
          // Medical appointment insights
          if (childData.medicalAppointments && Array.isArray(childData.medicalAppointments)) {
            // Check for upcoming appointments
            const upcomingAppointments = childData.medicalAppointments.filter(apt => 
              apt && !apt.completed && apt.date && new Date(apt.date) > new Date()
            );
            
            if (upcomingAppointments.length > 0) {
              const nextAppointment = upcomingAppointments.sort((a, b) => 
                new Date(a.date) - new Date(b.date)
              )[0];
              
              insights.push({
                type: "medical",
                title: "Upcoming Medical Appointment",
                content: `${childName} has a ${nextAppointment.title || 'medical'} appointment on ${formatDate(nextAppointment.date)}${nextAppointment.time ? ` at ${nextAppointment.time}` : ''}.`,
                priority: "medium",
                childId: childId
              });
            } else {
              // No upcoming appointments
              insights.push({
                type: "recommendation",
                title: "Schedule a Check-up",
                content: `${childName} doesn't have any upcoming medical appointments scheduled. Consider scheduling a routine check-up.`,
                priority: "medium",
                childId: childId
              });
            }
          }
          
          // Growth data insights
          if (childData.growthData && Array.isArray(childData.growthData) && childData.growthData.length > 0) {
            // Check if growth data is recent
            const latestGrowthEntry = childData.growthData.sort((a, b) => 
              new Date(b.date || 0) - new Date(a.date || 0)
            )[0];
            
            if (latestGrowthEntry && latestGrowthEntry.date) {
              const threeMothsAgo = new Date();
              threeMothsAgo.setMonth(threeMothsAgo.getMonth() - 3);
              
              if (new Date(latestGrowthEntry.date) < threeMothsAgo) {
                insights.push({
                  type: "growth",
                  title: "Growth Update Reminder",
                  content: `${childName}'s growth measurements were last updated on ${formatDate(latestGrowthEntry.date)}. Consider updating their height and weight.`,
                  priority: "low",
                  childId: childId
                });
              }
            }
          } else {
            // No growth data recorded
            insights.push({
              type: "recommendation",
              title: "Missing Growth Data",
              content: `You haven't recorded any growth data for ${childName} yet. Tracking height, weight, and sizes helps monitor their development.`,
              priority: "medium",
              childId: childId
            });
          }
        } catch (childError) {
          console.warn(`Error generating insights for child ${childId}:`, childError);
        }
      });
      
      // If we have no insights, add default ones
      if (insights.length === 0) {
        return getDefaultInsights();
      }
      
      // Sort insights by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      insights.sort((a, b) => {
        return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
      });
      
      return insights;
    } catch (error) {
      console.error("Error in generateLocalInsights:", error);
      return getDefaultInsights();
    }
  }, [getChildName]);

  // Helper function for default insights
  const getDefaultInsights = () => {
    return [
      {
        type: "recommendation",
        title: "Getting Started",
        content: "Start tracking your children's health, growth, and routines to get personalized insights.",
        priority: "medium",
        childId: null
      },
      {
        type: "recommendation",
        title: "Regular Health Check-ups",
        content: "Regular medical check-ups are important for monitoring your family's health. Schedule appointments for anyone who hasn't had a check-up in the past year.",
        priority: "high",
        childId: null
      },
      {
        type: "recommendation",
        title: "Growth Tracking",
        content: "Tracking your children's growth helps identify potential health concerns early. Try measuring height and weight quarterly.",
        priority: "medium",
        childId: null
      }
    ];
  };

  // Format date helper
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  }, []);

  const openModal = (modalType, data) => {
    setActiveComponent({
      type: 'eventManager',
      props: {
        initialEvent: {
          title: modalType === 'growth' ? 'Growth Measurement' : '',
          description: '',
          childId: data.childId,
          childName: getChildName(data.childId),
          category: modalType === 'appointment' ? 'medical' : 
                   modalType === 'routine' ? 'activity' : 
                   modalType === 'growth' ? 'growth' : 'general',
          ...data
        },
        eventType: modalType,
        onSave: (result) => {
          if (result.success) {
            setAllieMessage({
              type: 'success',
              text: `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} saved successfully!`
            });
          }
          setActiveComponent(null);
        },
        onCancel: () => setActiveComponent(null)
      }
    });
  };

  // Handle voice input
  const handleVoiceInput = () => {
    setNewVoiceEntry(true);
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setAllieMessage({
        type: 'error',
        text: 'Speech recognition is not supported in your browser. Try using Chrome.'
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordingText('Listening...');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setRecordingText(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      setRecordingText('');
      setAllieMessage({
        type: 'error',
        text: `Error recording: ${event.error}`
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      // Process the recorded text
      if (recordingText && recordingText !== 'Listening...') {
        const lowerRecordingText = recordingText.toLowerCase();
        
        // Check if it's a task-related command
        if (lowerRecordingText.includes('task') || 
            lowerRecordingText.includes('todo') || 
            lowerRecordingText.includes('remind me') || 
            lowerRecordingText.includes('add to list')) {
          handleVoiceTask(recordingText);
        } else {
          processVoiceCommand(recordingText);
        }
      }
    };

    recognition.start();
  };

  // Process voice commands
  const processVoiceCommand = (text) => {
    // Create a friendly confirmation and show it in the UI
    setAllieMessage({
      type: 'success',
      text: `I heard: "${text}". Processing your request...`
    });

    // For demo purposes, show a mock response after a delay
    setTimeout(() => {
      const lowerText = text.toLowerCase();
      
      // Example patterns to detect
      if (lowerText.includes('appointment') || lowerText.includes('doctor')) {
        handleVoiceAppointment(text);
      } 
      else if (lowerText.includes('growth') || lowerText.includes('weight') || lowerText.includes('height')) {
        handleVoiceGrowthEntry(text);
      }
      else if (lowerText.includes('routine') || lowerText.includes('schedule')) {
        handleVoiceRoutine(text);
      }
      else {
        // Default response if we can't categorize
        setAllieMessage({
          type: 'info',
          text: "I'm not sure how to process that request yet. Try saying something like 'Add a doctor's appointment' or 'Record Emma's height measurement'."
        });
      }
    }, 1500);
  };

  // Handle voice task
  const handleVoiceTask = async (text) => {
    try {
      setAllieMessage({
        type: 'info',
        text: `Processing task: "${text}"`
      });
      
      // Use the AllieAIService to process the task
      const result = await AllieAIService.processTaskFromChat(
        text,
        familyId,
        currentUser?.uid
      );
      
      if (result.success) {
        setAllieMessage({
          type: 'success',
          text: `Added "${result.task.title}" to your tasks${result.task.assignedToName ? ` and assigned it to ${result.task.assignedToName}` : ''}.`
        });
        
        // Expand the task board section to show the new task
        setExpandedSections(prev => ({...prev, taskBoard: true}));
      } else {
        setAllieMessage({
          type: 'error',
          text: `Sorry, I couldn't add that task: ${result.error}`
        });
      }
    } catch (error) {
      console.error("Error handling voice task:", error);
      setAllieMessage({
        type: 'error',
        text: 'Sorry, there was an error processing your task. Please try again.'
      });
    }
  };

  // Handle voice appointment commands
  const handleVoiceAppointment = (text) => {
    // Extract potential child name
    const childMatches = familyMembers
      .filter(m => m.role === 'child')
      .filter(child => text.toLowerCase().includes(child.name.toLowerCase()));
    
    const childId = childMatches.length > 0 ? childMatches[0].id : activeChild;
    
    if (!childId) {
      setAllieMessage({
        type: 'warning',
        text: "I didn't catch which child this appointment is for. Please try again or select a child first."
      });
      return;
    }

    // Mock data extraction - in a real implementation, this would use NLP
    let appointmentType = 'checkup';
    if (text.toLowerCase().includes('dentist')) appointmentType = 'dentist';
    else if (text.toLowerCase().includes('eye') || text.toLowerCase().includes('vision')) appointmentType = 'eye exam';
    
    // Create a date - either extract from text or use a default near future date
    const date = new Date();
    date.setDate(date.getDate() + 14); // Two weeks from now
    
    const initialEvent = {
      title: `${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)}`,
      description: `Voice entry: "${text}"`,
      location: '',
      childId: childId,
      childName: getChildName(childId),
      dateTime: date.toISOString(),
      category: 'medical',
      eventType: 'appointment'
    };
    
    setActiveComponent({
      type: 'eventManager',
      props: {
        initialEvent,
        eventType: 'appointment',
        onSave: (result) => {
          if (result.success) {
            setAllieMessage({
              type: 'success',
              text: 'Appointment added successfully!'
            });
          }
          setActiveComponent(null);
        },
        onCancel: () => {
          setActiveComponent(null);
          setAllieMessage({
            type: 'info',
            text: 'Appointment creation cancelled.'
          });
        }
      }
    });
  };

  // Handle voice growth entry
  const handleVoiceGrowthEntry = (text) => {
    // Similar pattern to appointment handling
    const childMatches = familyMembers
      .filter(m => m.role === 'child')
      .filter(child => text.toLowerCase().includes(child.name.toLowerCase()));
    
    const childId = childMatches.length > 0 ? childMatches[0].id : activeChild;
    
    if (!childId) {
      setAllieMessage({
        type: 'warning',
        text: "I didn't catch which child this measurement is for. Please try again or select a child first."
      });
      return;
    }

    // Simple extraction for demo
    let height = '';
    let weight = '';
    
    const heightMatch = text.match(/(\d+(\.\d+)?)\s*(cm|in|inches|feet|ft)/i);
    if (heightMatch) height = heightMatch[0];
    
    const weightMatch = text.match(/(\d+(\.\d+)?)\s*(kg|kilos|lb|pounds)/i);
    if (weightMatch) weight = weightMatch[0];
    
    const initialEvent = {
      title: `Growth Measurement`,
      description: `Voice entry: "${text}"`,
      childId: childId,
      childName: getChildName(childId),
      dateTime: new Date().toISOString(),
      category: 'growth',
      eventType: 'growth',
      height: height,
      weight: weight,
      shoeSize: '',
      clothingSize: ''
    };
    
    setActiveComponent({
      type: 'eventManager',
      props: {
        initialEvent,
        eventType: 'growth',
        onSave: (result) => {
          if (result.success) {
            setAllieMessage({
              type: 'success',
              text: 'Growth measurement added successfully!'
            });
          }
          setActiveComponent(null);
        },
        onCancel: () => {
          setActiveComponent(null);
          setAllieMessage({
            type: 'info',
            text: 'Measurement creation cancelled.'
          });
        }
      }
    });
  };

  // Handle voice routine commands
  const handleVoiceRoutine = (text) => {
    // Extract child
    const childMatches = familyMembers
      .filter(m => m.role === 'child')
      .filter(child => text.toLowerCase().includes(child.name.toLowerCase()));
    
    const childId = childMatches.length > 0 ? childMatches[0].id : activeChild;
    
    if (!childId) {
      setAllieMessage({
        type: 'warning',
        text: "I didn't catch which child this routine is for. Please try again or select a child first."
      });
      return;
    }

    // Simple extraction for routine type
    let routineTitle = 'Daily Routine';
    if (text.toLowerCase().includes('morning')) routineTitle = 'Morning Routine';
    else if (text.toLowerCase().includes('bedtime') || text.toLowerCase().includes('night')) routineTitle = 'Bedtime Routine';
    else if (text.toLowerCase().includes('school')) routineTitle = 'School Routine';
    
    const initialEvent = {
      title: routineTitle,
      description: `Voice entry: "${text}"`,
      childId: childId,
      childName: getChildName(childId),
      dateTime: new Date().toISOString(),
      category: 'activity',
      eventType: 'activity',
      isRecurring: true,
      recurrence: {
        frequency: 'weekly',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        endDate: ''
      },
      startTime: '08:00',
      endTime: ''
    };
    
    setActiveComponent({
      type: 'eventManager',
      props: {
        initialEvent,
        eventType: 'routine',
        onSave: (result) => {
          if (result.success) {
            setAllieMessage({
              type: 'success',
              text: 'Routine added successfully!'
            });
          }
          setActiveComponent(null);
        },
        onCancel: () => {
          setActiveComponent(null);
          setAllieMessage({
            type: 'info',
            text: 'Routine creation cancelled.'
          });
        }
      }
    });
  };

  // Open documents library
  const handleOpenDocuments = (childId) => {
    setActiveComponent({
      type: 'documentLibrary',
      props: {
        initialChildId: childId,
        onClose: () => setActiveComponent(null)
      }
    });
  };

  // Open provider directory
const handleOpenProviders = () => {
  setActiveComponent({
    type: 'providerDirectory',
    props: {
      familyId: familyId,
      providers: healthcareProviders,
      loadingProviders: loadingProviders,
      onAddProvider: () => {}, // Implement if needed
      onUpdateProvider: () => {}, // Implement if needed
      onDeleteProvider: () => {}, // Implement if needed
      onClose: () => setActiveComponent(null)
    }
  });
};

  return (
    <div className="relative min-h-full">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="p-4 rounded-lg bg-white shadow-lg">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-700 font-roboto text-center">Loading data...</p>
          </div>
        </div>
      )}
      
      {/* Family Task Board section - at top */}
      <div id="task-board-section" className="border border-gray-200 rounded-lg bg-white mb-6">
        <div className="p-4 border-t border-gray-200">
          {expandedSections.taskBoard ? (
            <FamilyKanbanBoard 
              hideHeader={false}
              onMinimize={() => setExpandedSections(prev => ({...prev, taskBoard: false}))}
            />
          ) : (
            <button
              onClick={() => setExpandedSections(prev => ({...prev, taskBoard: true}))}
              className="w-full flex items-center justify-between p-3 font-medium font-roboto"
            >
              <h2 className="text-xl font-bold font-roboto m-0">Family Task Board</h2>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {tabError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1 font-roboto">Error loading data</p>
            <p className="text-sm font-roboto">{tabError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-bold font-roboto mb-1">Family Command Center</h2>
            <p className="text-gray-600 font-roboto text-sm">
              Track your children's growth, health, routines, and more
            </p>
          </div>
          
          {!loading && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-roboto"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                {searchQuery && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              {/* Voice input button */}
              <button
                className="py-2 px-3 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center font-roboto"
                onClick={handleVoiceInput}
                ref={microphoneRef}
              >
                <Mic size={16} className="mr-2" />
                Voice Input
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Child Selection */}
      <div className="mb-4 flex flex-wrap gap-2">
        {familyMembers
          .filter(member => member.role === 'child')
          .map(child => (
            <button
              key={child.id}
              onClick={() => setActiveChild(child.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm ${
                activeChild === child.id 
                  ? 'bg-blue-500 text-white font-medium shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserAvatar user={child} size={32} className="mr-2" />
              {child.name} {child.age ? `(${child.age})` : ''}
            </button>
          ))}
      </div>
      
      {/* Main Child Dashboard */}
      {activeChild && (
        <ChildDashboard 
        child={familyMembers.find(m => m.id === activeChild)}
        childData={childrenData[activeChild]}
        onOpenAppointment={(data) => openModal('appointment', data)}
        onOpenGrowth={(data) => openModal('growth', data)}
        onOpenRoutine={(data) => openModal('routine', data)}
        onOpenDocuments={handleOpenDocuments}
        onOpenProviders={handleOpenProviders}
      />
      )}
      
      {/* Allie notification */}
      {allieMessage && (
        <div className={`fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border-l-4 p-4 z-50 ${
          allieMessage.type === 'success' 
            ? 'border-green-500' 
            : allieMessage.type === 'error'
            ? 'border-red-500'
            : allieMessage.type === 'warning'
            ? 'border-yellow-500'
            : 'border-blue-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {allieMessage.type === 'success' ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : allieMessage.type === 'error' ? (
                <AlertCircle size={20} className="text-red-500" />
              ) : allieMessage.type === 'warning' ? (
                <AlertCircle size={20} className="text-yellow-500" />
              ) : (
                <Info size={20} className="text-blue-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium font-roboto">
                {allieMessage.type.charAt(0).toUpperCase() + allieMessage.type.slice(1)}
              </p>
              <p className="text-sm text-gray-600 font-roboto mt-1">
                {allieMessage.text}
              </p>
            </div>
            <button 
              className="ml-auto text-gray-400 hover:text-gray-500"
              onClick={() => setAllieMessage(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Voice input modal */}
      {newVoiceEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
              }`}>
                <Mic size={32} className={isRecording ? 'text-red-500' : 'text-gray-400'} />
              </div>
              
              <h3 className="text-lg font-medium mb-2 font-roboto">
                {isRecording ? 'Listening...' : 'Voice Command'}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4 font-roboto">
                {isRecording 
                  ? 'Speak clearly, I\'m listening...' 
                  : 'Click Start to record a voice command like "Add a doctor\'s appointment" or "Record Emma\'s height measurement"'}
              </p>
              
              {recordingText && recordingText !== 'Listening...' && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-left max-h-32 overflow-y-auto">
                  <p className="text-sm font-roboto">{recordingText}</p>
                </div>
              )}
              
              <div className="flex justify-center space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                  onClick={() => setNewVoiceEntry(false)}
                >
                  Cancel
                </button>
                
                {!isRecording ? (
  <button
    className="px-4 py-2 bg-blue-600 text-white rounded-md font-roboto hover:bg-blue-700"
    onClick={handleVoiceInput}
  >
    Start Recording
  </button>
) : (
  <button
    className="px-4 py-2 bg-red-600 text-white rounded-md font-roboto hover:bg-red-700"
    onClick={() => setIsRecording(false)}
  >
    Stop Recording
  </button>
)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Render active component (EnhancedEventManager, DocumentLibrary, etc.) */}
      {activeComponent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    {activeComponent.type === 'eventManager' && (
      <EnhancedEventManager {...activeComponent.props} />
    )}
    {activeComponent.type === 'documentLibrary' && (
      <DocumentLibrary {...activeComponent.props} />
    )}
    {activeComponent.type === 'providerDirectory' && (
      <ProviderDirectory {...activeComponent.props} />
          )}
        </div>
      )}
    </div>
  );
};

export default ChildrenTrackingTab;