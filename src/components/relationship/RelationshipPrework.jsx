// src/components/relationship/RelationshipPrework.jsx
import React, { useState, useEffect } from 'react';
import { 
  Heart, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, 
  Plus, X, Lightbulb, Star, Target, AlertTriangle 
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';

const RelationshipPrework = ({ cycle, onSubmit, onCancel }) => {
  const { selectedUser } = useFamily();
  const [strengths, setStrengths] = useState([{ text: '', id: Date.now() }]);
  const [challenges, setChallenges] = useState([{ text: '', id: Date.now() + 1 }]);
  const [goals, setGoals] = useState([{ text: '', id: Date.now() + 2 }]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Suggestions for common strengths, challenges and goals
  const strengthSuggestions = [
    "We have great communication during calm times",
    "We share similar values about parenting",
    "We make each other laugh regularly",
    "We're good at practical problem solving together",
    "We support each other's individual goals",
    "We enjoy shared activities and hobbies",
    "We're aligned on financial priorities"
  ];
  
  const challengeSuggestions = [
    "We struggle to communicate effectively during stress",
    "We have different approaches to household tasks",
    "We don't have enough quality time together",
    "We have different parenting strategies at times",
    "We need better balance in our responsibilities",
    "We find it hard to make decisions together",
    "We don't share enough appreciation day-to-day"
  ];
  
  const goalSuggestions = [
    "Have a weekly date night without distractions",
    "Improve our system for sharing household tasks",
    "Create a better balance of childcare responsibilities",
    "Develop a better approach to decision making",
    "Practice more appreciation and gratitude",
    "Improve how we communicate during stress",
    "Make more time for physical intimacy"
  ];
  
  // Functions to handle adding/removing items for each section
  const handleStrengthChange = (id, value) => {
    setStrengths(prev => prev.map(s => s.id === id ? { ...s, text: value } : s));
  };
  
  const addStrength = () => {
    if (strengths.length < 5) {
      setStrengths(prev => [...prev, { text: '', id: Date.now() }]);
    }
  };
  
  const removeStrength = (id) => {
    if (strengths.length > 1) {
      setStrengths(prev => prev.filter(s => s.id !== id));
    }
  };
  
  const handleChallengeChange = (id, value) => {
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, text: value } : c));
  };
  
  const addChallenge = () => {
    if (challenges.length < 5) {
      setChallenges(prev => [...prev, { text: '', id: Date.now() }]);
    }
  };
  
  const removeChallenge = (id) => {
    if (challenges.length > 1) {
      setChallenges(prev => prev.filter(c => c.id !== id));
    }
  };
  
  const handleGoalChange = (id, value) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text: value } : g));
  };
  
  const addGoal = () => {
    if (goals.length < 5) {
      setGoals(prev => [...prev, { text: '', id: Date.now() }]);
    }
  };
  
  const removeGoal = (id) => {
    if (goals.length > 1) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };
  
  // Add a suggestion
  const addSuggestion = (type, suggestion) => {
    if (type === 'strength') {
      const unusedStrength = strengths.find(s => !s.text);
      if (unusedStrength) {
        handleStrengthChange(unusedStrength.id, suggestion);
      } else if (strengths.length < 5) {
        setStrengths(prev => [...prev, { text: suggestion, id: Date.now() }]);
      }
    } else if (type === 'challenge') {
      const unusedChallenge = challenges.find(c => !c.text);
      if (unusedChallenge) {
        handleChallengeChange(unusedChallenge.id, suggestion);
      } else if (challenges.length < 5) {
        setChallenges(prev => [...prev, { text: suggestion, id: Date.now() }]);
      }
    } else if (type === 'goal') {
      const unusedGoal = goals.find(g => !g.text);
      if (unusedGoal) {
        handleGoalChange(unusedGoal.id, suggestion);
      } else if (goals.length < 5) {
        setGoals(prev => [...prev, { text: suggestion, id: Date.now() }]);
      }
    }
  };
  
  // Check if current step is complete
  const isCurrentStepComplete = () => {
    if (step === 0) {
      return strengths.some(s => s.text.trim());
    } else if (step === 1) {
      return challenges.some(c => c.text.trim());
    } else if (step === 2) {
      return goals.some(g => g.text.trim());
    }
    return false;
  };
  
  // Handle submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Filter out empty entries
      const validStrengths = strengths.filter(s => s.text.trim()).map(s => s.text.trim());
      const validChallenges = challenges.filter(c => c.text.trim()).map(c => c.text.trim());
      const validGoals = goals.filter(g => g.text.trim()).map(g => g.text.trim());
      
      // Prepare prework data
      const preworkData = {
        strengths: validStrengths,
        challenges: validChallenges,
        goals: validGoals
      };
      
      await onSubmit(preworkData);
      setLoading(false);
    } catch (err) {
      console.error("Error submitting prework:", err);
      setError(err.message || "Failed to save your prework");
      setLoading(false);
    }
  };
  
  // Navigate between steps
  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  // Render the strengths step
  const renderStrengthsStep = () => (
    <div>
      <h4 className="font-medium text-lg mb-4 font-roboto">Relationship Strengths</h4>
      <p className="text-gray-600 mb-6 font-roboto">
        What aspects of your relationship are working well? Identifying strengths helps build on what's already good.
      </p>
      
      <div className="space-y-4 mb-6">
        {strengths.map((strength, index) => (
          <div key={strength.id} className="flex items-center gap-2">
            <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
              <Star size={16} className="text-green-600" />
            </div>
            <input
              type="text"
              value={strength.text}
              onChange={(e) => handleStrengthChange(strength.id, e.target.value)}
              placeholder={`Strength ${index + 1}`}
              className="flex-1 border rounded-lg p-3 font-roboto focus:ring-1 focus:ring-black focus:outline-none"
            />
            <button
              onClick={() => removeStrength(strength.id)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Remove strength"
              disabled={strengths.length <= 1}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        {strengths.length < 5 && (
          <button
            onClick={addStrength}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Add another strength
          </button>
        )}
      </div>
      
      {/* Suggestions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-3 font-roboto flex items-center">
          <Lightbulb size={16} className="mr-2 text-amber-500" />
          Suggestions (click to add)
        </h5>
        <div className="flex flex-wrap gap-2">
          {strengthSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => addSuggestion('strength', suggestion)}
              className="bg-white border rounded-full px-3 py-1 text-xs font-roboto hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  
  // Render the challenges step
  const renderChallengesStep = () => (
    <div>
      <h4 className="font-medium text-lg mb-4 font-roboto">Relationship Challenges</h4>
      <p className="text-gray-600 mb-6 font-roboto">
        What aspects of your relationship could use improvement? Being honest about challenges helps you grow together.
      </p>
      
      <div className="space-y-4 mb-6">
        {challenges.map((challenge, index) => (
          <div key={challenge.id} className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <input
              type="text"
              value={challenge.text}
              onChange={(e) => handleChallengeChange(challenge.id, e.target.value)}
              placeholder={`Challenge ${index + 1}`}
              className="flex-1 border rounded-lg p-3 font-roboto focus:ring-1 focus:ring-black focus:outline-none"
            />
            <button
              onClick={() => removeChallenge(challenge.id)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Remove challenge"
              disabled={challenges.length <= 1}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        {challenges.length < 5 && (
          <button
            onClick={addChallenge}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Add another challenge
          </button>
        )}
      </div>
      
      {/* Suggestions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-3 font-roboto flex items-center">
          <Lightbulb size={16} className="mr-2 text-amber-500" />
          Suggestions (click to add)
        </h5>
        <div className="flex flex-wrap gap-2">
          {challengeSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => addSuggestion('challenge', suggestion)}
              className="bg-white border rounded-full px-3 py-1 text-xs font-roboto hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  
  // Render the goals step
  const renderGoalsStep = () => (
    <div>
      <h4 className="font-medium text-lg mb-4 font-roboto">Relationship Goals</h4>
      <p className="text-gray-600 mb-6 font-roboto">
        What do you want to achieve in your relationship? Setting specific goals helps create positive change.
      </p>
      
      <div className="space-y-4 mb-6">
        {goals.map((goal, index) => (
          <div key={goal.id} className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <Target size={16} className="text-blue-600" />
            </div>
            <input
              type="text"
              value={goal.text}
              onChange={(e) => handleGoalChange(goal.id, e.target.value)}
              placeholder={`Goal ${index + 1}`}
              className="flex-1 border rounded-lg p-3 font-roboto focus:ring-1 focus:ring-black focus:outline-none"
            />
            <button
              onClick={() => removeGoal(goal.id)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Remove goal"
              disabled={goals.length <= 1}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        {goals.length < 5 && (
          <button
            onClick={addGoal}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Add another goal
          </button>
        )}
      </div>
      
      {/* Suggestions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-3 font-roboto flex items-center">
          <Lightbulb size={16} className="mr-2 text-amber-500" />
          Suggestions (click to add)
        </h5>
        <div className="flex flex-wrap gap-2">
          {goalSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => addSuggestion('goal', suggestion)}
              className="bg-white border rounded-full px-3 py-1 text-xs font-roboto hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Pre-Meeting Work</h3>
          <p className="text-gray-600 font-roboto">
            Before your couple's meeting, take a moment to reflect on your relationship strengths, challenges, and goals.
            This will help create a more productive discussion when you meet.
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <div 
            className={`flex-1 border-b-2 ${step >= 0 ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step > 0 ? 'bg-black text-white' : 
                  step === 0 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 0 ? <CheckCircle size={14} /> : "1"}
              </div>
              <div className="text-xs mt-1 font-roboto">Strengths</div>
            </div>
          </div>
          
          <div 
            className={`flex-1 border-b-2 ${step >= 1 ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step > 1 ? 'bg-black text-white' : 
                  step === 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 1 ? <CheckCircle size={14} /> : "2"}
              </div>
              <div className="text-xs mt-1 font-roboto">Challenges</div>
            </div>
          </div>
          
          <div 
            className={`flex-1 border-b-2 ${step >= 2 ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step === 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 2 ? <CheckCircle size={14} /> : "3"}
              </div>
              <div className="text-xs mt-1 font-roboto">Goals</div>
            </div>
          </div>
        </div>
        
        {/* Content based on current step */}
        <div className="mb-6">
          {step === 0 && renderStrengthsStep()}
          {step === 1 && renderChallengesStep()}
          {step === 2 && renderGoalsStep()}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-roboto">
            <div className="flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {step === 0 ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 flex items-center border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={18} className="mr-1" />
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={loading || !isCurrentStepComplete()}
            className={`px-4 py-2 rounded-lg font-roboto flex items-center ${
              loading || !isCurrentStepComplete()
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : step < 2 ? (
              <>
                Next
                <ChevronRight size={18} className="ml-1" />
              </>
            ) : (
              <>
                Complete
                <CheckCircle size={18} className="ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelationshipPrework;