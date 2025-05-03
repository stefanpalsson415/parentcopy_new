// src/components/survey/InterestSurveyModal.jsx
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ThumbsUp, Trophy, Check, AlertCircle, Sparkles, Heart, Star } from 'lucide-react';

// Category icons (same as in KidsInterestsTab)
const categoryIcons = {
  toys: <span className="text-3xl">🎁</span>,
  characters: <span className="text-3xl">⭐</span>,
  animals: <span className="text-3xl">🦁</span>,
  sensory: <span className="text-3xl">👐</span>,
  books: <span className="text-3xl">📚</span>,
  lego: <span className="text-3xl">🧱</span>,
  games: <span className="text-3xl">🎮</span>,
  sports: <span className="text-3xl">🏀</span>,
  science: <span className="text-3xl">🔬</span>,
  arts: <span className="text-3xl">🎨</span>,
  tech: <span className="text-3xl">📱</span>,
  coding: <span className="text-3xl">💻</span>,
  fashion: <span className="text-3xl">👕</span>,
  music: <span className="text-3xl">🎵</span>,
  collecting: <span className="text-3xl">🏆</span>,
  default: <span className="text-3xl">🏷️</span>
};

const InterestSurveyModal = ({ interestPairs, onComplete, onCancel, childName, childId, questionPrompts = [] }) => {
  // Create a key to store survey progress in localStorage
  const surveyStorageKey = `kid_survey_progress_${childId || 'default'}`;
  
  // Try to load saved progress first
  const loadSavedProgress = () => {
    try {
      const savedProgressJSON = localStorage.getItem(surveyStorageKey);
      if (!savedProgressJSON) return null;
      
      const savedProgress = JSON.parse(savedProgressJSON);
      // Check if it's valid data by ensuring it matches the same interestPairs
      if (savedProgress && 
          savedProgress.interestPairsLength === interestPairs.length && 
          savedProgress.timestamp && 
          (new Date().getTime() - savedProgress.timestamp < 7 * 24 * 60 * 60 * 1000)) { // Valid if less than a week old
        return savedProgress;
      }
      return null;
    } catch (e) {
      console.error("Error loading saved progress:", e);
      return null;
    }
  };
  
  const savedProgress = loadSavedProgress();
  
  const [currentPairIndex, setCurrentPairIndex] = useState(savedProgress ? savedProgress.currentPairIndex : 0);
  const [results, setResults] = useState(savedProgress ? savedProgress.results : []);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInterestId, setSelectedInterestId] = useState(null);
  
  // Get current pair to compare
  const currentPair = interestPairs[currentPairIndex] || [];
  
  // Progress percentage
  const progressPercentage = interestPairs.length > 0 
    ? ((currentPairIndex) / interestPairs.length) * 100 
    : 0;
    
  // Save progress function
  const saveProgress = () => {
    try {
      // Create a progress object
      const progressData = {
        childId: childId,
        currentPairIndex,
        results,
        interestPairsLength: interestPairs.length,
        timestamp: new Date().getTime()
      };
      
      // Save to localStorage
      localStorage.setItem(surveyStorageKey, JSON.stringify(progressData));
      console.log("Survey progress saved successfully");
    } catch (error) {
      console.error("Error saving survey progress:", error);
    }
  };
  
  // Get category icon
  const getCategoryIcon = (category) => {
    return categoryIcons[category] || categoryIcons.default;
  };
  
  // Handle selecting a winner
  const handleSelect = (interestId) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setSelectedInterestId(interestId);
    
    // Identify winner and loser
    const winningInterest = currentPair.find(interest => interest.id === interestId);
    const losingInterest = currentPair.find(interest => interest.id !== interestId);
    
    if (!winningInterest || !losingInterest) {
      console.error("Error identifying winner and loser");
      setIsProcessing(false);
      return;
    }
    
    // Record the result
    const result = {
      winnerId: winningInterest.id,
      winnerName: winningInterest.name,
      loserId: losingInterest.id,
      loserName: losingInterest.name,
      timestamp: new Date().toISOString()
    };
    
    // Update results state with the new result
    const updatedResults = [...results, result];
    setResults(updatedResults);
    
    // Save progress with the updated results
    setTimeout(() => {
      // Save after a short delay to ensure state is updated
      saveProgress();
    }, 100);
    
    // Longer delay to show selection before proceeding (more kid-friendly)
    setTimeout(() => {
      if (currentPairIndex < interestPairs.length - 1) {
        // Move to next question and save the progress
        const nextIndex = currentPairIndex + 1;
        setCurrentPairIndex(nextIndex);
        setSelectedInterestId(null); // Reset selected interest for next pair
      } else {
        // Survey completed
        setIsCompleted(true);
        // Remove saved progress since we're done
        localStorage.removeItem(surveyStorageKey);
      }
      setIsProcessing(false);
    }, 800);
  };
  
  // Handle completion
  const handleFinish = () => {
    // Clean up saved progress when survey is completed
    localStorage.removeItem(surveyStorageKey);
    onComplete(results);
  };
  
  // Handle cancellation with the option to save progress
  const handleCancel = () => {
    // If survey is in progress, offer to save
    if (currentPairIndex > 0 && !isCompleted) {
      const shouldSave = window.confirm("Would you like to save your progress and continue later?");
      
      if (shouldSave) {
        saveProgress();
        alert("Progress saved! You can continue where you left off next time.");
      } else {
        // If they don't want to save, remove any existing progress
        localStorage.removeItem(surveyStorageKey);
      }
    }
    
    onCancel();
  };
  
  // If no pairs provided, show message
  if (!interestPairs || interestPairs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">No Interests to Compare</h3>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex items-start bg-yellow-50 p-4 rounded-lg mb-4">
            <AlertCircle size={20} className="text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium mb-1">Not enough interests</p>
              <p className="text-sm text-yellow-700">
                You need at least 2 interests to run a comparison survey. Please add more interests first.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-purple-700 flex items-center">
            {isCompleted 
              ? (
                <span className="flex items-center">
                  <Trophy size={24} className="text-yellow-500 mr-2" />
                  Survey Complete!
                </span>
              ) 
              : (
                <span className="flex items-center">
                  <Star size={24} className="text-yellow-500 mr-2" />
                  {questionPrompts[currentPairIndex] || `Which one does ${childName || 'your child'} like more?`}
                </span>
              )}
          </h3>
          <button 
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Progress bar */}
        {!isCompleted && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-purple-800 bg-purple-100 px-3 py-1 rounded-full text-sm">
                Question {currentPairIndex + 1} of {interestPairs.length}
              </span>
              <span className="text-sm font-medium text-indigo-600">
                {Math.round(progressPercentage)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Comparison view */}
        {!isCompleted && currentPair.length === 2 && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6">
            {/* Option 1 */}
            <button
              onClick={() => handleSelect(currentPair[0].id)}
              className={`w-full md:w-1/2 p-6 border-4 rounded-xl text-center transition-all ${
                isProcessing 
                  ? 'opacity-70 cursor-wait' 
                  : 'hover:border-purple-500 hover:shadow-xl hover:scale-105 transform hover:-rotate-1'
              } ${selectedInterestId === currentPair[0].id ? 'bg-purple-50 border-purple-500 shadow-lg' : 'bg-white border-blue-200'}`}
              disabled={isProcessing}
            >
              <div className="flex flex-col items-center">
                <div className="text-6xl mb-4 transform transition-all hover:scale-110 hover:rotate-3">
                  {getCategoryIcon(currentPair[0].category)}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-indigo-800">{currentPair[0].name}</h3>
                <div className="text-sm text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full">{currentPair[0].category}</div>
                
                {/* Details if available */}
                {currentPair[0].specifics && Object.entries(currentPair[0].specifics).length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {Object.entries(currentPair[0].specifics).map(([key, value]) => (
                      <span 
                        key={key} 
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
            
            {/* Center divider */}
            <div className="flex flex-row md:flex-col items-center">
              <div className="hidden md:block h-32 w-px bg-gray-300"></div>
              <div className="md:hidden w-32 h-px bg-gray-300"></div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-gray-800 font-bold text-xl mx-4 my-2 transform rotate-3 shadow-lg">
                <span className="text-white">VS</span>
              </div>
              <div className="hidden md:block h-32 w-px bg-gray-300"></div>
              <div className="md:hidden w-32 h-px bg-gray-300"></div>
            </div>
            
            {/* Option 2 */}
            <button
              onClick={() => handleSelect(currentPair[1].id)}
              className={`w-full md:w-1/2 p-6 border-4 rounded-xl text-center transition-all ${
                isProcessing 
                  ? 'opacity-70 cursor-wait' 
                  : 'hover:border-pink-500 hover:shadow-xl hover:scale-105 transform hover:rotate-1'
              } ${selectedInterestId === currentPair[1].id ? 'bg-pink-50 border-pink-500 shadow-lg' : 'bg-white border-pink-200'}`}
              disabled={isProcessing}
            >
              <div className="flex flex-col items-center">
                <div className="text-6xl mb-4 transform transition-all hover:scale-110 hover:-rotate-3">
                  {getCategoryIcon(currentPair[1].category)}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-pink-700">{currentPair[1].name}</h3>
                <div className="text-sm text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full">{currentPair[1].category}</div>
                
                {/* Details if available */}
                {currentPair[1].specifics && Object.entries(currentPair[1].specifics).length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {Object.entries(currentPair[1].specifics).map(([key, value]) => (
                      <span 
                        key={key} 
                        className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded-full font-medium"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          </div>
        )}
        
        {/* Completion view */}
        {isCompleted && (
          <div className="text-center py-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                <Check size={46} className="text-white" />
              </div>
              
              {/* Animated confetti elements */}
              <div className="absolute top-0 left-1/2 -ml-3 w-6 h-6 bg-yellow-300 rounded-full animate-bounce-slow" style={{animationDelay: "0.1s"}}></div>
              <div className="absolute top-6 left-1/3 w-4 h-4 bg-blue-400 rounded-sm rotate-45 animate-bounce-slow" style={{animationDelay: "0.3s"}}></div>
              <div className="absolute top-2 right-1/3 w-5 h-5 bg-pink-400 rounded-full animate-bounce-slow" style={{animationDelay: "0.5s"}}></div>
              <div className="absolute top-10 right-1/4 w-3 h-3 bg-purple-300 rounded-sm rotate-12 animate-bounce-slow" style={{animationDelay: "0.2s"}}></div>
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-green-600">
              Awesome! Survey Completed! 
            </h3>
            
            <p className="text-gray-600 mb-6 text-lg">
              {childName ? `${childName}'s` : "Your child's"} interests have been ranked based on {results.length} comparisons.
            </p>
            
            {/* Results summary */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl mb-6 text-left shadow-sm border border-purple-100">
              <h4 className="font-medium text-purple-800 mb-4 flex items-center text-lg">
                <Trophy size={22} className="text-yellow-500 mr-2" />
                Top Choices Based on Survey
              </h4>
              
              <ul className="space-y-3">
                {/* Show top 3 winners based on frequency */}
                {getTopInterests(results).map((interest, index) => (
                  <li key={interest.id} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                    {index === 0 ? (
                      <span className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold mr-3 border-2 border-yellow-300">
                        🥇
                      </span>
                    ) : index === 1 ? (
                      <span className="w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold mr-3 border-2 border-gray-300">
                        🥈
                      </span>
                    ) : (
                      <span className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold mr-3 border-2 border-orange-300">
                        🥉
                      </span>
                    )}
                    <span className="font-medium text-lg">{interest.name}</span>
                    <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {interest.wins} wins
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium flex items-center shadow-md hover:shadow-lg transition-all"
              >
                Save Results
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        )}
        
        {/* Help text at bottom */}
        {!isCompleted && (
          <div className="mt-6 pt-4 text-center">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-purple-100 inline-block">
              <div className="flex items-center justify-center text-sm text-indigo-700 font-medium">
                <Sparkles size={18} className="text-yellow-500 mr-2" />
                <span>
                  Pick the one that {childName || 'your child'} likes better! Tap your favorite!
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Helper function to get top interests based on number of wins
 */
function getTopInterests(results, limit = 3) {
  // Count wins for each interest
  const winCounts = {};
  
  results.forEach(result => {
    winCounts[result.winnerId] = (winCounts[result.winnerId] || 0) + 1;
    // Initialize loser if not present
    if (!winCounts[result.loserId]) {
      winCounts[result.loserId] = 0;
    }
  });
  
  // Create array of interests with their win counts
  const interestWins = Object.entries(winCounts).map(([id, wins]) => {
    // Find the name for this ID
    const interestResult = results.find(r => r.winnerId === id || r.loserId === id);
    const name = id === interestResult?.winnerId ? interestResult.winnerName : interestResult?.loserName;
    
    return {
      id,
      name,
      wins
    };
  });
  
  // Sort by wins (descending) and take the top 'limit'
  return interestWins
    .sort((a, b) => b.wins - a.wins)
    .slice(0, limit);
}

export default InterestSurveyModal;