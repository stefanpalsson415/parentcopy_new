// src/components/assessment/CoupleCheckInScreen.jsx
import React, { useState, useEffect } from 'react';
import { Heart, Clock, CheckCircle, Calendar, MessageCircle, Smile, Award, Lightbulb, Map, Users, Brain } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import AllieAIEngineService from '../../services/AllieAIEngineService';
import CalendarService from '../../services/CalendarService';

const CoupleCheckInScreen = ({ onClose }) => {
  const { 
    currentWeek, 
    saveCoupleCheckInData, 
    familyMembers,
    surveyResponses,
    getRelationshipStrategies,
    selectedUser,
    getCoupleCheckInData,
    familyId
  } = useFamily();
  
  const [activeStep, setActiveStep] = useState(0);
  const [responses, setResponses] = useState({
    satisfaction: 3,
    communication: 3,
    emotionalConnection: 3,
    workloadBalance: 3,
    appreciationLevel: 3,
    strategies: {
      dailyCheckins: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      divideConquer: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      dateNights: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      gratitudeAffirmation: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      unifiedCalendar: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      problemSolving: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      selfCare: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      professionalDevelopment: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      celebrateMilestones: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      },
      futurePlanning: {
        implementation: 0,
        effectiveness: 0,
        notes: ''
      }
    },
    privateResponses: {
      challengingAreas: '',
      desiredSupport: '',
      appreciationFeedback: ''
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [strategies, setStrategies] = useState([]);
  
  // New state variables for enhanced features
  const [aiInsights, setAiInsights] = useState(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  
  // Load relationship strategy data if available
  useEffect(() => {
    const loadStrategies = async () => {
      try {
        const strategiesData = await getRelationshipStrategies();
        if (strategiesData) {
          setStrategies(strategiesData);
          
          // Update implementation values from saved strategy data
          const updatedResponses = { ...responses };
          
          strategiesData.forEach(strategy => {
            switch(strategy.id) {
              case 'daily-checkins':
                updatedResponses.strategies.dailyCheckins.implementation = strategy.implementation;
                break;
              case 'divide-conquer':
                updatedResponses.strategies.divideConquer.implementation = strategy.implementation;
                break;
              case 'date-nights':
                updatedResponses.strategies.dateNights.implementation = strategy.implementation;
                break;
              case 'gratitude-affirmation':
                updatedResponses.strategies.gratitudeAffirmation.implementation = strategy.implementation;
                break;
              case 'unified-calendar':
                updatedResponses.strategies.unifiedCalendar.implementation = strategy.implementation;
                break;
              case 'problem-solving':
                updatedResponses.strategies.problemSolving.implementation = strategy.implementation;
                break;
              case 'self-care':
                updatedResponses.strategies.selfCare.implementation = strategy.implementation;
                break;
              case 'counseling':
                updatedResponses.strategies.professionalDevelopment.implementation = strategy.implementation;
                break;
              case 'celebrate-milestones':
                updatedResponses.strategies.celebrateMilestones.implementation = strategy.implementation;
                break;
              case 'future-planning':
                updatedResponses.strategies.futurePlanning.implementation = strategy.implementation;
                break;
              default:
                break;
            }
          });
          
          setResponses(updatedResponses);
        }
      } catch (error) {
        console.error("Error loading strategies:", error);
      }
    };
    
    loadStrategies();
  }, [getRelationshipStrategies]);
  
  // New effect to load AI insights after completion
  useEffect(() => {
    if (saved && familyId) {
      const loadAIInsights = async () => {
        try {
          // Use AllieAIEngineService instead of EnhancedAIService from the Google Doc
          const insights = await AllieAIEngineService.generateRelationshipInsights(
            familyId,
            currentWeek,
            responses,
            strategies,
            {}
          );
          setAiInsights(insights);
        } catch (error) {
          console.error("Error loading AI relationship insights:", error);
        }
      };
      
      loadAIInsights();
    }
  }, [saved, familyId, currentWeek, responses, strategies]);
  
  // Define check-in steps with enhanced questions
  const steps = [
    {
      title: "Relationship Health",
      description: "How would you rate your current relationship satisfaction?",
      fields: [
        {
          id: "satisfaction",
          label: "Overall Relationship Satisfaction",
          type: "slider"
        },
        {
          id: "communication",
          label: "Communication Quality",
          type: "slider"
        },
        {
          id: "emotionalConnection",
          label: "Emotional Connection",
          type: "slider"
        },
        {
          id: "workloadBalance",
          label: "Workload Balance Impact on Relationship",
          type: "slider",
          description: "How is the current workload balance affecting your relationship?"
        }
      ]
    },
    // Add a new section for deeper relationship metrics
    {
      title: "Relationship Dynamics",
      description: "These questions help us understand your unique relationship patterns",
      fields: [
        {
          id: "conflictResolution",
          label: "Conflict Resolution",
          type: "slider",
          description: "How effectively are you resolving disagreements this week?"
        },
        {
          id: "qualityTime",
          label: "Quality Time Together",
          type: "slider",
          description: "How satisfied are you with the amount of quality time you've had together?"
        },
        {
          id: "stressManagement",
          label: "Shared Stress Management",
          type: "slider",
          description: "How well have you supported each other through stressful moments?"
        },
        {
          id: "parentingTeam", 
          label: "Parenting Team Effectiveness",
          type: "slider",
          description: "How well are you working together as parents this week?"
        }
      ]
    },
    {
      title: "Strategy Check-in: Connection",
      description: "Let's review how you're implementing these relationship-strengthening strategies",
      fields: [
        {
          id: "strategies.dailyCheckins",
          label: "Brief Daily Check-ins",
          icon: <Clock size={20} className="text-blue-600" />,
          type: "strategyRating",
          description: "Taking 5-10 minutes each day to connect and discuss highs/lows"
        },
        {
          id: "strategies.gratitudeAffirmation",
          label: "Gratitude & Affirmation",
          icon: <Smile size={20} className="text-yellow-600" />,
          type: "strategyRating",
          description: "Expressing appreciation for each other's efforts"
        },
        {
          id: "strategies.dateNights",
          label: "Regular Date Nights",
          icon: <Heart size={20} className="text-red-600" />,
          type: "strategyRating",
          description: "Dedicated time for just the two of you at least 1-2 times/month"
        },
        {
          id: "strategies.celebrateMilestones",
          label: "Celebrating Milestones",
          icon: <Award size={20} className="text-orange-600" />,
          type: "strategyRating",
          description: "Marking achievements and special moments together"
        }
      ]
    },
    {
      title: "Strategy Check-in: Teamwork",
      description: "Let's check on your implementation of these practical teamwork strategies",
      fields: [
        {
          id: "strategies.divideConquer",
          label: "Divide & Conquer Tasks",
          icon: <CheckCircle size={20} className="text-green-600" />,
          type: "strategyRating",
          description: "Clearly assigning who handles which responsibilities"
        },
        {
          id: "strategies.unifiedCalendar",
          label: "Unified Family Calendar",
          icon: <Calendar size={20} className="text-purple-600" />,
          type: "strategyRating",
          description: "Maintaining a shared system for tracking all commitments"
        },
        {
          id: "strategies.problemSolving",
          label: "Collaborative Problem-Solving",
          icon: <Lightbulb size={20} className="text-amber-600" />,
          type: "strategyRating",
          description: "Using a structured approach to address challenges together"
        },
        {
          id: "strategies.selfCare",
          label: "Supporting Self-Care",
          icon: <Users size={20} className="text-cyan-600" />,
          type: "strategyRating",
          description: "Ensuring each parent has time for personal well-being"
        }
      ]
    },
    {
      title: "Strategy Check-in: Growth",
      description: "These strategies help your relationship grow stronger over time",
      fields: [
        {
          id: "strategies.professionalDevelopment",
          label: "Professional Guidance",
          icon: <MessageCircle size={20} className="text-indigo-600" />,
          type: "strategyRating",
          description: "Seeking resources, workshops, or counseling when helpful"
        },
        {
          id: "strategies.futurePlanning",
          label: "Shared Future Planning",
          icon: <Map size={20} className="text-teal-600" />,
          type: "strategyRating",
          description: "Taking time to discuss and plan for your future together"
        },
        {
          id: "appreciationLevel",
          label: "Appreciation Level",
          type: "slider",
          description: "How appreciated do you feel by your partner this week?"
        }
      ]
    },
    {
      title: "Private Reflections",
      description: "These responses are visible only to the AI for personalized support",
      fields: [
        {
          id: "privateResponses.challengingAreas",
          label: "Current Challenges",
          type: "textarea",
          placeholder: "What areas of your relationship feel most challenging right now?"
        },
        {
          id: "privateResponses.desiredSupport",
          label: "Desired Support",
          type: "textarea",
          placeholder: "What kind of support would you like from your partner?"
        },
        {
          id: "privateResponses.appreciationFeedback",
          label: "Appreciation",
          type: "textarea",
          placeholder: "What do you appreciate most about your partner this week?"
        }
      ]
    }
  ];
  
  // Helper to update nested response values
  const updateNestedResponse = (id, value) => {
    const keys = id.split('.');
    if (keys.length === 1) {
      // Simple update for top-level keys
      setResponses({
        ...responses,
        [id]: value
      });
    } else {
      // Handle nested objects like strategies.dailyCheckins
      const updatedResponses = { ...responses };
      let current = updatedResponses;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Update the final property
      const lastKey = keys[keys.length - 1];
      
      // If this is a strategy, we're updating the whole object
      if (typeof value === 'object' && value !== null) {
        current[lastKey] = value;
      } else {
        // For simple values
        current[lastKey] = value;
      }
      
      setResponses(updatedResponses);
    }
  };
  
  // New function to schedule a relationship meeting
  const scheduleRelationshipMeeting = async () => {
    try {
      setIsAddingToCalendar(true);
      
      // Set meeting date to this weekend
      const meetingDate = new Date();
      // Find the next Saturday
      meetingDate.setDate(meetingDate.getDate() + (6 - meetingDate.getDay() + 7) % 7);
      meetingDate.setHours(20, 0, 0, 0); // 8 PM
      
      // Create event
      const event = {
        summary: 'Relationship Meeting',
        description: 'Time to connect and strengthen your relationship based on your check-in results.',
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(meetingDate.getTime() + 30*60000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: '3' // Red
      };
      
      const result = await CalendarService.addEvent(event);
      
      if (result.success) {
        alert("Relationship meeting added to your calendar!");
      }
    } catch (error) {
      console.error("Error scheduling relationship meeting:", error);
      alert("There was an error scheduling your meeting. Please try again.");
    } finally {
      setIsAddingToCalendar(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Save to database
      await saveCoupleCheckInData(currentWeek, {
        responses,
        completedBy: familyMembers.find(m => m.id === selectedUser.id)?.name || 'Unknown',
        completedAt: new Date().toISOString()
      });
      
      setSaved(true);
      
      // Don't close automatically to allow AI insights to load and be displayed
      // The user can close manually after viewing insights
    } catch (error) {
      console.error("Error saving check-in data:", error);
      alert("There was an error saving your responses. Please try again.");
      setSaving(false);
    }
  };
  
  // Next step
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };
  
  // Previous step
  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  // Render strategy rating input
  const renderStrategyRating = (fieldId, field) => {
    // Extract strategy name from field ID (e.g., "strategies.dailyCheckins" -> "dailyCheckins")
    const strategyName = fieldId.split('.')[1];
    const strategyData = responses.strategies[strategyName];
    
    return (
      <div className="mb-6">
        <div className="flex items-center mb-2">
          {field.icon}
          <h4 className="ml-2 font-medium font-roboto">{field.label}</h4>
        </div>
        <p className="text-sm text-gray-600 mb-3 font-roboto">{field.description}</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 font-roboto">Implementation Level</label>
          <div className="flex flex-wrap gap-2">
            {[0, 25, 50, 75, 100].map(level => (
              <button 
                key={level}
                className={`px-3 py-1 text-sm rounded-full font-roboto ${
                  strategyData.implementation === level 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 border hover:bg-gray-200'
                }`}
                onClick={() => updateNestedResponse(fieldId, {
                  ...strategyData,
                  implementation: level
                })}
                type="button"
              >
                {level === 0 ? 'Not started' :
                 level === 25 ? 'Just beginning' :
                 level === 50 ? 'Partially implemented' :
                 level === 75 ? 'Mostly implemented' :
                 'Fully implemented'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 font-roboto">Effectiveness</label>
          <div className="flex items-center">
            <span className="text-xs text-gray-500 font-roboto mr-2">Not effective</span>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={strategyData.effectiveness}
              onChange={(e) => updateNestedResponse(fieldId, {
                ...strategyData,
                effectiveness: parseInt(e.target.value)
              })}
              className="flex-1 accent-blue-500"
            />
            <span className="text-xs text-gray-500 font-roboto ml-2">Very effective</span>
          </div>
          <div className="flex justify-between px-1 mt-1">
            {[0, 1, 2, 3, 4, 5].map(num => (
              <div 
                key={num} 
                className={`w-4 h-4 flex items-center justify-center text-[10px] rounded-full ${
                  strategyData.effectiveness >= num 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
                }`}
                onClick={() => updateNestedResponse(fieldId, {
                  ...strategyData,
                  effectiveness: num
                })}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 font-roboto">Notes (Optional)</label>
          <textarea
            value={strategyData.notes}
            onChange={(e) => updateNestedResponse(fieldId, {
              ...strategyData,
              notes: e.target.value
            })}
            placeholder={`Any thoughts on how this strategy is working for you?`}
            className="w-full p-2 border rounded-md text-sm font-roboto"
            rows="2"
          />
        </div>
      </div>
    );
  };
  
  // Render slider input
  const renderSlider = (fieldId, field) => {
    // Get the response value from either top level or nested
    const getValue = () => {
      const keys = fieldId.split('.');
      if (keys.length === 1) {
        return responses[fieldId];
      } else {
        let value = responses;
        for (const key of keys) {
          value = value[key];
        }
        return value;
      }
    };
    
    const value = getValue();
    
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 font-roboto">
          {field.label}
        </label>
        {field.description && (
          <p className="text-sm text-gray-600 mb-2 font-roboto">{field.description}</p>
        )}
        <div className="flex items-center">
          <span className="text-xs text-gray-500 font-roboto mr-2">Low</span>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={value}
            onChange={(e) => updateNestedResponse(fieldId, parseInt(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-xs text-gray-500 font-roboto ml-2">High</span>
        </div>
        <div className="flex justify-between px-1 mt-1">
          {[1, 2, 3, 4, 5].map(num => (
            <div 
              key={num} 
              className={`w-6 h-6 flex items-center justify-center text-xs rounded-full ${
                value >= num 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200'
              }`}
              onClick={() => updateNestedResponse(fieldId, num)}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render textarea input
  const renderTextarea = (fieldId, field) => {
    // Get the response value from either top level or nested
    const getValue = () => {
      const keys = fieldId.split('.');
      if (keys.length === 1) {
        return responses[fieldId] || '';
      } else {
        let value = responses;
        for (const key of keys) {
          value = value[key];
        }
        return value || '';
      }
    };
    
    const value = getValue();
    
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 font-roboto">
          {field.label}
        </label>
        <textarea
          value={value}
          onChange={(e) => updateNestedResponse(fieldId, e.target.value)}
          placeholder={field.placeholder || ''}
          className="w-full p-3 border rounded-md font-roboto"
          rows="4"
        />
      </div>
    );
  };
  
  // Render field based on type
  const renderField = (field) => {
    switch (field.type) {
      case 'slider':
        return renderSlider(field.id, field);
      case 'strategyRating':
        return renderStrategyRating(field.id, field);
      case 'textarea':
        return renderTextarea(field.id, field);
      default:
        return null;
    }
  };
  
  // Render current step content
  const renderStepContent = () => {
    const currentStep = steps[activeStep];
    return (
      <div>
        <h3 className="text-lg font-bold mb-2 font-roboto">{currentStep.title}</h3>
        <p className="text-gray-600 mb-6 font-roboto">{currentStep.description}</p>
        
        {currentStep.fields.map(field => (
          <div key={field.id}>
            {renderField(field)}
          </div>
        ))}
      </div>
    );
  };
  
  // Modified completion screen with AI insights
  if (saved) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-lg w-full p-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Heart size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 font-roboto text-center">Check-in Complete!</h3>
          
          {/* AI Insights Section */}
          {aiInsights && aiInsights.length > 0 ? (
            <div className="mt-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                <h4 className="font-medium flex items-center font-roboto">
                  <Brain size={16} className="text-purple-600 mr-2" />
                  Allie's Relationship Insights
                </h4>
                
                <div className="space-y-3 mt-3">
                  {aiInsights.map((insight, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      insight.category === 'connection' ? 'bg-pink-50 border-pink-200' :
                      insight.category === 'workload' ? 'bg-blue-50 border-blue-200' :
                      insight.category === 'gratitude' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <h5 className="text-sm font-medium mb-1 font-roboto">{insight.title}</h5>
                      <p className="text-xs font-roboto">{insight.description}</p>
                      
                      {insight.actionable && (
                        <div className="mt-2 p-2 bg-white rounded text-xs">
                          <span className="font-medium font-roboto">Try this: </span>
                          <span className="font-roboto">{insight.actionable}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={scheduleRelationshipMeeting}
                  disabled={isAddingToCalendar}
                  className="px-4 py-2 bg-pink-100 text-pink-800 rounded-lg font-roboto flex items-center"
                >
                  {isAddingToCalendar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-pink-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar size={16} className="mr-2" />
                      Schedule Relationship Meeting
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 font-roboto text-center">
              Thank you for your responses. They help us provide better support for your relationship.
            </p>
          )}
          
          <button 
            onClick={onClose}
            className="w-full mt-6 py-2 bg-black text-white rounded font-roboto"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold font-roboto">Week {currentWeek} Couple Check-in</h2>
          <button
            onClick={() => onClose()}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Step progress indicator */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < activeStep 
                        ? 'bg-blue-500 text-white' 
                        : index === activeStep 
                          ? 'bg-white border-2 border-blue-500 text-blue-500' 
                          : 'bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Step content */}
            {renderStepContent()}
            
            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={activeStep === 0}
                className={`px-4 py-2 rounded font-roboto ${
                  activeStep === 0 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              
              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-roboto"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 rounded font-roboto ${
                    saving 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {saving ? 'Saving...' : 'Complete Check-in'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoupleCheckInScreen;