import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, CheckCircle, X, Plus, Award, Flame, 
  Zap, Star, ArrowRight, MessageSquare, Clock, 
  Heart, ArrowUp, Camera, Share2, Upload, Check,
  Info, ChevronDown, ChevronUp, Edit, AlertCircle,
  User, Settings
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DatabaseService from '../../../services/DatabaseService';
import AllieAIService from '../../../services/AllieAIService';
import CalendarService from '../../../services/CalendarService';
import { useAuth } from '../../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { doc, collection, addDoc, getDocs, query, where, updateDoc, increment, serverTimestamp, getDoc, setDoc  } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import confetti from 'canvas-confetti';

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
    loadCurrentWeekTasks,
    getWeekHistoryData,
    getWeekStatus,
    surveySchedule
  } = useFamily();
  
  const { currentUser } = useAuth();

  // Main states
  const [habits, setHabits] = useState([]);
  const [kidHabits, setKidHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMeetingReminder, setShowMeetingReminder] = useState(false);
  const [showHabitDetail, setShowHabitDetail] = useState(null);
  const [reflection, setReflection] = useState('');
  const [streaks, setStreaks] = useState({});
  const [celebrations, setCelebrations] = useState([]);
  const [showAllieCoaching, setShowAllieCoaching] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraImage, setCameraImage] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [habitStackVisible, setHabitStackVisible] = useState(false);
  const [showKidSection, setShowKidSection] = useState(true);
  const [allieInputValue, setAllieInputValue] = useState('');
  const [surveyDue, setSurveyDue] = useState(null);
  const [daysUntilSurvey, setDaysUntilSurvey] = useState(null);
  const [allieIsThinking, setAllieIsThinking] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [weekStatus, setWeekStatus] = useState({});
  const [canScheduleMeeting, setCanScheduleMeeting] = useState(false);
  const [meetingRequirements, setMeetingRequirements] = useState({
    tasksCompleted: false,
    surveysCompleted: false,
    relationshipCheckinCompleted: false
  });
  
  // Dates for weekly rhythm
  const [weekProgress, setWeekProgress] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(7);
  
  // Family streaks
  const [familyStreak, setFamilyStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // Video ref for camera
  const videoRef = useRef(null);
  
  // Check if family meeting can be scheduled
  useEffect(() => {
    if (!familyId || !currentWeek) return;
    
    const checkMeetingRequirements = async () => {
      try {
        // Get week status
        const status = await getWeekStatus(currentWeek);
        setWeekStatus(status);
        
        // Check task completion
        const tasks = habits.concat(kidHabits);
        const tasksCompleted = tasks.every(t => t.completed);
        
        // Check survey completion
        const surveysCompleted = status.surveysCompleted || false;
        
        // Check relationship check-in completion
        const relationshipCheckinCompleted = status.relationshipCheckinCompleted || false;
        
        // Update requirements
        setMeetingRequirements({
          tasksCompleted,
          surveysCompleted,
          relationshipCheckinCompleted
        });
        
        // Determine if meeting can be scheduled
        // For more flexibility, allow scheduling if any ONE requirement is met
        setCanScheduleMeeting(tasksCompleted || surveysCompleted || relationshipCheckinCompleted);
      } catch (error) {
        console.error("Error checking meeting requirements:", error);
      }
    };
    
    checkMeetingRequirements();
  }, [familyId, currentWeek, habits, kidHabits, getWeekStatus]);

  // Enhanced triggerAllieChat function
const triggerAllieChat = (message) => {
  // Log the attempt
  console.log("Attempting to trigger Allie chat with message:", message);
  
  // Set the message in state
  setAllieInputValue(message);
  
  // First try to find the global chat button element
  const chatButton = document.getElementById('chat-button');
  if (!chatButton) {
    console.warn("Chat button with ID 'chat-button' not found in the DOM");
    createCelebration("Chat not available", false, "Please try again in a moment");
    return;
  }
  
  // Check if chat is already open
  let chatContainer = document.querySelector('.bg-white.shadow-xl.rounded-t-lg');
  let isOpen = chatContainer !== null;
  
  const processChat = () => {
    // Set timeout to allow DOM to update
    setTimeout(() => {
      // Find the textarea input in the chat with more robust selectors
      const chatInput = document.querySelector('textarea[placeholder*="Message Allie"]') || 
                       document.querySelector('textarea.w-full.border.rounded-l-md');
                       
      if (chatInput) {
        console.log("Chat input found, setting message");
        
        // Set the value 
        chatInput.value = message;
        
        // Properly trigger input events for React state to update
        const inputEvent = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        
        // Also trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        chatInput.dispatchEvent(changeEvent);
        
        // Force React to update the state by focusing and then typing a space
        chatInput.focus();
        
        // Wait a short time for React to update
        setTimeout(() => {
          // Find and click the send button with more robust selectors
          const sendButton = document.querySelector('button[title="Send message"]') || 
                            document.querySelector('button.bg-blue-600.text-white.p-3.rounded-r-md');
                            
          if (sendButton) {
            console.log("Clicking send button");
            sendButton.click();
          } else {
            console.warn("Send button not found, trying alternative approach");
            
            // Try alternative - simulate Enter key
            const keyEvent = new KeyboardEvent('keypress', {
              key: 'Enter',
              code: 'Enter',
              which: 13,
              keyCode: 13,
              bubbles: true
            });
            chatInput.dispatchEvent(keyEvent);
          }
        }, 100);
      } else {
        console.warn("Chat input not found after timeout");
        createCelebration("Chat input not found", false, "Please try opening chat manually");
      }
    }, 300);
  };
  
  // If chat is not open, click to open it first
  if (!isOpen) {
    // Find the button inside the chat-button container
    const buttons = chatButton.querySelectorAll('button');
    const divs = chatButton.querySelectorAll('div');
    
    // Try to find the right element to click
    let elementToClick = null;
    
    if (buttons.length > 0) {
      elementToClick = buttons[0];
    } else if (divs.length > 0) {
      // If no button, try to find a clickable div
      for (const div of divs) {
        if (div.className.includes('cursor-pointer') || 
            window.getComputedStyle(div).cursor === 'pointer') {
          elementToClick = div;
          break;
        }
      }
    }
    
    if (elementToClick) {
      console.log("Clicking to open chat");
      elementToClick.click();
      
      // Wait for chat to open then process
      setTimeout(() => {
        processChat();
      }, 500);
    } else {
      console.warn("No clickable element found in chat button");
      createCelebration("Chat button not clickable", false, "Please open chat manually");
    }
  } else {
    // Chat is already open, proceed with filling it
    processChat();
  }
};

  // Load habits for the current week
  useEffect(() => {
    const loadHabits = async () => {
      try {
        setLoading(true);
        console.log(`Loading habits for Week ${currentWeek}, user:`, selectedUser?.name);
        
        if (familyId) {
          // Load tasks from database
          const tasks = await loadCurrentWeekTasks();
          
          // Separate kid and adult habits
          const adultHabits = [];
          const childHabits = [];
          
          // Check for streak data in database
          const streakData = await loadStreakData();
          
          // Transform tasks into habit format
          await Promise.all(tasks.map(async (task) => {
            // Skip tasks that are not for the current user
            const isForSelectedUser = 
              task.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
              task.assignedToName === selectedUser?.name ||
              task.assignedTo === "Everyone";
              
            // Check if this is a kid-focused habit
            const isKidHabit = 
              task.category === 'Kid Helper' || 
              task.title && task.title.includes('Kid') || 
              task.title && task.title.includes('Child');
              
            if (!isForSelectedUser && !isKidHabit) {
              return;
            }
            
            // Get streak data for this habit
            const streak = streakData[task.id] || 0;
            const record = streakData[`${task.id}_record`] || streak;
            
            // Calculate progress based on subtasks
            const completedSubtasks = task.subTasks?.filter(st => st.completed)?.length || 0;
            const totalSubtasks = task.subTasks?.length || 1;
            const progress = task.completed ? 100 : Math.round((completedSubtasks / totalSubtasks) * 100);
            
            // Clean up insight text if it contains undefined variables
            let insightText = task.insight || task.aiInsight || "";
            if (insightText.includes("undefined%")) {
              // Replace with generic insight
              insightText = `This task was selected based on survey analysis from Week ${currentWeek}.`;
            }
            
            // Create the habit object
            const habitObj = {
              id: task.id,
              title: task.title ? task.title.replace(/Week \d+: /g, '') : "Task",
              description: task.description ? task.description.replace(/for this week/g, 'consistently') : "Description unavailable",
              cue: task.subTasks?.[0]?.title || "After breakfast",
              action: task.subTasks?.[1]?.title || task.title || "Complete task",
              reward: task.subTasks?.[2]?.title || "Feel accomplished and balanced",
              identity: task.focusArea 
                ? `I am someone who values ${task.focusArea.toLowerCase()}` 
                : "I am someone who values family balance",
              trackDays: Array(7).fill(false),
              assignedTo: task.assignedTo,
              assignedToName: task.assignedToName,
              category: task.category,
              insight: insightText,
              completed: task.completed,
              comments: task.comments || [],
              streak: streak,
              record: record,
              progress: progress,
              imageUrl: task.imageUrl || null,
              lastCompleted: task.completedDate || null,
              isPartOfStack: task.stackTrigger !== undefined,
              stackTrigger: task.stackTrigger || null,
              atomicSteps: task.subTasks?.map(st => ({
                id: st.id,
                title: st.title,
                description: st.description,
                completed: st.completed || false
              })) || []
            };
            
            if (isKidHabit) {
              childHabits.push(habitObj);
            } else {
              adultHabits.push(habitObj);
            }
          }));
          
          // Sort adult habits - completed at the bottom
          adultHabits.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            return 0;
          });
          
          // Sort kid habits - simpler ones first
          childHabits.sort((a, b) => {
            return (a.atomicSteps?.length || 0) - (b.atomicSteps?.length || 0);
          });
          
          setHabits(adultHabits);
          setKidHabits(childHabits);
          
          // Setup weekly progress based on current date
          calculateWeekProgress();
          
          // Load family streaks
          loadFamilyStreaks();
          
          // Calculate when the next survey is due
          calculateNextSurveyDue();
          
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading habits:", error);
        setHabits([]);
        setKidHabits([]);
        setLoading(false);
      }
    };
    
    loadHabits();
  }, [familyId, currentWeek, selectedUser]);
  
  // Load streak data from database
  const loadStreakData = async () => {
    try {
      if (!familyId) return {};
      
      // Query streaks collection 
      const streaksRef = collection(db, "families", familyId, "habitStreaks");
      const streaksSnapshot = await getDocs(streaksRef);
      
      const streakData = {};
      
      streaksSnapshot.forEach((doc) => {
        const data = doc.data();
        const habitId = doc.id.split('_')[0]; // Remove any suffix
        
        if (doc.id.includes('_record')) {
          streakData[doc.id] = data.value || 0;
        } else {
          streakData[habitId] = data.currentStreak || 0;
        }
      });
      
      return streakData;
    } catch (error) {
      console.error("Error loading streak data:", error);
      return {};
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
  
  // Calculate week progress
  const calculateWeekProgress = () => {
    const now = new Date();
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    
    const totalDays = 7;
    const daysPassed = Math.min(now.getDay() + 1, 7);
    const daysLeft = totalDays - daysPassed;
    
    setWeekProgress(Math.round((daysPassed / totalDays) * 100));
    setDaysRemaining(daysLeft);
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
    
    // Create or update calendar event
    const eventTitle = `Family Cycle ${currentWeek} Due`;
    
    // Check if event already exists
    const existingEvents = await CalendarService.getEventsForUser(
      selectedUser.id,
      new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
      new Date(new Date().setDate(new Date().getDate() + 60))  // 60 days ahead
    );
    
    // Find existing cycle due date event
    const existingEvent = existingEvents.find(e => 
      (e.summary === eventTitle || e.title === eventTitle) && 
      e.familyId === familyId
    );
    
    if (existingEvent) {
      // Update existing event
      const updatedEvent = {
        ...existingEvent,
        start: {
          dateTime: newDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      await CalendarService.updateEvent(existingEvent.id, updatedEvent, selectedUser.id);
    } else {
      // Create new event
      const event = {
        summary: eventTitle,
        description: `Due date for completing Cycle ${currentWeek} activities including surveys and tasks.`,
        start: {
          dateTime: newDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 60 }    // 1 hour before
          ]
        },
        // Add metadata
        familyId: familyId,
        cycleNumber: currentWeek,
        eventType: 'cycle-due-date'
      };
      
      await CalendarService.addEvent(event, selectedUser.id);
    }
    
    // Show success message
    createCelebration(`Cycle ${currentWeek} due date updated to ${formattedDate}`, false);
    
    // Update progress calculation
    calculateWeekProgress();
    
    return true;
  } catch (error) {
    console.error("Error updating cycle due date:", error);
    createCelebration("Error", false, "Failed to update due date. Please try again.");
    return false;
  }
};



  // Handle marking a habit as complete
  const completeHabit = async (habitId) => {
    if (!selectedUser || !familyId) return;
    
    try {
      // Find the habit
      const habitIndex = habits.findIndex(h => h.id === habitId);
      if (habitIndex === -1) return;
      
      const habit = habits[habitIndex];
      
      // Update the habit locally first
      const updatedHabits = [...habits];
      
      // Calculate new streak
      const lastCompletedDays = habit.lastCompleted ? daysSince(habit.lastCompleted) : null;
      const isStreak = lastCompletedDays === 1 || lastCompletedDays === null; // First completion or consecutive day
      
      const newStreak = isStreak ? habit.streak + 1 : 1;
      const newRecord = Math.max(newStreak, habit.record || 0);
      
      updatedHabits[habitIndex] = {
        ...habit,
        completed: true,
        progress: 100,
        lastCompleted: new Date().toISOString(),
        streak: newStreak,
        record: newRecord
      };
      
      setHabits(updatedHabits);
      
      // Complete all atomic steps (subtasks)
      if (habit.atomicSteps && habit.atomicSteps.length > 0) {
        const completeSubtaskPromises = habit.atomicSteps.map(step => 
          updateSubtaskCompletion(habitId, step.id, true)
        );
        
        try {
          await Promise.all(completeSubtaskPromises);
        } catch (error) {
          console.error("Error completing subtasks:", error);
        }
      }
      
      // Create a celebration
      createCelebration(habit.title);
      
      // Launch confetti!
      launchConfetti();
      
      // Save to database - reuse existing functionality
      await updateTaskCompletion(habitId, true);
      
      // Update streaks in the database
      await updateStreakInDatabase(habitId, newStreak, newRecord);
      
      // Update family streak if appropriate
      if (isStreak) {
        await updateFamilyStreak(familyStreak + 1);
      } else {
        await updateFamilyStreak(1); // Reset to 1
      }
      
      // Open reflection dialog
      setSelectedHabit(habit);
      setShowHabitDetail(habitId);
    } catch (error) {
      console.error("Error completing habit:", error);
    }
  };
  
  // Handle completing a kid habit
  const completeKidHabit = async (habitId) => {
    if (!familyId) return;
    
    try {
      // Find the habit
      const habitIndex = kidHabits.findIndex(h => h.id === habitId);
      if (habitIndex === -1) return;
      
      const habit = kidHabits[habitIndex];
      
      // Update the habit locally first
      const updatedHabits = [...kidHabits];
      
      // Calculate new streak
      const lastCompletedDays = habit.lastCompleted ? daysSince(habit.lastCompleted) : null;
      const isStreak = lastCompletedDays === 1 || lastCompletedDays === null; // First completion or consecutive day
      
      const newStreak = isStreak ? habit.streak + 1 : 1;
      const newRecord = Math.max(newStreak, habit.record || 0);
      
      updatedHabits[habitIndex] = {
        ...habit,
        completed: true,
        progress: 100,
        lastCompleted: new Date().toISOString(),
        streak: newStreak,
        record: newRecord
      };
      
      setKidHabits(updatedHabits);
      
      // Complete all atomic steps (subtasks)
      if (habit.atomicSteps && habit.atomicSteps.length > 0) {
        const completeSubtaskPromises = habit.atomicSteps.map(step => 
          updateSubtaskCompletion(habitId, step.id, true)
        );
        
        try {
          await Promise.all(completeSubtaskPromises);
        } catch (error) {
          console.error("Error completing subtasks:", error);
        }
      }
      
      // Create a more kid-friendly celebration
      createCelebration(habit.title, true);
      
      // Launch extra fun confetti for kids!
      launchConfetti(true);
      
      // Save to database - reuse existing functionality
      await updateTaskCompletion(habitId, true);
      
      // Update streaks in the database
      await updateStreakInDatabase(habitId, newStreak, newRecord);
      
      // Update family streak
      if (isStreak) {
        await updateFamilyStreak(familyStreak + 1);
      } else {
        await updateFamilyStreak(1); // Reset to 1
      }
    } catch (error) {
      console.error("Error completing kid habit:", error);
    }
  };
  
  // Update streak in database
  const updateStreakInDatabase = async (habitId, newStreak, newRecord) => {
    try {
      // First, update streak document
      const streakRef = doc(db, "families", familyId, "habitStreaks", habitId);
      try {
        await updateDoc(streakRef, {
          currentStreak: newStreak,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        // If document doesn't exist, create it
        await setDoc(streakRef, {
          currentStreak: newStreak,
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Then, update record if this is a new record
      const recordRef = doc(db, "families", familyId, "habitStreaks", `${habitId}_record`);
      try {
        await updateDoc(recordRef, {
          value: newRecord,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        // If document doesn't exist, create it
        await setDoc(recordRef, {
          value: newRecord,
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Update local streaks state
      setStreaks(prev => ({
        ...prev,
        [habitId]: newStreak,
        [`${habitId}_record`]: newRecord
      }));
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };
  
  // Update family streak
  const updateFamilyStreak = async (newStreak) => {
    try {
      const newRecord = Math.max(newStreak, longestStreak);
      
      // Update family document
      const familyRef = doc(db, "families", familyId);
      await updateDoc(familyRef, {
        currentStreak: newStreak,
        longestStreak: newRecord,
        totalCompletions: increment(1)
      });
      
      // Update local state
      setFamilyStreak(newStreak);
      setLongestStreak(newRecord);
    } catch (error) {
      console.error("Error updating family streak:", error);
    }
  };
  
  // Create a celebration notification
  const createCelebration = (habitTitle, isKid = false, customMessage = null) => {
    const newCelebration = {
      id: Date.now(),
      title: habitTitle,
      message: customMessage || generateCelebrationMessage(habitTitle, isKid),
      isKid,
      timestamp: new Date().toISOString()
    };
    
    setCelebrations(prev => [newCelebration, ...prev]);
    
    // Remove celebration after 5 seconds
    setTimeout(() => {
      setCelebrations(prev => prev.filter(c => c.id !== newCelebration.id));
    }, 5000);
  };
  
  // Generate a random celebration message
  const generateCelebrationMessage = (title, isKid = false) => {
    if (isKid) {
      const kidMessages = [
        `Awesome job with ${title}! You're becoming a super helper!`,
        `Wow! You're amazing at ${title}! Keep it up!`,
        `You're a star! ${title} completed! That helps your family so much!`,
        `High five! You're building a great habit with ${title}!`,
        `You rock! That's ${familyStreak + 1} days of being an awesome helper!`
      ];
      
      return kidMessages[Math.floor(Math.random() * kidMessages.length)];
    }
    
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
  const launchConfetti = (isKid = false) => {
    if (isKid) {
      // More colorful confetti for kids
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF']
      });
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
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
      createCelebration("Reflection Saved", false);
    } catch (error) {
      console.error("Error saving reflection:", error);
    }
  };
  
  // Handle photo upload for habit completion
  const handlePhotoUpload = async (file) => {
    if (!file || !selectedHabit) return;
    
    try {
      setPhotoUploadProgress(10);
      
      // Create a storage reference
      const storageRef = ref(storage, `habits/${familyId}/${selectedHabit.id}/${Date.now()}`);
      
      // Simulating progress
      const progressInterval = setInterval(() => {
        setPhotoUploadProgress(prev => Math.min(prev + 20, 90));
      }, 500);
      
      // Upload to Firebase Storage
      const uploadTask = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      clearInterval(progressInterval);
      setPhotoUploadProgress(100);
      
      // Update habit with image URL
      const updatedHabits = habits.map(h => {
        if (h.id === selectedHabit.id) {
          return {
            ...h,
            imageUrl: downloadURL
          };
        }
        return h;
      });
      
      setHabits(updatedHabits);
      setCameraImage(null);
      
      // Also update in database - creating a task comment with the image URL
      await addTaskComment(selectedHabit.id, `[IMAGE] ${downloadURL}`);
      
      // Reset progress after a delay
      setTimeout(() => {
        setPhotoUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error("Error uploading photo:", error);
      setPhotoUploadProgress(0);
    }
  };
  
  // Handle camera capture for habit completion
  const handleCameraCapture = () => {
    if (!navigator.mediaDevices) {
      alert("Camera access is not supported in your browser");
      return;
    }
    
    setShowCamera(true);
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      })
      .catch(err => {
        console.error("Error accessing camera:", err);
        setShowCamera(false);
      });
  };
  
  // Take a photo from camera
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    if (!video) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob(blob => {
      setCameraImage(blob);
      
      // Stop the camera stream
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      
      setShowCamera(false);
      
      // Upload the photo
      handlePhotoUpload(blob);
    }, 'image/jpeg');
  };
  
  // Prepare habit schedule details
  const prepareHabitSchedule = (habit) => {
    if (!habit || !selectedUser) return;
    
    try {
      // Calculate a good time for this habit based on cue
      const timeMap = {
        "After breakfast": "08:00",
        "Before lunch": "11:30",
        "After lunch": "13:30",
        "Before dinner": "17:00",
        "After dinner": "19:30",
        "Before bed": "21:00"
      };
      
      const cue = habit.cue || habit.stackTrigger || "After breakfast";
      const defaultTime = timeMap[cue] || "09:00";
      
      // Create a date for today at the default time
      const startTime = new Date();
      const [hours, minutes] = defaultTime.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Create the schedule details
      const details = {
        habit: habit,
        startTime: startTime,
        endTime: new Date(startTime.getTime() + 30 * 60000),
        recurrence: '21', // Default: repeat for 21 days
        reminderMinutes: 10 // Default: 10 minutes before
      };
      
      // Show schedule confirmation dialog
      setScheduleDetails(details);
      setShowScheduleConfirm(true);
    } catch (error) {
      console.error("Error preparing habit schedule:", error);
      createCelebration("Schedule Error", false, "There was an error scheduling this habit. Please try again.");
    }
  };
  
// Edit existing habit schedule
const editHabitSchedule = async (habit) => {
  if (!habit || !selectedUser) return;
  
  try {
    // Check if we have an event ID to edit
    if (!habit.scheduledEventId) {
      prepareHabitSchedule(habit);
      return;
    }
    
    // Try to get the event details from the calendar
    const eventsQuery = query(
      collection(db, "calendar_events"),
      where("id", "==", habit.scheduledEventId)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    
    if (querySnapshot.empty) {
      // If event not found, start fresh
      prepareHabitSchedule(habit);
      return;
    }
    
    // Get the existing event
    const eventDoc = querySnapshot.docs[0];
    const eventData = eventDoc.data();
    
    // Parse the start time
    let startTime = new Date();
    if (eventData.start && eventData.start.dateTime) {
      startTime = new Date(eventData.start.dateTime);
    } else if (habit.scheduledTime) {
      startTime = new Date(habit.scheduledTime);
    }
    
    // Calculate end time (30 min after start)
    const endTime = new Date(startTime.getTime() + 30 * 60000);
    
    // Setup schedule details with existing values
    const details = {
      habit: habit,
      startTime: startTime,
      endTime: endTime,
      recurrence: habit.scheduledRecurrence || 21,
      reminderMinutes: 10
    };
    
    // Show schedule confirmation dialog with pre-filled values
    setScheduleDetails(details);
    setShowScheduleConfirm(true);
  } catch (error) {
    console.error("Error editing habit schedule:", error);
    createCelebration("Schedule Error", false, "There was an error editing this habit's schedule. Please try again.");
  }
};


  // Enhanced function to confirm schedule to calendar
const confirmScheduleToCalendar = async () => {
  if (!scheduleDetails || !selectedUser) return;
  
  try {
    const habit = scheduleDetails.habit;
    
    // Create an event to repeat daily with proper recurrence
    const event = {
      summary: `Habit: ${habit.title}`,
      description: `${habit.description}\n\nCue: ${habit.cue || habit.stackTrigger || "After breakfast"}\nAction: ${habit.action}\nReward: ${habit.reward}`,
      start: {
        dateTime: scheduleDetails.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: scheduleDetails.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      recurrence: [`RRULE:FREQ=DAILY;COUNT=${scheduleDetails.recurrence}`], // Repeat for specified days
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: scheduleDetails.reminderMinutes }
        ]
      },
      // Add metadata for Allie
      taskId: habit.id,
      familyId: familyId,
      eventType: 'habit',
      isRecurring: true
    };
    
    // Add to calendar
    const result = await CalendarService.addEvent(event, selectedUser.id);
    
    if (result.success) {
      // Update habit state to show as scheduled
      const updatedHabits = habits.map(h => {
        if (h.id === habit.id) {
          return {
            ...h,
            isScheduled: true,
            scheduledEventId: result.eventId,
            scheduledTime: scheduleDetails.startTime.toISOString(),
            scheduledRecurrence: scheduleDetails.recurrence
          };
        }
        return h;
      });
      
      setHabits(updatedHabits);
      
      // Save the scheduled state to database
      await DatabaseService.saveFamilyData(
        { tasks: updatedHabits.filter(h => h.id === habit.id) }, 
        familyId
      );
      
      // Create a comment in the habit about scheduling
      await addTaskComment(
        habit.id, 
        `I've scheduled this habit for ${scheduleDetails.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} every day for the next ${scheduleDetails.recurrence} days.`
      );
      
      // Update the UI
      createCelebration(`Habit scheduled for ${scheduleDetails.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, false);
      
      // Close the confirmation dialog
      setShowScheduleConfirm(false);
      setScheduleDetails(null);
      
      return true;
    } else {
      throw new Error("Failed to schedule habit");
    }
  } catch (error) {
    console.error("Error scheduling habit:", error);
    createCelebration("Schedule Error", false, "There was an error scheduling this habit. Please try again.");
    
    // Close the confirmation dialog
    setShowScheduleConfirm(false);
    setScheduleDetails(null);
    
    return false;
  }
};
  
  // Create a new habit using Allie AI - fixed version
const createNewHabit = async () => {
  try {
    setAllieIsThinking(true);
    
    // Default habit parts in case AI fails
    let parts = ["Balance Habit", "A small habit to improve family balance", "After breakfast", "Review family calendar", "Feel organized and prepared", "I am someone who values organization and preparation"];
    
    try {
      // First try to load AllieAIService dynamically in case it's not initialized
      const AllieAIServiceModule = await import('../../services/AllieAIService');
      const AllieAIService = AllieAIServiceModule.default;
      
      // Generate a new habit with Allie
      const habitPrompt = `Create a simple atomic habit for ${selectedUser.name} that helps with family balance. Focus on a small, easy action with a clear cue and reward. Use the format: Title | Description | Cue | Action | Reward | Identity Statement. Make it very specific and actionable.`;
      
      const response = await AllieAIService.generateResponse(
        [{ role: 'user', content: habitPrompt }],
        { familyId, userName: selectedUser.name }
      );
      
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
    
    // Create the habit in the database
    const habitData = {
      title: `${title}`,
      description: description,
      focusArea: title.split(' ')[0] + " " + title.split(' ')[1],
      assignedTo: selectedUser.roleType || selectedUser.role,
      assignedToName: selectedUser.name,
      completed: false,
      category: identity.includes("parent") ? "Parental Tasks" : "Household Tasks",
      comments: [],
      subTasks: subTasks,
      createdAt: serverTimestamp(),
      familyId: familyId,
      aiInsight: `This habit helps build your identity as ${identity}`
    };
    
    // Add the habit to the database with better error handling
    try {
      // Try to add directly to the main tasks collection first
      const tasksRef = collection(db, "families");
      const familyDocRef = doc(tasksRef, familyId);
      
      // Get the current tasks array
      const familyDoc = await getDoc(familyDocRef);
      if (!familyDoc.exists()) {
        throw new Error("Family document not found");
      }
      
      const currentTasks = familyDoc.data().tasks || [];
      
      // Generate a unique task ID
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
        trackDays: Array(7).fill(false),
        assignedTo: selectedUser.roleType || selectedUser.role,
        assignedToName: selectedUser.name,
        category: identity.includes("parent") ? "Parental Tasks" : "Household Tasks",
        insight: `This habit helps build your identity as ${identity}`,
        completed: false,
        comments: [],
        streak: 0,
        record: 0,
        progress: 0,
        imageUrl: null,
        lastCompleted: null,
        isPartOfStack: false,
        subTasks: subTasks.map((st, idx) => ({
          id: `${taskId}-step-${idx + 1}`,
          title: st.title,
          description: st.description,
          completed: false
        }))
      };
      
      // Update the tasks array
      await updateDoc(familyDocRef, {
        tasks: [...currentTasks, newHabit]
      });
      
      // Update the local state
      setHabits(prev => [newHabit, ...prev]);
      setShowAddHabit(false);
      createCelebration("New habit created!", false);
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
  
  // Fixed createKidHabit function
const createKidHabit = async () => {
  try {
    setAllieIsThinking(true);
    
    // Find a child from the family
    const children = familyMembers.filter(m => m.role === 'child');
    
    if (children.length === 0) {
      createCelebration("No Children", false, "No children found in family");
      setAllieIsThinking(false);
      return false;
    }
    
    const child = children[0];
    
    // Fallback values in case AI fails
    let title = `${child.name}'s Helper Task`;
    let description = `A fun way for ${child.name} to help the family`;
    let cue = "After breakfast";
    let action = "Put away my dishes";
    let reward = "High five from parents";
    let identity = "a helpful family member";
    
    try {
      // First try to load AllieAIService dynamically in case it's not initialized
      const AllieAIServiceModule = await import('../../services/AllieAIService');
      const AllieAIService = AllieAIServiceModule.default;
      
      // Generate a kid-friendly habit prompt
      const kidHabitPrompt = `Create a simple, fun helper task for a ${child.age || 8}-year-old child named ${child.name} that helps reduce parental load. It should be age-appropriate, fun, and help parents with daily tasks. Format the response as: Title | Description | Cue | Action | Reward | Identity.`;
      
      // Try ClaudeService directly if available
      let response;
      try {
        const ClaudeServiceModule = await import('../../services/ClaudeService');
        const ClaudeService = ClaudeServiceModule.default;
        
        response = await ClaudeService.generateResponse(
          [{ role: 'user', content: kidHabitPrompt }],
          { familyId, childName: child.name, childAge: child.age || 8 }
        );
      } catch (claudeError) {
        console.error("Claude error, falling back to AllieAIService:", claudeError);
        
        // Fallback to AllieAIService
        response = await AllieAIService.generateResponse(
          [{ role: 'user', content: kidHabitPrompt }],
          { familyId, childName: child.name, childAge: child.age || 8 }
        );
      }
      
      if (response && typeof response === 'string') {
        // Try to extract parts from the response
        // First look for pipe-separated format
        const pipeRegex = /(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/;
        const matches = response.match(pipeRegex);
        
        if (matches && matches.length >= 7) {
          // Use extracted parts
          title = matches[1].trim();
          description = matches[2].trim();
          cue = matches[3].trim();
          action = matches[4].trim();
          reward = matches[5].trim();
          identity = matches[6].trim();
        } else {
          // Try alternative format with sections
          const titleMatch = response.match(/Title:?\s*([^\n]+)/i);
          const descMatch = response.match(/Description:?\s*([^\n]+)/i);
          const cueMatch = response.match(/Cue:?\s*([^\n]+)/i);
          const actionMatch = response.match(/Action:?\s*([^\n]+)/i);
          const rewardMatch = response.match(/Reward:?\s*([^\n]+)/i);
          const identityMatch = response.match(/Identity:?\s*([^\n]+)/i);
          
          if (titleMatch) title = titleMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
          if (cueMatch) cue = cueMatch[1].trim();
          if (actionMatch) action = actionMatch[1].trim();
          if (rewardMatch) reward = rewardMatch[1].trim();
          if (identityMatch) identity = identityMatch[1].trim();
        }
      }
    } catch (aiError) {
      console.error("AI error in kid habit creation:", aiError);
      // Continue with default values
    }
    
    // Create the habit subtasks
    const subTasks = [
      { title: cue, description: "This is when to do it" },
      { title: action, description: "This is what to do" },
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
      
      // Generate a unique ID
      const taskId = `kid-habit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create the new kid habit with the ID
      const newHabit = {
        id: taskId,
        title: title,
        description: description,
        cue: cue,
        action: action,
        reward: reward,
        identity: identity,
        trackDays: Array(7).fill(false),
        assignedTo: "Kid",
        assignedToName: child.name,
        category: "Kid Helper",
        insight: `This habit helps ${child.name} build their identity as ${identity}`,
        completed: false,
        comments: [],
        streak: 0,
        record: 0,
        progress: 0,
        imageUrl: null,
        lastCompleted: null,
        isPartOfStack: false,
        isChildTask: true,
        subTasks: subTasks.map((st, idx) => ({
          id: `${taskId}-step-${idx + 1}`,
          title: st.title,
          description: st.description,
          completed: false
        }))
      };
      
      // Update the tasks array in Firestore
      await updateDoc(familyRef, {
        tasks: [...currentTasks, newHabit]
      });
      
      // Update the local state
      setKidHabits(prev => [newHabit, ...prev]);
      
      setShowAddHabit(false);
      createCelebration(`New helper habit for ${child.name}!`, true);
      
      setAllieIsThinking(false);
      return true;
    } catch (dbError) {
      console.error("Database error creating kid habit:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Error creating kid habit:", error);
    setAllieIsThinking(false);
    createCelebration("Error", false, "Could not create kid habit. Please try again later.");
    return false;
  }
};
  
  // Filter habits for the current user or "Everyone"
  const userHabits = habits.filter(habit => 
    habit.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
    habit.assignedToName === selectedUser?.name ||
    habit.assignedTo === "Everyone"
  );
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden font-roboto">
      {/* Header with streak information and family avatar */}
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          {/* Family avatar */}
          <div className="mr-4 hidden md:block">
            {familyPicture ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <img 
                  src={familyPicture} 
                  alt={`${familyName || 'Family'}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg flex items-center justify-center"
                style={{ backgroundColor: getAvatarColor(familyName) }}
              >
                <span className="text-lg font-bold text-white">
                  {getInitials(familyName)}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-medium">Atomic Habits Builder</h2>
            <p className="text-sm text-gray-300 mt-1">Small changes, big results</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="bg-white bg-opacity-10 rounded-lg px-3 py-2 mr-3 text-center">
            <div className="flex items-center">
              <Flame className="text-orange-400 mr-1" size={18} />
              <span className="text-lg font-bold">{familyStreak}</span>
            </div>
            <p className="text-xs">Day Streak</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg px-3 py-2 text-center">
            <div className="flex items-center justify-center">
              <Award className="text-yellow-400 mr-1" size={18} />
              <span className="text-lg font-bold">{longestStreak}</span>
            </div>
            <p className="text-xs">Record</p>
          </div>
        </div>
      </div>
      
      {/* Week progress bar and next survey indicator */}
<div className="p-4 border-b">
  <div className="flex justify-between items-center mb-2">
    <div className="text-sm flex items-center">
      <span>Cycle {currentWeek} Progress</span>
      <div className="ml-2 text-xs text-gray-500 hover:text-gray-700 cursor-help" title="The cycle timeline is flexible. You can adjust the due date based on your family's schedule.">
        <Info size={12} />
      </div>
    </div>
    
    <div className="flex items-center">
      <span className="text-sm mr-2">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>
      <button 
        onClick={() => {
          // Create date picker dialog
          const datePicker = document.createElement('input');
          datePicker.type = 'date';
          
          // Set min date to today
          const today = new Date();
          datePicker.min = today.toISOString().split('T')[0];
          
          // Set default value to current due date or 7 days from now
          const defaultDate = surveyDue || new Date(today.setDate(today.getDate() + 7));
          datePicker.value = defaultDate.toISOString().split('T')[0];
          
          // Style so it's invisible and hide it
          datePicker.style.position = 'absolute';
          datePicker.style.top = '-100px';
          document.body.appendChild(datePicker);
          
          // Add change handler
          datePicker.addEventListener('change', (e) => {
            const newDate = new Date(e.target.value);
            updateCycleDueDate(newDate);
            document.body.removeChild(datePicker);
          });
          
          // Add cancel handler
          datePicker.addEventListener('blur', () => {
            setTimeout(() => {
              if (document.body.contains(datePicker)) {
                document.body.removeChild(datePicker);
              }
            }, 300);
          });
          
          // Show the date picker
          datePicker.click();
        }}
        className="text-xs flex items-center text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
      >
        <Calendar size={12} className="mr-1" />
        Change Due Date
      </button>
    </div>
  </div>
  
  {/* Progress bar */}
  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
    <div 
      className="h-full bg-black transition-all duration-500 ease-out"
      style={{ width: `${weekProgress}%` }}
    ></div>
  </div>
  
  {/* Due date and schedule */}
  <div className="mt-4 flex justify-between items-center">
    <div className="flex items-center">
      <Calendar size={16} className="text-blue-600 mr-2" />
      <div>
        <p className="text-sm font-medium">Cycle {currentWeek} Due Date</p>
        <p className="text-xs text-gray-600">{surveyDue ? formatDate(surveyDue) : 'Not scheduled yet'}</p>
      </div>
    </div>
    
    <div>
      {daysUntilSurvey <= 0 ? (
        <button 
          onClick={onStartWeeklyCheckIn}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Take Now
        </button>
      ) : (
        <span className="text-sm text-gray-600">
          in {daysUntilSurvey} day{daysUntilSurvey !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  </div>
        
        {/* Next survey reminder */}
        {daysUntilSurvey !== null && (
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center">
              <Calendar size={16} className="text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium">Next Cycle Survey</p>
                <p className="text-xs text-gray-600">{surveyDue ? formatDate(surveyDue) : 'Not scheduled'}</p>
              </div>
            </div>
            
            <div>
              {daysUntilSurvey <= 0 ? (
                <button 
                  onClick={onStartWeeklyCheckIn}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Take Now
                </button>
              ) : (
                <span className="text-sm text-gray-600">
                  in {daysUntilSurvey} day{daysUntilSurvey !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Family meeting button - conditionally shown based on requirements */}
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar size={16} className="text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium">Family Meeting</p>
                <p className="text-xs text-gray-600">
                  {canScheduleMeeting 
                    ? "Ready to schedule!" 
                    : "Complete tasks and surveys first"}
                </p>
              </div>
            </div>
            
            <button 
              onClick={onOpenFamilyMeeting}
              className={`px-3 py-1 text-sm rounded-md ${
                canScheduleMeeting 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!canScheduleMeeting}
            >
              Schedule Meeting
            </button>
          </div>
          
          {/* Meeting requirements status indicators */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className={`text-xs ${meetingRequirements.tasksCompleted ? "text-green-600" : "text-gray-500"} flex items-center`}>
              <div className={`w-3 h-3 rounded-full mr-1 ${meetingRequirements.tasksCompleted ? "bg-green-500" : "bg-gray-300"}`}></div>
              Tasks Completed
            </div>
            <div className={`text-xs ${meetingRequirements.surveysCompleted ? "text-green-600" : "text-gray-500"} flex items-center`}>
              <div className={`w-3 h-3 rounded-full mr-1 ${meetingRequirements.surveysCompleted ? "bg-green-500" : "bg-gray-300"}`}></div>
              Surveys Done
            </div>
            <div className={`text-xs ${meetingRequirements.relationshipCheckinCompleted ? "text-green-600" : "text-gray-500"} flex items-center`}>
              <div className={`w-3 h-3 rounded-full mr-1 ${meetingRequirements.relationshipCheckinCompleted ? "bg-green-500" : "bg-gray-300"}`}></div>
              Relationship Check
            </div>
          </div>
        </div>
      </div>
      
      {/* Habit stacking section */}
      {userHabits.some(h => h.isPartOfStack) && (
        <div 
          className="p-4 border-b bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setHabitStackVisible(!habitStackVisible)}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium flex items-center">
              <Zap className="text-purple-500 mr-2" size={18} />
              Your Habit Stacks
            </div>
            <div className="text-sm text-gray-500">
              {habitStackVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {habitStackVisible && (
            <div className="mt-3 space-y-2">
              {/* Group stacks by trigger */}
              {Object.entries(
                userHabits
                  .filter(h => h.isPartOfStack)
                  .reduce((acc, habit) => {
                    if (!acc[habit.stackTrigger]) {
                      acc[habit.stackTrigger] = [];
                    }
                    acc[habit.stackTrigger].push(habit);
                    return acc;
                  }, {})
              ).map(([trigger, stackHabits]) => (
                <div key={trigger} className="bg-white rounded-lg p-3 border">
                  <div className="text-sm font-medium mb-2">{trigger}:</div>
                  <div className="pl-4 space-y-1">
                    {stackHabits.map((habit, i) => (
                      <div key={habit.id} className="flex items-center">
                        <ArrowRight className="text-gray-400 mr-2" size={14} />
                        <div className="text-sm">{habit.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="bg-gray-100 p-3 rounded-lg mt-2">
                <div className="text-sm text-gray-600">
                  Habit stacking helps you build new habits by connecting them to existing ones.
                  When you finish one habit, it becomes the trigger for the next one.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Habit explanation */}
<div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm">
  <h4 className="font-medium mb-2 flex items-center">
    <Info size={16} className="mr-2 text-blue-500" />
    How Habits Work
  </h4>
  <p className="mb-2">
    Habits are small, consistent actions that help balance family responsibilities. 
    Each habit follows the Atomic Habit formula:
  </p>
  <div className="grid grid-cols-4 gap-2 mb-2">
    <div className="bg-blue-50 p-2 rounded-lg text-blue-800 text-xs">
      <strong>Cue:</strong> The trigger for your habit
    </div>
    <div className="bg-green-50 p-2 rounded-lg text-green-800 text-xs">
      <strong>Routine:</strong> The action itself
    </div>
    <div className="bg-amber-50 p-2 rounded-lg text-amber-800 text-xs">
      <strong>Reward:</strong> The benefit you receive
    </div>
    <div className="bg-purple-50 p-2 rounded-lg text-purple-800 text-xs">
      <strong>Identity:</strong> Who you become
    </div>
  </div>
  <p>
    Mark habits complete each day to build your streak. Schedule them for reminders.
    Small consistent actions lead to meaningful change in family balance.
  </p>
</div>


      {/* Current habits section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Your Current Habits</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowAddHabit(true)}
              className="text-sm flex items-center text-blue-600 hover:text-blue-800"
            >
              <Plus size={16} className="mr-1" />
              Add Habit
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        ) : userHabits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No habits set for this week yet</p>
            <button 
              onClick={() => triggerAllieChat("Can you suggest a simple habit to help with family balance?")}
              className="mt-3 px-4 py-2 bg-black text-white rounded-lg flex items-center mx-auto"
            >
              <MessageSquare size={16} className="mr-2" />
              Ask Allie for Suggestions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userHabits.map(habit => (
              <div 
                key={habit.id} 
                className={`border rounded-lg overflow-hidden transition-all duration-300 transform hover:shadow-md ${
                  habit.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                {/* Habit card */}
                <div className="p-4">
                  <div className="flex items-start">
                    {/* Completion button */}
                    <button
                      onClick={() => habit.completed ? setShowHabitDetail(habit.id) : completeHabit(habit.id)}
                      className={`w-12 h-12 rounded-full flex-shrink-0 mr-4 flex items-center justify-center transition-colors ${
                        habit.completed 
                          ? 'bg-green-100 text-green-500 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <CheckCircle size={24} />
                    </button>
                    
                    {/* Habit content */}
                    <div className="flex-1">
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
                            {habit.cue || habit.stackTrigger || "After breakfast"}
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
                      
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${habit.completed ? 'bg-green-500' : 'bg-black'} transition-all duration-500 ease-out`}
                            style={{ width: `${habit.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Last completed */}
                      {habit.lastCompleted && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last completed: {formatDate(habit.lastCompleted)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {habit.completed 
                        ? 'Completed today!' 
                        : 'Complete this habit to build your streak'}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedHabit(habit);
                          setShowHabitDetail(habit.id);
                        }}
                        className="text-xs flex items-center text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Info size={12} className="mr-1" />
                        Details
                      </button>
                      <button
  onClick={() => habit.isScheduled ? editHabitSchedule(habit) : prepareHabitSchedule(habit)}
  className={`text-xs flex items-center px-2 py-1 rounded ${
    habit.isScheduled 
      ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
  }`}
>
  <Calendar size={12} className="mr-1" />
  {habit.isScheduled ? 'Scheduled' : 'Schedule'}
</button>
                      <button
                        onClick={() => {
                          setSelectedHabit(habit);
                          triggerAllieChat(`Give me some tips for making "${habit.title}" into a consistent habit.`);
                        }}
                        className="text-xs flex items-center text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Tips
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Kid Habits Section */}
      <div className="mt-4 p-4 border-t">
        <div 
          className="flex justify-between items-center mb-4 cursor-pointer"
          onClick={() => setShowKidSection(!showKidSection)}
        >
          <h3 className="font-medium text-lg flex items-center">
            <Star className="text-amber-500 mr-2" size={20} />
            Family Helper Habits
          </h3>
          <button className="p-1 rounded text-gray-500">
            {showKidSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        
        {showKidSection && (
          <>
            {kidHabits.length === 0 ? (
              <div className="text-center py-6 border rounded-lg">
                <p className="text-gray-500 mb-3">No helper habits for kids yet</p>
                <button 
                  onClick={createKidHabit}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg flex items-center mx-auto"
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
                      Create Kid Helper Habit
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {kidHabits.map(habit => (
                  <div 
                    key={habit.id}
                    className={`border rounded-lg p-4 ${
                      habit.completed ? 'bg-amber-50 border-amber-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                        <Star className="text-amber-500" size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium">{habit.title}</h4>
                        <p className="text-xs text-gray-600">For: {habit.assignedToName}</p>
                      </div>
                      <div className="ml-auto flex">
                        {habit.completed ? (
                          <div className="flex items-center bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                            <Check size={12} className="mr-1" />
                            Completed
                          </div>
                        ) : (
                          <button
                            onClick={() => completeKidHabit(habit.id)}
                            className="flex items-center bg-amber-500 text-white px-3 py-1 rounded-full text-xs"
                          >
                            <Check size={12} className="mr-1" />
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm mb-2">{habit.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-amber-50 p-2 rounded">
                        <div className="font-medium text-amber-800 mb-1">When:</div>
                        <div>{habit.cue}</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded">
                        <div className="font-medium text-amber-800 mb-1">Action:</div>
                        <div>{habit.action}</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded">
                        <div className="font-medium text-amber-800 mb-1">Reward:</div>
                        <div>{habit.reward}</div>
                      </div>
                    </div>
                    
                    {/* Streak counter */}
                    {habit.streak > 0 && (
                      <div className="mt-3 flex items-center">
                        <Flame className="text-amber-500 mr-1" size={14} />
                        <span className="text-xs font-medium">{habit.streak} day streak!</span>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="text-center">
                  <button
                    onClick={createKidHabit}
                    className="text-sm flex items-center text-amber-600 hover:text-amber-800 px-3 py-1 rounded border border-amber-200 hover:bg-amber-50 mx-auto"
                    disabled={allieIsThinking}
                  >
                    {allieIsThinking ? (
                      <>
                        <div className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="mr-1" />
                        Add Another Kid Habit
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
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
              celebration.isKid 
                ? 'bg-amber-500 text-white' 
                : 'bg-green-500 text-white'
            }`}
          >
            <div className="flex items-center">
              <Star className="text-yellow-300 mr-2" size={18} />
              <div>
                <div className="font-medium">{celebration.title}</div>
                <div className="text-sm">{celebration.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Habit detail/reflection modal */}
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
            
            {/* Success content for completed habits */}
            {selectedHabit.completed && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="text-green-500 mr-2" size={20} />
                  <div className="font-medium text-green-800">
                    Completed! 
                    <span className="font-normal ml-1">
                      {selectedHabit.lastCompleted ? formatDate(selectedHabit.lastCompleted) : 'Today'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-green-700">
                  You're building a stronger identity as someone who values {selectedHabit.category?.toLowerCase() || 'family balance'}.
                </div>
              </div>
            )}
            
            {/* Identity statement */}
            <div className="mb-4 p-3 bg-black text-white rounded-lg">
              <div className="text-xs text-gray-300 mb-1">Identity:</div>
              <div>{selectedHabit.identity}</div>
            </div>
            
            {/* Atomic steps */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Atomic Steps:</div>
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
            
            {/* Previous reflections/comments */}
            {selectedHabit.comments && selectedHabit.comments.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Previous Reflections:</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHabit.comments.map(comment => (
                    <div key={comment.id || Date.now()} className="p-2 bg-gray-50 rounded">
                      <div className="text-xs text-gray-500">{formatDate(comment.timestamp)}</div>
                      <div className="text-sm mt-1">
                        {comment.text && comment.text.startsWith('[IMAGE]') ? (
                          <img 
                            src={comment.text.replace('[IMAGE] ', '')} 
                            alt="Habit" 
                            className="mt-1 rounded-lg max-h-32 max-w-full" 
                          />
                        ) : (
                          comment.text
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Capture your learning */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Capture Your Learning:</div>
              <textarea
                className="w-full border rounded-lg p-3 text-sm"
                rows="3"
                placeholder="What did you learn from this habit today? How did it make you feel?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              ></textarea>
            </div>
            
            {/* Photo upload UI */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Add a Photo (Optional):</div>
              {cameraImage ? (
                <div className="relative">
                  <img 
                    src={URL.createObjectURL(cameraImage)} 
                    alt="Captured" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setCameraImage(null)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : selectedHabit.imageUrl ? (
                <div className="relative">
                  <img 
                    src={selectedHabit.imageUrl} 
                    alt="Habit" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCameraCapture}
                    className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200"
                  >
                    <Camera size={18} className="mr-2" />
                    Take Photo
                  </button>
                  <label className="flex-1 flex items-center justify-center bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 cursor-pointer">
                    <Upload size={18} className="mr-2" />
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePhotoUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
              
              {/* Upload progress */}
              {photoUploadProgress > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Uploading: {photoUploadProgress}%</div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${photoUploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Habit insights */}
            {selectedHabit.insight && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-700 font-medium mb-1">
                  <div className="flex items-center">
                    <Info size={14} className="mr-1" />
                    Allie's Insight:
                  </div>
                </div>
                <div className="text-sm text-blue-800">
                  {selectedHabit.insight}
                </div>
                <button
                  onClick={() => {
                    triggerAllieChat(`Tell me more about how "${selectedHabit.title}" helps with family balance.`);
                    setShowHabitDetail(null);
                  }}
                  className="text-xs text-blue-700 mt-2 flex items-center"
                >
                  <MessageSquare size={12} className="mr-1" />
                  Ask Allie for more insights
                </button>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={saveReflection}
                disabled={!reflection.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} className="mr-2" />
                Save Reflection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule confirmation modal */}
      {showScheduleConfirm && scheduleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Schedule Habit</h3>
              <button 
                onClick={() => {
                  setShowScheduleConfirm(false);
                  setScheduleDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Habit:</div>
              <div className="p-2 bg-gray-50 rounded text-sm">
                {scheduleDetails.habit.title}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Schedule Time:</div>
              <input
                type="time"
                className="w-full p-2 border rounded"
                value={scheduleDetails.startTime.toTimeString().substr(0, 5)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newStartTime = new Date(scheduleDetails.startTime);
                  newStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  
                  const newEndTime = new Date(newStartTime);
                  newEndTime.setMinutes(newStartTime.getMinutes() + 30);
                  
                  setScheduleDetails({
                    ...scheduleDetails,
                    startTime: newStartTime,
                    endTime: newEndTime
                  });
                }}
              />
            </div>
            
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Repeat for:</div>
              <div className="flex items-center">
                <input
                  type="number"
                  className="w-20 p-2 border rounded mr-2"
                  value={scheduleDetails.recurrence}
                  onChange={(e) => {
                    setScheduleDetails({
                      ...scheduleDetails,
                      recurrence: Math.max(1, parseInt(e.target.value) || 1)
                    });
                  }}
                  min="1"
                  max="90"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Experts recommend at least 21 days to form a habit
              </p>
            </div>
            
            <div className="mb-6">
              <div className="text-sm font-medium mb-1">Reminder:</div>
              <select
                className="w-full p-2 border rounded"
                value={scheduleDetails.reminderMinutes}
                onChange={(e) => {
                  setScheduleDetails({
                    ...scheduleDetails,
                    reminderMinutes: parseInt(e.target.value)
                  });
                }}
              >
                <option value="5">5 minutes before</option>
                <option value="10">10 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-blue-800">
              <div className="flex items-center mb-1">
                <Info size={14} className="mr-1 text-blue-600" />
                <div className="font-medium">Scheduling Details:</div>
              </div>
              <p>
                This will add a calendar reminder for "{scheduleDetails.habit.title}" 
                at {scheduleDetails.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                every day for the next {scheduleDetails.recurrence} days.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScheduleConfirm(false);
                  setScheduleDetails(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmScheduleToCalendar}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center"
              >
                <Calendar size={16} className="mr-2" />
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera capture modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <div className="text-white font-medium">Take a Photo</div>
            <button
              onClick={() => {
                if (videoRef.current && videoRef.current.srcObject) {
                  const stream = videoRef.current.srcObject;
                  const tracks = stream.getTracks();
                  tracks.forEach(track => track.stop());
                }
                setShowCamera(false);
              }}
              className="text-white"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <video 
              ref={videoRef}
              className="max-h-[70vh] max-w-full" 
              autoPlay 
              playsInline
            ></video>
          </div>
          
          <div className="p-4 flex justify-center">
            <button
              onClick={takePhoto}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full border-4 border-black"></div>
            </button>
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
            
            <div className="flex space-x-3">
              <button
                onClick={createNewHabit}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg flex items-center justify-center"
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
              
              <button
                onClick={() => {
                  setShowAddHabit(false);
                  triggerAllieChat("I want to create a new habit to help with family balance. Can you suggest something small and specific I can start with?");
                }}
                className="flex-1 px-4 py-2 border border-black text-black rounded-lg flex items-center justify-center"
              >
                <MessageSquare size={16} className="mr-2" />
                Ask Allie
              </button>
            </div>
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

export default TasksTab;