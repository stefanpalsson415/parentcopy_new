import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar, ChevronDown, ChevronUp, Clock, Heart, AlertCircle, 
  Activity, Users, Star, Clipboard, Camera, Plus, Edit, Trash2, 
  CheckCircle, Info, Brain, Smile, Frown, Apple, Upload, 
  Search, X, RefreshCw, Settings, List, Grid, HelpCircle,
  FileText, Download, Save, Paperclip, User, PlusCircle, Mic
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { db, storage } from '../../../services/firebase';
import { 
  doc, getDoc, updateDoc, setDoc, collection, 
  query, where, getDocs, serverTimestamp, addDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DatabaseService from '../../../services/DatabaseService';
import CalendarService from '../../../services/CalendarService';
import AllieAIService from '../../../services/AllieAIService';


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
    medical: true,
    growth: true,
    routines: false
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

  // Enhanced AI insights generation with service integration and local fallback
  const generateAiInsights = useCallback(async (data) => {
    try {
      if (!familyId || !data) {
        setAiInsights([]);
        return;
      }
      
      // Try to get insights from AI service
      try {
        console.log("Requesting AI-generated child insights from AllieAIService");
        const aiInsights = await AllieAIService.generateChildInsights(familyId, data);
        
        if (aiInsights && aiInsights.length > 0) {
          console.log(`Received ${aiInsights.length} AI-generated insights`);
          setAiInsights(aiInsights);
          return;
        }
      } catch (serviceError) {
        console.warn("AI service error, falling back to local insights:", serviceError);
      }
      
      // If AI service fails or returns no insights, fall back to local generation
      console.log("Generating local insights as fallback");
      const localInsights = generateLocalInsights(data);
      setAiInsights(localInsights);
      
    } catch (error) {
      console.error("Error in insight generation:", error);
      setAiInsights([]);
    }
  }, [familyId]);

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

  // Local fallback implementation for generating insights
  const generateLocalInsights = useCallback((data) => {
    // For a simplified version, create some dynamic insights based on the data
    const insights = [];
    
    // Process data for each child
    Object.keys(data).forEach(childId => {
      const childData = data[childId];
      const childName = getChildName(childId);
      const childAge = getChildAge(childId);
      
      // Medical appointment insights
      if (childData.medicalAppointments && childData.medicalAppointments.length > 0) {
        // Check for upcoming appointments
        const upcomingAppointments = childData.medicalAppointments.filter(apt => 
          !apt.completed && new Date(apt.date) > new Date()
        );
        
        if (upcomingAppointments.length > 0) {
          const nextAppointment = upcomingAppointments.sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          )[0];
          
          insights.push({
            type: "medical",
            title: "Upcoming Medical Appointment",
            content: `${childName} has a ${nextAppointment.title} appointment on ${formatDate(nextAppointment.date)}${nextAppointment.time ? ` at ${nextAppointment.time}` : ''}.`,
            priority: "medium",
            childId: childId
          });
        }
        
        // Check if child is due for a check-up based on their age
        if (childAge) {
          // Example age-based checkup recommendation
          const lastCheckup = childData.medicalAppointments.filter(apt => 
            apt.title.toLowerCase().includes('checkup') || apt.title.toLowerCase().includes('check-up')
          ).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          
          const checkupRecommendation = getCheckupRecommendation(childAge, lastCheckup);
          if (checkupRecommendation) {
            insights.push({
              type: "recommendation",
              title: "Checkup Recommendation",
              content: `${childName} ${checkupRecommendation}`,
              priority: "high",
              childId: childId
            });
          }
        }
      } else if (childAge) {
        // No appointments recorded, recommend initial checkup
        insights.push({
          type: "recommendation",
          title: "Initial Medical Record",
          content: `Consider adding ${childName}'s doctor information and scheduling a checkup to start building their medical history.`,
          priority: "medium",
          childId: childId
        });
      }
      
      // Growth insights
      if (childData.growthData && childData.growthData.length > 0) {
        // Check if growth data is recent
        const latestGrowthEntry = childData.growthData.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        )[0];
        
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
        
        // Check for shoe size and clothing size updates
        if (childData.growthData.length >= 2) {
          const twoLatestEntries = childData.growthData
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 2);
          
          if (twoLatestEntries[0].shoeSize !== twoLatestEntries[1].shoeSize && twoLatestEntries[0].shoeSize) {
            insights.push({
              type: "growth",
              title: "Shoe Size Change",
              content: `${childName}'s shoe size has changed from ${twoLatestEntries[1].shoeSize} to ${twoLatestEntries[0].shoeSize}. You might need to update their footwear.`,
              priority: "medium",
              childId: childId
            });
          }
          
          if (twoLatestEntries[0].clothingSize !== twoLatestEntries[1].clothingSize && twoLatestEntries[0].clothingSize) {
            insights.push({
              type: "growth",
              title: "Clothing Size Change",
              content: `${childName}'s clothing size has changed from ${twoLatestEntries[1].clothingSize} to ${twoLatestEntries[0].clothingSize}. You might want to check if their clothes still fit.`,
              priority: "medium",
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

      // Hand-me-down insights
      if (childData.clothesHandMeDowns && childData.clothesHandMeDowns.length > 0) {
        const readyItems = childData.clothesHandMeDowns.filter(item => {
          const readyDate = new Date(item.readyDate);
          const today = new Date();
          return !item.used && readyDate <= today;
        });
        
        if (readyItems.length > 0) {
          insights.push({
            type: "clothes",
            title: "Hand-Me-Downs Ready",
            content: `${childName} has ${readyItems.length} saved clothing ${readyItems.length === 1 ? 'item' : 'items'} ready to be used.`,
            priority: "low",
            childId: childId
          });
        }
      }
    });
    
    // Sort insights by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    insights.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return insights;
  }, [getChildName, getChildAge, formatDate, getCheckupRecommendation]);

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
    
    // Open the appointment modal with pre-filled data
    openModal('appointment', {
      title: `${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)}`,
      date: date.toISOString().split('T')[0],
      time: '09:00',
      doctor: '',
      notes: `Voice entry: "${text}"`,
      childId: childId,
      completed: false,
      documents: []
    });

    setAllieMessage({
      type: 'success',
      text: `I've started creating a ${appointmentType} appointment. Please review and add any missing details.`
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
    
    // Open the growth modal with pre-filled data
    openModal('growth', {
      height: height,
      weight: weight,
      shoeSize: '',
      clothingSize: '',
      date: new Date().toISOString().split('T')[0],
      childId: childId
    });

    setAllieMessage({
      type: 'success',
      text: `I've started recording growth data. Please review and add any missing measurements.`
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
    
    openModal('routine', {
      title: routineTitle,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: '08:00',
      endTime: '',
      notes: `Voice entry: "${text}"`,
      childId: childId
    });

    setAllieMessage({
      type: 'success',
      text: `I've started creating a ${routineTitle.toLowerCase()}. Please review and add any missing details.`
    });
  };

  // Open modal with data
  const openModal = (modalType, data) => {
    setActiveModal(modalType);
    setModalData(data);
    
    // If opening an appointment modal, load associated documents
    if (modalType === 'appointment' && data.id) {
      loadAppointmentDocuments(data.childId, data.id);
    }
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
  
  useEffect(() => {
    const loadChildrenData = async () => {
      try {
        if (!familyId) return;
        
        setLoading(true);
        console.log("Loading children data...");
        
        const docRef = doc(db, "families", familyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const familyData = docSnap.data();
          
          // Check if we have children data structure, if not create it
          if (!familyData.childrenData) {
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
            
            // Save initial structure to Firebase
            await updateDoc(docRef, {
              childrenData: initialChildrenData
            });
            
            setChildrenData(initialChildrenData);
          } else {
            setChildrenData(familyData.childrenData);
          }
          
          // Generate AI insights based on the children data
          if (familyData.childrenData) {
            await generateAiInsights(familyData.childrenData);
          }
          
          // Set active child to the first child if none is selected
          if (!activeChild && familyMembers.filter(m => m.role === 'child').length > 0) {
            setActiveChild(familyMembers.filter(m => m.role === 'child')[0].id);
          }
          
          // Update notification counts
          updateNotificationCounts(familyData.childrenData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading children data:", error);
        setLoading(false);
        setTabError("There was an error loading children data. Please try refreshing the page.");
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
        
        // Create calendar event
        const calendarEvent = {
          summary: `${getChildName(childId)}'s ${formData.title}`,
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
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 } // 1 hour before
            ]
          }
        };
        
        // Add to calendar
        if (CalendarService) {
          await CalendarService.addEvent(calendarEvent, currentUser?.uid);
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
  
  // Render the medical appointments section
  const renderMedicalSection = () => {
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
                  openModal('appointment', {
                    title: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    doctor: '',
                    notes: '',
                    childId: activeChild,
                    completed: false,
                    documents: []
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding an appointment.'
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
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img 
                      src={child.profilePicture || '/api/placeholder/40/40'} 
                      alt={child.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Health</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.medicalAppointments?.length || 0} appointments
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
                    onClick={() => openModal('appointment', {
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      time: '09:00',
                      doctor: '',
                      notes: '',
                      childId: child.id,
                      completed: false,
                      documents: []
                    })}
                  >
                    <PlusCircle size={14} className="mr-1" />
                    Add Appointment
                  </button>
                </div>
              </div>
              
              {/* Recommended checkups based on age */}
              {child.age && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm font-roboto mb-1 flex items-center">
                    <Info size={14} className="text-blue-500 mr-1" />
                    Recommended for {child.age} years old
                  </h5>
                  <ul className="text-sm font-roboto space-y-1">
                    {child.age < 1 && (
                      <>
                        <li>• Well-baby checkups at 1, 2, 4, 6, 9, and 12 months</li>
                        <li>• Multiple immunizations throughout first year</li>
                      </>
                    )}
                    {child.age >= 1 && child.age < 3 && (
                      <>
                        <li>• Well-child checkups at 15, 18, 24, and 30 months</li>
                        <li>• First dental visit by age 1</li>
                        <li>• Vision screening</li>
                      </>
                    )}
                    {child.age >= 3 && child.age < 6 && (
                      <>
                        <li>• Annual well-child checkups</li>
                        <li>• Dental checkups every 6 months</li>
                        <li>• Vision and hearing screening</li>
                      </>
                    )}
                    {child.age >= 6 && child.age < 12 && (
                      <>
                        <li>• Annual well-child checkups</li>
                        <li>• Dental checkups every 6 months</li>
                        <li>• Vision and hearing screenings</li>
                        <li>• Sports physicals if applicable</li>
                      </>
                    )}
                    {child.age >= 12 && (
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
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-sm font-roboto">Upcoming Appointments</h5>
                  <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                </div>
                
                {childrenData[child.id]?.medicalAppointments?.filter(a => !a.completed && new Date(a.date) >= new Date()).length > 0 ? (
                  childrenData[child.id].medicalAppointments
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
                              onClick={() => openModal('appointment', {...appointment, childId: child.id})}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              onClick={() => handleRemoveItem('appointment', child.id, appointment.id)}
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
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <h5 className="font-medium text-sm font-roboto">Past Appointments</h5>
                </div>
                
                {childrenData[child.id]?.medicalAppointments?.filter(a => a.completed || new Date(a.date) < new Date()).length > 0 ? (
                  childrenData[child.id].medicalAppointments
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
                              onClick={() => openModal('appointment', {...appointment, childId: child.id})}
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
                  openModal('growth', {
                    height: '',
                    weight: '',
                    shoeSize: '',
                    clothingSize: '',
                    date: new Date().toISOString().split('T')[0],
                    childId: activeChild
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
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img 
                      src={child.profilePicture || '/api/placeholder/40/40'} 
                      alt={child.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
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
                    onClick={() => openModal('growth', {
                      height: '',
                      weight: '',
                      shoeSize: '',
                      clothingSize: '',
                      date: new Date().toISOString().split('T')[0],
                      childId: child.id
                    })}
                  >
                    <PlusCircle size={14} className="mr-1" />
                    Add Measurement
                  </button>
                  <button 
                    className="px-3 py-1 border border-black text-black rounded-md text-sm hover:bg-gray-50 font-roboto flex items-center"
                    onClick={() => openModal('handmedown', {
                      name: '',
                      description: '',
                      size: '',
                      readyDate: new Date().toISOString().split('T')[0],
                      childId: child.id,
                      used: false
                    })}
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
                                    <span className="font-medium font-roboto">Clothes:</span>{' '}
                                    <span className="font-roboto">{latestGrowth.clothingSize}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('growth', {...latestGrowth, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('growth', child.id, latestGrowth.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Growth chart placeholder */}
                    <div className="border rounded-lg p-3 flex flex-col items-center justify-center">
                      <Activity size={24} className="text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 font-roboto text-center">
                        Tracking growth helps identify important development patterns
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No growth measurements recorded yet</p>
                    <button 
                      className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-roboto"
                      onClick={() => openModal('growth', {
                        height: '',
                        weight: '',
                        shoeSize: '',
                        clothingSize: '',
                        date: new Date().toISOString().split('T')[0],
                        childId: child.id
                      })}
                    >
                      Add First Measurement
                    </button>
                  </div>
                )}
              </div>
              
              {/* History */}
              <div>
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-sm font-roboto">Measurement History</h5>
                  <button className="text-xs text-blue-600 hover:underline font-roboto">
                    View all
                  </button>
                </div>
                
                {childrenData[child.id]?.growthData?.length > 1 ? (
                  <div className="mt-2">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Height
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Weight
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Shoe
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Clothing
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {childrenData[child.id].growthData
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 5)
                            .map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  {entry.height || '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  {entry.weight || '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  {entry.shoeSize || '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  {entry.clothingSize || '-'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-roboto">
                                  <div className="flex space-x-2">
                                    <button 
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                      onClick={() => openModal('growth', {...entry, childId: child.id})}
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      onClick={() => handleRemoveItem('growth', child.id, entry.id)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg mt-2">
                    <p className="text-sm text-gray-500 font-roboto">No measurement history available</p>
                  </div>
                )}
              </div>
              
              {/* Hand-me-downs section */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm font-roboto">Saved Clothes & Hand-Me-Downs</h5>
                  <button
                    className="text-xs text-blue-600 hover:underline font-roboto"
                    onClick={() => openModal('handmedown', {
                      name: '',
                      description: '',
                      size: '',
                      readyDate: new Date().toISOString().split('T')[0],
                      childId: child.id,
                      used: false
                    })}
                  >
                    Add Item
                  </button>
                </div>
                
                {childrenData[child.id]?.clothesHandMeDowns?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {childrenData[child.id].clothesHandMeDowns
                      .filter(item => !item.used)
                      .sort((a, b) => new Date(a.readyDate) - new Date(b.readyDate))
                      .slice(0, 4)
                      .map(item => (
                        <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h6 className="font-medium text-sm font-roboto">{item.name}</h6>
                              <p className="text-xs text-gray-600 font-roboto">
                                Size: {item.size || 'Not specified'}
                              </p>
                              <p className="text-xs text-gray-600 font-roboto">
                                Ready: {formatDate(item.readyDate)}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                onClick={() => markHandMeDownAsUsed(child.id, item.id)}
                                title="Mark as used"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('handmedown', {...item, childId: child.id})}
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
                          {item.description && (
                            <p className="text-xs mt-1 text-gray-600 font-roboto">{item.description}</p>
                          )}
                          {item.imageUrl && (
                            <div className="mt-2">
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="h-20 w-auto object-cover rounded"
                              />
                            </div>
                          )}
                          {new Date(item.readyDate) <= new Date() && (
                            <div className="mt-1 flex items-center">
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-roboto">
                                Ready to use
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No saved clothes items</p>
                  </div>
                )}
                
                {childrenData[child.id]?.clothesHandMeDowns?.filter(item => item.used)?.length > 0 && (
                  <div className="mt-3">
                    <h6 className="text-xs font-medium text-gray-500 font-roboto mb-1">Past Items</h6>
                    <div className="text-xs text-gray-500 font-roboto">
                      {childrenData[child.id].clothesHandMeDowns.filter(item => item.used).length} items have been used
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render routines section
  const renderRoutinesSection = () => {
    if (!expandedSections.routines) {
      return null;
    }
    
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
      <div className="space-y-6 p-4 bg-white rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium font-roboto">Daily Routines & Activities</h3>
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
                  openModal('routine', {
                    title: '',
                    days: [],
                    startTime: '08:00',
                    endTime: '',
                    notes: '',
                    childId: activeChild
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
            <div key={child.id} className={`bg-white