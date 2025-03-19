import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, HelpCircle, Brain, Scale } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';

const WeeklyCheckInScreen = () => {
  const navigate = useNavigate();
  const { 
    selectedUser,
    familyMembers,
    completeWeeklyCheckIn,
    currentWeek,
    saveSurveyProgress
  } = useFamily();
  
  const { 
    generateWeeklyQuestions,
    currentSurveyResponses,
    updateSurveyResponse,
    resetSurvey,
    getSurveyProgress
  } = useSurvey();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [weeklyQuestions, setWeeklyQuestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  
  // Ref to track if keyboard listeners are initialized
  const keyboardInitialized = useRef(false);
  
  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
  // Check if this user has already completed this week's check-in
  useEffect(() => {
    if (selectedUser && selectedUser.weeklyCompleted && 
        selectedUser.weeklyCompleted[currentWeek-1]?.completed) {
      alert("You've already completed this week's check-in!");
      navigate('/dashboard'); // Redirect back to dashboard
    }
  }, [selectedUser, currentWeek, navigate]);
  
  // Initialize weekly questions and reset survey - only once
  useEffect(() => {
    setWeeklyQuestions(generateWeeklyQuestions(currentWeek));
    resetSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]); // Only depend on currentWeek, not resetSurvey
  
  // Find Mama and Papa users from family members
  const mamaUser = familyMembers.find(m => m.roleType === 'Mama' || m.name === 'Mama');
  const papaUser = familyMembers.find(m => m.roleType === 'Papa' || m.name === 'Papa');
  
// Generate AI explanation for a specific question
const generateAIExplanation = (question) => {
  if (!question) return "";
  
  // Base explanation parts
  let aiLogic = "";
  
  // Add category-specific insights
  switch (question.category) {
    case "Visible Household Tasks":
      aiLogic = `This question about ${question.text.toLowerCase()} helps reveal imbalances in day-to-day household management that are easily observable. The AI selected it because visible tasks often show the most immediate opportunities for rebalancing.`;
      break;
    case "Invisible Household Tasks":
      aiLogic = `This question about ${question.text.toLowerCase()} targets the mental load and planning work that often goes unnoticed. The AI prioritized it because invisible work imbalance is a significant predictor of relationship strain.`;
      break;
    case "Visible Parental Tasks":
      aiLogic = `This question about ${question.text.toLowerCase()} helps identify patterns in direct childcare responsibilities. The AI selected it because balancing these tasks has immediate impact on parent stress levels and child development.`;
      break;
    case "Invisible Parental Tasks":
      aiLogic = `This question about ${question.text.toLowerCase()} addresses the emotional labor and planning work of parenting. The AI prioritized it because these tasks often account for the largest imbalances in family workload.`;
      break;
    default:
      aiLogic = `This question was selected because it addresses a key aspect of family workload balance.`;
  }
  
  // Add weight-related explanation if available
  if (question.totalWeight) {
    const weightNum = parseFloat(question.totalWeight);
    if (weightNum > 10) {
      aiLogic += ` With an impact score of ${weightNum.toFixed(1)}, this is considered a high-impact task that significantly affects family dynamics.`;
    } else if (weightNum > 7) {
      aiLogic += ` With an impact score of ${weightNum.toFixed(1)}, this task has medium-high impact on overall family balance.`;
    } else {
      aiLogic += ` Tracking this task over time provides valuable insights for improving family balance.`;
    }
  }
  
  return aiLogic;
};


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
  
  // Set up keyboard shortcuts - with a slight delay to ensure component is mounted
  useEffect(() => {
    // Only set up listener if not in processing state
    if (isProcessing) return;
    
    // Function to handle key press
    const handleKeyPress = (e) => {
      // Check if we have a valid question at current index
      const hasValidQuestion = weeklyQuestions && weeklyQuestions[currentQuestionIndex];
      
      if (isProcessing || !hasValidQuestion) return; // Prevent actions during processing
      
      // 'M' key selects Mama
      if (e.key.toLowerCase() === 'm') {
        handleSelectParent('Mama');
      }
      // 'P' key selects Papa
      else if (e.key.toLowerCase() === 'p') {
        handleSelectParent('Papa');
      }
    };
    
    // Add listener
    window.addEventListener('keydown', handleKeyPress);
    keyboardInitialized.current = true;
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentQuestionIndex, isProcessing, weeklyQuestions]); // Fixed dependencies - use primitive sources

  // Get current question
  const currentQuestion = weeklyQuestions[currentQuestionIndex];
  
  // Handle parent selection
  const handleSelectParent = (parent) => {
    if (isProcessing) return; // Prevent multiple selections while processing
    setIsProcessing(true);
    
    setSelectedParent(parent);
    
    // Save response
    if (currentQuestion) {
      updateSurveyResponse(currentQuestion.id, parent);
    
      // Wait a moment to show selection before moving to next question
      setTimeout(() => {
        if (currentQuestionIndex < weeklyQuestions.length - 1) {
          // Use functional state update to ensure we're using the latest value
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setSelectedParent(null);
          setShowExplanation(false);
          setIsProcessing(false); // Reset processing state
        } else {
          // Survey completed, save responses - works for both Mama and Papa
          console.log("Last question answered, completing survey with parent:", parent);
          handleCompleteSurvey();
        }
      }, 500);
    }
  };
  
  // Handle survey completion
  const handleCompleteSurvey = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    console.log("Starting survey completion process");
    
    try {
      // First navigate to loading screen to show transition
      navigate('/loading');
      
      // Save weekly check-in responses to database
      console.log("Saving weekly check-in responses to database");
      await completeWeeklyCheckIn(selectedUser.id, currentWeek, currentSurveyResponses);
      
      // Add a timeout before navigating to dashboard to ensure data is processed
      setTimeout(() => {
        console.log("Navigation to dashboard");
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error completing weekly check-in:', error);
      alert('There was an error saving your responses. Please try again.');
      
      // Even on error, navigate back to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Move to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      
      if (weeklyQuestions[currentQuestionIndex - 1]) {
        setSelectedParent(currentSurveyResponses[weeklyQuestions[currentQuestionIndex - 1].id] || null);
      }
      
      setShowExplanation(false);
    }
  };
  
  // Skip question
  const handleSkip = () => {
    if (currentQuestionIndex < weeklyQuestions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedParent(null);
      setShowExplanation(false);
    } else {
      // Survey completed, move to dashboard
      handleCompleteSurvey();
    }
  };
  
  // Handle pause/exit
  const handleExit = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      // Only save if we have at least one response
      if (Object.keys(currentSurveyResponses).length > 0) {
        console.log("Saving survey progress before exiting...");
        await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
        console.log("Progress saved successfully");
      }
      
      // Now navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving survey progress:', error);
      alert('There was an error saving your progress, but you can continue later.');
      navigate('/dashboard');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Toggle explanation
  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };
  
  // Handle logout
  const handleLogout = () => {
    navigate('/login');
  };
  
  // Calculate progress
  const progress = getSurveyProgress(weeklyQuestions.length);
  
  // If no selected user, return loading
  if (!selectedUser || !currentQuestion) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white p-4">
  <div className="max-w-3xl mx-auto flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
        <img 
          src={selectedUser.profilePicture} 
          alt={selectedUser.name}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="font-roboto">{selectedUser.name}</span>
    </div>
    <button 
      onClick={handleLogout}
      className="flex items-center text-sm bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded font-roboto"
    >
      <LogOut size={14} className="mr-1" />
      Switch User
    </button>
  </div>
</div>
      
      {/* Main content */}
      <div className="flex-1 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Survey title */}
          <div className="text-center mb-4">
  <h2 className="text-2xl font-bold font-roboto">Weekly Check-in - Cycle {currentWeek}</h2>
  <p className="text-gray-600 mt-1 font-roboto">Help us track your family's balance progress</p>
</div>
            
          {/* Question */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
            <p className="text-lg text-center">
              {currentQuestion.text}
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              {currentQuestion.category}
            </p>
            
            {/* Question explanation toggle */}
<div className="flex justify-center mt-3">
  <button 
    onClick={toggleExplanation}
    className="flex items-center text-sm text-blue-600"
  >
    <HelpCircle size={16} className="mr-1" />
    {showExplanation ? "Hide explanation" : "Why are we asking this again?"}
  </button>
</div>

{/* Explanation panel - Always show part of it */}
<div className="mt-3">
  {/* Weekly explanation - always visible */}
  <div className="bg-gray-50 p-3 rounded-md border text-sm text-gray-600 mb-2">
    <p className="font-roboto">{currentQuestion.weeklyExplanation}</p>
  </div>
  
  {/* AI explanation - always visible */}
  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
    <div className="flex items-start">
      <Brain size={16} className="text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-purple-800 font-medium mb-1">AI Selection Logic:</p>
        <p className="text-purple-800 font-roboto text-sm">
          {generateAIExplanation(currentQuestion)}
        </p>
      </div>
    </div>
  </div>

  {/* Weight metrics visualization */}
  {currentQuestion.totalWeight && (
    <div className="mt-4 p-3 bg-gray-50 rounded-md border">
      <h4 className="text-sm font-medium mb-2 flex items-center">
        <Scale size={16} className="mr-2 text-gray-700" />
        Task Weight Analysis
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Base Time:</span>
            <span className="font-medium">{currentQuestion.baseWeight}/5</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 mt-1 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full" 
              style={{ width: `${(currentQuestion.baseWeight / 5) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Frequency:</span>
            <span className="font-medium">{currentQuestion.frequency}</span>
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
        {currentQuestion.invisibility && (
          <div className="text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Invisibility:</span>
              <span className="font-medium">{currentQuestion.invisibility}</span>
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
        )}
        {currentQuestion.emotionalLabor && (
          <div className="text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Emotional Labor:</span>
              <span className="font-medium">{currentQuestion.emotionalLabor}</span>
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
        )}
      </div>
      <div className="mt-2 pt-2 border-t text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total Weight Impact:</span>
          <span className="font-bold">{parseFloat(currentQuestion.totalWeight).toFixed(1)}</span>
        </div>
      </div>
    </div>
  )}
</div>
)}
          </div>
            
          {/* Parent selection */}
          <div className="flex justify-center items-center mb-8">
            <div className="flex w-full max-w-md justify-between items-center">
              {/* Mama */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleSelectParent('Mama')}
                  className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full focus:outline-none border-4 overflow-hidden ${
                    selectedParent === 'Mama' ? 'border-blue-500' : 'border-transparent'
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
                  className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full focus:outline-none border-4 overflow-hidden ${
                    selectedParent === 'Papa' ? 'border-blue-500' : 'border-transparent'
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
              Question {currentQuestionIndex + 1} of {weeklyQuestions.length}
            </p>
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer with navigation */}
      <div className="border-t bg-white p-4">
  <div className="max-w-3xl mx-auto flex justify-between">
    <button 
      onClick={handlePrevious}
      disabled={currentQuestionIndex === 0 || isSubmitting || isProcessing}
      className={`px-4 py-2 border rounded font-roboto ${
        currentQuestionIndex === 0 || isSubmitting || isProcessing
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      Previous
    </button>
    <button 
      className={`px-4 py-2 border rounded font-roboto ${
        isSubmitting || isProcessing
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white hover:bg-gray-50'
      }`}
      onClick={handleExit}
      disabled={isSubmitting || isProcessing}
    >
      Save & Exit
    </button>
    <button 
      className={`px-4 py-2 border rounded font-roboto ${
        isSubmitting || isProcessing
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white hover:bg-gray-50'
      }`}
      onClick={handleSkip}
      disabled={isSubmitting || isProcessing}
    >
      Skip
    </button>
  </div>
</div>
    </div>
  );
};

export default WeeklyCheckInScreen;