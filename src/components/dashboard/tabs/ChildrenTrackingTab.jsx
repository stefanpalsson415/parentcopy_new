import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar, ChevronDown, ChevronUp, Clock, Heart, AlertCircle, 
  Activity, Users, Star, Clipboard, Camera, Plus, Edit, Trash2,   CheckSquare, 
  Square, 
  GripVertical, 
  Tag, Check,
  Calendar as CalendarIcon ,
  CheckCircle, Info, Brain, Smile, Frown, Apple, Upload, 
  Search, X, RefreshCw, Settings, List, Grid, HelpCircle,
  FileText, Download, Save, Paperclip, User, PlusCircle, Mic
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { db, storage } from '../../../services/firebase';
import { 
  doc, getDoc, updateDoc, setDoc, collection, 
  query, where, getDocs, serverTimestamp, addDoc, onSnapshot, 
  deleteDoc  
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DatabaseService from '../../../services/DatabaseService';
import CalendarService from '../../../services/CalendarService';
import AllieAIService from '../../../services/AllieAIService';
import UserAvatar from '../../common/UserAvatar';
import EnhancedEventManager from '../../calendar/EnhancedEventManager';
import DocumentLibrary from '../../document/DocumentLibrary';
import ProviderDirectory from '../../document/ProviderDirectory';
import FamilyKanbanBoard from '../../kanban/FamilyKanbanBoard';



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
  const [viewMode, setViewMode] = useState('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [allieMessage, setAllieMessage] = useState(null);
  const [newVoiceEntry, setNewVoiceEntry] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    medical: false,
    growth: false,
    routines: false,
    documents: false,
    providers: false
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
  
  // Notification badge counts
  const [notifications, setNotifications] = useState({
    medical: 0,
    growth: 0,
    routines: 0
  });

  // Helper function to convert modal data to event format
  const convertModalDataToEventFormat = (modalType, data) => {
    const baseEvent = {
      childId: data.childId,
      childName: getChildName(data.childId)
    };
    
    switch (modalType) {
      case 'appointment':
        return {
          ...baseEvent,
          ...data,
          title: data.title || '',
          description: data.notes || '',
          location: data.location || '',
          dateTime: data.date ? `${data.date}T${data.time || '09:00'}` : new Date().toISOString(),
          category: 'medical',
          eventType: 'appointment',
          providerId: data.providerId,
          providerDetails: data.providerDetails,
          documents: data.documents || []
        };
        
      case 'growth':
        return {
          ...baseEvent,
          ...data,
          title: `Growth Measurement - ${formatDate(data.date || new Date().toISOString())}`,
          description: data.notes || '',
          dateTime: data.date ? `${data.date}T12:00:00` : new Date().toISOString(),
          category: 'growth',
          eventType: 'growth',
          height: data.height || '',
          weight: data.weight || '',
          shoeSize: data.shoeSize || '',
          clothingSize: data.clothingSize || ''
        };
        
      case 'routine':
        return {
          ...baseEvent,
          ...data,
          title: data.title || '',
          description: data.notes || '',
          dateTime: new Date().toISOString(),
          category: 'activity',
          eventType: 'activity',
          isRecurring: (data.days || []).length > 0,
          recurrence: {
            frequency: 'weekly',
            days: data.days || [],
            endDate: ''
          },
          startTime: data.startTime || '09:00',
          endTime: data.endTime || ''
        };
        
      case 'handmedown':
        return {
          ...baseEvent,
          ...data,
          title: data.name || '',
          description: data.description || '',
          dateTime: data.readyDate ? `${data.readyDate}T12:00:00` : new Date().toISOString(),
          category: 'clothes',
          eventType: 'clothes',
          size: data.size || '',
          used: data.used || false,
          imageUrl: data.imageUrl || ''
        };
        
      default:
        return { ...baseEvent };
    }
  };

  // Helper function to convert event data back to modal format
  const convertEventToModalData = (modalType, result, originalData) => {
    const eventData = result.eventData || {};
    
    switch (modalType) {
      case 'appointment':
        // Extract date and time from dateTime
        const appointmentDate = new Date(eventData.dateTime || eventData.start?.dateTime);
        return {
          ...originalData,
          id: originalData.id || Date.now().toString(),
          title: eventData.title || eventData.summary || '',
          date: appointmentDate.toISOString().split('T')[0],
          time: appointmentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
          doctor: eventData.doctor || originalData.doctor,
          notes: eventData.description || '',
          location: eventData.location || '',
          providerId: eventData.providerId || originalData.providerId,
          providerDetails: eventData.providerDetails || originalData.providerDetails,
          childId: eventData.childId || originalData.childId,
          calendarId: result.eventId || result.firestoreId
        };
        
      case 'growth':
        const growthDate = new Date(eventData.dateTime || eventData.start?.dateTime);
        return {
          ...originalData,
          id: originalData.id || Date.now().toString(),
          date: growthDate.toISOString().split('T')[0],
          height: eventData.height || originalData.height || '',
          weight: eventData.weight || originalData.weight || '',
          shoeSize: eventData.shoeSize || originalData.shoeSize || '',
          clothingSize: eventData.clothingSize || originalData.clothingSize || '',
          notes: eventData.description || originalData.notes || '',
          childId: eventData.childId || originalData.childId
        };
        
      case 'routine':
        return {
          ...originalData,
          id: originalData.id || Date.now().toString(),
          title: eventData.title || eventData.summary || '',
          days: eventData.recurrence?.days || originalData.days || [],
          startTime: eventData.startTime || originalData.startTime || '',
          endTime: eventData.endTime || originalData.endTime || '',
          notes: eventData.description || originalData.notes || '',
          childId: eventData.childId || originalData.childId
        };
        
      case 'handmedown':
        const readyDate = new Date(eventData.dateTime || eventData.start?.dateTime);
        return {
          ...originalData,
          id: originalData.id || Date.now().toString(),
          name: eventData.title || eventData.summary || '',
          description: eventData.description || originalData.description || '',
          size: eventData.size || originalData.size || '',
          readyDate: readyDate.toISOString().split('T')[0],
          used: eventData.used || originalData.used || false,
          childId: eventData.childId || originalData.childId,
          imageUrl: eventData.imageUrl || originalData.imageUrl
        };
        
      default:
        return originalData;
    }
  };

  // Update openModal function to use EnhancedEventManager for supported event types
  const openModal = (modalType, data) => {
    // For appointment, growth, routine, and handmedown modals, use EnhancedEventManager
    if (['appointment', 'growth', 'routine', 'handmedown'].includes(modalType)) {
      // Convert the modal data to the format expected by EnhancedEventManager
      const eventData = convertModalDataToEventFormat(modalType, data);
      
      setActiveComponent({
        type: 'eventManager',
        props: {
          initialEvent: eventData,
          initialChildId: data.childId,
          eventType: modalType,
          mode: data.id ? 'edit' : 'create',
          onSave: (result) => {
            if (result.success) {
              // Convert the event data back to our domain model
              const savedData = convertEventToModalData(modalType, result, data);
              
              // Update the database based on the event type
              switch (modalType) {
                case 'appointment':
                  handleAppointmentFormSubmit(savedData);
                  break;
                case 'growth':
                  handleGrowthFormSubmit(savedData);
                  break;
                case 'routine':
                  handleRoutineFormSubmit(savedData);
                  break;
                case 'handmedown':
                  handleHandMeDownFormSubmit(savedData);
                  break;
              }
              
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
    } else {
      // For other types like 'provider', keep using the original modal
      setActiveModal(modalType);
      setModalData(data);
      
      // If opening an appointment modal, load associated documents
      if (modalType === 'appointment' && data.id) {
        loadAppointmentDocuments(data.childId, data.id);
      }
    }
  };

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Get child name by ID
  const getChildName = useCallback((childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : "Unknown Child";
  }, [familyMembers]);

  // Get child age by ID
  const getChildAge = useCallback((childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.age : null;
  }, [familyMembers]);

  // Get child's profile picture
  const getChildProfilePicture = useCallback((childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child && child.profilePicture ? child.profilePicture : '/api/placeholder/48/48';
  }, [familyMembers]);

  // Helper function to get checkup recommendation based on age
  const getCheckupRecommendation = useCallback((age, lastCheckup) => {
    // Based on common pediatric schedules
    let recommendation = null;
    
    if (!lastCheckup) {
      return `should have regular checkups. No previous checkup information is recorded.`;
    }
    
    const lastCheckupDate = new Date(lastCheckup.date);
    const today = new Date();
    const monthsSinceLastCheckup = (today.getFullYear() - lastCheckupDate.getFullYear()) * 12 + 
                                  today.getMonth() - lastCheckupDate.getMonth();
    
    // Simplified recommendations based on age
    if (age < 1) {
      // Infants typically have checkups at 1, 2, 4, 6, 9, and 12 months
      if (monthsSinceLastCheckup >= 3) {
        recommendation = `is due for another well-baby checkup. Infants typically need checkups every 2-3 months during the first year.`;
      }
    } else if (age < 3) {
      // Toddlers typically have checkups at 15, 18, 24, and 30 months
      if (monthsSinceLastCheckup >= 6) {
        recommendation = `may be due for a checkup. Children aged 1-3 typically need checkups every 6 months.`;
      }
    } else if (age < 6) {
      // Preschoolers typically have annual checkups
      if (monthsSinceLastCheckup >= 12) {
        recommendation = `is due for an annual checkup. The last checkup was ${monthsSinceLastCheckup} months ago.`;
      }
    } else {
      // School-age children and adolescents typically have annual checkups
      if (monthsSinceLastCheckup >= 12) {
        recommendation = `is due for an annual checkup. The last checkup was ${monthsSinceLastCheckup} months ago.`;
      }
    }
    
    return recommendation;
  }, []);


// Replace the generateLocalInsights function with this more robust version
const generateLocalInsights = useCallback((data) => {
  try {
    // For a simplified version, create some dynamic insights based on the data
    const insights = [];
    
    // Safely process data for each child
    if (!data || typeof data !== 'object') {
      console.warn("Invalid data provided to generateLocalInsights", data);
      return [];
    }
    
    Object.keys(data).forEach(childId => {
      try {
        const childData = data[childId];
        if (!childData) return;
        
        const childName = getChildName(childId) || "Your child";
        const childAge = getChildAge(childId);
        
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
        } else if (childAge) {
          // No growth data recorded
          insights.push({
            type: "recommendation",
            title: "Missing Growth Data",
            content: `You haven't recorded any growth data for ${childName} yet. Tracking height, weight, and sizes helps monitor their development.`,
            priority: "medium",
            childId: childId
          });
        }
        
        // Add more insights here as needed...
        
      } catch (childError) {
        console.warn(`Error generating insights for child ${childId}:`, childError);
        // Continue with other children even if one fails
      }
    });
    
    // If we still have no insights, add a default one
    if (insights.length === 0) {
      insights.push({
        type: "recommendation",
        title: "Getting Started",
        content: "Start tracking your children's health, growth, and routines to get personalized insights.",
        priority: "medium",
        childId: null
      });
    }
    
    // Sort insights by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    insights.sort((a, b) => {
      return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
    });
    
    return insights;
  } catch (error) {
    console.error("Error in generateLocalInsights:", error);
    return []; // Return empty array on error
  }
}, [getChildName, getChildAge, formatDate]);


const generateAiInsights = useCallback(async (data) => {
  try {
    if (!familyId || !data) {
      setAiInsights([]);
      return;
    }
    
    console.log("Generating child insights for family:", familyId);
    
    // Always generate local insights first as a fallback
    const localInsights = generateLocalInsights(data);
    
    try {
      // Set local insights immediately so UI is not empty
      setAiInsights(localInsights);
      
      // Try to get enhanced insights from AI service with a longer timeout
      console.log("Requesting AI-generated child insights from AllieAIService");
      const aiInsightsPromise = AllieAIService.generateChildInsights(familyId, data);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI insights request timed out")), 20000) // 20 seconds timeout
      );
      
      // Race between the actual request and a timeout
      const aiInsights = await Promise.race([aiInsightsPromise, timeoutPromise]);
      
      if (aiInsights && Array.isArray(aiInsights) && aiInsights.length > 0) {
        console.log(`Received ${aiInsights.length} AI-generated insights`);
        // Only update if we got valid insights
        setAiInsights(aiInsights);
      } else {
        // Keep using local insights
        console.warn("AI service returned empty or invalid insights, keeping local insights");
      }
    } catch (serviceError) {
      // Already showing local insights, just log the error
      console.warn("AI service error, using local insights:", serviceError);
    }
  } catch (error) {
    console.error("Error in insight generation:", error);
    // Create basic insights as a last resort
    setAiInsights([
      {
        title: "Getting Started",
        type: "recommendation",
        content: "Track your children's health, growth, and routines to get personalized insights.",
        priority: "medium",
        childId: null
      }
    ]);
  }
}, [familyId, generateLocalInsights]);

  // Update notification counts based on data
  const updateNotificationCounts = useCallback((data) => {
    if (!data) return;
    
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    const counts = {
      medical: 0,
      growth: 0,
      routines: 0
    };
    
    // Process for each child
    Object.keys(data).forEach(childId => {
      const childData = data[childId];
      
      // Medical appointments coming up in the next week
      if (childData.medicalAppointments) {
        counts.medical += childData.medicalAppointments.filter(apt => {
          const aptDate = new Date(apt.date);
          return !apt.completed && aptDate >= today && aptDate <= oneWeekFromNow;
        }).length;
      }
      
      // Growth data - notify if no entry in the last 3 months
      if (childData.growthData && childData.growthData.length > 0) {
        const lastGrowthDate = new Date(Math.max(...childData.growthData.map(g => new Date(g.date))));
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        if (lastGrowthDate < threeMonthsAgo) {
          counts.growth += 1;
        }
      } else {
        // No growth data at all
        counts.growth += 1;
      }
    });
    
    setNotifications(counts);
  }, []);



  // Load healthcare providers
  useEffect(() => {
    const loadHealthcareProviders = async () => {
      try {
        if (!familyId) return;
        
        setLoadingProviders(true);
        const providersRef = collection(db, "healthcareProviders");
        const q = query(providersRef, where("familyId", "==", familyId));
        const querySnapshot = await getDocs(q);
        
        const providers = [];
        querySnapshot.forEach((doc) => {
          providers.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setHealthcareProviders(providers);
        setLoadingProviders(false);
      } catch (error) {
        console.error("Error loading healthcare providers:", error);
        setLoadingProviders(false);
      }
    };
    
    loadHealthcareProviders();
  }, [familyId]);

  // Mock recognizeSpeech function - in a real implementation, this would use the Web Speech API
  const recognizeSpeech = () => {
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
    
    const eventData = {
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
        initialEvent: eventData,
        eventType: 'appointment',
        onSave: (result) => {
          if (result.success) {
            const appointmentData = {
              id: Date.now().toString(),
              title: result.eventData?.title || appointmentType,
              date: new Date(result.eventData?.dateTime || date).toISOString().split('T')[0],
              time: new Date(result.eventData?.dateTime || date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
              doctor: '',
              notes: result.eventData?.description || `Voice entry: "${text}"`,
              childId: childId,
              completed: false,
              documents: [],
              calendarId: result.eventId || result.firestoreId
            };
            
            handleAppointmentFormSubmit(appointmentData);
            
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

  // Handle voice growth entry commands
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

    // Mock data extraction - in a real implementation, this would use NLP
    let height = '';
    let weight = '';
    
    // Very simple extraction for demo
    const heightMatch = text.match(/(\d+(\.\d+)?)\s*(cm|in|inches|feet|ft)/i);
    if (heightMatch) height = heightMatch[0];
    
    const weightMatch = text.match(/(\d+(\.\d+)?)\s*(kg|kilos|lb|pounds)/i);
    if (weightMatch) weight = weightMatch[0];
    
    const eventData = {
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
        initialEvent: eventData,
        eventType: 'growth',
        onSave: (result) => {
          if (result.success) {
            const growthData = {
              id: Date.now().toString(),
              height: result.eventData?.height || height,
              weight: result.eventData?.weight || weight,
              shoeSize: result.eventData?.shoeSize || '',
              clothingSize: result.eventData?.clothingSize || '',
              date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
              notes: result.eventData?.description || `Voice entry: "${text}"`,
              childId: childId
            };
            
            handleGrowthFormSubmit(growthData);
            
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
    
    const eventData = {
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
        initialEvent: eventData,
        eventType: 'routine',
        onSave: (result) => {
          if (result.success) {
            const routineData = {
              id: Date.now().toString(),
              title: result.eventData?.title || routineTitle,
              days: result.eventData?.recurrence?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              startTime: result.eventData?.startTime || '08:00',
              endTime: result.eventData?.endTime || '',
              notes: result.eventData?.description || `Voice entry: "${text}"`,
              childId: childId
            };
            
            handleRoutineFormSubmit(routineData);
            
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

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setModalData({});
    setDocuments([]);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle voice input button click
  const handleVoiceInput = () => {
    setNewVoiceEntry(true);
    recognizeSpeech();
  };

  // Toggle view mode between card and list
  const toggleViewMode = () => {
    setViewMode(viewMode === 'card' ? 'list' : 'card');
  };

  // Load documents associated with an appointment
  const loadAppointmentDocuments = async (childId, appointmentId) => {
    try {
      if (!familyId || !childId || !appointmentId) return;
      
      // Query documents for this appointment
      const documentsRef = collection(db, "appointmentDocuments");
      const q = query(
        documentsRef, 
        where("familyId", "==", familyId),
        where("childId", "==", childId),
        where("appointmentId", "==", appointmentId)
      );
      
      const querySnapshot = await getDocs(q);
      const docs = [];
      
      querySnapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading appointment documents:", error);
      setAllieMessage({
        type: 'error',
        text: 'Error loading documents. Please try again.'
      });
    }
  };
  
  // Handle file upload for appointment documents
  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      const { childId, id: appointmentId } = modalData;
      if (!familyId || !childId || !appointmentId) {
        setAllieMessage({
          type: 'error',
          text: 'Missing information for document upload. Please try again.'
        });
        return;
      }
      
      setUploadingDocument(true);
      setUploadProgress(0);
      
      // Create a reference to the file in Firebase Storage
      const fileRef = ref(storage, `appointment-documents/${familyId}/${childId}/${appointmentId}/${file.name}`);
      
      // Upload the file
      const uploadTask = uploadBytes(fileRef, file);
      
      // Wait for upload to complete
      await uploadTask;
      
      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);
      
      // Create document record in Firestore
      const docData = {
        familyId,
        childId,
        appointmentId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: downloadURL,
        uploadedAt: serverTimestamp(),
        uploadedBy: currentUser.uid
      };
      
      await addDoc(collection(db, "appointmentDocuments"), docData);
      
      // Update local documents state
      setDocuments(prev => [...prev, {
        id: Date.now().toString(), // Temporary ID until we reload
        ...docData
      }]);
      
      setUploadingDocument(false);
      setUploadProgress(100);
      
      setAllieMessage({
        type: 'success',
        text: 'Document uploaded successfully!'
      });
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      setUploadingDocument(false);
      setUploadProgress(0);
      
      setAllieMessage({
        type: 'error',
        text: 'Error uploading document. Please try again.'
      });
    }
  };
  
  // Create or update healthcare provider
  const handleProviderSubmit = async (providerData) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      setLoadingSection("provider");
      
      const { id, name, specialty, phone, email, address, notes } = providerData;
      
      // Format provider data
      const provider = {
        name,
        specialty,
        phone: phone || "",
        email: email || "",
        address: address || "",
        notes: notes || "",
        familyId,
        updatedAt: serverTimestamp()
      };
      
      let providerId;
      
      if (id) {
        // Update existing provider
        const providerRef = doc(db, "healthcareProviders", id);
        await updateDoc(providerRef, provider);
        providerId = id;
      } else {
        // Create new provider
        const providerRef = collection(db, "healthcareProviders");
        const docRef = await addDoc(providerRef, {
          ...provider,
          createdAt: serverTimestamp()
        });
        providerId = docRef.id;
      }
      
      // Refresh providers list
      const updatedProviders = [...healthcareProviders];
      
      if (id) {
        // Update existing provider in the list
        const index = updatedProviders.findIndex(p => p.id === id);
        if (index !== -1) {
          updatedProviders[index] = {
            ...updatedProviders[index],
            ...provider,
            id
          };
        }
      } else {
        // Add new provider to the list
        updatedProviders.push({
          ...provider,
          id: providerId
        });
      }
      
      setHealthcareProviders(updatedProviders);
      setLoadingSection(null);
      closeModal();
      
      setAllieMessage({
        type: 'success',
        text: `Healthcare provider ${id ? 'updated' : 'created'} successfully!`
      });
      
      return providerId;
    } catch (error) {
      console.error("Error saving healthcare provider:", error);
      setLoadingSection(null);
      
      setAllieMessage({
        type: 'error',
        text: `Error ${modalData.id ? 'updating' : 'creating'} healthcare provider: ${error.message}`
      });
      
      return null;
    }
  };

  // Add to ChildrenTrackingTab.jsx - New function to handle coach/teacher submission
  const handleCoachTeacherSubmit = async (coachData) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      setLoadingSection("coach");
      
      const { id, name, activity, phone, email, notes } = coachData;
      
      // Format coach data
      const coach = {
        name,
        activity,
        phone: phone || "",
        email: email || "",
        notes: notes || "",
        familyId,
        updatedAt: serverTimestamp()
      };
      
      let coachId;
      
      if (id) {
        // Update existing coach
        const coachRef = doc(db, "activityCoaches", id);
        await updateDoc(coachRef, coach);
        coachId = id;
      } else {
        // Create new coach
        const coachRef = collection(db, "activityCoaches");
        const docRef = await addDoc(coachRef, {
          ...coach,
          createdAt: serverTimestamp()
        });
        coachId = docRef.id;
      }
      
      // Update state and close modal
      setLoadingSection(null);
      closeModal();
      
      setAllieMessage({
        type: 'success',
        text: `Coach/Teacher ${id ? 'updated' : 'created'} successfully!`
      });
      
      return coachId;
    } catch (error) {
      console.error("Error saving coach/teacher:", error);
      setLoadingSection(null);
      
      setAllieMessage({
        type: 'error',
        text: `Error ${modalData.id ? 'updating' : 'creating'} coach/teacher: ${error.message}`
      });
      
      return null;
    }
  };

  
    
  


  
// Add this function to handle provider deletion
const handleProviderDelete = async (providerId) => {
  try {
    if (!familyId) throw new Error("No family ID available");
    
    setLoadingSection("provider");
    
    // Delete provider from Firestore
    const providerRef = doc(db, "healthcareProviders", providerId);
    await deleteDoc(providerRef);
    
    // Update local state
    const updatedProviders = healthcareProviders.filter(p => p.id !== providerId);
    setHealthcareProviders(updatedProviders);
    
    setLoadingSection(null);
    
    setAllieMessage({
      type: 'success',
      text: 'Provider deleted successfully!'
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting provider:", error);
    setLoadingSection(null);
    
    setAllieMessage({
      type: 'error',
      text: `Error deleting provider: ${error.message}`
    });
    
    return false;
  }
};



  

  // Get parent name
  const getParentName = (parentId) => {
    const parent = familyMembers.find(m => m.id === parentId);
    return parent?.name || 'Unassigned';
  };

 

// Replace the useEffect with loadChildrenData in ChildrenTrackingTab.jsx
useEffect(() => {
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
            
            try {
              // Save initial structure to Firebase
              await updateDoc(docRef, {
                childrenData: initialChildrenData
              });
              console.log("Initialized children data structure in Firebase");
            } catch (updateError) {
              console.warn("Failed to save initial children data structure:", updateError);
            }
            
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
        setTabError("Loading took too long. Some data may be unavailable.");
      }
      
      // Set the children data
      setChildrenData(childrenDataResult);
      
      // Set active child to the first child if none is selected
      if (!activeChild && familyMembers.filter(m => m.role === 'child').length > 0) {
        setActiveChild(familyMembers.filter(m => m.role === 'child')[0].id);
      }
      
      // Update notification counts
      updateNotificationCounts(childrenDataResult);
      
      // Set loading to false before AI generation
      setLoading(false);
      
      // Generate AI insights in the background
      if (Object.keys(childrenDataResult).length > 0) {
        console.log("Generating AI insights in the background");
        setTimeout(() => {
          generateAiInsights(childrenDataResult).catch(error => {
            console.error("Background AI insights generation failed:", error);
          });
        }, 1000); // Slight delay to let UI render first
      } else {
        console.log("No children data to generate insights from");
        // Set default insights
        setAiInsights([{
          title: "Getting Started",
          type: "recommendation",
          content: "Start tracking your children's health, growth, and routines to get personalized insights.",
          priority: "medium",
          childId: null
        }]);
      }
    } catch (error) {
      console.error("Error loading children data:", error);
      setLoading(false);
      setTabError("There was an error loading children data. Please try refreshing the page.");
      // Set fallback empty data
      setChildrenData({});
    }
  };
  
  loadChildrenData();
}, [familyId, familyMembers, activeChild, generateAiInsights, updateNotificationCounts]);
  
  // Handle form submission for different data types
  const handleFormSubmit = async (formType) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      setLoadingSection(formType);
      
      // Get the form data from the modalData state
      const formData = {...modalData};
      
      // Switch based on form type
      switch (formType) {
        case 'appointment':
          await handleAppointmentFormSubmit(formData);
          break;
        case 'growth':
          await handleGrowthFormSubmit(formData);
          break;
        case 'routine':
          await handleRoutineFormSubmit(formData);
          break;
        case 'handmedown':
          await handleHandMeDownFormSubmit(formData);
          break;
        default:
          throw new Error(`Unknown form type: ${formType}`);
      }
      // Success message
      setAllieMessage({
        type: 'success',
        text: `${formType.charAt(0).toUpperCase() + formType.slice(1)} saved successfully!`
      });
      
      // Clean up
      setLoadingSection(null);
      closeModal();
      
      // Re-generate AI insights based on updated data
      await generateAiInsights(childrenData);
      
    } catch (error) {
      console.error(`Error saving ${formType}:`, error);
      setLoadingSection(null);
      setAllieMessage({
        type: 'error',
        text: `Failed to save ${formType}: ${error.message}`
      });
    }
  };
  
  // Handle appointment form submission
  const handleAppointmentFormSubmit = async (formData) => {
    const { childId, id, providerId } = formData;
    
    // Validate required fields
    if (!formData.title) {
      throw new Error("Please enter an appointment title");
    }
    
    if (!formData.date) {
      throw new Error("Please select an appointment date");
    }
    
    if (!formData.time) {
      throw new Error("Please select an appointment time");
    }
    
    // Format appointment data
    const appointmentData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // If providerId is provided, get the provider data
    if (providerId) {
      const provider = healthcareProviders.find(p => p.id === providerId);
      if (provider) {
        appointmentData.doctor = provider.name;
        appointmentData.providerDetails = {
          id: provider.id,
          name: provider.name,
          specialty: provider.specialty,
          phone: provider.phone,
          email: provider.email,
          address: provider.address
        };
      }
    }
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing appointment
      const appointmentIndex = updatedData[childId].medicalAppointments.findIndex(
        app => app.id === id
      );
      
      if (appointmentIndex !== -1) {
        updatedData[childId].medicalAppointments[appointmentIndex] = appointmentData;
      }
    } else {
      // Add new appointment
      if (!updatedData[childId].medicalAppointments) {
        updatedData[childId].medicalAppointments = [];
      }
      
      updatedData[childId].medicalAppointments.push(appointmentData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.medicalAppointments`]: updatedData[childId].medicalAppointments
    });
    
    // If the appointment has a future date, add it to the calendar
    const appointmentDate = new Date(formData.date);
    if (appointmentDate > new Date() && !formData.completed) {
      try {
        // Parse time strings
        const [hours, minutes] = formData.time.split(':');
        appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // End time is 30 minutes after start
        const endDate = new Date(appointmentDate);
        endDate.setMinutes(endDate.getMinutes() + 30);
        
        // Get child name with proper formatting
        const childName = getChildName(childId);
        
        // Create event object for the calendar with proper title formatting
        const calendarEvent = {
          summary: `${childName}'s ${formData.title}`,
          title: `${childName}'s ${formData.title}`, // Add title for consistency
          description: formData.notes || `Medical appointment: ${formData.title}`,
          location: formData.providerDetails?.address || '',
          start: {
            dateTime: appointmentDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          childId: childId,
          childName: childName,
          category: 'medical',
          eventType: 'appointment',
          familyId: familyId,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 } // 1 hour before
            ]
          },
          // Add a unique identifier to prevent duplicates
          uniqueId: `appointment-${childId}-${Date.now()}`
        };
        
        console.log("Creating calendar event:", calendarEvent.summary);
        
        // Add to calendar using the standard addEvent method
        if (CalendarService) {
          const result = await CalendarService.addEvent(calendarEvent, currentUser?.uid);
          
          // If calendar event was created successfully, and we have an ID, store it with the appointment
          if (result.success && (result.eventId || result.firestoreId)) {
            const calendarId = result.eventId || result.firestoreId;
            
            // Find the appointment in the updated data and add the calendarId
            const apptIndex = updatedData[childId].medicalAppointments.findIndex(
              app => app.id === appointmentData.id
            );
            
            if (apptIndex !== -1) {
              updatedData[childId].medicalAppointments[apptIndex].calendarId = calendarId;
              
              // Update Firebase with the calendar reference
              await updateDoc(docRef, {
                [`childrenData.${childId}.medicalAppointments`]: updatedData[childId].medicalAppointments
              });
            }
          }
        }
      } catch (calendarError) {
        console.error("Error adding to calendar:", calendarError);
        // Don't block the save if calendar fails
      }
    }
    
    return true;
  };

  // Handle growth form submission
  const handleGrowthFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate - at least one measurement
    if (!formData.height && !formData.weight && !formData.shoeSize && !formData.clothingSize) {
      throw new Error("Please fill in at least one measurement");
    }
    
    // Validate number formats
    if (formData.height && !/^\d+(\.\d+)?\s*(cm|in|inches|feet|ft)$/i.test(formData.height)) {
      throw new Error("Height must be a number with units (e.g., '42 in' or '107 cm')");
    }
    
    if (formData.weight && !/^\d+(\.\d+)?\s*(kg|kilos|lb|pounds)$/i.test(formData.weight)) {
      throw new Error("Weight must be a number with units (e.g., '40 lb' or '18 kg')");
    }
    
    if (formData.shoeSize && isNaN(parseFloat(formData.shoeSize))) {
      throw new Error("Shoe size must be a number");
    }
    
    // Format growth data
    const growthData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing growth data
      const growthIndex = updatedData[childId].growthData.findIndex(
        g => g.id === id
      );
      
      if (growthIndex !== -1) {
        updatedData[childId].growthData[growthIndex] = growthData;
      }
    } else {
      // Add new growth data
      if (!updatedData[childId].growthData) {
        updatedData[childId].growthData = [];
      }
      
      updatedData[childId].growthData.push(growthData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.growthData`]: updatedData[childId].growthData
    });
    
    return true;
  };
  
  // Handle routine form submission
  const handleRoutineFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || formData.days.length === 0 || !formData.startTime) {
      throw new Error("Please fill in title, days, and start time");
    }
    
    // Format routine data
    const routineData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing routine
      const routineIndex = updatedData[childId].routines.findIndex(
        r => r.id === id
      );
      
      if (routineIndex !== -1) {
        updatedData[childId].routines[routineIndex] = routineData;
      }
    } else {
      // Add new routine
      if (!updatedData[childId].routines) {
        updatedData[childId].routines = [];
      }
      
      updatedData[childId].routines.push(routineData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.routines`]: updatedData[childId].routines
    });
    
    // Try to add to calendar if it's a recurring event
    if (formData.days.length > 0) {
      try {
        // For each day of the week, create a recurring event
        formData.days.forEach(async (day) => {
          // Map day name to day number (0 = Sunday, 1 = Monday, etc.)
          const dayMap = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          
          const dayNumber = dayMap[day];
          if (dayNumber === undefined) return;
          
          // Create a date for the next occurrence of this day
          const today = new Date();
          const daysUntilNext = (dayNumber + 7 - today.getDay()) % 7;
          const nextOccurrence = new Date();
          nextOccurrence.setDate(today.getDate() + daysUntilNext);
          
          // Set the time
          const [hours, minutes] = formData.startTime.split(':');
          nextOccurrence.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Create end time (default to 30 minutes later if no end time)
          const endTime = formData.endTime 
            ? formData.endTime 
            : `${hours}:${parseInt(minutes) + 30}`;
          
          const [endHours, endMinutes] = endTime.split(':');
          const endDate = new Date(nextOccurrence);
          endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
          
          // Create calendar event for recurring routine
          const calendarEvent = {
            summary: `${getChildName(childId)}'s ${formData.title}`,
            description: formData.description || `Regular routine: ${formData.title}`,
            start: {
              dateTime: nextOccurrence.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            recurrence: [
              `RRULE:FREQ=WEEKLY;BYDAY=${day.substring(0, 2).toUpperCase()}`
            ],
            reminders: {
              useDefault: true
            }
          };
          
          // Add to calendar
          if (CalendarService) {
            await CalendarService.addEvent(calendarEvent, currentUser?.uid);
          }
        });
      } catch (calendarError) {
        console.error("Error adding routine to calendar:", calendarError);
        // Don't block the save if calendar fails
      }
    }
    
    return true;
  };

  // Handle hand-me-down form submission
  const handleHandMeDownFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.name || !formData.description || !formData.readyDate) {
      throw new Error("Please fill in name, description, and ready date");
    }
    
    // Format hand-me-down data
    const handMeDownData = {
      ...formData,
      id: id || Date.now().toString(),
      used: formData.used || false,
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing hand-me-down
      const handMeDownIndex = updatedData[childId].clothesHandMeDowns.findIndex(
        h => h.id === id
      );
      
      if (handMeDownIndex !== -1) {
        updatedData[childId].clothesHandMeDowns[handMeDownIndex] = handMeDownData;
      }
    } else {
      // Add new hand-me-down
      if (!updatedData[childId].clothesHandMeDowns) {
        updatedData[childId].clothesHandMeDowns = [];
      }
      
      updatedData[childId].clothesHandMeDowns.push(handMeDownData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.clothesHandMeDowns`]: updatedData[childId].clothesHandMeDowns
    });
    
    // If there's an image, upload it
    if (formData.imageFile) {
      try {
        const fileRef = ref(storage, `hand-me-downs/${familyId}/${childId}/${handMeDownData.id}`);
        await uploadBytes(fileRef, formData.imageFile);
        const downloadURL = await getDownloadURL(fileRef);
        
        // Update the item with the image URL
        const index = updatedData[childId].clothesHandMeDowns.findIndex(h => h.id === handMeDownData.id);
        if (index !== -1) {
          updatedData[childId].clothesHandMeDowns[index].imageUrl = downloadURL;
          
          // Save to Firebase again with the image URL
          await updateDoc(docRef, {
            [`childrenData.${childId}.clothesHandMeDowns`]: updatedData[childId].clothesHandMeDowns
          });
          
          // Update state
          setChildrenData(updatedData);
        }
      } catch (uploadError) {
        console.error("Error uploading hand-me-down image:", uploadError);
        // Don't block the save if image upload fails
      }
    }
    
    return true;
  };
  
  // Remove item (generic handle for deleting any type of data)
  const handleRemoveItem = async (itemType, childId, itemId) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Create a deep copy of the childrenData
      const updatedData = JSON.parse(JSON.stringify(childrenData));
      
      // Different item types are stored in different paths
      let path;
      let updatedItems;
      
      switch (itemType) {
        case 'appointment':
          path = `medicalAppointments`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'growth':
          path = `growthData`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'routine':
          path = `routines`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'handmedown':
          path = `clothesHandMeDowns`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        default:
          throw new Error(`Unknown item type: ${itemType}`);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${childId}.${path}`]: updatedData[childId][path]
      });
      
      // If it's an appointment, delete any associated documents
      if (itemType === 'appointment') {
        try {
          // Query documents for this appointment
          const documentsRef = collection(db, "appointmentDocuments");
          const q = query(
            documentsRef, 
            where("familyId", "==", familyId),
            where("childId", "==", childId),
            where("appointmentId", "==", itemId)
          );
          
          const querySnapshot = await getDocs(q);
          
          // Delete each document
          const deletePromises = [];
          querySnapshot.forEach((doc) => {
            deletePromises.push(
              updateDoc(doc.ref, { deleted: true, deletedAt: serverTimestamp() })
            );
          });
          
          await Promise.all(deletePromises);
        } catch (docError) {
          console.error("Error deleting appointment documents:", docError);
          // Don't block the main delete operation
        }
      }
      
      // Success message
      setAllieMessage({
        type: 'success',
        text: `Item removed successfully!`
      });
      
    } catch (error) {
      console.error(`Error removing ${itemType}:`, error);
      setAllieMessage({
        type: 'error',
        text: `Failed to remove item: ${error.message}`
      });
    }
  };
  
  // Delete document from an appointment
  const handleRemoveDocument = async (documentId) => {
    try {
      if (!documentId) return;
      
      // Mark document as deleted in Firestore (soft delete)
      const docRef = doc(db, "appointmentDocuments", documentId);
      await updateDoc(docRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      
      // Update local state
      setDocuments(docs => docs.filter(d => d.id !== documentId));
      
      setAllieMessage({
        type: 'success',
        text: 'Document removed successfully!'
      });
    } catch (error) {
      console.error("Error removing document:", error);
      setAllieMessage({
        type: 'error',
        text: 'Error removing document. Please try again.'
      });
    }
  };
  
  // Mark hand-me-down as used
  const markHandMeDownAsUsed = async (childId, itemId) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Create a deep copy of the childrenData
      const updatedData = JSON.parse(JSON.stringify(childrenData));
      
      // Find the item
      const index = updatedData[childId].clothesHandMeDowns.findIndex(item => item.id === itemId);
      
      if (index !== -1) {
        // Mark as used
        updatedData[childId].clothesHandMeDowns[index].used = true;
        updatedData[childId].clothesHandMeDowns[index].usedDate = new Date().toISOString();
        
        // Update state and save to Firebase
        setChildrenData(updatedData);
        
        // Save to Firebase
        const docRef = doc(db, "families", familyId);
        await updateDoc(docRef, {
          [`childrenData.${childId}.clothesHandMeDowns`]: updatedData[childId].clothesHandMeDowns
        });
        
        setAllieMessage({
          type: 'success',
          text: 'Item marked as used!'
        });
      }
    } catch (error) {
      console.error("Error marking hand-me-down as used:", error);
      setAllieMessage({
        type: 'error',
        text: 'Error updating item. Please try again.'
      });
    }
  };
  
  // Replace the entire renderMedicalSection function with this
  const renderMedicalSection = () => {
    // Get both children and parents
    const children = familyMembers.filter(member => member.role === 'child');
    const parents = familyMembers.filter(member => member.role === 'parent');
    const allMembers = [...children, ...parents];
    
    if (allMembers.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No family members found</p>
        </div>
      );
    }
    
    // Filter based on activeChild (if selected)
    let filteredMembers = allMembers;
    if (activeChild) {
      filteredMembers = allMembers.filter(member => member.id === activeChild);
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium font-roboto">Medical Appointments & Health Records</h3>
          <div className="flex space-x-2">
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
              title={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
            >
              {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
            </button>
            <button 
              className="p-2 rounded-md bg-black text-white hover:bg-gray-800"
              onClick={() => {
                if (activeChild) {
                  setActiveComponent({
                    type: 'eventManager',
                    props: {
                      initialEvent: {
                        title: '',
                        description: '',
                        location: '',
                        childId: activeChild,
                        childName: getChildName(activeChild),
                        dateTime: new Date().toISOString(),
                        category: 'medical',
                        eventType: 'appointment'
                      },
                      eventType: 'appointment',
                      onSave: (result) => {
                        if (result.success) {
                          const appointmentData = {
                            id: Date.now().toString(),
                            title: result.eventData?.title || '',
                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                            time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                            doctor: '',
                            notes: result.eventData?.description || '',
                            location: result.eventData?.location || '',
                            childId: activeChild,
                            completed: false,
                            documents: [],
                            calendarId: result.eventId || result.firestoreId
                          };
                          
                          handleAppointmentFormSubmit(appointmentData);
                          
                          setAllieMessage({
                            type: 'success',
                            text: 'Appointment added successfully!'
                          });
                        }
                        setActiveComponent(null);
                      },
                      onCancel: () => setActiveComponent(null)
                    }
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a family member first before adding an appointment.'
                  });
                }
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        
        <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredMembers.map(member => (
            <div key={member.id} className={`bg-white rounded-lg shadow ${viewMode === 'card' ? 'p-4' : 'p-4'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <UserAvatar user={member} size={40} className="mr-3" />
                  <div>
                    <h4 className="font-medium font-roboto text-lg">{member.name}'s Health</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {member.role === 'child' ? 
                        (childrenData[member.id]?.medicalAppointments?.length || 0) + ' appointments' :
                        (member.medicalAppointments?.length || 0) + ' appointments'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="px-3 py-1 border border-black text-black rounded-md text-sm hover:bg-gray-50 font-roboto flex items-center"
                    onClick={() => openModal('provider', { familyId })}
                  >
                    <User size={14} className="mr-1" />
                    Manage Providers
                  </button>
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => {
                      setActiveComponent({
                        type: 'eventManager',
                        props: {
                          initialEvent: {
                            title: '',
                            description: '',
                            location: '',
                            childId: member.id,
                            childName: member.name,
                            dateTime: new Date().toISOString(),
                            category: 'medical',
                            eventType: 'appointment'
                          },
                          eventType: 'appointment',
                          onSave: (result) => {
                            if (result.success) {
                              const appointmentData = {
                                id: Date.now().toString(),
                                title: result.eventData?.title || '',
                                date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                                doctor: '',
                                notes: result.eventData?.description || '',
                                location: result.eventData?.location || '',
                                childId: member.id,
                                completed: false,
                                documents: [],
                                calendarId: result.eventId || result.firestoreId
                              };
                              
                              handleAppointmentFormSubmit(appointmentData);
                              
                              setAllieMessage({
                                type: 'success',
                                text: 'Appointment added successfully!'
                              });
                            }
                            setActiveComponent(null);
                          },
                          onCancel: () => setActiveComponent(null)
                        }
                      });
                    }}
                  >
                    <PlusCircle size={14} className="mr-1" />
                    Add Appointment
                  </button>
                </div>
              </div>
              
              {/* Recommended checkups based on age - only for children */}
              {member.role === 'child' && member.age && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm font-roboto mb-1 flex items-center">
                    <Info size={14} className="text-blue-500 mr-1" />
                    Recommended for {member.age} years old
                  </h5>
                  <ul className="text-sm font-roboto space-y-1">
                    {member.age < 1 && (
                      <>
                        <li>• Well-baby checkups at 1, 2, 4, 6, 9, and 12 months</li>
                        <li>• Multiple immunizations throughout first year</li>
                      </>
                    )}
                    {member.age >= 1 && member.age < 3 && (
                      <>
                        <li>• Well-child checkups at 15, 18, 24, and 30 months</li>
                        <li>• First dental visit by age 1</li>
                        <li>• Vision screening</li>
                      </>
                    )}
                    {member.age >= 3 && member.age < 6 && (
                      <>
                        <li>• Annual well-child checkups</li>
                        <li>• Dental checkups every 6 months</li>
                        <li>• Vision and hearing screening</li>
                      </>
                    )}
                    {member.age >= 6 && member.age < 12 && (
                      <>
                        <li>• Annual well-child checkups</li>
                        <li>• Dental checkups every 6 months</li>
                        <li>• Vision and hearing screenings</li>
                        <li>• Sports physicals if applicable</li>
                      </>
                    )}
                    {member.age >= 12 && (
                      <>
                        <li>• Annual well-teen checkups</li>
                        <li>• Dental checkups every 6 months</li>
                        <li>• Sports physicals if applicable</li>
                        <li>• Adolescent immunizations</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Adult health recommendations for parents */}
              {member.role === 'parent' && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm font-roboto mb-1 flex items-center">
                    <Info size={14} className="text-blue-500 mr-1" />
                    Recommended Adult Health Screenings
                  </h5>
                  <ul className="text-sm font-roboto space-y-1">
                    <li>• Annual physical exam</li>
                    <li>• Blood pressure check (once a year)</li>
                    <li>• Cholesterol screening (every 4-6 years)</li>
                    <li>• Dental exam (twice a year)</li>
                    <li>• Eye exam (every 1-2 years)</li>
                  </ul>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-sm font-roboto">Upcoming Appointments</h5>
                  <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                </div>
                
                {/* Different handling of appointments based on member type */}
                {member.role === 'child' ? (
                  // Child appointments
                  childrenData[member.id]?.medicalAppointments?.filter(a => !a.completed && new Date(a.date) >= new Date()).length > 0 ? (
                    childrenData[member.id].medicalAppointments
                      .filter(a => !a.completed && new Date(a.date) >= new Date())
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 3)
                      .map(appointment => (
                        <div key={appointment.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto text-md">{appointment.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(appointment.date)} at {appointment.time}
                              </p>
                              {appointment.doctor && (
                                <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
                              )}
                              {appointment.providerDetails && appointment.providerDetails.address && (
                                <p className="text-sm text-gray-600 font-roboto truncate">{appointment.providerDetails.address}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  setActiveComponent({
                                    type: 'eventManager',
                                    props: {
                                      initialEvent: {
                                        title: appointment.title,
                                        description: appointment.notes || '',
                                        location: appointment.location || '',
                                        childId: member.id,
                                        childName: member.name,
                                        dateTime: `${appointment.date}T${appointment.time}`,
                                        category: 'medical',
                                        eventType: 'appointment',
                                        providerId: appointment.providerId,
                                        providerDetails: appointment.providerDetails,
                                        completed: appointment.completed
                                      },
                                      eventType: 'appointment',
                                      mode: 'edit',
                                      onSave: (result) => {
                                        if (result.success) {
                                          const updatedAppointment = {
                                            ...appointment,
                                            title: result.eventData?.title || appointment.title,
                                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                            time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                                            notes: result.eventData?.description || appointment.notes,
                                            location: result.eventData?.location || appointment.location,
                                            childId: member.id,
                                            calendarId: result.eventId || result.firestoreId || appointment.calendarId
                                          };
                                          
                                          handleAppointmentFormSubmit(updatedAppointment);
                                          
                                          setAllieMessage({
                                            type: 'success',
                                            text: 'Appointment updated successfully!'
                                          });
                                        }
                                        setActiveComponent(null);
                                      },
                                      onCancel: () => setActiveComponent(null)
                                    }
                                  });
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('appointment', member.id, appointment.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {appointment.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                              <p>{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No upcoming appointments</p>
                    </div>
                  )
                ) : (
                  // Parent appointments - check if member.medicalAppointments exists
                  member.medicalAppointments?.filter(a => !a.completed && new Date(a.date) >= new Date()).length > 0 ? (
                    member.medicalAppointments
                      .filter(a => !a.completed && new Date(a.date) >= new Date())
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 3)
                      .map(appointment => (
                        <div key={appointment.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto text-md">{appointment.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(appointment.date)} at {appointment.time}
                              </p>
                              {appointment.doctor && (
                                <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
                              )}
                              {appointment.providerDetails && appointment.providerDetails.address && (
                                <p className="text-sm text-gray-600 font-roboto truncate">{appointment.providerDetails.address}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  setActiveComponent({
                                    type: 'eventManager',
                                    props: {
                                      initialEvent: {
                                        title: appointment.title,
                                        description: appointment.notes || '',
                                        location: appointment.location || '',
                                        childId: member.id,
                                        childName: member.name,
                                        dateTime: `${appointment.date}T${appointment.time}`,
                                        category: 'medical',
                                        eventType: 'appointment',
                                        providerId: appointment.providerId,
                                        providerDetails: appointment.providerDetails,
                                        completed: appointment.completed
                                      },
                                      eventType: 'appointment',
                                      mode: 'edit',
                                      onSave: (result) => {
                                        if (result.success) {
                                          const updatedAppointment = {
                                            ...appointment,
                                            title: result.eventData?.title || appointment.title,
                                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                            time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                                            notes: result.eventData?.description || appointment.notes,
                                            location: result.eventData?.location || appointment.location,
                                            parentId: member.id,
                                            calendarId: result.eventId || result.firestoreId || appointment.calendarId
                                          };
                                          
                                          handleAppointmentFormSubmit(updatedAppointment);
                                          
                                          setAllieMessage({
                                            type: 'success',
                                            text: 'Appointment updated successfully!'
                                          });
                                        }
                                        setActiveComponent(null);
                                      },
                                      onCancel: () => setActiveComponent(null)
                                    }
                                  });
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('appointment', member.id, appointment.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {appointment.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                              <p>{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No upcoming appointments</p>
                    </div>
                  )
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <h5 className="font-medium text-sm font-roboto">Past Appointments</h5>
                </div>
                
                {/* Past appointments - again handling differently for children vs parents */}
                {member.role === 'child' ? (
                  childrenData[member.id]?.medicalAppointments?.filter(a => a.completed || new Date(a.date) < new Date()).length > 0 ? (
                    childrenData[member.id].medicalAppointments
                      .filter(a => a.completed || new Date(a.date) < new Date())
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 3)
                      .map(appointment => (
                        <div key={appointment.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{appointment.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(appointment.date)} at {appointment.time}
                              </p>
                              {appointment.doctor && (
                                <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  setActiveComponent({
                                    type: 'eventManager',
                                    props: {
                                      initialEvent: {
                                        title: appointment.title,
                                        description: appointment.notes || '',
                                        location: appointment.location || '',
                                        childId: member.id,
                                        childName: member.name,
                                        dateTime: `${appointment.date}T${appointment.time}`,
                                        category: 'medical',
                                        eventType: 'appointment',
                                        providerId: appointment.providerId,
                                        providerDetails: appointment.providerDetails,
                                        completed: appointment.completed
                                      },
                                      eventType: 'appointment',
                                      mode: 'edit',
                                      onSave: (result) => {
                                        if (result.success) {
                                          const updatedAppointment = {
                                            ...appointment,
                                            title: result.eventData?.title || appointment.title,
                                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                            time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                                            notes: result.eventData?.description || appointment.notes,
                                            location: result.eventData?.location || appointment.location,
                                            childId: member.id,
                                            calendarId: result.eventId || result.firestoreId || appointment.calendarId
                                          };
                                          
                                          handleAppointmentFormSubmit(updatedAppointment);
                                          
                                          setAllieMessage({
                                            type: 'success',
                                            text: 'Appointment updated successfully!'
                                          });
                                        }
                                        setActiveComponent(null);
                                      },
                                      onCancel: () => setActiveComponent(null)
                                    }
                                  });
                                }}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                          {appointment.completed && (
                            <div className="mt-2 flex items-center text-sm text-green-600 font-roboto">
                              <CheckCircle size={14} className="mr-1" />
                              Completed
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No past appointments</p>
                    </div>
                  )
                ) : (
                  // Parent past appointments
                  member.medicalAppointments?.filter(a => a.completed || new Date(a.date) < new Date()).length > 0 ? (
                    member.medicalAppointments
                      .filter(a => a.completed || new Date(a.date) < new Date())
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 3)
                      .map(appointment => (
                        <div key={appointment.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{appointment.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(appointment.date)} at {appointment.time}
                              </p>
                              {appointment.doctor && (
                                <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  setActiveComponent({
                                    type: 'eventManager',
                                    props: {
                                      initialEvent: {
                                        title: appointment.title,
                                        description: appointment.notes || '',
                                        location: appointment.location || '',
                                        childId: member.id,
                                        childName: member.name,
                                        dateTime: `${appointment.date}T${appointment.time}`,
                                        category: 'medical',
                                        eventType: 'appointment',
                                        providerId: appointment.providerId,
                                        providerDetails: appointment.providerDetails,
                                        completed: appointment.completed
                                      },
                                      eventType: 'appointment',
                                      mode: 'edit',
                                      onSave: (result) => {
                                        if (result.success) {
                                          const updatedAppointment = {
                                            ...appointment,
                                            title: result.eventData?.title || appointment.title,
                                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                            time: new Date(result.eventData?.dateTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                                            notes: result.eventData?.description || appointment.notes,
                                            location: result.eventData?.location || appointment.location,
                                            parentId: member.id,
                                            calendarId: result.eventId || result.firestoreId || appointment.calendarId
                                          };
                                          
                                          handleAppointmentFormSubmit(updatedAppointment);
                                          
                                          setAllieMessage({
                                            type: 'success',
                                            text: 'Appointment updated successfully!'
                                          });
                                        }
                                        setActiveComponent(null);
                                      },
                                      onCancel: () => setActiveComponent(null)
                                    }
                                  });
                                }}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                          {appointment.completed && (
                            <div className="mt-2 flex items-center text-sm text-green-600 font-roboto">
                              <CheckCircle size={14} className="mr-1" />
                              Completed
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No past appointments</p>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render the growth & development section
  const renderGrowthSection = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    const filteredChildren = activeChild ? children.filter(child => child.id === activeChild) : children;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium font-roboto">Growth & Development Tracking</h3>
          <div className="flex space-x-2">
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
              title={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
            >
              {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
            </button>
            <button 
              className="p-2 rounded-md bg-black text-white hover:bg-gray-800"
              onClick={() => {
                if (activeChild) {
                  setActiveComponent({
                    type: 'eventManager',
                    props: {
                      initialEvent: {
                        title: 'Growth Measurement',
                        description: '',
                        childId: activeChild,
                        childName: getChildName(activeChild),
                        dateTime: new Date().toISOString(),
                        category: 'growth',
                        eventType: 'growth',
                        height: '',
                        weight: '',
                        shoeSize: '',
                        clothingSize: ''
                      },
                      eventType: 'growth',
                      onSave: (result) => {
                        if (result.success) {
                          const growthData = {
                            id: Date.now().toString(),
                            height: result.eventData?.height || '',
                            weight: result.eventData?.weight || '',
                            shoeSize: result.eventData?.shoeSize || '',
                            clothingSize: result.eventData?.clothingSize || '',
                            date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                            notes: result.eventData?.description || '',
                            childId: activeChild
                          };
                          
                          handleGrowthFormSubmit(growthData);
                          
                          setAllieMessage({
                            type: 'success',
                            text: 'Growth measurement added successfully!'
                          });
                        }
                        setActiveComponent(null);
                      },
                      onCancel: () => setActiveComponent(null)
                    }
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding growth data.'
                  });
                }
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        
        <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredChildren.map(child => (
            <div key={child.id} className={`bg-white rounded-lg shadow ${viewMode === 'card' ? 'p-4' : 'p-4'}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                <UserAvatar user={child} size={40} className="mr-3" />

                  <div>
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Growth</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      Age: {child.age || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => {
                      setActiveComponent({
                        type: 'eventManager',
                        props: {
                          initialEvent: {
                            title: 'Growth Measurement',
                            description: '',
                            childId: child.id,
                            childName: child.name,
                            dateTime: new Date().toISOString(),
                            category: 'growth',
                            eventType: 'growth',
                            height: '',
                            weight: '',
                            shoeSize: '',
                            clothingSize: ''
                          },
                          eventType: 'growth',
                          onSave: (result) => {
                            if (result.success) {
                              const growthData = {
                                id: Date.now().toString(),
                                height: result.eventData?.height || '',
                                weight: result.eventData?.weight || '',
                                shoeSize: result.eventData?.shoeSize || '',
                                clothingSize: result.eventData?.clothingSize || '',
                                date: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                notes: result.eventData?.description || '',
                                childId: child.id
                              };
                              
                              handleGrowthFormSubmit(growthData);
                              
                              setAllieMessage({
                                type: 'success',
                                text: 'Growth measurement added successfully!'
                              });
                            }
                            setActiveComponent(null);
                          },
                          onCancel: () => setActiveComponent(null)
                        }
                      });
                    }}
                  >
                    <PlusCircle size={14} className="mr-1" />
                    Add Measurement
                  </button>
                  <button 
                    className="px-3 py-1 border border-black text-black rounded-md text-sm hover:bg-gray-50 font-roboto flex items-center"
                    onClick={() => {
                      setActiveComponent({
                        type: 'eventManager',
                        props: {
                          initialEvent: {
                            title: '',
                            description: '',
                            childId: child.id,
                            childName: child.name,
                            dateTime: new Date().toISOString(),
                            category: 'clothes',
                            eventType: 'clothes',
                            size: '',
                            used: false
                          },
                          eventType: 'handmedown',
                          onSave: (result) => {
                            if (result.success) {
                              const handMeDownData = {
                                id: Date.now().toString(),
                                name: result.eventData?.title || '',
                                description: result.eventData?.description || '',
                                size: result.eventData?.size || '',
                                readyDate: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                used: result.eventData?.used || false,
                                childId: child.id
                              };
                              
                              handleHandMeDownFormSubmit(handMeDownData);
                              
                              setAllieMessage({
                                type: 'success',
                                text: 'Hand-me-down item added successfully!'
                              });
                            }
                            setActiveComponent(null);
                          },
                          onCancel: () => setActiveComponent(null)
                        }
                      });
                    }}
                  >
                    <Clipboard size={14} className="mr-1" />
                    Add Hand-Me-Downs
                  </button>
                </div>
              </div>
              
              {/* Growth data visualization */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm font-roboto mb-3">Growth Chart</h5>
                
                {childrenData[child.id]?.growthData?.length > 1 ? (
                  <div className="h-40 relative border-b border-l">
                    {/* A very simple visualization - in a real application, use a proper chart library */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4">
                      {childrenData[child.id].growthData
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((entry, index, arr) => {
                          // Extract numeric height if possible
                          const heightMatch = entry.height?.match(/(\d+(\.\d+)?)/);
                          const height = heightMatch ? parseFloat(heightMatch[1]) : 0;
                          
                          // Scale height to fit in the chart (very simplified)
                          const maxHeight = Math.max(...arr.map(e => {
                            const match = e.height?.match(/(\d+(\.\d+)?)/);
                            return match ? parseFloat(match[1]) : 0;
                          }));
                          
                          const barHeight = maxHeight > 0 ? (height / maxHeight) * 100 : 0;
                          
                          return (
                            <div key={entry.id} className="flex flex-col items-center">
                              <div 
                                className="w-8 bg-blue-500 rounded-t"
                                style={{ height: `${barHeight}%` }}
                              />
                              <div className="mt-1 text-xs text-gray-500 -rotate-45 origin-top-left">
                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 font-roboto">
                      Add at least two measurements to see a growth chart
                    </p>
                  </div>
                )}
              </div>
              
              {/* Latest measurements */}
              <div className="mb-4">
                <h5 className="font-medium text-sm font-roboto mb-2">Latest Measurements</h5>
                {childrenData[child.id]?.growthData?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const latestGrowth = childrenData[child.id].growthData
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                      
                      return (
                        <div className="border rounded-lg p-3">
                          <div className="flex justify-between">
                            <div>
                              <h6 className="font-medium text-sm font-roboto">
                                {formatDate(latestGrowth.date)}
                              </h6>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {latestGrowth.height && (
                                  <div className="text-sm">
                                    <span className="font-medium font-roboto">Height:</span>{' '}
                                    <span className="font-roboto">{latestGrowth.height}</span>
                                  </div>
                                )}
                                {latestGrowth.weight && (
                                  <div className="text-sm">
                                    <span className="font-medium font-roboto">Weight:</span>{' '}
                                    <span className="font-roboto">{latestGrowth.weight}</span>
                                  </div>
                                )}
                                {latestGrowth.shoeSize && (
                                  <div className="text-sm">
                                    <span className="font-medium font-roboto">Shoe:</span>{' '}
                                    <span className="font-roboto">{latestGrowth.shoeSize}</span>
                                  </div>
                                )}
                                
                                  {latestGrowth.clothingSize && (
                                    <div className="text-sm">
                                      <span className="font-medium font-roboto">Clothing:</span>{' '}
                                      <span className="font-roboto">{latestGrowth.clothingSize}</span>
                                    </div>
                                  )}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })()}
                                                    </div>
                                                  ) : (
                                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                      <p className="text-sm text-gray-500 font-roboto">No measurements recorded yet</p>
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Hand-me-downs section */}
                                                <div className="mb-4">
                                                  <h5 className="font-medium text-sm font-roboto mb-2">Saved Clothing Items</h5>
                                                  
                                                  {childrenData[child.id]?.clothesHandMeDowns?.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-3">
                                                      {childrenData[child.id].clothesHandMeDowns
                                                        .filter(item => !item.used)
                                                        .slice(0, 3)
                                                        .map(item => (
                                                          <div key={item.id} className="border rounded-lg p-3">
                                                            <div className="flex justify-between">
                                                              <div>
                                                                <h6 className="font-medium text-sm font-roboto">{item.name}</h6>
                                                                <p className="text-sm text-gray-600 font-roboto">
                                                                  Size: {item.size}
                                                                </p>
                                                                <p className="text-sm text-gray-600 font-roboto">
                                                                  Ready date: {formatDate(item.readyDate)}
                                                                </p>
                                                              </div>
                                                              <div className="flex space-x-2">
                                                                <button 
                                                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                  onClick={() => markHandMeDownAsUsed(child.id, item.id)}
                                                                  title="Mark as used"
                                                                >
                                                                  <Check size={16} />
                                                                </button>
                                                                <button 
                                                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                                  onClick={() => {
                                                                    setActiveComponent({
                                                                      type: 'eventManager',
                                                                      props: {
                                                                        initialEvent: {
                                                                          title: item.name,
                                                                          description: item.description || '',
                                                                          childId: child.id,
                                                                          childName: getChildName(child.id),
                                                                          dateTime: item.readyDate ? `${item.readyDate}T12:00:00` : new Date().toISOString(),
                                                                          category: 'clothes',
                                                                          eventType: 'handmedown',
                                                                          size: item.size || '',
                                                                          used: item.used || false,
                                                                          imageUrl: item.imageUrl || ''
                                                                        },
                                                                        eventType: 'handmedown',
                                                                        mode: 'edit',
                                                                        onSave: (result) => {
                                                                          if (result.success) {
                                                                            const handMeDownData = {
                                                                              ...item,
                                                                              name: result.eventData?.title || item.name,
                                                                              description: result.eventData?.description || item.description,
                                                                              size: result.eventData?.size || item.size,
                                                                              readyDate: new Date(result.eventData?.dateTime || new Date()).toISOString().split('T')[0],
                                                                              used: result.eventData?.used || item.used,
                                                                              childId: child.id
                                                                            };
                                                                            
                                                                            handleHandMeDownFormSubmit(handMeDownData);
                                                                            
                                                                            setAllieMessage({
                                                                              type: 'success',
                                                                              text: 'Hand-me-down item updated successfully!'
                                                                            });
                                                                          }
                                                                          setActiveComponent(null);
                                                                        },
                                                                        onCancel: () => setActiveComponent(null)
                                                                      }
                                                                    });
                                                                  }}
                                                                >
                                                                  <Edit size={16} />
                                                                </button>
                                                                <button 
                                                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                  onClick={() => handleRemoveItem('handmedown', child.id, item.id)}
                                                                >
                                                                  <Trash2 size={16} />
                                                                </button>
                                                              </div>
                                                            </div>
                                                            {item.imageUrl && (
                                                              <div className="mt-2">
                                                                <img 
                                                                  src={item.imageUrl} 
                                                                  alt={item.name} 
                                                                  className="h-32 w-auto object-cover rounded-md"
                                                                />
                                                              </div>
                                                            )}
                                                          </div>
                                                        ))}
                                                    </div>
                                                  ) : (
                                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                      <p className="text-sm text-gray-500 font-roboto">No saved clothing items</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    };
                                  
                                    // Render the routines section
                                    const renderRoutinesSection = () => {
                                      const children = familyMembers.filter(member => member.role === 'child');
                                      
                                      if (children.length === 0) {
                                        return (
                                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500 font-roboto">No children added to your family yet</p>
                                          </div>
                                        );
                                      }
                                      
                                      const filteredChildren = activeChild ? children.filter(child => child.id === activeChild) : children;
                                      
                                      return (
                                        <div className="space-y-6">
                                          <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium font-roboto">Routines & Activities</h3>
                                            <div className="flex space-x-2">
                                              <button
                                                className="p-2 rounded-md hover:bg-gray-100"
                                                onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                                                title={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
                                              >
                                                {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
                                              </button>
                                              <button 
                                                className="p-2 rounded-md bg-black text-white hover:bg-gray-800"
                                                onClick={() => {
                                                  if (activeChild) {
                                                    setActiveComponent({
                                                      type: 'eventManager',
                                                      props: {
                                                        initialEvent: {
                                                          title: '',
                                                          description: '',
                                                          childId: activeChild,
                                                          childName: getChildName(activeChild),
                                                          dateTime: new Date().toISOString(),
                                                          category: 'activity',
                                                          eventType: 'activity',
                                                          isRecurring: true,
                                                          recurrence: {
                                                            frequency: 'weekly',
                                                            days: [],
                                                            endDate: ''
                                                          }
                                                        },
                                                        eventType: 'routine',
                                                        onSave: (result) => {
                                                          if (result.success) {
                                                            const routineData = {
                                                              id: Date.now().toString(),
                                                              title: result.eventData?.title || '',
                                                              days: result.eventData?.recurrence?.days || [],
                                                              startTime: result.eventData?.startTime || '09:00',
                                                              endTime: result.eventData?.endTime || '',
                                                              notes: result.eventData?.description || '',
                                                              childId: activeChild
                                                            };
                                                            
                                                            handleRoutineFormSubmit(routineData);
                                                            
                                                            setAllieMessage({
                                                              type: 'success',
                                                              text: 'Routine added successfully!'
                                                            });
                                                          }
                                                          setActiveComponent(null);
                                                        },
                                                        onCancel: () => setActiveComponent(null)
                                                      }
                                                    });
                                                  } else {
                                                    setAllieMessage({
                                                      type: 'warning',
                                                      text: 'Please select a child first before adding a routine.'
                                                    });
                                                  }
                                                }}
                                              >
                                                <Plus size={20} />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                                            {filteredChildren.map(child => (
                                              <div key={child.id} className={`bg-white rounded-lg shadow ${viewMode === 'card' ? 'p-4' : 'p-4'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                  <div className="flex items-center">
                                                    <UserAvatar user={child} size={40} className="mr-3" />
                                                    <div>
                                                      <h4 className="font-medium font-roboto text-lg">{child.name}'s Routines</h4>
                                                      <p className="text-sm text-gray-500 font-roboto">
                                                        {childrenData[child.id]?.routines?.length || 0} activities & routines
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="flex space-x-2">
                                                    <button 
                                                      className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                                                      onClick={() => {
                                                        setActiveComponent({
                                                          type: 'eventManager',
                                                          props: {
                                                            initialEvent: {
                                                              title: '',
                                                              description: '',
                                                              childId: child.id,
                                                              childName: child.name,
                                                              dateTime: new Date().toISOString(),
                                                              category: 'activity',
                                                              eventType: 'activity',
                                                              isRecurring: true,
                                                              recurrence: {
                                                                frequency: 'weekly',
                                                                days: [],
                                                                endDate: ''
                                                              }
                                                            },
                                                            eventType: 'routine',
                                                            onSave: (result) => {
                                                              if (result.success) {
                                                                const routineData = {
                                                                  id: Date.now().toString(),
                                                                  title: result.eventData?.title || '',
                                                                  days: result.eventData?.recurrence?.days || [],
                                                                  startTime: result.eventData?.startTime || '09:00',
                                                                  endTime: result.eventData?.endTime || '',
                                                                  notes: result.eventData?.description || '',
                                                                  childId: child.id
                                                                };
                                                                
                                                                handleRoutineFormSubmit(routineData);
                                                                
                                                                setAllieMessage({
                                                                  type: 'success',
                                                                  text: 'Routine added successfully!'
                                                                });
                                                              }
                                                              setActiveComponent(null);
                                                            },
                                                            onCancel: () => setActiveComponent(null)
                                                          }
                                                        });
                                                      }}
                                                    >
                                                      <PlusCircle size={14} className="mr-1" />
                                                      Add Routine
                                                    </button>
                                                  </div>
                                                </div>
                                                
                                                <div className="space-y-3 mb-6">
                                                  <div className="flex justify-between items-center">
                                                    <h5 className="font-medium text-sm font-roboto">Regular Routines</h5>
                                                  </div>
                                                  
                                                  {childrenData[child.id]?.routines?.filter(r => (r.days || []).length > 0).length > 0 ? (
                                                    childrenData[child.id].routines
                                                      .filter(r => (r.days || []).length > 0)
                                                      .map(routine => (
                                                        <div key={routine.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50">
                                                          <div className="flex justify-between">
                                                            <div>
                                                              <h5 className="font-medium font-roboto">{routine.title}</h5>
                                                              <p className="text-sm text-gray-600 font-roboto">
                                                                {(routine.days || []).join(', ')}
                                                              </p>
                                                              <p className="text-sm text-gray-600 font-roboto">
                                                                {routine.startTime}{routine.endTime ? ` - ${routine.endTime}` : ''}
                                                              </p>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                              <button 
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                                onClick={() => {
                                                                  setActiveComponent({
                                                                    type: 'eventManager',
                                                                    props: {
                                                                      initialEvent: {
                                                                        title: routine.title,
                                                                        description: routine.notes || '',
                                                                        childId: child.id,
                                                                        childName: child.name,
                                                                        dateTime: new Date().toISOString(),
                                                                        category: 'activity',
                                                                        eventType: 'activity',
                                                                        isRecurring: true,
                                                                        recurrence: {
                                                                          frequency: 'weekly',
                                                                          days: routine.days || [],
                                                                          endDate: ''
                                                                        },
                                                                        startTime: routine.startTime || '',
                                                                        endTime: routine.endTime || ''
                                                                      },
                                                                      eventType: 'routine',
                                                                      mode: 'edit',
                                                                      onSave: (result) => {
                                                                        if (result.success) {
                                                                          const updatedRoutine = {
                                                                            ...routine,
                                                                            title: result.eventData?.title || routine.title,
                                                                            days: result.eventData?.recurrence?.days || routine.days,
                                                                            startTime: result.eventData?.startTime || routine.startTime,
                                                                            endTime: result.eventData?.endTime || routine.endTime,
                                                                            notes: result.eventData?.description || routine.notes,
                                                                            childId: child.id
                                                                          };
                                                                          
                                                                          handleRoutineFormSubmit(updatedRoutine);
                                                                          
                                                                          setAllieMessage({
                                                                            type: 'success',
                                                                            text: 'Routine updated successfully!'
                                                                          });
                                                                        }
                                                                        setActiveComponent(null);
                                                                      },
                                                                      onCancel: () => setActiveComponent(null)
                                                                    }
                                                                  });
                                                                }}
                                                              >
                                                                <Edit size={16} />
                                                              </button>
                                                              <button 
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                onClick={() => handleRemoveItem('routine', child.id, routine.id)}
                                                              >
                                                                <Trash2 size={16} />
                                                              </button>
                                                            </div>
                                                          </div>
                                                          {routine.notes && (
                                                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                                                              <p>{routine.notes}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      ))
                                                  ) : (
                                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                      <p className="text-sm text-gray-500 font-roboto">No regular routines set up</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    };
                                  
                                    // Render main content
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
                                        
                                        {/* AI insights and alerts */}
{aiInsights.length > 0 && (
  <div className="bg-blue-50 rounded-lg p-4 mb-6">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-medium font-roboto text-blue-800 flex items-center">
        <Brain size={20} className="mr-2 text-blue-500" />
        Allie AI Insights
      </h3>
      <button 
        onClick={async () => {
          try {
            setLoadingSection("insights");
            await generateAiInsights(childrenData);
            setLoadingSection(null);
            setAllieMessage({
              type: 'success',
              text: 'AI insights refreshed successfully!'
            });
          } catch (error) {
            console.error("Error refreshing insights:", error);
            setLoadingSection(null);
            setAllieMessage({
              type: 'error',
              text: 'Error refreshing insights. Please try again.'
            });
          }
        }}
        className={`p-2 rounded hover:bg-blue-100 ${loadingSection === "insights" ? "animate-spin" : ""}`}
        disabled={loadingSection === "insights"}
        title="Refresh insights"
      >
        <RefreshCw size={18} className="text-blue-600" />
      </button>
    </div>
    
    <div className="space-y-2">
      {aiInsights.slice(0, 3).map((insight, index) => (
        <button 
          key={index} 
          className="bg-white p-3 rounded-md shadow-sm w-full text-left hover:bg-blue-50 transition-colors"
          onClick={() => {
            // Navigate to relevant section based on insight type
            if (insight.type === 'medical') {
              setExpandedSections(prev => ({...prev, medical: true}));
              if (insight.childId) setActiveChild(insight.childId);
              const section = document.querySelector('#medical-section');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            } 
            else if (insight.type === 'growth') {
              setExpandedSections(prev => ({...prev, growth: true}));
              if (insight.childId) setActiveChild(insight.childId);
              const section = document.querySelector('#growth-section');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }
            else if (insight.type === 'clothes') {
              setExpandedSections(prev => ({...prev, growth: true}));
              if (insight.childId) setActiveChild(insight.childId);
              const section = document.querySelector('#growth-section');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }
            else if (insight.type === 'routine') {
              setExpandedSections(prev => ({...prev, routines: true}));
              if (insight.childId) setActiveChild(insight.childId);
              const section = document.querySelector('#routines-section');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-start">
            <div className={`p-2 rounded-full flex-shrink-0 mr-3 ${
              insight.priority === 'high' 
                ? 'bg-red-100 text-red-600' 
                : insight.priority === 'medium'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}>
              {insight.type === 'medical' ? (
                <Heart size={16} />
              ) : insight.type === 'growth' ? (
                <Activity size={16} />
              ) : insight.type === 'recommendation' ? (
                <Info size={16} />
              ) : insight.type === 'clothes' ? (
                <Tag size={16} />
              ) : (
                <Star size={16} />
              )}
            </div>
            <div className="flex-grow">
              <h4 className="font-medium text-sm font-roboto flex items-center">
                {insight.title}
                {insight.childId && (
                  <div className="ml-2">
                    <UserAvatar 
                      user={familyMembers.find(m => m.id === insight.childId)} 
                      size={20} 
                    />
                  </div>
                )}
              </h4>
              <p className="text-sm text-gray-700 font-roboto mt-1">{insight.content}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
)}
{/* AI insights and alerts */}
{Array.isArray(aiInsights) && aiInsights.length > 0 && (
  <div className="bg-blue-50 rounded-lg p-4 mb-6">
    {/* Rest of the aiInsights code */}
  </div>
)}
                                        
                                        {/* Error message */}
                                        {tabError && (
                                          <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 mb-6 flex items-start">
                                            <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <p className="font-medium mb-1 font-roboto">Error loading data</p>
                                              <p className="text-sm font-roboto">{tabError}</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Top bar with controls */}
                                        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
                                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                            <div className="mb-4 sm:mb-0">
                                              <h2 className="text-xl font-bold font-roboto mb-1">Family Command Center</h2>
                                              <p className="text-gray-600 font-roboto text-sm">
                                                Track your children's growth, health, routines, and more
                                              </p>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-3">
                                              {/* Profile selector chips */}
<div className="flex flex-wrap gap-2">
  <button
    onClick={() => setActiveChild(null)}
    className={`flex items-center px-3 py-2 rounded-md text-sm ${
      !activeChild 
        ? 'bg-black text-white font-medium' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    <Users size={16} className="mr-2" />
    All Family
  </button>
  
  {familyMembers
    .filter(member => member.role === 'child')
    .map(child => (
      <button
        key={child.id}
        onClick={() => setActiveChild(child.id)}
        className={`flex items-center px-3 py-2 rounded-md text-sm ${
          activeChild === child.id 
            ? 'bg-blue-500 text-white font-medium' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <UserAvatar user={child} size={24} className="mr-2" />
        {child.name} {child.age ? `(${child.age})` : ''}
      </button>
    ))}
  
  {familyMembers
    .filter(member => member.role === 'parent')
    .map(parent => (
      <button
        key={parent.id}
        onClick={() => setActiveChild(parent.id)}
        className={`flex items-center px-3 py-2 rounded-md text-sm ${
          activeChild === parent.id 
            ? 'bg-purple-500 text-white font-medium' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <UserAvatar user={parent} size={24} className="mr-2" />
        {parent.name}
      </button>
    ))}
</div>
{/* Family Kanban Board */}
<div className="mt-8 border border-gray-200 rounded-lg bg-white">
  <div className="p-4">
    <FamilyKanbanBoard />
  </div>
</div>
                                              
                                              {/* Search */}
                                              <div className="relative">
                                                <input
                                                  type="text"
                                                  ref={searchInputRef}
                                                  value={searchQuery}
                                                  onChange={handleSearch}
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
                                          </div>
                                        </div>
                                        
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
                                                      onClick={recognizeSpeech}
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
                                        
                                        {/* Main content sections */}
                                        <div className="space-y-8">
                                          {/* Medical section */}
                                          <div id="medical-section">

                                            <button
                                              onClick={() => toggleSection('medical')}
                                              className="w-full flex items-center justify-between bg-white p-3 rounded-t-lg shadow-sm font-medium font-roboto mb-1"
                                            >
                                              <div className="flex items-center">
                                                <Heart size={18} className="mr-2 text-red-500" />
                                                Families Medical Appointments & Records
                                                {notifications.medical > 0 && (
                                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {notifications.medical}
                                                  </span>
                                                )}
                                              </div>
                                              {expandedSections.medical ? (
                                                <ChevronUp size={18} className="text-gray-500" />
                                              ) : (
                                                <ChevronDown size={18} className="text-gray-500" />
                                              )}
                                            </button>
                                            
                                            {expandedSections.medical && renderMedicalSection()}
                                          </div>
                                          
                                          {/* Growth section */}
                                          <div id="growth-section">

                                            <button
                                              onClick={() => toggleSection('growth')}
                                              className="w-full flex items-center justify-between bg-white p-3 rounded-t-lg shadow-sm font-medium font-roboto mb-1"
                                            >
                                              <div className="flex items-center">
                                                <Activity size={18} className="mr-2 text-blue-500" />
                                                Kids Growth & Development
                                                {notifications.growth > 0 && (
                                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {notifications.growth}
                                                  </span>
                                                )}
                                              </div>
                                              {expandedSections.growth ? (
                                                <ChevronUp size={18} className="text-gray-500" />
                                              ) : (
                                                <ChevronDown size={18} className="text-gray-500" />
                                              )}
                                            </button>
                                            
                                            {expandedSections.growth && renderGrowthSection()}
                                          </div>
                                          
                                          {/* Routines section */}
                                          <div id="routines-section">

                                            <button
                                              onClick={() => toggleSection('routines')}
                                              className="w-full flex items-center justify-between bg-white p-3 rounded-t-lg shadow-sm font-medium font-roboto mb-1"
                                            >
                                              <div className="flex items-center">
                                                <CalendarIcon size={18} className="mr-2 text-purple-500" />
                                                Kids Routines & Activities
                                                {notifications.routines > 0 && (
                                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {notifications.routines}
                                                  </span>
                                                )}
                                              </div>
                                              {expandedSections.routines ? (
                                                <ChevronUp size={18} className="text-gray-500" />
                                              ) : (
                                                <ChevronDown size={18} className="text-gray-500" />
                                              )}
                                            </button>
                                            
                                            {expandedSections.routines && renderRoutinesSection()}
                                          </div>
                                          
                                          
                                                  {/* Document Library Section */}
  <div className="border border-gray-200 rounded-lg bg-white">
    <button
      onClick={() => toggleSection('documents')}
      className="w-full flex items-center justify-between p-3 font-medium font-roboto"
    >
      <div className="flex items-center">
        <FileText size={18} className="mr-2 text-orange-500" />
        Family Document Library
      </div>
      {expandedSections.documents ? (
        <ChevronUp size={18} className="text-gray-500" />
      ) : (
        <ChevronDown size={18} className="text-gray-500" />
      )}
    </button>
    
    {expandedSections.documents && (
      <div className="p-4 border-t border-gray-200">
        <DocumentLibrary 
          initialChildId={activeChild} 
          onClose={() => setExpandedSections(prev => ({...prev, documents: false}))}
        />
      </div>
    )}
  </div>

  {/* Provider Directory Section */}
  <div className="border border-gray-200 rounded-lg bg-white">
    <button
      onClick={() => toggleSection('providers')}
      className="w-full flex items-center justify-between p-3 font-medium font-roboto"
    >
      <div className="flex items-center">
        <User size={18} className="mr-2 text-purple-500" />
        Family Provider Directory
      </div>
      {expandedSections.providers ? (
        <ChevronUp size={18} className="text-gray-500" />
      ) : (
        <ChevronDown size={18} className="text-gray-500" />
      )}
    </button>
    
    {expandedSections.providers && (
      <div className="p-4 border-t border-gray-200">
        <ProviderDirectory 
          familyId={familyId}
          providers={healthcareProviders}
          loadingProviders={loadingProviders}
          onAddProvider={(providerData) => handleProviderSubmit(providerData)}
          onUpdateProvider={(providerData) => handleProviderSubmit(providerData)}
          onDeleteProvider={(providerId) => handleProviderDelete(providerId)}
        />
      </div>
    )}
  </div>

                                              </div>
                                          
                                        
                                        
                                        
                                        
                                        {/* Render active component (EnhancedEventManager, etc.) */}
                                        {activeComponent && (
                                          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                            {activeComponent.type === 'eventManager' && (
                                              <EnhancedEventManager {...activeComponent.props} />
                                            )}
                                            {activeComponent.type === 'documentLibrary' && (
                                              <DocumentLibrary {...activeComponent.props} />
                                            )}
                                          </div>
                                        )}
                                  
                                        {/* Only keep the provider modal since we're not replacing it with EnhancedEventManager */}
                                        {activeModal === 'provider' && (
                                          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                                              <div className="p-4 border-b flex justify-between items-center">
                                                <h3 className="text-lg font-medium font-roboto">
                                                  {modalData.id ? 'Edit' : 'Add'} Healthcare Provider
                                                </h3>
                                                <button className="text-gray-500 hover:text-gray-700" onClick={closeModal}>
                                                  <X size={20} />
                                                </button>
                                              </div>
                                              
                                              <div className="p-4">
                                                <div className="space-y-4">
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                      Provider Name
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={modalData.name || ''}
                                                      onChange={e => setModalData({...modalData, name: e.target.value})}
                                                      className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                      placeholder="e.g., Dr. Smith"
                                                    />
                                                  </div>
                                                  
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                      Specialty
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={modalData.specialty || ''}
                                                      onChange={e => setModalData({...modalData, specialty: e.target.value})}
                                                      className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                      placeholder="e.g., Pediatrician, Dentist, etc."
                                                    />
                                                  </div>
                                                  
                                                  <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                        Phone
                                                      </label>
                                                      <input
                                                        type="tel"
                                                        value={modalData.phone || ''}
                                                        onChange={e => setModalData({...modalData, phone: e.target.value})}
                                                        className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                        placeholder="e.g., 555-555-5555"
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                        Email
                                                      </label>
                                                      <input
                                                        type="email"
                                                        value={modalData.email || ''}
                                                        onChange={e => setModalData({...modalData, email: e.target.value})}
                                                        className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                        placeholder="e.g., doctor@example.com"
                                                      />
                                                    </div>
                                                  </div>
                                                  
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                      Address
                                                    </label>
                                                    <textarea
                                                      value={modalData.address || ''}
                                                      onChange={e => setModalData({...modalData, address: e.target.value})}
                                                      className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                      rows={2}
                                                      placeholder="Practice address"
                                                    />
                                                  </div>
                                                  
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                                                      Notes
                                                    </label>
                                                    <textarea
                                                      value={modalData.notes || ''}
                                                      onChange={e => setModalData({...modalData, notes: e.target.value})}
                                                      className="w-full px-3 py-2 border rounded-md text-sm font-roboto"
                                                      rows={2}
                                                      placeholder="Additional notes about this provider"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="p-4 border-t flex justify-end space-x-3">
                                                <button
                                                  type="button"
                                                  onClick={closeModal}
                                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-roboto"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleProviderSubmit(modalData)}
                                                  disabled={loadingSection === 'provider'}
                                                  className={`px-4 py-2 text-sm font-medium rounded-md font-roboto ${
                                                    loadingSection === 'provider'
                                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                      : 'bg-black text-white hover:bg-gray-800'
                                                  }`}
                                                >
                                                  {loadingSection === 'provider' ? 'Saving...' : 'Save'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                  
                                  };
                                  
                                  export default ChildrenTrackingTab;