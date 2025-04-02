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
      <button className="p-2 rounded-full hover:bg-gray