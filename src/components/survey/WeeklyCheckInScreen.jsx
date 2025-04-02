import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, HelpCircle, Brain, Scale, Heart, Clock, Save,
  ChevronDown, ChevronUp, Info, ArrowLeft, ArrowRight, Check, X
} from 'lucide-react';
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
    getSurveyProgress,
    updateQuestionWeight
  } = useSurvey();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedParent, setSelectedParent] = useState(null);
  const [viewingQuestionList, setViewingQuestionList] = useState(false);
  const [showWeightInfo, setShowWeightInfo] = useState(true); // Always show weight info
  const [showExplanation, setShowExplanation] = useState(false);
  const [showWeightMetrics, setShowWeightMetrics] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightBeingEdited, setWeightBeingEdited] = useState(null);
  const [saveErrors, setSaveErrors] = useState({});
  const [weeklyQuestions, setWeeklyQuestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWeightChanges, setHasWeightChanges] = useState(false);

  const weekNum = currentWeek;
  
  // Local state for current question (for weight editing)
  const [localCurrentQuestion, setLocalCurrentQuestion] = useState(null);

  // Create a currentQuestion reference that uses the local state when available
  const currentQuestion = localCurrentQuestion || weeklyQuestions[currentQuestionIndex];

  // Update setCurrentQuestion function
  const setCurrentQuestion = (updatedQuestion) => {
    setLocalCurrentQuestion(updatedQuestion);
    setHasWeightChanges(true);
  };

  // Ref to track if keyboard listeners are initialized
  const keyboardInitialized = useRef(false);
  const autoSaveIntervalRef = useRef(null);
  
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

  // Save weight changes
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
        if (currentQuestionIndex < weeklyQuestions.length - 1) {
          setCurrentQuestionIndex(prevIndex => prevIndex + 1); // Use direct value instead of functional update
          setSelectedParent(null);
          setShowExplanation(false);
          setShowWeightMetrics(false);
        } else {
          // Survey completed, save responses
          handleCompleteSurvey();
        }
        setIsProcessing(false); // Reset processing state
      }, 800); // Increased timeout for better visibility
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
      
      // Remove the in-progress flag
      localStorage.removeItem('surveyInProgress');
      
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
      setSelectedParent(currentSurveyResponses[weeklyQuestions[currentQuestionIndex - 1].id] || null);
      setShowExplanation(false);
      setShowWeightMetrics(false);
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
    
    if (currentQuestionIndex < weeklyQuestions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedParent(null);
      setShowExplanation(false);
      setShowWeightMetrics(false);
    } else {
      // Survey completed, move to dashboard
      handleCompleteSurvey();
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
    setSelectedParent(currentSurveyResponses[weeklyQuestions[index].id] || null);
    setViewingQuestionList(false);
    setShowExplanation(false);
    setShowWeightMetrics(false);
  };
  
  // Handle exit
  const handleExit = async () => {
    if (isProcessing) return;
    
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
      // Only save if we have at least one response
      if (Object.keys(currentSurveyResponses).length > 0) {
        console.log("Saving survey progress before exiting...");
        await saveSurveyProgress(selectedUser.id, currentSurveyResponses);
        console.log("Progress saved successfully");
        
        // Set a flag in localStorage to indicate survey is in progress
        localStorage.setItem('surveyInProgress', JSON.stringify({
          userId: selectedUser.id,
          timestamp: new Date().getTime()
        }));
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
  
  // Toggle weight metrics
  const toggleWeightMetrics = () => {
    setShowWeightMetrics(!showWeightMetrics);
  };
  
  // Handle logout
  const handleLogout = () => {
    // Save progress before logging out
    if (Object.keys(currentSurveyResponses).length > 0) {
      saveSurveyProgress(selectedUser.id, currentSurveyResponses).then(() => {
        console.log("Progress saved before logout");
        
        // Set a flag in localStorage to indicate survey is in progress
        localStorage.setItem('surveyInProgress', JSON.stringify({
          userId: selectedUser.id,
          timestamp: new Date().getTime()
        }));
        
        navigate('/login');
      }).catch(error => {
        console.error("Error saving progress before logout:", error);
        navigate('/login');
      });
    } else {
      navigate('/login');
    }
  };
  
  // Calculate progress
  const progress = getSurveyProgress(weeklyQuestions.length);
  
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-roboto">
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
                <h2 className="text-lg font-semibold">All Questions ({weeklyQuestions.length})</h2>
                <button 
                  onClick={toggleQuestionList}
                  className="text-blue-600 text-sm"
                >
                  Back to Check-in
                </button>
              </div>
                
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {weeklyQuestions.map((q, index) => {
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
        // Main check-in view
        <div className="flex-1 p-4">
          <div className="max-w-3xl mx-auto">
            {/* Survey title */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Weekly Check-in - Cycle {currentWeek}</h2>
              <p className="text-gray-600 mt-1">Help us track your family's balance progress</p>
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
            
            {/* Question */}
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
              <div className="flex justify-between items-start mb-3">
                <p className="text-lg">
                  {currentQuestion.text}
                </p>
                {currentQuestion.totalWeight && (
                  <span 
                    className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center flex-shrink-0 ${getWeightImpactColor(currentQuestion.totalWeight)} cursor-pointer`}
                    onClick={toggleWeightMetrics}
                  >
                    <Scale size={12} className="mr-1" />
                    Impact: {getWeightImpactText(currentQuestion.totalWeight)}
                    <div className="ml-1 bg-white bg-opacity-30 rounded-full w-4 h-4 flex items-center justify-center">
                      <ChevronDown size={10} className={showWeightMetrics ? "hidden" : "block"} />
                      <ChevronUp size={10} className={showWeightMetrics ? "block" : "hidden"} />
                    </div>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {currentQuestion.category}
              </p>
              
              {/* Weight metrics visualization */}
              {showWeightMetrics && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md border">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <Scale size={16} className="mr-2 text-gray-700" />
                      Task Weight Analysis
                    </h4>
                    <button
                      onClick={() => setEditingWeight(!editingWeight)}
                      className="text-xs text-blue-600 flex items-center hover:underline"
                    >
                      {editingWeight ? (
                        <>Cancel Editing</>
                      ) : (
                        <>Adjust Weights</>
                      )}
                    </button>
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
                          className="bg-blue-500 h-full rounded-full" 
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
                  
                  {/* Edit controls */}
                  {editingWeight && (
                    <div className="mt-4 flex flex-col space-y-2">
                      <div className="p-2 bg-blue-50 rounded-md text-xs text-blue-700">
                        <p>Adjusting weights will help Allie understand how you prioritize different tasks. Similar tasks will be updated with your preferences.</p>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelWeightEditing}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300 text-sm flex items-center"
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </button>
                        
                        <button
                          onClick={handleSaveWeightChanges}
                          className="px-3 py-1 bg-black text-white rounded text-sm flex items-center"
                        >
                          <Check size={14} className="mr-1" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Task explanation toggle */}
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={toggleExplanation}
                  className="text-xs text-gray-600 flex items-center hover:underline"
                >
                  <HelpCircle size={12} className="mr-1" />
                  {showExplanation ? "Hide explanation" : "Why are we asking this?"}
                </button>
                
                <button 
                  onClick={toggleWeightMetrics}
                  className="text-xs text-blue-600 flex items-center hover:underline"
                >
                  <Info size={12} className="mr-1" />
                  {showWeightMetrics ? "Hide task impact info" : "Why does this task matter?"}
                </button>
              </div>
              
              {/* Explanation panel */}
              {showExplanation && (
                <div className="mt-3 bg-gray-50 p-3 rounded-md border text-sm text-gray-600">
                  {currentQuestion.weeklyExplanation ? (
                    <p>{currentQuestion.weeklyExplanation}</p>
                  ) : (
                    <p>{currentQuestion.explanation || "This question helps us track changes in your family's balance over time."}</p>
                  )}
                </div>
              )}
              
              {/* Always show weight info for adults */}
              <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                <p>{currentQuestion.weightExplanation || generateAIExplanation(currentQuestion)}</p>
                
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
                Question {currentQuestionIndex + 1} of {weeklyQuestions.length}
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
            disabled={currentQuestionIndex === 0 || isSubmitting || isProcessing}
            className={`px-4 py-2 border rounded flex items-center ${
              currentQuestionIndex === 0 || isSubmitting || isProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <ArrowLeft size={16} className="mr-1" />
            Previous
          </button>
          <button 
            className={`px-4 py-2 border rounded ${
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
            className={`px-4 py-2 border rounded flex items-center ${
              isSubmitting || isProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={handleSkip}
            disabled={isSubmitting || isProcessing}
          >
            Skip
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCheckInScreen;