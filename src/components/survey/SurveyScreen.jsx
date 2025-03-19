import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Info, HelpCircle, Scale, Brain, Heart, Clock } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';

const SurveyScreen = () => {
  const navigate = useNavigate();
  const { 
    selectedUser,
    familyMembers,
    completeInitialSurvey,
    saveSurveyProgress, // Add this line
    familyPriorities
  } = useFamily();
  
  const { 
    fullQuestionSet,
    currentSurveyResponses,
    updateSurveyResponse,
    resetSurvey,
    getSurveyProgress
  } = useSurvey();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [viewingQuestionList, setViewingQuestionList] = useState(false);
  const [showWeightInfo, setShowWeightInfo] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const keyboardInitialized = useRef(false);
  const [showWeightMetrics, setShowWeightMetrics] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  
  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
  // Reset survey when component mounts - only once!
  useEffect(() => {
    resetSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
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
  
  // Set up keyboard shortcuts
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
  }, 200);
    
  // Cleanup function
  return () => {
    clearTimeout(timer);
    if (keyboardInitialized.current) {
      window.removeEventListener('keydown', handleKeyPress);
    }
  };
}, [currentQuestionIndex, viewingQuestionList, isProcessing]);
  
  // Get current question
  const currentQuestion = fullQuestionSet[currentQuestionIndex];
  

  
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
      if (currentQuestionIndex < fullQuestionSet.length - 1) {
        // Use functional state update to ensure we're using the latest value
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        setSelectedParent(null);
        setShowWeightInfo(false);
        setShowExplanation(false);
        setShowWeightMetrics(false);
        setIsProcessing(false); // Reset processing state
      } else {
        // Survey completed, save responses
        handleCompleteSurvey();
      }
    }, 500);
  }
};
  
  const handleCompleteSurvey = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    
    setIsProcessing(true); // Add this processing state
    
    try {
      // First try to save data before any navigation
      console.log("Saving survey responses...");
      const result = await completeInitialSurvey(selectedUser.id, currentSurveyResponses);
      
      if (!result) {
        throw new Error("Survey completion failed");
      }
      
      console.log("Survey saved successfully, navigating to loading screen");
      // Only navigate after confirmed save
      navigate('/loading');
      
      // Navigate to dashboard after a delay
      setTimeout(() => {
        console.log("Navigating to dashboard");
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error completing survey:', error);
      alert('There was an error saving your survey. Please try again.');
      setIsProcessing(false); // Reset processing state
      // Don't navigate away on error, stay on the current page
    }
  };
  
  // Move to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setSelectedParent(currentSurveyResponses[fullQuestionSet[currentQuestionIndex - 1].id] || null);
      setShowWeightInfo(false);
      setShowExplanation(false);
      setShowWeightMetrics(false);
    }
  };
  
  // Jump to specific question
  const jumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setSelectedParent(currentSurveyResponses[fullQuestionSet[index].id] || null);
    setViewingQuestionList(false);
    setShowWeightInfo(false);
    setShowExplanation(false);
    setShowWeightMetrics(false);
  };
  
  // Handle pause
  // Handle pause/exit
const handlePause = async () => {
  if (isProcessing) return; // Prevent multiple actions while processing
  
  setIsProcessing(true);
  
  try {
    // Save the current progress without marking as completed
    if (selectedUser && Object.keys(currentSurveyResponses).length > 0) {
      console.log("Saving survey progress before pausing...");
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
  
  // Skip question
  const handleSkip = () => {
    if (currentQuestionIndex < fullQuestionSet.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedParent(null);
      setShowWeightInfo(false);
      setShowExplanation(false);
      setShowWeightMetrics(false);
    } else {
      // Survey completed, move to dashboard
      handleCompleteSurvey();
    }
  };
  
  // Toggle question list view
  const toggleQuestionList = () => {
    setViewingQuestionList(!viewingQuestionList);
  };
  
  // Handle logout
  const handleLogout = () => {
    navigate('/login');
  };
  
  // Calculate progress
  const progress = getSurveyProgress(fullQuestionSet.length);
  
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
  
  // If no selected user or no current question, return loading
  if (!selectedUser || !currentQuestion) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
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
            <span>{selectedUser.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded"
          >
            <LogOut size={14} className="mr-1" />
            Switch User
          </button>
        </div>
      </div>
        
      {viewingQuestionList ? (
        // Question list view
        <div className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">All Questions ({fullQuestionSet.length})</h2>
                <button 
                  onClick={toggleQuestionList}
                  className="text-blue-600 text-sm"
                >
                  Back to Survey
                </button>
              </div>
                
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {fullQuestionSet.map((q, index) => {
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
        // Main survey view
        <div className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            {/* Survey title */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Initial Survey Assessment</h2>
              <button 
                onClick={toggleQuestionList}
                className="text-sm text-blue-600 mt-1"
              >
                View All Questions
              </button>
            </div>
              
            {/* Question */}
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
              <div className="flex justify-between items-start mb-3">
                <p className="text-lg">
                  {currentQuestion.text}
                </p>
                {currentQuestion.totalWeight && (
                  <span 
                    className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center flex-shrink-0 ${getWeightImpactColor(currentQuestion.totalWeight)} cursor-pointer`}
                    onClick={() => setShowWeightMetrics(!showWeightMetrics)}
                  >
                    <Scale size={12} className="mr-1" />
                    Impact: {getWeightImpactText(currentQuestion.totalWeight)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {currentQuestion.category}
              </p>
              
              {/* Weight metrics visualization */}
              {showWeightMetrics && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md border">
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
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Weight Impact:</span>
                      <span className="font-bold">{parseFloat(currentQuestion.totalWeight).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Task explanation toggle */}
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="text-xs text-gray-600 flex items-center hover:underline"
                >
                  <HelpCircle size={12} className="mr-1" />
                  {showExplanation ? "Hide explanation" : "Why are we asking this?"}
                </button>
                
                <button 
                  onClick={() => setShowWeightInfo(!showWeightInfo)}
                  className="text-xs text-blue-600 flex items-center hover:underline"
                >
                  <Info size={12} className="mr-1" />
                  {showWeightInfo ? "Hide task impact info" : "Why does this task matter?"}
                </button>
              </div>
              
              {/* Task explanation panel */}
              {showExplanation && (
                <div className="mt-3 bg-gray-50 p-3 rounded-md border text-sm text-gray-600">
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}
              
              {/* Weight explanation panel */}
              {showWeightInfo && (
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
              )}
            </div>
              
            {/* Parent selection */}
            <div className="flex justify-center items-center mb-8">
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
                Question {currentQuestionIndex + 1} of {fullQuestionSet.length}
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
      )}
      
      {/* Footer with navigation */}
      <div className="border-t bg-white p-4 mt-auto">
        <div className="max-w-3xl mx-auto flex justify-between">
          <button 
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`px-4 py-2 border rounded ${
              currentQuestionIndex === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <button 
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
            onClick={handlePause}
          >
            Pause Survey
          </button>
          <button 
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
            onClick={handleSkip}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyScreen;