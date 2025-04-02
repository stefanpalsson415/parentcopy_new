import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Volume2, ArrowRight, ArrowLeft, Star, Medal, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';

// Simple illustrations instead of complex SVGs - just basic elements
const SimpleIllustrations = {
  "cleaning": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">🧹</div>
        <p className="text-sm">Cleaning</p>
      </div>
    </div>
  ),
  "cooking": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">🍳</div>
        <p className="text-sm">Cooking</p>
      </div>
    </div>
  ),
  "planning": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-sm">Planning</p>
      </div>
    </div>
  ),
  "homework": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">📚</div>
        <p className="text-sm">Homework</p>
      </div>
    </div>
  ),
  "driving": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">🚗</div>
        <p className="text-sm">Driving</p>
      </div>
    </div>
  ),
  "emotional": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">❤️</div>
        <p className="text-sm">Caring</p>
      </div>
    </div>
  ),
  "default": () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
        <p className="text-sm">Family</p>
      </div>
    </div>
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
        return "Who decides what we're going to do?";
      }
      // Default household simplification
      return `Who ${originalText.toLowerCase().replace("who ", "").replace("responsible for", "does")}?`;
    } 
    else if (category.includes("Parental")) {
      if (originalText.includes("homework") || originalText.includes("school")) {
        return "Who helps you with your schoolwork?";
      } else if (originalText.includes("doctor") || originalText.includes("sick")) {
        return "Who takes care of you when you're sick?";
      } else if (originalText.includes("drive") || originalText.includes("car")) {
        return "Who drives you to places?";
      } else if (originalText.includes("emotion") || originalText.includes("feel")) {
        return "Who helps when you feel sad?";
      } else if (originalText.includes("bedtime")) {
        return "Who puts you to bed at night?";
      }
      // Default parental simplification
      return `Who helps you ${originalText.toLowerCase().replace("who ", "").replace("responsible for", "with")}?`;
    }
  }
  // For older children (8-12)
  else if (childAge < 13) {
    if (originalText.includes("responsible for")) {
      return originalText.replace("responsible for", "usually does");
    }
    if (originalText.includes("coordinates")) {
      return originalText.replace("coordinates", "plans");
    }
    if (originalText.includes("anticipates")) {
      return originalText.replace("anticipates", "knows about");
    }
    // Add "Who" if it doesn't start with it
    if (!originalText.startsWith("Who")) {
      return `Who ${originalText.toLowerCase()}?`;
    }
    return originalText;
  }
  // For teenagers (13+), keep original but simplify complex terms
  else {
    return originalText
      .replace("responsible for", "takes care of")
      .replace("emotional labor", "emotional support")
      .replace("anticipates developmental needs", "plans ahead for what you need");
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
    currentWeek 
  } = useFamily();
  
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userResponses, setUserResponses] = useState({});
  const [gameStatus, setGameStatus] = useState({
    mamaPosition: 0,
    papaPosition: 0,
    stars: 0
  });
  const [showReward, setShowReward] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs
  const questionTimerRef = useRef(null);
  const keyboardInitialized = useRef(false);
  const autoSaveTimerRef = useRef(null);

  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
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
  
  // Set up questions for kids based on survey type - Ensure exactly 50 questions
  useEffect(() => {
    if (!fullQuestionSet || fullQuestionSet.length === 0) return;
    
    let questionSet;
    
    // Determine which questions to use based on the survey type
    if (surveyType === "weekly") {
      console.log(`Generating weekly questions for week ${currentWeek}`);
      questionSet = generateWeeklyQuestions(currentWeek, true); // Pass true to indicate child
      console.log(`Generated ${questionSet.length} weekly questions`);
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
      
      // Prepare to select EXACTLY 50 questions for initial survey, 30 for weekly
      const targetQuestionCount = surveyType === "weekly" ? 30 : 50;
      const questionsPerCategory = Math.ceil(targetQuestionCount / categories.length);
      
      // Process the questions to make them age-appropriate
      const processedQuestions = [];
      
      categories.forEach(category => {
        // Get questions for this category
        const categoryQuestions = questionSet.filter(q => q.category === category);
        
        // Sort questions by suitability for age - use baseWeight as a proxy for complexity
        if (childAge < 8) {
          categoryQuestions.sort((a, b) => parseFloat(a.baseWeight || 3) - parseFloat(b.baseWeight || 3));
        }
        
        // Take an even number of questions from each category
        for (let i = 0; i < questionsPerCategory; i++) {
          if (i < categoryQuestions.length) {
            // Create a modified version with age-appropriate text
            const originalQuestion = categoryQuestions[i];
            const simplifiedText = simplifyQuestionForChild(originalQuestion, childAge);
            
            processedQuestions.push({
              ...originalQuestion,
              childText: simplifiedText,
              // Keep the original text for data connection
              text: originalQuestion.text
            });
          }
        }
      });
      
      // Ensure we have EXACTLY the target number of questions
      let finalQuestions = processedQuestions;
      
      // If we don't have enough questions, duplicate some until we reach the target
      if (finalQuestions.length < targetQuestionCount) {
        // Sort by weight to duplicate the most important questions
        const sortedByWeight = [...finalQuestions].sort((a, b) => 
          parseFloat(b.totalWeight || 1) - parseFloat(a.totalWeight || 1)
        );
        
        // Add questions until we reach the target
        while (finalQuestions.length < targetQuestionCount) {
          const questionToAdd = sortedByWeight[finalQuestions.length % sortedByWeight.length];
          finalQuestions.push({
            ...questionToAdd,
            id: `${questionToAdd.id}-duplicate-${finalQuestions.length}`
          });
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
  
  // Enhanced useEffect to properly restore survey progress
  useEffect(() => {
    // Only run this if we have a user and loaded questions
    if (selectedUser && questions.length > 0 && currentSurveyResponses && Object.keys(currentSurveyResponses).length > 0) {
      console.log("Checking for previously saved progress...", currentSurveyResponses);
      
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
        const nextIndex = Math.min(lastAnsweredIndex + 1, questions.length - 1);
        setCurrentQuestionIndex(nextIndex);
        
        // Load all previous answers into local state
        setUserResponses(questionResponses);
        
        // Update game state to match saved progress
        const mamaCount = Object.values(questionResponses).filter(v => v === 'Mama').length;
        const papaCount = Object.values(questionResponses).filter(v => v === 'Papa').length;
        
        // Update game status - make sure positions reflect actual progress
        setGameStatus({
          mamaPosition: mamaCount,
          papaPosition: papaCount,
          stars: Math.floor(lastAnsweredIndex / 20)
        });
        
        // Also update total stars
        setTotalStars(Math.floor(lastAnsweredIndex / 20));
        
        console.log(`Restored to question ${nextIndex + 1} with ${Object.keys(questionResponses).length} saved answers`);
      }
    }
  }, [selectedUser, questions, currentSurveyResponses]);
  
  // Save progress function (used by both auto-save and manual save)
  const saveProgress = async () => {
    if (!selectedUser || Object.keys(userResponses).length === 0) return;
    
    try {
      console.log("Saving survey progress...");
      await saveSurveyProgress(selectedUser.id, userResponses);
      
      // Store information about the paused survey in localStorage
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime(),
        surveyType: surveyType,
        lastQuestionIndex: currentQuestionIndex
      }));
      
      console.log("Progress saved successfully");
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };
  
  // Handle parent selection
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
    
    // Wait for a moment to show the selection
    questionTimerRef.current = setTimeout(() => {
      // Then decide whether to go to next question or complete survey
      if (currentIdx < questions.length - 1) {
        // Move to next question - use exact index instead of functional update
        const nextIndex = currentIdx + 1;
        console.log(`Moving to question ${nextIndex + 1} (from ${currentIdx + 1})`);
        setCurrentQuestionIndex(nextIndex);
        
        // Update game state based on answer - use currentIdx instead of currentQuestionIndex
        setGameStatus(prev => ({
          ...prev,
          mamaPosition: parent === 'Mama' ? currentIdx + 1 : prev.mamaPosition,
          papaPosition: parent === 'Papa' ? currentIdx + 1 : prev.papaPosition,
          stars: (currentIdx + 1) % 20 === 0 ? prev.stars + 1 : prev.stars
        }));
        
        // Show reward if appropriate
        if ((currentIdx + 1) % 20 === 0) {
          setShowReward(true);
          setTotalStars(prev => prev + 1);
          
          // Hide reward after delay
          setTimeout(() => {
            setShowReward(false);
          }, 3000);
        }
        
        // Reset selection state
        setSelectedParent(null);
        setIsProcessing(false);
      } else {
        // Complete the survey
        handleCompleteSurvey();
      }
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
      
      // Store information about the paused survey in localStorage
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime(),
        surveyType: surveyType,
        lastQuestionIndex: currentQuestionIndex
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
    // Show a big celebration!
    setShowReward(true);
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
      localStorage.removeItem('surveyInProgress');
      
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
      setShowReward(false);
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
  
  // Only render when questions are loaded
  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-64">Loading fun questions...</div>;
  }
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-4 shadow-lg min-h-screen flex flex-col font-roboto">
      {/* Header with user info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3 border-2 border-black shadow-md">
            <img 
              src={selectedUser?.profilePicture} 
              alt={selectedUser?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-bold text-black text-xl font-roboto">
              {selectedUser?.name}'s {surveyType === "weekly" ? "Weekly Adventure" : "Family Survey"}
            </h2>
            <div className="flex items-center">
              {[...Array(totalStars)].map((_, i) => (
                <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
              ))}
              {totalStars > 0 && 
                <span className="text-xs text-amber-600 ml-1 font-medium font-roboto">
                  {totalStars} {totalStars === 1 ? 'Star' : 'Stars'} earned!
                </span>
              }
            </div>
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
            {currentQuestion.childText || currentQuestion.text}
          </h2>
          
          {/* Simplified explanation always visible */}
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md inline-block">
            Who usually does this in your family?
          </p>
        </div>
        
        {/* Task Illustration - larger and more prominent */}
        <div className="flex justify-center mb-6">
          <div className="task-illustration p-6 bg-gray-50 rounded-lg border border-gray-100 transform hover:scale-105 transition-transform" style={{width: "280px", height: "210px"}}>
            {renderIllustration()}
          </div>
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
      
      {/* Game-like progress tracker */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mt-auto">
        <h2 className="text-lg font-semibold mb-2 text-center text-gray-800">Family Adventure Track!</h2>
        <div className="relative h-20 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
          {/* Track background with markers */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            {[...Array(6)].map((_, index) => (
              <div 
                key={index} 
                className={`w-6 h-6 rounded-full z-10 flex items-center justify-center ${
                  index * (questions.length/5) <= currentQuestionIndex 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Path line */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 transform -translate-y-1/2"></div>
          
          {/* Progress line */}
          <div 
            className="absolute top-1/2 left-0 h-2 bg-gradient-to-r from-gray-400 to-black transform -translate-y-1/2 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
          
          {/* Mama character */}
          <div 
            className="absolute top-2 w-10 h-10 transition-all duration-500"
            style={{ 
              left: `calc(${Math.min(gameStatus.mamaPosition, questions.length - 1) / (questions.length - 1) * 100}% - 16px)`,
              maxLeft: 'calc(100% - 32px)'
            }}
          >
            <div className="w-10 h-10 bg-purple-200 rounded-full border-2 border-purple-500 flex items-center justify-center overflow-hidden">
              <img 
                src={parents.mama.image} 
                alt="Mama"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Papa character */}
          <div 
            className="absolute bottom-2 w-10 h-10 transition-all duration-500"
            style={{ 
              left: `calc(${Math.min(gameStatus.papaPosition, questions.length - 1) / (questions.length - 1) * 100}% - 16px)`,
              maxLeft: 'calc(100% - 32px)'
            }}
          >
            <div className="w-10 h-10 bg-blue-200 rounded-full border-2 border-blue-500 flex items-center justify-center overflow-hidden">
              <img 
                src={parents.papa.image} 
                alt="Papa"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Reward icons at intervals */}
          {[1, 2, 3, 4, 5].map(idx => (
            <div 
              key={idx}
              className="absolute top-1/2 transform -translate-y-1/2 z-0"
              style={{ left: `${(idx * 20) - 3}%` }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Star size={16} className={`${
                  currentQuestionIndex >= (idx * questions.length/5) 
                    ? 'text-amber-400 fill-amber-400' 
                    : 'text-gray-300'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation footer */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
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
            {Math.floor(currentQuestionIndex / (questions.length / 20)) >= 1 && 
              <Star size={14} className="text-amber-400 fill-amber-400 mr-1" />}
            {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </div>
      
      {/* Celebration overlay - shown when earning stars */}
      {showReward && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="relative">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <Medal size={60} className="text-amber-500" />
                  <Star size={24} className="absolute -top-2 -right-2 text-amber-400 fill-amber-400" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-black mb-2">Amazing Job!</h2>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  <p className="text-black mb-3">You earned a star for your help!</p>
                  <p className="text-sm text-gray-600 mb-6">
                    Keep going to earn more stars and finish the survey!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-black mb-3">You completed the whole survey!</p>
                  <p className="text-sm text-gray-600 mb-6">
                    Thank you for helping your family balance responsibilities!
                  </p>
                </>
              )}
              
              <button 
                className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transform transition-all"
                onClick={() => setShowReward(false)}
              >
                {currentQuestionIndex < questions.length - 1 ? "Continue Adventure!" : "Finish!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KidFriendlySurvey;