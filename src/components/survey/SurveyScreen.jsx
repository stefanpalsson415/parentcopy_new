// src/components/survey/SurveyScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, Info, HelpCircle, Scale, Brain, Heart, Clock, ArrowLeft, 
  ArrowRight, Save, Check, X, Edit, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';
import AllieChat from '../chat/AllieChat.jsx';
import QuestionFeedbackService from '../../services/QuestionFeedbackService';
import QuestionFeedbackPanel from './QuestionFeedbackPanel';
import SurveyWalkthrough from './SurveyWalkthrough';


const SurveyScreen = ({ mode = 'initial' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedUser,
    familyMembers,
    completeInitialSurvey,
    completeWeeklyCheckIn,
    saveSurveyProgress,
    familyPriorities,
    familyName,
    familyId,
    currentWeek,
    selectFamilyMember,
    taskRecommendations,
  surveyResponses,
  getWeekHistoryData
  } = useFamily();
  
  const { 
    fullQuestionSet,
    currentSurveyResponses,
    updateSurveyResponse,
    resetSurvey,
    getSurveyProgress,
    updateQuestionWeight,
    selectPersonalizedInitialQuestions,
    getPersonalizedInitialQuestions,
    getFilteredQuestionsForAdult,
    setFamilyData,
    generateWeeklyQuestions
  } = useSurvey();

  // State to manage personalized questions
  const [personalizedQuestions, setPersonalizedQuestions] = useState([]);
  const [isPersonalizationLoaded, setIsPersonalizationLoaded] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [viewingQuestionList, setViewingQuestionList] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showWeightMetrics, setShowWeightMetrics] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [editingWeight, setEditingWeight] = useState(false);
  const [saveErrors, setSaveErrors] = useState({});
  const [showAllieChat, setShowAllieChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasWeightChanges, setHasWeightChanges] = useState(false);
  const [weightBeingEdited, setWeightBeingEdited] = useState(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const keyboardInitialized = useRef(false);
  const autoSaveIntervalRef = useRef(null);
  const hasLoadedProgress = useRef(false);
  
  const [localCurrentQuestion, setLocalCurrentQuestion] = useState(null);

  // Get the current question, either from local state or the personalized questions array
  const currentQuestion = localCurrentQuestion || 
    (personalizedQuestions.length > 0 ? 
      personalizedQuestions[currentQuestionIndex] : 
      fullQuestionSet[currentQuestionIndex]);

  // Function to update current question (for weight editing)
  const setCurrentQuestion = (updatedQuestion) => {
    setLocalCurrentQuestion(updatedQuestion);
    setHasWeightChanges(true);
  };

  // Check if this is the user's first time seeing the survey walkthrough
  useEffect(() => {
    if (mode === 'initial' && selectedUser) {
      // Check if this user has seen the tutorial before
      const hasSeen = localStorage.getItem(`surveyWalkthroughSeen_${selectedUser.id}`);
      if (!hasSeen) {
        // Delay the walkthrough to ensure UI is fully loaded
        const timer = setTimeout(() => {
          setShowWalkthrough(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectedUser, mode]);

  // Function to mark the walkthrough as completed
  const completeWalkthrough = () => {
    if (selectedUser) {
      localStorage.setItem(`surveyWalkthroughSeen_${selectedUser.id}`, 'true');
    }
    setShowWalkthrough(false);
  };

  // Ensure we have the correct selected user on mount
  useEffect(() => {
    if (familyMembers.length > 0) {
      const storedUserId = localStorage.getItem('selectedUserId');
      if (storedUserId && (!selectedUser || selectedUser.id !== storedUserId)) {
        const userToSelect = familyMembers.find(m => m.id === storedUserId);
        if (userToSelect) {
          console.log("Restoring correct user for survey:", userToSelect.name);
          selectFamilyMember(userToSelect);
        }
      }
    }
  }, [familyMembers]);


  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
  // Check if this user has already completed this week's check-in
  // Only for weekly mode
  useEffect(() => {
    if (mode === 'weekly' && selectedUser && selectedUser.weeklyCompleted && 
        selectedUser.weeklyCompleted[currentWeek-1]?.completed) {
      alert("You've already completed this week's check-in!");
      navigate('/dashboard'); // Redirect back to dashboard
    }
  }, [selectedUser, currentWeek, navigate, mode]);

  // Load appropriate questions based on mode
  useEffect(() => {
    if (familyId && selectedUser && !isPersonalizationLoaded) {
      console.log(`Loading ${mode} questions for user:`, selectedUser.id, "in family:", familyId);
      
      // Create a family data object for personalization
      const familyData = {
        familyName: familyName,
        familyId: familyId,
        parents: familyMembers.filter(m => m.role === 'parent').map(p => ({
          name: p.name,
          role: p.roleType || 'parent'
        })),
        children: familyMembers.filter(m => m.role === 'child').map(c => ({
          name: c.name,
          age: c.age || 10
        })),
        priorities: familyPriorities,
        communication: { style: "open" } // Default communication style
      };
      
      // Set the family data in survey context
      setFamilyData(familyData);
      
      if (mode === 'initial') {
        // Generate personalized questions for initial survey
        const personalized = selectPersonalizedInitialQuestions(fullQuestionSet, familyData);
        
        // Apply feedback filter to remove inapplicable questions
        const loadFilteredQuestions = async () => {
          try {
            const filteredQuestions = await getFilteredQuestionsForAdult(familyId, personalized);
            console.log("Generated personalized questions:", filteredQuestions.length);
            setPersonalizedQuestions(filteredQuestions);
            setIsPersonalizationLoaded(true);
          } catch (error) {
            console.error("Error filtering questions:", error);
            // Fallback to unfiltered questions
            setPersonalizedQuestions(personalized);
            setIsPersonalizationLoaded(true);
          }
        };
        
        loadFilteredQuestions();
      } else if (mode === 'weekly') {
        // Generate weekly questions with enhanced error handling
        try {
          // Get previous responses and task data for adaptive question selection
          const previousResponses = surveyResponses || {};
          const taskCompletionData = taskRecommendations?.filter(task => task.completed) || [];
          
          // Get previous week's data for more context if available
          let previousWeekData = null;
          if (currentWeek > 1) {
            previousWeekData = getWeekHistoryData(currentWeek - 1);
          }
          
          // Call with full context data for adaptive selection
const weeklyQuestions = generateWeeklyQuestions(
  currentWeek, 
  false, // Not a child
  familyData,
  previousResponses,
  taskCompletionData,
  selectedUser?.id // Pass parent ID for personalization
);
          
          console.log(`Generated ${weeklyQuestions?.length || 0} adaptive weekly questions for week ${currentWeek}`);
          
          if (!weeklyQuestions || weeklyQuestions.length === 0) {
            console.error("No weekly questions generated, using fallback");
            // Fallback to a subset of full questions if weekly generation fails
            const fallbackQuestions = fullQuestionSet.slice(0, 20);
            setPersonalizedQuestions(fallbackQuestions);
          } else {
            setPersonalizedQuestions(weeklyQuestions);
          }
          setIsPersonalizationLoaded(true);
        } catch (error) {
          console.error("Error generating weekly questions:", error);
          // Fallback to a subset of full questions
          const fallbackQuestions = fullQuestionSet.slice(0, 20);
          setPersonalizedQuestions(fallbackQuestions);
          setIsPersonalizationLoaded(true);
        }
      }
    }
  }, [
    familyId, 
    selectedUser, 
    familyMembers, 
    familyName, 
    familyPriorities, 
    fullQuestionSet, 
    isPersonalizationLoaded, 
    mode, 
    currentWeek,
    selectPersonalizedInitialQuestions, 
    setFamilyData, 
    getFilteredQuestionsForAdult,
    generateWeeklyQuestions
  ]);
  
  // Show AllieChat after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAllieChat(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Set up storage and progress key based on mode and user
  const getStorageKey = () => {
    if (!selectedUser) return null;
    return mode === 'initial' 
      ? `surveyInProgress_${selectedUser.id}` 
      : `weeklyCheckIn_${currentWeek}_${selectedUser.id}`;
  };
  
  // Load saved progress - separate for each user
  useEffect(() => {
    if (!selectedUser || hasLoadedProgress.current) return;
    
    const loadUserProgress = async () => {
      const storageKey = getStorageKey();
      if (!storageKey) return;
      
      console.log(`Checking for saved progress for user:`, selectedUser.id);
      
      try {
        // Look specifically for this user's progress
        const savedProgress = localStorage.getItem(storageKey);
        
        if (savedProgress) {
          const progressData = JSON.parse(savedProgress);
          
          // Verify this is the right user's data
          if (progressData.userId === selectedUser.id) {
            console.log(`Found saved progress for user:`, selectedUser.id);
            
            // Load the saved responses if available
            if (progressData.responses && Object.keys(progressData.responses).length > 0) {
              // Find the highest answered question index
              let lastAnsweredIndex = -1;
              
              // Get the proper questions array to check against
              const questionsToCheck = isPersonalizationLoaded ? 
                personalizedQuestions : (mode === 'initial' ? fullQuestionSet : []);
              
              // Find the last answered question
              questionsToCheck.forEach((question, index) => {
                if (progressData.responses[question.id]) {
                  lastAnsweredIndex = Math.max(lastAnsweredIndex, index);
                }
              });
              
              if (lastAnsweredIndex >= 0) {
                const nextIndex = Math.min(lastAnsweredIndex + 1, questionsToCheck.length - 1);
                console.log(`Resuming survey from question ${nextIndex + 1}`);
                
                // Set current question index
                setCurrentQuestionIndex(nextIndex);
                
                // Set the parent selection for the current question
                if (nextIndex <= lastAnsweredIndex) {
                  setSelectedParent(progressData.responses[questionsToCheck[nextIndex].id] || null);
                }
                
                // Set last saved time
                setLastSaved(new Date(progressData.timestamp));
              }
            }
            
            // Don't reset the survey
            hasLoadedProgress.current = true;
            return;
          }
        }
        
        // If we got here, no saved progress found for this user
        console.log(`No saved progress for user:`, selectedUser.id);
        resetSurvey();
        hasLoadedProgress.current = true;
      } catch (error) {
        console.error("Error loading saved progress:", error);
        resetSurvey();
        hasLoadedProgress.current = true;
      }
    };
    
    loadUserProgress();
  }, [
    selectedUser, 
    personalizedQuestions, 
    fullQuestionSet, 
    resetSurvey, 
    isPersonalizationLoaded, 
    mode, 
    currentWeek
  ]);

  // Setup auto-save functionality
  useEffect(() => {
    if (selectedUser && autoSaveEnabled) {
      // Clear any existing interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      
      // Set up auto-save every 30 seconds
      autoSaveIntervalRef.current = setInterval(() => {
        // Only auto-save if we have responses and aren't in the middle of processing
        if (
          selectedUser && 
          Object.keys(currentSurveyResponses).length > 0 &&
          !isProcessing && 
          !isSaving
        ) {
          handleAutoSave();
        }
      }, 30000); // 30 seconds
    }
    
    // Cleanup interval on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [selectedUser, autoSaveEnabled, currentSurveyResponses, isProcessing]);
  
  // Reset on user change
  useEffect(() => {
    // When selected user changes, reset the progress loading flag
    hasLoadedProgress.current = false;
  }, [selectedUser?.id]);
  
  // Find Mama and Papa users from family members
  const mamaUser = familyMembers.find(m => m.roleType === 'Mama' || m.name === 'Mama');
  const papaUser = familyMembers.find(m => m.roleType === 'Papa' || m.name === 'Papa');
  
  // Set up keyboard shortcuts with debouncing
  useEffect(() => {
    // Function to handle key press
    const handleKeyPress = (e) => {
      if (viewingQuestionList || isProcessing) return;
      
      // 'M' key selects Mama
      if (e.key.toLowerCase() === 'm') {
        handleSelectParent('Mama');
      }
      // 'P' key selects Papa
      else if (e.key.toLowerCase() === 'p') {
        handleSelectParent('Papa');
      }
      // Left arrow for previous question
      else if (e.key === 'ArrowLeft') {
        if (currentQuestionIndex > 0) {
          handlePrevious();
        }
      }
      // Right arrow for next question (skip)
      else if (e.key === 'ArrowRight') {
        handleSkip();
      }
      // 'S' key to manually save progress
      else if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleManualSave();
      }
    };
    
    setLocalCurrentQuestion(null);

    // Set a small timeout to ensure component is fully rendered
    const timer = setTimeout(() => {
      // Clean up previous listeners if they exist
      if (keyboardInitialized.current) {
        window.removeEventListener('keydown', handleKeyPress);
      }
      
      // Add new listener
      window.addEventListener('keydown', handleKeyPress);
      keyboardInitialized.current = true;
    }, 200);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (keyboardInitialized.current) {
        window.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, [currentQuestionIndex, viewingQuestionList, isProcessing]);
  
  // Parent profile images with fallbacks
  const parents = {
    mama: {
      name: mamaUser?.name || 'Mama',
      image: mamaUser?.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2U5YjFkYSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
    },
    papa: {
      name: papaUser?.name || 'Papa',
      image: papaUser?.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iIzg0YzRlMiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
    }
  };
  
  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!selectedUser || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const storageKey = getStorageKey();
      console.log(`Auto-saving ${mode} progress for user:`, selectedUser.id);
      await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
      
      // Store survey in progress flag with responses
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          userId: selectedUser.id,
          timestamp: new Date().getTime(),
          responses: currentSurveyResponses,
          lastQuestionIndex: currentQuestionIndex
        }));
      }
      
      setLastSaved(new Date());
      console.log(`${mode} progress auto-saved for user:`, selectedUser.id);
    } catch (error) {
      console.error(`Error auto-saving ${mode} progress:`, error);
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedUser, 
    currentSurveyResponses, 
    saveSurveyProgress, 
    isSaving, 
    mode, 
    currentQuestionIndex
  ]);
  
  // Manual save function
  const handleManualSave = async () => {
    if (!selectedUser || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const storageKey = getStorageKey();
      console.log(`Manually saving ${mode} progress for user:`, selectedUser.id);
      await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
      
      // Store survey in progress flag with responses
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          userId: selectedUser.id,
          timestamp: new Date().getTime(),
          responses: currentSurveyResponses,
          lastQuestionIndex: currentQuestionIndex
        }));
      }
      
      setLastSaved(new Date());
      console.log(`${mode} progress saved manually for user:`, selectedUser.id);
    } catch (error) {
      console.error(`Error saving ${mode} progress:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle parent selection
  const handleSelectParent = (parent) => {
    if (isProcessing) return; // Prevent multiple selections while processing
    setIsProcessing(true);
    
    setSelectedParent(parent);
    
    // Save response
    if (currentQuestion) {
      updateSurveyResponse(currentQuestion.id, parent);
      
      // Wait a bit to show selection, then proceed
      setTimeout(() => {
        // Get the right questions array
        const questionsArray = personalizedQuestions.length > 0 ? 
  personalizedQuestions : (mode === 'initial' ? fullQuestionSet : generateWeeklyQuestions(currentWeek));
          
        if (currentQuestionIndex < questionsArray.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedParent(null);
          setShowExplanation(false);
          setShowWeightMetrics(false);
        } else {
          // Survey completed, save responses
          handleCompleteSurvey();
        }
        setIsProcessing(false); // Reset processing state
      }, 800);
    }
  };
  
  // Complete the survey based on mode
  const handleCompleteSurvey = async () => {
    if (isProcessing || isSubmitting) return; // Prevent multiple submissions
    
    // Set flags to show we're submitting
    setIsProcessing(true);
    setIsSubmitting(true);
    
    try {
      console.log(`Starting ${mode} completion process for user:`, selectedUser.id);
      
      // First, save the current survey state before navigating
      await handleManualSave();
      
      // Then show loading screen to provide visual feedback
      navigate('/loading');
      
      // Wait a moment before completing to ensure UI update happens
      setTimeout(async () => {
        try {
          console.log(`Saving final ${mode} responses for user:`, selectedUser.id);
          
          let result;
          
          // Call the appropriate completion method based on mode
          if (mode === 'initial') {
            result = await completeInitialSurvey(selectedUser.id, currentSurveyResponses);
          } else if (mode === 'weekly') {
            result = await completeWeeklyCheckIn(selectedUser.id, currentWeek, currentSurveyResponses);
          }
          
          if (!result) {
            throw new Error(`${mode} completion failed`);
          }
          
          // Success! Remove the in-progress flag
          const storageKey = getStorageKey();
          if (storageKey) {
            localStorage.removeItem(storageKey);
          }
          
          console.log(`${mode} completed successfully for user:`, selectedUser.id);
          
          // Final navigation depends on mode and completion status
          if (mode === 'initial') {
            // Check if all family members have completed the initial survey
            const allCompleted = familyMembers.every(member => 
              member.completed || member.id === selectedUser.id
            );
            
            console.log(`All members completed initial survey? ${allCompleted}`);
            
            // Navigate based on completion status
            setTimeout(() => {
              if (allCompleted) {
                console.log("All members completed - going to dashboard");
                navigate('/dashboard', { replace: true });
              } else {
                console.log("Some members still need to complete - going to wait screen");
                navigate('/login', { 
                  state: { 
                    directAccess: true,
                    showCompletionScreen: true
                  }, 
                  replace: true 
                });
              }
            }, 1500);
          } else {
            // For weekly check-ins, always go to dashboard
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
          }
        } catch (submitError) {
          console.error(`Error in delayed ${mode} completion:`, submitError);
          // Navigate back with error message
          navigate(`/${mode === 'initial' ? 'survey' : 'weekly-checkin'}`, { 
            state: { error: `Failed to complete ${mode} survey. Please try again.` }
          });
        } finally {
          setIsSubmitting(false);
          setIsProcessing(false);
        }
      }, 500);
    } catch (error) {
      console.error(`Error initiating ${mode} completion:`, error);
      alert(`There was an error saving your ${mode} survey. Please try again.`);
      setIsSubmitting(false);
      setIsProcessing(false);
      
      // Stay on current question
      navigate(mode === 'initial' ? '/survey' : '/weekly-checkin');
    }
  };
  
  // Move to previous question
  const handlePrevious = () => {
    // If we're editing weights, prompt to save or discard changes
    if (editingWeight && hasWeightChanges) {
      if (window.confirm("You have unsaved weight changes. Save changes before going back?")) {
        handleSaveWeightChanges();
      } else {
        handleCancelWeightEditing();
      }
    }
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      
      // Get the right questions array
      const questionsArray = personalizedQuestions.length > 0 ? 
        personalizedQuestions : (mode === 'initial' ? fullQuestionSet : []);
        
      setSelectedParent(currentSurveyResponses[questionsArray[currentQuestionIndex - 1].id] || null);
      setShowExplanation(false);
      setShowWeightMetrics(false);
    }
  };
  
  // Handle question feedback 
  const handleQuestionFeedback = async (feedbackType) => {
    if (isProcessing) return; // Prevent actions while processing
    
    setIsProcessing(true);
    
    try {
      // Create feedback object
      const feedback = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        feedbackType: feedbackType,
        category: currentQuestion.category,
        familyId: familyId
      };
      
      console.log("Sending question feedback:", feedback);
      
      // Send feedback to our service
      await QuestionFeedbackService.recordQuestionFeedback(feedback);
      
      // Skip to the next question
      if (currentQuestionIndex < personalizedQuestions.length - 1) {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setSelectedParent(null);
        setShowExplanation(false);
        setShowWeightMetrics(false);
      } else {
        // Last question, complete the survey
        handleCompleteSurvey();
      }
    } catch (error) {
      console.error("Error sending question feedback:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle question list view
  const toggleQuestionList = () => {
    // If we're editing weights, prompt to save or discard changes
    if (editingWeight && hasWeightChanges) {
      if (window.confirm("You have unsaved weight changes. Save changes before viewing question list?")) {
        handleSaveWeightChanges();
      } else {
        handleCancelWeightEditing();
      }
    }
    
    setViewingQuestionList(!viewingQuestionList);
  };
  
  // Jump to specific question
  const jumpToQuestion = (index) => {
    // If we're editing weights, prompt to save or discard changes
    if (editingWeight && hasWeightChanges) {
      if (window.confirm("You have unsaved weight changes. Save changes before jumping to another question?")) {
        handleSaveWeightChanges();
      } else {
        handleCancelWeightEditing();
      }
    }
    
    setCurrentQuestionIndex(index);
    
    // Get the right questions array
    const questionsArray = personalizedQuestions.length > 0 ? 
      personalizedQuestions : (mode === 'initial' ? fullQuestionSet : []);
      
    setSelectedParent(currentSurveyResponses[questionsArray[index].id] || null);
    setViewingQuestionList(false);
    setShowExplanation(false);
    setShowWeightMetrics(false);
  };
  
  // Handle pause/exit
  const handlePause = async () => {
    if (isProcessing) return; // Prevent multiple actions while processing
    
    // If we're editing weights, prompt to save or discard changes
    if (editingWeight && hasWeightChanges) {
      if (window.confirm("You have unsaved weight changes. Save changes before exiting?")) {
        handleSaveWeightChanges();
      } else {
        handleCancelWeightEditing();
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Save the current progress without marking as completed
      if (selectedUser && Object.keys(currentSurveyResponses).length > 0) {
        const storageKey = getStorageKey();
        console.log(`Saving ${mode} progress before pausing for user:`, selectedUser.id);
        await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
        console.log(`Progress saved successfully for user:`, selectedUser.id);
        
        // Store progress in localStorage
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify({
            userId: selectedUser.id,
            timestamp: new Date().getTime(),
            responses: currentSurveyResponses,
            lastQuestionIndex: currentQuestionIndex
          }));
        }
      }
      
      // Navigate to login screen (same as Switch User button)
      navigate('/login');
    } catch (error) {
      console.error(`Error saving ${mode} progress:`, error);
      alert('There was an error saving your progress, but you can continue later.');
      navigate('/login');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Skip question
  const handleSkip = () => {
    // If we're editing weights, prompt to save or discard changes
    if (editingWeight && hasWeightChanges) {
      if (window.confirm("You have unsaved weight changes. Save changes before continuing?")) {
        handleSaveWeightChanges();
      } else {
        handleCancelWeightEditing();
      }
    }
    
    // Get the right questions array
    const questionsArray = personalizedQuestions.length > 0 ? 
      personalizedQuestions : (mode === 'initial' ? fullQuestionSet : []);
      
    if (currentQuestionIndex < questionsArray.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedParent(null);
      setShowExplanation(false);
      setShowWeightMetrics(false);
    } else {
      // Survey completed, move to dashboard
      handleCompleteSurvey();
    }
  };
  
  // Handle saving weight changes
  const handleSaveWeightChanges = () => {
    if (hasWeightChanges) {
      // Weight changes are already saved through the updateQuestionWeight function
      // Just need to update UI state
      setEditingWeight(false);
      setHasWeightChanges(false);
      
      // Show a save confirmation
      const saveNotification = document.createElement('div');
      saveNotification.className = 'fixed top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow-md z-50 flex items-center font-roboto';
      saveNotification.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>Weight changes saved successfully';
      document.body.appendChild(saveNotification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (document.body.contains(saveNotification)) {
          document.body.removeChild(saveNotification);
        }
      }, 3000);
    } else {
      setEditingWeight(false);
    }
  };

  // Cancel weight editing
  const handleCancelWeightEditing = () => {
    // Reset the current question to its original state
    setLocalCurrentQuestion(null);
    setEditingWeight(false);
    setHasWeightChanges(false);
  };
  
  // Handle logout/switch user
  const handleLogout = () => {
    navigate('/login');
  };
  
  // Calculate progress
  const questionsToUse = personalizedQuestions.length > 0 ? 
    personalizedQuestions : (mode === 'initial' ? fullQuestionSet : []);
    
  const progress = getSurveyProgress(questionsToUse.length);
  
  // Get weight impact color
  const getWeightImpactColor = (weight) => {
    const numWeight = parseFloat(weight);
    if (numWeight >= 12) return "text-red-600 bg-red-100";
    if (numWeight >= 9) return "text-orange-600 bg-orange-100";
    if (numWeight >= 6) return "text-amber-600 bg-amber-100";
    return "text-blue-600 bg-blue-100";
  };
  
  // Get weight impact text
  const getWeightImpactText = (weight) => {
    const numWeight = parseFloat(weight);
    if (numWeight >= 12) return "Very High";
    if (numWeight >= 9) return "High";
    if (numWeight >= 6) return "Medium";
    return "Standard";
  };
  
  // Get icon for weight factor
  const getWeightFactorIcon = (factor) => {
    switch(factor) {
      case 'frequency':
        return <Clock size={14} className="mr-1" />;
      case 'invisibility':
        return <Brain size={14} className="mr-1" />;
      case 'emotionalLabor':
        return <Heart size={14} className="mr-1" />;
      default:
        return <Scale size={14} className="mr-1" />;
    }
  };
  
  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If no selected user or no current question, return loading
  if (!selectedUser || !currentQuestion) {
    return <div className="flex items-center justify-center h-screen font-roboto">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-white font-roboto">
      {/* Fixed header */}
      <div className="sticky top-0 z-10">
        {/* Black header bar */}
        <div className="bg-black text-white p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                <img 
                  src={selectedUser.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2ZkZTY4YSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='} 
                  alt={selectedUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{selectedUser.name}</span>
                <span className="text-xs text-gray-300">{familyName} Family</span>
              </div>
            </div>
            
            <div className="flex items-center">
              {/* Auto-save status */}
              {lastSaved && (
                <div className="mr-4 text-xs flex items-center">
                  {isSaving ? (
                    <span className="flex items-center">
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1"></div>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-300">
                      <Save size={12} className="mr-1" />
                      Last saved: {formatTime(lastSaved)}
                    </span>
                  )}
                </div>
              )}
              
              <button 
                onClick={handleLogout}
                className="flex items-center text-sm bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded"
              >
                <LogOut size={14} className="mr-1" />
                Switch User
              </button>
            </div>
          </div>
        </div>
        
        {/* Title section */}
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold font-roboto">
                {mode === 'initial' ? 'Initial Survey Assessment' : `Weekly Check-in - Cycle ${currentWeek}`}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'initial' && personalizedQuestions.length > 0 
                  ? 'Personalized to your family\'s needs' 
                  : 'Help us track your family\'s balance progress'}
              </p>
              
              <div className="flex justify-center space-x-4 mt-2">
                <button 
                  onClick={toggleQuestionList}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View All Questions
                </button>
                <button 
                  onClick={handleManualSave}
                  className="text-sm text-blue-600 hover:underline flex items-center"
                  disabled={isSaving}
                >
                  <Save size={14} className="mr-1" />
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content area with sticky question */}
      <div className="flex-1 relative">
        {viewingQuestionList ? (
          // Question list view
          <div className="p-4 overflow-y-auto h-full">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    All Questions ({questionsToUse.length}) 
                    {personalizedQuestions.length > 0 && mode === 'initial' && " - Personalized"}
                    {mode === 'weekly' && ` - Week ${currentWeek}`}
                  </h2>
                  <button 
                    onClick={toggleQuestionList}
                    className="text-blue-600 text-sm"
                  >
                    Back to Survey
                  </button>
                </div>
                  
                <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                  {questionsToUse.map((q, index) => {
                    const answered = currentSurveyResponses[q.id] !== undefined;
                    return (
                      <div 
                        key={q.id} 
                        className={`p-3 rounded text-sm ${
                          index === currentQuestionIndex 
                            ? 'bg-blue-100 border-l-4 border-blue-500' 
                            : answered 
                              ? 'bg-green-50' 
                              : 'bg-gray-50'
                        } cursor-pointer`}
                        onClick={() => jumpToQuestion(index)}
                      >
                        <div className="flex items-center">
                          <span className="w-6 text-right mr-2">{index + 1}.</span>
                          <div className="flex-1">
                            <p>{q.text}</p>
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <span className="mr-3">{q.category}</span>
                              {q.totalWeight && (
                                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-xs flex items-center ${getWeightImpactColor(q.totalWeight)}`}>
                                  <Scale size={10} className="mr-1" />
                                  Impact: {getWeightImpactText(q.totalWeight)}
                                </span>
                              )}
                            </div>
                          </div>
                          {answered && (
                            <div className="flex-shrink-0 ml-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                currentSurveyResponses[q.id] === 'Mama' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {currentSurveyResponses[q.id]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main survey view with sticky question
          <div className="flex flex-col h-full">
            {/* Sticky question section */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
              <div className="p-4">
                <div className="max-w-3xl mx-auto">
                  {/* Question */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border question-area">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-lg">
                        {currentQuestion.text}
                      </p>
                      {currentQuestion.totalWeight && (
                        <div 
                          className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center flex-shrink-0 ${getWeightImpactColor(currentQuestion.totalWeight)} cursor-pointer hover:scale-105 transition-transform impact-indicator`}
                          onClick={() => setShowWeightMetrics(!showWeightMetrics)}
                        >
                          <Scale size={12} className="mr-1" />
                          Impact: {getWeightImpactText(currentQuestion.totalWeight)}
                          <div className="ml-1 bg-white bg-opacity-30 rounded-full w-4 h-4 flex items-center justify-center">
                            <ChevronDown size={10} className={showWeightMetrics ? "hidden" : "block"} />
                            <ChevronUp size={10} className={showWeightMetrics ? "block" : "hidden"} />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {currentQuestion.category}
                    </p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="text-xs text-gray-600 flex items-center hover:underline"
                      >
                        <HelpCircle size={12} className="mr-1" />
                        {showExplanation ? "Hide explanation" : "Why are we asking this?"}
                      </button>
                      
                      <button 
                        onClick={() => setShowFeedbackPanel(true)}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center hover:bg-gray-200 feedback-button"
                      >
                        <Scale size={12} className="mr-1" />
                        Question Feedback
                        <div className="ml-1 bg-white bg-opacity-50 rounded-full w-4 h-4 flex items-center justify-center">
                          <ChevronDown size={10} />
                        </div>
                      </button>
                    </div>
                    {/* Add the feedback panel modal */}
                    {showFeedbackPanel && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <QuestionFeedbackPanel
                          questionId={currentQuestion.id}
                          questionText={currentQuestion.text}
                          category={currentQuestion.category}
                          familyId={familyId}
                          onSave={(feedbackType) => {
                            setShowFeedbackPanel(false);
                            if (feedbackType === 'not_applicable') {
                              // If question is marked not applicable, skip to next question
                              handleSkip();
                            }
                          }}
                          onCancel={() => setShowFeedbackPanel(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto">
                {/* Weight metrics visualization */}
                {showWeightMetrics && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md border relative weight-customization">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium flex items-center">
                        <Scale size={16} className="mr-2 text-gray-700" />
                        Task Weight Analysis
                      </h4>
                      {editingWeight ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSaveWeightChanges}
                            className="flex items-center text-xs text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded"
                          >
                            <Check size={12} className="mr-1" />
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancelWeightEditing}
                            className="flex items-center text-xs text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded"
                          >
                            <X size={12} className="mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingWeight(!editingWeight)}
                          className="text-xs text-blue-600 flex items-center bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        >
                          <Edit size={12} className="mr-1" />
                          Adjust Weights
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Base Time:</span>
                          {editingWeight ? (
                            <div className="flex items-center">
                              <button
                                className="px-1 bg-gray-200 text-gray-700 rounded-l"
                                onClick={() => {
                                  if (currentQuestion.baseWeight > 1) {
                                    const result = updateQuestionWeight(
                                      currentQuestion.id,
                                      'baseWeight',
                                      Math.max(1, currentQuestion.baseWeight - 1)
                                    );
                                    if (result) {
                                      // Update the current question with new weights
                                      setCurrentQuestion(result.updatedQuestion);
                                    }
                                  }
                                }}
                              >
                                -
                              </button>
                              <span className="font-medium px-2">{currentQuestion.baseWeight}/5</span>
                              <button
                                className="px-1 bg-gray-200 text-gray-700 rounded-r"
                                onClick={() => {
                                  if (currentQuestion.baseWeight < 5) {
                                    const result = updateQuestionWeight(
                                      currentQuestion.id,
                                      'baseWeight',
                                      Math.min(5, currentQuestion.baseWeight + 1)
                                    );
                                    if (result) {
                                      // Update the current question with new weights
                                      setCurrentQuestion(result.updatedQuestion);
                                    }
                                  }
                                }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium">{currentQuestion.baseWeight}/5</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${(currentQuestion.baseWeight / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          {editingWeight ? (
                            <div className="flex items-center">
                              <select
                                className="text-xs p-1 border rounded"
                                value={currentQuestion.frequency}
                                onChange={(e) => {
                                  const result = updateQuestionWeight(
                                    currentQuestion.id,
                                    'frequency',
                                    e.target.value
                                  );
                                  if (result) {
                                    // Update the current question with new weights
                                    setCurrentQuestion(result.updatedQuestion);
                                  }
                                }}
                              >
                                <option value="daily">Daily</option>
                                <option value="several">Several Times Weekly</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                              </select>
                            </div>
                          ) : (
                            <span className="font-medium">{currentQuestion.frequency}</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500 h-full rounded-full" 
                            style={{ 
                              width: `${
                                currentQuestion.frequency === 'daily' ? 100 :
                                currentQuestion.frequency === 'several' ? 80 :
                                currentQuestion.frequency === 'weekly' ? 60 :
                                currentQuestion.frequency === 'monthly' ? 40 : 
                                20
                              }%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Invisibility:</span>
                          {editingWeight ? (
                            <div className="flex items-center">
                              <select
                                className="text-xs p-1 border rounded"
                                value={currentQuestion.invisibility}
                                onChange={(e) => {
                                  const result = updateQuestionWeight(
                                    currentQuestion.id,
                                    'invisibility',
                                    e.target.value
                                  );
                                  if (result) {
                                    // Update the current question with new weights
                                    setCurrentQuestion(result.updatedQuestion);
                                  }
                                }}
                              >
                                <option value="highly">Highly Visible</option>
                                <option value="partially">Partially Visible</option>
                                <option value="mostly">Mostly Invisible</option>
                                <option value="completely">Completely Invisible</option>
                              </select>
                            </div>
                          ) : (
                            <span className="font-medium">{currentQuestion.invisibility}</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full rounded-full" 
                            style={{ 
                              width: `${
                                currentQuestion.invisibility === 'completely' ? 100 :
                                currentQuestion.invisibility === 'mostly' ? 75 :
                                currentQuestion.invisibility === 'partially' ? 50 : 
                                25
                              }%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Emotional Labor:</span>
                          {editingWeight ? (
                            <div className="flex items-center">
                              <select
                                className="text-xs p-1 border rounded"
                                value={currentQuestion.emotionalLabor}
                                onChange={(e) => {
                                  const result = updateQuestionWeight(
                                    currentQuestion.id,
                                    'emotionalLabor',
                                    e.target.value
                                  );
                                  if (result) {
                                    // Update the current question with new weights
                                    setCurrentQuestion(result.updatedQuestion);
                                  }
                                }}
                              >
                                <option value="minimal">Minimal</option>
                                <option value="low">Low</option>
                                <option value="moderate">Moderate</option>
                                <option value="high">High</option>
                                <option value="extreme">Extreme</option>
                              </select>
                            </div>
                          ) : (
                            <span className="font-medium">{currentQuestion.emotionalLabor}</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full" 
                            style={{ 
                              width: `${
                                currentQuestion.emotionalLabor === 'extreme' ? 100 :
                                currentQuestion.emotionalLabor === 'high' ? 80 :
                                currentQuestion.emotionalLabor === 'moderate' ? 60 :
                                currentQuestion.emotionalLabor === 'low' ? 40 : 
                                20
                              }%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Weight Impact:</span>
                        <span className="font-bold">{parseFloat(currentQuestion.totalWeight).toFixed(1)}</span>
                      </div>
                    </div>
                    {editingWeight && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-700">
                        <p>Adjusting weights will help Allie understand how you prioritize different tasks. Similar tasks will be updated with your preferences.</p>
                      </div>
                    )}
                  </div>
                )}
                
                
                
                {/* Task explanation panel */}
                {showExplanation && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-md border text-sm text-gray-600">
                    <p>
                      {mode === 'weekly' && currentQuestion.weeklyExplanation 
                        ? currentQuestion.weeklyExplanation 
                        : currentQuestion.explanation || "This question helps us understand who is primarily handling this task in your family and allows us to track changes over time."}
                    </p>
                  </div>
                )}
                
                {/* Weight explanation panel */}
                <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                  <p>{currentQuestion.weightExplanation}</p>
                  
                  {/* Weight factors visualization */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`text-center p-1 rounded text-xs ${
                      currentQuestion.frequency === 'daily' ? 'bg-blue-200' : 'bg-blue-100'
                    }`}>
                      <div className="flex items-center justify-center">
                        {getWeightFactorIcon('frequency')}
                        <span>{currentQuestion.frequency}</span>
                      </div>
                      <div className="text-blue-900 font-medium">Frequency</div>
                    </div>
                    
                    <div className={`text-center p-1 rounded text-xs ${
                      currentQuestion.invisibility === 'completely' ? 'bg-purple-200' : 'bg-purple-100'
                    }`}>
                      <div className="flex items-center justify-center">
                        {getWeightFactorIcon('invisibility')}
                        <span>{currentQuestion.invisibility}</span>
                      </div>
                      <div className="text-purple-900 font-medium">Visibility</div>
                    </div>
                    
                    <div className={`text-center p-1 rounded text-xs ${
                      currentQuestion.emotionalLabor === 'extreme' || currentQuestion.emotionalLabor === 'high' 
                        ? 'bg-red-200' : 'bg-red-100'
                    }`}>
                      <div className="flex items-center justify-center">
                        {getWeightFactorIcon('emotionalLabor')}
                        <span>{currentQuestion.emotionalLabor}</span>
                      </div>
                      <div className="text-red-900 font-medium">Emotional Load</div>
                    </div>
                    
                    <div className={`text-center p-1 rounded text-xs ${
                      currentQuestion.childDevelopment === 'high' ? 'bg-green-200' : 'bg-green-100'
                    }`}>
                      <div className="flex items-center justify-center">
                        {getWeightFactorIcon('childDevelopment')}
                        <span>{currentQuestion.childDevelopment}</span>
                      </div>
                      <div className="text-green-900 font-medium">Child Impact</div>
                    </div>
                  </div>
                </div>
                
                {/* Parent selection */}
                <div className="flex justify-center items-center my-8 parent-selection">
                  <div className="flex w-full max-w-md justify-between items-center">
                    {/* Mama */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleSelectParent('Mama')}
                        className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full focus:outline-none border-4 overflow-hidden transition-all ${
                          selectedParent === 'Mama' 
                            ? 'border-purple-500 scale-105' 
                            : 'border-transparent hover:border-purple-300'
                        }`}
                      >
                        <img 
                          src={parents.mama.image} 
                          alt="Mama"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <p className="mt-2 font-medium">{parents.mama.name}</p>
                      <p className="text-xs text-gray-500">(press 'M' key)</p>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-32 sm:h-40 w-px bg-gray-300"></div>
                    
                    {/* Papa */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleSelectParent('Papa')}
                        className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full focus:outline-none border-4 overflow-hidden transition-all ${
                          selectedParent === 'Papa' 
                            ? 'border-blue-500 scale-105' 
                            : 'border-transparent hover:border-blue-300'
                        }`}
                      >
                        <img 
                          src={parents.papa.image} 
                          alt="Papa"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <p className="mt-2 font-medium">{parents.papa.name}</p>
                      <p className="text-xs text-gray-500">(press 'P' key)</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress */}
                <div className="text-center">
                  <p className="font-medium mb-2">
                    Question {currentQuestionIndex + 1} of {questionsToUse.length}
                  </p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-black transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with navigation - fixed at bottom */}
      <div className="border-t bg-white p-4 mt-auto">
        <div className="max-w-3xl mx-auto flex justify-between">
          <button 
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || isProcessing || isSubmitting}
            className={`px-4 py-2 border rounded flex items-center ${
              currentQuestionIndex === 0 || isProcessing || isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <ArrowLeft size={16} className="mr-1" />
            Previous
          </button>
          <button 
            className={`px-4 py-2 border rounded ${
              isProcessing || isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={handlePause}
            disabled={isProcessing || isSubmitting}
          >
            {mode === 'initial' ? 'Pause Survey' : 'Save & Exit'}
          </button>
          <button 
            className={`px-4 py-2 border rounded flex items-center ${
              isProcessing || isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={handleSkip}
            disabled={isProcessing || isSubmitting}
          >
            Skip
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Show AllieChat component */}
      {showAllieChat && <AllieChat />}

      {/* Survey Walkthrough */}
      <SurveyWalkthrough 
        isVisible={showWalkthrough} 
        onComplete={completeWalkthrough} 
      />
    </div>
  );
};

export default SurveyScreen;