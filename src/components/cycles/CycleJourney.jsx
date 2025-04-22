// src/components/cycles/CycleJourney.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Heart, Calendar, CheckCircle, Clock, 
  ArrowRight, Shield, Brain, MapPin, Award
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CycleJourney - A unified, visually engaging cycle progress tracker
 * @param {Object} props
 * @param {string} props.cycleType - 'relationship' or 'family'
 * @param {number} props.currentCycle - The current cycle number
 * @param {Object} props.cycleData - Data about the current cycle status
 * @param {Array} props.familyMembers - All family members
 * @param {Object} props.currentUser - The current logged-in user
 * @param {Object} props.memberProgress - Progress status per member
 * @param {Function} props.onStartStep - Callback when a step is started
 * @param {Date} props.dueDate - The cycle due date
 * @param {Function} props.onChangeDueDate - Callback to change due date
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message if any
 */
const CycleJourney = ({
  cycleType = 'family',
  currentCycle = 1,
  cycleData = {},
  familyMembers = [],
  currentUser = null,
  memberProgress = {},
  onStartStep = () => {},
  dueDate = null,
  onChangeDueDate = () => {},
  loading = false,
  error = null
}) => {
  // Set up step configuration based on cycle type
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showPathAnimation, setShowPathAnimation] = useState(false);
  
  // Determine path type for each user (full path or child path)
  const getPathType = (member) => {
    if (cycleType === 'relationship') return 'parent';
    return member.role === 'child' ? 'child' : 'parent';
  };
  
  // Check if the current user has completed a specific step
  const hasUserCompletedStep = (stepNumber) => {
    if (!currentUser) return false;
    
    // Get current user's progress
    const userProgress = memberProgress[currentUser.id] || {};
    
    if (stepNumber === 1) {
      return userProgress.step >= 2;
    } 
    else if (stepNumber === 2) {
      return userProgress.completedSurvey || 
             (currentUser.weeklyCompleted && 
              currentUser.weeklyCompleted[currentCycle-1]?.completed) ||
             userProgress.step >= 3;
    }
    else if (stepNumber === 3) {
      // Be more strict about meeting completion - must be explicitly marked as completed
      return userProgress.completedMeeting === true || cycleData?.meeting?.completed === true;
    }
    
    return false;
  };

  // Initialize steps based on cycle type
  useEffect(() => {
    if (cycleType === 'relationship') {
      setSteps([
        {
          number: 1, 
          title: 'Assessments',
          icon: <Shield size={24} />,
          color: 'from-purple-500 to-pink-500',
          description: 'Complete your individual assessment',
          buttonText: 'Take Assessment',
          action: 'assessment'
        },
        {
          number: 2, 
          title: 'Pre-Meeting Work',
          icon: <Brain size={24} />,
          color: 'from-blue-500 to-purple-500',
          description: 'Prepare for your couple meeting',
          buttonText: 'Complete Pre-work',
          action: 'prework'
        },
        {
          number: 3, 
          title: 'Couple Meeting',
          icon: <Users size={24} />,
          color: 'from-indigo-500 to-blue-500',
          description: 'Strengthen your connection together',
          buttonText: 'Start Meeting',
          action: 'meeting'
        }
      ]);
    } else {
      setSteps([
        {
          number: 1, 
          title: 'Habit Building',
          icon: <Award size={24} />,
          color: 'from-blue-500 to-green-500',
          description: 'Build consistent habits for better balance',
          buttonText: 'Practice Habit',
          action: 'habit',
          childSkip: true // Children skip this step
        },
        {
          number: 2, 
          title: 'Family Survey',
          icon: <CheckCircle size={24} />,
          color: 'from-green-500 to-teal-500',
          description: 'Share your perspective on family balance',
          buttonText: 'Take Survey',
          action: 'survey'
        },
        {
          number: 3, 
          title: 'Family Meeting',
          icon: <Users size={24} />,
          color: 'from-teal-500 to-cyan-500',
          description: 'Discuss results and plan improvements',
          buttonText: 'Join Meeting',
          action: 'meeting'
        }
      ]);
    }
  }, [cycleType]);
  
  // Determine current step based on progress data
  useEffect(() => {
    if (!cycleData) return;
    
    let highestCompletedStep = 0;
    let stepsCompleted = [];
    
    // Different logic for relationship vs family cycles
    if (cycleType === 'relationship') {
      if (cycleData.assessmentsCompleted) {
        highestCompletedStep = 1;
        stepsCompleted.push(1);
      }
      
      if (cycleData.preworkCompleted) {
        highestCompletedStep = 2;
        stepsCompleted.push(2);
      }
      
      if (cycleData.meeting?.completed) {
        highestCompletedStep = 3;
        stepsCompleted.push(3);
      }
    } else {
      // Family cycle logic
      const allMembersCompletedHabits = familyMembers
        .filter(m => m.role === 'parent')
        .every(parent => {
          const progress = memberProgress[parent.id] || {};
          return progress.step >= 2;
        });
      
      if (allMembersCompletedHabits) {
        highestCompletedStep = 1;
        stepsCompleted.push(1);
      }
      // Also check for direct step completion flags from cycleData
if (cycleData.stepComplete && cycleData.stepComplete[1] === true) {
  highestCompletedStep = Math.max(highestCompletedStep, 1);
  if (!stepsCompleted.includes(1)) {
    stepsCompleted.push(1);
  }
}
      
      const allMembersCompletedSurvey = familyMembers
        .every(member => {
          const progress = memberProgress[member.id] || {};
          return progress.completedSurvey || member.weeklyCompleted?.[currentCycle-1]?.completed;
        });
      
      if (allMembersCompletedSurvey) {
        highestCompletedStep = 2;
        stepsCompleted.push(2);
      }
      
      // ONLY mark step 3 as completed if the meeting is explicitly completed
      // Not just because it's scheduled or available
      if (cycleData.meeting?.completed === true) {
        highestCompletedStep = 3;
        stepsCompleted.push(3);
      }
    }
    
    // Set current step to the next uncompleted step
    setCurrentStep(highestCompletedStep + 1 > 3 ? 3 : highestCompletedStep + 1);
    setCompletedSteps(stepsCompleted);
    
    // Trigger path animation when steps change
    setShowPathAnimation(true);
    setTimeout(() => setShowPathAnimation(false), 1000);
    
  }, [cycleData, cycleType, familyMembers, memberProgress, currentCycle]);
  
  // Determine if current user can take a specific step
  const canTakeStep = (stepNumber) => {
    if (!currentUser) return false;
    
    // For relationship cycles, only parents can participate
    if (cycleType === 'relationship' && 
        (!currentUser.role || currentUser.role !== 'parent')) {
      return false;
    }
    
    // For family cycles, children start at step 2
    if (cycleType === 'family' && 
        currentUser.role === 'child' && 
        stepNumber === 1) {
      return false;
    }
  
    // Get current user's progress
    const userProgress = memberProgress[currentUser.id] || {};
    
    // Check if the current user has completed this specific step
    const hasCompletedThisStep = stepNumber === 2 && 
      (userProgress.completedSurvey || 
       currentUser.weeklyCompleted?.[currentCycle-1]?.completed ||
       userProgress.step > 2);
    
    if (hasCompletedThisStep) {
      return false; // Step already completed
    }
    
    // Step 1 is always available unless completed
    if (stepNumber === 1) {
      return !completedSteps.includes(1);
    }
    
    // Other steps require previous step completion
    return completedSteps.includes(stepNumber - 1) && 
           !completedSteps.includes(stepNumber);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not scheduled';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-medium font-roboto">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 overflow-hidden">
      {/* Header with cycle info */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold font-roboto">
            {cycleType === 'relationship' ? 'Relationship' : 'Family'} Cycle {currentCycle}
          </h3>
          <p className="text-sm text-gray-600 font-roboto mt-1">
            {cycleType === 'relationship' 
              ? 'Complete your individual assessments, then work together to strengthen your relationship.'
              : 'Complete habits, take surveys, and hold family meetings to improve balance.'}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-roboto shadow-md">
          Current Cycle
        </div>
      </div>
      
      {/* Interactive Journey Path */}
      <div className="mt-8 mb-6 relative">
        {/* Step Labels above the path */}
        <div className="flex justify-between mb-2">
          {steps.map((step) => (
            <div key={`label-${step.number}`} className="text-center" style={{ width: `${100/steps.length}%` }}>
              <div className={`text-sm font-medium ${
                completedSteps.includes(step.number) ? 'text-purple-600' : 'text-gray-500'
              }`}>
                STEP {step.number}
              </div>
              <div className="text-xs text-gray-600">{step.title}</div>
            </div>
          ))}
        </div>

        {/* Path Background */}
        <div className="h-2 bg-gray-200 rounded-full w-full relative">
          {/* Progress Bar - dynamic width based on completion */}
          <motion.div 
            className={`absolute left-0 h-2 rounded-full transition-all duration-700 ease-in-out bg-gradient-to-r ${
              completedSteps.includes(3) ? 'from-green-400 to-green-500' :
              completedSteps.includes(2) ? 'from-blue-400 to-purple-500' :
              completedSteps.includes(1) ? 'from-purple-500 to-pink-500' :
              'from-gray-300 to-gray-400'
            }`}
            initial={{ width: 0 }}
            animate={{ 
              width: `${(Math.max(...completedSteps, 0) / steps.length) * 100}%` 
            }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Step Markers */}
          <div className="absolute top-0 left-0 transform -translate-y-1/2 w-full">
            <div className="flex justify-between">
              {steps.map((step) => (
                <motion.div 
                  key={`marker-${step.number}`}
                  className="relative flex flex-col items-center"
                  initial={{ scale: 0.8, opacity: 0.7 }}
                  animate={{ 
                    scale: currentStep === step.number ? 1.1 : 1,
                    opacity: 1
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md z-10 ${
                    completedSteps.includes(step.number) 
                      ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                      : currentStep === step.number
                        ? `bg-gradient-to-r ${step.color} text-white`
                        : 'bg-gray-300 text-gray-700'
                  }`}>
                    {completedSteps.includes(step.number) 
                      ? <CheckCircle size={16} />
                      : step.number
                    }
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Path Animation Effect - when progress changes */}
        <AnimatePresence>
          {showPathAnimation && (
            <motion.div 
              className="absolute top-0 left-0 w-full h-2 rounded-full bg-white"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </AnimatePresence>
        
        {/* Family Members Progress Avatars */}
        <div className="mt-10 flex justify-center flex-wrap gap-6">
          {familyMembers
            .filter(member => 
              // For relationship cycles, only show parents
              cycleType !== 'relationship' || member.role === 'parent'
            )
            .map((member) => {
              const memberPathType = getPathType(member);
              const isCurrentUser = currentUser && member.id === currentUser.id;
              const memberProgressData = memberProgress[member.id] || { step: 1 };
              const memberStep = memberProgressData.step || 1;
              
              // Adjust for children who start at step 2 in family cycles
              const adjustedStep = (cycleType === 'family' && member.role === 'child' && memberStep === 1) 
                ? 2 : memberStep;
              
              return (
                <motion.div 
                  key={member.id} 
                  className="flex flex-col items-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * familyMembers.indexOf(member) }}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                      isCurrentUser ? 'border-blue-500' : 'border-gray-200'
                    }`}>
                      <UserAvatar 
                        user={member} 
                        size={48} 
                      />
                    </div>
                    
                    {/* Step Badge */}
                    <div className={`absolute -right-1 -bottom-1 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      adjustedStep === 3 ? 'bg-teal-500 text-white' :
                      adjustedStep === 2 ? 'bg-blue-500 text-white' :
                      'bg-purple-500 text-white'
                    }`}>
                      {adjustedStep}
                    </div>
                    
                    {/* "You" indicator for current user */}
                    {isCurrentUser && (
                      <div className="absolute -top-1 -right-1 bg-blue-100 rounded-full px-1 text-blue-800 text-xs border border-blue-200">
                        You
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">
                      {memberPathType === 'child' && cycleType === 'family'
                        ? `Step 2: ${memberProgressData.completedSurvey ? 'Survey Done' : 'Survey'}`
                        : memberProgressData.completedSurvey
                          ? 'Survey Done'
                          : `Step ${memberStep}: ${steps[memberStep-1]?.title || 'In Progress'}`
                      }
                    </div>
                  </div>
                </motion.div>
              );
            })
          }
        </div>
      </div>
      
      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        {steps.map((step) => {
          // NEW CODE (replace with this)
// Special display for Step 1 for children in family cycles
if (cycleType === 'family' && 
  currentUser?.role === 'child' && 
  step.number === 1 && 
  step.childSkip) {
return (
  <motion.div 
    key={`action-${step.number}`}
    className="rounded-lg p-5 relative overflow-hidden bg-gray-50 border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 * step.number }}
  >
    <div className="flex flex-col h-full">
      <div className="rounded-full w-12 h-12 flex items-center justify-center mb-3 bg-gray-200 text-gray-600 mx-auto">
        {step.icon}
      </div>
      <h4 className="text-lg font-medium mb-1 text-center">
        Step {step.number}: {step.title}
      </h4>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Just for parents! They build habits to help balance family responsibilities.
      </p>
      <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
        <p>Your parents need to complete this step before you can take the family survey.</p>
      </div>
    </div>
  </motion.div>
);
}
          
          const isCompleted = completedSteps.includes(step.number);
          const isActive = currentStep === step.number;
          const canStart = canTakeStep(step.number);
          
          return (
            <motion.div 
              key={`action-${step.number}`}
              className={`rounded-lg p-5 relative overflow-hidden ${
                isCompleted 
                  ? 'bg-green-50 border border-green-100' 
                  : isActive
                    ? 'bg-white border-2 border-indigo-200 shadow-md'
                    : 'bg-gray-50 border border-gray-100'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * step.number }}
            >
              {/* Diagonal ribbon for completed steps */}
              {isCompleted && (
                <div className="absolute -right-8 top-3 bg-green-500 text-white px-10 transform rotate-45 text-xs py-1 shadow-md">
                  Completed
                </div>
              )}
              
              {/* Step content */}
              <div className="flex flex-col h-full">
                <div className={`rounded-full w-12 h-12 flex items-center justify-center mb-3 ${
                  isCompleted 
                    ? 'bg-green-100 text-green-600'
                    : isActive
                      ? `bg-gradient-to-r ${step.color} text-white`
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? <CheckCircle size={20} /> : step.icon}
                </div>
                
                <h4 className="text-lg font-medium mb-1">
                  Step {step.number}: {step.title}
                </h4>
                
                <p className="text-sm text-gray-600 mb-4 flex-grow">
                  {step.description}
                </p>
                
                <button
                  onClick={() => onStartStep(step.action, step.number)}
                  disabled={!canStart || hasUserCompletedStep(step.number)}
                  className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                    isCompleted || hasUserCompletedStep(step.number)
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : canStart
                        ? `bg-gradient-to-r ${step.color} text-white shadow-md hover:shadow-lg`
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCompleted || hasUserCompletedStep(step.number)
                    ? <>
                        <CheckCircle size={16} className="mr-2" />
                        Completed
                      </>
                    : <>
                        {step.icon && React.cloneElement(step.icon, { size: 16, className: "mr-2" })}
                        {step.buttonText}
                      </>
                  }
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Due Date Information */}
      {dueDate && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <Calendar size={18} className="text-blue-500 mr-2" />
            <div>
              <span className="text-sm font-medium">Due Date:</span>
              <span className="ml-2 text-sm">{formatDate(dueDate)}</span>
              {dueDate < new Date() && (
                <span className="ml-2 text-xs text-red-500 font-medium">(Past due)</span>
              )}
            </div>
          </div>
          <button
            onClick={onChangeDueDate}
            className="text-xs flex items-center bg-white px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Clock size={14} className="mr-1" />
            Change Due Date
          </button>
        </div>
      )}
      
      {/* Balance Visualization - Only in family cycles */}
      {cycleType === 'family' && cycleData.balance && (
        <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <MapPin size={16} className="mr-2 text-indigo-600" />
            Current Family Balance
          </h4>
          
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <motion.div 
                className="bg-pink-400 h-full flex items-center justify-end pr-2"
                style={{ width: `${cycleData.balance.mama}%` }}
                initial={{ width: '50%' }}
                animate={{ width: `${cycleData.balance.mama}%` }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-xs text-white font-medium">Mama</span>
              </motion.div>
              <motion.div 
                className="bg-blue-400 h-full flex items-center justify-start pl-2"
                style={{ width: `${cycleData.balance.papa}%` }}
                initial={{ width: '50%' }}
                animate={{ width: `${cycleData.balance.papa}%` }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-xs text-white font-medium">Papa</span>
              </motion.div>
            </div>
            
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-white border-dashed"></div>
          </div>
          
          <div className="flex justify-between mt-1 text-xs text-gray-600">
            <span>Imbalanced</span>
            <span>Perfectly Balanced</span>
            <span>Imbalanced</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleJourney;