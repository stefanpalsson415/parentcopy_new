import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, ChevronDown, ChevronUp, Clock, Heart, AlertCircle, BookOpen, 
  Activity, Users, Cake, Star, Clipboard, Utensils, Gift, PlusCircle, 
  Edit, Trash2, CheckCircle, Camera, MessageCircle, BarChart2, Filter, 
  Info, Brain, AlarmClock, School, Music, User, Smile, Frown, Apple, 
  FileText, Award, MapPin, Bell, Sun, Moon, Ban, Palette, ThumbsUp, 
  Coffee, Upload, Search, Plus, X, Mail, ArrowUp, ArrowDown, Mic, 
  Smartphone, RefreshCw, Zap, MessageSquare, Check, Settings, Layers,
  List, Grid, HelpCircle
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../services/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import DatabaseService from '../../../services/DatabaseService';
import AllieAIEngineService from '../../../services/AllieAIEngineService';
import CalendarService from '../../../services/CalendarService';

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
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [allieMessage, setAllieMessage] = useState(null);
  const [newVoiceEntry, setNewVoiceEntry] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    medical: true,
    growth: true,
    routines: false,
    homework: false,
    activities: false,
    emotional: false,
    meals: false,
    events: false,
    milestones: false
  });

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});
  
  // Refs
  const searchInputRef = useRef(null);
  const microphoneRef = useRef(null);
  
  // Notification badge counts
  const [notifications, setNotifications] = useState({
    medical: 0,
    growth: 0,
    routines: 0,
    homework: 0,
    activities: 0,
    emotional: 0,
    meals: 0,
    events: 0,
    milestones: 0
  });

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
    // Simple example - in a real implementation, this would use natural language processing
    // and connect to Claude or another NLP service
    
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
      else if (lowerText.includes('homework') || lowerText.includes('assignment')) {
        handleVoiceHomework(text);
      }
      else if (lowerText.includes('activity') || lowerText.includes('class')) {
        handleVoiceActivity(text);
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
      completed: false
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

  // Handle voice homework commands
  const handleVoiceHomework = (text) => {
    // Extract child, subject, due date, etc.
    const childMatches = familyMembers
      .filter(m => m.role === 'child')
      .filter(child => text.toLowerCase().includes(child.name.toLowerCase()));
    
    const childId = childMatches.length > 0 ? childMatches[0].id : activeChild;
    
    if (!childId) {
      setAllieMessage({
        type: 'warning',
        text: "I didn't catch which child this homework is for. Please try again or select a child first."
      });
      return;
    }

    // Mock subject extraction
    let subject = 'General';
    if (text.toLowerCase().includes('math')) subject = 'Math';
    else if (text.toLowerCase().includes('science')) subject = 'Science';
    else if (text.toLowerCase().includes('english') || text.toLowerCase().includes('reading')) subject = 'English';
    
    // Default due date (one week)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    openModal('homework', {
      title: `Homework Assignment`,
      subject: subject,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Voice entry: "${text}"`,
      priority: 'medium',
      completed: false,
      childId: childId
    });

    setAllieMessage({
      type: 'success',
      text: `I've started creating a ${subject} homework entry. Please review and add any missing details.`
    });
  };

  // Handle voice activity commands
  const handleVoiceActivity = (text) => {
    const childMatches = familyMembers
      .filter(m => m.role === 'child')
      .filter(child => text.toLowerCase().includes(child.name.toLowerCase()));
    
    const childId = childMatches.length > 0 ? childMatches[0].id : activeChild;
    
    if (!childId) {
      setAllieMessage({
        type: 'warning',
        text: "I didn't catch which child this activity is for. Please try again or select a child first."
      });
      return;
    }

    // Mock activity type extraction
    let activityType = 'other';
    if (text.toLowerCase().includes('soccer') || text.toLowerCase().includes('basketball') || 
        text.toLowerCase().includes('swimming')) {
      activityType = 'sports';
    } else if (text.toLowerCase().includes('art') || text.toLowerCase().includes('craft') || 
               text.toLowerCase().includes('drawing')) {
      activityType = 'art';
    } else if (text.toLowerCase().includes('music') || text.toLowerCase().includes('piano') || 
               text.toLowerCase().includes('guitar')) {
      activityType = 'music';
    }
    
    // Default start date (next week)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    
    openModal('activity', {
      title: `New Activity`,
      type: activityType,
      location: '',
      startDate: startDate.toISOString().split('T')[0],
      endDate: '',
      repeatDay: [],
      time: '',
      notes: `Voice entry: "${text}"`,
      childId: childId
    });

    setAllieMessage({
      type: 'success',
      text: `I've started creating a ${activityType} activity. Please review and add any missing details.`
    });
  };

  // Open modal with data
  const openModal = (modalType, data) => {
    setActiveModal(modalType);
    setModalData(data);
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setModalData({});
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get child name by ID
  const getChildName = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : "Unknown Child";
  };

  // Get child age by ID
  const getChildAge = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.age : null;
  };

  // Get child's profile picture
  const getChildProfilePicture = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child && child.profilePicture ? child.profilePicture : '/api/placeholder/48/48';
  };
  
  // ---- API Integration Functions ----
  
  // Fetch children's data on component mount
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
                  homework: [],
                  activities: [],
                  emotionalChecks: [],
                  meals: {
                    allergies: [],
                    preferences: [],
                    restrictions: []
                  },
                  events: [],
                  milestones: []
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
            generateAiInsights(familyData.childrenData);
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
  }, [familyId, familyMembers]);
  
  // Update notification counts based on data
  const updateNotificationCounts = (data) => {
    if (!data) return;
    
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    const counts = {
      medical: 0,
      growth: 0,
      routines: 0,
      homework: 0,
      activities: 0,
      emotional: 0,
      meals: 0,
      events: 0,
      milestones: 0
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
      
      // Homework due in the next week
      if (childData.homework) {
        counts.homework += childData.homework.filter(hw => {
          const dueDate = new Date(hw.dueDate);
          return !hw.completed && dueDate >= today && dueDate <= oneWeekFromNow;
        }).length;
      }
      
      // Activities starting in the next week
      if (childData.activities) {
        counts.activities += childData.activities.filter(act => {
          const startDate = new Date(act.startDate);
          return startDate >= today && startDate <= oneWeekFromNow;
        }).length;
      }
      
      // Emotional checks - notify if no check-in in the last week
      if (childData.emotionalChecks && childData.emotionalChecks.length > 0) {
        const lastCheckDate = new Date(Math.max(...childData.emotionalChecks.map(c => new Date(c.date))));
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        
        if (lastCheckDate < oneWeekAgo) {
          counts.emotional += 1;
        }
      } else {
        // No emotional checks at all
        counts.emotional += 1;
      }
      
      // Events in the next week
      if (childData.events) {
        counts.events += childData.events.filter(evt => {
          const eventDate = new Date(evt.date);
          return eventDate >= today && eventDate <= oneWeekFromNow;
        }).length;
      }
    });
    
    setNotifications(counts);
  };
  
  // Generate AI insights for children data
  const generateAiInsights = async (data) => {
    try {
      // For a real implementation, we would call AllieAIEngineService
      // For now, create some dynamic insights based on the data
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
        
        // Homework insights
        if (childData.homework && childData.homework.length > 0) {
          // Check for overdue homework
          const overdueHomework = childData.homework.filter(hw => 
            !hw.completed && new Date(hw.dueDate) < new Date()
          );
          
          if (overdueHomework.length > 0) {
            insights.push({
              type: "homework",
              title: "Overdue Homework",
              content: `${childName} has ${overdueHomework.length} overdue ${overdueHomework.length === 1 ? 'assignment' : 'assignments'} that ${overdueHomework.length === 1 ? 'needs' : 'need'} attention.`,
              priority: "high",
              childId: childId
            });
          }
          
          // Check for upcoming homework
          const upcomingHomework = childData.homework.filter(hw => {
            const dueDate = new Date(hw.dueDate);
            const today = new Date();
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(today.getDate() + 2);
            
            return !hw.completed && dueDate >= today && dueDate <= twoDaysFromNow;
          });
          
          if (upcomingHomework.length > 0) {
            insights.push({
              type: "homework",
              title: "Upcoming Assignments",
              content: `${childName} has ${upcomingHomework.length} ${upcomingHomework.length === 1 ? 'assignment' : 'assignments'} due in the next two days.`,
              priority: "medium",
              childId: childId
            });
          }
        }
        
        // Emotional well-being insights
        if (childData.emotionalChecks && childData.emotionalChecks.length > 0) {
          // Check if there's a recent emotional check
          const latestCheck = childData.emotionalChecks.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          )[0];
          
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          if (new Date(latestCheck.date) < oneWeekAgo) {
            insights.push({
              type: "emotional",
              title: "Emotional Check-in Reminder",
              content: `It's been over a week since you checked in on ${childName}'s emotional well-being. Consider having a check-in conversation.`,
              priority: "medium",
              childId: childId
            });
          }
          
          // Check for mood patterns
          if (childData.emotionalChecks.length >= 3) {
            const recentChecks = childData.emotionalChecks
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 3);
            
            const moodCounts = {};
            recentChecks.forEach(check => {
              moodCounts[check.mood] = (moodCounts[check.mood] || 0) + 1;
            });
            
            const dominantMood = Object.entries(moodCounts)
              .sort((a, b) => b[1] - a[1])
              [0];
            
            if (dominantMood[1] >= 2 && ['sad', 'angry', 'worried'].includes(dominantMood[0])) {
              insights.push({
                type: "emotional",
                title: "Emotional Pattern Detected",
                content: `${childName} has reported feeling ${dominantMood[0]} in ${dominantMood[1]} of the last 3 check-ins. You might want to have a conversation about what's causing these feelings.`,
                priority: "high",
                childId: childId
              });
            }
          }
        } else if (childAge && childAge > 3) {
          // No emotional checks recorded for a child old enough to express emotions
          insights.push({
            type: "recommendation",
            title: "Emotional Well-being Tracking",
            content: `You haven't recorded any emotional check-ins for ${childName}. Regular check-ins can help you stay connected with their feelings and needs.`,
            priority: "medium",
            childId: childId
          });
        }
      });
      
      // Sort insights by priority (high, medium, low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      
      insights.sort((a, b) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      setAiInsights(insights);
      
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setAiInsights([]);
    }
  };
  
  // Helper function to get checkup recommendation based on age
  const getCheckupRecommendation = (age, lastCheckup) => {
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
  };
  
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
        case 'homework':
          await handleHomeworkFormSubmit(formData);
          break;
        case 'activity':
          await handleActivityFormSubmit(formData);
          break;
        case 'emotional':
          await handleEmotionalFormSubmit(formData);
          break;
        case 'meal':
          await handleMealFormSubmit(formData);
          break;
        case 'event':
          await handleEventFormSubmit(formData);
          break;
        case 'milestone':
          await handleMilestoneFormSubmit(formData);
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
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || !formData.date) {
      throw new Error("Please fill in title and date");
    }
    
    // Format appointment data
    const appointmentData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
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
        // Create calendar event
        const calendarEvent = {
          summary: `${getChildName(childId)}'s ${formData.title}`,
          description: formData.notes || `Medical appointment: ${formData.title}`,
          start: {
            dateTime: formData.time 
              ? `${formData.date}T${formData.time}:00` 
              : `${formData.date}T09:00:00`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: formData.time 
              ? `${formData.date}T${formData.time.split(':')[0]}:${parseInt(formData.time.split(':')[1]) + 30}:00` 
              : `${formData.date}T10:00:00`,
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
  
  // Handle homework form submission
  const handleHomeworkFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || !formData.subject || !formData.dueDate) {
      throw new Error("Please fill in title, subject, and due date");
    }
    
    // Format homework data
    const homeworkData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing homework
      const homeworkIndex = updatedData[childId].homework.findIndex(
        h => h.id === id
      );
      
      if (homeworkIndex !== -1) {
        updatedData[childId].homework[homeworkIndex] = homeworkData;
      }
    } else {
      // Add new homework
      if (!updatedData[childId].homework) {
        updatedData[childId].homework = [];
      }
      
      updatedData[childId].homework.push(homeworkData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.homework`]: updatedData[childId].homework
    });
    
    // Add homework due date to calendar
    try {
      const dueDate = new Date(formData.dueDate);
      dueDate.setHours(17, 0, 0, 0); // Default to 5:00 PM
      
      const calendarEvent = {
        summary: `${getChildName(childId)}'s ${formData.subject} Homework Due`,
        description: formData.description || `${formData.title} - ${formData.subject} assignment due`,
        start: {
          dateTime: dueDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(dueDate.getTime() + 30*60000).toISOString(), // 30 minutes
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 120 } // 2 hours before
          ]
        }
      };
      
      // Add to calendar
      if (CalendarService) {
        await CalendarService.addEvent(calendarEvent, currentUser?.uid);
      }
    } catch (calendarError) {
      console.error("Error adding homework to calendar:", calendarError);
      // Don't block the save if calendar fails
    }
    
    return true;
  };
  
  // Handle activity form submission
  const handleActivityFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || !formData.type || !formData.startDate) {
      throw new Error("Please fill in title, type, and start date");
    }
    
    // Format activity data
    const activityData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing activity
      const activityIndex = updatedData[childId].activities.findIndex(
        a => a.id === id
      );
      
      if (activityIndex !== -1) {
        updatedData[childId].activities[activityIndex] = activityData;
      }
    } else {
      // Add new activity
      if (!updatedData[childId].activities) {
        updatedData[childId].activities = [];
      }
      
      updatedData[childId].activities.push(activityData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.activities`]: updatedData[childId].activities
    });
    
    // Add to calendar
    try {
      const startDate = new Date(formData.startDate);
      
      // Set time if provided
      if (formData.time) {
        const [hours, minutes] = formData.time.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        startDate.setHours(15, 0, 0, 0); // Default to 3:00 PM
      }
      
      // End date is either the provided end date or 1 hour after start
      const endDate = formData.endDate 
        ? new Date(formData.endDate) 
        : new Date(startDate.getTime() + 60*60000); // 1 hour
      
      // If end date is provided but no end time, use the same time as start
      if (formData.endDate && !formData.endTime) {
        endDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
      }
      
      // Add 1 hour to end time if same as start time
      if (endDate.getTime() === startDate.getTime()) {
        endDate.setTime(endDate.getTime() + 60*60000);
      }
      
      // Create calendar event
      const calendarEvent = {
        summary: `${getChildName(childId)}'s ${formData.title}`,
        description: formData.notes || `${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} activity: ${formData.title}`,
        location: formData.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 }, // 1 hour before
            { method: 'popup', minutes: 10 } // 10 minutes before
          ]
        }
      };
      
      // Add recurrence if applicable
      if (formData.repeatDay && formData.repeatDay.length > 0) {
        const dayMap = {
          'Sunday': 'SU', 'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE',
          'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA'
        };
        
        const byday = formData.repeatDay.map(day => dayMap[day]).join(',');
        calendarEvent.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`];
      }
      
      // Add to calendar
      if (CalendarService) {
        await CalendarService.addEvent(calendarEvent, currentUser?.uid);
      }
    } catch (calendarError) {
      console.error("Error adding activity to calendar:", calendarError);
      // Don't block the save if calendar fails
    }
    
    return true;
  };
  
  // Handle emotional check form submission
  const handleEmotionalFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.date || !formData.mood) {
      throw new Error("Please fill in date and mood");
    }
    
    // Format emotional check data
    const emotionalCheckData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing emotional check
      const checkIndex = updatedData[childId].emotionalChecks.findIndex(
        check => check.id === id
      );
      
      if (checkIndex !== -1) {
        updatedData[childId].emotionalChecks[checkIndex] = emotionalCheckData;
      }
    } else {
      // Add new emotional check
      if (!updatedData[childId].emotionalChecks) {
        updatedData[childId].emotionalChecks = [];
      }
      
      updatedData[childId].emotionalChecks.push(emotionalCheckData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.emotionalChecks`]: updatedData[childId].emotionalChecks
    });
    
    return true;
  };
  
  // Handle meal form submission
  const handleMealFormSubmit = async (formData) => {
    const { childId } = formData;
    
    // Validate required fields
    if (!formData.name) {
      throw new Error("Please fill in the name field");
    }
    
    // Format meal data
    const mealData = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (!updatedData[childId].meals) {
      updatedData[childId].meals = {
        allergies: [],
        preferences: [],
        restrictions: []
      };
    }
    
    // Add to appropriate category
    const category = formData.type === 'allergy' ? 'allergies' : 
                     formData.type === 'restriction' ? 'restrictions' : 
                     'preferences';
    
    updatedData[childId].meals[category].push(mealData);
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.meals.${category}`]: updatedData[childId].meals[category]
    });
    
    return true;
  };
  
  // Handle event form submission
  const handleEventFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || !formData.date) {
      throw new Error("Please fill in title and date");
    }
    
    // Format event data
    const eventData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing event
      const eventIndex = updatedData[childId].events.findIndex(
        e => e.id === id
      );
      
      if (eventIndex !== -1) {
        updatedData[childId].events[eventIndex] = eventData;
      }
    } else {
      // Add new event
      if (!updatedData[childId].events) {
        updatedData[childId].events = [];
      }
      
      updatedData[childId].events.push(eventData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.events`]: updatedData[childId].events
    });
    
    // Add to calendar
    try {
      const eventDate = new Date(formData.date);
      
      // Set time if provided
      if (formData.time) {
        const [hours, minutes] = formData.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // Default times based on event type
        if (formData.type === 'birthday') {
          eventDate.setHours(14, 0, 0, 0); // 2:00 PM
        } else if (formData.type === 'school') {
          eventDate.setHours(9, 0, 0, 0); // 9:00 AM
        } else {
          eventDate.setHours(12, 0, 0, 0); // 12:00 PM
        }
      }
      
      // End time is 2 hours after start
      const endDate = new Date(eventDate.getTime() + 2*60*60000);
      
      // Create calendar event
      const calendarEvent = {
        summary: `${getChildName(childId)}'s ${formData.title}`,
        description: formData.description || `${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} event: ${formData.title}`,
        location: formData.location || '',
        start: {
          dateTime: eventDate.toISOString(),
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
      
      // If it's a birthday, make it recurring annually
      if (formData.type === 'birthday') {
        calendarEvent.recurrence = ['RRULE:FREQ=YEARLY'];
      }
      
      // Add to calendar
      if (CalendarService) {
        await CalendarService.addEvent(calendarEvent, currentUser?.uid);
      }
    } catch (calendarError) {
      console.error("Error adding event to calendar:", calendarError);
      // Don't block the save if calendar fails
    }
    
    return true;
  };
  
  // Handle milestone form submission
  const handleMilestoneFormSubmit = async (formData) => {
    const { childId, id } = formData;
    
    // Validate required fields
    if (!formData.title || !formData.date) {
      throw new Error("Please fill in title and date");
    }
    
    // Format milestone data
    const milestoneData = {
      ...formData,
      id: id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Update local state
    const updatedData = {...childrenData};
    
    if (id) {
      // Update existing milestone
      const milestoneIndex = updatedData[childId].milestones.findIndex(
        m => m.id === id
      );
      
      if (milestoneIndex !== -1) {
        updatedData[childId].milestones[milestoneIndex] = milestoneData;
      }
    } else {
      // Add new milestone
      if (!updatedData[childId].milestones) {
        updatedData[childId].milestones = [];
      }
      
      updatedData[childId].milestones.push(milestoneData);
    }
    
    // Update state and save to Firebase
    setChildrenData(updatedData);
    
    // Save to Firebase
    const docRef = doc(db, "families", familyId);
    await updateDoc(docRef, {
      [`childrenData.${childId}.milestones`]: updatedData[childId].milestones
    });
    
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
        
        case 'homework':
          path = `homework`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'activity':
          path = `activities`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'emotional':
          path = `emotionalChecks`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'meal':
          // For meals, we need the category (allergies, preferences, restrictions)
          const category = itemType.category || 'preferences';
          path = `meals.${category}`;
          updatedItems = updatedData[childId].meals[category].filter(item => item.id !== itemId);
          updatedData[childId].meals[category] = updatedItems;
          break;
        
        case 'event':
          path = `events`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        case 'milestone':
          path = `milestones`;
          updatedItems = updatedData[childId][path].filter(item => item.id !== itemId);
          updatedData[childId][path] = updatedItems;
          break;
        
        default:
          throw new Error(`Unknown item type: ${itemType}`);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase - handle special case for meals
      const docRef = doc(db, "families", familyId);
      if (itemType === 'meal') {
        const category = itemType.category || 'preferences';
        await updateDoc(docRef, {
          [`childrenData.${childId}.meals.${category}`]: updatedData[childId].meals[category]
        });
      } else {
        await updateDoc(docRef, {
          [`childrenData.${childId}.${path}`]: updatedData[childId][path]
        });
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
                    time: '',
                    doctor: '',
                    notes: '',
                    childId: activeChild,
                    completed: false
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
                <div>
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('appointment', {
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      time: '',
                      doctor: '',
                      notes: '',
                      childId: child.id,
                      completed: false
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
                              {formatDate(appointment.date)} {appointment.time && `at ${appointment.time}`}
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
                              {formatDate(appointment.date)} {appointment.time && `at ${appointment.time}`}
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
                <div>
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
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, icon, notificationCount = 0) => (
    <div 
      className="border-l-4 border-black p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2" 
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto ml-2">{title}</h4>
        {notificationCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
            {notificationCount}
          </span>
        )}
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100"
            >
              {expandedSections[sectionKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      );
  
  // Render AI insights section
  const renderAiInsights = () => {
    const childrenWithInsights = aiInsights.filter(insight => 
      !activeChild || insight.childId === activeChild
    );
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 font-roboto">Allie AI Insights</h3>
        
        {childrenWithInsights.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {childrenWithInsights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-l-4 ${
                  insight.priority === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : insight.priority === 'medium'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start">
                  {insight.type === 'recommendation' ? (
                    <Info size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  ) : insight.type === 'medical' ? (
                    <AlertCircle size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  ) : insight.type === 'growth' ? (
                    <Activity size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  ) : insight.type === 'homework' ? (
                    <BookOpen size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  ) : insight.type === 'emotional' ? (
                    <Heart size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  ) : (
                    <Info size={18} className="text-gray-600 mr-2 mt-1 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-medium mb-1 font-roboto">{insight.title}</h4>
                    <p className="text-sm font-roboto">{insight.content}</p>
                    {insight.actionable && (
                      <div className="mt-2 text-sm text-blue-600 font-roboto">
                        <button className="hover:underline">
                          {insight.actionable}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <p className="text-gray-500 font-roboto">
              Allie is learning about your family. As you add more data, insights will appear here to help you stay on top of your children's needs.
            </p>
          </div>
        )}
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Schedule</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.routines?.length || 0} routines, {childrenData[child.id]?.activities?.length || 0} activities
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('routine', {
                      title: '',
                      days: [],
                      startTime: '08:00',
                      endTime: '',
                      notes: '',
                      childId: child.id
                    })}
                  >
                    <Clock size={14} className="mr-1" />
                    Add Routine
                  </button>
                  <button 
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 font-roboto flex items-center"
                    onClick={() => openModal('activity', {
                      title: '',
                      type: 'sports',
                      location: '',
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: '',
                      repeatDay: [],
                      time: '',
                      notes: '',
                      childId: child.id
                    })}
                  >
                    <Activity size={14} className="mr-1" />
                    Add Activity
                  </button>
                </div>
              </div>
              
              {/* Weekly schedule visualization */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm font-roboto mb-3">Weekly Schedule</h5>
                
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Days of Week Headers */}
                    <div className="flex">
                      <div className="w-16"></div> {/* Time column */}
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <div key={day} className="flex-1 text-center py-1 font-medium text-sm font-roboto">
                          {day.substring(0, 3)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Time slots from 6AM to 9PM */}
                    {Array.from({ length: 16 }, (_, i) => i + 6).map(hour => (
                      <div key={hour} className="flex border-t">
                        <div className="w-16 text-xs text-gray-500 pt-1 pr-2 text-right font-roboto">
                          {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                        </div>
                        
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          // Find routines for this day and time
                          const routines = childrenData[child.id]?.routines?.filter(r => {
                            if (!r.days.includes(day)) return false;
                            
                            const startHour = parseInt(r.startTime.split(':')[0]);
                            const endHour = r.endTime ? parseInt(r.endTime.split(':')[0]) : startHour + 1;
                            
                            return startHour <= hour && endHour > hour;
                          }) || [];
                          
                          // Find activities for this day and time
                          const activities = childrenData[child.id]?.activities?.filter(a => {
                            if (!a.repeatDay?.includes(day)) return false;
                            
                            const startHour = a.time ? parseInt(a.time.split(':')[0]) : 15; // Default to 3 PM
                            return startHour === hour;
                          }) || [];
                          
                          const items = [...routines, ...activities];
                          
                          return (
                            <div key={day} className="flex-1 h-10 border-l relative">
                              {items.map((item, index) => (
                                <div 
                                  key={index}
                                  className={`absolute left-0 right-0 mx-1 p-1 text-xs rounded truncate ${
                                    'routine' in item ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}
                                  style={{ top: `${index * 20}%` }}
                                >
                                  {item.title}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Routines */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-sm font-roboto">Daily Routines</h5>
                    <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                  </div>
                  
                  {childrenData[child.id]?.routines?.length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].routines
                        .slice(0, 3)
                        .map(routine => (
                          <div key={routine.id} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium font-roboto">{routine.title}</h5>
                                <p className="text-sm text-gray-600 font-roboto">
                                  {routine.days.join(', ')} at {routine.startTime}
                                  {routine.endTime && ` - ${routine.endTime}`}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  onClick={() => openModal('routine', {...routine, childId: child.id})}
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
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No routines added yet</p>
                      <button 
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-roboto"
                        onClick={() => openModal('routine', {
                          title: '',
                          days: [],
                          startTime: '08:00',
                          endTime: '',
                          notes: '',
                          childId: child.id
                        })}
                      >
                        Add First Routine
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Activities */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-sm font-roboto">Activities & Classes</h5>
                    <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                  </div>
                  
                  {childrenData[child.id]?.activities?.length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .slice(0, 3)
                        .map(activity => (
                          <div key={activity.id} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium font-roboto">{activity.title}</h5>
                                <p className="text-sm text-gray-600 font-roboto">
                                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                  {activity.location && ` at ${activity.location}`}
                                  {activity.time && ` - ${activity.time}`}
                                </p>
                                {activity.repeatDay && activity.repeatDay.length > 0 && (
                                  <p className="text-xs text-gray-500 font-roboto">
                                    {activity.repeatDay.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  onClick={() => openModal('activity', {...activity, childId: child.id})}
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  onClick={() => handleRemoveItem('activity', child.id, activity.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No activities added yet</p>
                      <button 
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-roboto"
                        onClick={() => openModal('activity', {
                          title: '',
                          type: 'sports',
                          location: '',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: '',
                          repeatDay: [],
                          time: '',
                          notes: '',
                          childId: child.id
                        })}
                      >
                        Add First Activity
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Social Contacts */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm font-roboto">Friends & Social Contacts</h5>
                  <button 
                    className="text-xs text-blue-600 hover:underline font-roboto flex items-center"
                    onClick={() => openModal('contact', {
                      name: '',
                      relationship: 'friend',
                      parentName: '',
                      parentPhone: '',
                      parentEmail: '',
                      notes: '',
                      childId: child.id
                    })}
                  >
                    <PlusCircle size={12} className="mr-1" />
                    Add Contact
                  </button>
                </div>
                
                {/* Sample contacts UI (would be populated from actual data) */}
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 font-roboto">No contacts added yet</p>
                  <p className="text-xs text-gray-500 mt-1 font-roboto">
                    Keep track of your child's friends and their parents' contact information
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render homework section
  const renderHomeworkSection = () => {
    if (!expandedSections.homework) {
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
          <h3 className="text-lg font-medium font-roboto">Homework & Academic Tracking</h3>
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
                  openModal('homework', {
                    title: '',
                    subject: '',
                    dueDate: new Date().toISOString().split('T')[0],
                    description: '',
                    priority: 'medium',
                    completed: false,
                    childId: activeChild
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding homework.'
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Academics</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.homework?.filter(h => !h.completed).length || 0} pending assignments
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('homework', {
                      title: '',
                      subject: '',
                      dueDate: new Date().toISOString().split('T')[0],
                      description: '',
                      priority: 'medium',
                      completed: false,
                      childId: child.id
                    })}
                  >
                    <BookOpen size={14} className="mr-1" />
                    Add Assignment
                  </button>
                </div>
              </div>
              
              {/* Homework dashboard */}
              <div className="space-y-4">
                {/* Upcoming assignments */}
                <div>
                  <h5 className="font-medium text-sm font-roboto mb-2">Upcoming Assignments</h5>
                  
                  {childrenData[child.id]?.homework?.filter(h => !h.completed && new Date(h.dueDate) >= new Date()).length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].homework
                        .filter(h => !h.completed && new Date(h.dueDate) >= new Date())
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .map(assignment => (
                          <div key={assignment.id} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex justify-between">
                              <div>
                                <div className="flex items-center">
                                  <h5 className="font-medium font-roboto">{assignment.title}</h5>
                                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                    assignment.priority === 'high' 
                                      ? 'bg-red-100 text-red-800' 
                                      : assignment.priority === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {assignment.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 font-roboto">
                                  {assignment.subject} - Due: {formatDate(assignment.dueDate)}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  onClick={() => {
                                    const updatedAssignment = {...assignment, completed: true};
                                    handleHomeworkFormSubmit(updatedAssignment);
                                  }}
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button 
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  onClick={() => openModal('homework', {...assignment, childId: child.id})}
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  onClick={() => handleRemoveItem('homework', child.id, assignment.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            {assignment.description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                                {assignment.description}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No upcoming assignments</p>
                    </div>
                  )}
                </div>
                
                {/* Completed assignments */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-sm font-roboto">Completed Assignments</h5>
                    <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                  </div>
                  
                  {childrenData[child.id]?.homework?.filter(h => h.completed).length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].homework
                        .filter(h => h.completed)
                        .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
                        .slice(0, 3)
                        .map(assignment => (
                          <div key={assignment.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium font-roboto">{assignment.title}</h5>
                                <p className="text-sm text-gray-600 font-roboto">
                                  {assignment.subject} - Due: {formatDate(assignment.dueDate)}
                                </p>
                                <div className="mt-1 flex items-center text-sm text-green-600 font-roboto">
                                  <CheckCircle size={14} className="mr-1" />
                                  Completed
                                </div>
                              </div>
                              <div>
                                <button 
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  onClick={() => openModal('homework', {...assignment, childId: child.id})}
                                >
                                  <Edit size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No completed assignments</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render emotional well-being section
  const renderEmotionalSection = () => {
    if (!expandedSections.emotional) {
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
    
    // Emoji mapping for moods
    const moodEmojis = {
      'happy': '😀',
      'excited': '🤩',
      'calm': '😌',
      'tired': '😴',
      'sad': '😔',
      'angry': '😠',
      'worried': '😟',
      'confused': '😕'
    };
    
    return (
      <div className="space-y-6 p-4 bg-white rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium font-roboto">Emotional Well-being Tracking</h3>
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
                  openModal('emotional', {
                    date: new Date().toISOString().split('T')[0],
                    mood: '',
                    notes: '',
                    childId: activeChild
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding an emotional check-in.'
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Emotional Well-being</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.emotionalChecks?.length > 0 
                        ? `Last check-in: ${formatDate(childrenData[child.id].emotionalChecks.sort((a, b) => 
                            new Date(b.date) - new Date(a.date))[0].date)}`
                        : 'No check-ins yet'}
                    </p>
                  </div>
                </div>
                <div>
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('emotional', {
                      date: new Date().toISOString().split('T')[0],
                      mood: '',
                      notes: '',
                      childId: child.id
                    })}
                  >
                    <Heart size={14} className="mr-1" />
                    Add Check-in
                  </button>
                </div>
              </div>
              
              {/* Mood tracking visualization */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm font-roboto mb-3">Mood Tracking</h5>
                
                {childrenData[child.id]?.emotionalChecks?.length > 0 ? (
                  <div className="space-y-4">
                    {/* Mood line chart (simplified version) */}
                    <div className="h-24 relative border-b border-l">
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2">
                        {childrenData[child.id].emotionalChecks
                          .slice(-7) // Last 7 check-ins
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .map((check, index) => {
                            // Map moods to heights (happy = high, sad = low, etc.)
                            const moodHeights = {
                              'happy': 90,
                              'excited': 100,
                              'calm': 70,
                              'tired': 50,
                              'confused': 40,
                              'worried': 30,
                              'sad': 20,
                              'angry': 10
                            };
                            
                            const height = moodHeights[check.mood] || 50;
                            
                            return (
                              <div key={check.id} className="flex flex-col items-center">
                                <div className="text-2xl">{moodEmojis[check.mood] || '😐'}</div>
                                <div 
                                  className="w-1 bg-blue-500 rounded-t mb-1"
                                  style={{ height: `${height}%` }}
                                />
                                <div className="mt-1 text-xs text-gray-500 -rotate-45 origin-top-left">
                                  {new Date(check.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    
                    {/* Most frequent mood summary */}
                    {(() => {
                      // Count mood frequencies
                      const moodCounts = {};
                      childrenData[child.id].emotionalChecks.forEach(check => {
                        moodCounts[check.mood] = (moodCounts[check.mood] || 0) + 1;
                      });
                      
                      // Get most frequent mood
                      const mostFrequentMood = Object.entries(moodCounts)
                        .sort((a, b) => b[1] - a[1])[0];
                      
                      if (mostFrequentMood) {
                        return (
                          <div className="text-center text-sm font-roboto">
                            <p>Most frequent mood: <span className="font-medium">{mostFrequentMood[0]}</span> {moodEmojis[mostFrequentMood[0]] || ''}</p>
                            <p className="text-xs text-gray-500">
                              {mostFrequentMood[1]} out of {childrenData[child.id].emotionalChecks.length} check-ins
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 font-roboto">
                      Add emotional check-ins to start tracking your child's well-being
                    </p>
                  </div>
                )}
              </div>
              
              {/* Latest check-ins */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm font-roboto">Recent Check-ins</h5>
                  <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                </div>
                
                {childrenData[child.id]?.emotionalChecks?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].emotionalChecks
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 3)
                      .map(check => (
                        <div key={check.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <div className="flex items-center">
                                <span className="text-2xl mr-2">{moodEmojis[check.mood] || '😐'}</span>
                                <div>
                                  <h5 className="font-medium font-roboto">{check.mood.charAt(0).toUpperCase() + check.mood.slice(1)}</h5>
                                  <p className="text-sm text-gray-600 font-roboto">
                                    {formatDate(check.date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('emotional', {...check, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('emotional', child.id, check.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {check.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                              {check.notes}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No emotional check-ins recorded yet</p>
                    <button 
                      className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-roboto"
                      onClick={() => openModal('emotional', {
                        date: new Date().toISOString().split('T')[0],
                        mood: '',
                        notes: '',
                        childId: child.id
                      })}
                    >
                      Add First Check-in
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render meals section
  const renderMealsSection = () => {
    if (!expandedSections.meals) {
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
          <h3 className="text-lg font-medium font-roboto">Meal Planning & Dietary Needs</h3>
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
                  openModal('meal', {
                    type: 'preference',
                    name: '',
                    details: '',
                    childId: activeChild
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding dietary information.'
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Dietary Information</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.meals?.allergies?.length || 0} allergies, 
                      {childrenData[child.id]?.meals?.preferences?.length || 0} preferences,
                      {childrenData[child.id]?.meals?.restrictions?.length || 0} restrictions
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 font-roboto flex items-center"
                    onClick={() => openModal('meal', {
                      type: 'allergy',
                      name: '',
                      details: '',
                      childId: child.id
                    })}
                  >
                    <AlertCircle size={14} className="mr-1" />
                    Add Allergy
                  </button>
                  <button 
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 font-roboto flex items-center"
                    onClick={() => openModal('meal', {
                      type: 'preference',
                      name: '',
                      details: '',
                      childId: child.id
                    })}
                  >
                    <ThumbsUp size={14} className="mr-1" />
                    Add Preference
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Allergies */}
                <div>
                  <h5 className="font-medium text-sm font-roboto mb-2 flex items-center">
                    <AlertCircle size={14} className="text-red-500 mr-1" />
                    Allergies & Intolerances
                  </h5>
                  
                  {childrenData[child.id]?.meals?.allergies?.length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].meals.allergies.map(allergy => (
                        <div key={allergy.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{allergy.name}</h5>
                              {allergy.details && (
                                <p className="text-sm text-gray-700 font-roboto">
                                  {allergy.details}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('meal', {...allergy, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('meal', child.id, allergy.id, 'allergies')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No allergies recorded</p>
                    </div>
                  )}
                </div>
                
                {/* Preferences */}
                <div>
                  <h5 className="font-medium text-sm font-roboto mb-2 flex items-center">
                    <ThumbsUp size={14} className="text-blue-500 mr-1" />
                    Food Preferences
                  </h5>
                  
                  {childrenData[child.id]?.meals?.preferences?.length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].meals.preferences.map(preference => (
                        <div key={preference.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{preference.name}</h5>
                              {preference.details && (
                                <p className="text-sm text-gray-700 font-roboto">
                                  {preference.details}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('meal', {...preference, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('meal', child.id, preference.id, 'preferences')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No preferences recorded</p>
                    </div>
                  )}
                </div>
                
                {/* Dietary Restrictions */}
                <div className="md:col-span-2">
                  <h5 className="font-medium text-sm font-roboto mb-2 flex items-center">
                    <Ban size={14} className="text-yellow-500 mr-1" />
                    Dietary Restrictions
                  </h5>
                  
                  {childrenData[child.id]?.meals?.restrictions?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {childrenData[child.id].meals.restrictions.map(restriction => (
                        <div key={restriction.id} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{restriction.name}</h5>
                              {restriction.details && (
                                <p className="text-sm text-gray-700 font-roboto">
                                  {restriction.details}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('meal', {...restriction, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('meal', child.id, restriction.id, 'restrictions')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No dietary restrictions recorded</p>
                      <button 
                        className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded-md text-sm font-roboto"
                        onClick={() => openModal('meal', {
                          type: 'restriction',
                          name: '',
                          details: '',
                          childId: child.id
                        })}
                      >
                        Add Restriction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render events section
  const renderEventsSection = () => {
    if (!expandedSections.events) {
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
          <h3 className="text-lg font-medium font-roboto">Events & Special Occasions</h3>
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
                  openModal('event', {
                    title: '',
                    type: 'birthday',
                    date: new Date().toISOString().split('T')[0],
                    time: '',
                    location: '',
                    description: '',
                    childId: activeChild
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding an event.'
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Events</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.events?.length || 0} events recorded
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('event', {
                      title: '',
                      type: 'birthday',
                      date: new Date().toISOString().split('T')[0],
                      time: '',
                      location: '',
                      description: '',
                      childId: child.id
                    })}
                  >
                    <Calendar size={14} className="mr-1" />
                    Add Event
                  </button>
                </div>
              </div>
              
              {/* Upcoming events */}
              <div className="mb-4">
                <h5 className="font-medium text-sm font-roboto mb-2">Upcoming Events</h5>
                
                {childrenData[child.id]?.events?.filter(e => new Date(e.date) >= new Date()).length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].events
                      .filter(e => new Date(e.date) >= new Date())
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 3)
                      .map(event => (
                        <div key={event.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{event.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(event.date)} {event.time && `at ${event.time}`}
                                {event.location && ` - ${event.location}`}
                              </p>
                              <div className="mt-1 text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-800 inline-block">
                                {event.type}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('event', {...event, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                onClick={() => handleRemoveItem('event', child.id, event.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {event.description && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                              {event.description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No upcoming events</p>
                  </div>
                )}
              </div>
              
              {/* Past events */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm font-roboto">Past Events</h5>
                  <button className="text-xs text-blue-600 hover:underline font-roboto">View all</button>
                </div>
                
                {childrenData[child.id]?.events?.filter(e => new Date(e.date) < new Date()).length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].events
                      .filter(e => new Date(e.date) < new Date())
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 2)
                      .map(event => (
                        <div key={event.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <h5 className="font-medium font-roboto">{event.title}</h5>
                              <p className="text-sm text-gray-600 font-roboto">
                                {formatDate(event.date)} {event.time && `at ${event.time}`}
                                {event.location && ` - ${event.location}`}
                              </p>
                              <div className="mt-1 text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-800 inline-block">
                                {event.type}
                              </div>
                            </div>
                            <div>
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => openModal('event', {...event, childId: child.id})}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No past events</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render milestones section
  const renderMilestonesSection = () => {
    if (!expandedSections.milestones) {
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
          <h3 className="text-lg font-medium font-roboto">Milestones & Celebrations</h3>
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
                  openModal('milestone', {
                    title: '',
                    type: 'achievement',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    childId: activeChild
                  });
                } else {
                  setAllieMessage({
                    type: 'warning',
                    text: 'Please select a child first before adding a milestone.'
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
                    <h4 className="font-medium font-roboto text-lg">{child.name}'s Milestones</h4>
                    <p className="text-sm text-gray-500 font-roboto">
                      {childrenData[child.id]?.milestones?.length || 0} milestones recorded
                    </p>
                  </div>
                </div>
                <div>
                  <button 
                    className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                    onClick={() => openModal('milestone', {
                      title: '',
                      type: 'achievement',
                      date: new Date().toISOString().split('T')[0],
                      description: '',
                      childId: child.id
                    })}
                  >
                    <Award size={14} className="mr-1" />
                    Add Milestone
                  </button>
                </div>
              </div>
              
              {/* Milestone timeline */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm font-roboto mb-3">Milestone Timeline</h5>
                
                {childrenData[child.id]?.milestones?.length > 0 ? (
                  <div className="relative">
                    {childrenData[child.id].milestones
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((milestone, index) => (
                        <div key={milestone.id} className="mb-4 flex">
                          <div className="relative">
                            <div className="h-full w-0.5 bg-gray-300 absolute left-4"></div>
                            <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center relative z-10">
                              <Award size={14} />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                              <div className="flex justify-between">
                                <div>
                                  <h5 className="font-medium font-roboto">{milestone.title}</h5>
                                  <p className="text-sm text-gray-600 font-roboto">
                                    {formatDate(milestone.date)}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <button 
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    onClick={() => openModal('milestone', {...milestone, childId: child.id})}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    onClick={() => handleRemoveItem('milestone', child.id, milestone.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              {milestone.description && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                                  {milestone.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 font-roboto">
                      Record important moments and achievements in your child's life
                    </p>
                  </div>
                )}
              </div>
              
              {/* Age-appropriate milestones */}
              {child.age && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm font-roboto mb-1 flex items-center">
                    <Info size={14} className="text-blue-500 mr-1" />
                    Typical Milestones for {child.age} years old
                  </h5>
                  <ul className="text-sm font-roboto space-y-1">
                    {child.age < 1 && (
                      <>
                        <li>• First smile</li>
                        <li>• Rolling over</li>
                        <li>• Sitting up</li>
                        <li>• First words</li>
                        <li>• Crawling</li>
                      </>
                    )}
                    {child.age >= 1 && child.age < 3 && (
                      <>
                        <li>• Walking</li>
                        <li>• Building vocabulary</li>
                        <li>• Following simple instructions</li>
                        <li>• Self-feeding</li>
                        <li>• Toilet training</li>
                      </>
                    )}
                    {child.age >= 3 && child.age < 6 && (
                      <>
                        <li>• Drawing and coloring</li>
                        <li>• Riding a tricycle</li>
                        <li>• Speaking in sentences</li>
                        <li>• Counting to 10</li>
                        <li>• Learning letters</li>
                      </>
                    )}
                    {child.age >= 6 && child.age < 12 && (
                      <>
                        <li>• Learning to read</li>
                        <li>• Riding a bicycle</li>
                        <li>• Swimming</li>
                        <li>• Team sports participation</li>
                        <li>• Musical instrument</li>
                      </>
                    )}
                    {child.age >= 12 && (
                      <>
                        <li>• Growing independence</li>
                        <li>• Developing personal interests</li>
                        <li>• Academic achievements</li>
                        <li>• Social relationship milestones</li>
                        <li>• Preparation for future education</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Main render function
  return (
    <div className="relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-transparent border-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-blue-600 font-medium font-roboto">Loading children data...</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {tabError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline font-roboto">{tabError}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3" 
            onClick={() => setTabError(null)}
          >
            <span className="sr-only">Close</span>
            <X size={18} />
          </button>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-roboto">Children Tracking Dashboard</h2>
        <p className="text-gray-600 font-roboto mt-1">
          Keep track of all aspects of your children's lives in one place
        </p>
      </div>
      
      {/* Voice entry mode */}
      {newVoiceEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">Voice Entry</h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={() => {
                  setNewVoiceEntry(false);
                  setIsRecording(false);
                  setRecordingText('');
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="text-center mb-4">
              {isRecording ? (
                <div className="mx-auto w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                  <Mic size={32} className="text-white" />
                </div>
              ) : (
                <div className="mx-auto w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <Mic size={32} className="text-gray-500" />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <div className="border rounded-lg p-3 h-32 overflow-y-auto bg-gray-50">
                {recordingText || (
                  <p className="text-gray-400 text-center italic font-roboto">
                    {isRecording 
                      ? "Listening..." 
                      : "Press the microphone button and speak to add information"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={() => {
                  setNewVoiceEntry(false);
                  setIsRecording(false);
                  setRecordingText('');
                }}
              >
                Cancel
              </button>
              
              <div className="space-x-2">
                {isRecording ? (
                  <button 
                    className="px-4 py-2 bg-red-500 text-white rounded-md font-roboto hover:bg-red-600"
                    onClick={() => setIsRecording(false)}
                  >
                    Stop
                  </button>
                ) : (
                  <>
                    <button 
                      className="px-4 py-2 bg-blue-500 text-white rounded-md font-roboto hover:bg-blue-600"
                      onClick={handleVoiceInput}
                    >
                      Record
                    </button>
                    
                    {recordingText && (
                      <button 
                        className="px-4 py-2 bg-green-500 text-white rounded-md font-roboto hover:bg-green-600"
                        onClick={() => processVoiceCommand(recordingText)}
                      >
                        Process
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Children selector tabs */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium font-roboto">Filter by Child</h3>
          <div className="flex space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-48 border rounded-full pl-10 pr-4 py-2 text-sm"
                value={searchQuery}
                onChange={handleSearch}
                ref={searchInputRef}
              />
              <Search size={18} className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            
            <button 
              className="p-2 rounded-md bg-black text-white hover:bg-gray-800"
              onClick={handleVoiceInput}
              ref={microphoneRef}
            >
              <Mic size={18} />
            </button>
            
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={toggleViewMode}
              title={viewMode === 'card' ? 'Switch to list view' : 'Switch to card view'}
            >
              {viewMode === 'card' ? <List size={18} /> : <Grid size={18} />}
            </button>
            
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setActiveChild(null)}
              title="Show all children"
            >
              <Users size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {familyMembers.filter(member => member.role === 'child').map(child => (
            <div 
              key={child.id}
              className={`border rounded-lg p-2 cursor-pointer hover:border-black transition-colors ${
                activeChild === child.id ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
              onClick={() => setActiveChild(child.id === activeChild ? null : child.id)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/40/40'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium font-roboto">{child.name}</p>
                  <p className="text-xs text-gray-500 font-roboto">
                    {child.age ? `${child.age} years old` : 'Age not set'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Insights Section */}
      {renderAiInsights()}
      
      {/* Main Sections */}
      <div className="space-y-6">
        {/* Medical Section */}
        <div>
          {renderSectionHeader(
            'Medical Appointments & Health Records', 
            'medical', 
            <AlertCircle size={20} className="text-red-500" />,
            notifications.medical
          )}
          {expandedSections.medical && renderMedicalSection()}
        </div>
        
        {/* Growth & Development Section */}
        <div>
          {renderSectionHeader(
            'Growth & Development Tracking', 
            'growth', 
            <Activity size={20} className="text-blue-500" />,
            notifications.growth
          )}
          {expandedSections.growth && renderGrowthSection()}
        </div>
        
        {/* Routines & Activities Section */}
        <div>
          {renderSectionHeader(
            'Daily Routines & Activities', 
            'routines', 
            <Clock size={20} className="text-purple-500" />,
            notifications.routines
          )}
          {renderRoutinesSection()}
        </div>
        
        {/* Homework & Academic Section */}
        <div>
          {renderSectionHeader(
            'Homework & Academic Tracking', 
            'homework', 
            <BookOpen size={20} className="text-green-500" />,
            notifications.homework
          )}
          {renderHomeworkSection()}
        </div>
        
        {/* Emotional Well-being Section */}
        <div>
          {renderSectionHeader(
            'Emotional Well-being Tracking', 
            'emotional', 
            <Heart size={20} className="text-pink-500" />,
            notifications.emotional
          )}
          {renderEmotionalSection()}
        </div>
        
        {/* Meals & Dietary Section */}
        <div>
          {renderSectionHeader(
            'Meal Planning & Dietary Needs', 
            'meals', 
            <Utensils size={20} className="text-yellow-500" />,
            notifications.meals
          )}
          {renderMealsSection()}
        </div>
        
        {/* Events & Special Occasions Section */}
        <div>
          {renderSectionHeader(
            'Events & Special Occasions', 
            'events', 
            <Calendar size={20} className="text-indigo-500" />,
            notifications.events
          )}
          {renderEventsSection()}
        </div>
        
        {/* Milestones & Celebrations Section */}
        <div>
          {renderSectionHeader(
            'Milestones & Celebrations', 
            'milestones', 
            <Award size={20} className="text-amber-500" />,
            notifications.milestones
          )}
          {renderMilestonesSection()}
        </div>
      </div>
      
      {/* Footer Help Section */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-start">
          <HelpCircle size={24} className="text-blue-500 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium font-roboto">Need help with Children Tracking?</h3>
            <p className="text-sm text-gray-600 font-roboto mt-1">
              Just ask Allie in the chat! Try saying "Allie, add a doctor's appointment for Emma next Tuesday" 
              or "When was Jack's last growth measurement?"
            </p>
          </div>
        </div>
      </div>
      
      {/* Allie Message */}
      {allieMessage && (
        <div className={`fixed bottom-20 right-4 max-w-xs p-4 rounded-lg shadow-lg z-50 ${
          allieMessage.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
          allieMessage.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
          allieMessage.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
          'bg-blue-50 border-l-4 border-blue-500'
        }`}>
          <div className="flex">
            <div className={`flex-shrink-0 mr-2 ${
              allieMessage.type === 'success' ? 'text-green-500' :
              allieMessage.type === 'warning' ? 'text-yellow-500' :
              allieMessage.type === 'error' ? 'text-red-500' :
              'text-blue-500'
            }`}>
              {allieMessage.type === 'success' && <CheckCircle size={16} />}
              {allieMessage.type === 'warning' && <AlertCircle size={16} />}
              {allieMessage.type === 'error' && <X size={16} />}
              {allieMessage.type === 'info' && <Info size={16} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-roboto">{allieMessage.text}</p>
            </div>
            <button 
              className="ml-2 text-gray-400 hover:text-gray-600"
              onClick={() => setAllieMessage(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Modals for editing/adding data */}
      {activeModal === 'appointment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Appointment' : 'Add New Appointment'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Appointment Type
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Checkup, Dentist, Vaccination"
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.date || ''}
                    onChange={(e) => setModalData({...modalData, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.time || ''}
                    onChange={(e) => setModalData({...modalData, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Doctor/Provider (optional)
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Dr. Smith"
                  value={modalData.doctor || ''}
                  onChange={(e) => setModalData({...modalData, doctor: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information"
                  rows="3"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                  checked={modalData.completed || false}
                  onChange={(e) => setModalData({...modalData, completed: e.target.checked})}
                  id="completed-checkbox"
                />
                <label htmlFor="completed-checkbox" className="ml-2 block text-sm text-gray-900 font-roboto">
                  Mark as completed
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('appointment')}
                disabled={loadingSection === 'appointment'}
              >
                {loadingSection === 'appointment' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Appointment' : 'Save Appointment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Growth Measurement Modal */}
      {activeModal === 'growth' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Measurement' : 'Add New Measurement'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.date || ''}
                  onChange={(e) => setModalData({...modalData, date: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Height
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      className="w-full border rounded-l-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 42in or 107cm"
                      value={modalData.height || ''}
                      onChange={(e) => setModalData({...modalData, height: e.target.value})}
                    />
                    <div className="bg-gray-100 p-2 rounded-r-md flex items-center">
                      <Activity size={16} className="text-gray-500" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Weight
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      className="w-full border rounded-l-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 40lb or 18kg"
                      value={modalData.weight || ''}
                      onChange={(e) => setModalData({...modalData, weight: e.target.value})}
                    />
                    <div className="bg-gray-100 p-2 rounded-r-md flex items-center">
                      <Activity size={16} className="text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Shoe Size
                  </label>
                  <div className="flex items-center">
                    <button 
                      className="bg-gray-100 p-2 rounded-l-md"
                      onClick={() => {
                        const currentSize = parseFloat(modalData.shoeSize) || 0;
                        if (currentSize > 0) {
                          setModalData({...modalData, shoeSize: (currentSize - 0.5).toString()});
                        }
                      }}
                    >
                      <ChevronDown size={16} className="text-gray-500" />
                    </button>
                    <input
                      type="text"
                      className="flex-1 border-t border-b p-2 text-center focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Shoe size"
                      value={modalData.shoeSize || ''}
                      onChange={(e) => setModalData({...modalData, shoeSize: e.target.value})}
                    />
                    <button 
                      className="bg-gray-100 p-2 rounded-r-md"
                      onClick={() => {
                        const currentSize = parseFloat(modalData.shoeSize) || 0;
                        setModalData({...modalData, shoeSize: (currentSize + 0.5).toString()});
                      }}
                    >
                      <ChevronUp size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Clothing Size
                  </label>
                  <select
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.clothingSize || ''}
                    onChange={(e) => setModalData({...modalData, clothingSize: e.target.value})}
                  >
                    <option value="">Select size</option>
                    <option value="Newborn">Newborn</option>
                    <option value="0-3M">0-3 Months</option>
                    <option value="3-6M">3-6 Months</option>
                    <option value="6-9M">6-9 Months</option>
                    <option value="9-12M">9-12 Months</option>
                    <option value="12-18M">12-18 Months</option>
                    <option value="18-24M">18-24 Months</option>
                    <option value="2T">2T</option>
                    <option value="3T">3T</option>
                    <option value="4T">4T</option>
                    <option value="5T">5T</option>
                    <option value="XS">XS (4-5)</option>
                    <option value="S">S (6-7)</option>
                    <option value="M">M (8-10)</option>
                    <option value="L">L (10-12)</option>
                    <option value="XL">XL (14-16)</option>
                    <option value="XXL">XXL (18-20)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information"
                  rows="2"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('growth')}
                disabled={loadingSection === 'growth'}
              >
                {loadingSection === 'growth' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Measurement' : 'Save Measurement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Routine Modal */}
      {activeModal === 'routine' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Routine' : 'Add New Routine'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Routine Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Morning Routine, Bedtime, etc."
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Days of Week
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <button
                      key={day}
                      className={`text-xs p-2 rounded-md ${
                        modalData.days?.includes(day) 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => {
                        const currentDays = modalData.days || [];
                        if (currentDays.includes(day)) {
                          setModalData({
                            ...modalData, 
                            days: currentDays.filter(d => d !== day)
                          });
                        } else {
                          setModalData({
                            ...modalData,
                            days: [...currentDays, day]
                          });
                        }
                      }}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Start Time
                  </label>
                  <div className="flex">
                    <select
                      className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      value={modalData.startTime || ''}
                      onChange={(e) => setModalData({...modalData, startTime: e.target.value})}
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 24 }, (_, hour) => (
                        <>
                          <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                            {hour === 0 ? '12:00 AM' : 
                             hour < 12 ? `${hour}:00 AM` : 
                             hour === 12 ? '12:00 PM' : 
                             `${hour - 12}:00 PM`}
                          </option>
                          <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                            {hour === 0 ? '12:30 AM' : 
                             hour < 12 ? `${hour}:30 AM` : 
                             hour === 12 ? '12:30 PM' : 
                             `${hour - 12}:30 PM`}
                          </option>
                        </>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    End Time (optional)
                  </label>
                  <div className="flex">
                    <select
                      className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      value={modalData.endTime || ''}
                      onChange={(e) => setModalData({...modalData, endTime: e.target.value})}
                    >
                      <option value="">Duration</option>
                      <option value="30 minutes">30 minutes</option>
                      <option value="60 minutes">1 hour</option>
                      <option value="90 minutes">1.5 hours</option>
                      <option value="120 minutes">2 hours</option>
                      <option value="custom">Custom time...</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {modalData.endTime === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Custom End Time
                  </label>
                  <select
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.customEndTime || ''}
                    onChange={(e) => setModalData({...modalData, customEndTime: e.target.value})}
                  >
                    <option value="">Select end time</option>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <>
                        <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour === 0 ? '12:00 AM' : 
                           hour < 12 ? `${hour}:00 AM` : 
                           hour === 12 ? '12:00 PM' : 
                           `${hour - 12}:00 PM`}
                        </option>
                        <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                          {hour === 0 ? '12:30 AM' : 
                           hour < 12 ? `${hour}:30 AM` : 
                           hour === 12 ? '12:30 PM' : 
                           `${hour - 12}:30 PM`}
                        </option>
                      </>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information"
                  rows="2"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('routine')}
                disabled={loadingSection === 'routine'}
              >
                {loadingSection === 'routine' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Routine' : 'Save Routine'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Activity Modal */}
      {activeModal === 'activity' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Activity' : 'Add New Activity'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Activity Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Soccer Practice, Piano Lessons, etc."
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.type || ''}
                  onChange={(e) => setModalData({...modalData, type: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="sports">Sports</option>
                  <option value="music">Music</option>
                  <option value="art">Art & Crafts</option>
                  <option value="academic">Academic</option>
                  <option value="social">Social</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Location (optional)
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Community Center, School, etc."
                  value={modalData.location || ''}
                  onChange={(e) => setModalData({...modalData, location: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.startDate || ''}
                    onChange={(e) => setModalData({...modalData, startDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.endDate || ''}
                    onChange={(e) => setModalData({...modalData, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Repeats On (optional)
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <button
                      key={day}
                      className={`text-xs p-2 rounded-md ${
                        modalData.repeatDay?.includes(day) 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => {
                        const currentDays = modalData.repeatDay || [];
                        if (currentDays.includes(day)) {
                          setModalData({
                            ...modalData, 
                            repeatDay: currentDays.filter(d => d !== day)
                          });
                        } else {
                          setModalData({
                            ...modalData,
                            repeatDay: [...currentDays, day]
                          });
                        }
                      }}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Time (optional)
                </label>
                <div className="flex">
                  <select
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.time || ''}
                    onChange={(e) => setModalData({...modalData, time: e.target.value})}
                  >
                    <option value="">Select time</option>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <>
                        <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour === 0 ? '12:00 AM' : 
                           hour < 12 ? `${hour}:00 AM` : 
                           hour === 12 ? '12:00 PM' : 
                           `${hour - 12}:00 PM`}
                        </option>
                        <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                          {hour === 0 ? '12:30 AM' : 
                           hour < 12 ? `${hour}:30 AM` : 
                           hour === 12 ? '12:30 PM' : 
                           `${hour - 12}:30 PM`}
                        </option>
                      </>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information"
                  rows="2"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('activity')}
                disabled={loadingSection === 'activity'}
              >
                {loadingSection === 'activity' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Activity' : 'Save Activity'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Homework Modal */}
      {activeModal === 'homework' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Assignment' : 'Add New Assignment'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Assignment Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Math Homework, Book Report, etc."
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Subject
                </label>
                <select
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.subject || ''}
                  onChange={(e) => setModalData({...modalData, subject: e.target.value})}
                >
                  <option value="">Select subject</option>
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Art">Art</option>
                  <option value="Music">Music</option>
                  <option value="Physical Education">Physical Education</option>
                  <option value="Foreign Language">Foreign Language</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.dueDate || ''}
                  onChange={(e) => setModalData({...modalData, dueDate: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Priority
                </label>
                <div className="flex space-x-2">
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.priority === 'low' 
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' 
                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => setModalData({...modalData, priority: 'low'})}
                  >
                    Low
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.priority === 'medium' 
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' 
                        : 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100'
                    }`}
                    onClick={() => setModalData({...modalData, priority: 'medium'})}
                  >
                    Medium
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.priority === 'high' 
                        ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    }`}
                    onClick={() => setModalData({...modalData, priority: 'high'})}
                  >
                    High
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional details about the assignment"
                  rows="3"
                  value={modalData.description || ''}
                  onChange={(e) => setModalData({...modalData, description: e.target.value})}
                ></textarea>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                  checked={modalData.completed || false}
                  onChange={(e) => setModalData({...modalData, completed: e.target.checked})}
                  id="completed-hw-checkbox"
                />
                <label htmlFor="completed-hw-checkbox" className="ml-2 block text-sm text-gray-900 font-roboto">
                  Mark as completed
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('homework')}
                disabled={loadingSection === 'homework'}
              >
                {loadingSection === 'homework' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Assignment' : 'Save Assignment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Emotional Check-in Modal */}
      {activeModal === 'emotional' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Emotional Check-in' : 'Add New Emotional Check-in'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.date || ''}
                  onChange={(e) => setModalData({...modalData, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Mood
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['happy', 'excited', 'calm', 'tired', 'sad', 'angry', 'worried', 'confused'].map(mood => (
                    <button
                      key={mood}
                      className={`p-2 rounded-md flex flex-col items-center ${
                        modalData.mood === mood 
                          ? 'bg-blue-100 border-2 border-blue-500' 
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => setModalData({...modalData, mood})}
                    >
                      <span className="text-2xl mb-1">
                        {mood === 'happy' && '😀'}
                        {mood === 'excited' && '🤩'}
                        {mood === 'calm' && '😌'}
                        {mood === 'tired' && '😴'}
                        {mood === 'sad' && '😔'}
                        {mood === 'angry' && '😠'}
                        {mood === 'worried' && '😟'}
                        {mood === 'confused' && '😕'}
                      </span>
                      <span className="text-xs capitalize font-roboto">{mood}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional details about their mood or feelings"
                  rows="3"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('emotional')}
                disabled={loadingSection === 'emotional'}
              >
                {loadingSection === 'emotional' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Check-in' : 'Save Check-in'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dietary/Meal Modal */}
      {activeModal === 'meal' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Dietary Information' : 'Add Dietary Information'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <div className="flex space-x-2">
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.type === 'allergy' 
                        ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    }`}
                    onClick={() => setModalData({...modalData, type: 'allergy'})}
                  >
                    Allergy
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.type === 'preference' 
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' 
                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => setModalData({...modalData, type: 'preference'})}
                  >
                    Preference
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-roboto ${
                      modalData.type === 'restriction' 
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' 
                        : 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100'
                    }`}
                    onClick={() => setModalData({...modalData, type: 'restriction'})}
                  >
                    Restriction
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  {modalData.type === 'allergy' ? 'Allergy Name' : 
                   modalData.type === 'preference' ? 'Food Preference' : 
                   modalData.type === 'restriction' ? 'Dietary Restriction' : 'Name'}
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    modalData.type === 'allergy' ? 'e.g. Peanuts, Dairy, etc.' : 
                    modalData.type === 'preference' ? 'e.g. Loves broccoli, Dislikes fish, etc.' : 
                    modalData.type === 'restriction' ? 'e.g. Vegetarian, Gluten-free, etc.' : 
                    'Enter name'
                  }
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({...modalData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Details
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    modalData.type === 'allergy' ? 'Description of the allergy, reaction severity, etc.' :
                    modalData.type === 'preference' ? 'Notes about this food preference' :
                    modalData.type === 'restriction' ? 'Details about the dietary restriction' :
                    'Additional details'
                  }
                  rows="3"
                  value={modalData.details || ''}
                  onChange={(e) => setModalData({...modalData, details: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('meal')}
                disabled={loadingSection === 'meal'}
              >
                {loadingSection === 'meal' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Information' : 'Save Information'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Modal */}
      {activeModal === 'event' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Event Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Birthday Party, School Play, etc."
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.type || ''}
                  onChange={(e) => setModalData({...modalData, type: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="birthday">Birthday</option>
                  <option value="school">School Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="celebration">Celebration</option>
                  <option value="family">Family Gathering</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.date || ''}
                    onChange={(e) => setModalData({...modalData, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={modalData.time || ''}
                    onChange={(e) => setModalData({...modalData, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Location (optional)
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Home, School, Community Center, etc."
                  value={modalData.location || ''}
                  onChange={(e) => setModalData({...modalData, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional details about the event"
                  rows="3"
                  value={modalData.description || ''}
                  onChange={(e) => setModalData({...modalData, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('event')}
                disabled={loadingSection === 'event'}
              >
                {loadingSection === 'event' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Event' : 'Save Event'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Milestone Modal */}
      {activeModal === 'milestone' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Milestone' : 'Add New Milestone'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Milestone Title
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. First Steps, Lost a Tooth, etc."
                  value={modalData.title || ''}
                  onChange={(e) => setModalData({...modalData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.type || ''}
                  onChange={(e) => setModalData({...modalData, type: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="achievement">Achievement</option>
                  <option value="physical">Physical Development</option>
                  <option value="social">Social Development</option>
                  <option value="cognitive">Cognitive Development</option>
                  <option value="emotional">Emotional Development</option>
                  <option value="academic">Academic Achievement</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.date || ''}
                  onChange={(e) => setModalData({...modalData, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Details about this milestone"
                  rows="3"
                  value={modalData.description || ''}
                  onChange={(e) => setModalData({...modalData, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('milestone')}
                disabled={loadingSection === 'milestone'}
              >
                {loadingSection === 'milestone' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Milestone' : 'Save Milestone'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Contact Modal (for friends, social tracking) */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium font-roboto">
                {modalData.id ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Child's friend's name"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({...modalData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Relationship
                </label>
                <select
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={modalData.relationship || ''}
                  onChange={(e) => setModalData({...modalData, relationship: e.target.value})}
                >
                  <option value="">Select relationship</option>
                  <option value="friend">Friend</option>
                  <option value="classmate">Classmate</option>
                  <option value="teammate">Teammate</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="relative">Relative</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Parent or guardian's name"
                  value={modalData.parentName || ''}
                  onChange={(e) => setModalData({...modalData, parentName: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Parent Phone (optional)
                  </label>
                  <input
                    type="tel"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone number"
                    value={modalData.parentPhone || ''}
                    onChange={(e) => setModalData({...modalData, parentPhone: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Parent Email (optional)
                  </label>
                  <input
                    type="email"
                    className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Email address"
                    value={modalData.parentEmail || ''}
                    onChange={(e) => setModalData({...modalData, parentEmail: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information"
                  rows="2"
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-roboto hover:bg-gray-50"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-md font-roboto hover:bg-gray-800"
                onClick={() => handleFormSubmit('contact')}
                disabled={loadingSection === 'contact'}
              >
                {loadingSection === 'contact' ? (
                  <span className="flex items-center">
                    <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  modalData.id ? 'Update Contact' : 'Save Contact'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenTrackingTab;