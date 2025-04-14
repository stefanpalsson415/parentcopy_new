// src/components/dashboard/tabs/EnhancedTasksTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, X, Plus, Award, Flame, 
  Zap, Info, ChevronDown, ChevronUp, MessageSquare,
  Check, RefreshCw, Edit, Trash, Clock, AlertTriangle,
  BarChart2, Activity, Shield, PieChart, ThumbsUp,
  List, Filter, Bell, ArrowUp, Star
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import TaskAnalyzer from '../../../services/TaskAnalyzer';
import WorkloadBalanceDetector from '../../../services/WorkloadBalanceDetector';
import TaskPrioritizer from '../../../services/TaskPrioritizer';
import DatabaseService from '../../../services/DatabaseService';
import AllieAIService from '../../../services/AllieAIService';
import { doc, getDoc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { EventManager as EnhancedEventManager, FloatingCalendar } from '../../../components/calendar';
import CalendarService from '../../../services/CalendarService';
import { useAuth } from '../../../contexts/AuthContext';

// Helper function to format dates consistently
const formatDate = (date) => {
  if (!date) return "Not scheduled yet";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  });
};

// Helper function to calculate days since a date
const daysSince = (dateString) => {
  if (!dateString) return 0;
  
  const date = new Date(dateString);
  const today = new Date();
  
  // Reset hours to compare just the dates
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - date;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Helper to generate avatar colors based on name
const getAvatarColor = (name) => {
  if (!name) return '#000000';
  
  // Simple hash function to get consistent colors
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Predefined colors for better aesthetics
  const colors = [
    '#FF5733', '#33A8FF', '#33FF57', '#B533FF', '#FF33E9',
    '#FFD133', '#3346FF', '#FF336E', '#33FFD1', '#A2FF33'
  ];
  
  return colors[hash % colors.length];
};

// Helper to get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const EnhancedTasksTab = ({ onStartWeeklyCheckIn, onOpenFamilyMeeting }) => {
  const { 
    selectedUser, 
    familyMembers,
    currentWeek,
    completedWeeks,
    familyId,
    familyName,
    familyPicture,
    addTaskComment,
    updateTaskCompletion,
    updateSubtaskCompletion,
    updateSurveySchedule,
    loadCurrentWeekTasks,
    getWeekHistoryData,
    getWeekStatus,
    surveySchedule,
    weekStatus,
    surveyResponses,
    familyPriorities
  } = useFamily();

  // Main states
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebrations, setCelebrations] = useState([]);
  const [showAllieCoaching, setShowAllieCoaching] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allieIsThinking, setAllieIsThinking] = useState(false);
  const [showHabitDetail, setShowHabitDetail] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [reflection, setReflection] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(null);
  const [familyStreak, setFamilyStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [surveyDue, setSurveyDue] = useState(null);
  const [daysUntilSurvey, setDaysUntilSurvey] = useState(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const { currentUser } = useAuth();
  const [existingDueDateEvent, setExistingDueDateEvent] = useState(null);
  
  // New states for enhanced task management
  const [taskAnalysis, setTaskAnalysis] = useState(null);
  const [balanceAnalysis, setBalanceAnalysis] = useState(null);
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [dailyRecommendations, setDailyRecommendations] = useState(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [showBalancePanel, setShowBalancePanel] = useState(false);
  const [showPriorityPanel, setShowPriorityPanel] = useState(false);
  const [taskInsights, setTaskInsights] = useState([]);
  const [balanceInsights, setBalanceInsights] = useState([]);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [newTaskFormData, setNewTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    category: '',
    dueDate: '',
    subtasks: ['']
  });
  
  // Cycle progress tracking
  const [cycleStep, setCycleStep] = useState(1);
  const [memberProgress, setMemberProgress] = useState({});
  const [completedHabitInstances, setCompletedHabitInstances] = useState({});
  const [canTakeSurvey, setCanTakeSurvey] = useState(false);
  const [canScheduleMeeting, setCanScheduleMeeting] = useState(false);

  // Load habits and cycle data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log(`Loading habits for Week ${currentWeek}, user:`, selectedUser?.name);
        
        if (familyId) {
          // Load tasks from database
          const tasks = await loadCurrentWeekTasks();
          
          // Filter to only adult habits
          const adultHabits = tasks.filter(task => 
            !task.category?.includes('Kid') && 
            !task.title?.includes('Kid') &&
            !task.title?.includes('Child')
          );
          
          // Check for streak data in database
          const streakData = await loadStreakData();
          
          // Transform tasks into habit format with completion tracking
          const formattedHabits = await Promise.all(adultHabits.map(async (task) => {
            // Skip tasks that are not for the current user
            const isForSelectedUser = 
              task.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
              task.assignedToName === selectedUser?.name ||
              task.assignedTo === "Everyone";
              
            if (!isForSelectedUser) {
              return null;
            }
            
            // Get streak data for this habit
            const streak = streakData[task.id] || 0;
            const record = streakData[`${task.id}_record`] || streak;
            
            // Calculate progress based on subtasks
            const completedSubtasks = task.subTasks?.filter(st => st.completed)?.length || 0;
            const totalSubtasks = task.subTasks?.length || 1;
            const progress = task.completed ? 100 : Math.round((completedSubtasks / totalSubtasks) * 100);
            
            // Get completion instances for this habit
            const completionInstances = await getHabitCompletionInstances(task.id) || [];
            
            // Create the habit object
            return {
              id: task.id,
              title: task.title ? task.title.replace(/Week \d+: /g, '') : "Task",
              description: task.description ? task.description.replace(/for this week/g, 'consistently') : "Description unavailable",
              cue: task.subTasks?.[0]?.title || "After breakfast",
              action: task.subTasks?.[1]?.title || task.title || "Complete task",
              reward: task.subTasks?.[2]?.title || "Feel accomplished and balanced",
              identity: task.focusArea 
                ? `I am someone who values ${task.focusArea.toLowerCase()}` 
                : "I am someone who values family balance",
              assignedTo: task.assignedTo,
              assignedToName: task.assignedToName,
              category: task.category,
              insight: task.insight || task.aiInsight || "",
              completed: task.completed,
              comments: task.comments || [],
              streak: streak,
              record: record,
              progress: progress,
              lastCompleted: task.completedDate || null,
              atomicSteps: task.subTasks?.map(st => ({
                id: st.id,
                title: st.title,
                description: st.description,
                completed: st.completed || false
              })) || [],
              isUserGenerated: task.isUserGenerated || false,
              completionInstances: completionInstances,
              priority: task.priority || "medium",
              priorityScore: task.priorityScore || 0,
              priorityLevel: task.priorityLevel || "medium",
              dueDate: task.dueDate || null
            };
          }));
          
          // Filter out null values
          const filteredAdultHabits = formattedHabits.filter(Boolean);
                
          // Only show one system-generated habit plus any user-generated habits
          const systemHabit = filteredAdultHabits.find(h => !h.isUserGenerated);
          const userHabits = filteredAdultHabits.filter(h => h.isUserGenerated);
                
          // Combine, putting uncompleted first
          const finalHabits = [systemHabit, ...userHabits].filter(Boolean).sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            return 0;
          });

          setHabits(finalHabits);
          
          // Load family streaks
          await loadFamilyStreaks();
          
          // Calculate when the next survey is due
          calculateNextSurveyDue();
          
          // Load cycle progress
          await loadCycleProgress();
          
          // Track habit completion instances
          const allInstances = {};
          filteredAdultHabits.forEach(habit => {
            allInstances[habit.id] = habit.completionInstances || [];
          });
          setCompletedHabitInstances(allInstances);
          
          // Check if any habit has 5+ completions
          const hasEnoughCompletions = Object.values(allInstances).some(instances => instances.length >= 5);
          setCanTakeSurvey(hasEnoughCompletions);
          
          // NEW: Analyze tasks for patterns
          const analysis = TaskAnalyzer.analyzeTaskPatterns(tasks, surveyResponses, familyPriorities);
          setTaskAnalysis(analysis);
          setTaskInsights(analysis.insights || []);
          
          // NEW: Detect workload imbalance
          const imbalanceAnalysis = WorkloadBalanceDetector.detectImbalance(
            tasks, surveyResponses, familyPriorities, familyMembers
          );
          setBalanceAnalysis(imbalanceAnalysis);
          setBalanceInsights(imbalanceAnalysis.alerts || []);
          
          // NEW: Calculate task priorities
          const prioritizedTasksList = TaskPrioritizer.prioritizeTasks(
            tasks, imbalanceAnalysis, familyPriorities
          );
          setPrioritizedTasks(prioritizedTasksList);
          
          // NEW: Generate daily recommendations
          const recommendations = TaskPrioritizer.generateDailyRecommendations(
            prioritizedTasksList, imbalanceAnalysis
          );
          setDailyRecommendations(recommendations);
          
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading habits:", error);
        setHabits([]);
        setLoading(false);
      }
    };
    
    loadData();
  }, [familyId, currentWeek, selectedUser]);
  
  // Load streak data from database
  const loadStreakData = async () => {
    try {
      if (!familyId) return {};
      
      // Query streaks collection 
      const streaksDoc = await getDoc(doc(db, "families", familyId));
      if (!streaksDoc.exists()) return {};
      
      const streakData = streaksDoc.data().habitStreaks || {};
      return streakData;
    } catch (error) {
      console.error("Error loading streak data:", error);
      return {};
    }
  };
  
  // Load completion instances for a habit
  const getHabitCompletionInstances = async (habitId) => {
    try {
      if (!familyId) return [];
      
      const habitDoc = await getDoc(doc(db, "families", familyId, "habitInstances", habitId));
      if (!habitDoc.exists()) return [];
      
      return habitDoc.data().instances || [];
    } catch (error) {
      console.error(`Error loading completion instances for habit ${habitId}:`, error);
      return [];
    }
  };
  
  const findExistingDueDateEvent = async () => {
    if (!familyId || !currentUser) return null;
    
    try {
      // Get all events from CalendarService
      const events = await CalendarService.getEventsForUser(
        currentUser.uid,
        new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
        new Date(new Date().setDate(new Date().getDate() + 90))  // 90 days ahead
      );
      
      // Filter for cycle due date events for the current cycle
      const dueDateEvents = events.filter(event => 
        (event.eventType === 'cycle-due-date' || event.category === 'cycle-due-date') &&
        (event.cycleNumber === currentWeek || 
         (event.title && event.title.includes(`Cycle ${currentWeek}`)) || 
         (event.summary && event.summary.includes(`Cycle ${currentWeek}`)))
      );
      
      if (dueDateEvents.length > 0) {
        console.log("Found existing due date event:", dueDateEvents[0]);
        return dueDateEvents[0];
      }
      
      return null;
    } catch (error) {
      console.error("Error finding existing due date event:", error);
      return null;
    }
  };
  
  // Load family streaks from database
  const loadFamilyStreaks = async () => {
    try {
      if (!familyId) return;
      
      // Get family document
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFamilyStreak(data.currentStreak || 0);
        setLongestStreak(data.longestStreak || 0);
      } else {
        // Default values if not found
        setFamilyStreak(0);
        setLongestStreak(0);
      }
    } catch (error) {
      console.error("Error loading family streaks:", error);
      // Set default values
      setFamilyStreak(0);
      setLongestStreak(0);
    }
  };
  
  // Load cycle progress information
  const loadCycleProgress = async () => {
    try {
      if (!familyId) return;
      
      // Get family document
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Get cycle data
        const cycleData = data.cycleProgress?.[currentWeek] || {
          step: 1,
          memberProgress: {}
        };
        
        setCycleStep(cycleData.step || 1);
        
        // Initialize member progress
        const progress = {};
        familyMembers.forEach(member => {
          progress[member.id] = cycleData.memberProgress?.[member.id] || {
            step: 1,
            completedSurvey: false,
            completedMeeting: false
          };
        });
        
        setMemberProgress(progress);
        
        // Check if all adults have completed surveys to enable meeting
        const adults = familyMembers.filter(m => m.role === 'parent');
        const allCompleted = adults.every(adult => 
          progress[adult.id]?.completedSurvey
        );
        
        setCanScheduleMeeting(allCompleted);
      }
    } catch (error) {
      console.error("Error loading cycle progress:", error);
    }
  };
  
  // Calculate next survey due date
  const calculateNextSurveyDue = () => {
    if (!surveySchedule) return;
    
    const nextWeek = currentWeek;
    const scheduledDate = surveySchedule[nextWeek];
    
    if (scheduledDate) {
      setSurveyDue(new Date(scheduledDate));
      
      // Calculate days until survey
      const today = new Date();
      const dueDate = new Date(scheduledDate);
      
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysUntilSurvey(diffDays);
    }
  };
  
  // Update cycle due date
  const updateCycleDueDate = async (newDate, eventDetails = {}) => {
    if (!familyId || !currentUser) return false;
    
    try {
      setIsProcessing(true);
      
      // Validate the date - ensure it's a valid Date object
      if (!(newDate instanceof Date) || isNaN(newDate.getTime())) {
        console.error("Invalid date provided to updateCycleDueDate:", newDate);
        throw new Error("Invalid date provided");
      }
      
      // Format the date for display
      const formattedDate = newDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      // Update survey schedule in database
      await updateSurveySchedule(currentWeek, newDate);
      
      let result;
      
      // Check if we're updating an existing event
      if (eventDetails.eventId) {
        console.log("Updating existing event:", eventDetails.eventId);
        
        // Create event update object
        const eventUpdate = {
          title: eventDetails.title || `Cycle ${currentWeek} Due Date`,
          summary: eventDetails.title || `Cycle ${currentWeek} Due Date`,
          description: eventDetails.description || `Due date for completing Cycle ${currentWeek} activities including surveys and tasks.`,
          location: eventDetails.location || '',
          start: {
            dateTime: newDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          category: 'cycle-due-date',
          eventType: 'cycle-due-date',
          cycleNumber: currentWeek
        };
        
        // Update the existing event
        result = await CalendarService.updateEvent(eventDetails.eventId, eventUpdate, currentUser.uid);
      } else {
        // Create new event data with consistent universalId
        const eventData = {
          title: eventDetails.title || `Cycle ${currentWeek} Due Date`,
          description: eventDetails.description || `Due date for completing Cycle ${currentWeek} activities including surveys and tasks.`,
          start: {
            dateTime: newDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          location: eventDetails.location || '',
          category: 'cycle-due-date',
          eventType: 'cycle-due-date',
          cycleNumber: currentWeek,
          // Add a consistent universalId to help prevent duplicates
          universalId: `cycle-due-date-${familyId}-${currentWeek}`
        };
        
        // Add new event to calendar
        result = await CalendarService.addEvent(eventData, currentUser.uid);
      }
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update cycle date in calendar");
      }
      
      // Update the UI
      setSurveyDue(newDate);
      calculateNextSurveyDue();
      
      // ADDED: Update week status in Firebase to ensure consistency
      const updatedStatus = {
        ...weekStatus,
        [currentWeek]: {
          ...weekStatus[currentWeek],
          scheduledDate: newDate.toISOString()
        }
      };
      
      // ADDED: Update in Firebase to ensure data is consistent across tabs
      await DatabaseService.saveFamilyData({
        weekStatus: updatedStatus,
        updatedAt: new Date().toISOString()
      }, familyId);
      
      createCelebration(`Cycle ${currentWeek} due date updated to ${formattedDate}`, true);
      
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error("Error updating cycle due date:", error);
      createCelebration("Error", false, "Failed to update due date. Please try again.");
      setIsProcessing(false);
      return false;
    }
  };
  
  // Create a celebration notification
  const createCelebration = (habitTitle, success = true, customMessage = null) => {
    const newCelebration = {
      id: Date.now(),
      title: habitTitle,
      message: customMessage || generateCelebrationMessage(habitTitle),
      success: success
    };
    
    setCelebrations(prev => [newCelebration, ...prev]);
    
    // Remove celebration after 5 seconds
    setTimeout(() => {
      setCelebrations(prev => prev.filter(c => c.id !== newCelebration.id));
    }, 5000);
  };
  
  // Generate a random celebration message
  const generateCelebrationMessage = (title) => {
    const messages = [
      `Great job on ${title}! You're building a positive habit!`,
      `Way to go! Your consistency with ${title} is inspiring!`,
      `You completed ${title}! Small actions, big results!`,
      `Another step toward becoming the person you want to be!`,
      `That's ${familyStreak + 1} days in a row! Keep it up!`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };
  
  // Launch confetti effect
  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };
  
  // Record habit instance
  const recordHabitInstance = async (habitId, reflectionNote = "") => {
    if (!familyId || !selectedUser) return;
    
    try {
      setIsProcessing(true);
      console.log(`Recording habit instance for habit ${habitId}`);
      
      // Create the new instance data
      const newInstance = {
        timestamp: new Date().toISOString(),
        userId: selectedUser.id,
        userName: selectedUser.name,
        notes: reflectionNote || ""
      };
      
      // Get current instances
      const currentInstances = completedHabitInstances[habitId] || [];
      const updatedInstances = [...currentInstances, newInstance];
      
      console.log(`Current instances: ${currentInstances.length}, Updated: ${updatedInstances.length}`);
      
      // Create a reference to the habit instances document
      const habitInstanceRef = doc(db, "families", familyId, "habitInstances", habitId);
      
      try {
        // First, check if the document exists
        const docSnap = await getDoc(habitInstanceRef);
        
        if (docSnap.exists()) {
          // Update existing document
          await updateDoc(habitInstanceRef, {
            instances: updatedInstances
          });
        } else {
          // Create new document
          await setDoc(habitInstanceRef, {
            instances: updatedInstances
          });
        }
        
        console.log("Database updated successfully");
        
        // Also update the task's completion status if this is the first completion
        if (currentInstances.length === 0) {
          try {
            const familyRef = doc(db, "families", familyId);
            const familyDoc = await getDoc(familyRef);
            
            if (familyDoc.exists()) {
              const tasks = familyDoc.data().tasks || [];
              const updatedTasks = tasks.map(task => {
                if (task.id === habitId) {
                  // Update the first subtask as completed
                  const updatedSubTasks = task.subTasks?.map((st, idx) => 
                    idx === 0 ? {...st, completed: true} : st
                  ) || [];
                  
                  return {
                    ...task,
                    subTasks: updatedSubTasks,
                    lastCompleted: newInstance.timestamp
                  };
                }
                return task;
              });
              
              await updateDoc(familyRef, {
                tasks: updatedTasks
              });
              
              console.log("Task updated with completion status");
            }
          } catch (taskError) {
            console.error("Error updating task:", taskError);
          }
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        createCelebration("Error", false, "Failed to save your habit completion.");
        setIsProcessing(false);
        return false;
      }
      
      // Update local state with deep cloning to ensure re-render
      setCompletedHabitInstances(prev => {
        const newState = {...prev};
        newState[habitId] = updatedInstances;
        return newState;
      });
      
      // Update the tracking count in habits state
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        // Create a fresh copy of the habits array
        const updatedHabits = habits.map(h => {
          if (h.id === habitId) {
            return {
              ...h,
              completionInstances: updatedInstances,
              lastCompleted: newInstance.timestamp,
              // Also increment streak
              streak: h.streak + 1,
              record: Math.max(h.streak + 1, h.record || 0)
            };
          }
          return h;
        });
        
        // Set the updated habits
        setHabits(updatedHabits);
        
        // Create celebration
        createCelebration(habit.title, true);
        
        // Also update the habit streaks in the database
        try {
          const familyRef = doc(db, "families", familyId);
          await updateDoc(familyRef, {
            [`habitStreaks.${habitId}`]: increment(1),
            [`habitStreaks.${habitId}_record`]: (habit.streak + 1 > (habit.record || 0)) ? habit.streak + 1 : increment(0)
          });
          
          console.log("Habit streaks updated in database");
        } catch (streakError) {
          console.error("Error updating habit streaks:", streakError);
        }
        
        // Milestone reached - exactly 5 completions
        if (updatedInstances.length === 5) {
          // Launch confetti
          launchConfetti();
          
          // Enable survey
          setCanTakeSurvey(true);
          
          // Show special celebration
          createCelebration("Survey Unlocked!", true, "You've completed a habit 5 times!");
          
          // Auto-open the family meeting after a short delay
          setTimeout(() => {
            onStartWeeklyCheckIn();
          }, 2000);
        }
        // Other milestone - 11 completions (mastery)
        else if (updatedInstances.length === 11) {
          launchConfetti();
          createCelebration("Habit Mastered!", true, "You've mastered this habit! Great job!");
        }
      }
      
      // Reset reflection
      setReflection('');
      
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error("Error recording habit instance:", error);
      createCelebration("Error", false, "Failed to record habit completion.");
      setIsProcessing(false);
      return false;
    }
  };
  
  // Save reflection after completing a habit
  const saveReflection = async () => {
    if (!reflection.trim() || !selectedHabit) return;
    
    try {
      // Save the comment
      await addTaskComment(selectedHabit.id, reflection);
      
      // Add to local state
      const updatedHabits = habits.map(h => {
        if (h.id === selectedHabit.id) {
          return {
            ...h,
            comments: [...(h.comments || []), {
              id: Date.now(),
              userId: selectedUser.id,
              userName: selectedUser.name,
              text: reflection,
              timestamp: new Date().toISOString()
            }]
          };
        }
        return h;
      });
      
      setHabits(updatedHabits);
      setReflection('');
      setShowHabitDetail(null);
      
      // Show success message
      createCelebration("Reflection Saved", true);
    } catch (error) {
      console.error("Error saving reflection:", error);
    }
  };
  
  // Create new habit with set priority
  const createNewHabit = async (isRefresh = false, priority = "medium") => {
    try {
      setAllieIsThinking(true);
      
      // Default habit parts - we'll use these directly for simplicity
      const title = "Family Calendar Check-in";
      const description = "Take a moment each day to review the family calendar";
      const cue = "After breakfast";
      const action = "Check the family calendar for today's events";
      const reward = "Feel organized and prepared for the day";
      const identity = "I am someone who stays on top of family commitments";
      
      // Create the habit subtasks
      const subTasks = [
        { title: cue, description: "This is your trigger" },
        { title: action, description: "This is the habit action" },
        { title: reward, description: "This is your reward" }
      ];
      
      try {
        // Create the habit in the tasks array of the family document
        const familyRef = doc(db, "families", familyId);
        const familyDoc = await getDoc(familyRef);
        
        if (!familyDoc.exists()) {
          throw new Error("Family document not found");
        }
        
        // Get current tasks
        const currentTasks = familyDoc.data().tasks || [];
        
        // If refreshing, first remove the initial habit
        let updatedTasks = [...currentTasks];
        if (isRefresh) {
          // Find and remove the initial non-user-generated habit
          const initialHabitIndex = habits.findIndex(h => !h.isUserGenerated);
          if (initialHabitIndex >= 0) {
            // Find the corresponding task in currentTasks
            const initialTaskId = habits[initialHabitIndex].id;
            updatedTasks = updatedTasks.filter(t => t.id !== initialTaskId);
          }
        }
        
        // Generate a unique ID
        const taskId = `habit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        // Create the new habit with the ID and priority
        const newHabit = {
          id: taskId,
          title: title,
          description: description,
          cue: cue,
          action: action,
          reward: reward,
          identity: identity,
          assignedTo: selectedUser.roleType || selectedUser.role,
          assignedToName: selectedUser.name,
          category: identity.includes("parent") ? "Parental Tasks" : "Household Tasks",
          insight: `This habit helps build your identity as ${identity}`,
          completed: false,
          comments: [],
          streak: 0,
          record: 0,
          progress: 0,
          lastCompleted: null,
          isUserGenerated: !isRefresh, // If refreshing, this is the new initial habit
          priority: priority, // Add priority
          dueDate: null, // No due date by default
          subTasks: subTasks.map((st, idx) => ({
            id: `${taskId}-step-${idx + 1}`,
            title: st.title,
            description: st.description,
            completed: false
          }))
        };
        
        // Update the tasks array
        await updateDoc(familyRef, {
          tasks: [...updatedTasks, newHabit]
        });
        
        // Set up empty habit instances
        await updateDoc(doc(db, "families", familyId, "habitInstances", taskId), {
          instances: []
        }, { merge: true });
        
        // Update the local state
        if (isRefresh) {
          // Replace the initial habit
          setHabits(prev => {
            const filtered = prev.filter(h => h.isUserGenerated);
            return [{...newHabit, completionInstances: []}, ...filtered];
          });
          createCelebration("Habit refreshed!", true);
        } else {
          // Add to habits as user-generated
          setHabits(prev => [
            {...newHabit, completionInstances: []},
            ...prev
          ]);
          createCelebration("New habit created!", true);
        }
        
        // Update completedHabitInstances state
        setCompletedHabitInstances(prev => ({
          ...prev,
          [taskId]: []
        }));
        
        setShowAddHabit(false);
      } catch (dbError) {
        console.error("Database error creating habit:", dbError);
        throw dbError;
      }
      
      setAllieIsThinking(false);
      return true;
    } catch (error) {
      console.error("Error creating new habit:", error);
      setAllieIsThinking(false);
      createCelebration("Error", false, "Could not create habit. Please try again later.");
      return false;
    }
  };
  
  // Create a new task with the form data
  const createNewTask = async () => {
    if (!familyId || !selectedUser || !newTaskFormData.title) return;
    
    try {
      setIsProcessing(true);
      
      // Generate a unique ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Find the assigned member
      let assignedMember = familyMembers.find(m => m.id === newTaskFormData.assignedTo);
      if (!assignedMember) {
        // Default to current user
        assignedMember = selectedUser;
      }
      
      // Create subtasks
      const subTasks = newTaskFormData.subtasks
        .filter(st => st.trim())
        .map((st, idx) => ({
          id: `${taskId}-sub-${idx + 1}`,
          title: st,
          description: "",
          completed: false
        }));
      
      // Create the task object
      const newTask = {
        id: taskId,
        title: newTaskFormData.title,
        description: newTaskFormData.description,
        assignedTo: assignedMember.roleType || assignedMember.role,
        assignedToName: assignedMember.name,
        category: newTaskFormData.category || "Household Tasks",
        priority: newTaskFormData.priority || "medium",
        dueDate: newTaskFormData.dueDate || null,
        completed: false,
        createdBy: selectedUser.id,
        createdByName: selectedUser.name,
        createdAt: new Date().toISOString(),
        isUserGenerated: true,
        subTasks: subTasks,
        comments: []
      };
      
      // Add to Firebase
      const familyRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyRef);
      
      if (familyDoc.exists()) {
        const currentTasks = familyDoc.data().tasks || [];
        
        await updateDoc(familyRef, {
          tasks: [...currentTasks, newTask],
          updatedAt: new Date().toISOString()
        });
        
        // Add to habits if for current user
        if (newTask.assignedTo === (selectedUser?.roleType || selectedUser?.role)) {
          const habitVersion = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            assignedTo: newTask.assignedTo,
            assignedToName: newTask.assignedToName,
            category: newTask.category,
            priority: newTask.priority,
            dueDate: newTask.dueDate,
            completed: false,
            completionInstances: [],
            streak: 0,
            record: 0,
            progress: 0,
            isUserGenerated: true,
            atomicSteps: newTask.subTasks
          };
          
          setHabits(prev => [habitVersion, ...prev]);
          setCompletedHabitInstances(prev => ({
            ...prev,
            [newTask.id]: []
          }));
        }
        
        // Reset form and close modal
        setNewTaskFormData({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'medium',
          category: '',
          dueDate: '',
          subtasks: ['']
        });
        setShowCreateTaskForm(false);
        
        // Show success notification
        createCelebration(`New task "${newTask.title}" created`, true);
        
        // Re-analyze with new task
        const updatedTasks = [...prioritizedTasks, newTask];
        const updatedPrioritizedTasks = TaskPrioritizer.prioritizeTasks(
          updatedTasks, balanceAnalysis, familyPriorities
        );
        setPrioritizedTasks(updatedPrioritizedTasks);
      }
      
      setIsProcessing(false);
      return true;
    } catch (error) {
      console.error("Error creating new task:", error);
      createCelebration("Error", false, "Failed to create task. Please try again.");
      setIsProcessing(false);
      return false;
    }
  };
  
  // Delete habit
  const deleteHabit = async (habitId) => {
    try {
      if (!familyId) return;
      
      // Confirm deletion
      if (!window.confirm("Are you sure you want to delete this habit?")) {
        return;
      }
      
      // Update local state first for immediate feedback
      setHabits(prev => prev.filter(h => h.id !== habitId));
      
      // Update in database
      const familyRef = doc(db, "families", familyId);
      const familyDoc = await getDoc(familyRef);
      
      if (familyDoc.exists()) {
        const currentTasks = familyDoc.data().tasks || [];
        const updatedTasks = currentTasks.filter(t => t.id !== habitId);
        
        await updateDoc(familyRef, {
          tasks: updatedTasks,
          updatedAt: new Date().toISOString()
        });
        
        // Also remove habit instances
        await updateDoc(doc(db, "families", familyId, "habitInstances", habitId), {
          instances: [],
          deleted: true
        }, { merge: true });
        
        // Remove from completedHabitInstances state
        setCompletedHabitInstances(prev => {
          const newState = {...prev};
          delete newState[habitId];
          return newState;
        });
        
        // Show success notification
        createCelebration("Habit deleted", true);
      }
    } catch (error) {
      console.error("Error deleting habit:", error);
      createCelebration("Error", false, "Failed to delete the habit");
      
      // Reload habits to restore state
      loadCurrentWeekTasks();
    }
  };
  
  // Check if habit has any completions
  const hasCompletedInstances = (habitId) => {
    return (completedHabitInstances[habitId]?.length || 0) > 0;
  };

  // Start the survey
  const handleStartSurvey = () => {
    // Check if at least one habit has 5+ completions
    const hasEnoughCompletions = Object.values(completedHabitInstances).some(instances => instances.length >= 5);
    
    if (hasEnoughCompletions) {
      onStartWeeklyCheckIn();
    } else {
      createCelebration("Not Ready Yet", false, "Complete a habit at least 5 times to unlock the survey.");
    }
  };
  
  // Trigger Allie chat
  const triggerAllieChat = (message) => {
    // Simple implementation - in a real app, this would interface with your chat component
    console.log("Asking Allie:", message);
    
    // First try to find the global chat button element
    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
      // Try to open the chat
      chatButton.click();
      
      // Find the input after a delay
      setTimeout(() => {
        const chatInput = document.querySelector('textarea[placeholder*="Message Allie"]');
        if (chatInput) {
          chatInput.value = message;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Find and click the send button
          const sendButton = document.querySelector('button.bg-blue-600.text-white');
          if (sendButton) {
            sendButton.click();
          }
        }
      }, 500);
    } else {
      createCelebration("Chat Not Available", false, "Please try asking Allie directly through the chat button.");
    }
  };
  
  // Filter for all family members (both adults and children)
  const displayedMembers = familyMembers.filter(m => m.role === 'parent' || m.role === 'child');
  
  // Filter habits for the current user
  const userHabits = habits.filter(habit => 
    habit.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
    habit.assignedToName === selectedUser?.name ||
    habit.assignedTo === "Everyone"
  );

  // NEW: Prioritize tasks
  const userTasks = prioritizedTasks.filter(task => 
    task.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
    task.assignedToName === selectedUser?.name
  );
  
  // NEW: Get recommendations for the current user
  const userRecommendations = selectedUser ? 
    dailyRecommendations?.[selectedUser?.roleType?.toLowerCase() || selectedUser?.role?.toLowerCase()] 
    : null;
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden font-roboto">
      {/* Header with cycle information */}
      <div className="bg-black text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium">Family Cycle {currentWeek}</h2>
            <p className="text-sm text-gray-300 mt-1">
              Complete habits, take surveys, and hold family meetings to improve balance
            </p>
          </div>
          <div className="flex items-center">
            <div className="bg-white bg-opacity-10 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center">
                <Flame className="text-orange-400 mr-1" size={18} />
                <span className="text-lg font-bold">{familyStreak}</span>
              </div>
              <p className="text-xs">Streak</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="p-4 border-b">
        <div className="flex justify-between mb-6 relative">
          {/* Define color styles for each step */}
          {(() => {
            // Define step colors - specific colors that correlate to the steps
            const stepColors = {
              1: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-100' },
              2: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-100' },
              3: { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-100' }
            };
            
            // Default color for inactive steps
            const inactiveColor = { bg: 'bg-gray-200', text: 'text-gray-500', light: 'bg-gray-100' };
            
            // Get color for current step
            const currentStepColor = stepColors[cycleStep] || stepColors[1];
            
            return (
              <>
                {/* Step 1 */}
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors duration-300 ${
                    cycleStep >= 1 
                      ? (cycleStep === 1 ? stepColors[1].bg + ' text-white' : 'bg-black text-white')
                      : inactiveColor.bg + ' ' + inactiveColor.text
                  }`}>
                    1
                  </div>
                  <div className={`text-xs mt-2 text-center transition-colors duration-300 ${
                    cycleStep === 1 ? stepColors[1].text + ' font-medium' : ''
                  }`}>
                    <div className="font-medium">STEP 1</div>
                    <div>Habit Building</div>
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors duration-300 ${
                    cycleStep >= 2 
                      ? (cycleStep === 2 ? stepColors[2].bg + ' text-white' : 'bg-black text-white')
                      : inactiveColor.bg + ' ' + inactiveColor.text
                  }`}>
                    2
                  </div>
                  <div className={`text-xs mt-2 text-center transition-colors duration-300 ${
                    cycleStep === 2 ? stepColors[2].text + ' font-medium' : ''
                  }`}>
                    <div className="font-medium">STEP 2</div>
                    <div>Family Survey</div>
                  </div>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors duration-300 ${
                    cycleStep >= 3 
                      ? (cycleStep === 3 ? stepColors[3].bg + ' text-white' : 'bg-black text-white')
                      : inactiveColor.bg + ' ' + inactiveColor.text
                  }`}>
                    3
                  </div>
                  <div className={`text-xs mt-2 text-center transition-colors duration-300 ${
                    cycleStep === 3 ? stepColors[3].text + ' font-medium' : ''
                  }`}>
                    <div className="font-medium">STEP 3</div>
                    <div>Family Meeting</div>
                  </div>
                </div>
                
                {/* Progress line - now with gradient colors */}
                <div className="absolute left-0 top-5 h-0.5 bg-gray-200 w-full -z-0"></div>
                <div 
                  className={`absolute left-0 top-5 h-1 ${
                    cycleStep === 1 ? 'bg-blue-500' : 
                    cycleStep === 2 ? 'bg-gradient-to-r from-blue-500 to-green-500' :
                    cycleStep === 3 ? 'bg-gradient-to-r from-blue-500 via-green-500 to-purple-500' : 'bg-black'
                  } -z-0 transition-all duration-500 rounded-full`}
                  style={{ 
                    width: `${((cycleStep - 1) / 2) * 100}%`,
                  }}
                />
              </>
            );
          })()}
        </div>
        
        {/* Family Member Progress */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayedMembers.map(member => {
            const progress = memberProgress[member.id] || { step: 1, completedSurvey: false };
            // Determine progress color based on step
            const stepColorClass = 
              progress.step === 1 ? 'bg-blue-500 text-white' :
              progress.step === 2 ? 'bg-green-500 text-white' :
              progress.step === 3 ? 'bg-purple-500 text-white' : 
              'bg-gray-200 text-gray-500';
            
            return (
              <div key={member.id} className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                    {member.profilePicture ? (
                      <img 
                        src={member.profilePicture} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white"
                        style={{ backgroundColor: getAvatarColor(member.name) }}
                      >
                        {getInitials(member.name)}
                      </div>
                    )}
                  </div>
                  <div className={`absolute -right-1 -bottom-1 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    member.role === 'child' ? 'bg-green-500 text-white' : stepColorClass
                  }`}>
                    {member.role === 'child' ? '2' : progress.step}
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="text-xs text-gray-500">
                    {member.role === 'child' 
                      ? 'Step 2: Survey' 
                      : progress.completedSurvey ? 'Survey Done' : 'Step 1: Habits'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleStartSurvey}
            disabled={!canTakeSurvey}
            className={`px-4 py-2 rounded-md flex items-center ${
              canTakeSurvey ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={18} className="mr-2" />
            Take Survey
          </button>
          
          <button
            onClick={onOpenFamilyMeeting}
            disabled={!canScheduleMeeting}
            className={`px-4 py-2 rounded-md flex items-center ${
              canScheduleMeeting ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Calendar size={18} className="mr-2" />
            Schedule Meeting
          </button>
          
          <button
            onClick={async () => {
              try {
                // Set default date with safer date manipulation
                const today = new Date();
                let defaultDate;
                
                if (surveyDue instanceof Date && !isNaN(surveyDue.getTime())) {
                  defaultDate = surveyDue;
                } else {
                  // Create a new date 7 days in the future safely
                  defaultDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
                }
                
                setDatePickerDate(defaultDate);
                
                // Find existing event
                const existingEvent = await findExistingDueDateEvent();
                setExistingDueDateEvent(existingEvent);
                
                setShowCalendar(true);
              } catch (error) {
                console.error("Error preparing calendar:", error);
                createCelebration("Error", false, "Could not open calendar. Please try again.");
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50"
          >
            <Clock size={18} className="mr-2" />
            Change Due Date
          </button>
        </div>
        
        {/* Cycle Information */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
          <div className="flex items-start">
            <Info size={16} className="mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium">Cycle Progress</h4>
              
              <div className="mt-2 flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                  canTakeSurvey ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {canTakeSurvey && <Check size={12} />}
                </div>
                <span className={canTakeSurvey ? 'text-green-700' : ''}>
                  Complete a habit at least 5 times
                </span>
              </div>
              
              <div className="mt-1 flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                  Object.values(memberProgress).every(p => p.completedSurvey) 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300'
                }`}>
                  {Object.values(memberProgress).every(p => p.completedSurvey) && <Check size={12} />}
                </div>
                <span className={Object.values(memberProgress).every(p => p.completedSurvey) ? 'text-green-700' : ''}>
                  All family members complete the survey
                </span>
              </div>
              
              <div className="mt-1 flex items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                  cycleStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}>
                  {cycleStep >= 3 && <Check size={12} />}
                </div>
                <span className={cycleStep >= 3 ? 'text-green-700' : ''}>
                  Hold a family meeting to review progress
                </span>
              </div>
              
              <div className="mt-2 text-gray-500 flex items-center text-xs">
                <Clock size={12} className="mr-1" />
                Due date: {surveyDue ? formatDate(surveyDue) : 'Not scheduled yet'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Balance Status Panel */}
      {balanceAnalysis && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg flex items-center">
              <Activity size={20} className="mr-2 text-blue-600" />
              Workload Balance Status
            </h3>
            <button 
              onClick={() => setShowBalancePanel(!showBalancePanel)}
              className="text-gray-500 hover:text-black"
            >
              {showBalancePanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {/* Imbalance Score */}
          <div className="mb-4">
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute top-0 left-0 h-full ${
                  balanceAnalysis.imbalanceScore < 15 ? 'bg-green-500' :
                  balanceAnalysis.imbalanceScore < 30 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${balanceAnalysis.imbalanceScore}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>Balanced (0)</span>
              <span>Imbalanced (100)</span>
            </div>
          </div>
          
          {/* Balance Detail */}
          {showBalancePanel && (
            <div className="mt-4 space-y-4 text-sm">
              {/* Overall Balance */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Overall Workload Distribution</h4>
                <div className="flex items-center">
                  <div className="w-32 mr-3">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500"
                        style={{ width: `${balanceAnalysis.combinedAnalysis.overallBalance.mama}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span>Mama</span>
                      <span>{balanceAnalysis.combinedAnalysis.overallBalance.mama.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${balanceAnalysis.combinedAnalysis.overallBalance.papa}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span>Papa</span>
                      <span>{balanceAnalysis.combinedAnalysis.overallBalance.papa.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Category Breakdown */}
              <div>
                <h4 className="font-medium mb-2">Category Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(balanceAnalysis.combinedAnalysis.categoryBalance).map(([category, data]) => (
                    <div key={category} className="bg-gray-50 p-2 rounded">
                      <p className="text-xs mb-1">{category}</p>
                      <div className="flex items-center">
                        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                          <div 
                            className="h-full bg-purple-400"
                            style={{ width: `${data.mama}%` }}
                          ></div>
                        </div>
                        <span className="text-xs mr-2">{data.mama.toFixed(0)}%</span>
                        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                          <div 
                            className="h-full bg-green-400"
                            style={{ width: `${data.papa}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{data.papa.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Invisible Work */}
              <div>
                <h4 className="font-medium mb-2">Invisible Work</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs mb-2">Invisible work imbalance: {balanceAnalysis.invisibilityAnalysis.overallInvisibleImbalance.toFixed(1)}%</p>
                  
                  <div className="space-y-2">
                    {Object.entries(balanceAnalysis.invisibilityAnalysis.taskBased).map(([category, data]) => (
                      <div key={category} className="flex items-center">
                        <div className="w-32 text-xs">{category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}:</div>
                        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                          <div 
                            className="h-full bg-purple-400"
                            style={{ width: `${data.mamaPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs mr-1">{data.mamaPercent.toFixed(0)}%</span>
                        <span className="text-xs mx-1">vs</span>
                        <span className="text-xs mr-1">{data.papaPercent.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Distribution */}
              <div>
                <h4 className="font-medium mb-2">Time of Day Distribution</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="space-y-2">
                    {Object.entries(balanceAnalysis.timeAnalysis).map(([timeSlot, data]) => (
                      <div key={timeSlot} className="flex items-center">
                        <div className="w-32 text-xs capitalize">{timeSlot}:</div>
                        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                          <div 
                            className="h-full bg-purple-400"
                            style={{ width: `${data.mamaPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs mr-1">{data.mamaPercent.toFixed(0)}%</span>
                        <span className="text-xs mx-1">vs</span>
                        <span className="text-xs mr-1">{data.papaPercent.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Balance Alerts */}
              {balanceInsights.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Balance Alerts</h4>
                  <div className="space-y-2">
                    {balanceInsights.map((alert, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded ${
                          alert.type === 'critical' ? 'bg-red-50 border border-red-100' : 
                          'bg-yellow-50 border border-yellow-100'
                        }`}
                      >
                        <div className="flex items-start">
                          <AlertTriangle 
                            size={16} 
                            className={`mr-2 mt-0.5 flex-shrink-0 ${
                              alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'
                            }`} 
                          />
                          <div>
                            <p className="text-xs font-medium">{alert.category}</p>
                            <p className="text-xs mt-1">{alert.message}</p>
                            <p className="text-xs mt-1 italic">{alert.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW: Task Analysis Panel */}
      {taskAnalysis && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg flex items-center">
              <BarChart2 size={20} className="mr-2 text-green-600" />
              Task Analysis
            </h3>
            <button 
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
              className="text-gray-500 hover:text-black"
            >
              {showAnalysisPanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {/* Task Insights Summary */}
          <div className="mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Task Insights</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {taskInsights.length} insights
                </span>
              </div>
              
              {taskInsights.length > 0 ? (
                <div className="text-sm text-gray-700">
                  {taskInsights[0].message}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Not enough task data to generate insights yet.
                </div>
              )}
            </div>
          </div>
          
          {/* Task Analysis Detail */}
          {showAnalysisPanel && (
            <div className="mt-4 space-y-4 text-sm">
              {/* Completion Rates */}
              <div>
                <h4 className="font-medium mb-2">Task Completion Rates</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="space-y-2">
                    {Object.entries(taskAnalysis.completionRates).map(([category, data]) => (
                      <div key={category} className="flex items-center">
                        <div className="w-40 text-xs truncate">{category}:</div>
                        <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div 
                            className={`h-full ${data.completion_rate > 70 ? 'bg-green-500' : 
                              data.completion_rate > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${data.completion_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{data.completion_rate.toFixed(0)}% completed</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* High Impact Categories */}
              <div>
                <h4 className="font-medium mb-2">High Impact Categories</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="space-y-3">
                    {taskAnalysis.highImpactCategories.map((category, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="mr-2">
                          {category.impact === 'high' ? (
                            <Shield size={18} className="text-red-500" />
                          ) : category.impact === 'medium' ? (
                            <Shield size={18} className="text-yellow-500" />
                          ) : (
                            <Shield size={18} className="text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium">{category.category}</div>
                          <div className="text-xs">Weight: {category.averageWeight.toFixed(1)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Assignment Patterns */}
              <div>
                <h4 className="font-medium mb-2">Task Assignment Patterns</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {/* Day of Week Patterns */}
                  <div className="mb-3">
                    <h5 className="text-xs font-medium mb-1">Day of Week</h5>
                    <div className="space-y-1">
                      {Object.entries(taskAnalysis.assignmentPatterns.dayOfWeek).map(([day, data]) => (
                        <div key={day} className="flex items-center">
                          <div className="w-24 text-xs">{day}:</div>
                          <div className="flex items-center">
                            <span className="text-xs text-purple-600 mr-1">Mama: {data.mama}</span>
                            <span className="text-xs text-gray-400 mx-1">|</span>
                            <span className="text-xs text-green-600">Papa: {data.papa}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Consecutive Assignments */}
                  <div>
                    <h5 className="text-xs font-medium mb-1">Max Consecutive Assignments</h5>
                    <div className="flex items-center">
                      <div className="w-24 text-xs">Mama:</div>
                      <div className="flex items-center">
                        <span className={`text-xs ${
                          taskAnalysis.assignmentPatterns.consecutive.mama > 5 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          {taskAnalysis.assignmentPatterns.consecutive.mama} tasks in a row
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-24 text-xs">Papa:</div>
                      <div className="flex items-center">
                        <span className={`text-xs ${
                          taskAnalysis.assignmentPatterns.consecutive.papa > 5 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-600'
                        }`}>
                          {taskAnalysis.assignmentPatterns.consecutive.papa} tasks in a row
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* All Task Insights */}
              <div>
                <h4 className="font-medium mb-2">All Task Insights</h4>
                <div className="space-y-2">
                  {taskInsights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded ${
                        insight.severity === 'high' ? 'bg-red-50 border border-red-100' : 
                        insight.severity === 'medium' ? 'bg-yellow-50 border border-yellow-100' :
                        'bg-blue-50 border border-blue-100'
                      }`}
                    >
                      <div className="flex items-start">
                        {insight.severity === 'high' ? (
                          <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        ) : insight.severity === 'medium' ? (
                          <Info size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-medium">{insight.category} - {insight.type}</p>
                          <p className="text-xs mt-1">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {taskInsights.length === 0 && (
                    <div className="text-sm text-gray-500 italic text-center p-3">
                      Complete more tasks to generate insights
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW: Task Priority Panel */}
      {prioritizedTasks.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg flex items-center">
              <List size={20} className="mr-2 text-purple-600" />
              Prioritized Tasks
            </h3>
            <button 
              onClick={() => setShowPriorityPanel(!showPriorityPanel)}
              className="text-gray-500 hover:text-black"
            >
              {showPriorityPanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {/* My Top Tasks */}
          <div className="mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">My Top Tasks</h4>
                <button 
                  onClick={() => setShowCreateTaskForm(true)}
                  className="text-xs bg-black text-white px-2 py-1 rounded-full flex items-center"
                >
                  <Plus size={12} className="mr-1" />
                  New Task
                </button>
              </div>
              
              {userTasks.filter(t => !t.completed).length > 0 ? (
                <div className="space-y-2">
                  {userTasks
                    .filter(t => !t.completed)
                    .slice(0, 3)
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className={`w-2 h-2 rounded-full mr-2 ${
                              task.priorityLevel === 'critical' ? 'bg-red-500' :
                              task.priorityLevel === 'high' ? 'bg-orange-500' :
                              task.priorityLevel === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                          />
                          <span className="text-sm truncate max-w-xs">{task.title}</span>
                        </div>
                        
                        <button
                          onClick={() => updateTaskCompletion(task.id, true)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 p-1 rounded"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic text-center">
                  No pending tasks
                </div>
              )}
            </div>
          </div>
          
          {/* Task Priority Detail */}
          {showPriorityPanel && (
            <div className="mt-4 space-y-4 text-sm">
              {/* Priority Distribution */}
              <div>
                <h4 className="font-medium mb-2">Task Priority Distribution</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-around mb-2">
                    {/* Critical Tasks */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {prioritizedTasks.filter(t => t.priorityLevel === 'critical' && !t.completed).length}
                      </div>
                      <div className="text-xs">Critical</div>
                    </div>
                    
                    {/* High Priority Tasks */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-500">
                        {prioritizedTasks.filter(t => t.priorityLevel === 'high' && !t.completed).length}
                      </div>
                      <div className="text-xs">High</div>
                    </div>
                    
                    {/* Medium Priority Tasks */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-500">
                        {prioritizedTasks.filter(t => t.priorityLevel === 'medium' && !t.completed).length}
                      </div>
                      <div className="text-xs">Medium</div>
                    </div>
                    
                    {/* Low Priority Tasks */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-500">
                        {prioritizedTasks.filter(t => t.priorityLevel === 'low' && !t.completed).length}
                      </div>
                      <div className="text-xs">Low</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* All Prioritized Tasks */}
              <div>
                <h4 className="font-medium mb-2">All Prioritized Tasks</h4>
                <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
                  {prioritizedTasks
                    .filter(t => !t.completed)
                    .map(task => (
                      <div 
                        key={task.id} 
                        className="py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div 
                                className={`w-3 h-3 rounded-full mr-2 ${
                                  task.priorityLevel === 'critical' ? 'bg-red-500' :
                                  task.priorityLevel === 'high' ? 'bg-orange-500' :
                                  task.priorityLevel === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                              />
                              <span className="text-sm font-medium">{task.title}</span>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                            
                            <div className="flex items-center mt-2 space-x-2">
                              <span className="text-xs text-gray-500">Assigned to: {task.assignedToName}</span>
                              
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">Due: {formatDate(task.dueDate)}</span>
                              )}
                              
                              <span className="text-xs text-gray-500">Score: {task.priorityScore?.toFixed(0) || "-"}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => updateTaskCompletion(task.id, true)}
                            className="ml-2 bg-gray-100 hover:bg-gray-200 p-1.5 rounded"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW: Daily Recommendations */}
      {userRecommendations && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center">
              <Star size={20} className="mr-2 text-amber-500" />
              Your Daily Focus
            </h3>
          </div>
          
          {/* Daily Focus Tasks */}
          {userRecommendations.dailyFocus && userRecommendations.dailyFocus.length > 0 ? (
            <div className="space-y-3">
              {userRecommendations.dailyFocus.map((focus, idx) => (
                <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-800 font-bold mr-3 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-900">{focus.title}</h4>
                      <p className="text-sm text-amber-800 mt-1">{focus.reason}</p>
                      
                      {focus.subtasks && focus.subtasks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {focus.subtasks.map((subtask, subtaskIdx) => (
                            <div key={subtaskIdx} className="flex items-center">
                              <div className="w-5 h-5 bg-white rounded-full border border-amber-300 mr-2 flex items-center justify-center text-xs text-amber-700">
                                {subtaskIdx + 1}
                              </div>
                              <span className="text-sm text-amber-700">{subtask.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
              No focus tasks for today. Complete some habits to get personalized recommendations.
            </div>
          )}
          
          {/* Balance Tip */}
          {userRecommendations.balanceTip && (
            <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-lg">
              <div className="flex items-start">
                <Info size={18} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">Balance Tip</h4>
                  <p className="text-sm text-blue-800 mt-1">{userRecommendations.balanceTip}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Task Suggestion */}
          {userRecommendations.taskSuggestion && (
            <div className="mt-4 bg-green-50 border border-green-100 p-3 rounded-lg">
              <div className="flex items-start">
                <Zap size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Suggested Task</h4>
                  <p className="text-sm text-green-800 mt-1">{userRecommendations.taskSuggestion.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Current habits section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Your Current Habits</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowAddHabit(true)}
              className="text-sm flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <Plus size={16} className="mr-1" />
              Add Habit
            </button>
            
            <button 
              onClick={() => {
                const hasCompletions = habits.some(h => !h.isUserGenerated && hasCompletedInstances(h.id));
                
                if (hasCompletions) {
                  if (window.confirm("This will replace your current system habit. Your completion progress will be lost. Continue?")) {
                    createNewHabit(true);
                  }
                } else {
                  createNewHabit(true);
                }
              }}
              className="text-sm flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={allieIsThinking}
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        ) : userHabits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No habits set for this cycle yet</p>
            <button 
              onClick={() => createNewHabit()}
              className="mt-3 px-4 py-2 bg-black text-white rounded-lg flex items-center mx-auto"
            >
              <Plus size={16} className="mr-2" />
              Create Your First Habit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userHabits.map(habit => (
              <div 
                key={habit.id} 
                className="border rounded-lg overflow-hidden transition-all duration-300 transform hover:shadow-md bg-white"
              >
                {/* Habit card */}
                <div className="p-4">
                  <div className="flex flex-col">
                    {/* Habit header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-base mb-1">{habit.title}</h4>
                        <p className="text-sm text-gray-600">{habit.description}</p>
                      </div>
                      
                      {/* Streak badge */}
                      <div className="flex items-center bg-amber-50 px-2 py-1 rounded-full text-amber-700 text-xs">
                        <Flame size={12} className="mr-1 text-amber-500" />
                        <span>{habit.streak} day{habit.streak !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {/* Cue, routine, reward pattern */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Cue</div>
                        <div className="bg-gray-50 p-2 rounded-lg h-12 overflow-hidden flex items-center">
                          {habit.cue || "After breakfast"}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Routine</div>
                        <div className="bg-gray-50 p-2 rounded-lg h-12 overflow-hidden flex items-center">
                          {habit.action || habit.title}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Reward</div>
                        <div className="bg-gray-50 p-2 rounded-lg h-12 overflow-hidden flex items-center">
                          {habit.reward || "Feel accomplished"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Identity statement */}
                    <div className="mt-3 text-xs px-3 py-2 bg-black text-white rounded-full inline-block">
                      {habit.identity || "I am someone who values balance"}
                    </div>
                    
                    {/* Completion circles */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Completion Progress</span>
                        <span className="text-xs font-medium">
                          {(habit.completionInstances?.length || 0)}/11 instances
                        </span>
                      </div>
                      <div className="flex justify-between">
                        {Array.from({ length: 11 }).map((_, index) => {
                          const isCompleted = index < (habit.completionInstances?.length || 0);
                          const isMinimumReached = index === 4 && isCompleted;
                          const isComplete = index === 10 && isCompleted;
                          
                          return (
                            <div 
                              key={index} 
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? isComplete
                                    ? 'bg-green-500 text-white'
                                    : isMinimumReached
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-black text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              {isCompleted && <Check size={14} />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">Start</span>
                        <span className="text-xs text-blue-500 font-medium">
                          Survey Unlocked (5)
                        </span>
                        <span className="text-xs text-green-500 font-medium">
                          Habit Mastered!
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-4 flex justify-between items-center">
                      <div className="space-x-2">
                        {habit.isUserGenerated && (
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="text-xs flex items-center bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md"
                          >
                            <Trash size={14} className="mr-1" />
                            Delete Habit
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedHabit(habit);
                          setShowHabitDetail(habit.id);
                        }}
                        className="px-3 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 flex items-center"
                      >
                        <CheckCircle size={14} className="mr-2" />
                        Practice This Habit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Allie chat integration */}
      <div className="mt-4 p-4 border-t">
        <div className="flex items-start">
          <MessageSquare size={20} className="text-black mt-1 mr-3" />
          <div>
            <h3 className="font-medium">Allie Coaching</h3>
            <p className="text-sm text-gray-600 mt-1">
              Get personalized advice from Allie on how to build lasting habits and improve balance
            </p>
            <button 
              onClick={() => triggerAllieChat("I want to build better habits to improve family balance. Can you give me some tips based on Atomic Habits principles?")}
              className="mt-3 px-4 py-2 bg-black text-white rounded flex items-center hover:bg-gray-800"
            >
              Chat with Allie
            </button>
          </div>
        </div>
      </div>
      
      {/* Celebration messages */}
      <div className="fixed bottom-4 right-4 space-y-2 z-30">
        {celebrations.map(celebration => (
          <div 
            key={celebration.id} 
            className={`p-3 rounded-lg shadow-lg animation-bounce-in max-w-xs ${
              celebration.success ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            <div className="flex items-center">
              {celebration.success ? (
                <Check className="text-white mr-2" size={18} />
              ) : (
                <Info className="text-white mr-2" size={18} />
              )}
              <div>
                <div className="font-medium">{celebration.title}</div>
                <div className="text-sm">{celebration.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Habit detail/log modal */}
      {showHabitDetail && selectedHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">{selectedHabit.title}</h3>
              <button 
                onClick={() => setShowHabitDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Identity statement */}
            <div className="mb-4 p-3 bg-black text-white rounded-lg">
              <div className="text-xs text-gray-300 mb-1">Identity:</div>
              <div>{selectedHabit.identity}</div>
            </div>
            
            {/* Simple steps */}
            <div className="mb-4">
              <div className="space-y-2">
                {selectedHabit.atomicSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                    <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 mr-2 flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div className="text-sm">{step.title}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-800">
                You've completed this habit {selectedHabit.completionInstances?.length || 0} times.
                {selectedHabit.completionInstances?.length >= 5 ? 
                  " Survey is unlocked!" : 
                  ` Complete ${5 - (selectedHabit.completionInstances?.length || 0)} more times to unlock the survey.`}
              </p>
            </div>
            
            {/* Reflection input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Reflection (optional):
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                rows="3"
                placeholder="Add any thoughts or reflections about this habit..."
              ></textarea>
            </div>
            
            {/* Previous completions */}
            {selectedHabit.completionInstances?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Previous completions:</h4>
                <div className="max-h-32 overflow-y-auto">
                  {selectedHabit.completionInstances.map((instance, idx) => (
                    <div key={idx} className="text-xs p-2 bg-gray-50 mb-1 rounded">
                      <div className="flex justify-between">
                        <span>{new Date(instance.timestamp).toLocaleDateString()}</span>
                        <span className="text-gray-500">{instance.userName}</span>
                      </div>
                      {instance.notes && <p className="mt-1 text-gray-600">{instance.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Log habit button - centered and prominent */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (selectedHabit) {
                    recordHabitInstance(selectedHabit.id, reflection);
                    setShowHabitDetail(null);
                  }
                }}
                className="px-6 py-3 bg-black text-white rounded-lg text-lg flex items-center font-medium"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Log Habit Completion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add new habit modal */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Add New Habit</h3>
              <button 
                onClick={() => setShowAddHabit(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Allie will help you create a new atomic habit following these principles:
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Make It Small</h4>
                  <p className="text-sm text-gray-600">Your habit will be tiny and easy to do in under 2 minutes</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Make It Obvious</h4>
                  <p className="text-sm text-gray-600">Allie will create a clear cue to trigger your habit</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Make It Satisfying</h4>
                  <p className="text-sm text-gray-600">Your habit will include immediate rewards</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mr-3 flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Focus on Identity</h4>
                  <p className="text-sm text-gray-600">Connect your habit to who you want to become</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={createNewHabit}
              className="w-full px-4 py-2 bg-black text-white rounded-lg flex items-center justify-center"
              disabled={allieIsThinking}
            >
              {allieIsThinking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Create New Habit
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Create new task modal */}
      {showCreateTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Create New Task</h3>
              <button 
                onClick={() => setShowCreateTaskForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Task Title*
                </label>
                <input
                  type="text"
                  value={newTaskFormData.title}
                  onChange={(e) => setNewTaskFormData({...newTaskFormData, title: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                  placeholder="Enter task title"
                  required
                />
              </div>
              
              {/* Task Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Description
                </label>
                <textarea
                  value={newTaskFormData.description}
                  onChange={(e) => setNewTaskFormData({...newTaskFormData, description: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                  rows="2"
                  placeholder="Describe the task"
                />
              </div>
              
              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Assigned To
                </label>
                <select
                  value={newTaskFormData.assignedTo}
                  onChange={(e) => setNewTaskFormData({...newTaskFormData, assignedTo: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="">Select a person</option>
                  {familyMembers.filter(m => m.role === 'parent').map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Priority and Category in one row */}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Priority
                  </label>
                  <select
                    value={newTaskFormData.priority}
                    onChange={(e) => setNewTaskFormData({...newTaskFormData, priority: e.target.value})}
                    className="w-full border rounded-md p-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Category
                  </label>
                  <select
                    value={newTaskFormData.category}
                    onChange={(e) => setNewTaskFormData({...newTaskFormData, category: e.target.value})}
                    className="w-full border rounded-md p-2 text-sm"
                  >
                    <option value="">Select category</option>
                    <option value="Visible Household Tasks">Visible Household Tasks</option>
                    <option value="Invisible Household Tasks">Invisible Household Tasks</option>
                    <option value="Visible Parental Tasks">Visible Parental Tasks</option>
                    <option value="Invisible Parental Tasks">Invisible Parental Tasks</option>
                  </select>
                </div>
              </div>
              
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskFormData.dueDate}
                  onChange={(e) => setNewTaskFormData({...newTaskFormData, dueDate: e.target.value})}
                  className="w-full border rounded-md p-2 text-sm"
                />
              </div>
              
              {/* Subtasks */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Subtasks
                </label>
                <div className="space-y-2">
                  {newTaskFormData.subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center">
                      <input
                        type="text"
                        value={subtask}
                        onChange={(e) => {
                          const updatedSubtasks = [...newTaskFormData.subtasks];
                          updatedSubtasks[idx] = e.target.value;
                          setNewTaskFormData({...newTaskFormData, subtasks: updatedSubtasks});
                        }}
                        className="flex-1 border rounded-md p-2 text-sm"
                        placeholder={`Subtask ${idx + 1}`}
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSubtasks = [...newTaskFormData.subtasks];
                          updatedSubtasks.splice(idx, 1);
                          setNewTaskFormData({...newTaskFormData, subtasks: updatedSubtasks});
                        }}
                        className="ml-2 text-red-500 p-1 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskFormData({
                        ...newTaskFormData, 
                        subtasks: [...newTaskFormData.subtasks, '']
                      });
                    }}
                    className="text-sm flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Subtask
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateTaskForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={createNewTask}
                className="px-4 py-2 bg-black text-white rounded-md flex items-center"
                disabled={isProcessing || !newTaskFormData.title}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Calendar floating widget */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <EnhancedEventManager
              initialEvent={existingDueDateEvent || {
                title: `Cycle ${currentWeek} Due Date`,
                description: `Due date for completing Cycle ${currentWeek} activities including surveys and tasks.`,
                dateTime: datePickerDate instanceof Date && !isNaN(datePickerDate.getTime()) 
                  ? datePickerDate.toISOString() 
                  : new Date().toISOString(),
                category: 'cycle-due-date',
                eventType: 'cycle-due-date',
                cycleNumber: currentWeek
              }}
              onSave={async (event) => {
                try {
                  // Extract and validate the date from the event
                  let newDate;
                  
                  if (event.start?.dateTime) {
                    newDate = new Date(event.start.dateTime);
                  } else if (event.dateTime) {
                    newDate = new Date(event.dateTime);
                  } else {
                    // Fallback to current date if no date is found
                    newDate = new Date();
                    console.warn("No date found in event, using current date");
                  }
                  
                  // Ensure the date is valid
                  if (isNaN(newDate.getTime())) {
                    console.error("Invalid date from event:", event);
                    createCelebration("Error", false, "Invalid date. Please try again with a valid date.");
                    return;
                  }
                  
                  const success = await updateCycleDueDate(newDate, {
                    title: event.title || event.summary,
                    description: event.description,
                    location: event.location,
                    eventId: existingDueDateEvent?.firestoreId || existingDueDateEvent?.id
                  });
                  
                  if (success) {
                    // Force refresh of calendar components
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
                    }
                    setShowCalendar(false);
                  }
                } catch (error) {
                  console.error("Error in calendar save handler:", error);
                  createCelebration("Error", false, "Failed to update due date. Please try again.");
                }
              }}
              onCancel={() => setShowCalendar(false)}
              eventType="cycle-due-date"
              selectedDate={datePickerDate instanceof Date && !isNaN(datePickerDate.getTime()) 
                ? datePickerDate 
                : new Date()}
              isCompact={false}
              mode={existingDueDateEvent ? "edit" : "create"}
            />
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        .animation-bounce-in {
          animation: bounceIn 0.5s;
        }
        
        @keyframes bounceIn {
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default EnhancedTasksTab;