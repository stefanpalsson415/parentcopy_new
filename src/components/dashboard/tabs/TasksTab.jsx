import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, X, Plus, Award, Flame, 
  Zap, Star, ArrowRight, MessageSquare, Clock, 
  Heart, ArrowUp, Camera, Share2, Upload, Check
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DatabaseService from '../../../services/DatabaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../services/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
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

const TasksTab = ({ onStartWeeklyCheckIn, onOpenFamilyMeeting }) => {
  const { 
    selectedUser, 
    familyMembers,
    currentWeek,
    completedWeeks,
    familyId,
    addTaskComment,
    updateTaskCompletion,
    loadCurrentWeekTasks,
    getWeekHistoryData
  } = useFamily();

  // Main states
  const [habits, setHabits] = useState([]);
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
  
  // Dates for weekly rhythm
  const [weekProgress, setWeekProgress] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(7);
  
  // Family streaks
  const [familyStreak, setFamilyStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Load habits for the current week
  useEffect(() => {
    const loadHabits = async () => {
      try {
        console.log(`Loading habits for Week ${currentWeek}, user:`, selectedUser?.name);
        
        if (familyId) {
          // Load tasks and transform them into habits format
          const tasks = await loadCurrentWeekTasks();
          
          // Transform tasks into habit format - simplifying and focusing on the system
          const transformedHabits = tasks.map(task => {
            // Only include tasks for the current user or "Everyone"
            if (task.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
                task.assignedToName === selectedUser?.name ||
                task.assignedTo === "Everyone") {
              
              // Create the habit object with a focus on systems vs goals
              return {
                id: task.id,
                title: task.title.replace(/Week \d+: /g, ''), // Remove week prefix
                description: task.description.replace(/for this week/g, 'consistently'),
                cue: task.subTasks?.[0]?.title || "After breakfast",
                action: task.subTasks?.[1]?.title || task.title,
                reward: "Feel accomplished and balanced",
                identity: task.focusArea 
                  ? `I am someone who values ${task.focusArea.toLowerCase()}` 
                  : "I am someone who values family balance",
                trackDays: Array(7).fill(false), // Track daily completions
                assignedTo: task.assignedTo,
                assignedToName: task.assignedToName,
                category: task.category,
                insight: task.insight || task.aiInsight,
                completed: task.completed,
                comments: task.comments || [],
                streak: Math.floor(Math.random() * 3), // Placeholder for streak
                progress: task.completed ? 100 : Math.floor(Math.random() * 80),
                imageUrl: task.imageUrl || null,
                lastCompleted: task.completedDate || null,
                // Convert subtasks to smaller atomic habits
                atomicSteps: task.subTasks?.map(st => ({
                  id: st.id,
                  title: st.title,
                  completed: st.completed || false
                })) || []
              };
            }
            return null;
          }).filter(Boolean);
          
          // Add some placeholder habit stacks based on existing habits
          const habitWithStack = transformedHabits.map(habit => {
            if (Math.random() > 0.5 && habit) {
              // Randomly assign some habits to be part of a stack
              const stackTrigger = ["After waking up", "Before dinner", "After brushing teeth", "When kids are at school"][Math.floor(Math.random() * 4)];
              return {
                ...habit,
                stackTrigger,
                isPartOfStack: true
              };
            }
            return habit;
          });
          
          setHabits(habitWithStack);
          
          // Setup weekly progress based on current date
          calculateWeekProgress();
          
          // Load family streaks
          loadFamilyStreaks();
        }
      } catch (error) {
        console.error("Error loading habits:", error);
        setHabits([]);
      }
    };
    
    loadHabits();
  }, [familyId, currentWeek, selectedUser]);
  
  // Simulate loading family streaks
  const loadFamilyStreaks = () => {
    // In a real implementation, this would come from Firebase
    const randomStreak = Math.floor(Math.random() * 6) + 1;
    setFamilyStreak(randomStreak);
    setLongestStreak(Math.max(randomStreak + 2, 7));
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
      updatedHabits[habitIndex] = {
        ...habit,
        completed: true,
        progress: 100,
        lastCompleted: new Date().toISOString(),
        streak: habit.streak + 1
      };
      
      setHabits(updatedHabits);
      
      // Create a celebration
      createCelebration(habit.title);
      
      // Launch confetti!
      launchConfetti();
      
      // Save to database - reuse existing functionality
      await updateTaskCompletion(habitId, true);
      
      // Update streaks in the database
      await updateStreakInDatabase(habitId, habit.streak + 1);
      
      // Open reflection dialog
      setSelectedHabit(habit);
      setShowHabitDetail(habitId);
    } catch (error) {
      console.error("Error completing habit:", error);
    }
  };
  
  // Update streak in database
  const updateStreakInDatabase = async (habitId, newStreak) => {
    try {
      // In a real implementation, we would save this to the database
      const streakRef = doc(db, "families", familyId, "habitStreaks", habitId);
      await updateDoc(streakRef, {
        currentStreak: newStreak,
        lastUpdated: new Date().toISOString()
      });
      
      // Also update family streak
      const familyRef = doc(db, "families", familyId);
      await updateDoc(familyRef, {
        totalCompletions: increment(1)
      });
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };
  
  // Create a celebration notification
  const createCelebration = (habitTitle) => {
    const newCelebration = {
      id: Date.now(),
      title: habitTitle,
      message: generateCelebrationMessage(habitTitle),
      timestamp: new Date().toISOString()
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
      
      // Also update in database
      const habitRef = doc(db, "families", familyId, "habits", selectedHabit.id);
      await updateDoc(habitRef, {
        imageUrl: downloadURL
      });
      
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
        const video = document.getElementById('camera-preview');
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
    const video = document.getElementById('camera-preview');
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
  
  // Filter habits for the current user or "Everyone"
  const userHabits = habits.filter(habit => 
    habit.assignedTo === (selectedUser?.roleType || selectedUser?.role) || 
    habit.assignedToName === selectedUser?.name ||
    habit.assignedTo === "Everyone"
  );
  
  return (
    <div className="bg-white rounded-lg shadow p-0 font-roboto overflow-hidden">
      {/* Header with streak information */}
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium">Habit Builder</h2>
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
      
      {/* Week progress bar */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm">Week Progress</div>
          <div className="text-sm">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${weekProgress}%` }}
          ></div>
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
              {habitStackVisible ? "Hide" : "Show"}
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
          <button 
            onClick={() => setShowAddHabit(true)}
            className="text-sm flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus size={16} className="mr-1" />
            Add Habit
          </button>
        </div>
        
        {userHabits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No habits set for this week yet</p>
            <button 
              onClick={() => setShowAllieCoaching(true)}
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
                        className="text-sm flex items-center text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedHabit(habit);
                          setShowShareModal(true);
                        }}
                        className="text-sm flex items-center text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Share2 size={14} className="mr-1" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Calendar connection */}
      <div className="mt-4 p-4 border-t">
        <div className="flex items-start">
          <Calendar size={20} className="text-black mt-1 mr-3" />
          <div>
            <h3 className="font-medium">Connect to Your Calendar</h3>
            <p className="text-sm text-gray-600 mt-1">
              Schedule specific times for your habits to make them easier to remember
            </p>
            <button 
              className="mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded flex items-center hover:bg-blue-100"
            >
              <Clock className="mr-2" size={16} />
              Set Habit Times
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
              onClick={() => setShowAllieCoaching(true)}
              className="mt-3 px-4 py-2 bg-black text-white rounded flex items-center hover:bg-gray-800"
            >
              Chat with Allie
            </button>
          </div>
        </div>
      </div>
      
      {/* Family meeting reminder */}
      {!showMeetingReminder && (
        <div className="mt-4 p-4 border-t bg-amber-50">
          <div className="flex items-start">
            <Star size={20} className="text-amber-600 mt-1 mr-3" />
            <div>
              <h3 className="font-medium text-amber-800">Family Meeting</h3>
              <p className="text-sm text-amber-700 mt-1">
                Schedule your weekly family meeting to review progress and celebrate wins
              </p>
              <button 
                onClick={onOpenFamilyMeeting}
                className="mt-3 px-4 py-2 bg-amber-500 text-white rounded flex items-center hover:bg-amber-600"
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Celebration messages */}
      <div className="fixed bottom-4 right-4 space-y-2 z-30">
        {celebrations.map(celebration => (
          <div 
            key={celebration.id} 
            className="bg-green-500 text-white p-3 rounded-lg shadow-lg animation-bounce-in max-w-xs"
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
                      <div className="text-sm mt-1">{comment.text}</div>
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
                const video = document.getElementById('camera-preview');
                if (video && video.srcObject) {
                  const stream = video.srcObject;
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
              id="camera-preview" 
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
              Want to discuss habit building with Allie? Open the chat panel or ask specific questions here:
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowAllieCoaching(false);
                  // Here we would normally trigger the Allie chat to open
                  // with a pre-filled prompt about habits
                }}
                className="px-4 py-2 bg-black text-white rounded-lg flex items-center"
              >
                <MessageSquare size={16} className="mr-2" />
                Chat with Allie
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share habit modal */}
      {showShareModal && selectedHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Share Your Progress</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="inline-block bg-black text-white px-3 py-1 rounded-full text-sm mb-2">
                    {selectedHabit.streak} day streak! 🔥
                  </div>
                  <h4 className="font-medium text-lg mb-1">{selectedHabit.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{selectedHabit.description}</p>
                  <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded inline-block">
                    {selectedHabit.identity}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg">
                <Heart size={16} className="mr-2" />
                Share with Family
              </button>
              <button className="w-full flex items-center justify-center p-3 border border-gray-300 rounded-lg text-gray-700">
                <ArrowUp size={16} className="mr-2" />
                Export as Image
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add new habit placeholder */}
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
            
            <div className="text-center py-8 text-gray-500">
              <p>Allie will help you create new habits that are:</p>
              <ul className="mt-2 text-left mx-auto inline-block">
                <li className="flex items-center mb-2">
                  <Check size={16} className="mr-2 text-green-500" />
                  Specific and measurable
                </li>
                <li className="flex items-center mb-2">
                  <Check size={16} className="mr-2 text-green-500" />
                  Aligned with your family values
                </li>
                <li className="flex items-center">
                  <Check size={16} className="mr-2 text-green-500" />
                  Small enough to succeed with
                </li>
              </ul>
              
              <button 
                onClick={() => {
                  setShowAddHabit(false);
                  setShowAllieCoaching(true);
                }}
                className="mt-6 px-4 py-2 bg-black text-white rounded-lg flex items-center mx-auto"
              >
                <MessageSquare size={16} className="mr-2" />
                Ask Allie to Create a Habit
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