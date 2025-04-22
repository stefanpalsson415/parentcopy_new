import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Volume2, ArrowRight, ArrowLeft, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';
import AllieChat from '../chat/AllieChat'; // Import AllieChat component
import QuestionFeedbackService from '../../services/QuestionFeedbackService';


// Simple illustrations instead of complex SVGs - just basic elements
const SimpleIllustrations = {
  "cleaning": () => (
    <span className="text-2xl">🧹</span>
  ),
  "cooking": () => (
    <span className="text-2xl">🍳</span>
  ),
  "planning": () => (
    <span className="text-2xl">📅</span>
  ),
  "homework": () => (
    <span className="text-2xl">📚</span>
  ),
  "driving": () => (
    <span className="text-2xl">🚗</span>
  ),
  "emotional": () => (
    <span className="text-2xl">❤️</span>
  ),
  "default": () => (
    <span className="text-2xl">👨‍👩‍👧‍👦</span>
  )
};

// Enhanced helper function to simplify questions for kids of different ages
const simplifyQuestionForChild = (question, childAge) => {
  if (!question) return "Who does this in your family?";
  
  // Original question text
  const originalText = question.text;
  
  // Get category for context
  const category = question.category || '';
  
  // For very young children (ages 3-7)
  if (childAge < 8) {
    // Handle Household Tasks
    if (category.includes("Household")) {
      if (originalText.includes("clean") || originalText.includes("dust")) {
        return "Who cleans up the house?";
      } else if (originalText.includes("cook") || originalText.includes("meal")) {
        return "Who makes food for everyone?";
      } else if (originalText.includes("shop") || originalText.includes("grocery")) {
        return "Who buys the food at the store?";
      } else if (originalText.includes("yard") || originalText.includes("garden")) {
        return "Who takes care of the yard?";
      } else if (originalText.includes("laundry") || originalText.includes("clothes")) {
        return "Who washes the clothes?";
      } else if (originalText.includes("plan")) {
        return "Who decides what your family is going to do?";
      } else if (originalText.includes("responsible for")) {
        return `Who ${originalText.toLowerCase().replace("who is responsible for", "does the")}?`;
      }
      // Default household simplification
      return `Who ${originalText.toLowerCase().replace("who ", "").replace("responsible for", "does")}?`;
    } 
    // Handle Parental Tasks - completely reframe these for children
    else if (category.includes("Parental")) {
      if (originalText.includes("primary responsibility")) {
        return "Who takes care of you the most?";
      } else if (originalText.includes("homework") || originalText.includes("school")) {
        return "Who helps you with your schoolwork?";
      } else if (originalText.includes("doctor") || originalText.includes("sick")) {
        return "Who takes care of you when you're sick?";
      } else if (originalText.includes("drive") || originalText.includes("car")) {
        return "Who drives you to places?";
      } else if (originalText.includes("emotion") || originalText.includes("feel")) {
        return "Who helps when you feel sad?";
      } else if (originalText.includes("bedtime")) {
        return "Who puts you to bed at night?";
      } else if (originalText.includes("coordinates")) {
        return "Who makes sure you get to all your activities?";
      } else if (originalText.includes("mental load") || originalText.includes("invisible")) {
        return "Who remembers all the important things in your family?";
      } else if (originalText.includes("anticipates")) {
        return "Who knows what you need before you ask?";
      }
      // Default parental simplification - properly reframe for child's perspective
      return `Who helps you ${originalText.toLowerCase().replace("who ", "").replace("responsible for", "with")}?`;
    }
  }
  // For older children (8-12)
  else if (childAge < 13) {
    if (category.includes("Parental")) {
      if (originalText.includes("primary responsibility")) {
        return "Who usually takes care of you day-to-day?";
      } else if (originalText.includes("mental load") || originalText.includes("invisible")) {
        return "Who remembers all the important things for your family?";
      } else if (originalText.includes("coordinates")) {
        return "Who organizes your activities and schedule?";
      } else if (originalText.includes("anticipates")) {
        return "Who usually knows what you need before you ask?";
      } else if (originalText.includes("responsible for")) {
        return originalText.replace("responsible for", "usually takes care of");
      }
    } else if (category.includes("Household")) {
      if (originalText.includes("responsible for")) {
        return originalText.replace("responsible for", "usually does");
      }
    }
    
    // Replace complex terms with simpler ones
    let simplifiedText = originalText
      .replace("coordinates", "plans")
      .replace("anticipates", "figures out")
      .replace("manages", "takes care of")
      .replace("mental load", "remembering things");
      
    // Add "Who" if it doesn't start with it
    if (!simplifiedText.startsWith("Who")) {
      return `Who ${simplifiedText.toLowerCase()}?`;
    }
    return simplifiedText;
  }
  // For teenagers (13+), keep original but simplify complex terms
  else {
    return originalText
      .replace("responsible for", "usually handles")
      .replace("emotional labor", "emotional support")
      .replace("mental load", "remembering and planning")
      .replace("anticipates developmental needs", "plans ahead for what you need")
      .replace("coordinates", "organizes");
  }
  
  return originalText; // Fallback to original text
};

const KidFriendlySurvey = ({ surveyType = "initial" }) => {
  const navigate = useNavigate();
  const { 
    fullQuestionSet, 
    updateSurveyResponse, 
    resetSurvey, 
    getSurveyProgress,
    generateWeeklyQuestions,
    currentSurveyResponses
  } = useSurvey();
  
  const { 
    selectedUser, 
    familyMembers, 
    completeInitialSurvey,
    completeWeeklyCheckIn,
    saveSurveyProgress,
    currentWeek,
    familyId,
    familyName,
    selectFamilyMember 
  } = useFamily();
  
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userResponses, setUserResponses] = useState({});
  const [questions, setQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllieChat, setShowAllieChat] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  
  // Refs
  const questionTimerRef = useRef(null);
  const keyboardInitialized = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const hasLoadedProgress = useRef(false);


// Ensure we have the correct selected user on mount
useEffect(() => {
  if (familyMembers.length > 0) {
    const storedUserId = localStorage.getItem('selectedUserId');
    if (storedUserId && (!selectedUser || selectedUser.id !== storedUserId)) {
      const userToSelect = familyMembers.find(m => m.id === storedUserId);
      if (userToSelect && userToSelect.role === 'child') {
        console.log("Restoring correct child for kid survey:", userToSelect.name);
        selectFamilyMember(userToSelect);
      }
    }
  }
}, [familyMembers]);


  
  // Redirect if no user is selected - with delay to allow context to initialize
useEffect(() => {
  const storedUserId = localStorage.getItem('selectedUserId');
  
  // If there's no stored ID, redirect immediately
  if (!storedUserId) {
    console.log("No selectedUserId in localStorage, redirecting to login");
    navigate('/login');
    return;
  }
  
  // If selectedUser is null but we have a storedId, give it time to load
  if (!selectedUser) {
    console.log("No selectedUser in context yet, waiting before redirect check...");
    
    // Wait for context to update before deciding to redirect
    const timer = setTimeout(() => {
      if (!selectedUser) {
        console.log("Still no selectedUser after delay, redirecting to login");
        navigate('/login');
      }
    }, 1000); // Allow 1 second for context to initialize
    
    return () => clearTimeout(timer);
  }
  
  // Extra validation - make sure it's a child
  if (selectedUser && selectedUser.role !== 'child') {
    console.log("Selected user is not a child, redirecting to adult survey");
    navigate('/survey');
  }
}, [selectedUser, navigate]);
  
  // Enable AllieChat after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAllieChat(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Reset survey when component mounts
  useEffect(() => {
    resetSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (questionTimerRef.current) {
        clearTimeout(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  // Add keyboard shortcuts for M and P keys
  useEffect(() => {
    // Function to handle key press
    const handleKeyPress = (e) => {
      if (isProcessing) return; // Prevent actions while processing
      
      // 'M' key selects Mama
      if (e.key.toLowerCase() === 'm') {
        handleSelectParent('Mama');
      }
      // 'P' key selects Papa
      else if (e.key.toLowerCase() === 'p') {
        handleSelectParent('Papa');
      }
    };
    
    // Set a small timeout to ensure component is fully rendered
    const timer = setTimeout(() => {
      // Clean up previous listeners if they exist
      if (keyboardInitialized.current) {
        window.removeEventListener('keydown', handleKeyPress);
      }
      
      // Add new listener
      window.addEventListener('keydown', handleKeyPress);
      keyboardInitialized.current = true;
      
      console.log("Keyboard shortcuts initialized for kid survey");
    }, 200);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (keyboardInitialized.current) {
        window.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, [isProcessing]);
  
  // Set up questions for kids based on survey type - Ensure exactly 50 questions with NO DUPLICATES
useEffect(() => {
  if (!fullQuestionSet || fullQuestionSet.length === 0) return;
  
  setIsLoadingQuestions(true);
  
  let questionSet;
  
  // Determine which questions to use based on the survey type
  if (surveyType === "weekly") {
    console.log(`Generating weekly questions for week ${currentWeek} for child: ${selectedUser?.id}`);
    
    // Create enhanced family data object with all children details
    const familyData = {
      familyName: familyName,
      familyId: familyId,
      children: familyMembers.filter(m => m.role === 'child').map(c => ({
        id: c.id, // Include ID for matching
        name: c.name, 
        age: c.age || 10
      }))
    };
    
    // Get previous responses for context
    const previousResponses = currentSurveyResponses || {};
    
    // Generate adaptive questions with full context AND child's ID
    questionSet = generateWeeklyQuestions(
      currentWeek, 
      true, // Pass true to indicate child
      familyData, 
      previousResponses,
      [], // No task completion data for kids
      selectedUser?.id // Pass the child's ID for personalization
    );
    
    console.log(`Generated ${questionSet?.length || 0} personalized weekly questions for child: ${selectedUser?.name}`);
  } else {
    console.log(`Using full question set with ${fullQuestionSet.length} questions`);
    questionSet = fullQuestionSet;
  }
  
  // Process the questions to make them age-appropriate
  if (selectedUser && selectedUser.role === 'child') {
      const childAge = parseInt(selectedUser.age) || 10; // Default to 10 if age is not specified
      
      // Get categories
      const categories = [
        "Visible Household Tasks",
        "Invisible Household Tasks",
        "Visible Parental Tasks",
        "Invisible Parental Tasks"
      ];
      
      const targetQuestionCount = surveyType === "weekly" ? 20 : 72;

      const questionsPerCategory = Math.ceil(targetQuestionCount / categories.length);
      
      // Process the questions to make them age-appropriate
      let processedQuestions = [];
      
      // Track used question texts to prevent duplicates
      const usedQuestionTexts = new Set();
      
      categories.forEach(category => {
        // Get questions for this category
        const categoryQuestions = questionSet.filter(q => q.category === category);
        
        // Sort questions by suitability for age - use baseWeight as a proxy for complexity
        if (childAge < 8) {
          categoryQuestions.sort((a, b) => parseFloat(a.baseWeight || 3) - parseFloat(b.baseWeight || 3));
        }
        
        // Take an even number of questions from each category without duplicates
        let addedCount = 0;
        let questionIndex = 0;
        
        while (addedCount < questionsPerCategory && questionIndex < categoryQuestions.length) {
          const originalQuestion = categoryQuestions[questionIndex];
          const simplifiedText = simplifyQuestionForChild(originalQuestion, childAge);
          
          // Check if this question text is already used (avoid duplicates)
          if (!usedQuestionTexts.has(simplifiedText)) {
            processedQuestions.push({
              ...originalQuestion,
              childText: simplifiedText,
              // Keep the original text for data connection
              text: originalQuestion.text
            });
            
            // Mark this question text as used
            usedQuestionTexts.add(simplifiedText);
            addedCount++;
          }
          
          questionIndex++;
        }
      });
      
      // Ensure we have EXACTLY the target number of questions
      let finalQuestions = processedQuestions;
      
      // If we don't have enough questions, duplicate some until we reach the target
      // But make sure to modify them slightly to avoid exact duplicates
      if (finalQuestions.length < targetQuestionCount) {
        // Sort by weight to duplicate the most important questions
        const sortedByWeight = [...finalQuestions].sort((a, b) => 
          parseFloat(b.totalWeight || 1) - parseFloat(a.totalWeight || 1)
        );
        
        // Add questions until we reach the target
        let counter = 1;
        while (finalQuestions.length < targetQuestionCount) {
          const questionToAdd = sortedByWeight[finalQuestions.length % sortedByWeight.length];
          
          // Create a variation by adding a small modifier to the text
          const variantText = `${questionToAdd.childText} (#${counter})`;
          
          finalQuestions.push({
            ...questionToAdd,
            id: `${questionToAdd.id}-duplicate-${finalQuestions.length}`,
            childText: variantText
          });
          
          counter++;
        }
      }
      // If we have too many questions, trim to the exact count
      else if (finalQuestions.length > targetQuestionCount) {
        finalQuestions = finalQuestions.slice(0, targetQuestionCount);
      }
      
      console.log(`Generated ${finalQuestions.length} age-appropriate questions for child age ${childAge}`);
      setQuestions(finalQuestions);
    } else {
      setQuestions(questionSet || []);
    }
    
    setIsLoadingQuestions(false);
  }, [fullQuestionSet, selectedUser, surveyType, currentWeek, generateWeeklyQuestions]);
  
  // Set up auto-save timer
  useEffect(() => {
    if (selectedUser && Object.keys(userResponses).length > 0) {
      // Clear any existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set up auto-save every 30 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        saveProgress();
      }, 30000);
      
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [userResponses, selectedUser]);
  
  // Enhanced useEffect to properly restore survey progress - FIXED version
  useEffect(() => {
    // Only run this if we have a user and loaded questions
    if (selectedUser && questions.length > 0 && !hasLoadedProgress.current) {
      console.log("Checking for previously saved progress...");
      
      // Check for user-specific stored progress first
      const userProgressKey = `surveyInProgress_${selectedUser.id}`;
let savedProgress = localStorage.getItem(userProgressKey);

// If not found with user-specific key, try the old format for backward compatibility
if (!savedProgress) {
  const oldFormatKey = 'surveyInProgress';
  const oldProgress = localStorage.getItem(oldFormatKey);
  if (oldProgress) {
    try {
      const parsed = JSON.parse(oldProgress);
      if (parsed.userId === selectedUser.id) {
        savedProgress = oldProgress;
        // Migrate to new format
        localStorage.setItem(userProgressKey, oldProgress);
        localStorage.removeItem(oldFormatKey);
        console.log("Migrated survey progress to user-specific key");
      }
    } catch (err) {
      console.error("Error checking old format progress:", err);
    }
  }
}
      
      let restoredIndex = -1;
      
      if (savedProgress) {
        try {
          const progressData = JSON.parse(savedProgress);
          
          // Verify this is the right user's data
          if (progressData.userId === selectedUser.id) {
            console.log(`Found saved progress for user: ${selectedUser.id}`);
            
            // If we have saved responses, restore them
            if (progressData.responses && Object.keys(progressData.responses).length > 0) {
              const responses = progressData.responses;
              setUserResponses(responses);
              
              // Also update parent context to ensure consistency
              Object.entries(responses).forEach(([questionId, response]) => {
                updateSurveyResponse(questionId, response);
              });
            }
            
            // Set current question to the last one the user was working on
            if (progressData.lastQuestionIndex !== undefined) {
              restoredIndex = progressData.lastQuestionIndex;
            }
            
            console.log(`Restored progress for ${selectedUser.name}`);
          }
        } catch (error) {
          console.error("Error parsing saved progress:", error);
        }
      } else if (currentSurveyResponses && Object.keys(currentSurveyResponses).length > 0) {
        // Fall back to checking currentSurveyResponses for this user
        console.log("No localStorage progress found, checking context responses");
        
        // Find the last answered question index
        let lastAnsweredIndex = -1;
        const questionResponses = {};
        
        // First, extract all responses that match our question IDs
        questions.forEach((question, index) => {
          if (currentSurveyResponses[question.id]) {
            questionResponses[question.id] = currentSurveyResponses[question.id];
            lastAnsweredIndex = Math.max(lastAnsweredIndex, index);
          }
        });
        
        // If we found saved answers, jump to the next unanswered question
        if (lastAnsweredIndex >= 0) {
          console.log(`Found progress! Last answered question: ${lastAnsweredIndex}`);
          
          // Set current question to the next unanswered one (not beyond the end)
          restoredIndex = Math.min(lastAnsweredIndex + 1, questions.length - 1);
          
          // Load all previous answers into local state
          setUserResponses(questionResponses);
          
          console.log(`Restored to question ${restoredIndex + 1} with ${Object.keys(questionResponses).length} saved answers`);
        }
      }
      
      // Wait for state updates to complete before setting current question index
      if (restoredIndex >= 0) {
        // Use a timeout to ensure all state updates have been processed
        setTimeout(() => {
          setCurrentQuestionIndex(restoredIndex);
          // Also set selected parent for the current question
          const currentQuestionId = questions[restoredIndex]?.id;
          if (currentQuestionId) {
            const savedResponse = userResponses[currentQuestionId] || 
                                currentSurveyResponses[currentQuestionId];
            setSelectedParent(savedResponse || null);
          }
        }, 0);
      }
      
      hasLoadedProgress.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, questions.length]);
  
  // Handle question feedback when a question doesn't apply
  const handleQuestionFeedback = async (feedbackType) => {
    if (isProcessing) return; // Prevent actions while processing
    
    setIsProcessing(true);
    
    try {
      // Create feedback object
      const feedback = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        childText: currentQuestion.childText,
        feedbackType: feedbackType,
        category: currentQuestion.category,
        childAge: selectedUser?.age,
        childId: selectedUser?.id,
        familyId: familyId
      };
      
      console.log("Sending question feedback:", feedback);
      
      // Send feedback to our service
      await QuestionFeedbackService.recordQuestionFeedback(feedback);
      
      // Skip to the next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setSelectedParent(null);
        setShowExplanation(false);
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
  
  // Save progress function (used by both auto-save and manual save)
  const saveProgress = async () => {
    if (!selectedUser || Object.keys(userResponses).length === 0) return;
    
    try {
      console.log("Saving survey progress...");
      await saveSurveyProgress(selectedUser.id, userResponses);
      
      // Store information about the paused survey in localStorage with user-specific key
      localStorage.setItem(`surveyInProgress_${selectedUser.id}`, JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime(),
        surveyType: surveyType,
        lastQuestionIndex: currentQuestionIndex,
        responses: userResponses
      }));
      
      console.log("Progress saved successfully");
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };
  
// Get a stable color for a member based on their id
const getMemberColor = (member) => {
  if (!member || !member.id) return profileColors[0];
  
  // Use a simple hash of the member's id to pick a color consistently
  const hashCode = member.id.split('').reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  
  return profileColors[hashCode % profileColors.length];
};

// Array of vibrant colors for profile placeholders
const profileColors = [
  'bg-purple-500',  // Vibrant purple
  'bg-blue-500',    // Bright blue
  'bg-pink-500',    // Vibrant pink
  'bg-green-500',   // Bright green
  'bg-amber-500',   // Warm amber
  'bg-cyan-500',    // Teal/cyan
  'bg-red-500',     // Vibrant red
  'bg-indigo-500',  // Rich indigo
];

// Check if an image URL is valid
const isValidImageUrl = (url) => {
  // Check if url is defined and not empty
  if (!url || url === '') return false;
  
  // Explicit check for problematic cases
  const invalidPatterns = ['undefined', 'null', 'Tegner', 'Profile', 'broken', 'placeholder'];
  if (invalidPatterns.some(pattern => url?.includes(pattern))) return false;
  
  // If it's a data URL, it's likely valid
  if (url?.startsWith('data:image/')) return true;
  
  // If it has a common image extension, it's likely valid
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return validExtensions.some(ext => url?.toLowerCase().includes(ext));
};

  // Handle parent selection - FIXED version
  const handleSelectParent = (parent) => {
    // Prevent multiple calls while processing
    if (isProcessing) {
      console.log("Ignoring selection - already processing");
      return;
    }
    
    // Set processing state immediately
    setIsProcessing(true);
    console.log(`Selected ${parent} for question ${currentQuestionIndex + 1}`);
    
    // Cancel any existing timers
    if (questionTimerRef.current) {
      clearTimeout(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    
    // Set the selected parent for UI feedback
    setSelectedParent(parent);
    
    // Get current question
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error("No current question found");
      setIsProcessing(false);
      return;
    }
    
    // Record response
    const updatedResponses = {
      ...userResponses,
      [currentQuestion.id]: parent
    };
    setUserResponses(updatedResponses);
    
    // Update parent context
    updateSurveyResponse(currentQuestion.id, parent);
    
    // Store current index in a local variable to avoid closure issues
    const currentIdx = currentQuestionIndex;
    
    // Wait for a moment to show the selection, but no need to modify state again
    questionTimerRef.current = setTimeout(() => {
      // Check if we're still at the same question (to avoid race conditions)
      if (currentIdx === currentQuestionIndex) {
        // Then decide whether to go to next question or complete survey
        if (currentIdx < questions.length - 1) {
          // Move to next question - directly set the new index
          setCurrentQuestionIndex(currentIdx + 1);
          
          // Reset selection state
          setSelectedParent(null);
        } else {
          // Complete the survey
          handleCompleteSurvey();
        }
      }
      setIsProcessing(false);
    }, 500);
  };

  // Handle pause survey
  const handlePauseSurvey = async () => {
    if (isProcessing) return; // Prevent actions while processing
    
    setIsProcessing(true);
    
    try {
      // Create a copy of all current responses
      const allResponses = {...currentSurveyResponses, ...userResponses};
      
      console.log("Saving survey progress before pausing...");
      console.log("Responses to save:", Object.keys(allResponses).length);
      
      // Save the current progress
      await saveSurveyProgress(selectedUser.id, allResponses);
      console.log("Progress saved successfully");
      
      // Store information about the paused survey in localStorage with user-specific key
      localStorage.setItem(`surveyInProgress_${selectedUser.id}`, JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime(),
        surveyType: surveyType,
        lastQuestionIndex: currentQuestionIndex,
        responses: allResponses
      }));
      
      // Navigate back to login screen
      navigate('/login');
    } catch (error) {
      console.error('Error saving survey progress:', error);
      alert('There was an error saving your progress, but you can continue later.');
      navigate('/login');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Move to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setSelectedParent(userResponses[questions[currentQuestionIndex - 1].id] || null);
      setShowExplanation(false);
    }
  };
  
  // Complete survey - FIXED navigation after completion
  const handleCompleteSurvey = async () => {
    setIsSubmitting(true);
    
    try {
      console.log(`Attempting to save ${surveyType} survey data...`);
      
      // Ensure we have the latest responses from state
      const allResponses = {...currentSurveyResponses, ...userResponses};
      
      // First try to save the data before any navigation
      if (surveyType === "weekly") {
        // Save weekly check-in
        console.log("Completing weekly check-in with responses:", Object.keys(allResponses).length);
        await completeWeeklyCheckIn(selectedUser.id, currentWeek, allResponses);
        console.log("Weekly check-in saved successfully");
      } else {
        // Save initial survey
        console.log("Completing initial survey with responses:", Object.keys(allResponses).length);
        await completeInitialSurvey(selectedUser.id, allResponses);
        console.log("Initial survey saved successfully");
      }
      
      // Clear the progress flag since we've completed the survey
      localStorage.removeItem(`surveyInProgress_${selectedUser.id}`);
      
      // Navigate to loading screen
      console.log("Navigating to loading screen");
      navigate('/loading');
      
      // Check if all family members have completed their surveys
      const allCompleted = familyMembers.every(member => 
        member.completed || member.id === selectedUser.id
      );
      
      // Wait briefly before navigating to the final destination
      setTimeout(() => {
        if (allCompleted) {
          console.log("All family members completed surveys, going to dashboard");
          navigate('/dashboard');
        } else {
          console.log("Some family members still need to complete surveys, going to family selection");
          navigate('/login', { state: { showCompletionScreen: true } });
        }
      }, 2000);
    } catch (error) {
      console.error(`Error completing ${surveyType} survey:`, error);
      alert('There was an error saving your responses. Please try again.');
      
      // Don't navigate away on error
      setIsSubmitting(false);
    }
  };

  // Function to determine which illustration to show
  function getIllustrationForQuestion(question) {
    if (!question) return 'default';
    
    // Simple mapping based on category instead of complex matching
    const category = question.category || '';
    
    if (category === "Visible Household Tasks") {
      return 'cleaning';
    } 
    else if (category === "Invisible Household Tasks") {
      return 'planning';
    } 
    else if (category === "Visible Parental Tasks") {
      return question.text.toLowerCase().includes('homework') ? 'homework' : 'driving';
    } 
    else if (category === "Invisible Parental Tasks") {
      return 'emotional';
    }
    
    return 'default';
  }

  // Render the appropriate illustration
  const renderIllustration = () => {
    if (!questions[currentQuestionIndex]) return null;
    
    // Use our function to determine the illustration type
    const illustrationType = getIllustrationForQuestion(questions[currentQuestionIndex]);
    
    // Look up the component
    const IllustrationComponent = SimpleIllustrations[illustrationType] || SimpleIllustrations.default;
    
    return <IllustrationComponent />;
  };

  // Calculate progress percentage
  const progressPercentage = questions.length > 0 
    ? ((currentQuestionIndex) / (questions.length - 1)) * 100 
    : 0;

  // Find Mama and Papa users from family members
  const mamaUser = familyMembers.find(m => m.roleType === 'Mama' || m.name === 'Mama');
  const papaUser = familyMembers.find(m => m.roleType === 'Papa' || m.name === 'Papa');
  
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
  
  // Current question
  const currentQuestion = questions[currentQuestionIndex];
  
  // Handle loading state
  if (isLoadingQuestions) {
    return <div className="flex items-center justify-center h-64">Loading fun questions...</div>;
  }
  
  // Only render when questions are loaded
  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-64">Loading fun questions...</div>;
  }
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-4 shadow-lg flex flex-col font-roboto" style={{ minHeight: 'calc(100vh - 2rem)' }}>

      {/* Header with user info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
        <div className="w-12 h-12 rounded-full overflow-hidden mr-3 border-2 border-black shadow-md">
  {isValidImageUrl(selectedUser?.profilePicture) ? (
    <img 
      src={selectedUser?.profilePicture} 
      alt={selectedUser?.name}
      className="w-full h-full object-cover"
    />
  ) : (
    // Colored placeholder for profile
    <div className={`w-full h-full flex items-center justify-center text-white ${getMemberColor(selectedUser)}`}>
      <span className="text-2xl font-bold font-roboto">
        {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  )}
</div>
          <div>
            <h2 className="font-bold text-black text-xl font-roboto">
              {selectedUser?.name}'s {surveyType === "weekly" ? "Weekly Adventure" : "Family Survey"}
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button 
            onClick={() => navigate('/login')}
            className="text-xs bg-black text-white px-3 py-1.5 rounded mb-2 hover:bg-gray-800 transition font-roboto"
            disabled={isProcessing || isSubmitting}
          >
            Switch User
          </button>
          <div className="bg-gray-100 px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-800 font-roboto">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main question */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-2 border-gray-100">
        {/* Category indicator with icon */}
        <div className="mb-4 flex justify-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentQuestion.category === "Visible Household Tasks" ? "bg-blue-100 text-blue-800" :
            currentQuestion.category === "Invisible Household Tasks" ? "bg-purple-100 text-purple-800" :
            currentQuestion.category === "Visible Parental Tasks" ? "bg-green-100 text-green-800" :
            "bg-pink-100 text-pink-800"
          }`}>
            {currentQuestion.category}
          </span>
        </div>
        
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-black">
            {currentQuestion.childText || currentQuestion.text} {renderIllustration()}
          </h2>
          
          {/* Simplified explanation always visible */}
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md inline-block">
            Who usually does this in your family?
          </p>
          
          
        </div>
        
        {/* Simple explanation always visible for kids */}
        <div className="mb-4 bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-100">
          <p className="flex items-center justify-center">
            <Info size={16} className="mr-2 text-gray-500" />
            Pick who you see doing this most often!
          </p>
        </div>
      </div>
      
      {/* Parent selection */}
      <div className="flex justify-center items-center mb-6">
        <div className="flex w-full max-w-md justify-between items-center">
          {/* Mama */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => !isProcessing && !isSubmitting && handleSelectParent('Mama')}
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full focus:outline-none border-4 overflow-hidden transition-all transform hover:scale-105 ${
                selectedParent === 'Mama' 
                  ? 'border-purple-500 scale-110' 
                  : 'border-purple-200 hover:border-purple-300'
              } ${(isProcessing || isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-label="Select Mama"
              disabled={isProcessing || isSubmitting}
            >
              <img 
                src={parents.mama.image} 
                alt="Mama"
                className="w-full h-full object-cover"
              />
            </button>
            <p className="mt-2 font-medium text-black">{parents.mama.name}</p>
            <p className="text-xs text-gray-600">(press M key)</p>
          </div>
          
          {/* Center divider */}
          <div className="flex flex-col items-center">
            <div className="h-32 sm:h-40 w-px bg-gray-300"></div>
            <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-gray-800 font-bold text-sm absolute">
              OR
            </div>
          </div>
          
          {/* Papa */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => !isProcessing && !isSubmitting && handleSelectParent('Papa')}
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full focus:outline-none border-4 overflow-hidden transition-all transform hover:scale-105 ${
                selectedParent === 'Papa' 
                  ? 'border-blue-500 scale-110' 
                  : 'border-blue-200 hover:border-blue-300'
              } ${(isProcessing || isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-label="Select Papa"
              disabled={isProcessing || isSubmitting}
            >
              <img 
                src={parents.papa.image}
                alt="Papa"
                className="w-full h-full object-cover"
              />
            </button>
            <p className="mt-2 font-medium text-black">{parents.papa.name}</p>
            <p className="text-xs text-gray-600">(press P key)</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mt-4">
        <button 
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isProcessing || isSubmitting}
          className={`px-4 py-2 rounded-md flex items-center ${
            currentQuestionIndex === 0 || isProcessing || isSubmitting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-black hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </button>
        
        <button
          onClick={handlePauseSurvey}
          disabled={isProcessing || isSubmitting}
          className={`px-4 py-2 rounded-md bg-white text-black hover:bg-gray-100 border border-gray-200 ${
            isProcessing || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Pause Survey
        </button>
        
        <div className="font-medium text-black bg-white px-3 py-1 rounded-lg border border-gray-200">
          <div className="flex items-center">
            {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </div>
      
      {/* Add AllieChat component */}
      {showAllieChat && <AllieChat />}
    </div>
  );
};

export default KidFriendlySurvey;