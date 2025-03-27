import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Info, HelpCircle, Scale, Brain, Heart, Clock, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';

const SurveyScreen = () => {
  const navigate = useNavigate();
  const { 
    selectedUser,
    familyMembers,
    completeInitialSurvey,
    saveSurveyProgress,
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
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveIntervalRef = useRef(null);
  
  // Redirect if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      navigate('/');
    }
  }, [selectedUser, navigate]);
  
  // Check for saved progress when component mounts
  useEffect(() => {
    // Check if we have a current user and they have saved progress
    if (selectedUser) {
      try {
        const surveyProgress = localStorage.getItem('surveyInProgress');
        if (surveyProgress) {
          const progress = JSON.parse(surveyProgress);
          
          // Only load progress if it belongs to this user
          if (progress.userId === selectedUser.id) {
            console.log("Found saved progress for this user, not resetting survey");
            // Don't reset the survey, keep the loaded progress
            return;
          }
        }
      } catch (e) {
        console.error("Error checking survey progress:", e);
      }
    }
    
    // Only reset if we didn't find saved progress for this user
    resetSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  // Restore survey progress when component mounts
  useEffect(() => {
    // Only run this if we have a selected user and current responses
    if (selectedUser && currentSurveyResponses && Object.keys(currentSurveyResponses).length > 0) {
      console.log("Found", Object.keys(currentSurveyResponses).length, "saved responses");
      
      // Find the last answered question index
      let lastAnsweredIndex = -1;
      
      // Check which questions have answers
      fullQuestionSet.forEach((question, index) => {
        if (currentSurveyResponses[question.id]) {
          lastAnsweredIndex = Math.max(lastAnsweredIndex, index);
        }
      });
      
      // If we found saved answers, jump to the next unanswered question
      if (lastAnsweredIndex >= 0) {
        console.log(`Found progress! Last answered question: ${lastAnsweredIndex}`);
        
        // Set current question to the next unanswered one
        const nextIndex = Math.min(lastAnsweredIndex + 1, fullQuestionSet.length - 1);
        setCurrentQuestionIndex(nextIndex);
        
        // Set selected parent based on the response to the current question
        if (nextIndex > 0 && nextIndex <= lastAnsweredIndex) {
          setSelectedParent(currentSurveyResponses[fullQuestionSet[nextIndex].id] || null);
        } else {
          setSelectedParent(null);
        }
        
        console.log(`Restored to question ${nextIndex + 1} with ${Object.keys(currentSurveyResponses).length} saved answers`);

        // Set the last saved timestamp
        setLastSaved(new Date());
      }
    }
  }, [selectedUser, fullQuestionSet, currentSurveyResponses]);

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
  
  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!selectedUser || isSaving) return;
    
    setIsSaving(true);
    
    try {
      console.log("Auto-saving survey progress...");
      await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
      
      // Store survey in progress flag
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime()
      }));
      
      setLastSaved(new Date());
      console.log("Survey progress auto-saved");
    } catch (error) {
      console.error("Error auto-saving survey progress:", error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedUser, currentSurveyResponses, saveSurveyProgress, isSaving]);
  
  // Manual save function
  const handleManualSave = async () => {
    if (!selectedUser || isSaving) return;
    
    setIsSaving(true);
    
    try {
      console.log("Manually saving survey progress...");
      await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
      
      // Store survey in progress flag
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime()
      }));
      
      setLastSaved(new Date());
      console.log("Survey progress saved manually");
    } catch (error) {
      console.error("Error saving survey progress:", error);
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
      
      // Use a single timeout with a clear reference
      const timer = setTimeout(() => {
        if (currentQuestionIndex < fullQuestionSet.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1); // Use direct value instead of functional update
          setSelectedParent(null);
          setShowWeightInfo(false);
          setShowExplanation(false);
          setShowWeightMetrics(false);
        } else {
          // Survey completed, save responses
          handleCompleteSurvey();
        }
        setIsProcessing(false); // Reset processing state
      }, 800); // Increased timeout for better visibility
      
      // Cleanup function to prevent memory leaks
      return () => clearTimeout(timer);
    }
  };
  
  const handleCompleteSurvey = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    
    setIsProcessing(true);
    
    try {
      console.log("Saving survey responses...");
      
      // First save responses synchronously
      const result = await completeInitialSurvey(selectedUser.id, currentSurveyResponses);
      
      if (!result) {
        throw new Error("Survey completion failed");
      }
      
      // Remove the in-progress flag
      localStorage.removeItem('surveyInProgress');
      
      // Show loading screen AFTER successful save
      navigate('/loading');
      
      // Check if all family members have completed the survey
      const allCompleted = familyMembers.every(member => member.completed || member.id === selectedUser.id);
      
      // Use a shorter timeout and navigate based on completion status
      setTimeout(() => {
        if (allCompleted) {
          console.log("All family members completed survey, navigating to dashboard");
          window.location.href = '/dashboard'; // Hard navigation instead of router navigate
        } else {
          console.log("Some family members still need to complete survey, navigating to family selection");
          window.location.href = '/login'; // Go to family selection screen
        }
      }, 2000);
    } catch (error) {
      console.error('Error completing survey:', error);
      alert('There was an error saving your survey. Please try again.');
      setIsProcessing(false);
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
      
      // Set a flag in localStorage to indicate survey is in progress
      localStorage.setItem('surveyInProgress', JSON.stringify({
        userId: selectedUser.id,
        timestamp: new Date().getTime()
      }));
    }
    
    // Navigate to login screen (same as Switch User button)
    navigate('/login');
  } catch (error) {
    console.error('Error saving survey progress:', error);
    alert('There was an error saving your progress, but you can continue later.');
    navigate('/login');
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
      {/* Header */}
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
            <span>{selectedUser.name}</span>
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
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={toggleQuestionList}
                  className="text-sm text-blue-600 mt-1 hover:underline"
                >
                  View All Questions
                </button>
                <button 
                  onClick={handleManualSave}
                  className="text-sm text-blue-600 mt-1 hover:underline flex items-center"
                  disabled={isSaving}
                >
                  <Save size={14} className="mr-1" />
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
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
            className={`px-4 py-2 border rounded flex items-center ${
              currentQuestionIndex === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <ArrowLeft size={16} className="mr-1" />
            Previous
          </button>
          <button 
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
            onClick={handlePause}
          >
            Pause Survey
          </button>
          {/* Skip button removed */}
<div></div> {/* Empty div to maintain layout */}
        </div>
      </div>

      
    </div>
  );
};

export default SurveyScreen;