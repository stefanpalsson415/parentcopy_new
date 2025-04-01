import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronDown, ChevronUp, Clock, 
  Heart, AlertCircle, BookOpen, Activity, 
  Users, Cake, Star, Clipboard, Utensils, Gift,
  PlusCircle, Edit, Trash2, CheckCircle, Camera,
  MessageCircle, BarChart2, Filter, Info, Brain,
  AlarmClock, School, Music, User, Smile, Frown,
  Apple, FileText, Award, MapPin, Bell, Sun, Moon, Ban, Palette, ThumbsUp, Coffee
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import DatabaseService from '../../../services/DatabaseService';
import AllieAIEngineService from '../../../services/AllieAIEngineService';

const ChildrenTrackingTab = () => {
  const { 
    selectedUser, 
    familyMembers,
    familyId,
    currentWeek
  } = useFamily();

  // State for expandable sections
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

  // State for children's data
  const [childrenData, setChildrenData] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    date: '',
    time: '',
    doctor: '',
    notes: '',
    childId: '',
    completed: false
  });
  
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    date: '',
    description: '',
    childId: '',
    type: 'achievement' // achievement, growth, other
  });
  
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [growthForm, setGrowthForm] = useState({
    height: '',
    weight: '',
    shoeSize: '',
    clothingSize: '',
    date: '',
    childId: ''
  });
  
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineForm, setRoutineForm] = useState({
    title: '',
    days: [], // Monday, Tuesday, etc.
    startTime: '',
    endTime: '',
    description: '',
    childId: '',
    type: 'morning' // morning, afternoon, evening, bedtime
  });
  
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    subject: '',
    dueDate: '',
    description: '',
    priority: 'medium', // high, medium, low
    completed: false,
    childId: ''
  });
  
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'sports', // sports, art, music, social, other
    location: '',
    startDate: '',
    endDate: '',
    repeatDay: [], // Monday, Tuesday, etc.
    time: '',
    notes: '',
    childId: ''
  });
  
  const [showEmotionalCheckModal, setShowEmotionalCheckModal] = useState(false);
  const [emotionalCheckForm, setEmotionalCheckForm] = useState({
    date: '',
    mood: 'happy', // happy, sad, angry, worried, excited
    notes: '',
    childId: ''
  });
  
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealForm, setMealForm] = useState({
    type: 'preference', // preference, allergy, restriction
    name: '',
    details: '',
    childId: ''
  });
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    childId: '',
    type: 'birthday' // birthday, holiday, school, family, other
  });
  
  const [activeMedicalAppointment, setActiveMedicalAppointment] = useState(null);
  const [activeEmotionalCheck, setActiveEmotionalCheck] = useState(null);
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [activeHomework, setActiveHomework] = useState(null);
  const [activeActivity, setActiveActivity] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  
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
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading children data:", error);
        setLoading(false);
      }
    };
    
    loadChildrenData();
  }, [familyId, familyMembers]);
  
  // Generate AI insights for children data
  const generateAiInsights = async (data) => {
    try {
      // For a real implementation, we would call AllieAIEngineService
      // For now, use some hardcoded insights to showcase the feature
      const insights = [
        {
          type: "medical",
          title: "Upcoming Medical Appointments",
          content: "Sarah has a dental checkup in 2 weeks. Make sure to schedule Emma's annual physical - it's been almost a year.",
          priority: "medium"
        },
        {
          type: "growth",
          title: "Growth Milestone Alert",
          content: "Based on Emma's growth data, she may need new shoes soon. Her last recorded size was from 3 months ago.",
          priority: "low"
        },
        {
          type: "emotional",
          title: "Emotional Well-being Patterns",
          content: "Sarah has reported feeling tired more frequently in the past two weeks. Consider checking in about her sleep schedule.",
          priority: "high"
        },
        {
          type: "homework",
          title: "Academic Progress Insight",
          content: "Alex has completed 85% of assigned homework this month - great progress! Consider reviewing math concepts where he's had challenges.",
          priority: "medium"
        },
        {
          type: "meal",
          title: "Nutritional Balance",
          content: "Children's recorded meals show low vegetable intake this week. Consider adding more colorful vegetables to dinners.",
          priority: "medium"
        }
      ];
      
      // Sort by priority
      insights.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      setAiInsights(insights);
      
      // For real AI integration, would look like:
      /*
      if (AllieAIEngineService) {
        const generatedInsights = await AllieAIEngineService.generateChildrenInsights(
          familyId, 
          data
        );
        setAiInsights(generatedInsights);
      }
      */
    } catch (error) {
      console.error("Error generating AI insights:", error);
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle opening the appointment modal for a specific child
  const handleAddAppointment = (childId) => {
    setAppointmentForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      doctor: '',
      notes: '',
      childId: childId,
      completed: false
    });
    setActiveMedicalAppointment(null);
    setShowAppointmentModal(true);
  };
  
  // Handle form submission for new medical appointment
  const handleAppointmentSubmit = async () => {
    try {
      // Validate form
      if (!appointmentForm.title || !appointmentForm.date) {
        alert("Please fill in title and date");
        return;
      }
      
      // Format appointment data
      const appointmentData = {
        ...appointmentForm,
        id: activeMedicalAppointment ? activeMedicalAppointment.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeMedicalAppointment) {
        // Update existing appointment
        const appointmentIndex = updatedData[appointmentForm.childId].medicalAppointments.findIndex(
          app => app.id === activeMedicalAppointment.id
        );
        
        if (appointmentIndex !== -1) {
          updatedData[appointmentForm.childId].medicalAppointments[appointmentIndex] = appointmentData;
        }
      } else {
        // Add new appointment
        if (!updatedData[appointmentForm.childId].medicalAppointments) {
          updatedData[appointmentForm.childId].medicalAppointments = [];
        }
        
        updatedData[appointmentForm.childId].medicalAppointments.push(appointmentData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${appointmentForm.childId}.medicalAppointments`]: updatedData[appointmentForm.childId].medicalAppointments
      });
      
      // Close modal
      setShowAppointmentModal(false);
      
    } catch (error) {
      console.error("Error saving appointment:", error);
      alert("Failed to save appointment. Please try again.");
    }
  };
  
  // Handle opening the milestone modal for a specific child
  const handleAddMilestone = (childId) => {
    setMilestoneForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      childId: childId,
      type: 'achievement'
    });
    setShowMilestoneModal(true);
  };
  
  // Handle milestone form submission
  const handleMilestoneSubmit = async () => {
    try {
      // Validate form
      if (!milestoneForm.title || !milestoneForm.date) {
        alert("Please fill in title and date");
        return;
      }
      
      // Format milestone data
      const milestoneData = {
        ...milestoneForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (!updatedData[milestoneForm.childId].milestones) {
        updatedData[milestoneForm.childId].milestones = [];
      }
      
      updatedData[milestoneForm.childId].milestones.push(milestoneData);
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${milestoneForm.childId}.milestones`]: updatedData[milestoneForm.childId].milestones
      });
      
      // Close modal
      setShowMilestoneModal(false);
      
    } catch (error) {
      console.error("Error saving milestone:", error);
      alert("Failed to save milestone. Please try again.");
    }
  };
  
  // Handle opening the growth data modal for a specific child
  const handleAddGrowthData = (childId) => {
    setGrowthForm({
      height: '',
      weight: '',
      shoeSize: '',
      clothingSize: '',
      date: new Date().toISOString().split('T')[0],
      childId: childId
    });
    setShowGrowthModal(true);
  };
  
  // Handle growth form submission
  const handleGrowthSubmit = async () => {
    try {
      // Validate form - at least one field should be filled
      if (!growthForm.height && !growthForm.weight && !growthForm.shoeSize && !growthForm.clothingSize) {
        alert("Please fill in at least one measurement");
        return;
      }
      
      // Format growth data
      const growthData = {
        ...growthForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (!updatedData[growthForm.childId].growthData) {
        updatedData[growthForm.childId].growthData = [];
      }
      
      updatedData[growthForm.childId].growthData.push(growthData);
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${growthForm.childId}.growthData`]: updatedData[growthForm.childId].growthData
      });
      
      // Close modal
      setShowGrowthModal(false);
      
    } catch (error) {
      console.error("Error saving growth data:", error);
      alert("Failed to save growth data. Please try again.");
    }
  };

  // Handle adding a routine
  const handleAddRoutine = (childId) => {
    setRoutineForm({
      title: '',
      days: [],
      startTime: '',
      endTime: '',
      description: '',
      childId: childId,
      type: 'morning'
    });
    setActiveRoutine(null);
    setShowRoutineModal(true);
  };
  
  // Handle routine form submission
  const handleRoutineSubmit = async () => {
    try {
      // Validate form
      if (!routineForm.title || routineForm.days.length === 0 || !routineForm.startTime) {
        alert("Please fill in title, days, and start time");
        return;
      }
      
      // Format routine data
      const routineData = {
        ...routineForm,
        id: activeRoutine ? activeRoutine.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeRoutine) {
        // Update existing routine
        const routineIndex = updatedData[routineForm.childId].routines.findIndex(
          r => r.id === activeRoutine.id
        );
        
        if (routineIndex !== -1) {
          updatedData[routineForm.childId].routines[routineIndex] = routineData;
        }
      } else {
        // Add new routine
        if (!updatedData[routineForm.childId].routines) {
          updatedData[routineForm.childId].routines = [];
        }
        
        updatedData[routineForm.childId].routines.push(routineData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${routineForm.childId}.routines`]: updatedData[routineForm.childId].routines
      });
      
      // Close modal
      setShowRoutineModal(false);
      
    } catch (error) {
      console.error("Error saving routine:", error);
      alert("Failed to save routine. Please try again.");
    }
  };
  
  // Handle adding homework
  const handleAddHomework = (childId) => {
    setHomeworkForm({
      title: '',
      subject: '',
      dueDate: new Date().toISOString().split('T')[0],
      description: '',
      priority: 'medium',
      completed: false,
      childId: childId
    });
    setActiveHomework(null);
    setShowHomeworkModal(true);
  };
  
  // Handle homework form submission
  const handleHomeworkSubmit = async () => {
    try {
      // Validate form
      if (!homeworkForm.title || !homeworkForm.subject || !homeworkForm.dueDate) {
        alert("Please fill in title, subject, and due date");
        return;
      }
      
      // Format homework data
      const homeworkData = {
        ...homeworkForm,
        id: activeHomework ? activeHomework.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeHomework) {
        // Update existing homework
        const homeworkIndex = updatedData[homeworkForm.childId].homework.findIndex(
          h => h.id === activeHomework.id
        );
        
        if (homeworkIndex !== -1) {
          updatedData[homeworkForm.childId].homework[homeworkIndex] = homeworkData;
        }
      } else {
        // Add new homework
        if (!updatedData[homeworkForm.childId].homework) {
          updatedData[homeworkForm.childId].homework = [];
        }
        
        updatedData[homeworkForm.childId].homework.push(homeworkData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${homeworkForm.childId}.homework`]: updatedData[homeworkForm.childId].homework
      });
      
      // Close modal
      setShowHomeworkModal(false);
      
    } catch (error) {
      console.error("Error saving homework:", error);
      alert("Failed to save homework. Please try again.");
    }
  };
  
  // Handle adding activity
  const handleAddActivity = (childId) => {
    setActivityForm({
      title: '',
      type: 'sports',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      repeatDay: [],
      time: '',
      notes: '',
      childId: childId
    });
    setActiveActivity(null);
    setShowActivityModal(true);
  };
  
  // Handle activity form submission
  const handleActivitySubmit = async () => {
    try {
      // Validate form
      if (!activityForm.title || !activityForm.type || !activityForm.startDate) {
        alert("Please fill in title, type, and start date");
        return;
      }
      
      // Format activity data
      const activityData = {
        ...activityForm,
        id: activeActivity ? activeActivity.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeActivity) {
        // Update existing activity
        const activityIndex = updatedData[activityForm.childId].activities.findIndex(
          a => a.id === activeActivity.id
        );
        
        if (activityIndex !== -1) {
          updatedData[activityForm.childId].activities[activityIndex] = activityData;
        }
      } else {
        // Add new activity
        if (!updatedData[activityForm.childId].activities) {
          updatedData[activityForm.childId].activities = [];
        }
        
        updatedData[activityForm.childId].activities.push(activityData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${activityForm.childId}.activities`]: updatedData[activityForm.childId].activities
      });
      
      // Close modal
      setShowActivityModal(false);
      
    } catch (error) {
      console.error("Error saving activity:", error);
      alert("Failed to save activity. Please try again.");
    }
  };
  
  // Handle adding emotional check
  const handleAddEmotionalCheck = (childId) => {
    setEmotionalCheckForm({
      date: new Date().toISOString().split('T')[0],
      mood: 'happy',
      notes: '',
      childId: childId
    });
    setActiveEmotionalCheck(null);
    setShowEmotionalCheckModal(true);
  };
  
  // Handle emotional check form submission
  const handleEmotionalCheckSubmit = async () => {
    try {
      // Validate form
      if (!emotionalCheckForm.date || !emotionalCheckForm.mood) {
        alert("Please fill in date and mood");
        return;
      }
      
      // Format emotional check data
      const emotionalCheckData = {
        ...emotionalCheckForm,
        id: activeEmotionalCheck ? activeEmotionalCheck.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeEmotionalCheck) {
        // Update existing emotional check
        const checkIndex = updatedData[emotionalCheckForm.childId].emotionalChecks.findIndex(
          check => check.id === activeEmotionalCheck.id
        );
        
        if (checkIndex !== -1) {
          updatedData[emotionalCheckForm.childId].emotionalChecks[checkIndex] = emotionalCheckData;
        }
      } else {
        // Add new emotional check
        if (!updatedData[emotionalCheckForm.childId].emotionalChecks) {
          updatedData[emotionalCheckForm.childId].emotionalChecks = [];
        }
        
        updatedData[emotionalCheckForm.childId].emotionalChecks.push(emotionalCheckData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${emotionalCheckForm.childId}.emotionalChecks`]: updatedData[emotionalCheckForm.childId].emotionalChecks
      });
      
      // Close modal
      setShowEmotionalCheckModal(false);
      
    } catch (error) {
      console.error("Error saving emotional check:", error);
      alert("Failed to save emotional check. Please try again.");
    }
  };
  
  // Handle adding meal preference/allergy
  const handleAddMeal = (childId) => {
    setMealForm({
      type: 'preference',
      name: '',
      details: '',
      childId: childId
    });
    setShowMealModal(true);
  };
  
  // Handle meal form submission
  const handleMealSubmit = async () => {
    try {
      // Validate form
      if (!mealForm.name) {
        alert("Please fill in the name field");
        return;
      }
      
      // Format meal data
      const mealData = {
        ...mealForm,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (!updatedData[mealForm.childId].meals) {
        updatedData[mealForm.childId].meals = {
          allergies: [],
          preferences: [],
          restrictions: []
        };
      }
      
      // Add to appropriate category
      const category = mealForm.type === 'allergy' ? 'allergies' : 
                       mealForm.type === 'restriction' ? 'restrictions' : 'preferences';
      
      updatedData[mealForm.childId].meals[category].push(mealData);
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${mealForm.childId}.meals.${category}`]: updatedData[mealForm.childId].meals[category]
      });
      
      // Close modal
      setShowMealModal(false);
      
    } catch (error) {
      console.error("Error saving meal data:", error);
      alert("Failed to save meal data. Please try again.");
    }
  };
  
  // Handle adding event
  const handleAddEvent = (childId) => {
    setEventForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      location: '',
      description: '',
      childId: childId,
      type: 'birthday'
    });
    setActiveEvent(null);
    setShowEventModal(true);
  };
  
  // Handle event form submission
  const handleEventSubmit = async () => {
    try {
      // Validate form
      if (!eventForm.title || !eventForm.date) {
        alert("Please fill in title and date");
        return;
      }
      
      // Format event data
      const eventData = {
        ...eventForm,
        id: activeEvent ? activeEvent.id : Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Update local state
      const updatedData = {...childrenData};
      
      if (activeEvent) {
        // Update existing event
        const eventIndex = updatedData[eventForm.childId].events.findIndex(
          e => e.id === activeEvent.id
        );
        
        if (eventIndex !== -1) {
          updatedData[eventForm.childId].events[eventIndex] = eventData;
        }
      } else {
        // Add new event
        if (!updatedData[eventForm.childId].events) {
          updatedData[eventForm.childId].events = [];
        }
        
        updatedData[eventForm.childId].events.push(eventData);
      }
      
      // Update state and save to Firebase
      setChildrenData(updatedData);
      
      // Save to Firebase
      const docRef = doc(db, "families", familyId);
      await updateDoc(docRef, {
        [`childrenData.${eventForm.childId}.events`]: updatedData[eventForm.childId].events
      });
      
      // Close modal
      setShowEventModal(false);
      
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
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
  
  // Get child's name by ID
  const getChildName = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child ? child.name : "Unknown Child";
  };
  
  // Get child's profile picture
  const getChildProfilePicture = (childId) => {
    const child = familyMembers.find(member => member.id === childId);
    return child && child.profilePicture ? child.profilePicture : '/api/placeholder/48/48';
  };

  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, icon, notificationCount = 0) => (
    <div className="border-l-4 border-black p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2" 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto ml-2">{title}</h4>
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
  
  // Render children selection tabs
  const renderChildrenTabs = () => {
    const children = familyMembers.filter(member => member.role === 'child');
    
    if (children.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-lg mb-4">
          <p className="text-gray-500 font-roboto">No children added to your family yet</p>
        </div>
      );
    }
    
    return (
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {children.map(child => (
            <button
              key={child.id}
              className={`px-4 py-2 rounded-full flex items-center whitespace-nowrap ${
                activeChild === child.id ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setActiveChild(child.id)}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                <img 
                  src={child.profilePicture || '/api/placeholder/24/24'} 
                  alt={child.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-roboto">{child.name}</span>
            </button>
          ))}
          
          <button
            className={`px-4 py-2 rounded-full flex items-center whitespace-nowrap ${
              activeChild === null ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => setActiveChild(null)}
          >
            <Users size={16} className="mr-2" />
            <span className="font-roboto">All Children</span>
          </button>
        </div>
      </div>
    );
  };
  
  // Render AI insights section
  const renderAiInsights = () => {
    if (aiInsights.length === 0) return null;
    
    return (
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Brain size={20} className="text-black mr-2" />
          <h3 className="font-medium font-roboto">Allie AI Insights</h3>
        </div>
        
        <div className="space-y-3">
          {aiInsights.map((insight, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                insight.priority === 'high' ? 'border-red-200 bg-red-50' :
                insight.priority === 'medium' ? 'border-amber-200 bg-amber-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <h4 className="font-medium text-sm font-roboto">{insight.title}</h4>
              <p className="text-sm font-roboto mt-1">{insight.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Child component for displaying a medical appointment card
  const AppointmentCard = ({ appointment, childId }) => {
    return (
      <div className={`border rounded-lg p-3 mb-3 ${
        appointment.completed ? 'bg-green-50' : new Date(appointment.date) < new Date() ? 'bg-amber-50' : 'bg-white'
      }`}>
        <div className="flex justify-between">
          <div>
            <h5 className="font-medium font-roboto">{appointment.title}</h5>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(appointment.date)} {appointment.time && `at ${appointment.time}`}
            </p>
            {appointment.doctor && (
              <p className="text-sm text-gray-600 font-roboto">Doctor: {appointment.doctor}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setAppointmentForm({...appointment, childId});
                setActiveMedicalAppointment(appointment);
                setShowAppointmentModal(true);
              }}
            >
              <Edit size={16} />
            </button>
            {!appointment.completed && (
              <button 
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                onClick={async () => {
                  try {
                    // Update appointment as completed
                    const updatedData = {...childrenData};
                    const appointmentIndex = updatedData[childId].medicalAppointments.findIndex(
                      app => app.id === appointment.id
                    );
                    
                    if (appointmentIndex !== -1) {
                      updatedData[childId].medicalAppointments[appointmentIndex].completed = true;
                      
                      // Update state
                      setChildrenData(updatedData);
                      
                      // Save to Firebase
                      const docRef = doc(db, "families", familyId);
                      await updateDoc(docRef, {
                        [`childrenData.${childId}.medicalAppointments`]: updatedData[childId].medicalAppointments
                      });
                    }
                  } catch (error) {
                    console.error("Error marking appointment as completed:", error);
                  }
                }}
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>
        {appointment.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{appointment.notes}</p>
          </div>
        )}
        {appointment.completed && (
          <div className="mt-2 flex items-center text-sm text-green-600 font-roboto">
            <CheckCircle size={14} className="mr-1" />
            Completed
          </div>
        )}
      </div>
    );
  };
  
  // Child component for displaying a milestone card
  const MilestoneCard = ({ milestone, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {milestone.type === 'achievement' && <Star size={16} className="text-amber-500 mr-1" />}
              {milestone.type === 'growth' && <Activity size={16} className="text-green-500 mr-1" />}
              {milestone.type === 'other' && <Cake size={16} className="text-purple-500 mr-1" />}
              <h5 className="font-medium font-roboto">{milestone.title}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(milestone.date)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                // Edit milestone - not implemented yet
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {milestone.description && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{milestone.description}</p>
          </div>
        )}
      </div>
    );
  };
  
  // Child component for displaying a growth measurement card
  const GrowthCard = ({ growth, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <h5 className="font-medium font-roboto">Growth Measurement</h5>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(growth.date)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                // Edit growth data - not implemented yet
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {growth.height && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Height:</span> <span className="font-roboto">{growth.height}</span>
            </div>
          )}
          {growth.weight && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Weight:</span> <span className="font-roboto">{growth.weight}</span>
            </div>
          )}
          {growth.shoeSize && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Shoe Size:</span> <span className="font-roboto">{growth.shoeSize}</span>
            </div>
          )}
          {growth.clothingSize && (
            <div className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium font-roboto">Clothing Size:</span> <span className="font-roboto">{growth.clothingSize}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Child component for displaying a routine card
  const RoutineCard = ({ routine, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {routine.type === 'morning' && <Coffee size={16} className="text-blue-500 mr-1" />}
              {routine.type === 'afternoon' && <Sun size={16} className="text-amber-500 mr-1" />}
              {routine.type === 'evening' && <Moon size={16} className="text-purple-500 mr-1" />}
              {routine.type === 'bedtime' && <Moon size={16} className="text-indigo-500 mr-1" />}
              <h5 className="font-medium font-roboto">{routine.title}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Time: {routine.startTime} {routine.endTime && `- ${routine.endTime}`}
            </p>
            <p className="text-sm text-gray-600 font-roboto">
              Days: {routine.days.join(', ')}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setRoutineForm({...routine, childId});
                setActiveRoutine(routine);
                setShowRoutineModal(true);
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {routine.description && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{routine.description}</p>
          </div>
        )}
      </div>
    );
  };

  // Child component for displaying a homework card
  const HomeworkCard = ({ homework, childId }) => {
    return (
      <div className={`border rounded-lg p-3 mb-3 ${
        homework.completed ? 'bg-green-50' : 
        new Date(homework.dueDate) < new Date() ? 'bg-red-50' : 
        'bg-white'
      }`}>
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {homework.priority === 'high' && <AlertCircle size={16} className="text-red-500 mr-1" />}
              {homework.priority === 'medium' && <Info size={16} className="text-amber-500 mr-1" />}
              {homework.priority === 'low' && <Info size={16} className="text-blue-500 mr-1" />}
              <h5 className="font-medium font-roboto">{homework.title}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Subject: {homework.subject}
            </p>
            <p className="text-sm text-gray-600 font-roboto">
              Due: {formatDate(homework.dueDate)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setHomeworkForm({...homework, childId});
                setActiveHomework(homework);
                setShowHomeworkModal(true);
              }}
            >
              <Edit size={16} />
            </button>
            {!homework.completed && (
              <button 
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                onClick={async () => {
                  try {
                    // Update homework as completed
                    const updatedData = {...childrenData};
                    const homeworkIndex = updatedData[childId].homework.findIndex(
                      h => h.id === homework.id
                    );
                    
                    if (homeworkIndex !== -1) {
                      updatedData[childId].homework[homeworkIndex].completed = true;
                      
                      // Update state
                      setChildrenData(updatedData);
                      
                      // Save to Firebase
                      const docRef = doc(db, "families", familyId);
                      await updateDoc(docRef, {
                        [`childrenData.${childId}.homework`]: updatedData[childId].homework
                      });
                    }
                  } catch (error) {
                    console.error("Error marking homework as completed:", error);
                  }
                }}
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>
        {homework.description && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{homework.description}</p>
          </div>
        )}
        {homework.completed && (
          <div className="mt-2 flex items-center text-sm text-green-600 font-roboto">
            <CheckCircle size={14} className="mr-1" />
            Completed
          </div>
        )}
      </div>
    );
  };

  // Child component for displaying an activity card
  const ActivityCard = ({ activity, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {activity.type === 'sports' && <Activity size={16} className="text-green-500 mr-1" />}
              {activity.type === 'art' && <Palette size={16} className="text-purple-500 mr-1" />}
              {activity.type === 'music' && <Music size={16} className="text-blue-500 mr-1" />}
              {activity.type === 'social' && <Users size={16} className="text-amber-500 mr-1" />}
              {activity.type === 'other' && <Star size={16} className="text-red-500 mr-1" />}
              <h5 className="font-medium font-roboto">{activity.title}</h5>
            </div>
            {activity.location && (
              <p className="text-sm text-gray-600 font-roboto">
                Location: {activity.location}
              </p>
            )}
            <p className="text-sm text-gray-600 font-roboto">
              Dates: {formatDate(activity.startDate)} 
              {activity.endDate && ` - ${formatDate(activity.endDate)}`}
            </p>
            {activity.repeatDay && activity.repeatDay.length > 0 && (
              <p className="text-sm text-gray-600 font-roboto">
                Days: {activity.repeatDay.join(', ')}
              </p>
            )}
            {activity.time && (
              <p className="text-sm text-gray-600 font-roboto">
                Time: {activity.time}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setActivityForm({...activity, childId});
                setActiveActivity(activity);
                setShowActivityModal(true);
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {activity.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{activity.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // Child component for displaying an emotional check card
  const EmotionalCheckCard = ({ check, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {check.mood === 'happy' && <Smile size={16} className="text-green-500 mr-1" />}
              {check.mood === 'sad' && <Frown size={16} className="text-blue-500 mr-1" />}
              {check.mood === 'angry' && <Frown size={16} className="text-red-500 mr-1" />}
              {check.mood === 'worried' && <Frown size={16} className="text-amber-500 mr-1" />}
              {check.mood === 'excited' && <Smile size={16} className="text-purple-500 mr-1" />}
              <h5 className="font-medium font-roboto">Mood: {check.mood.charAt(0).toUpperCase() + check.mood.slice(1)}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(check.date)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setEmotionalCheckForm({...check, childId});
                setActiveEmotionalCheck(check);
                setShowEmotionalCheckModal(true);
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {check.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{check.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // Child component for displaying a meal item card
  const MealItemCard = ({ item, childId, category }) => {
    return (
      <div className={`border rounded-lg p-3 mb-3 ${
        category === 'allergies' ? 'bg-red-50' : 
        category === 'restrictions' ? 'bg-amber-50' : 
        'bg-white'
      }`}>
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {category === 'allergies' && <AlertCircle size={16} className="text-red-500 mr-1" />}
              {category === 'restrictions' && <Ban size={16} className="text-amber-500 mr-1" />}
              {category === 'preferences' && <ThumbsUp size={16} className="text-green-500 mr-1" />}
              <h5 className="font-medium font-roboto">{item.name}</h5>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              onClick={async () => {
                try {
                  // Remove meal item
                  const updatedData = {...childrenData};
                  updatedData[childId].meals[category] = updatedData[childId].meals[category].filter(
                    i => i.id !== item.id
                  );
                  
                  // Update state
                  setChildrenData(updatedData);
                  
                  // Save to Firebase
                  const docRef = doc(db, "families", familyId);
                  await updateDoc(docRef, {
                    [`childrenData.${childId}.meals.${category}`]: updatedData[childId].meals[category]
                  });
                } catch (error) {
                  console.error("Error removing meal item:", error);
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {item.details && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{item.details}</p>
          </div>
        )}
      </div>
    );
  };

  // Child component for displaying an event card
  const EventCard = ({ event, childId }) => {
    return (
      <div className="border rounded-lg p-3 mb-3 bg-white">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center">
              {event.type === 'birthday' && <Cake size={16} className="text-pink-500 mr-1" />}
              {event.type === 'holiday' && <Gift size={16} className="text-red-500 mr-1" />}
              {event.type === 'school' && <School size={16} className="text-blue-500 mr-1" />}
              {event.type === 'family' && <Users size={16} className="text-green-500 mr-1" />}
              {event.type === 'other' && <Calendar size={16} className="text-purple-500 mr-1" />}
              <h5 className="font-medium font-roboto">{event.title}</h5>
            </div>
            <p className="text-sm text-gray-600 font-roboto">
              Date: {formatDate(event.date)} {event.time && `at ${event.time}`}
            </p>
            {event.location && (
              <p className="text-sm text-gray-600 font-roboto">
                Location: {event.location}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setEventForm({...event, childId});
                setActiveEvent(event);
                setShowEventModal(true);
              }}
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        {event.description && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
            <p>{event.description}</p>
          </div>
        )}
      </div>
    );
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
      <div className="space-y-4">
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Medical Appointments</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddAppointment(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Appointment
              </button>
            </div>
            
            <div className="space-y-2">
              {childrenData[child.id]?.medicalAppointments?.length > 0 ? (
                childrenData[child.id].medicalAppointments
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(appointment => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment} 
                      childId={child.id} 
                    />
                  ))
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No medical appointments added yet</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Growth & Development</h5>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                  onClick={() => handleAddGrowthData(child.id)}
                >
                  <PlusCircle size={14} className="mr-1" />
                  Add Measurement
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Latest measurements */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Latest Measurements</h6>
                {childrenData[child.id]?.growthData?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {childrenData[child.id].growthData
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 1)
                      .map(growth => (
                        <GrowthCard key={growth.id} growth={growth} childId={child.id} />
                      ))}
                    
                    {/* Growth chart placeholder */}
                    <div className="border rounded-lg p-3 h-40 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <BarChart2 size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-roboto">Growth chart will appear here</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 font-roboto">No growth measurements added yet</p>
                  </div>
                )}
              </div>
              
              {/* Historical measurements */}
              {childrenData[child.id]?.growthData?.length > 1 && (
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2">History</h6>
                  <div className="space-y-2">
                    {childrenData[child.id].growthData
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(1)
                      .map(growth => (
                        <GrowthCard key={growth.id} growth={growth} childId={child.id} />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Clothing & shoe sizes */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h6 className="text-sm font-medium font-roboto mb-2">Current Sizes</h6>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-sm font-medium font-roboto">Clothing Size:</span>
                    <span className="text-sm ml-1 font-roboto">
                      {childrenData[child.id]?.growthData?.length > 0 
                        ? childrenData[child.id].growthData
                            .filter(g => g.clothingSize)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.clothingSize || 'Not recorded'
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-sm font-medium font-roboto">Shoe Size:</span>
                    <span className="text-sm ml-1 font-roboto">
                      {childrenData[child.id]?.growthData?.length > 0 
                        ? childrenData[child.id].growthData
                            .filter(g => g.shoeSize)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.shoeSize || 'Not recorded'
                        : 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the daily routines section
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Daily Routines</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddRoutine(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Routine
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Morning routines */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Coffee size={14} className="text-blue-500 mr-1" />
                    Morning Routines
                  </h6>
                  {childrenData[child.id]?.routines?.filter(r => r.type === 'morning').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].routines
                        .filter(r => r.type === 'morning')
                        .map(routine => (
                          <RoutineCard key={routine.id} routine={routine} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No morning routines added</p>
                    </div>
                  )}
                </div>
                
                {/* Afternoon routines */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Sun size={14} className="text-amber-500 mr-1" />
                    Afternoon Routines
                  </h6>
                  {childrenData[child.id]?.routines?.filter(r => r.type === 'afternoon').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].routines
                        .filter(r => r.type === 'afternoon')
                        .map(routine => (
                          <RoutineCard key={routine.id} routine={routine} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No afternoon routines added</p>
                    </div>
                  )}
                </div>
                
                {/* Evening routines */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Moon size={14} className="text-purple-500 mr-1" />
                    Evening Routines
                  </h6>
                  {childrenData[child.id]?.routines?.filter(r => r.type === 'evening').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].routines
                        .filter(r => r.type === 'evening')
                        .map(routine => (
                          <RoutineCard key={routine.id} routine={routine} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No evening routines added</p>
                    </div>
                  )}
                </div>
                
                {/* Bedtime routines */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Moon size={14} className="text-indigo-500 mr-1" />
                    Bedtime Routines
                  </h6>
                  {childrenData[child.id]?.routines?.filter(r => r.type === 'bedtime').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].routines
                        .filter(r => r.type === 'bedtime')
                        .map(routine => (
                          <RoutineCard key={routine.id} routine={routine} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No bedtime routines added</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Weekly schedule view */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Weekly Schedule</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Weekly schedule view will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the homework section
  const renderHomeworkSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Homework & Academics</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddHomework(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Homework
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Upcoming homework */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Upcoming Homework</h6>
                {childrenData[child.id]?.homework?.filter(h => !h.completed && new Date(h.dueDate) >= new Date()).length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].homework
                      .filter(h => !h.completed && new Date(h.dueDate) >= new Date())
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .map(homework => (
                        <HomeworkCard key={homework.id} homework={homework} childId={child.id} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No upcoming homework</p>
                  </div>
                )}
              </div>
              
              {/* Overdue homework */}
              {childrenData[child.id]?.homework?.filter(h => !h.completed && new Date(h.dueDate) < new Date()).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <AlertCircle size={14} className="text-red-500 mr-1" />
                    Overdue Homework
                  </h6>
                  <div className="space-y-2">
                    {childrenData[child.id].homework
                      .filter(h => !h.completed && new Date(h.dueDate) < new Date())
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .map(homework => (
                        <HomeworkCard key={homework.id} homework={homework} childId={child.id} />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Completed homework */}
              {childrenData[child.id]?.homework?.filter(h => h.completed).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <CheckCircle size={14} className="text-green-500 mr-1" />
                    Completed Homework
                  </h6>
                  <div className="space-y-2">
                    {childrenData[child.id].homework
                      .filter(h => h.completed)
                      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
                      .map(homework => (
                        <HomeworkCard key={homework.id} homework={homework} childId={child.id} />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Academic progress chart */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Academic Progress</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <BarChart2 size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Academic progress chart will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the activities section
  const renderActivitiesSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Activities</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddActivity(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Activity
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Activities by type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sports activities */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Activity size={14} className="text-green-500 mr-1" />
                    Sports
                  </h6>
                  {childrenData[child.id]?.activities?.filter(a => a.type === 'sports').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .filter(a => a.type === 'sports')
                        .map(activity => (
                          <ActivityCard key={activity.id} activity={activity} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No sports activities</p>
                    </div>
                  )}
                </div>
                
                {/* Art activities */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Palette size={14} className="text-purple-500 mr-1" />
                    Arts & Crafts
                  </h6>
                  {childrenData[child.id]?.activities?.filter(a => a.type === 'art').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .filter(a => a.type === 'art')
                        .map(activity => (
                          <ActivityCard key={activity.id} activity={activity} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No art activities</p>
                    </div>
                  )}
                </div>
                
                {/* Music activities */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Music size={14} className="text-blue-500 mr-1" />
                    Music
                  </h6>
                  {childrenData[child.id]?.activities?.filter(a => a.type === 'music').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .filter(a => a.type === 'music')
                        .map(activity => (
                          <ActivityCard key={activity.id} activity={activity} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No music activities</p>
                    </div>
                  )}
                </div>
                
                {/* Social activities */}
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                    <Users size={14} className="text-amber-500 mr-1" />
                    Social
                  </h6>
                  {childrenData[child.id]?.activities?.filter(a => a.type === 'social').length > 0 ? (
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .filter(a => a.type === 'social')
                        .map(activity => (
                          <ActivityCard key={activity.id} activity={activity} childId={child.id} />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No social activities</p>
                    </div>
                  )}
                </div>
                
                {/* Other activities */}
                {childrenData[child.id]?.activities?.filter(a => a.type === 'other').length > 0 && (
                  <div>
                    <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                      <Star size={14} className="text-red-500 mr-1" />
                      Other Activities
                    </h6>
                    <div className="space-y-2">
                      {childrenData[child.id].activities
                        .filter(a => a.type === 'other')
                        .map(activity => (
                          <ActivityCard key={activity.id} activity={activity} childId={child.id} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Activity calendar */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Activity Calendar</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Activity calendar will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the emotional check-ins section
  const renderEmotionalSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Emotional Well-being</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddEmotionalCheck(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Check-in
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Latest mood */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Current Mood</h6>
                {childrenData[child.id]?.emotionalChecks?.length > 0 ? (
                  <div className="bg-white p-3 rounded-lg border">
                    {(() => {
                      const latestCheck = childrenData[child.id].emotionalChecks
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                      
                      return (
                        <div className="flex flex-col items-center">
                          <div className="text-4xl mb-2">
                            {latestCheck.mood === 'happy' && '😊'}
                            {latestCheck.mood === 'sad' && '😢'}
                            {latestCheck.mood === 'angry' && '😠'}
                            {latestCheck.mood === 'worried' && '😟'}
                            {latestCheck.mood === 'excited' && '😃'}
                          </div>
                          <p className="font-medium font-roboto">{latestCheck.mood.charAt(0).toUpperCase() + latestCheck.mood.slice(1)}</p>
                          <p className="text-sm text-gray-500 font-roboto">Last updated: {formatDate(latestCheck.date)}</p>
                          {latestCheck.notes && (
                            <p className="mt-2 text-sm italic font-roboto">"{latestCheck.notes}"</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No mood check-ins recorded yet</p>
                  </div>
                )}
              </div>
              
              {/* Mood history */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Mood History</h6>
                {childrenData[child.id]?.emotionalChecks?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].emotionalChecks
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 5)
                      .map(check => (
                        <EmotionalCheckCard key={check.id} check={check} childId={child.id} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No mood history available</p>
                  </div>
                )}
              </div>
              
              {/* Mood trends */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Mood Trends</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <BarChart2 size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Mood trend chart will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the meal planning section
  const renderMealsSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Meal Information</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddMeal(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Meal Info
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Allergies */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                  <AlertCircle size={14} className="text-red-500 mr-1" />
                  Allergies & Restrictions
                </h6>
                {childrenData[child.id]?.meals?.allergies?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].meals.allergies.map(item => (
                      <MealItemCard key={item.id} item={item} childId={child.id} category="allergies" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No allergies recorded</p>
                  </div>
                )}
              </div>
              
              {/* Dietary Restrictions */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                  <Ban size={14} className="text-amber-500 mr-1" />
                  Dietary Restrictions
                </h6>
                {childrenData[child.id]?.meals?.restrictions?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].meals.restrictions.map(item => (
                      <MealItemCard key={item.id} item={item} childId={child.id} category="restrictions" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No dietary restrictions recorded</p>
                  </div>
                )}
              </div>
              
              {/* Food Preferences */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2 flex items-center">
                  <ThumbsUp size={14} className="text-green-500 mr-1" />
                  Food Preferences
                </h6>
                {childrenData[child.id]?.meals?.preferences?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].meals.preferences.map(item => (
                      <MealItemCard key={item.id} item={item} childId={child.id} category="preferences" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No food preferences recorded</p>
                  </div>
                )}
              </div>
              
              {/* Meal planning */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Meal Planning</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Utensils size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Meal planning calendar will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the events section
  const renderEventsSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Special Events</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddEvent(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Event
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Upcoming events */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Upcoming Events</h6>
                {childrenData[child.id]?.events?.filter(e => new Date(e.date) >= new Date()).length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].events
                      .filter(e => new Date(e.date) >= new Date())
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map(event => (
                        <EventCard key={event.id} event={event} childId={child.id} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No upcoming events</p>
                  </div>
                )}
              </div>
              
              {/* Past events */}
              {childrenData[child.id]?.events?.filter(e => new Date(e.date) < new Date()).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium font-roboto mb-2">Past Events</h6>
                  <div className="space-y-2">
                    {childrenData[child.id].events
                      .filter(e => new Date(e.date) < new Date())
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(event => (
                        <EventCard key={event.id} event={event} childId={child.id} />
                      ))}
                  </div>
                </div>
              )}
              
              {/* Events calendar */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Events Calendar</h6>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-roboto">Events calendar will appear here</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the milestones section
  const renderMilestonesSection = () => {
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
        {filteredChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={child.profilePicture || '/api/placeholder/32/32'} 
                    alt={child.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h5 className="font-medium font-roboto">{child.name}'s Milestones</h5>
              </div>
              <button 
                className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800 font-roboto flex items-center"
                onClick={() => handleAddMilestone(child.id)}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Milestone
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Recent milestones */}
              <div>
                <h6 className="text-sm font-medium font-roboto mb-2">Recent Milestones</h6>
                {childrenData[child.id]?.milestones?.length > 0 ? (
                  <div className="space-y-2">
                    {childrenData[child.id].milestones
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 3)
                      .map(milestone => (
                        <MilestoneCard key={milestone.id} milestone={milestone} childId={child.id} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 font-roboto">No milestones recorded yet</p>
                  </div>
                )}
              </div>
              
              {/* Milestone timeline */}
              <div className="mt-4">
                <h6 className="text-sm font-medium font-roboto mb-2">Milestone Timeline</h6>
                {childrenData[child.id]?.milestones?.length > 0 ? (
                  <div className="relative pt-6 pb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-full bg-gray-300"></div>
                    </div>
                    
                    <div className="relative space-y-8">
                      {childrenData[child.id].milestones
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(milestone => (
                          <div key={milestone.id} className="relative">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-500 z-10"></div>
                              <div className="ml-6">
                                <div className="flex items-center">
                                  {milestone.type === 'achievement' && <Star size={16} className="text-amber-500 mr-1" />}
                                  {milestone.type === 'growth' && <Activity size={16} className="text-green-500 mr-1" />}
                                  {milestone.type === 'other' && <Cake size={16} className="text-purple-500 mr-1" />}
                                  <h6 className="font-medium text-sm font-roboto">{milestone.title}</h6>
                                </div>
                                <p className="text-xs text-gray-500 font-roboto">
                                  {formatDate(milestone.date)}
                                </p>
                                {milestone.description && (
                                  <p className="text-sm mt-1 font-roboto">{milestone.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Award size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-roboto">Milestone timeline will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-4">
            <Users size={32} className="text-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Children Tracking Dashboard</h3>
            <p className="text-gray-600 font-roboto">
              Keep track of your children's appointments, growth, routines, academics, activities, 
              emotional well-being, meals, events, and milestones all in one place.
            </p>
          </div>
        </div>
        
        {/* Child selection tabs */}
        {renderChildrenTabs()}
        
        {/* AI insights */}
        {renderAiInsights()}
      </div>
      
      {/* Medical & Health Appointments Section */}
      {renderSectionHeader("Medical & Health Appointments", "medical", <Heart size={20} className="text-red-500" />)}
      {expandedSections.medical && renderMedicalSection()}
      
      {/* Growth & Development Section */}
      {renderSectionHeader("Growth & Development", "growth", <Activity size={20} className="text-green-500" />)}
      {expandedSections.growth && renderGrowthSection()}
      
      {/* Daily Routines Section */}
      {renderSectionHeader("Daily Routines & Schedules", "routines", <Clock size={20} className="text-blue-500" />)}
      {expandedSections.routines && renderRoutinesSection()}
      
      {/* Homework Section */}
      {renderSectionHeader("Homework & Academic Checkpoints", "homework", <BookOpen size={20} className="text-amber-500" />)}
      {expandedSections.homework && renderHomeworkSection()}
      
      {/* Activities Section */}
      {renderSectionHeader("Social & Extracurricular Activities", "activities", <Users size={20} className="text-purple-500" />)}
      {expandedSections.activities && renderActivitiesSection()}
      
      {/* Emotional Check-ins Section */}
      {renderSectionHeader("Emotional & Behavioral Check-ins", "emotional", <Heart size={20} className="text-pink-500" />)}
      {expandedSections.emotional && renderEmotionalSection()}
      
      {/* Meal Planning Section */}
      {renderSectionHeader("Meal Planning & Dietary Needs", "meals", <Utensils size={20} className="text-orange-500" />)}
      {expandedSections.meals && renderMealsSection()}
      
      {/* Events Section */}
      {renderSectionHeader("Family Calendar & Special Events", "events", <Calendar size={20} className="text-indigo-500" />)}
      {expandedSections.events && renderEventsSection()}
      
      {/* Milestones Section */}
      {renderSectionHeader("Milestone Memories & Celebrations", "milestones", <Award size={20} className="text-yellow-500" />)}
      {expandedSections.milestones && renderMilestonesSection()}
      
      {/* Modal for adding medical appointment */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeMedicalAppointment ? 'Edit Appointment' : 'Add Medical Appointment'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Annual Checkup, Dentist"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Time (optional)
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded font-roboto"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Doctor/Provider (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Dr. Smith"
                  value={appointmentForm.doctor}
                  onChange={(e) => setAppointmentForm({...appointmentForm, doctor: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Bring insurance card, questions to ask"
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
                ></textarea>
              </div>
              
              {activeMedicalAppointment && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="completed"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={appointmentForm.completed}
                    onChange={(e) => setAppointmentForm({...appointmentForm, completed: e.target.checked})}
                  />
                  <label htmlFor="completed" className="ml-2 block text-sm text-gray-900 font-roboto">
                    Mark as completed
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowAppointmentModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleAppointmentSubmit}
              >
                {activeMedicalAppointment ? 'Save Changes' : 'Add Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding milestone */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">Add Milestone</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., First Steps, Lost First Tooth"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({...milestoneForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={milestoneForm.date}
                  onChange={(e) => setMilestoneForm({...milestoneForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={milestoneForm.type}
                  onChange={(e) => setMilestoneForm({...milestoneForm, type: e.target.value})}
                >
                  <option value="achievement">Achievement</option>
                  <option value="growth">Growth & Development</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Took first steps while at grandma's house"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowMilestoneModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleMilestoneSubmit}
              >
                Add Milestone
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding growth data */}
      {showGrowthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">Add Growth Measurement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={growthForm.date}
                  onChange={(e) => setGrowthForm({...growthForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Height (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., 3'6 or 107 cm"
                  value={growthForm.height}
                  onChange={(e) => setGrowthForm({...growthForm, height: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Weight (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., 45 lbs or 20 kg"
                  value={growthForm.weight}
                  onChange={(e) => setGrowthForm({...growthForm, weight: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Shoe Size (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., 5 (US Child)"
                  value={growthForm.shoeSize}
                  onChange={(e) => setGrowthForm({...growthForm, shoeSize: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Clothing Size (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., 5T, Small, etc."
                  value={growthForm.clothingSize}
                  onChange={(e) => setGrowthForm({...growthForm, clothingSize: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowGrowthModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleGrowthSubmit}
              >
                Add Measurement
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding routine */}
      {showRoutineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeRoutine ? 'Edit Routine' : 'Add Routine'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Morning Prepare for School"
                  value={routineForm.title}
                  onChange={(e) => setRoutineForm({...routineForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={routineForm.type}
                  onChange={(e) => setRoutineForm({...routineForm, type: e.target.value})}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="bedtime">Bedtime</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Days
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`p-2 text-xs text-center rounded ${
                        routineForm.days.includes(day) 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      } font-roboto`}
                      onClick={() => {
                        if (routineForm.days.includes(day)) {
                          setRoutineForm({
                            ...routineForm, 
                            days: routineForm.days.filter(d => d !== day)
                          });
                        } else {
                          setRoutineForm({
                            ...routineForm,
                            days: [...routineForm.days, day]
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
                  Start Time
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded font-roboto"
                  value={routineForm.startTime}
                  onChange={(e) => setRoutineForm({...routineForm, startTime: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  End Time (optional)
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded font-roboto"
                  value={routineForm.endTime}
                  onChange={(e) => setRoutineForm({...routineForm, endTime: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Steps involved in the routine"
                  value={routineForm.description}
                  onChange={(e) => setRoutineForm({...routineForm, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowRoutineModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleRoutineSubmit}
              >
                {activeRoutine ? 'Save Changes' : 'Add Routine'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding homework */}
      {showHomeworkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeHomework ? 'Edit Homework' : 'Add Homework'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Math Homework, Science Project"
                  value={homeworkForm.title}
                  onChange={(e) => setHomeworkForm({...homeworkForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Math, Science, Reading"
                  value={homeworkForm.subject}
                  onChange={(e) => setHomeworkForm({...homeworkForm, subject: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={homeworkForm.dueDate}
                  onChange={(e) => setHomeworkForm({...homeworkForm, dueDate: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Priority
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={homeworkForm.priority}
                  onChange={(e) => setHomeworkForm({...homeworkForm, priority: e.target.value})}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Pages 15-20, Problems 1-10"
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm({...homeworkForm, description: e.target.value})}
                ></textarea>
              </div>
              
              {activeHomework && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="completed"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={homeworkForm.completed}
                    onChange={(e) => setHomeworkForm({...homeworkForm, completed: e.target.checked})}
                  />
                  <label htmlFor="completed" className="ml-2 block text-sm text-gray-900 font-roboto">
                    Mark as completed
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowHomeworkModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleHomeworkSubmit}
              >
                {activeHomework ? 'Save Changes' : 'Add Homework'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding activity */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeActivity ? 'Edit Activity' : 'Add Activity'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Soccer Practice, Piano Lessons"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({...activityForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({...activityForm, type: e.target.value})}
                >
                  <option value="sports">Sports</option>
                  <option value="art">Arts & Crafts</option>
                  <option value="music">Music</option>
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
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Community Center, School"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({...activityForm, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={activityForm.startDate}
                  onChange={(e) => setActivityForm({...activityForm, startDate: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={activityForm.endDate}
                  onChange={(e) => setActivityForm({...activityForm, endDate: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Repeat Days (for recurring activities)
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`p-2 text-xs text-center rounded ${
                        activityForm.repeatDay.includes(day) 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      } font-roboto`}
                      onClick={() => {
                        if (activityForm.repeatDay.includes(day)) {
                          setActivityForm({
                            ...activityForm, 
                            repeatDay: activityForm.repeatDay.filter(d => d !== day)
                          });
                        } else {
                          setActivityForm({
                            ...activityForm,
                            repeatDay: [...activityForm.repeatDay, day]
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
                <input
                  type="time"
                  className="w-full p-2 border rounded font-roboto"
                  value={activityForm.time}
                  onChange={(e) => setActivityForm({...activityForm, time: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Bring water bottle, uniform requirements"
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({...activityForm, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowActivityModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleActivitySubmit}
              >
                {activeActivity ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding emotional check */}
      {showEmotionalCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeEmotionalCheck ? 'Edit Emotional Check-in' : 'Add Emotional Check-in'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={emotionalCheckForm.date}
                  onChange={(e) => setEmotionalCheckForm({...emotionalCheckForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Mood
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['happy', 'sad', 'angry', 'worried', 'excited'].map(mood => (
                    <button
                      key={mood}
                      type="button"
                      className={`p-3 flex flex-col items-center ${
                        emotionalCheckForm.mood === mood
                          ? 'bg-blue-100 border-blue-300 border-2'
                          : 'bg-gray-50 border'
                      } rounded-lg`}
                      onClick={() => setEmotionalCheckForm({...emotionalCheckForm, mood})}
                    >
                      <span className="text-2xl mb-1">
                        {mood === 'happy' && '😊'}
                        {mood === 'sad' && '😢'}
                        {mood === 'angry' && '😠'}
                        {mood === 'worried' && '😟'}
                        {mood === 'excited' && '😃'}
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
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., Why they're feeling this way, any context"
                  value={emotionalCheckForm.notes}
                  onChange={(e) => setEmotionalCheckForm({...emotionalCheckForm, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowEmotionalCheckModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleEmotionalCheckSubmit}
              >
                {activeEmotionalCheck ? 'Save Changes' : 'Add Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding meal */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">Add Meal Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={mealForm.type}
                  onChange={(e) => setMealForm({...mealForm, type: e.target.value})}
                >
                  <option value="preference">Food Preference</option>
                  <option value="allergy">Food Allergy</option>
                  <option value="restriction">Dietary Restriction</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  {mealForm.type === 'preference' ? 'Food Name' : 
                   mealForm.type === 'allergy' ? 'Allergen' : 'Restriction'}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder={
                    mealForm.type === 'preference' ? 'E.g., Broccoli, Pizza' : 
                    mealForm.type === 'allergy' ? 'E.g., Peanuts, Dairy' : 
                    'E.g., Vegetarian, Gluten-free'
                  }
                  value={mealForm.name}
                  onChange={(e) => setMealForm({...mealForm, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Details (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder={
                    mealForm.type === 'preference' ? 'E.g., Likes with cheese' : 
                    mealForm.type === 'allergy' ? 'E.g., Severity, symptoms' : 
                    'E.g., Religious or personal reasons'
                  }
                  value={mealForm.details}
                  onChange={(e) => setMealForm({...mealForm, details: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowMealModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleMealSubmit}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for adding event */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 font-roboto">
              {activeEvent ? 'Edit Event' : 'Add Event'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., Birthday Party, School Play"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Type
                </label>
                <select
                  className="w-full p-2 border rounded font-roboto"
                  value={eventForm.type}
                  onChange={(e) => setEventForm({...eventForm, type: e.target.value})}
                >
                  <option value="birthday">Birthday</option>
                  <option value="holiday">Holiday</option>
                  <option value="school">School Event</option>
                  <option value="family">Family Gathering</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded font-roboto"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Time (optional)
                </label>
                <input
                  type="time"
                  className="w-full p-2 border rounded font-roboto"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Location (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-roboto"
                  placeholder="E.g., School Auditorium, Grandma's House"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Description (optional)
                </label>
                <textarea
                  className="w-full p-2 border rounded font-roboto"
                  rows="3"
                  placeholder="E.g., What to bring, dress code, special notes"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border rounded font-roboto"
                onClick={() => setShowEventModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded font-roboto"
                onClick={handleEventSubmit}
              >
                {activeEvent ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenTrackingTab;