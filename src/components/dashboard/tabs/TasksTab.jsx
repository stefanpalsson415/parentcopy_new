import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Sparkles, Brain, Info, Edit, CheckCircle2, Target, Heart, LogOut, HelpCircle, Camera, Image } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DatabaseService from '../../../services/DatabaseService';
import CoupleCheckInScreen from '../../assessment/CoupleCheckInScreen';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';

// AI-powered task generation based on survey data
const analyzeTaskImbalances = (surveyResponses, fullQuestionSet) => {
  const categories = {
    "Visible Household Tasks": { mama: 0, papa: 0, total: 0, imbalance: 0, mamaPercent: 0, papaPercent: 0 },
    "Invisible Household Tasks": { mama: 0, papa: 0, total: 0, imbalance: 0, mamaPercent: 0, papaPercent: 0 },
    "Visible Parental Tasks": { mama: 0, papa: 0, total: 0, imbalance: 0, mamaPercent: 0, papaPercent: 0 },
    "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0, imbalance: 0, mamaPercent: 0, papaPercent: 0 }
  };
  
  // Count responses by category and parent
  Object.entries(surveyResponses).forEach(([key, value]) => {
    if (!key.includes('q')) return; // Skip non-question keys
    
    // Extract question ID
    const questionId = key.includes('-') ? key.split('-').pop() : key;
    const question = fullQuestionSet.find(q => q.id === questionId);
    
    if (!question) return;
    
    const category = question.category;
    if (categories[category]) {
      categories[category].total++;
      if (value === 'Mama') categories[category].mama++;
      else if (value === 'Papa') categories[category].papa++;
    }
  });
  
  // Calculate imbalance scores and percentages for each category
  Object.keys(categories).forEach(category => {
    const data = categories[category];
    if (data.total === 0) return;
    
    const mamaPercent = (data.mama / data.total) * 100;
    const papaPercent = (data.papa / data.total) * 100;
    
    // Imbalance score - higher means more unequal
    data.imbalance = Math.abs(mamaPercent - papaPercent);
    data.mamaPercent = mamaPercent;
    data.papaPercent = papaPercent;
  });
  
  return categories;
};

// Generate default tasks when data is unavailable
const generateDefaultTasks = (weekNumber) => {
  const taskPrefix = weekNumber ? `${weekNumber}-` : "";
  return [
    {
      id: `${taskPrefix}1`,
      title: `${weekNumber ? `Cycle ${weekNumber}: ` : ""}Family Task Balance`,
      description: "Work together to improve balance of household responsibilities",
      assignedTo: "Papa",
      assignedToName: "Papa",
      taskType: "default",
      completed: false,
      completedDate: null,
      insight: "Balancing household tasks leads to better family harmony and less stress.",
      details: "Choose one household task that you normally don't handle and take full responsibility for it this week. Notice how it feels to own this task and discuss the experience with your partner.",
      comments: []
    },
    {
      id: `${taskPrefix}2`,
      title: `${weekNumber ? `Cycle ${weekNumber}: ` : ""}Parenting Balance`,
      description: "Balance parenting responsibilities more evenly",
      assignedTo: "Mama",
      assignedToName: "Mama",
      taskType: "default",
      completed: false,
      completedDate: null,
      insight: "Shared parenting leads to healthier child development and less parent burnout.",
      details: "Identify one parenting responsibility that your partner usually handles and take charge of it this week. This could be bedtime routines, homework help, or coordinating activities.",
      comments: []
    }
  ];
};

// Helper function to generate task titles based on category
const getTaskTitleForCategory = (category) => {
  switch(category) {
    case "Visible Household Tasks":
      return "Household Balance Challenge";
    case "Invisible Household Tasks":
      return "Mental Load Balancer";
    case "Visible Parental Tasks":
      return "Parenting Task Rebalance";
    case "Invisible Parental Tasks":
      return "Emotional Labor Distribution";
    default:
      return "Family Balance Task";
  }
};

// Helper function to generate task details based on category
const getTaskDetailsForCategory = (category) => {
  switch(category) {
    case "Visible Household Tasks":
      return "Choose one visible household task that your partner usually handles (like cooking, cleaning, or repairs) and take full responsibility for it this week. Observe how it feels to own this task completely and discuss the experience afterward.";
    case "Invisible Household Tasks":
      return "Identify and take over one 'invisible' planning or organizing task that typically falls to your partner. This might be meal planning, schedule coordination, or tracking household supplies. Document what you learn about the mental load involved.";
    case "Visible Parental Tasks":
      return "Take initiative on one direct childcare task that your partner typically handles (like school drop-offs, homework help, or bedtime routines). Fully manage this responsibility for the week and reflect on what you learned.";
    case "Invisible Parental Tasks":
      return "Notice and take on one aspect of emotional or planning work related to the children. This could be planning activities, anticipating needs, or providing emotional support. Share what you discover about this often unseen work.";
    default:
      return "Choose one task that your partner usually handles and complete it fully, from start to finish. Pay attention to all the steps involved, including planning and cleanup.";
  }
};

// ENHANCED: Helper function to generate new tasks for the next week with effectiveness data
const generateTaskRecommendations = (weekNumber = 1, previousResponses = {}, questionSet = []) => {
  console.log(`Generating AI-driven tasks for Week ${weekNumber} based on family data and effectiveness`);
  const taskPrefix = weekNumber ? `${weekNumber}-` : "";
  
  // Add this safeguard for empty inputs
  if (!previousResponses || Object.keys(previousResponses).length === 0 || !questionSet || questionSet.length === 0) {
    console.log("Warning: Missing survey data or question set for task generation. Using fallback data.");
    // Return default tasks if no data available
    return generateDefaultTasks(weekNumber);
  }

  // This would normally use actual survey data, but we'll simulate AI analysis
  const imbalanceAnalysis = analyzeTaskImbalances(previousResponses, questionSet);
  
  // Add fallback values if analysis returns empty results
  if (!imbalanceAnalysis || Object.keys(imbalanceAnalysis).length === 0) {
    console.log("Warning: Analysis returned no results. Using fallback tasks.");
    return generateDefaultTasks(weekNumber);
  }
  
  // Sort categories by imbalance to prioritize most unbalanced areas
  const prioritizedCategories = Object.entries(imbalanceAnalysis)
    .sort((a, b) => b[1].imbalance - a[1].imbalance)
    .map(entry => ({
      category: entry[0],
      mamaPercent: entry[1].mamaPercent,
      papaPercent: entry[1].papaPercent,
      imbalance: entry[1].imbalance,
      assignTo: entry[1].mamaPercent > entry[1].papaPercent ? "Papa" : "Mama"
    }));
  
  console.log("Category imbalances detected:", prioritizedCategories);
  
  // Generate tasks based on the family's specific needs
  const tasks = [];
  
  // 1. Survey-based task for Papa (from highest priority area)
  const papaFocusAreas = prioritizedCategories.filter(area => area.assignTo === "Papa");
  if (papaFocusAreas.length > 0) {
    tasks.push({
      id: `${weekNumber}-1`,
      title: `Cycle ${weekNumber}: ${getTaskTitleForCategory(papaFocusAreas[0].category)}`,
      description: `Take initiative on one ${papaFocusAreas[0].category.toLowerCase()} task this week. Notice what's typically handled by your partner and step in proactively.`,
      assignedTo: "Papa",
      assignedToName: "Papa",
      taskType: "survey-based",
      focusArea: papaFocusAreas[0].category,
      category: papaFocusAreas[0].category,
      completed: false,
      completedDate: null,
      insight: `Our survey analysis shows Mama is handling ${papaFocusAreas[0].mamaPercent.toFixed(0)}% of tasks in this area. Taking initiative on one task can help create better balance and reduce your partner's mental load.`,
      details: getTaskDetailsForCategory(papaFocusAreas[0].category),
      comments: []
    });
  }
  
  // 2. AI-based task for Papa
  tasks.push({
    id: `${weekNumber}-ai-1`,
    title: `Cycle ${weekNumber}: AI Insight Challenge`,
    description: "Address a hidden workload imbalance identified by our AI analysis",
    assignedTo: "Papa",
    assignedToName: "Papa",
    taskType: "ai",
    isAIGenerated: true,
    hiddenWorkloadType: papaFocusAreas.length > 0 ? papaFocusAreas[0].category : "Family Balance",
    completed: false,
    completedDate: null,
    insight: "Our AI has identified patterns in your family's responses that indicate a hidden imbalance in mental load.",
    details: "Identify one 'invisible' task that often goes unrecognized (like planning, organizing, or tracking family needs) and take full responsibility for it this week. Document what you learn about this mental labor.",
    comments: []
  });
  
  // 3. Relationship-focused task for Papa
  tasks.push({
    id: `${weekNumber}-rel-1`,
    title: `Cycle ${weekNumber}: Relationship Strengthening`,
    description: "Take steps to strengthen your relationship while improving balance",
    assignedTo: "Papa",
    assignedToName: "Papa",
    taskType: "relationship",
    completed: false,
    completedDate: null,
    insight: "Research shows that relationship satisfaction improves by up to 42% when workload is balanced.",
    details: "Schedule a 15-minute conversation with your partner focused solely on appreciating each other's contributions. Share specific things you've noticed and value about how your partner cares for the family.",
    comments: []
  });
  
  // 4. Survey-based task for Mama (from highest priority area)
  const mamaFocusAreas = prioritizedCategories.filter(area => area.assignTo === "Mama");
  if (mamaFocusAreas.length > 0) {
    tasks.push({
      id: `${weekNumber}-2`,
      title: `Cycle ${weekNumber}: ${getTaskTitleForCategory(mamaFocusAreas[0].category)}`,
      description: `Take initiative on one ${mamaFocusAreas[0].category.toLowerCase()} task this week that your partner typically handles.`,
      assignedTo: "Mama",
      assignedToName: "Mama",
      taskType: "survey-based",
      focusArea: mamaFocusAreas[0].category,
      category: mamaFocusAreas[0].category,
      completed: false,
      completedDate: null,
      insight: `Our survey analysis shows Papa is handling ${mamaFocusAreas[0].papaPercent.toFixed(0)}% of tasks in this area. Taking initiative on one task can help create better balance.`,
      details: getTaskDetailsForCategory(mamaFocusAreas[0].category),
      comments: []
    });
  }
  
  // 5. AI-based task for Mama
  tasks.push({
    id: `${weekNumber}-ai-2`,
    title: `Cycle ${weekNumber}: AI Insight Challenge`,
    description: "Address a hidden workload imbalance identified by our AI analysis",
    assignedTo: "Mama",
    assignedToName: "Mama",
    taskType: "ai",
    isAIGenerated: true,
    hiddenWorkloadType: mamaFocusAreas.length > 0 ? mamaFocusAreas[0].category : "Family Balance",
    completed: false,
    completedDate: null,
    insight: "Our AI has identified patterns in your family's responses that indicate a hidden imbalance in mental load.",
    details: "Notice a task that often goes unrecognized that your partner typically handles, and take it on completely this week. Pay attention to all the mental planning involved.",
    comments: []
  });
  
  // 6. Relationship-focused task for Mama
  tasks.push({
    id: `${weekNumber}-rel-2`,
    title: `Cycle ${weekNumber}: Relationship Strengthening`,
    description: "Take steps to strengthen your relationship while improving balance",
    assignedTo: "Mama",
    assignedToName: "Mama",
    taskType: "relationship",
    completed: false,
    completedDate: null,
    insight: "Research shows that relationship satisfaction improves by up to 42% when workload is balanced.",
    details: "Schedule a brief 'appreciation exchange' with your partner where you each share specific things you value about how the other person contributes to family life.",
    comments: []
  });
  
  return tasks;
};

const TasksTab = ({ onStartWeeklyCheckIn, onOpenFamilyMeeting }) => {
  const { 
    selectedUser, 
    familyMembers,
    currentWeek,
    completedWeeks,
    familyId,
    addTaskComment,
    updateTaskCompletion,
    surveySchedule,
    updateSurveySchedule,
    taskRecommendations: initialTaskRecommendations,
    loadCurrentWeekTasks,
    surveyResponses,
    getWeekHistoryData
  } = useFamily();

  const { fullQuestionSet } = useSurvey();
  
  // State to track when everyone completed initial survey
  const [allInitialComplete, setAllInitialComplete] = useState(false);
  const [daysUntilCheckIn, setDaysUntilCheckIn] = useState(6);
  const [canStartCheckIn, setCanStartCheckIn] = useState(false);
  const [showCoupleCheckIn, setShowCoupleCheckIn] = useState(false);
  const [canStartCoupleCheckIn, setCanStartCoupleCheckIn] = useState(false);
  const [showFamilyMeeting, setShowFamilyMeeting] = useState(false);

  // Calculate due date based on survey schedule if available
  const calculateDueDate = () => {
    if (surveySchedule && surveySchedule[currentWeek]) {
      return new Date(surveySchedule[currentWeek]);
    } else {
      // Default to 7 days from the start of the week
      // For a new week, this should be ~7 days from when the week started
      let date = new Date();
      
      // If we have completed the previous week, use that as reference
      if (completedWeeks.includes(currentWeek - 1)) {
        // Try to get completion date of previous week
        const prevWeekData = getWeekHistoryData(currentWeek - 1);
        if (prevWeekData && prevWeekData.completionDate) {
          date = new Date(prevWeekData.completionDate);
        }
      }
      
      date.setDate(date.getDate() + 7);
      return date;
    }
  };

  // Calculate days until check-in
  const calculateDaysUntilCheckIn = () => {
    const today = new Date();
    const dueDate = checkInDueDate;
    
    // Calculate difference in days
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // State for dates
  const [checkInDueDate, setCheckInDueDate] = useState(calculateDueDate());
  const [currentDate] = useState(new Date());
  
  // State for date input
  const [checkInDueDateInput, setCheckInDueDateInput] = useState(
    checkInDueDate ? checkInDueDate.toISOString().split('T')[0] : ''
  );

  // Update input when due date changes
  useEffect(() => {
    if (checkInDueDate) {
      setCheckInDueDateInput(checkInDueDate.toISOString().split('T')[0]);
    }
  }, [checkInDueDate]);

  // Effect to update check-in status when survey schedule or current week changes
  useEffect(() => {
    // Update check-in due date
    setCheckInDueDate(calculateDueDate());
    
    // Update days until check-in
    setDaysUntilCheckIn(calculateDaysUntilCheckIn());
    
    // Determine if check-in can be started
    // Allow check-in if it's due within 2 days
    const canStart = calculateDaysUntilCheckIn() <= 2;
    setCanStartCheckIn(canStart);
    
    // NEW: Determine if couple check-in can be started
    // Only allow after weekly check-in is completed by at least one parent
    const parentCompleted = familyMembers
      .filter(m => m.role === 'parent')
      .some(m => m.weeklyCompleted && m.weeklyCompleted[currentWeek-1]?.completed);
    
    setCanStartCoupleCheckIn(parentCompleted);
    
  }, [surveySchedule, currentWeek, familyMembers]); // Add familyMembers to dependencies

  // Effect to recalculate check-in availability immediately after date changes
  useEffect(() => {
    // Update days until check-in
    setDaysUntilCheckIn(calculateDaysUntilCheckIn());
    
    // Determine if check-in can be started
    const canStart = calculateDaysUntilCheckIn() <= 2;
    setCanStartCheckIn(canStart);
  }, [checkInDueDateInput]); // Re-run when date input changes

  // Function to handle date update
  const handleUpdateCheckInDate = async () => {
    try {
      const newDate = new Date(checkInDueDateInput);
      if (isNaN(newDate.getTime())) {
        alert("Please enter a valid date");
        return;
      }
      
      await updateSurveySchedule(currentWeek, newDate);
      
      // Update local state for immediate UI refresh
      setCheckInDueDate(newDate);
      
      // Force recalculation of availability
      const newDaysUntil = Math.ceil((newDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntilCheckIn(Math.max(0, newDaysUntil));
      setCanStartCheckIn(newDaysUntil <= 2);
      
      // Alert in app rather than browser
      const alertDiv = document.createElement('div');
      alertDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded z-50';
      alertDiv.innerHTML = 'Check-in date updated successfully!';
      document.body.appendChild(alertDiv);
      
      // Remove after 3 seconds
      setTimeout(() => {
        alertDiv.remove();
      }, 3000);
    } catch (error) {
      console.error("Error updating check-in date:", error);
      alert("Failed to update check-in date. Please try again.");
    }
  };
  
  // State for task recommendations
  const [taskRecommendations, setTaskRecommendations] = useState([]);
  
  // State for AI recommendations
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isLoadingAiRecommendations, setIsLoadingAiRecommendations] = useState(false);
  
  // Task recommendations for the current week
  const [expandedTasks, setExpandedTasks] = useState({});
  
  // State for comment form
  const [commentTask, setCommentTask] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Kids tasks state
  const [kidTasksCompleted, setKidTasksCompleted] = useState({});
  const [taskReactions, setTaskReactions] = useState({});
  const [selectedTaskForEmoji, setSelectedTaskForEmoji] = useState(null);
  const [kidTaskComments, setKidTaskComments] = useState({});
  const [kidTaskPictures, setKidTaskPictures] = useState({});
  const [uploadingPicture, setUploadingPicture] = useState(false);
  
  // Load tasks for the current week
  useEffect(() => {
    const loadTasks = async () => {
      try {
        console.log(`Loading tasks for Week ${currentWeek}, user:`, selectedUser?.name);
        console.log('Completed weeks:', completedWeeks);
        
        // Regular task loading logic for all weeks
        let tasks = [];
        
        if (familyId) {
          try {
            tasks = await DatabaseService.getTasksForWeek(familyId, currentWeek);
            console.log(`Tasks loaded from Firebase for Week ${currentWeek}:`, tasks?.length || 0);
            
            // Also load kid tasks from Firebase
            const familyData = await DatabaseService.loadFamilyData(familyId);
            if (familyData && familyData.kidTasks) {
              setKidTasksCompleted(familyData.kidTasks);
              console.log("Kid tasks loaded:", familyData.kidTasks);
            }
          } catch (error) {
            console.error("Error loading tasks:", error);
          }
        }
        
        if (tasks && tasks.length > 0) {
          setTaskRecommendations(tasks);
        } else {
          // Fallback to generating tasks
          console.log("Using AI-generated tasks");
          setTaskRecommendations(generateTaskRecommendations(currentWeek, surveyResponses, fullQuestionSet));
        }
        
      } catch (error) {
        console.error(`Error in loadTasks for Week ${currentWeek}:`, error);
        setTaskRecommendations(generateTaskRecommendations(currentWeek, surveyResponses, fullQuestionSet));
      }
    };
    
    loadTasks();
    
  }, [familyId, currentWeek, completedWeeks]);

  // Effect to force reload tasks when component becomes visible again
  useEffect(() => {
    // Function to reload tasks from Firebase
    const reloadTasks = async () => {
      console.log(`Reloading tasks for Week ${currentWeek} from visibility change`);
      try {
        if (familyId) {
          const freshTasks = await DatabaseService.getTasksForWeek(familyId, currentWeek);
          console.log(`Fresh tasks loaded for Week ${currentWeek}:`, freshTasks?.length || 0);
          if (freshTasks && freshTasks.length > 0) {
            setTaskRecommendations(freshTasks);
          }
          
          // Also reload kid tasks
          const familyData = await DatabaseService.loadFamilyData(familyId);
          if (familyData && familyData.kidTasks) {
            setKidTasksCompleted(familyData.kidTasks);
          }
        }
      } catch (error) {
        console.error(`Error reloading tasks for Week ${currentWeek}:`, error);
      }
    };

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadTasks();
      }
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also reload when the component mounts
    reloadTasks();

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [familyId, currentWeek, surveyResponses, fullQuestionSet]); // <-- Updated dependencies

  // Load AI task recommendations
  const loadAiRecommendations = async () => {
    if (!familyId) return;
    
    setIsLoadingAiRecommendations(true);
    try {
      const recommendations = await DatabaseService.generateAITaskRecommendations(familyId);
      setAiRecommendations(recommendations);
    } catch (error) {
      console.error("Error loading AI recommendations:", error);
    } finally {
      setIsLoadingAiRecommendations(false);
    }
  };
  
  // Check if weekly check-in is completed for this week
  const weeklyCheckInCompleted = familyMembers.every(member => 
    member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed
  );
  
  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  // Check if enough tasks are completed for family meeting
  const countCompletedTasks = () => {
    let count = 0;
    taskRecommendations.forEach(task => {
      if (task.completed) {
        count++;
      }
    });
    
    // Also count completed kid tasks
    Object.values(kidTasksCompleted).forEach(taskData => {
      if (taskData?.completed) count += 0.5; // Kid tasks count as half a task
    });
    
    return count;
  };
  
  const enoughTasksCompleted = countCompletedTasks() >= 3;
  
  // Whether family meeting can be started
  const canStartFamilyMeeting = weeklyCheckInCompleted && enoughTasksCompleted;
  
  // Check if user can complete a task
  const canCompleteTask = (task) => {
    // Only a parent can complete tasks assigned to their role type (Mama or Papa)
    return selectedUser && 
           selectedUser.role === 'parent' && 
           (selectedUser.name === task.assignedToName || 
            selectedUser.roleType === task.assignedTo);
  };

  // Handle task completion
  const handleTaskCompletion = async (taskId, isCompleted) => {
    if (!selectedUser) {
      console.error("No user selected");
      alert("Please select a user profile first");
      return;
    }
    
    const task = taskRecommendations.find(t => t.id.toString() === taskId.toString());
    if (!task) {
      console.error("Task not found:", taskId);
      return;
    }
    
    // Check permissions
    if (!canCompleteTask(task)) {
      if (selectedUser.role !== 'parent') {
        alert("Only parents can mark tasks as complete. Children can add comments instead.");
      } else {
        alert(`Only ${task.assignedTo} can mark this task as complete.`);
      }
      return;
    }
    
    try {
      // Create completion timestamp
      const completedDate = isCompleted ? new Date().toISOString() : null;
      
      // Immediately update local state for responsive UI
      const updatedTasks = taskRecommendations.map(t => {
        if (t.id.toString() === taskId.toString()) {
          return {
            ...t,
            completed: isCompleted,
            completedDate: completedDate
          };
        }
        return t;
      });
      
      // Update state immediately
      setTaskRecommendations(updatedTasks);
      
      // Save to Firebase
      await updateTaskCompletion(taskId, isCompleted);
      console.log("Task completed successfully:", taskId);
      
      // Force reload of tasks to ensure data consistency
      setTimeout(async () => {
        if (familyId) {
          const freshTasks = await DatabaseService.getTasksForWeek(familyId, currentWeek);
          if (freshTasks && freshTasks.length > 0) {
            setTaskRecommendations(freshTasks);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error completing task:", error);
      alert("There was an error saving your task. Please try again.");
    }
  };
  
  // Handle kid task completion with observations
  const handleCompleteKidTask = async (taskId, kidId, isCompleted, observations = null) => {
    try {
      // Allow any child to complete any task
      if (selectedUser && selectedUser.role === 'child') {
        const completedDate = isCompleted ? new Date().toISOString() : null;
        
        // Update local state
        setKidTasksCompleted(prev => ({
          ...prev,
          [taskId]: {
            completed: isCompleted,
            completedDate: completedDate,
            completedBy: selectedUser.id,
            completedByName: selectedUser.name,
            observations: observations
          }
        }));
        
        // Save to database
        if (familyId) {
          // Get existing kid tasks
          const familyData = await DatabaseService.loadFamilyData(familyId);
          const existingKidTasks = (familyData && familyData.kidTasks) || {};
          
          // Create updated kid tasks object
          const updatedKidTasks = {
            ...existingKidTasks,
            [taskId]: {
              completed: isCompleted,
              completedDate: completedDate,
              completedBy: selectedUser.id,
              completedByName: selectedUser.name,
              observations: observations
            }
          };
          
          await DatabaseService.saveFamilyData({
            kidTasks: updatedKidTasks
          }, familyId);
          
          console.log(`Kid task ${taskId} saved to database: ${isCompleted} by ${selectedUser.name}`);
        }
      } else if (selectedUser.role !== 'child') {
        alert("Only children can complete kid tasks.");
      }
    } catch (error) {
      console.error("Error saving kid task:", error);
      alert("There was an error saving your task. Please try again.");
    }
  };

  // Handle kid task picture upload
  const handleKidTaskPictureUpload = async (taskId, file) => {
    if (!selectedUser || selectedUser.role !== 'child' || !file) return;
    
    setUploadingPicture(true);
    
    try {
      // Create a reference to Firebase Storage
      const storageRef = ref(storage, `kidTasks/${familyId}/${taskId}/${Date.now()}_${file.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update local state
      setKidTaskPictures(prev => ({
        ...prev,
        [taskId]: downloadURL
      }));
      
      // Save to Firebase - update the kid task data to include the picture URL
      const updatedData = {
        ...(kidTasksCompleted[taskId] || {}),
        pictureUrl: downloadURL
      };
      
      await DatabaseService.saveFamilyData({
        kidTasks: {
          ...kidTasksCompleted,
          [taskId]: updatedData
        }
      }, familyId);
      
      console.log(`Picture for kid task ${taskId} uploaded successfully`);
      
      // Update the local state of completed tasks to include the picture
      setKidTasksCompleted(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          pictureUrl: downloadURL
        }
      }));
      
    } catch (error) {
      console.error("Error uploading picture:", error);
      alert("There was an error uploading your picture. Please try again.");
    } finally {
      setUploadingPicture(false);
    }
  };
  
  // Handle adding a comment to a task or subtask
  const handleAddComment = (taskId) => {
    setCommentTask(taskId);
    setCommentText('');
  };
  
  // Handle submitting a comment
  const handleSubmitComment = async () => {
    if (commentText.trim() === '' || isSubmittingComment) return;
    
    setIsSubmittingComment(true);
    
    try {
      // Save comment to database
      // In a real app this would use the correct ID structure to save to the database
      const result = await addTaskComment(commentTask, commentText);
      
      // Update local state
      if (commentTask.toString().startsWith('kid-task')) {
        // It's a kid task comment
        setKidTaskComments(prev => ({
          ...prev,
          [commentTask]: [...(prev[commentTask] || []), {
            id: result.id || Date.now(),
            userId: selectedUser.id,
            userName: selectedUser.name,
            text: commentText,
            timestamp: new Date().toLocaleString()
          }]
        }));
      } else {
        // It's a main task comment
        const updatedTasks = taskRecommendations.map(task => {
          if (task.id.toString() === commentTask.toString()) {
            return {
              ...task,
              comments: [...(task.comments || []), {
                id: result.id || Date.now(),
                userId: selectedUser.id,
                userName: selectedUser.name,
                text: commentText,
                timestamp: new Date().toLocaleString()
              }]
            };
          }
          return task;
        });
        
        setTaskRecommendations(updatedTasks);
      }
      
      // Reset form
      setCommentTask(null);
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("There was an error adding your comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Open emoji picker
  const openEmojiPicker = (taskId) => {
    setSelectedTaskForEmoji(taskId);
  };

  // Add reaction/cheer to a task
  const addReaction = (taskId, emoji) => {
    // Create a new reaction
    const reaction = {
      emoji,
      from: selectedUser.name,
      timestamp: new Date().toISOString()
    };
    
    // Add it to the task's reactions
    setTaskReactions(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), reaction]
    }));
    
    // Close the emoji picker
    setSelectedTaskForEmoji(null);
    
    // In a real implementation, you would save this to the database
    console.log(`Added reaction ${emoji} to task ${taskId} from ${selectedUser.name}`);
  };
  
  // Handle completion of AI task
  const handleCompleteAiTask = async (taskId, isCompleted) => {
    const task = aiRecommendations.find(t => t.id === taskId);
    
    // Check permissions - only assigned parent can complete tasks
    if (canCompleteTask(task)) {
      try {
        // Prepare updated task with completion status and timestamp
        const completedDate = isCompleted ? new Date().toISOString() : null;
        
        // Update task in database
        await DatabaseService.updateTaskCompletion(familyId, taskId, isCompleted, completedDate);
        
        // Update local state
        const updatedTasks = aiRecommendations.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              completed: isCompleted,
              completedDate: completedDate
            };
          }
          return task;
        });
        
        setAiRecommendations(updatedTasks);
      } catch (error) {
        console.error("Error updating AI task:", error);
        alert("There was an error updating the task. Please try again.");
      }
    } else if (selectedUser.role !== 'parent') {
      alert("Only parents can mark tasks as complete. Children can add comments instead.");
    } else {
      alert(`Only ${task.assignedTo} can mark this task as complete.`);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "Not scheduled yet";
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Render comments section
  const renderComments = (comments) => {
    if (!comments || comments.length === 0) return null;
    
    return (
      <div className="mt-3 pt-3 border-t">
        <h5 className="text-sm font-medium mb-2 font-roboto">Comments:</h5>
        <div className="space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 p-2 rounded text-sm">
              <div className="font-medium font-roboto">{comment.userName}:</div>
              <p className="font-roboto">{comment.text}</p>
              <div className="text-xs text-gray-500 mt-1 font-roboto">{comment.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render comment form
  const renderCommentForm = (id) => {
    if (commentTask !== id) return null;
    
    return (
      <div className="mt-3 pt-3 border-t">
        <h5 className="text-sm font-medium mb-2 font-roboto">Add a Comment:</h5>
        <textarea
          className="w-full border rounded p-2 text-sm font-roboto"
          rows="2"
          placeholder="Write your comment here..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={isSubmittingComment}
        ></textarea>
        <div className="flex justify-end mt-2 space-x-2">
          <button
            className="px-3 py-1 text-sm border rounded font-roboto"
            onClick={() => setCommentTask(null)}
            disabled={isSubmittingComment}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded font-roboto"
            onClick={handleSubmitComment}
            disabled={isSubmittingComment || !commentText.trim()}
          >
            {isSubmittingComment ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Weekly Task System Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-3 font-roboto">Cycle {currentWeek} Focus</h3>
        <p className="text-sm text-gray-600 mb-1 font-roboto">
          Complete at your own pace - could be days or weeks
        </p>
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Suggested tasks to help balance your family's workload
        </p>
        
        <div className="bg-black text-white p-4 rounded-lg mb-4">
          <h4 className="font-medium mb-2 font-roboto">How Your Tasks Are Generated</h4>
          <p className="text-sm mb-3 font-roboto">
            Each parent receives three types of tasks:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white bg-opacity-10 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Brain size={16} className="text-purple-300 mr-2" />
                <span className="font-medium font-roboto">AI Insights</span>
              </div>
              <p className="text-xs text-gray-200 font-roboto">
                Created by our AI based on hidden patterns in your survey responses
              </p>
            </div>
            
            <div className="bg-white bg-opacity-10 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle2 size={16} className="text-blue-300 mr-2" />
                <span className="font-medium font-roboto">Survey-Based</span>
              </div>
              <p className="text-xs text-gray-200 font-roboto">
                Derived from areas with the biggest imbalances in your survey responses
              </p>
            </div>
            
            <div className="bg-white bg-opacity-10 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Heart size={16} className="text-pink-300 mr-2" />
                <span className="font-medium font-roboto">Relationship</span>
              </div>
              <p className="text-xs text-gray-200 font-roboto">
                Focused on strengthening your relationship while improving balance
              </p>
            </div>
          </div>
        </div>
        
        {/* Weekly Check-in Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 font-roboto">Cycle Check-in Status</h3>
          <div className="bg-blue-50 p-4 rounded">
            <div className="flex items-center mb-3">
              <Calendar className="text-blue-600 mr-2" size={18} />
              <p className="text-sm font-roboto">
                <span className="font-medium">Due by:</span> {formatDate(checkInDueDate)}
              </p>
            </div>
            
            {/* Date editor added from Surveys tab */}
            <div className="flex items-center mt-2 mb-3">
              <span className="text-sm mr-2 font-roboto">Change date:</span>
              <input
                type="date"
                value={checkInDueDateInput}
                onChange={(e) => setCheckInDueDateInput(e.target.value)}
                className="border rounded px-2 py-1 text-sm font-roboto"
              />
              <button
                onClick={handleUpdateCheckInDate}
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 font-roboto"
              >
                Update
              </button>
            </div>
            
            {!canStartCheckIn && (
              <div className="flex items-center mb-3 text-amber-700 bg-amber-50 p-2 rounded">
                <AlertCircle size={16} className="mr-2" />
                <p className="text-sm font-roboto">
                  Weekly check-in will be available in {daysUntilCheckIn} {daysUntilCheckIn === 1 ? 'day' : 'days'}
                </p>
              </div>
            )}
            
            <p className="text-sm mb-3 font-roboto">
              All family members need to complete the weekly check-in to update your progress
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium font-roboto">Completed:</span>
              <div className="flex gap-1">
                {familyMembers.map(member => (
                  <div 
                    key={member.id} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                      member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}
                    title={`${member.name}: ${member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed ? 'Completed' : 'Not completed'}`}
                  >
                    {member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed ? '✓' : member.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          </div>
            
          <div className="mt-4 text-center">
            <button 
              className={`px-4 py-2 rounded font-roboto ${
                selectedUser.weeklyCompleted && selectedUser.weeklyCompleted[currentWeek-1]?.completed
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : canStartCheckIn 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={() => {
                if (selectedUser.weeklyCompleted && selectedUser.weeklyCompleted[currentWeek-1]?.completed) {
                  alert("You've already completed this week's check-in!");
                } else if (canStartCheckIn) {
                  onStartWeeklyCheckIn();
                }
              }}
              disabled={!canStartCheckIn || (selectedUser.weeklyCompleted && selectedUser.weeklyCompleted[currentWeek-1]?.completed)}
            >
              {selectedUser.weeklyCompleted && selectedUser.weeklyCompleted[currentWeek-1]?.completed 
                ? 'You Completed This Check-in' 
                : canStartCheckIn 
                  ? 'Start Weekly Check-in' 
                  : 'Check-in Not Yet Available'}
            </button>
          </div>
        </div>
        
        {/* AI Task Intelligence Section */}
        {aiRecommendations && aiRecommendations.length > 0 && (
          <div className="border-2 border-purple-300 rounded-lg p-4 mb-6 bg-gradient-to-r from-purple-100 to-blue-100 shadow-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Brain size={20} className="text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold flex items-center font-roboto">
                  AI Task Intelligence
                  <Sparkles size={16} className="ml-2 text-amber-500" />
                </h3>
                <p className="text-sm text-gray-600 font-roboto">
                  Our AI has detected hidden workload imbalances your family might not have noticed
                </p>
              </div>
            </div>
            
            <div className="space-y-4 pl-4">
              {aiRecommendations.map(task => (
                <div 
                  key={task.id} 
                  className="border-2 border-purple-400 rounded-lg overflow-hidden shadow-lg relative"
                  style={{
                    background: task.completed ? '#f0fdf4' : 'linear-gradient(to right, #f5f3ff, #eef2ff)'
                  }}
                >
                  {/* Add a special badge for AI tasks */}
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-bl-lg text-sm font-bold flex items-center">
                      <Brain size={14} className="mr-1" />
                      AI Powered
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-start">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      task.completed ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {task.completed ? <CheckCircle size={16} /> : <Target size={16} />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-lg font-roboto">{task.title}</h4>
                          <div className="flex items-center text-xs text-purple-600 mt-1 mb-2">
                            <Brain size={12} className="mr-1" />
                            <span className="font-roboto">AI-detected {task.hiddenWorkloadType} imbalance</span>
                          </div>
                          <p className="text-gray-600 mt-1 font-roboto">
                            {task.description}
                          </p>
                          
                          {/* Show completion date if task is completed */}
                          {task.completed && task.completedDate && (
                            <p className="text-sm text-green-600 mt-2 font-roboto">
                              Completed on {formatDate(task.completedDate)}
                            </p>
                          )}
                        </div>
                        
                        {/* Assigned to label */}
                        <div className="ml-4 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs rounded-full font-roboto ${
                            task.assignedTo === 'Mama' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            For {task.assignedTo}
                          </span>
                        </div>
                      </div>
                      
                      {/* AI Insight Box - Enhanced version */}
                      <div className="bg-purple-100 p-4 rounded-lg mt-3 border border-purple-200">
                        <div className="flex items-start">
                          <Info size={20} className="text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold text-purple-900 text-sm mb-1 font-roboto">Why This Task Matters:</h5>
                            <p className="text-sm text-purple-800 font-roboto">{task.insight}</p>
                            <p className="text-xs text-purple-700 mt-2 font-roboto">
                              Our AI analyzed your family's survey data and identified this task as important for improving balance.
                              This was selected because your responses showed a significant imbalance in {task.hiddenWorkloadType.toLowerCase()}.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Task details */}
                      {task.details && (
                        <div className="bg-white p-4 rounded-lg mt-3 border border-purple-100">
                          <div className="flex items-start">
                            <CheckCircle2 size={18} className="text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700 font-roboto">{task.details}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Comments */}
                      {renderComments(task.comments)}
                      
                      {/* Comment form */}
                      {renderCommentForm(task.id)}
                      
                      {/* Action buttons */}
                      {!commentTask && (
                        <div className="mt-4 flex justify-end space-x-2">
                          <button
                            className="px-3 py-1 text-sm rounded border font-roboto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddComment(task.id);
                            }}
                          >
                            Comment
                          </button>
                          
                          {canCompleteTask(task) && (
                            <button
                              className={`px-3 py-1 text-sm rounded font-roboto ${
                                task.completed 
                                  ? 'bg-gray-200 text-gray-800' 
                                  : 'bg-green-500 text-white'
                              }`}
                              onClick={() => handleCompleteAiTask(task.id, !task.completed)}
                            >
                              {task.completed ? 'Completed' : 'Mark as Done'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          
        <div className="space-y-4">
          {/* Papa's Tasks */}
          <div className="border-l-4 border-blue-500 p-2">
            <h4 className="font-medium mb-2 text-lg font-roboto">Papa's Tasks</h4>
            <div className="space-y-3">
              {taskRecommendations
                .filter(task => task.assignedTo === "Papa")
                .map(task => (
                  <div key={task.id} className={`rounded-lg border ${task.completed ? 'bg-green-50' : 'bg-white'}`}>
                    {/* Main task header */}
                    <div 
                      className="p-4 flex items-start cursor-pointer"
                      onClick={() => toggleTaskExpansion(task.id)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        task.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {task.completed ? <CheckCircle size={16} /> : <Target size={16} />}
                      </div>
                        
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-lg font-roboto">{task.title}</h4>
                          
                          {/* Task type label */}
                          <div className="flex items-center gap-2">
                            {task.taskType === 'ai' && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                                <Brain size={10} className="mr-1" />
                                AI Insight
                              </span>
                            )}
                            {task.taskType === 'survey-based' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                                <CheckCircle2 size={10} className="mr-1" />
                                Survey Data
                              </span>
                            )}
                            {task.taskType === 'relationship' && (
                              <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full flex items-center">
                                <Heart size={10} className="mr-1" />
                                Relationship
                              </span>
                            )}
                            {task.taskType === 'meeting' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center">
                                <Users size={10} className="mr-1" />
                                Family Meeting
                              </span>
                            )}
                            {task.taskType === 'goal' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                                <Target size={10} className="mr-1" />
                                Family Goal
                              </span>
                            )}
                            <div>
                              {expandedTasks[task.id] ? (
                                <ChevronUp size={20} className="text-gray-500" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                          
                        <div className="mt-2">
                          <p className="text-gray-600 font-roboto">
                            {task.description}
                          </p>
                          
                          {/* Show completion date if task is completed */}
                          {task.completed && task.completedDate && (
                            <p className="text-sm text-green-600 mt-2 font-roboto">
                              Completed on {formatDate(task.completedDate)}
                            </p>
                          )}
                        </div>
                        
                        {/* AI Insight Box for AI tasks */}
                        {task.taskType === 'ai' && task.insight && (
                          <div className="bg-purple-100 p-4 rounded-lg mt-3 border border-purple-200">
                            <div className="flex items-start">
                              <Info size={20} className="text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-purple-900 text-sm mb-1 font-roboto">Why This Task Matters:</h5>
                                <p className="text-sm text-purple-800 font-roboto">{task.insight}</p>
                                <p className="text-xs text-purple-700 mt-2 font-roboto">
                                  Our AI analyzed your family's survey data and identified this task as important for improving balance.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Insight Box for survey-based tasks */}
                        {task.taskType === 'survey-based' && task.insight && (
                          <div className="bg-blue-100 p-4 rounded-lg mt-3 border border-blue-200">
                            <div className="flex items-start">
                              <Info size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-blue-900 text-sm mb-1 font-roboto">Survey Insight:</h5>
                                <p className="text-sm text-blue-800 font-roboto">{task.insight}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Insight Box for relationship tasks */}
                        {task.taskType === 'relationship' && task.insight && (
                          <div className="bg-pink-100 p-4 rounded-lg mt-3 border border-pink-200">
                            <div className="flex items-start">
                              <Heart size={20} className="text-pink-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-pink-900 text-sm mb-1 font-roboto">Relationship Impact:</h5>
                                <p className="text-sm text-pink-800 font-roboto">{task.insight}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Main task comments */}
                        {renderComments(task.comments)}
                        
                        {/* Main task comment form */}
                        {renderCommentForm(task.id.toString())}
                        
                        {/* Action buttons for main task */}
                        {!commentTask && (
                          <div className="mt-4 flex justify-between">
                            <button
                              className="px-3 py-1 text-sm rounded border font-roboto"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddComment(task.id.toString());
                              }}
                            >
                              Comment
                            </button>
                            
                            {canCompleteTask(task) && (
                              <button
                                className={`px-3 py-1 text-sm rounded font-roboto ${
                                  task.completed 
                                    ? 'bg-gray-200 text-gray-800' 
                                    : 'bg-green-500 text-white'
                                }`}
                                onClick={() => handleTaskCompletion(task.id, !task.completed)}
                              >
                                {task.completed ? 'Completed' : 'Mark as Done'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Task Details */}
                    {expandedTasks[task.id] && (
                      <div className="border-t">
                        <div className="p-4">
                          <h5 className="font-medium text-sm mb-3 font-roboto">How to Complete This Task:</h5>
                          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm font-roboto">
                            <p>{task.details || "Choose one task that your partner usually handles and complete it fully, from start to finish."}</p>
                          </div>
                          
                          {/* Completion UI */}
                          {canCompleteTask(task) && !task.completed && (
                            <div className="mt-4 flex justify-center">
                              <button
                                onClick={() => handleTaskCompletion(task.id, true)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center font-roboto"
                              >
                                <CheckCircle size={16} className="mr-2" />
                                Mark Task Complete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
          
          {/* Mama's Tasks */}
          <div className="border-l-4 border-purple-500 p-2">
            <h4 className="font-medium mb-2 text-lg font-roboto">Mama's Tasks</h4>
            <div className="space-y-3">
              {taskRecommendations
                .filter(task => task.assignedTo === "Mama")
                .map(task => (
                  <div key={task.id} className={`rounded-lg border ${task.completed ? 'bg-green-50' : 'bg-white'}`}>
                    {/* Main task header */}
                    <div 
                      className="p-4 flex items-start cursor-pointer"
                      onClick={() => toggleTaskExpansion(task.id)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        task.completed ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {task.completed ? <CheckCircle size={16} /> : <Target size={16} />}
                      </div>
                        
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-lg font-roboto">{task.title}</h4>
                          
                          {/* Task type label */}
                          <div className="flex items-center gap-2">
                            {task.taskType === 'ai' && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                                <Brain size={10} className="mr-1" />
                                AI Insight
                              </span>
                            )}
                            {task.taskType === 'survey-based' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                                <CheckCircle2 size={10} className="mr-1" />
                                Survey Data
                              </span>
                            )}
                            {task.taskType === 'relationship' && (
                              <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full flex items-center">
                                <Heart size={10} className="mr-1" />
                                Relationship
                              </span>
                            )}
                            {task.taskType === 'meeting' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center">
                                <Users size={10} className="mr-1" />
                                Family Meeting
                              </span>
                            )}
                            {task.taskType === 'goal' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                                <Target size={10} className="mr-1" />
                                Family Goal
                              </span>
                            )}
                            <div>
                              {expandedTasks[task.id] ? (
                                <ChevronUp size={20} className="text-gray-500" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                          
                        <div className="mt-2">
                          <p className="text-gray-600 font-roboto">
                            {task.description}
                          </p>
                          
                          {/* Show completion date if task is completed */}
                          {task.completed && task.completedDate && (
                            <p className="text-sm text-green-600 mt-2 font-roboto">
                              Completed on {formatDate(task.completedDate)}
                            </p>
                          )}
                        </div>
                        
                        {/* AI Insight Box for AI tasks */}
                        {task.taskType === 'ai' && task.insight && (
                          <div className="bg-purple-100 p-4 rounded-lg mt-3 border border-purple-200">
                            <div className="flex items-start">
                              <Info size={20} className="text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-purple-900 text-sm mb-1 font-roboto">Why This Task Matters:</h5>
                                <p className="text-sm text-purple-800 font-roboto">{task.insight}</p>
                                <p className="text-xs text-purple-700 mt-2 font-roboto">
                                  Our AI analyzed your family's survey data and identified this task as important for improving balance.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Insight Box for survey-based tasks */}
                        {task.taskType === 'survey-based' && task.insight && (
                          <div className="bg-blue-100 p-4 rounded-lg mt-3 border border-blue-200">
                            <div className="flex items-start">
                              <Info size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-blue-900 text-sm mb-1 font-roboto">Survey Insight:</h5>
                                <p className="text-sm text-blue-800 font-roboto">{task.insight}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Insight Box for relationship tasks */}
                        {task.taskType === 'relationship' && task.insight && (
                          <div className="bg-pink-100 p-4 rounded-lg mt-3 border border-pink-200">
                            <div className="flex items-start">
                              <Heart size={20} className="text-pink-600 mr-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-pink-900 text-sm mb-1 font-roboto">Relationship Impact:</h5>
                                <p className="text-sm text-pink-800 font-roboto">{task.insight}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Main task comments */}
                        {renderComments(task.comments)}
                        
                        {/* Main task comment form */}
                        {renderCommentForm(task.id.toString())}
                        
                        {/* Action buttons for main task */}
                        {!commentTask && (
                          <div className="mt-4 flex justify-between">
                            <button
                              className="px-3 py-1 text-sm rounded border font-roboto"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddComment(task.id.toString());
                              }}
                            >
                              Comment
                            </button>
                            
                            {canCompleteTask(task) && (
                              <button
                                className={`px-3 py-1 text-sm rounded font-roboto ${
                                  task.completed 
                                    ? 'bg-gray-200 text-gray-800' 
                                    : 'bg-green-500 text-white'
                                }`}
                                onClick={() => handleTaskCompletion(task.id, !task.completed)}
                              >
                                {task.completed ? 'Completed' : 'Mark as Done'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Task Details */}
                    {expandedTasks[task.id] && (
                      <div className="border-t">
                        <div className="p-4">
                          <h5 className="font-medium text-sm mb-3 font-roboto">How to Complete This Task:</h5>
                          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm font-roboto">
                            <p>{task.details || "Choose one task that your partner usually handles and complete it fully, from start to finish."}</p>
                          </div>
                          
                          {/* Completion UI */}
                          {canCompleteTask(task) && !task.completed && (
                            <div className="mt-4 flex justify-center">
                              <button
                                onClick={() => handleTaskCompletion(task.id, true)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center font-roboto"
                              >
                                <CheckCircle size={16} className="mr-2" />
                                Mark Task Complete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
          
          {/* Kids' Tasks */}
          <div className="border-l-4 border-amber-500 p-2 mt-6">
            <h4 className="font-medium mb-2 text-lg flex items-center font-roboto">
              <span className="mr-2">🌟</span> Kids' Tasks <span className="ml-2">🌟</span>
            </h4>
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg mb-4 text-sm">
              <p className="font-roboto">Hey kids! These fun activities help your family work better as a team. Complete them to earn stars!</p>
            </div>
            <div className="space-y-3">
              {/* First Kid Task - Helper Task */}
              <div className="rounded-lg border bg-white">
                <div 
                  className="p-4 flex items-start cursor-pointer"
                  onClick={() => toggleTaskExpansion('kid-task-1')}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-amber-100 text-amber-600">
                    🏆
                  </div>
                    
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-lg font-roboto">Family Helper Challenge</h4>
                      <div>
                        {expandedTasks['kid-task-1'] ? (
                          <ChevronUp size={20} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-500" />
                        )}
                      </div>
                    </div>
                      
                    <div className="mt-2">
                      <p className="text-gray-600 font-roboto">
                        Help your parents with special tasks this week and become a Family Hero!
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Subtasks */}
                {expandedTasks['kid-task-1'] && (
                  <div className="border-t">
                    <div className="p-4">
                      <h5 className="font-medium text-sm mb-3 font-roboto">Your Mission:</h5>
                      <div className="space-y-4 pl-4">
                        {/* Kid Subtasks */}
                        {familyMembers.filter(member => member.role === 'child').map((child, index) => (
                          <div key={`kid-subtask-${index}`} className="border rounded-md p-3 bg-white">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                <button
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    selectedUser && selectedUser.role === 'child'
                                      ? 'bg-white border border-amber-300 hover:bg-amber-50 cursor-pointer' 
                                      : 'bg-gray-100 border border-gray-300 cursor-not-allowed'
                                  }`}
                                  onClick={() => {
                                    if (!kidTasksCompleted[`kid-task-1-${index}`]?.completed) {
                                      const observations = prompt("What did you do to help? Share your accomplishment!");
                                      if (observations) {
                                        handleCompleteKidTask(`kid-task-1-${index}`, selectedUser.id, true, observations);
                                      }
                                    } else {
                                      handleCompleteKidTask(`kid-task-1-${index}`, selectedUser.id, false);
                                    }
                                  }}
                                  disabled={selectedUser?.role !== 'child'}
                                >
                                  {kidTasksCompleted[`kid-task-1-${index}`]?.completed && <span>✓</span>}
                                </button>
                              </div>
                              
                              <div className="flex-1">
                                <h6 className="font-medium text-sm font-roboto">{child.name}'s Special Task</h6>
                                <p className="text-sm text-gray-600 mt-1 font-roboto">
                                  {index % 2 === 0 ? 
                                    "Help set the table for dinner this week" : 
                                    "Help organize a family game night"}
                                </p>
                                
                                {kidTasksCompleted[`kid-task-1-${index}`]?.completed && (
                                  <div>
                                    <p className="text-xs text-green-600 mt-2 font-roboto">
                                      Completed by {kidTasksCompleted[`kid-task-1-${index}`].completedByName || 'a child'} on {formatDate(kidTasksCompleted[`kid-task-1-${index}`].completedDate)}
                                    </p>
                                    {kidTasksCompleted[`kid-task-1-${index}`].observations && (
                                      <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
                                        <p className="italic text-amber-800 font-roboto">"{kidTasksCompleted[`kid-task-1-${index}`].observations}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Picture upload for completed kid tasks */}
                                {kidTasksCompleted[`kid-task-1-${index}`]?.completed && (
                                  <div className="mt-3">
                                    {kidTasksCompleted[`kid-task-1-${index}`]?.pictureUrl ? (
                                      <div className="mt-2">
                                        <p className="text-xs text-green-600 mb-1 font-roboto">Picture uploaded:</p>
                                        <img 
                                          src={kidTasksCompleted[`kid-task-1-${index}`].pictureUrl} 
                                          alt="Task completion" 
                                          className="max-h-32 rounded border border-green-200"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-blue-600 font-roboto">Add a picture of what you did!</span>
                                        <label className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-200 font-roboto flex items-center">
                                          <Camera size={12} className="mr-1" />
                                          Upload Picture
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                handleKidTaskPictureUpload(`kid-task-1-${index}`, e.target.files[0]);
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Reactions/Cheers */}
                                {kidTasksCompleted[`kid-task-1-${index}`]?.completed && (
                                  <div className="flex mt-2 flex-wrap gap-1">
                                    {taskReactions[`kid-task-1-${index}`]?.map((reaction, i) => (
                                      <div key={i} className="bg-amber-50 px-2 py-1 rounded-full text-xs flex items-center">
                                        <span className="mr-1">{reaction.emoji}</span>
                                        <span className="text-amber-700 font-roboto">{reaction.from}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Comments */}
                                {renderComments(kidTaskComments[`kid-task-1-${index}`])}
                                
                                {/* Comment form */}
                                {commentTask === `kid-task-1-${index}` && renderCommentForm(`kid-task-1-${index}`)}
                                
                                {/* Add comment button */}
                                {!commentTask && (
                                  <div className="mt-2 flex justify-end">
                                    <button
                                      className="px-2 py-1 text-xs rounded border font-roboto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddComment(`kid-task-1-${index}`);
                                      }}
                                    >
                                      Comment
                                    </button>
                                  </div>
                                )}
                                
                                {/* Add Reaction Button */}
                                {kidTasksCompleted[`kid-task-1-${index}`]?.completed && (
                                  <button
                                    onClick={() => openEmojiPicker(`kid-task-1-${index}`)}
                                    className="mt-2 text-xs flex items-center text-blue-600 hover:text-blue-800 font-roboto"
                                  >
                                    <span className="mr-1">🎉</span> Add a cheer!
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* If no children, show message */}
                        {familyMembers.filter(member => member.role === 'child').length === 0 && (
                          <p className="text-sm text-gray-500 italic font-roboto">No children added to your family yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Second Kid Task - Fun Survey Challenge */}
              <div className="rounded-lg border bg-white">
                <div 
                  className="p-4 flex items-start cursor-pointer"
                  onClick={() => toggleTaskExpansion('kid-task-2')}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-green-100 text-green-600">
                    🔍
                  </div>
                    
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-lg font-roboto">Family Detective Challenge</h4>
                      <div>
                        {expandedTasks['kid-task-2'] ? (
                          <ChevronUp size={20} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-500" />
                        )}
                      </div>
                    </div>
                      
                    <div className="mt-2">
                      <p className="text-gray-600 font-roboto">
                        Become a family detective! Observe who does what in your family this week!
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Subtasks */}
                {expandedTasks['kid-task-2'] && (
                  <div className="border-t">
                    <div className="p-4">
                      <h5 className="font-medium text-sm mb-3 font-roboto">Your Mission:</h5>
                      <div className="space-y-4 pl-4">
                        {/* Detective Subtasks */}
                        <div className="border rounded-md p-3 bg-white">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <button
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  selectedUser && selectedUser.role === 'child'
                                    ? 'bg-white border border-green-300 hover:bg-green-50 cursor-pointer' 
                                    : 'bg-gray-100 border border-gray-300 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (!kidTasksCompleted['kid-task-2-1']?.completed) {
                                    const observations = prompt("What did you observe about who cooks in your family?");
                                    if (observations) {
                                      handleCompleteKidTask('kid-task-2-1', selectedUser.id, true, observations);
                                    }
                                  } else {
                                    handleCompleteKidTask('kid-task-2-1', selectedUser.id, false);
                                  }
                                }}
                                disabled={selectedUser?.role !== 'child'}
                              >
                                {kidTasksCompleted['kid-task-2-1']?.completed && <span>✓</span>}
                              </button>
                            </div>
                            
                            <div className="flex-1">
                              <h6 className="font-medium text-sm font-roboto">Watch Who Cooks</h6>
                              <p className="text-sm text-gray-600 mt-1 font-roboto">
                                Keep track of who makes meals this week
                              </p>
                              
                              {kidTasksCompleted['kid-task-2-1']?.completed && (
                                <div>
                                  <p className="text-xs text-green-600 mt-2 font-roboto">
                                    Completed by {kidTasksCompleted['kid-task-2-1'].completedByName || 'a child'} on {formatDate(kidTasksCompleted['kid-task-2-1'].completedDate)}
                                  </p>
                                  {kidTasksCompleted['kid-task-2-1'].observations && (
                                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                      <p className="italic text-green-800 font-roboto">"{kidTasksCompleted['kid-task-2-1'].observations}"</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Picture upload for completed kid tasks */}
                              {kidTasksCompleted['kid-task-2-1']?.completed && (
                                <div className="mt-3">
                                  {kidTasksCompleted['kid-task-2-1']?.pictureUrl ? (
                                    <div className="mt-2">
                                      <p className="text-xs text-green-600 mb-1 font-roboto">Picture uploaded:</p>
                                      <img 
                                        src={kidTasksCompleted['kid-task-2-1'].pictureUrl} 
                                        alt="Task completion" 
                                        className="max-h-32 rounded border border-green-200"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-blue-600 font-roboto">Add a picture of what you observed!</span>
                                      <label className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-200 font-roboto flex items-center">
                                        <Camera size={12} className="mr-1" />
                                        Upload Picture
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleKidTaskPictureUpload('kid-task-2-1', e.target.files[0]);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Comments */}
                              {renderComments(kidTaskComments['kid-task-2-1'])}
                              
                              {/* Comment form */}
                              {commentTask === 'kid-task-2-1' && renderCommentForm('kid-task-2-1')}
                              
                              {/* Add comment button */}
                              {!commentTask && (
                                <div className="mt-2 flex justify-end">
                                  <button
                                    className="px-2 py-1 text-xs rounded border font-roboto"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddComment('kid-task-2-1');
                                    }}
                                  >
                                    Comment
                                  </button>
                                </div>
                              )}
                              
                              {/* Reactions */}
                              {kidTasksCompleted['kid-task-2-1']?.completed && (
                                <div className="flex mt-2 flex-wrap gap-1">
                                  {taskReactions['kid-task-2-1']?.map((reaction, i) => (
                                    <div key={i} className="bg-green-50 px-2 py-1 rounded-full text-xs flex items-center">
                                      <span className="mr-1">{reaction.emoji}</span>
                                      <span className="text-green-700 font-roboto">{reaction.from}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add Reaction Button */}
                              {kidTasksCompleted['kid-task-2-1']?.completed && (
                                <button
                                  onClick={() => openEmojiPicker('kid-task-2-1')}
                                  className="mt-2 text-xs flex items-center text-blue-600 hover:text-blue-800 font-roboto"
                                >
                                  <span className="mr-1">🎉</span> Add a cheer!
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-md p-3 bg-white">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <button
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  selectedUser && selectedUser.role === 'child'
                                    ? 'bg-white border border-green-300 hover:bg-green-50 cursor-pointer' 
                                    : 'bg-gray-100 border border-gray-300 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (!kidTasksCompleted['kid-task-2-2']?.completed) {
                                    const observations = prompt("What did you notice about who cleans in your family?");
                                    if (observations) {
                                      handleCompleteKidTask('kid-task-2-2', selectedUser.id, true, observations);
                                    }
                                  } else {
                                    handleCompleteKidTask('kid-task-2-2', selectedUser.id, false);
                                  }
                                }}
                                disabled={selectedUser?.role !== 'child'}
                              >
                                {kidTasksCompleted['kid-task-2-2']?.completed && <span>✓</span>}
                                </button>
                            </div>
                            
                            <div className="flex-1">
                              <h6 className="font-medium text-sm">Count Who Cleans</h6>
                              <p className="text-sm text-gray-600 mt-1">
                                Notice who does cleaning tasks this week
                              </p>
                              
                              {kidTasksCompleted['kid-task-2-2']?.completed && (
                                <div>
                                  <p className="text-xs text-green-600 mt-2">
                                    Completed by {kidTasksCompleted['kid-task-2-2'].completedByName || 'a child'} on {formatDate(kidTasksCompleted['kid-task-2-2'].completedDate)}
                                  </p>
                                  {kidTasksCompleted['kid-task-2-2'].observations && (
                                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                      <p className="italic text-green-800">"{kidTasksCompleted['kid-task-2-2'].observations}"</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Comments */}
                              {renderComments(kidTaskComments['kid-task-2-2'])}
                              
                              {/* Comment form */}
                              {commentTask === 'kid-task-2-2' && renderCommentForm('kid-task-2-2')}
                              
                              {/* Add comment button */}
                              {!commentTask && (
                                <div className="mt-2 flex justify-end">
                                  <button
                                    className="px-2 py-1 text-xs rounded border"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddComment('kid-task-2-2');
                                    }}
                                  >
                                    Comment
                                  </button>
                                </div>
                              )}
                              
                              {/* Reactions */}
                              {kidTasksCompleted['kid-task-2-2']?.completed && (
                                <div className="flex mt-2 flex-wrap gap-1">
                                  {taskReactions['kid-task-2-2']?.map((reaction, i) => (
                                    <div key={i} className="bg-green-50 px-2 py-1 rounded-full text-xs flex items-center">
                                      <span className="mr-1">{reaction.emoji}</span>
                                      <span className="text-green-700">{reaction.from}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Add Reaction Button */}
                              {kidTasksCompleted['kid-task-2-2']?.completed && (
                                <button
                                  onClick={() => openEmojiPicker('kid-task-2-2')}
                                  className="mt-2 text-xs flex items-center text-blue-600 hover:text-blue-800"
                                >
                                  <span className="mr-1">🎉</span> Add a cheer!
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Couple Check-In Card */}
{selectedUser && selectedUser.role === 'parent' && (
  <div className="bg-white rounded-lg shadow p-6 mt-8">
    <div className="flex items-start">
      <div className="flex-shrink-0 mr-4">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
          <Heart size={20} className="text-pink-600" />
        </div>
      </div>
      
      <div className="flex-1">
        <h3 className="text-lg font-semibold">Weekly Couple Check-In</h3>
        <p className="text-sm text-gray-600 mt-1">
          A quick 5-minute check-in to track how workload balance is affecting your relationship
        </p>
        
        <div className="mt-3">
          {!canStartCoupleCheckIn ? (
            <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded mb-3">
              <div className="flex items-center mb-1">
                <AlertCircle size={16} className="mr-2" />
                <span className="font-medium">Couple check-in not yet available</span>
              </div>
              <p>
                Complete the weekly check-in first to unlock the couple check-in.
              </p>
            </div>
          ) : (
            <div className="text-sm bg-pink-50 text-pink-800 p-3 rounded mb-3">
              <div className="flex items-center mb-1">
                <Heart size={16} className="mr-2" />
                <span className="font-medium">Your relationship matters too!</span>
              </div>
              <p>
                Take 5 minutes to check in on how workload sharing is affecting your relationship.
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-600 flex items-center">
            <span>Recommended: 5 minutes</span>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => setShowCoupleCheckIn(true)}
            disabled={!canStartCoupleCheckIn}
            className={`px-4 py-2 rounded-md flex items-center ${
              canStartCoupleCheckIn 
                ? 'bg-pink-100 text-pink-800 hover:bg-pink-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Couple Check-In
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Couple Check-In Modal */}
{showCoupleCheckIn && (
  <CoupleCheckInScreen onClose={(success) => {
    setShowCoupleCheckIn(false);
    // If successful completion, show a message or update UI
    if (success) {
      // Maybe show a success notification or update state
    }
  }} />
)}

        {/* Family Meeting Card - at the bottom */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Users size={20} className="text-amber-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Family Meeting</h3>
              <p className="text-sm text-gray-600 mt-1">
                Hold a 30-minute family meeting to discuss progress and set goals
              </p>
              
              <div className="mt-3">
                {!canStartFamilyMeeting && (
                  <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded mb-3">
                    <div className="flex items-center mb-1">
                      <AlertCircle size={16} className="mr-2" />
                      <span className="font-medium">Family meeting not yet available</span>
                    </div>
                    <p>
                      Complete the weekly check-in and at least 3 tasks to unlock the family meeting agenda.
                    </p>
                  </div>
                )}
                
                <div className="text-sm text-gray-600 flex items-center">
                  <span>Recommended: 30 minutes</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={onOpenFamilyMeeting}
                  disabled={!canStartFamilyMeeting}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    canStartFamilyMeeting 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  View Meeting Agenda & Topics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {selectedTaskForEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Add a cheer!</h3>
            
            <div className="grid grid-cols-5 gap-3 mb-4">
              {['👍', '❤️', '🎉', '👏', '⭐', '🌟', '🏆', '💯', '🙌', '🤩'].map(emoji => (
                <button
                  key={emoji}
                  className="text-2xl p-2 hover:bg-gray-100 rounded"
                  onClick={() => addReaction(selectedTaskForEmoji, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setSelectedTaskForEmoji(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksTab;