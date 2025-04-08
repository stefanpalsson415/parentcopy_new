import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, CheckCircle, X, Plus, Award, Flame, 
  Zap, Star, ArrowRight, MessageSquare, Clock, 
  Heart, ArrowUp, Camera, Share2, Upload, Check,
  Info, ChevronDown, ChevronUp, Edit, AlertCircle
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

const TasksTab = ({ onStartWeeklyCheckIn, onOpenFamilyMeeting }) => {
  const { 
    selectedUser, 
    familyMembers,
    currentWeek,
    completedWeeks,
    familyId,
    familyName,
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
  
  // Dates for weekly rhythm
  const [weekProgress, setWeekProgress] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(7);
  
  // Family streaks
  const [familyStreak, setFamilyStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // Video ref for camera
  const videoRef = useRef(null);
  
  // Trigger Allie Chat component
  const triggerAllieChat = (message) => {
    setAllieInputValue(message);
    
    // Find the global chat button element and click it
    const chatButton = document.getElementById('chat-button');
    if (chatButton) {
      // Check if chat is already open
      const chatContainer = document.querySelector('[role="dialog"]');
      if (!chatContainer) {
        // Click to open chat
        const buttonElement = chatButton.querySelector('button');
        if (buttonElement) buttonElement.click();
      }
      
      // Set timeout to allow chat to open
      setTimeout(() => {
        // Find the textarea input in the chat
        const chatInput = document.querySelector('textarea[placeholder="Message Allie..."]');
        if (chatInput) {
          // Set the value and dispatch input event
          chatInput.value = message;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Find and click the send button
          const sendButton = chatInput.closest('div').querySelector('button[title="Send message"]');
          if (sendButton) sendButton.click();
        }
      }, 500);
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
              task.title.includes('Kid') || 
              task.title.includes('Child');
              
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
            
            // Create the habit object
            const habitObj = {
              id: task.id,
              title: task.title.replace(/Week \d+: /g, ''),
              description: task.description.replace(/for this week/g, 'consistently'),
              cue: task.subTasks?.[0]?.title || "After breakfast",
              action: task.subTasks?.[1]?.title || task.title,
              reward: task.subTasks?.[2]?.title || "Feel accomplished and balanced",
              identity: task.focusArea 
                ? `I am someone who values ${task.focusArea.toLowerCase()}` 
                : "I am someone who values family balance",
              trackDays: Array(7).fill(false),
              assignedTo: task.assignedTo,
              assignedToName: task.assignedToName,
              category: task.category,
              insight: task.insight || task.aiInsight,
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
      await updateDoc(streakRef, {
        currentStreak: newStreak,
        lastUpdated: new Date().toISOString()
      });
      
      // Then, update record if this is a new record
      const recordRef = doc(db, "families", familyId, "habitStreaks", `${habitId}_record`);
      await updateDoc(recordRef, {
        value: newRecord,
        lastUpdated: new Date().toISOString()
      });
      
      // Update local streaks state
      setStreaks(prev => ({
        ...prev,
        [habitId]: newStreak,
        [`${habitId}_record`]: newRecord
      }));
    } catch (error) {
      console.error("Error updating streak:", error);
      // If documents don't exist yet, create them
      try {
        // Create streak document
        const streakRef = doc(db, "families", familyId, "habitStreaks", habitId);
        await setDoc(streakRef, {
          currentStreak: newStreak,
          lastUpdated: new Date().toISOString()
        });
        
        // Create record document
        const recordRef = doc(db, "families", familyId, "habitStreaks", `${habitId}_record`);
        await setDoc(recordRef, {
          value: newRecord,
          lastUpdated: new Date().toISOString()
        });
      } catch (innerError) {
        console.error("Error creating streak documents:", innerError);
      }
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
  const createCelebration = (habitTitle, isKid = false) => {
    const newCelebration = {
      id: Date.now(),
      title: habitTitle,
      message: generateCelebrationMessage(habitTitle, isKid),
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
  
  // Schedule a habit to calendar
  const scheduleHabitToCalendar = async (habit) => {
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
      
      // Create an event to repeat daily
      const event = {
        summary: `Habit: ${habit.title}`,
        description: `${habit.description}\n\nCue: ${cue}\nAction: ${habit.action}\nReward: ${habit.reward}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(startTime.getTime() + 30 * 60000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        recurrence: ['RRULE:FREQ=DAILY;COUNT=21'], // Repeat for 21 days (the time needed to form a habit)
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 }
          ]
        },
        // Add metadata for Allie
        taskId: habit.id,
        familyId: familyId
      };
      
      // Add to calendar
      const result = await CalendarService.addEvent(event, selectedUser.id);
      
      if (result.success) {
        // Create a comment in the habit about scheduling
        await addTaskComment(
          habit.id, 
          `I've scheduled this habit for ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} every day for the next 21 days.`
        );
        
        // Update the UI
        createCelebration(`Habit scheduled for ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, false);
        return true;
      } else {
        throw new Error("Failed to schedule habit");
      }
    } catch (error) {
      console.error("Error scheduling habit:", error);
      alert("There was an error scheduling this habit. Please try again.");
      return false;
    }
  };
  
  // Create a new habit using Allie AI
  const createNewHabit = async () => {
    try {
      setAllieIsThinking(true);
      
      // Generate a new habit with Allie
      const habitPrompt = `Create a simple atomic habit for ${selectedUser.name} that helps with family balance. Focus on a small, easy action with a clear cue and reward. Use the format: Title | Description | Cue | Action | Reward | Identity Statement. Make it very specific and actionable.`;
      
      const response = await AllieAIService.generateContent(habitPrompt, familyId);
      
      // Extract parts
      const parts = response.split('|').map(part => part.trim());
      
      if (parts.length < 6) {
        throw new Error("Invalid habit format from Allie");
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
      
      // Add the habit to the database
      const habitRef = collection(db, "families", familyId, "habits");
      const newHabitRef = await addDoc(habitRef, habitData);
      
      // Update the local state
      const newHabit = {
        id: newHabitRef.id,
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
        atomicSteps: subTasks.map((st, idx) => ({
          id: `${newHabitRef.id}-step-${idx + 1}`,
          title: st.title,
          description: st.description,
          completed: false
        }))
      };
      
      setHabits(prev => [newHabit, ...prev]);
      setShowAddHabit(false);
      createCelebration("New habit created!", false);
      
      setAllieIsThinking(false);
      return true;
    } catch (error) {
      console.error("Error creating new habit:", error);
      setAllieIsThinking(false);
      return false;
    }
  };
  
  // Create a new habit for a kid
  const createKidHabit = async () => {
    try {
      setAllieIsThinking(true);
      
      // Find a child from the family
      const children = familyMembers.filter(m => m.role === 'child');
      
      if (children.length === 0) {
        alert("No children found in family");
        setAllieIsThinking(false);
        return false;
      }
      
      const child = children[0];
      
      // Generate a kid-friendly habit with Allie
      const kidHabitPrompt = `Create a simple, fun helper task for a ${child.age || 8}-year-old child named ${child.name} that helps reduce parental load. It should be age-appropriate, fun, and help parents with daily tasks. Use the format: Title | Description | Cue | Action | Reward | Identity Statement. Make it very specific, actionable, and appealing to children.`;
      
      const response = await AllieAIService.generateContent(kidHabitPrompt, familyId);
      
      // Extract parts
      const parts = response.split('|').map(part => part.trim());
      
      if (parts.length < 6) {
        throw new Error("Invalid habit format from Allie");
      }
      
      const [title, description, cue, action, reward, identity] = parts;
      
      // Create the habit subtasks
      const subTasks = [
        { title: cue, description: "This is when to do it" },
        { title: action, description: "This is what to do" },
        { title: reward, description: "This is your reward" }
      ];
      
      // Create the habit in the database
      const habitData = {
        title: `${title}`,
        description: description,
        focusArea: "Kid Helper",
        assignedTo: "Kid",
        assignedToName: child.name,
        completed: false,
        category: "Kid Helper",
        comments: [],
        subTasks: subTasks,
        createdAt: serverTimestamp(),
        familyId: familyId,
        aiInsight: `This habit helps ${child.name} build their identity as ${identity}`
      };
      
      // Add the habit to the database
      const habitRef = collection(db, "families", familyId, "habits");
      const newHabitRef = await addDoc(habitRef, habitData);
      
      // Update the local state
      const newHabit = {
        id: newHabitRef.id,
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
        atomicSteps: subTasks.map((st, idx) => ({
          id: `${newHabitRef.id}-step-${idx + 1}`,
          title: st.title,
          description: st.description,
          completed: false
        }))
      };
      
      setKidHabits(prev => [newHabit, ...prev]);
      setShowAddHabit(false);
      createCelebration(`New helper habit for ${child.name}!`, true);
      
      setAllieIsThinking(false);
      return true;
    } catch (error) {
      console.error("Error creating kid habit:", error);
      setAllieIsThinking(false);
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
      {/* Header with streak information */}
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium">Atomic Habits Builder</h2>
          <p className="text-sm text-gray-300 mt-1">Small changes, big results</p>
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
          <div className="text-sm">Week {currentWeek} Progress</div>
          <div className="text-sm">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${weekProgress}%` }}
          ></div>
        </div>
        
        {/* Next survey reminder */}
        {daysUntilSurvey !== null && (
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center">
              <Calendar size={16} className="text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium">Next Survey Due</p>
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
                        onClick={() => scheduleHabitToCalendar(habit)}
                        className="text-xs flex items-center text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Calendar size={12} className="mr-1" />
                        Schedule
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
      
      {/* Family meeting reminder */}
      <div className="mt-4 p-4 border-t bg-blue-50">
        <div className="flex items-start">
          <Calendar size={20} className="text-blue-600 mt-1 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Family Meeting</h3>
            <p className="text-sm text-blue-600 mt-1">
              Schedule your weekly family meeting to review habit progress and celebrate wins
            </p>
            <button 
              onClick={onOpenFamilyMeeting}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded flex items-center hover:bg-blue-700"
            >
              Schedule Meeting
            </button>
          </div>
        </div>
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
                    <div key={comment.id} className="p-2 bg-gray-50 rounded">
                      <div className="text-xs text-gray-500">{formatDate(comment.timestamp)}</div>
                      <div className="text-sm mt-1">
                        {comment.text.startsWith('[IMAGE]') ? (
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
                  onClick={() => triggerAllieChat(`Tell me more about how "${selectedHabit.title}" helps with family balance.`)}
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
      
      {/* Allie coaching modal */}
      {showAllieCoaching && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Allie Habit Coaching</h3>
              <button 
                onClick={() => setShowAllieCoaching(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
              <p>
                To build effective habits, focus on:
              </p>
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>Establishing a clear cue (e.g., "After breakfast")</li>
                <li>Making the habit very small and easy to start</li>
                <li>Creating immediate satisfaction after completion</li>
                <li>Tracking your progress visually</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              What specific habit would you like to discuss with Allie?
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowAllieCoaching(false);
                  triggerAllieChat("How can I build a habit of planning meals ahead of time to reduce stress?");
                }}
                className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50"
              >
                How to build a habit of meal planning
              </button>
              
              <button
                onClick={() => {
                  setShowAllieCoaching(false);
                  triggerAllieChat("What's a good habit stack I can create for my morning routine to help with family balance?");
                }}
                className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50"
              >
                Creating a morning habit stack
              </button>
              
              <button
                onClick={() => {
                  setShowAllieCoaching(false);
                  triggerAllieChat("How can I help my kids develop good habits to help around the house?");
                }}
                className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50"
              >
                Helping kids develop helper habits
              </button>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowAllieCoaching(false);
                  triggerAllieChat("I want to learn more about building effective habits based on the Atomic Habits principles.");
                }}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center mx-auto"
              >
                <MessageSquare size={16} className="mr-2" />
                Chat with Allie
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
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  createNewHabit();
                }}
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