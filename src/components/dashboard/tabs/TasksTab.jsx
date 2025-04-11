// src/components/dashboard/tabs/TasksTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, X, Plus, Award, Flame, 
  Zap, Info, ChevronDown, ChevronUp, MessageSquare,
  Check, RefreshCw, Edit, Trash, Clock
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DatabaseService from '../../../services/DatabaseService';
import AllieAIService from '../../../services/AllieAIService';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import confetti from 'canvas-confetti';
import { EventManager as EnhancedEventManager, FloatingCalendar } from '../../../components/calendar';

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

const TasksTab = ({ onStartWeeklyCheckIn, onOpenFamilyMeeting }) => {
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
    surveySchedule
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
              completionInstances: completionInstances
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
  
  // Update cycle due date with calendar integration
  const updateCycleDueDate = async (newDate) => {
    if (!familyId) return false;
    
    try {
      // Format the date for display
      const formattedDate = newDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      // Update survey schedule in database
      await updateSurveySchedule(currentWeek, newDate);
      
      // Update the UI
      createCelebration(`Cycle ${currentWeek} due date updated to ${formattedDate}`, false);
      
      return true;
    } catch (error) {
      console.error("Error updating cycle due date:", error);
      createCelebration("Error", false, "Failed to update due date. Please try again.");
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
  
  // Record a new habit completion instance
const recordHabitInstance = async (habitId) => {
  if (!familyId || !selectedUser) return;
  
  try {
    setIsProcessing(true);
    
    // Create the new instance data
    const newInstance = {
      timestamp: new Date().toISOString(),
      userId: selectedUser.id,
      userName: selectedUser.name,
      notes: ""
    };
    
    // Get current instances
    const currentInstances = completedHabitInstances[habitId] || [];
    const updatedInstances = [...currentInstances, newInstance];
    
    // Update habit instances in database
    await updateDoc(doc(db, "families", familyId, "habitInstances", habitId), {
      instances: updatedInstances
    }, { merge: true });
    
    // Update local state
    setCompletedHabitInstances(prev => ({
      ...prev,
      [habitId]: updatedInstances
    }));
    
    // Update the tracking count
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      // Update the habit with new instance
      const updatedHabits = habits.map(h => {
        if (h.id === habitId) {
          return {
            ...h,
            completionInstances: updatedInstances,
            lastCompleted: newInstance.timestamp
          };
        }
        return h;
      });
      
      setHabits(updatedHabits);
      
      // Create celebration
      createCelebration(habit.title, true);
      
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
    
    setIsProcessing(false);
    return true;
  } catch (error) {
    console.error("Error recording habit instance:", error);
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
  
  // Create new habit
  // Create new habit
const createNewHabit = async (isRefresh = false) => {
  try {
    setAllieIsThinking(true);
    
    // Default habit parts - we'll use these directly for simplicity
    const title = "Family Calendar Check-in";
    const description = "Take a moment each day to review the family calendar";
    const cue = "After breakfast";
    const action = "Check the family calendar for today's events";
    const reward = "Feel organized and prepared for the day";
    const identity = "I am someone who stays on top of family commitments";
    
    try {
      // Create the habit subtasks
      const subTasks = [
        { title: cue, description: "This is your trigger" },
        { title: action, description: "This is the habit action" },
        { title: reward, description: "This is your reward" }
      ];
      
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
      
      // Create the new habit with the ID
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
        
        // Try to extract parts from the response
        if (response && typeof response === 'string') {
          // Look for pipe-separated format in the response
          const pipeRegex = /(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/;
          const matches = response.match(pipeRegex);
          
          if (matches && matches.length >= 7) {
            // Use extracted parts
            parts = [
              matches[1].trim(),
              matches[2].trim(),
              matches[3].trim(),
              matches[4].trim(),
              matches[5].trim(),
              matches[6].trim()
            ];
          } else {
            // Try alternative format with newlines or sections
            const lines = response.split(/\n+/).filter(line => line.trim().length > 0);
            
            if (lines.length >= 6) {
              // Use first 6 lines as parts
              parts = lines.slice(0, 6).map(line => {
                // Remove labels like "Title:" if present
                return line.replace(/^(Title|Description|Cue|Action|Reward|Identity)[:;]\s*/i, '').trim();
              });
            }
          }
        }
      } catch (aiError) {
        console.error("AI error in habit creation:", aiError);
        // Continue with default parts
      }
      
      const [title, description, cue, action, reward, identity] = parts;
      
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
        
        // Create the new habit with the ID
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
          {/* Step 1 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
              cycleStep >= 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className="text-xs mt-2 text-center">
              <div className="font-medium">STEP 1</div>
              <div>Habit Building</div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
              cycleStep >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <div className="text-xs mt-2 text-center">
              <div className="font-medium">STEP 2</div>
              <div>Family Survey</div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
              cycleStep >= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <div className="text-xs mt-2 text-center">
              <div className="font-medium">STEP 3</div>
              <div>Family Meeting</div>
            </div>
          </div>
          
          {/* Progress line */}
          <div className="absolute left-0 top-5 h-0.5 bg-gray-200 w-full -z-0"></div>
          <div 
            className="absolute left-0 top-5 h-0.5 bg-black w-full -z-0 transition-transform duration-500" 
            style={{ 
              transform: `scaleX(${(cycleStep - 1) / 2})`,
              transformOrigin: 'left'
            }}
          ></div>
        </div>
        
        {/* Family Member Progress */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayedMembers.map(member => {
            const progress = memberProgress[member.id] || { step: 1, completedSurvey: false };
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
                    progress.step > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
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
            onClick={() => {
              // Set default date
              const today = new Date();
              const defaultDate = surveyDue || new Date(today.setDate(today.getDate() + 7));
              setDatePickerDate(defaultDate);
              setShowCalendar(true);
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
              Get personalized advice from Allie on how to build lasting habits
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
      
      {/* Simplified habit detail/log modal */}
{showHabitDetail && selectedHabit && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
    <div className="bg-white rounded-lg max-w-md w-full p-6">
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
      
      {/* Log habit button - centered and prominent */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            setShowHabitDetail(null);
            if (selectedHabit) {
              recordHabitInstance(selectedHabit.id);
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
      
      {/* Calendar floating widget with embedded event editor */}
      {showCalendar && (
        <FloatingCalendar
          onClose={() => setShowCalendar(false)}
          selectedDate={datePickerDate}
          embeddedComponent={
            <EnhancedEventManager
              initialEvent={{
                title: `Cycle ${currentWeek} Due Date`,
                description: `Due date for completing Cycle ${currentWeek} activities including surveys and tasks.`,
                dateTime: datePickerDate ? datePickerDate.toISOString() : new Date().toISOString(),
                category: 'cycle-due-date',
                eventType: 'cycle-due-date',
                cycleNumber: currentWeek
              }}
              onSave={async (event) => {
                setShowCalendar(false);
                const newDate = new Date(event.dateTime);
                const success = await updateCycleDueDate(newDate);
                if (success) {
                  // Update the UI with new date
                  setSurveyDue(newDate);
                  calculateNextSurveyDue();
                }
              }}
              onCancel={() => setShowCalendar(false)}
              eventType="cycle-due-date"
              selectedDate={datePickerDate}
              isCompact={true}
              mode="create"
            />
          }
        />
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

export default TasksTab;