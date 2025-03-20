import React, { useState, useEffect } from 'react';
import { Users, Calendar, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Sparkles, Brain, 
         Info, CheckCircle2, Target, Heart, Camera, HelpCircle } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DatabaseService from '../../../services/DatabaseService';
import CoupleCheckInScreen from '../../assessment/CoupleCheckInScreen';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

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
  
  // Main states
  const [taskRecommendations, setTaskRecommendations] = useState([]);
  const [kidTasksCompleted, setKidTasksCompleted] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [kidTaskComments, setKidTaskComments] = useState({});
  const [kidTaskPictures, setKidTaskPictures] = useState({});
  const [taskReactions, setTaskReactions] = useState({});
  const [selectedTaskForEmoji, setSelectedTaskForEmoji] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showCoupleCheckIn, setShowCoupleCheckIn] = useState(false);
  const [savingTasks, setSavingTasks] = useState({});
  const [saveErrors, setSaveErrors] = useState({});

  // Check-in related states
  const [canStartCheckIn, setCanStartCheckIn] = useState(false);
  const [canStartCoupleCheckIn, setCanStartCoupleCheckIn] = useState(false);
  const [daysUntilCheckIn, setDaysUntilCheckIn] = useState(6);
  
  // Date management
  const [checkInDueDate, setCheckInDueDate] = useState(null);
  const [checkInDueDateInput, setCheckInDueDateInput] = useState('');
  
  // Calculate due date based on survey schedule if available
  const calculateDueDate = () => {
    if (surveySchedule && surveySchedule[currentWeek]) {
      return new Date(surveySchedule[currentWeek]);
    } else {
      // Default to 7 days from the start of the week
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
    
    if (!dueDate) return 7;
    
    // Calculate difference in days
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Initialize and update date-related states
  useEffect(() => {
    const due = calculateDueDate();
    setCheckInDueDate(due);
    setCheckInDueDateInput(due.toISOString().split('T')[0]);
    setDaysUntilCheckIn(calculateDaysUntilCheckIn());
  }, [surveySchedule, currentWeek]);

  // Effect to update check-in availability
  useEffect(() => {
    // Update days until check-in
    setDaysUntilCheckIn(calculateDaysUntilCheckIn());
    
    // Determine if check-in can be started (available if it's due within 2 days)
    const canStart = calculateDaysUntilCheckIn() <= 2;
    setCanStartCheckIn(canStart);
    
    // Determine if couple check-in can be started
    // Only allow after weekly check-in is completed by at least one parent
    const parentCompleted = familyMembers
      .filter(m => m.role === 'parent')
      .some(m => m.weeklyCompleted && m.weeklyCompleted[currentWeek-1]?.completed);
    
    setCanStartCoupleCheckIn(parentCompleted);
  }, [checkInDueDate, familyMembers, currentWeek]);

  // Load tasks for the current week - with enhanced reliability
  useEffect(() => {
    const loadTasks = async () => {
      try {
        console.log(`Loading tasks for Week ${currentWeek}, user:`, selectedUser?.name);
        console.log('Completed weeks:', completedWeeks);
        
        let tasks = [];
        
        if (familyId) {
          // Method 1: Use DatabaseService directly
          try {
            tasks = await DatabaseService.getTasksForWeek(familyId, currentWeek);
            console.log(`Tasks loaded from Firebase for Week ${currentWeek}:`, tasks?.length || 0);
          } catch (error) {
            console.error("Error loading tasks from DatabaseService:", error);
          }
          
          // Method 2: If that fails, try direct Firestore query
          if (!tasks || tasks.length === 0) {
            try {
              console.log("Trying direct Firestore query...");
              const docRef = doc(db, "families", familyId);
              const familyDoc = await getDoc(docRef);
              
              if (familyDoc.exists()) {
                const familyData = familyDoc.data();
                tasks = familyData.tasks || [];
                console.log(`Tasks loaded directly from Firestore:`, tasks.length);
              }
            } catch (dbError) {
              console.error("Error on direct Firestore query:", dbError);
            }
          }
          
          // Method 3: Use context method
          if (!tasks || tasks.length === 0) {
            try {
              console.log("Trying context loadCurrentWeekTasks...");
              tasks = await loadCurrentWeekTasks();
              console.log(`Tasks loaded from context:`, tasks?.length || 0);
            } catch (contextError) {
              console.error("Error loading tasks from context:", contextError);
            }
          }
          
          // Also load kid tasks
          try {
            const familyData = await DatabaseService.loadFamilyData(familyId);
            if (familyData && familyData.kidTasks) {
              setKidTasksCompleted(familyData.kidTasks);
              console.log("Kid tasks loaded:", familyData.kidTasks);
            }
          } catch (kidTasksError) {
            console.error("Error loading kid tasks:", kidTasksError);
          }
        }
        
        if (tasks && tasks.length > 0) {
          console.log("Setting task recommendations with loaded data:", tasks.length);
          setTaskRecommendations(tasks);
        } else {
          console.warn("No tasks found for current week. This should not happen in production.");
          // In production, your AI service would generate tasks here
          setTaskRecommendations([]);
        }
      } catch (error) {
        console.error(`Error in loadTasks for Week ${currentWeek}:`, error);
        setTaskRecommendations([]);
      }
    };
    
    loadTasks();
  }, [familyId, currentWeek, selectedUser]);

  // Force reload on visibility change to keep data fresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && familyId) {
        console.log("Document visible again, reloading tasks...");
        loadCurrentWeekTasks().then(freshTasks => {
          if (freshTasks && freshTasks.length > 0) {
            console.log("Fresh tasks loaded on visibility change:", freshTasks.length);
            setTaskRecommendations(freshTasks);
          }
        }).catch(error => {
          console.error("Error reloading tasks on visibility change:", error);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [familyId, loadCurrentWeekTasks]);

  // Handle date update for check-in
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
      
      // Show success message
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

  // Check if weekly check-in is completed for this week
  const weeklyCheckInCompleted = familyMembers.every(member => 
    member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed
  );
  
  // Count completed tasks for family meeting eligibility
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
  
  // Whether family meeting can be started
  const enoughTasksCompleted = countCompletedTasks() >= 3;
  const canStartFamilyMeeting = weeklyCheckInCompleted && enoughTasksCompleted;
  
  // Check if user can complete a task
  const canCompleteTask = (task) => {
    // Only a parent can complete tasks assigned to their role type (Mama or Papa)
    return selectedUser && 
           selectedUser.role === 'parent' && 
           (selectedUser.name === task.assignedToName || 
            selectedUser.roleType === task.assignedTo);
  };

  // Handle task completion - ENHANCED FOR BETTER PERSISTENCE
  const handleTaskCompletion = async (taskId, isCompleted) => {
    if (!selectedUser) {
      console.error("No user selected");
      alert("Please select a user profile first");
      return;
    }
    
    if (!familyId) {
      console.error("No family ID available");
      alert("Family data not loaded correctly. Please refresh the page.");
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
        alert("Only parents can mark tasks as complete.");
      } else {
        alert(`Only ${task.assignedTo} can mark this task as complete.`);
      }
      return;
    }

    // Set saving state for this task
    setSavingTasks(prev => ({ ...prev, [taskId]: true }));
    setSaveErrors(prev => ({ ...prev, [taskId]: null }));
    
    try {
      // Create completion timestamp
      const completedDate = isCompleted ? new Date().toISOString() : null;
      console.log(`Marking task ${taskId} as ${isCompleted ? 'completed' : 'incomplete'} for Week ${currentWeek}`);
      
      // Update local state immediately for UI responsiveness
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
      
      setTaskRecommendations(updatedTasks);
      
      // MULTI-LAYERED UPDATE APPROACH FOR MAXIMUM RELIABILITY
      
      // Track success of each method
      let methodSuccess = {
        method1: false,
        method2: false,
        method3: false
      };
      
      // 1. Update via the context method
      try {
        await updateTaskCompletion(taskId, isCompleted);
        methodSuccess.method1 = true;
        console.log("Method 1: Context update successful");
      } catch (error) {
        console.error("Method 1 failed:", error);
      }
      
      // 2. Direct Firestore update
      try {
        console.log("Method 2: Directly updating task completion in Firebase...");
        const docRef = doc(db, "families", familyId);
        const familyDoc = await getDoc(docRef);
        
        if (familyDoc.exists()) {
          const familyData = familyDoc.data();
          const currentTasks = familyData.tasks || [];
          
          // Update the specific task
          const updatedDBTasks = currentTasks.map(t => {
            if (t.id.toString() === taskId.toString()) {
              console.log(`Updating task ${t.id} in database, setting completed=${isCompleted}`);
              return {
                ...t,
                completed: isCompleted,
                completedDate: completedDate
              };
            }
            return t;
          });
          
          // Save back to database
          await updateDoc(docRef, {
            tasks: updatedDBTasks,
            updatedAt: new Date().toISOString()
          });
          
          methodSuccess.method2 = true;
          console.log("Method 2: Direct Firestore update successful");
        }
      } catch (error) {
        console.error("Method 2 failed:", error);
      }
      
      // 3. Using DatabaseService
      try {
        await DatabaseService.updateTaskCompletion(familyId, taskId, isCompleted, completedDate);
        methodSuccess.method3 = true;
        console.log("Method 3: DatabaseService update successful");
      } catch (error) {
        console.error("Method 3 failed:", error);
      }
      
      // Check if any method succeeded
      const anyMethodSucceeded = methodSuccess.method1 || methodSuccess.method2 || methodSuccess.method3;
      
      if (!anyMethodSucceeded) {
        console.error("All task save methods failed!");
        setSaveErrors(prev => ({ 
          ...prev, 
          [taskId]: "Failed to save completion status. Please try again." 
        }));
      } else {
        console.log("Task completion saved successfully through at least one method");
      }
      
      // Reload tasks after a short delay to verify the data was saved
      setTimeout(async () => {
        try {
          console.log("Verifying task data was saved...");
          const freshTasks = await loadCurrentWeekTasks();
          if (freshTasks && freshTasks.length > 0) {
            // Check if our task is properly updated in the fresh data
            const freshTask = freshTasks.find(t => t.id.toString() === taskId.toString());
            if (freshTask && freshTask.completed === isCompleted) {
              console.log("Task completion verified in fresh data");
            } else {
              console.warn("Task completion not verified in fresh data, forcing update");
              // Try one more direct update
              const docRef = doc(db, "families", familyId);
              await updateDoc(docRef, {
                [`tasks.${freshTasks.findIndex(t => t.id.toString() === taskId.toString())}.completed`]: isCompleted,
                [`tasks.${freshTasks.findIndex(t => t.id.toString() === taskId.toString())}.completedDate`]: completedDate,
                updatedAt: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error("Error verifying task data:", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error completing task:", error);
      setSaveErrors(prev => ({ 
        ...prev, 
        [taskId]: "Error saving task: " + error.message 
      }));
    } finally {
      // Clear saving state
      setSavingTasks(prev => ({ ...prev, [taskId]: false }));
    }
  };
  
  // New function to handle task completion with comment
  const handleCompleteWithComment = async (taskId) => {
    if (!selectedUser || !commentInputs[taskId]?.trim()) return;
    
    // Set submitting state
    setIsSubmittingComment(true);
    setSavingTasks(prev => ({ ...prev, [taskId]: true }));
    
    try {
      // First add the comment
      console.log(`Adding comment to task ${taskId}: "${commentInputs[taskId]}"`);
      const commentResult = await addTaskComment(taskId, commentInputs[taskId]);
      
      // Then immediately mark task as completed
      console.log(`Marking task ${taskId} as completed after adding comment`);
      await handleTaskCompletion(taskId, true);
      
      // Update local state to show the new comment
      const updatedTasks = taskRecommendations.map(task => {
        if (task.id.toString() === taskId.toString()) {
          return {
            ...task,
            completed: true,
            completedDate: new Date().toISOString(),
            comments: [...(task.comments || []), {
              id: commentResult?.id || Date.now(),
              userId: selectedUser.id,
              userName: selectedUser.name,
              text: commentInputs[taskId],
              timestamp: new Date().toLocaleString()
            }]
          };
        }
        return task;
      });
      
      setTaskRecommendations(updatedTasks);
      console.log("Task marked complete with comment");
      
    } catch (error) {
      console.error("Error completing task with comment:", error);
      setSaveErrors(prev => ({ 
        ...prev, 
        [taskId]: "Error saving: " + error.message 
      }));
    } finally {
      setIsSubmittingComment(false);
      setSavingTasks(prev => ({ ...prev, [taskId]: false }));
      
      // Clear the input but don't remove it from state entirely
      setCommentInputs(prev => ({...prev, [taskId]: ''}));
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
  
  // Open emoji picker for reactions
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

  // Calculate task completion by parent
  const calculateParentTaskCompletion = () => {
    // Initialize counters
    const completion = {
      Mama: { assigned: 0, completed: 0 },
      Papa: { assigned: 0, completed: 0 }
    };
    
    // Count assigned and completed tasks for each parent
    taskRecommendations.forEach(task => {
      if (task.assignedTo === 'Mama') {
        completion.Mama.assigned++;
        if (task.completed) completion.Mama.completed++;
      } else if (task.assignedTo === 'Papa') {
        completion.Papa.assigned++;
        if (task.completed) completion.Papa.completed++;
      }
    });
    
    return completion;
  };
  
  // Task completion by parent
  const parentTaskCompletion = calculateParentTaskCompletion();

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
            
            {/* Date editor */}
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
            
            {/* Family member completion tracking */}
            <div className="bg-white p-3 rounded border mb-3">
              <h4 className="text-sm font-medium mb-2 font-roboto">Check-in Completion:</h4>
              <div className="flex flex-wrap gap-1 mb-3">
                {familyMembers.map(member => (
                  <div 
                    key={member.id} 
                    className={`px-2 py-1 rounded-full text-xs flex items-center ${
                      member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                    title={`${member.name}: ${member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed ? 'Completed' : 'Not completed'}`}
                  >
                    <div className="w-4 h-4 rounded-full flex items-center justify-center mr-1 bg-white">
                      {member.weeklyCompleted && member.weeklyCompleted[currentWeek-1]?.completed ? '✓' : '!'}
                    </div>
                    <span className="font-roboto">{member.name}</span>
                  </div>
                ))}
              </div>
              
              {/* NEW: Task completion tracking by parent */}
              <h4 className="text-sm font-medium mb-2 font-roboto">Task Completion:</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-roboto">Mama: {parentTaskCompletion.Mama.completed}/{parentTaskCompletion.Mama.assigned} tasks</span>
                    <span className="font-roboto">{parentTaskCompletion.Mama.assigned > 0 
                      ? Math.round((parentTaskCompletion.Mama.completed / parentTaskCompletion.Mama.assigned) * 100) 
                      : 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ 
                        width: `${parentTaskCompletion.Mama.assigned > 0 
                          ? (parentTaskCompletion.Mama.completed / parentTaskCompletion.Mama.assigned) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-roboto">Papa: {parentTaskCompletion.Papa.completed}/{parentTaskCompletion.Papa.assigned} tasks</span>
                    <span className="font-roboto">{parentTaskCompletion.Papa.assigned > 0 
                      ? Math.round((parentTaskCompletion.Papa.completed / parentTaskCompletion.Papa.assigned) * 100) 
                      : 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ 
                        width: `${parentTaskCompletion.Papa.assigned > 0 
                          ? (parentTaskCompletion.Papa.completed / parentTaskCompletion.Papa.assigned) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
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
        </div>
        
        <div className="space-y-4">
          {/* Papa's Tasks */}
          <div className="border-l-4 border-blue-500 p-2">
            <h4 className="font-medium mb-2 text-lg font-roboto">Papa's Tasks</h4>
            <div className="space-y-3">
              {taskRecommendations
                .filter(task => task.assignedTo === "Papa")
                .map(task => (
                  <div key={task.id} className={`rounded-lg border shadow ${task.completed ? 'bg-green-50' : 'bg-white'}`}>
                    {/* Main task header */}
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          task.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {task.completed ? <CheckCircle size={16} /> : <Target size={16} />}
                        </div>
                          
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
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
                          
                          {/* SECTION 1: Survey Insights / AI Insights */}
                          {(task.insight || (task.taskType === 'ai' && task.insight)) && (
                            <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-200">
                              <div className="flex items-start">
                                <Info size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-blue-900 text-sm mb-1 font-roboto">
                                    {task.taskType === 'ai' ? 'AI Insight:' : 'Survey Insight:'}
                                  </h5>
                                  <p className="text-sm text-blue-800 font-roboto">{task.insight}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* SECTION 2: How to Complete This Task */}
                          <div className="mt-4">
                            <h5 className="font-medium text-sm mb-2 font-roboto">How to Complete This Task:</h5>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm font-roboto">
                              <p>{task.details || "Choose one task that your partner usually handles and complete it fully, from start to finish."}</p>
                            </div>
                          </div>
                          
                          {/* SECTION 3: Comments Section with Always-Visible Input */}
                          <div className="mt-4 pt-4 border-t">
                            <h5 className="text-sm font-medium mb-2 font-roboto">
                              {task.completed ? 'Your Completion Notes:' : 'Describe How You Completed This Task:'}
                            </h5>
                            
                            {/* Existing comments */}
                            {renderComments(task.comments)}
                            
                            {/* Always-visible comment input */}
                            {!task.completed && canCompleteTask(task) && (
                              <div>
                                <textarea
                                  className="w-full border rounded p-2 text-sm font-roboto mb-2"
                                  rows="3"
                                  placeholder="Describe what you did and what you learned from this task..."
                                  value={commentInputs[task.id] || ''}
                                  onChange={(e) => setCommentInputs({...commentInputs, [task.id]: e.target.value})}
                                  disabled={isSubmittingComment || savingTasks[task.id]}
                                ></textarea>
                                
                                {/* Error message if saving failed */}
                                {saveErrors[task.id] && (
                                  <div className="text-xs text-red-600 mb-2 font-roboto">
                                    {saveErrors[task.id]}
                                  </div>
                                )}
                                
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleCompleteWithComment(task.id)}
                                    disabled={!commentInputs[task.id]?.trim() || isSubmittingComment || savingTasks[task.id]}
                                    className="px-4 py-2 bg-green-500 text-white rounded flex items-center font-roboto disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    {savingTasks[task.id] ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Mark Complete
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Completion status notification */}
                            {task.completed && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                                <CheckCircle className="inline-block text-green-600 mr-2" size={16} />
                                <span className="text-green-800 font-medium font-roboto">
                                  Task completed on {formatDate(task.completedDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Mama's Tasks - Now with IDENTICAL DESIGN to Papa's Tasks */}
          <div className="border-l-4 border-purple-500 p-2">
            <h4 className="font-medium mb-2 text-lg font-roboto">Mama's Tasks</h4>
            <div className="space-y-3">
              {taskRecommendations
                .filter(task => task.assignedTo === "Mama")
                .map(task => (
                  <div key={task.id} className={`rounded-lg border shadow ${task.completed ? 'bg-green-50' : 'bg-white'}`}>
                    {/* Main task header */}
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          task.completed ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {task.completed ? <CheckCircle size={16} /> : <Target size={16} />}
                        </div>
                          
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
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
                          
                          {/* SECTION 1: Survey Insights / AI Insights */}
                          {(task.insight || (task.taskType === 'ai' && task.insight)) && (
                            <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-200">
                              <div className="flex items-start">
                                <Info size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-blue-900 text-sm mb-1 font-roboto">
                                    {task.taskType === 'ai' ? 'AI Insight:' : 'Survey Insight:'}
                                  </h5>
                                  <p className="text-sm text-blue-800 font-roboto">{task.insight}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* SECTION 2: How to Complete This Task */}
                          <div className="mt-4">
                            <h5 className="font-medium text-sm mb-2 font-roboto">How to Complete This Task:</h5>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm font-roboto">
                              <p>{task.details || "Choose one task that your partner usually handles and complete it fully, from start to finish."}</p>
                            </div>
                          </div>
                          
                          {/* SECTION 3: Comments Section with Always-Visible Input */}
                          <div className="mt-4 pt-4 border-t">
                            <h5 className="text-sm font-medium mb-2 font-roboto">
                              {task.completed ? 'Your Completion Notes:' : 'Describe How You Completed This Task:'}
                            </h5>
                            
                            {/* Existing comments */}
                            {renderComments(task.comments)}
                            
                            {/* Always-visible comment input */}
                            {!task.completed && canCompleteTask(task) && (
                              <div>
                                <textarea
                                  className="w-full border rounded p-2 text-sm font-roboto mb-2"
                                  rows="3"
                                  placeholder="Describe what you did and what you learned from this task..."
                                  value={commentInputs[task.id] || ''}
                                  onChange={(e) => setCommentInputs({...commentInputs, [task.id]: e.target.value})}
                                  disabled={isSubmittingComment || savingTasks[task.id]}
                                ></textarea>
                                
                                {/* Error message if saving failed */}
                                {saveErrors[task.id] && (
                                  <div className="text-xs text-red-600 mb-2 font-roboto">
                                    {saveErrors[task.id]}
                                  </div>
                                )}
                                
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleCompleteWithComment(task.id)}
                                    disabled={!commentInputs[task.id]?.trim() || isSubmittingComment || savingTasks[task.id]}
                                    className="px-4 py-2 bg-green-500 text-white rounded flex items-center font-roboto disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    {savingTasks[task.id] ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Mark Complete
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Completion status notification */}
                            {task.completed && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                                <CheckCircle className="inline-block text-green-600 mr-2" size={16} />
                                <span className="text-green-800 font-medium font-roboto">
                                  Task completed on {formatDate(task.completedDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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
              <div className="rounded-lg border bg-white shadow">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-amber-100 text-amber-600">
                      🏆
                    </div>
                      
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-lg font-roboto">Family Helper Challenge</h4>
                      </div>
                        
                      <div className="mt-2">
                        <p className="text-gray-600 font-roboto">
                          Help your parents with special tasks this week and become a Family Hero!
                        </p>
                      </div>
                    
                      {/* Kid Task Details */}
                      <div className="mt-4">
                        <h5 className="font-medium text-sm mb-3 font-roboto">Your Mission:</h5>
                        <div className="space-y-4">
                          {/* Kid Subtasks */}
                          {familyMembers.filter(member => member.role === 'child').map((child, index) => (
                            <div key={`kid-subtask-${index}`} className="border rounded-md p-3 bg-gray-50">
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
                  </div>
                </div>
              </div>
              
              {/* Second Kid Task - Fun Survey Challenge */}
              <div className="rounded-lg border bg-white shadow">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-green-100 text-green-600">
                      🔍
                    </div>
                      
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-lg font-roboto">Family Detective Challenge</h4>
                      </div>
                        
                      <div className="mt-2">
                        <p className="text-gray-600 font-roboto">
                          Become a family detective! Observe who does what in your family this week!
                        </p>
                      </div>
                    
                      {/* Detective Task Details */}
                      <div className="mt-4">
                        <h5 className="font-medium text-sm mb-3 font-roboto">Your Mission:</h5>
                        <div className="space-y-4">
                          {/* Detective Subtasks */}
                          <div className="border rounded-md p-3 bg-gray-50">
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

                          <div className="border rounded-md p-3 bg-gray-50">
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
                                <h6 className="font-medium text-sm font-roboto">Count Who Cleans</h6>
                                <p className="text-sm text-gray-600 mt-1 font-roboto">
                                  Notice who does cleaning tasks this week
                                </p>
                                
                                {kidTasksCompleted['kid-task-2-2']?.completed && (
                                  <div>
                                    <p className="text-xs text-green-600 mt-2 font-roboto">
                                      Completed by {kidTasksCompleted['kid-task-2-2'].completedByName || 'a child'} on {formatDate(kidTasksCompleted['kid-task-2-2'].completedDate)}
                                    </p>
                                    {kidTasksCompleted['kid-task-2-2'].observations && (
                                      <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                                        <p className="italic text-green-800 font-roboto">"{kidTasksCompleted['kid-task-2-2'].observations}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Reactions */}
                                {kidTasksCompleted['kid-task-2-2']?.completed && (
                                  <div className="flex mt-2 flex-wrap gap-1">
                                    {taskReactions['kid-task-2-2']?.map((reaction, i) => (
                                      <div key={i} className="bg-green-50 px-2 py-1 rounded-full text-xs flex items-center">
                                        <span className="mr-1">{reaction.emoji}</span>
                                        <span className="text-green-700 font-roboto">{reaction.from}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Add Reaction Button */}
                                {kidTasksCompleted['kid-task-2-2']?.completed && (
                                  <button
                                    onClick={() => openEmojiPicker('kid-task-2-2')}
                                    className="mt-2 text-xs flex items-center text-blue-600 hover:text-blue-800 font-roboto"
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
                  </div>
                </div>
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
                <h3 className="text-lg font-semibold font-roboto">Weekly Couple Check-In</h3>
                <p className="text-sm text-gray-600 mt-1 font-roboto">
                  A quick 5-minute check-in to track how workload balance is affecting your relationship
                </p>
                
                <div className="mt-3">
                  {!canStartCoupleCheckIn ? (
                    <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded mb-3">
                      <div className="flex items-center mb-1">
                        <AlertCircle size={16} className="mr-2" />
                        <span className="font-medium font-roboto">Couple check-in not yet available</span>
                      </div>
                      <p className="font-roboto">
                        Complete the weekly check-in first to unlock the couple check-in.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm bg-pink-50 text-pink-800 p-3 rounded mb-3">
                      <div className="flex items-center mb-1">
                        <Heart size={16} className="mr-2" />
                        <span className="font-medium font-roboto">Your relationship matters too!</span>
                      </div>
                      <p className="font-roboto">
                        Take 5 minutes to check in on how workload sharing is affecting your relationship.
                      </p>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 flex items-center">
                    <span className="font-roboto">Recommended: 5 minutes</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => setShowCoupleCheckIn(true)}
                    disabled={!canStartCoupleCheckIn}
                    className={`px-4 py-2 rounded-md flex items-center font-roboto ${
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

        {/* Family Meeting Card */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Users size={20} className="text-amber-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-roboto">Family Meeting</h3>
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                Hold a 30-minute family meeting to discuss progress and set goals
              </p>
              
              <div className="mt-3">
                {!canStartFamilyMeeting && (
                  <div className="text-sm bg-amber-50 text-amber-800 p-3 rounded mb-3">
                    <div className="flex items-center mb-1">
                      <AlertCircle size={16} className="mr-2" />
                      <span className="font-medium font-roboto">Family meeting not yet available</span>
                    </div>
                    <p className="font-roboto">
                      Complete the weekly check-in and at least 3 tasks to unlock the family meeting agenda.
                    </p>
                  </div>
                )}
                
                <div className="text-sm text-gray-600 flex items-center">
                  <span className="font-roboto">Recommended: 30 minutes</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={onOpenFamilyMeeting}
                  disabled={!canStartFamilyMeeting}
                  className={`px-4 py-2 rounded-md flex items-center font-roboto ${
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
            <h3 className="text-lg font-medium mb-4 font-roboto">Add a cheer!</h3>
            
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
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-roboto"
                onClick={() => setSelectedTaskForEmoji(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Tips Box */}
      <div className="bg-white rounded-lg shadow p-4 mt-4 border-l-4 border-black">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <HelpCircle size={20} className="text-black" />
          </div>
          <div>
            <h4 className="font-medium font-roboto">Did you know?</h4>
            <p className="text-sm text-gray-600 mt-1 font-roboto">
              All task completions and comments you add are analyzed by our AI to make future recommendations 
              more personalized. The more details you share about task completion, the better Allie can help 
              balance your family responsibilities!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksTab;