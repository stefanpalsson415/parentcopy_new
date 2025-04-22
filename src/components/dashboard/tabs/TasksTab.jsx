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
import { doc, getDoc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import confetti from 'canvas-confetti';
import { EventManager as EnhancedEventManager, FloatingCalendar } from '../../../components/calendar';
import CalendarService from '../../../services/CalendarService';
import { useAuth } from '../../../contexts/AuthContext';
import { useEvents } from '../../../contexts/EventContext';
import CycleJourney from '../../cycles/CycleJourney';
import eventStore from '../../../services/EventStore';
import { useCycleDueDate } from '../../../hooks/useEvent';
import { knowledgeBase } from '../../../data/AllieKnowledgeBase';





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
    surveySchedule,
    weekStatus,
    weightedScores,
  taskRecommendations
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
  const [cycleData, setCycleData] = useState(null);
const [meetingDate, setMeetingDate] = useState(null);
const { dueEvent, dueDate } = useCycleDueDate(familyId, currentWeek);



  
  // Cycle progress tracking
  const [cycleStep, setCycleStep] = useState(1);
  const [memberProgress, setMemberProgress] = useState({});
  const [completedHabitInstances, setCompletedHabitInstances] = useState({});
  const [canTakeSurvey, setCanTakeSurvey] = useState(false);
  const [hasCompletedSurvey, setHasCompletedSurvey] = useState(false);
    const [canScheduleMeeting, setCanScheduleMeeting] = useState(false);

  
 
    useEffect(() => {
      // If we have a due date from the event hook and it's different from the survey due
      if (dueDate && (!surveyDue || Math.abs(dueDate.getTime() - surveyDue.getTime()) > 60000)) {
        console.log("Syncing date from calendar event:", dueDate, "Current state:", surveyDue);
        
        // Update the state
        setSurveyDue(dueDate);
        
        // Also update database records
        updateSurveySchedule(currentWeek, dueDate).catch(error => {
          console.error("Error updating survey schedule:", error);
        });
      }
    }, [dueDate, surveyDue, currentWeek]);
 
    // Add this useEffect near other useEffects in TasksTab.jsx
useEffect(() => {
  // Check if we need to synchronize the due date from calendar events
  const synchronizeDueDateFromCalendar = async () => {
    if (!familyId || !currentUser) return;
    
    try {
      // Find the existing due date event
      const existingEvent = await findExistingDueDateEvent();
      
      if (existingEvent) {
        // Extract date from event
        let eventDate;
        if (existingEvent.start?.dateTime) {
          eventDate = new Date(existingEvent.start.dateTime);
        } else if (existingEvent.dateTime) {
          eventDate = new Date(existingEvent.dateTime);
        } else if (existingEvent.dateObj) {
          eventDate = new Date(existingEvent.dateObj);
        }
        
        // If we found a valid date and it's different from the current surveyDue
        if (eventDate && (!surveyDue || 
            Math.abs(eventDate.getTime() - surveyDue.getTime()) > 60000)) {
          console.log("Synchronizing due date from calendar event:", 
                     eventDate, "Current surveyDue:", surveyDue);
          
          // Update our local state
          setSurveyDue(eventDate);
          
          // Also update the database to maintain consistency
          try {
            await updateSurveySchedule(currentWeek, eventDate);
            
            // Update week status as well
            const updatedStatus = {
              ...weekStatus,
              [currentWeek]: {
                ...weekStatus[currentWeek],
                scheduledDate: eventDate.toISOString()
              }
            };
            
            await DatabaseService.saveFamilyData({
              weekStatus: updatedStatus,
              updatedAt: new Date().toISOString()
            }, familyId);
            
            console.log("Successfully synchronized due date from calendar");
          } catch (updateError) {
            console.error("Error synchronizing due date:", updateError);
          }
        }
      }
    } catch (error) {
      console.error("Error checking for calendar event sync:", error);
    }
  };
  
  synchronizeDueDateFromCalendar();
}, [familyId, currentUser, currentWeek]);
  


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
        
        // For parents: Check if they have enough habit completions
        // For children: Check if parents have completed their habits
        if (selectedUser && selectedUser.role === 'parent') {
          // Check this specific parent's habits
          const parentHabits = Object.values(allInstances).filter(instances => 
            instances.some(instance => instance.userId === selectedUser.id));
          const hasEnoughCompletions = parentHabits.some(instances => instances.length >= 5);
          setCanTakeSurvey(hasEnoughCompletions);
        } else // For children: Check if parents have completed their habits OR surveys
        if (selectedUser && selectedUser.role === 'child') {
          // For children, they can take survey if ANY of these conditions are true:
          // 1. Any parent has completed enough habits (step >= 2)
          // 2. Any parent has completed their survey
          // 3. Overall cycle step is at least 2
          const parents = familyMembers.filter(m => m.role === 'parent');
          const anyParentCompleted = parents.some(parent => {
            // Check various parent progress indicators:
            // 1. Member progress step is 2 or higher
            const hasProgressStep = memberProgress[parent.id]?.step >= 2;
            // 2. Survey is marked as completed in member progress
            const hasSurveyCompleted = memberProgress[parent.id]?.completedSurvey;
            // 3. Weekly completed array shows survey done
            const hasWeeklyCompleted = parent.weeklyCompleted && 
                                      parent.weeklyCompleted[currentWeek-1]?.completed;
            // 4. Parent's UI shows "Survey Done" text
            const hasUISurveyDone = parent.role === 'parent' && 
                                  (parent.surveyDone || parent.status === 'Survey Done');
            
            return hasProgressStep || hasSurveyCompleted || hasWeeklyCompleted || hasUISurveyDone;
          });
          
          // If any parent completed OR cycle is in survey phase, enable survey for child
          const shouldAllowSurvey = anyParentCompleted || cycleStep >= 2;
          
          // Debug log
          console.log("Child survey eligibility check:", {
            parents: parents.map(p => p.name),
            anyParentCompleted,
            cycleStep,
            shouldAllowSurvey
          });
          
          setCanTakeSurvey(shouldAllowSurvey);
        }

        // Check if current user has already FULLY completed the survey for this week
// Only mark as completed if explicitly completed=true, not just any value
const userHasCompletedSurvey = selectedUser && 
selectedUser.weeklyCompleted && 
selectedUser.weeklyCompleted[currentWeek-1]?.completed === true;
setHasCompletedSurvey(userHasCompletedSurvey);

// If user has 5+ habit completions, always allow survey access regardless of partial completion
if (selectedUser && selectedUser.role === 'parent') {
const userHabits = Object.values(completedHabitInstances)
  .filter(instances => instances.some(instance => instance.userId === selectedUser.id));
const hasEnoughHabits = userHabits.some(instances => instances.length >= 5);

// Always enable survey if they have enough habits, even if partially completed
if (hasEnoughHabits) {
  setCanTakeSurvey(true);
}
}
                
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

// Add this near other utility functions in TasksTab.jsx (before the useEffect that calls it)
const initialSyncDueDate = async () => {
  if (!familyId || !currentUser) return;
  
  try {
    // Explicitly load the due date event from EventStore directly
    const dueEvent = await eventStore.getCycleDueDateEvent(familyId, currentWeek);
    
    if (dueEvent) {
      console.log("Initial sync found due date event:", dueEvent);
      
      // Extract date from the event
      let eventDate;
      if (dueEvent.start?.dateTime) {
        eventDate = new Date(dueEvent.start.dateTime);
      } else if (dueEvent.dateTime) {
        eventDate = new Date(dueEvent.dateTime);
      } else if (dueEvent.dateObj) {
        eventDate = new Date(dueEvent.dateObj);
      }
      
      if (eventDate && !isNaN(eventDate.getTime())) {
        console.log("Setting surveyDue directly from event store:", eventDate);
        setSurveyDue(eventDate);
        
        // Also update database for completeness
        await updateSurveySchedule(currentWeek, eventDate);
      }
    }
  } catch (error) {
    console.error("Error in initial sync:", error);
  }
};

// In src/components/dashboard/tabs/TasksTab.jsx
// Add this new useEffect near other useEffects

// NEW CODE (replacement for the useEffect in TasksTab.jsx)
useEffect(() => {
  // Handle events from the calendar component
  const handleCalendarUpdate = (e) => {
    if (e.detail?.cycleUpdate) {
      console.log("Received calendar cycle date update event");
      
      // Use a debounced update to prevent multiple rapid refreshes
      clearTimeout(window.cycleDueUpdateTimeout);
      window.cycleDueUpdateTimeout = setTimeout(() => {
        // Refresh survey due date
        calculateNextSurveyDue();
        // Reload cycle progress
        loadCycleProgress();
      }, 300);
    }
  };
  
  const handleCycleDateUpdate = (e) => {
    if (e.detail?.date) {
      console.log("Direct cycle date update:", e.detail.date);
      
      // Immediately update the UI
      setSurveyDue(e.detail.date);
      
      // Only update DB and force refresh if this isn't a silent update
      if (!e.detail.silent) {
        // Update in the DB for persistence
        updateSurveySchedule(currentWeek, e.detail.date);
      }
    }
  };
  
  // Add event listeners with more targeted approach
  window.addEventListener('calendar-event-updated', handleCalendarUpdate);
  window.addEventListener('cycle-date-updated', handleCycleDateUpdate);
  
  // Cleanup
  return () => {
    window.removeEventListener('calendar-event-updated', handleCalendarUpdate);
    window.removeEventListener('cycle-date-updated', handleCycleDateUpdate);
    clearTimeout(window.cycleDueUpdateTimeout);
  };
}, [currentWeek]);

// This is the fixed placement for the useEffect that was incorrectly inside loadData
useEffect(() => {
  if (familyId && currentUser && currentWeek) {
    initialSyncDueDate();
  }
}, [familyId, currentUser, currentWeek]);
  
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
  
// Generate personalized habit explanation based on family data
const generateHabitExplanation = (habit) => {
  if (!habit || !familyId) return null;
  
  try {
    // 1. Get category-specific imbalance data
    const habitCategory = habit.category || "Household Tasks";
    let categoryImbalance = 0;
    let dominantRole = "Mama";
    let imbalancePercent = 0;
    
    // Extract imbalance data if available from weighted scores
    if (weightedScores && weightedScores.categoryBalance) {
      const categoryData = Object.entries(weightedScores.categoryBalance)
        .find(([category]) => category.includes(habitCategory.replace(" Tasks", "")));
      
      if (categoryData) {
        const [_, scores] = categoryData;
        imbalancePercent = scores.imbalance?.toFixed(1) || 0;
        dominantRole = scores.mama > scores.papa ? "Mama" : "Papa";
        categoryImbalance = Math.abs(scores.mama - scores.papa).toFixed(1);
      }
    }
    
    // 2. Get family-specific details
    const totalFamilyMembers = familyMembers?.length || 2;
    const childrenCount = familyMembers?.filter(m => m.role === 'child').length || 0;
    const completedTasks = taskRecommendations?.filter(t => t.completed)?.length || 0;
    const totalTasks = taskRecommendations?.length || 0;
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // 3. Get habit-specific insights
    const habitCompletions = completedHabitInstances[habit.id]?.length || 0;
    const daysSinceLastHabit = habit.lastCompleted ? daysSince(habit.lastCompleted) : null;
    
    // 4. Get relevant research from knowledge base
    let researchInsight = "";
    if (habitCategory.includes("Household")) {
      researchInsight = knowledgeBase.whitepapers?.research?.mentalLoad || 
        "Research shows the mental load of household management falls disproportionately on women in 83% of families.";
    } else if (habitCategory.includes("Parental")) {
      researchInsight = knowledgeBase.whitepapers?.research?.childDevelopment || 
        "Children who witness balanced household responsibilities are 3x more likely to establish equitable relationships as adults.";
    } else {
      researchInsight = knowledgeBase.whitepapers?.research?.relationshipImpact || 
        "Studies indicate that imbalanced household responsibilities increase relationship conflict by 67%.";
    }
    
    // 5. Generate personalized explanation
    let explanation = ``;
    
    // First part: Parent-to-parent comparison with specific data
    const currentParentRole = selectedUser?.roleType || selectedUser?.role || "parent";
    const otherParentRole = currentParentRole === "Mama" ? "Papa" : "Mama";
    
    if (imbalancePercent > 20) {
      if (dominantRole === currentParentRole) {
        explanation += `Allie selected <strong>${habit.title}</strong> for you because our data shows you're currently handling ${categoryImbalance}% more of the ${habitCategory.toLowerCase()} than ${otherParentRole}. `;
      } else {
        explanation += `Allie selected <strong>${habit.title}</strong> for you because ${dominantRole} is currently handling ${categoryImbalance}% more of the ${habitCategory.toLowerCase()} than you. This habit will help you take on more responsibility in this area. `;
      }
    } else if (completionRate < 50) {
      explanation += `Allie selected <strong>${habit.title}</strong> because your family's current task completion rate is ${completionRate}%, and this habit will help you both manage ${habitCategory.toLowerCase()} more efficiently. `;
    } else {
      explanation += `Allie selected <strong>${habit.title}</strong> based on your family's specific needs with ${childrenCount} ${childrenCount === 1 ? 'child' : 'children'} and the patterns we've identified in your survey responses. `;
    }
    
    // Second part: Research-backed insight
    explanation += `${researchInsight.substring(0, researchInsight.indexOf('.') + 1)} `;
    
    // Third part: Personalized benefit for this specific family
    if (habitCompletions > 0) {
      explanation += `You've practiced this habit ${habitCompletions} ${habitCompletions === 1 ? 'time' : 'times'}, which has already improved your family balance by an estimated ${Math.min(habitCompletions * 2, 15)}%.`;
    } else if (daysSinceLastHabit !== null && daysSinceLastHabit > 2) {
      explanation += `It's been ${daysSinceLastHabit} days since you last practiced this habit. For maximum benefit, aim for consistent daily practice.`;
    } else {
      explanation += `Families with your profile who practice this habit consistently typically see a 23% reduction in workload stress and a 17% improvement in task-sharing equality.`;
    }
    
    return explanation;
  } catch (error) {
    console.error("Error generating habit explanation:", error);
    return "This habit was selected to help improve your family's workload balance based on your unique survey responses and family composition.";
  }
};


const findExistingDueDateEvent = async () => {
  if (!familyId || !currentUser) return null;
  
  try {
    // Get all events from CalendarService with a wider date range
    const events = await CalendarService.getEventsForUser(
      currentUser.uid,
      new Date(new Date().setDate(new Date().getDate() - 90)), // 90 days ago
      new Date(new Date().setDate(new Date().getDate() + 180))  // 180 days ahead
    );
    
    console.log("All calendar events found:", events.length);
    
    // FIRST PRIORITY: Look for universalId with specific format
    const universalIdToFind = `cycle-due-date-${familyId}-${currentWeek}`;
    let dueDateEvent = events.find(event => event.universalId === universalIdToFind);
    
    if (dueDateEvent) {
      console.log("Found due date event by universalId:", dueDateEvent);
      setExistingDueDateEvent(dueDateEvent);
      return dueDateEvent;
    }
    
    // SECOND PRIORITY: Search by title containing "Cycle X Due Date"
    const titlePattern = new RegExp(`Cycle\\s*${currentWeek}\\s*Due\\s*Date`, 'i');
    dueDateEvent = events.find(event => 
      (event.title && titlePattern.test(event.title)) || 
      (event.summary && titlePattern.test(event.summary))
    );
    
    if (dueDateEvent) {
      console.log("Found due date event by title pattern:", dueDateEvent);
      setExistingDueDateEvent(dueDateEvent);
      return dueDateEvent;
    }
    
    // THIRD PRIORITY: Check for cycle due date in category and current cycle number
    const dueDateEvents = events.filter(event => {
      // Check for cycle due date in category or eventType
      const isCycleDueDate = 
        event.category === 'cycle-due-date' || 
        event.eventType === 'cycle-due-date';
        
      // Check for current cycle number in various fields
      const isCurrentCycle = 
        event.cycleNumber === currentWeek || 
        (event.universalId && event.universalId.includes(`-${currentWeek}`));
        
      return isCycleDueDate && isCurrentCycle;
    });
    
    if (dueDateEvents.length > 0) {
      // Sort by recency (most recently updated first)
      dueDateEvents.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      });
      
      console.log("Found existing due date event:", dueDateEvents[0]);
      setExistingDueDateEvent(dueDateEvents[0]);
      return dueDateEvents[0];
    }
    
    console.log("No existing due date event found for cycle", currentWeek);
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
        setCycleData(cycleData);

        
        // Determine the current family-wide step based on progress
        let currentFamilyStep = cycleData.step || 1;
        
        // Initialize member progress with accurate step status
        const progress = {};
        familyMembers.forEach(member => {
          // Get stored progress or create default
          const memberData = cycleData.memberProgress?.[member.id] || {
            step: 1,
            completedSurvey: false,
            completedMeeting: false
          };
          
         // For parents, check if they've completed habits requirement and surveys
         if (member.role === 'parent') {
          // First check if surveys are completed - using multiple indicators
          const surveyCompleted = 
            memberData.completedSurvey || 
            member.weeklyCompleted?.[currentWeek-1]?.completed ||
            (member.status && member.status.toLowerCase().includes("survey done"));
          
          if (surveyCompleted) {
            // If survey is completed, set to step 3 (meeting phase)
            memberData.step = 3;
            memberData.completedSurvey = true;
  } 
  // Then check for habit completions
  else {
    // Check if this parent has habits with 5+ completions
    const parentHabits = Object.values(completedHabitInstances)
      .filter(instances => instances.some(instance => 
        instance.userId === member.id));
    
    const hasCompletedHabits = parentHabits.some(instances => instances.length >= 5);
    
    if (hasCompletedHabits) {
      memberData.step = 2; // Ready for survey
    } else {
      memberData.step = 1; // Still doing habits
    }
  }
}
 // For children, check if they've completed their survey
else if (member.role === 'child') {
  // Child's step is based on survey completion - check multiple indicators
  const surveyCompleted = 
    memberData.completedSurvey || 
    member.weeklyCompleted?.[currentWeek-1]?.completed ||
    (member.status && member.status.toLowerCase().includes("survey done"));
  
  if (surveyCompleted) {
    memberData.step = 3; // Move to step 3 if survey completed
    memberData.completedSurvey = true; // Make sure this is set
  } else {
    memberData.step = 2; // Otherwise remain at step 2 (survey phase)
  }
}
          
          progress[member.id] = memberData;
        });
        
        setMemberProgress(progress);
        
        // Compute overall cycle step based on member progress
        const allMembersProgress = Object.values(progress);
        const allCompletedHabits = allMembersProgress.every(p => p.step >= 2);
        const allCompletedSurveys = allMembersProgress.every(p => p.completedSurvey);
        
        // Update cycle step based on global progress
        if (allCompletedSurveys) {
          currentFamilyStep = 3; // Ready for family meeting
        } else if (allCompletedHabits) {
          currentFamilyStep = 2; // Survey phase
        } else {
          currentFamilyStep = 1; // Habit building phase
        }
        
        setCycleStep(currentFamilyStep);
        
        // Check if all family members have completed surveys to enable meeting
// Check if all family members have completed surveys to enable meeting
const allSurveysCompleted = familyMembers.every(member => {
  // Check multiple indicators of survey completion
  const hasCompletedSurvey = 
    progress[member.id]?.completedSurvey || 
    member.weeklyCompleted?.[currentWeek-1]?.completed ||
    (member.status && member.status.toLowerCase().includes("survey done"));
  
  return hasCompletedSurvey;
});

setCanScheduleMeeting(allSurveysCompleted);

// Update cycle progress data in Firebase if needed
// This only updates step to 3 to make the meeting available
// It does NOT mark the meeting as completed!
if (allSurveysCompleted && cycleStep < 3) {
  try {
    const familyRef = doc(db, "families", familyId);
    
    // Update the cycle progress to move to step 3
    await updateDoc(familyRef, {
      [`cycleProgress.${currentWeek}.step`]: 3,
      // Explicitly set meeting.completed to false to clear any incorrect state
      [`cycleProgress.${currentWeek}.meeting.completed`]: false
    });
    
    // Also update local state
    setCycleStep(3);
  } catch (error) {
    console.error("Error updating cycle progress:", error);
  }
}
        
        // Update cycle step based on global progress
if (allCompletedSurveys) {
  currentFamilyStep = 3; // Ready for family meeting
} else if (allCompletedHabits) {
  currentFamilyStep = 2; // Survey phase
} else {
  currentFamilyStep = 1; // Habit building phase
}

setCycleStep(currentFamilyStep);



// Update survey availability based on user role
if (selectedUser?.role === 'parent') {
  // For parents: Check if this specific parent has completed enough habits
  const currentUserProgress = progress[selectedUser.id];
  setCanTakeSurvey(currentUserProgress && currentUserProgress.step >= 2);
} else if (selectedUser?.role === 'child') {
  // For children: Always allow taking survey if ANY of these conditions are true:
  // 1. Any parent has completed habits (step >= 2)
  // 2. Overall cycle step is at least 2
  // 3. Any parent has completed survey 
  const anyParentCompleted = familyMembers
    .filter(m => m.role === 'parent')
    .some(parent => 
      progress[parent.id]?.step >= 2 || 
      progress[parent.id]?.completedSurvey ||
      parent.weeklyCompleted?.[currentWeek-1]?.completed
    );
  
  setCanTakeSurvey(anyParentCompleted || currentFamilyStep >= 2);
  
  // Log debug info
  console.log("Child survey availability:", {
    anyParentCompleted,
    currentFamilyStep,
    canTakeSurvey: anyParentCompleted || currentFamilyStep >= 2
  });
}
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
  
 // Replace the updateCycleDueDate function in src/components/dashboard/tabs/TasksTab.jsx

const updateCycleDueDate = async (newDate, eventDetails = {}) => {
  if (!familyId || !currentUser) return false;
  
  try {
    setIsProcessing(true);
    
    // Validate the date - ensure it's a valid Date object
    if (!(newDate instanceof Date) || isNaN(newDate.getTime())) {
      throw new Error("Invalid date provided");
    }
    
    console.log(`Updating cycle due date to: ${newDate.toLocaleDateString()}`);
    
    // Create a comprehensive event object
    const dueDateEvent = {
      title: eventDetails.title || `Cycle ${currentWeek} Due Date`,
      description: eventDetails.description || `Family meeting for Cycle ${currentWeek} to discuss survey results and set goals.`,
      dateTime: newDate.toISOString(),
      category: 'cycle-due-date',
      eventType: 'cycle-due-date',
      cycleNumber: currentWeek,
      universalId: `cycle-due-date-${familyId}-${currentWeek}`
    };
    
    // Use the EventStore directly
    let result;
    if (existingDueDateEvent && existingDueDateEvent.firestoreId) {
      // Update existing event
      result = await eventStore.updateEvent(
        existingDueDateEvent.firestoreId, 
        {
          ...dueDateEvent,
          start: {
            dateTime: newDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        },
        currentUser.uid
      );
    } else {
      // Create new event
      result = await eventStore.addEvent(dueDateEvent, currentUser.uid, familyId);
    }
    
    if (!result.success) {
      throw new Error(result.error || "Failed to update calendar");
    }
    
    // Update UI state
    setSurveyDue(newDate);
    
    // Update survey schedule in database for consistency
    await updateSurveySchedule(currentWeek, newDate);
    
    // Also update week status
    const updatedStatus = {
      ...weekStatus,
      [currentWeek]: {
        ...weekStatus[currentWeek],
        scheduledDate: newDate.toISOString()
      }
    };
    
    await DatabaseService.saveFamilyData({
      weekStatus: updatedStatus,
      updatedAt: new Date().toISOString()
    }, familyId);
    
    // Success message
    createCelebration(
      `Meeting Scheduled`, 
      true, 
      `Cycle ${currentWeek} meeting scheduled for ${newDate.toLocaleDateString()}`
    );
    
    setIsProcessing(false);
    return true;
  } catch (error) {
    console.error("Error updating cycle due date:", error);
    createCelebration("Update Failed", false, error.message || "Unknown error");
    setIsProcessing(false);
    return false;
  }
};

// src/components/dashboard/tabs/TasksTab.jsx (add this new function)

const cleanupDuplicateDueDateEvents = async () => {
  if (!familyId || !currentUser) return;
  
  try {
    console.log("Running duplicate event cleanup");
    
    // Get all events from CalendarService
    const events = await CalendarService.getEventsForUser(
      currentUser.uid,
      new Date(new Date().setDate(new Date().getDate() - 90)), // 90 days ago
      new Date(new Date().setDate(new Date().getDate() + 180))  // 180 days ahead
    );
    
    // Filter for current cycle due date events
    const titlePattern = new RegExp(`Cycle\\s*${currentWeek}\\s*Due\\s*Date`, 'i');
    const dueDateEvents = events.filter(event => 
      (event.category === 'cycle-due-date' || event.eventType === 'cycle-due-date' ||
       (event.title && titlePattern.test(event.title)) || 
       (event.summary && titlePattern.test(event.summary)))
    );
    
    if (dueDateEvents.length <= 1) {
      console.log("No duplicate events found. Nothing to clean up.");
      return;
    }
    
    console.log(`Found ${dueDateEvents.length} due date events for cycle ${currentWeek}. Keeping the newest.`);
    
    // Sort by date (most recent first)
    dueDateEvents.sort((a, b) => {
      // If there's a date difference, use that
      if (a.dateObj && b.dateObj) {
        return new Date(b.dateObj) - new Date(a.dateObj);
      }
      
      // Otherwise sort by creation/update time
      const timeA = a.updatedAt || a.createdAt || 0;
      const timeB = b.updatedAt || b.createdAt || 0;
      return new Date(timeB) - new Date(timeA);
    });
    
    // Keep the first (newest) event, delete others
    const keepEvent = dueDateEvents[0];
    const deleteEvents = dueDateEvents.slice(1);
    
    console.log(`Keeping event: ${keepEvent.title} (${keepEvent.firestoreId || keepEvent.id})`);
    console.log(`Deleting ${deleteEvents.length} duplicate events`);
    
    // Delete duplicates
    for (const event of deleteEvents) {
      if (event.firestoreId) {
        await CalendarService.deleteEvent(event.firestoreId, currentUser.uid);
        console.log(`Deleted duplicate event: ${event.title} (${event.firestoreId})`);
      }
    }
    
    // Force refresh calendar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
    }
    
    console.log("Duplicate cleanup complete");
  } catch (error) {
    console.error("Error cleaning up duplicate events:", error);
  }
};


// Add this function to TasksTab.jsx - much simpler and more direct approach
const forceCalendarDateSync = async () => {
  try {
    // Get events directly from CalendarService
    const events = await CalendarService.getEventsForUser(
      currentUser.uid,
      new Date(new Date().setDate(new Date().getDate() - 90)), // 90 days ago
      new Date(new Date().setDate(new Date().getDate() + 180))  // 180 days ahead
    );
    
    console.log("Attempting direct calendar sync with", events.length, "events");
    
    // Find cycle due date event for current week
    const dueEvent = events.find(event => 
      (event.category === 'cycle-due-date' || event.eventType === 'cycle-due-date') && 
      (event.cycleNumber === currentWeek || 
      (event.title && event.title.includes(`Cycle ${currentWeek}`)))
    );
    
    if (dueEvent) {
      console.log("Found calendar event for sync:", dueEvent);
      
      // Get the date from the event
      let eventDate;
      if (dueEvent.start?.dateTime) {
        eventDate = new Date(dueEvent.start.dateTime);
      } else if (dueEvent.dateTime) {
        eventDate = new Date(dueEvent.dateTime);
      } else if (dueEvent.dateObj) {
        eventDate = new Date(dueEvent.dateObj);
      }
      
      if (eventDate && !isNaN(eventDate.getTime())) {
        console.log("Directly setting surveyDue to calendar date:", eventDate);
        setSurveyDue(eventDate);
        
        // Force refresh UI
        setTimeout(() => {
          calculateNextSurveyDue();
        }, 100);
        
        return eventDate;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in direct calendar sync:", error);
    return null;
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
  
 // Replace the recordHabitInstance function with this updated version
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
      
      // Milestone reached - 5 or more completions
if (updatedInstances.length >= 5) {
  try {
    // Update the parent's cycle step in Firebase
    const familyRef = doc(db, "families", familyId);
    
    // First, get current cycle progress
    const familyDoc = await getDoc(familyRef);
    const currentCycleProgress = familyDoc.data()?.cycleProgress || {};
    const cycleProgressData = currentCycleProgress[currentWeek] || {
      step: 1,
      memberProgress: {}
    };
    
    // Update this parent's progress
    cycleProgressData.memberProgress = {
      ...(cycleProgressData.memberProgress || {}),
      [selectedUser.id]: {
        ...(cycleProgressData.memberProgress?.[selectedUser.id] || {}),
        step: 2
      }
    };
    
    // Check if all parents have reached step 2
    const allParents = familyMembers.filter(m => m.role === 'parent');
    const allParentsReady = allParents.every(parent => {
      // Either this parent we're updating, or already at step 2+
      return parent.id === selectedUser.id || 
             (cycleProgressData.memberProgress?.[parent.id]?.step >= 2);
    });
    
    // If all parents have reached 5 completions, move whole cycle to step 2
    if (allParentsReady) {
      cycleProgressData.step = 2;
    }
    
    // Save to Firebase
    await updateDoc(familyRef, {
      [`cycleProgress.${currentWeek}`]: cycleProgressData
    });
    
    // Update local state
    setMemberProgress(prev => ({
      ...prev,
      [selectedUser.id]: {
        ...prev[selectedUser.id],
        step: 2
      }
    }));
    
    // If moved to step 2, update cycle step
    if (allParentsReady) {
      setCycleStep(2);
    }
    
    // Trigger cycle progress refresh
    loadCycleProgress();
  } catch (error) {
    console.error("Error updating cycle progress:", error);
  }
  
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
  

  const createNewHabit = async (isRefresh = false) => {
    try {
      setAllieIsThinking(true);
      
      // More varied habit options for better user experience
      const habitOptions = [
        {
          title: "Family Calendar Check-in",
          description: "Take a moment each day to review the family calendar",
          cue: "After breakfast",
          action: "Check the family calendar for today's events",
          reward: "Feel organized and prepared for the day",
          identity: "I am someone who stays on top of family commitments"
        },
        {
          title: "Evening Tidy-up",
          description: "Spend 5 minutes tidying a shared family space",
          cue: "After dinner",
          action: "Set a 5-minute timer and tidy one area",
          reward: "Enjoy a cleaner space and reduced stress",
          identity: "I am someone who contributes to family organization"
        },
        {
          title: "Meal Planning Check-in",
          description: "Review upcoming meal plans and grocery needs",
          cue: "Before breakfast",
          action: "Check meal plan and shopping list",
          reward: "Feel prepared and reduce decision fatigue",
          identity: "I am someone who helps manage family nutrition"
        }
      ];
      
      // Select a habit option (randomly if refreshing, first option if new)
      const selectedOption = isRefresh 
        ? habitOptions[Math.floor(Math.random() * habitOptions.length)]
        : habitOptions[0];
      
      // Destructure the selected habit data
      const { title, description, cue, action, reward, identity } = selectedOption;
      
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
        
        // Clear previous non-user habit instances from state if refreshing
        if (isRefresh) {
          const systemHabit = habits.find(h => !h.isUserGenerated);
          if (systemHabit) {
            // Clear the completions from state
            setCompletedHabitInstances(prev => {
              const newState = {...prev};
              delete newState[systemHabit.id];
              return newState;
            });
            
            // Attempt to clean up old habit instances in database
            try {
              const habitInstanceRef = doc(db, "families", familyId, "habitInstances", systemHabit.id);
              await updateDoc(habitInstanceRef, {
                instances: [],
                refreshed: true,
                refreshedAt: new Date().toISOString()
              });
            } catch (cleanupError) {
              console.warn("Non-critical error cleaning up old habit:", cleanupError);
              // Continue even if this fails
            }
          }
        }
        
        // If refreshing, first remove the initial habit
        let updatedTasks = [...currentTasks];
        if (isRefresh) {
          // Find and remove ALL non-user-generated habits to prevent duplicates
          const systemHabitIds = habits
            .filter(h => !h.isUserGenerated)
            .map(h => h.id);
          
          // Remove all system-generated habits from the tasks array
          updatedTasks = updatedTasks.filter(t => !systemHabitIds.includes(t.id));
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
          assignedTo: selectedUser?.roleType || selectedUser?.role || "Everyone",
          assignedToName: selectedUser?.name || "Everyone",
          category: identity.includes("parent") ? "Parental Tasks" : "Household Tasks",
          insight: `This habit helps build your identity as someone who values family balance.`,
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
        await setDoc(doc(db, "families", familyId, "habitInstances", taskId), {
          instances: [],
          createdAt: new Date().toISOString(),
          isSystemGenerated: !newHabit.isUserGenerated
        });
        
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

  const handleStartSurvey = () => {
    // Only check for FULLY completed surveys, not partially completed ones
    const userProgress = memberProgress[selectedUser.id] || {};
    
    // Look for definite completion markers, not just progress markers
    const hasFullyCompleted = 
      // Check for explicit true completion flag
      (userProgress.completedSurvey === true) || 
      // Check weekly completed explicitly marked as true
      (selectedUser.weeklyCompleted && 
       selectedUser.weeklyCompleted[currentWeek-1]?.completed === true);
    
    // Don't use step >= 3 since that might be triggered by partial completion
    
    // Already completed check - only block if FULLY completed
    if (hasFullyCompleted) {
      createCelebration("Already Completed", false, "You've already completed the survey for this cycle.");
      return;
    }
    
    if (selectedUser.role === 'parent') {
      // For parents: Check if they personally have enough habits
      const parentHabits = Object.values(completedHabitInstances).filter(instances => 
        instances.some(instance => instance.userId === selectedUser.id));
      const hasEnoughCompletions = parentHabits.some(instances => instances.length >= 5);
      
      if (hasEnoughCompletions) {
        onStartWeeklyCheckIn();
      } else {
        createCelebration("Not Ready Yet", false, "Complete a habit at least 5 times to unlock the survey.");
      }
    } else {
      // For children: They can take the survey if ANY of these are true:
      // 1. Cycle is in step 2+
      // 2. Any parent has reached step 2+
      // 3. canTakeSurvey is true (which can be set by other conditions)
      const anyParentCompleted = familyMembers
        .filter(m => m.role === 'parent')
        .some(parent => {
          const progress = memberProgress[parent.id] || {};
          return progress.step >= 2 || 
                 progress.completedSurvey || 
                 parent.weeklyCompleted?.[currentWeek-1]?.completed;
        });
      
      if (cycleStep >= 2 || anyParentCompleted || canTakeSurvey) {
        onStartWeeklyCheckIn();
      } else {
        createCelebration("Not Ready Yet", false, "Parents need to complete their habits first.");
      }
    }
  };
  
  // Trigger Allie chat with event-based approach
const triggerAllieChat = (message) => {
  console.log("Triggering Allie chat with message:", message);
  
  // Dispatch a custom event that AllieChat will listen for
  const event = new CustomEvent('open-allie-chat', { 
    detail: { message }
  });
  window.dispatchEvent(event);
  
  // Show a subtle confirmation to the user
  createCelebration("Asking Allie", true, "Opening chat and asking about habits...");
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
      {/* Replace with CycleJourney component */}
      <CycleJourney
  cycleType="family"
  currentCycle={currentWeek}
  cycleData={{
    meeting: {
      scheduled: !!meetingDate,
      scheduledDate: meetingDate || null,
      completed: cycleData?.meeting?.completed === true
    },
    // Add explicit survey status
    survey: {
      enabled: canTakeSurvey,
      // Only true when completed is explicitly true
      completed: selectedUser?.weeklyCompleted?.[currentWeek-1]?.completed === true
    }
  }}
  familyMembers={familyMembers}
  currentUser={selectedUser}
  memberProgress={memberProgress}
  onStartStep={(action, step) => {
    if (action === "habit") {
      // Find first uncompleted habit
      const firstHabit = habits.find(h => !h.completed);
      if (firstHabit) {
        setSelectedHabit(firstHabit);
        setShowHabitDetail(firstHabit.id);
      } else {
        createNewHabit();
      }
    }
    else if (action === "survey") handleStartSurvey();
    else if (action === "meeting") onOpenFamilyMeeting();
  }}
  dueDate={surveyDue}
  onChangeDueDate={() => setShowCalendar(true)}
  loading={loading}
/>

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
    // More robust check for ANY habit completions
    const hasCompletions = Object.values(completedHabitInstances).some(
      instances => instances && instances.length > 0
    );
    
    if (hasCompletions) {
      if (window.confirm("This will replace your current system habit. Any habit completion progress will be lost. Continue?")) {
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
  
  {/* Habit explanation section */}
{!loading && userHabits.length > 0 && userHabits.some(h => !h.isUserGenerated) && (
  <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
    <div className="flex items-start">
      <Info size={18} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-medium text-blue-800 mb-1">Why Allie recommended this habit:</h4>
        <p className="text-blue-800" 
           dangerouslySetInnerHTML={{ 
             __html: generateHabitExplanation(userHabits.find(h => !h.isUserGenerated)) 
           }}>
        </p>
      </div>
    </div>
  </div>
)}
  
  {loading ? (          <div className="p-8 flex justify-center">
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
    className="border-2 border-gray-200 rounded-lg overflow-hidden transition-all duration-300 transform hover:shadow-lg bg-white shadow-sm"
  >
    {/* Habit card */}
    <div className="p-6">
      <div className="flex flex-col">
        {/* Habit header with enhanced typography */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h4 className="font-bold text-xl mb-2">{habit.title}</h4>
            <p className="text-md text-gray-700 font-medium">{habit.description}</p>
          </div>
          
          {/* Enhanced streak badge */}
          <div className="flex items-center bg-amber-100 px-3 py-2 rounded-full text-amber-800 text-sm font-bold border border-amber-200 shadow-sm ml-3 streak-badge">
            <Flame size={16} className="mr-2 text-amber-500" />
            <span>{habit.streak} day{habit.streak !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {/* Enhanced cue, routine, reward pattern with distinct colors */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="rounded-lg overflow-hidden shadow-sm border border-blue-100">
            <div className="bg-blue-600 text-white font-medium px-3 py-2 text-center">Cue</div>
            <div className="bg-blue-50 p-3 min-h-16 flex items-center justify-center text-center font-medium">
              {habit.cue || "After breakfast"}
            </div>
          </div>
          
          <div className="rounded-lg overflow-hidden shadow-sm border border-green-100">
            <div className="bg-green-600 text-white font-medium px-3 py-2 text-center">Routine</div>
            <div className="bg-green-50 p-3 min-h-16 flex items-center justify-center text-center font-medium">
              {habit.action || habit.title}
            </div>
          </div>
          
          <div className="rounded-lg overflow-hidden shadow-sm border border-purple-100">
            <div className="bg-purple-600 text-white font-medium px-3 py-2 text-center">Reward</div>
            <div className="bg-purple-50 p-3 min-h-16 flex items-center justify-center text-center font-medium">
              {habit.reward || "Feel accomplished"}
            </div>
          </div>
        </div>
        
        {/* Enhanced identity statement */}
        <div className="my-4 text-sm px-4 py-3 bg-black text-white rounded-lg font-medium text-center shadow-sm identity-badge">
          {habit.identity || "I am someone who values balance"}
        </div>
        
        {/* Enhanced completion progress */}
        <div className="mt-6 mb-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">Completion Progress</span>
            <span className="text-sm font-bold px-2 py-1 bg-gray-200 rounded-full">
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow ${
                    isCompleted 
                      ? isComplete
                        ? 'bg-green-500 text-white pulse-animation'
                        : isMinimumReached
                          ? 'bg-blue-500 text-white pulse-animation'
                          : 'bg-black text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted && <Check size={16} />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-bold text-gray-600">Start</span>
            <span className="text-xs font-bold text-blue-600">
              Survey Unlocked (5)
            </span>
            <span className="text-xs font-bold text-green-600">
              Habit Mastered!
            </span>
          </div>
        </div>
        
        {/* Enhanced action buttons */}
        <div className="mt-4 flex justify-between items-center">
          <div className="space-x-2">
            {habit.isUserGenerated && (
              <button
                onClick={() => deleteHabit(habit.id)}
                className="text-sm flex items-center bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-md border border-red-100 shadow-sm"
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
            className="px-4 py-3 bg-black text-white text-md rounded-md hover:bg-gray-800 flex items-center font-bold shadow-sm completion-button"
          >
            <CheckCircle size={16} className="mr-2" />
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
      
      {/* Habit detail/log modal - Replace the current showHabitDetail modal with this */}
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
      

{/* Calendar floating widget with embedded event editor */}
{showCalendar && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <EnhancedEventManager
        initialEvent={existingDueDateEvent || {
          title: `Cycle ${currentWeek} Due Date`,
          description: `Family meeting for Cycle ${currentWeek} to discuss survey results and set goals.`,
          dateTime: datePickerDate instanceof Date && !isNaN(datePickerDate.getTime()) 
            ? datePickerDate.toISOString() 
            : new Date().toISOString(),
          category: 'cycle-due-date',
          eventType: 'cycle-due-date',
          cycleNumber: currentWeek
        }}
        onSave={async (event) => {
          try {
            // More robust date extraction
            console.log("Raw event for saving:", event);
            
            let newDate;
            
            // Try all possible date fields with detailed logging
            if (event.start?.dateTime) {
              newDate = new Date(event.start.dateTime);
              console.log("Using start.dateTime:", event.start.dateTime);
            } else if (event.dateTime) {
              newDate = new Date(event.dateTime);
              console.log("Using dateTime:", event.dateTime);
            } else if (event.date) {
              newDate = new Date(event.date);
              console.log("Using date:", event.date);
            } else if (event.start?.date) {
              newDate = new Date(event.start.date);
              console.log("Using start.date:", event.start.date);
            } else {
              // As a last resort, try to extract date from the form fields directly
              const dateField = document.querySelector('input[type="date"]');
              const timeField = document.querySelector('input[type="time"]');
              
              if (dateField && dateField.value && timeField && timeField.value) {
                const dateTimeStr = `${dateField.value}T${timeField.value}`;
                newDate = new Date(dateTimeStr);
                console.log("Using form fields:", dateTimeStr);
              } else {
                newDate = new Date();
                console.warn("No date found anywhere, using current date");
              }
            }
            
            // Ensure the date is valid
            if (isNaN(newDate.getTime())) {
              console.error("Invalid date from event:", event);
              createCelebration("Error", false, "Invalid date. Please try again with a valid date.");
              return;
            }
            
            console.log("Saving event with date:", newDate, "Event:", event);
            
            // Create a comprehensive event details object with ALL properties
            const eventDetails = {
              title: event.title || event.summary,
              summary: event.summary || event.title,
              description: event.description,
              location: event.location,
              // Pass ALL possible IDs to ensure we find the right event
              id: event.id,
              eventId: event.id || event.eventId,
              firestoreId: event.firestoreId || existingDueDateEvent?.firestoreId,
              universalId: event.universalId || existingDueDateEvent?.universalId,
              // Always include category and eventType  
              category: 'cycle-due-date',
              eventType: 'cycle-due-date',
              // Always include cycle number
              cycleNumber: currentWeek
            };
            
            const success = await updateCycleDueDate(newDate, eventDetails);
            
            if (success) {
              // Force refresh of calendar components with greater reliability
              if (typeof window !== 'undefined') {
                // Immediate refresh
                window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
                
                // Delayed refresh to catch components that might initialize later
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
                }, 300);
              }
              
              // Also update our local UI immediately
              setSurveyDue(newDate);
              calculateNextSurveyDue();
              
              // Force a refresh of the existingDueDateEvent
              findExistingDueDateEvent().then(() => {
                console.log("Re-fetched event after update");
              }).catch(error => {
                console.warn("Error re-fetching event:", error);
              });
              
              setShowCalendar(false);
            }
          } catch (error) {
            console.error("Error in calendar save handler:", error);
            createCelebration("Error", false, "Failed to update due date: " + (error.message || "Please try again."));
          }
        }}
        onCancel={() => setShowCalendar(false)}
        eventType="meeting"
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
  
  /* New animations for habit card */
  .streak-badge {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
    100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  }
  
  .completion-button {
    transition: all 0.2s ease;
  }
  
  .completion-button:hover {
    transform: scale(1.05);
  }
  
  .identity-badge {
    position: relative;
    overflow: hidden;
  }
  
  .identity-badge:after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0) 100%
    );
    animation: shine 3s infinite;
  }
  
  @keyframes shine {
    to {
      left: 100%;
    }
  }
  
  .pulse-animation {
    animation: pulseBg 2s infinite;
  }
  
  @keyframes pulseBg {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`}</style>
    </div>
  );
};

export default TasksTab;