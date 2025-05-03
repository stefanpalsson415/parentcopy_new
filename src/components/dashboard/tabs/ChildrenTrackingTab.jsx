// src/components/dashboard/tabs/ChildrenTrackingTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar, AlertCircle, Activity, Users, Search, X, RefreshCw, 
  User, PlusCircle, Mic, CheckCircle, Info, FileText, 
  Heart, List, ChevronRight, LayoutGrid, Book, Camera,
  Clipboard, Database, ArrowRight, Archive, School
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEvents } from '../../../contexts/EventContext';
import { db } from '../../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AllieAIService from '../../../services/AllieAIService';
import UserAvatar from '../../common/UserAvatar';
import RevisedFloatingCalendarWidget from '../../calendar/RevisedFloatingCalendarWidget';
import EnhancedEventManager from '../../calendar/EnhancedEventManager';
import DocumentLibrary from '../../document/DocumentLibrary';
import ProviderDirectory from '../../document/ProviderDirectory';

const ChildrenTrackingTab = () => {
  // Context hooks
  const { 
    selectedUser, 
    familyMembers,
    familyId,
    currentWeek
  } = useFamily();

  const { currentUser } = useAuth();
  const { events, loading: eventsLoading, refreshEvents } = useEvents();

  // Local state
  const [activeSection, setActiveSection] = useState('calendar'); // 'calendar', 'information', 'growth'
  const [childrenData, setChildrenData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [tabError, setTabError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allieMessage, setAllieMessage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const [showVoiceEntry, setShowVoiceEntry] = useState(false);
  const [relevantProviders, setRelevantProviders] = useState([]);
  const [relevantDocuments, setRelevantDocuments] = useState([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState(null);
  
  // Refs
  const searchInputRef = useRef(null);
  const calendarWidgetRef = useRef(null);
  const fileInputRef = useRef(null);

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
                providers: [],
                documents: [],
                growthData: [],
                healthRecords: []
              };
            });
          
          setChildrenData(fallbackData);
        }
      }
    }, 10000); // 10 second safety timeout
    
    return () => clearTimeout(safetyTimer);
  }, [loading, childrenData, familyMembers]);

  // Effect to load children's data
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    const loadChildrenData = async () => {
      try {
        if (!familyId) return;
        
        setLoading(true);
        console.log("Loading children data...");
        
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
                    providers: [],
                    documents: [],
                    growthData: [],
                    healthRecords: []
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
        
        // Load data
        const childrenDataResult = await dataLoadingPromise();
        
        // Set the children data if component is still mounted
        if (isMounted) {
          setChildrenData(childrenDataResult);
          
          // Set active child to the first child if none is selected
          if (!activeChild && familyMembers.filter(m => m.role === 'child').length > 0) {
            setActiveChild(familyMembers.filter(m => m.role === 'child')[0].id);
          }
          
          // Set loading to false
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading children data:", error);
        if (isMounted) {
          setLoading(false);
          setTabError("There was an error loading children data. Please try refreshing the page.");
          setChildrenData({});
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

  // Load related providers and documents when child changes
  useEffect(() => {
    if (activeChild) {
      loadRelevantProviders(activeChild);
      loadRelevantDocuments(activeChild);
    }
  }, [activeChild]);

  // Load relevant providers for the child
  const loadRelevantProviders = async (childId) => {
    try {
      setLoadingSection('providers');
      // For demo, we'll use these mock providers
      const mockProviders = [
        {
          id: 'prov1',
          name: 'Dr. Sarah Johnson',
          type: 'Pediatrician',
          phone: '(555) 123-4567',
          address: '123 Medical Plaza, Suite 400',
          lastVisit: '2025-04-10'
        },
        {
          id: 'prov2',
          name: 'Dr. Michael Chen',
          type: 'Dentist',
          phone: '(555) 987-6543',
          address: '456 Dental Office, Suite 200',
          lastVisit: '2025-03-15'
        }
      ];
      
      setRelevantProviders(mockProviders);
      setLoadingSection(null);
    } catch (error) {
      console.error("Error loading providers:", error);
      setRelevantProviders([]);
      setLoadingSection(null);
    }
  };

  // Load relevant documents for the child
  const loadRelevantDocuments = async (childId) => {
    try {
      setLoadingSection('documents');
      // For demo, we'll use these mock documents
      const mockDocuments = [
        {
          id: 'doc1',
          name: 'Annual Check-up Report',
          type: 'medical',
          date: '2025-04-10',
          provider: 'Dr. Sarah Johnson'
        },
        {
          id: 'doc2',
          name: 'Dental X-Rays',
          type: 'dental',
          date: '2025-03-15',
          provider: 'Dr. Michael Chen'
        },
        {
          id: 'doc3',
          name: 'School Physical Form',
          type: 'form',
          date: '2025-02-20',
          provider: 'School District'
        }
      ];
      
      setRelevantDocuments(mockDocuments);
      setLoadingSection(null);
    } catch (error) {
      console.error("Error loading documents:", error);
      setRelevantDocuments([]);
      setLoadingSection(null);
    }
  };

  // Handle voice input
  const handleVoiceInput = () => {
    setShowVoiceEntry(true);
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
        processVoiceCommand(recordingText);
      }
    };

    recognition.start();
  };

  // Process voice commands
  const processVoiceCommand = (text) => {
    // Create a friendly confirmation and show it in the UI
    setAllieMessage({
      type: 'success',
      text: `Processing: "${text}"`
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
      else if (lowerText.includes('document') || lowerText.includes('scan') || lowerText.includes('upload')) {
        handleVoiceDocumentUpload(text);
      }
      else {
        // Default response if we can't categorize
        setAllieMessage({
          type: 'info',
          text: "I'll store that information and process it for you. Would you like to add more details?"
        });
        // In a real implementation, this would use Claude to process the text
      }
    }, 1000);
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

    // Mock data extraction - in a real implementation, this would use Claude
    let appointmentType = 'checkup';
    if (text.toLowerCase().includes('dentist')) appointmentType = 'dentist';
    else if (text.toLowerCase().includes('eye') || text.toLowerCase().includes('vision')) appointmentType = 'eye exam';
    
    // Create a date - either extract from text or use a default near future date
    const date = new Date();
    date.setDate(date.getDate() + 14); // Two weeks from now
    
    const initialEvent = {
      title: `${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} Appointment`,
      description: `Voice entry: "${text}"`,
      location: '',
      childId: childId,
      childName: getChildName(childId),
      dateTime: date.toISOString(),
      category: 'appointment',
      eventType: 'appointment'
    };
    
    openModal('appointment', initialEvent);
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
      weight: weight
    };
    
    openModal('growth', initialEvent);
  };

  // Handle document upload from voice command
  const handleVoiceDocumentUpload = (text) => {
    setAllieMessage({
      type: 'info',
      text: "I'm ready to process a document. Please take a photo or upload a file."
    });
    
    // In a real implementation, this would trigger the camera or file upload
    setTimeout(() => {
      openModal('document', { type: 'upload', childId: activeChild });
    }, 1500);
  };

  // Open modal based on type
  const openModal = (type, data) => {
    setActiveModal(type);
    setModalProps(data);
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setModalProps(null);
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

  // Get child's upcoming appointments
  const getChildAppointments = () => {
    if (!activeChild || !events) return [];
    
    return events.filter(event => 
      event.childId === activeChild && 
      (event.category === 'appointment' || event.eventType === 'appointment') &&
      new Date(event.dateTime) > new Date()
    ).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  };

  // Handle camera capture or file upload
  const handleDocumentCapture = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAllieMessage({
        type: 'success',
        text: `Processing ${file.name}...`
      });
      
      // In a real implementation, this would upload the file and process it with Claude
      setTimeout(() => {
        setAllieMessage({
          type: 'success',
          text: `${file.name} processed and stored for ${getChildName(activeChild)}`
        });
        
        // Update documents list with the new file
        setRelevantDocuments(prev => [
          {
            id: `doc-${Date.now()}`,
            name: file.name,
            type: 'upload',
            date: new Date().toISOString(),
            provider: 'User upload'
          },
          ...prev
        ]);
      }, 2000);
    }
  };

  // Toggle between showing calendar and information sections
  const toggleSection = (section) => {
    setActiveSection(section);
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
              >
                <Mic size={16} className="mr-2" />
                Voice Input
              </button>
              
              {/* Camera capture button */}
              <button
                className="py-2 px-3 bg-green-50 text-green-600 rounded-md hover:bg-green-100 flex items-center font-roboto"
                onClick={handleDocumentCapture}
              >
                <Camera size={16} className="mr-2" />
                Capture Document
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleFileSelected}
              />
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
      
      {/* Section Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => toggleSection('calendar')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeSection === 'calendar' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <Calendar size={16} className="mr-2" />
              Calendar Events
            </div>
          </button>
          <button
            onClick={() => toggleSection('information')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeSection === 'information' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <Database size={16} className="mr-2" />
              Stored Information
            </div>
          </button>
          <button
            onClick={() => toggleSection('growth')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeSection === 'growth' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <Activity size={16} className="mr-2" />
              Growth & Development
            </div>
          </button>
        </div>
      </div>
      
      {/* Section Content */}
      {activeChild && (
        <div className="bg-white rounded-lg shadow-sm p-1">
          {/* Calendar Events Section */}
          {activeSection === 'calendar' && (
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Calendar Events for {getChildName(activeChild)}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Keep track of appointments, activities, and school events in one place.
                </p>
                
                {/* Embedded Calendar Widget */}
                <div 
                  ref={calendarWidgetRef}
                  className="w-full bg-white rounded-lg border border-gray-200 mb-8"
                  style={{ height: '600px', position: 'relative' }}
                >
                  <RevisedFloatingCalendarWidget 
                    initialSelectedMember={activeChild}
                    embedded={true}
                  />
                </div>
                
                {/* Upcoming Appointments */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Upcoming Appointments</h4>
                    <button 
                      onClick={() => openModal('appointment', { childId: activeChild })}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <PlusCircle size={14} className="mr-1" />
                      Add Appointment
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    {getChildAppointments().length > 0 ? (
                      <ul className="space-y-2">
                        {getChildAppointments().slice(0, 3).map(appointment => (
                          <li key={appointment.id} className="flex items-start p-2 border-b border-gray-100">
                            <div className="bg-red-100 text-red-700 p-2 rounded-full mr-3">
                              <Activity size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{appointment.title}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(appointment.dateTime)}
                                {appointment.location && ` • ${appointment.location}`}
                              </p>
                            </div>
                            <button 
                              onClick={() => openModal('appointment', appointment)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar size={40} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No upcoming appointments</p>
                        <button 
                          onClick={() => openModal('appointment', { childId: activeChild })}
                          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                        >
                          Add Appointment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Stored Information Section */}
          {activeSection === 'information' && (
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Stored Information for {getChildName(activeChild)}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Access and organize medical records, documents, providers, and other important information.
                </p>
                
                {/* Two-column layout for desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Healthcare Providers Column */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Healthcare Providers</h4>
                      <button 
                        onClick={() => openModal('provider', { childId: activeChild })}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <PlusCircle size={14} className="mr-1" />
                        Add Provider
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      {loadingSection === 'providers' ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                        </div>
                      ) : relevantProviders.length > 0 ? (
                        <ul className="space-y-3">
                          {relevantProviders.map(provider => (
                            <li key={provider.id} className="flex items-start p-3 bg-white rounded-md shadow-sm">
                              <div className="bg-blue-100 text-blue-700 p-2 rounded-full mr-3">
                                <User size={16} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{provider.name}</p>
                                <p className="text-sm text-gray-500">{provider.type}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Last visit: {formatDate(provider.lastVisit)}
                                </p>
                              </div>
                              <button 
                                onClick={() => openModal('providerDetail', provider)}
                                className="text-gray-400 hover:text-gray-700"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center py-8">
                          <User size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No providers added yet</p>
                          <button 
                            onClick={() => openModal('provider', { childId: activeChild })}
                            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                          >
                            Add Provider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Documents Column */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Documents & Records</h4>
                      <button 
                        onClick={() => openModal('document', { childId: activeChild })}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <PlusCircle size={14} className="mr-1" />
                        Add Document
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      {loadingSection === 'documents' ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                        </div>
                      ) : relevantDocuments.length > 0 ? (
                        <div>
                          <ul className="space-y-3">
                            {(showAllDocuments ? relevantDocuments : relevantDocuments.slice(0, 3)).map(doc => (
                              <li key={doc.id} className="flex items-start p-3 bg-white rounded-md shadow-sm">
                                <div className={`text-white p-2 rounded-full mr-3 ${
                                  doc.type === 'medical' ? 'bg-red-500' :
                                  doc.type === 'dental' ? 'bg-blue-500' :
                                  doc.type === 'form' ? 'bg-purple-500' :
                                  'bg-gray-500'
                                }`}>
                                  <FileText size={16} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{doc.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Added: {formatDate(doc.date)}
                                    {doc.provider && ` • ${doc.provider}`}
                                  </p>
                                </div>
                                <button 
                                  onClick={() => openModal('documentDetail', doc)}
                                  className="text-gray-400 hover:text-gray-700"
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </li>
                            ))}
                          </ul>
                          
                          {relevantDocuments.length > 3 && (
                            <button
                              onClick={() => setShowAllDocuments(!showAllDocuments)}
                              className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              {showAllDocuments ? 'Show Less' : `Show All (${relevantDocuments.length})`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No documents added yet</p>
                          <button 
                            onClick={() => openModal('document', { childId: activeChild })}
                            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                          >
                            Add Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Additional Information Categories */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* School Information */}
                  <div 
                    onClick={() => openModal('schoolInfo', { childId: activeChild })}
                    className="border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="bg-indigo-100 p-3 rounded-full mr-3">
                      <School size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">School Information</h5>
                      <p className="text-sm text-gray-500">Teachers, schedules, and contacts</p>
                    </div>
                  </div>
                  
                  {/* Health History */}
                  <div 
                    onClick={() => openModal('healthHistory', { childId: activeChild })}
                    className="border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="bg-red-100 p-3 rounded-full mr-3">
                      <Heart size={20} className="text-red-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Health History</h5>
                      <p className="text-sm text-gray-500">Medical history and conditions</p>
                    </div>
                  </div>
                  
                  {/* Insurance */}
                  <div 
                    onClick={() => openModal('insurance', { childId: activeChild })}
                    className="border border-gray-200 rounded-lg p-4 flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="bg-green-100 p-3 rounded-full mr-3">
                      <Clipboard size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Insurance Information</h5>
                      <p className="text-sm text-gray-500">Plans, coverage, and cards</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Growth & Development Section */}
          {activeSection === 'growth' && (
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Growth & Development for {getChildName(activeChild)}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Track physical growth, developmental milestones, and educational progress.
                </p>
                
                {/* Growth Chart Placeholder */}
                <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <Activity size={48} className="text-gray-300 mx-auto mb-4" />
                  <h4 className="font-medium mb-2">Growth Chart</h4>
                  <p className="text-sm text-gray-500 mb-4">Track height, weight, and other measurements over time</p>
                  <button 
                    onClick={() => openModal('growth', { childId: activeChild })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                  >
                    Add Measurement
                  </button>
                </div>
                
                {/* Developmental Milestones */}
                <div className="mb-8">
                  <h4 className="font-medium mb-3">Developmental Milestones</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-center text-gray-500 py-6">
                      Track important milestones and achievements
                    </p>
                    <button 
                      onClick={() => openModal('milestone', { childId: activeChild })}
                      className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                    >
                      Add Milestone
                    </button>
                  </div>
                </div>
                
                {/* Educational Progress */}
                <div>
                  <h4 className="font-medium mb-3">Educational Progress</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-center text-gray-500 py-6">
                      Keep track of academic progress and achievements
                    </p>
                    <button 
                      onClick={() => openModal('education', { childId: activeChild })}
                      className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                    >
                      Add Education Record
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Allie Chat Integration */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4 flex items-start">
        <div className="bg-blue-100 p-3 rounded-full mr-4">
          <Mic size={22} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-blue-800 mb-1">Allie Chat Integration</h3>
          <p className="text-sm text-blue-700 mb-3">
            Allie can help you capture, store, and organize information about {activeChild ? getChildName(activeChild) : 'your children'}.
          </p>
          <button
            onClick={handleVoiceInput}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 mr-2"
          >
            Talk to Allie
          </button>
          <button
            onClick={handleDocumentCapture}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-50"
          >
            Scan Document
          </button>
        </div>
      </div>
      
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
      {showVoiceEntry && (
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
                  : 'Click Start to record a voice command or to capture information about your child'}
              </p>
              
              {recordingText && recordingText !== 'Listening...' && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-left max-h-32 overflow-y-auto">
                  <p className="text-sm font-roboto">{recordingText}</p>
                </div>
              )}
              
              <div className="flex justify-center space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                  onClick={() => setShowVoiceEntry(false)}
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
      
      {/* Modals */}
      {activeModal === 'appointment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <EnhancedEventManager 
            initialEvent={modalProps}
            eventType="appointment"
            onSave={(result) => {
              if (result.success) {
                setAllieMessage({
                  type: 'success',
                  text: 'Appointment saved successfully!'
                });
                // Force refresh events
                if (typeof refreshEvents === 'function') {
                  refreshEvents();
                }
              }
              closeModal();
            }}
            onCancel={closeModal}
          />
        </div>
      )}
      
      {activeModal === 'growth' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add Growth Measurement</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Height</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 105 cm"
                    defaultValue={modalProps?.height || ''}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Weight</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 20 kg"
                    defaultValue={modalProps?.weight || ''}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Head Circumference</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 45 cm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">BMI</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Calculated BMI"
                    disabled
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Additional notes about this measurement"
                  defaultValue={modalProps?.description || ''}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAllieMessage({
                      type: 'success',
                      text: 'Growth measurement saved successfully!'
                    });
                    closeModal();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Save Measurement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeModal === 'document' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <DocumentLibrary 
            onClose={closeModal}
            initialChildId={modalProps?.childId}
            selectMode={false}
          />
        </div>
      )}
      
      {activeModal === 'provider' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <ProviderDirectory 
            onClose={closeModal}
            familyId={familyId}
            selectMode={false}
          />
        </div>
      )}
    </div>
  );
};

export default ChildrenTrackingTab;