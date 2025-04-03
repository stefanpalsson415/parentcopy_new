import React, { useState, useEffect } from 'react';
import { Heart, Clock, Users, CheckCircle, Calendar, MessageCircle, Smile, Award, Lightbulb, Map, Brain, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import StrategyImplementationGuide from '../relationship/StrategyImplementationGuide';

const StrategicActionsTracker = () => {
  const { 
    familyId,
    getRelationshipStrategies,
    updateRelationshipStrategy 
  } = useFamily();
  
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStrategy, setExpandedStrategy] = useState(null);
  const [savingStrategy, setSavingStrategy] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedGuideStrategyId, setSelectedGuideStrategyId] = useState(null);
  
  // Load strategies data
  useEffect(() => {
    const loadStrategies = async () => {
      if (!familyId) return;
      
      setLoading(true);
      setSaveError(null);
      
      try {
        const strategiesData = await getRelationshipStrategies();
        if (strategiesData && strategiesData.length > 0) {
          setStrategies(strategiesData);
        } else {
          // Initialize with default strategies if none exist
          setStrategies(getDefaultStrategies());
        }
      } catch (error) {
        console.error("Error loading relationship strategies:", error);
        setSaveError("Could not load strategies. Please try again later.");
        setStrategies(getDefaultStrategies());
      } finally {
        setLoading(false);
      }
    };
    
    loadStrategies();
  }, [familyId, getRelationshipStrategies]);

  // Default strategies based on whitepaper
  const getDefaultStrategies = () => [
    {
      id: 'daily-checkins',
      name: 'Brief Daily Check-ins',
      description: 'Set aside five to ten minutes each day to connect—discuss highs, lows, or share a moment of gratitude.',
      icon: <Clock size={20} className="text-blue-600" />,
      frequency: 'daily',
      implementation: 0, // 0-100% implemented
      lastActivity: null,
      tips: [
        'After the kids are settled, ask "How was your day?" and listen actively',
        'Share one highlight and one challenge from your day',
        'Express gratitude for something specific your partner did'
      ]
    },
    {
      id: 'divide-conquer',
      name: 'Divide and Conquer Tasks',
      description: 'Proactively agree on who handles which chores and responsibilities.',
      icon: <CheckCircle size={20} className="text-green-600" />,
      frequency: 'weekly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Make a list of all recurring tasks',
        'Assign tasks based on strengths and schedules',
        'Revisit assignments monthly to ensure balance'
      ]
    },
    {
      id: 'date-nights',
      name: 'Regular Date Nights',
      description: 'Arrange a dedicated date night at least once or twice a month.',
      icon: <Heart size={20} className="text-red-600" />,
      frequency: 'biweekly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Book a babysitter or trade off with another family',
        'Plan simple outings—dinner, a walk, or a cultural event',
        'Take turns planning the date'
      ]
    },
    {
      id: 'gratitude-affirmation',
      name: 'Practice Gratitude & Affirmation',
      description: "Routinely express appreciation for your partner's efforts—big or small.",
      icon: <Smile size={20} className="text-yellow-600" />,
      frequency: 'daily',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Send a quick text thanking your partner for handling a difficult task',
        'Verbally acknowledge contributions at the end of the day',
        'Leave small notes of appreciation'
      ]
    },
    {
      id: 'unified-calendar',
      name: 'Create a Unified Family Calendar',
      description: 'Keep a single, shared calendar visible for all commitments.',
      icon: <Calendar size={20} className="text-purple-600" />,
      frequency: 'ongoing',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Use a physical calendar in the kitchen or a digital app',
        "Include kids' events, work deadlines, and personal appointments",
        'Review the calendar together weekly'
      ]
    },
    {
      id: 'problem-solving',
      name: 'Collaborative Problem-Solving',
      description: 'Use a structured approach for recurring challenges.',
      icon: <Lightbulb size={20} className="text-amber-600" />,
      frequency: 'as-needed',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Define the problem, brainstorm solutions, implement a plan, evaluate results',
        'Schedule a calm time to discuss issues like discipline strategies',
        'Ensure both partners present ideas and co-create solutions'
      ]
    },
    {
      id: 'self-care',
      name: 'Prioritize Self-Care',
      description: 'Ensure each parent has designated "me time" for hobbies, exercise, or rest.',
      icon: <Users size={20} className="text-cyan-600" />,
      frequency: 'weekly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Schedule time blocks where one parent manages responsibilities',
        "Identify each partner's preferred self-care activities",
        'Hold these times sacred, avoiding interruptions'
      ]
    },
    {
      id: 'counseling',
      name: 'Consider Couples Workshops',
      description: 'Invest in professional guidance through seminars, workshops, or counseling sessions.',
      icon: <MessageCircle size={20} className="text-indigo-600" />,
      frequency: 'quarterly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Research local family therapists or weekend retreats',
        'Attend virtual counseling to accommodate busy schedules',
        'Apply techniques learned in sessions to daily interactions'
      ]
    },
    {
      id: 'celebrate-milestones',
      name: 'Celebrate Milestones Together',
      description: 'Mark achievements—birthdays, promotions, or simply surviving a tough week.',
      icon: <Award size={20} className="text-orange-600" />,
      frequency: 'monthly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Plan simple traditions like a family pizza night',
        'Surprise your partner with tokens of appreciation',
        'Take photos to document special moments'
      ]
    },
    {
      id: 'future-planning',
      name: 'Shared Future Planning',
      description: 'Take time to visualize and plan for life changes and goals.',
      icon: <Map size={20} className="text-teal-600" />,
      frequency: 'quarterly',
      implementation: 0,
      lastActivity: null,
      tips: [
        'Schedule quarterly meetings to discuss finances and aspirations',
        "Ensure both partners' voices are heard and valued",
        'Document decisions and revisit them periodically'
      ]
    }
  ];

  // Update strategy implementation level
  const handleImplementationChange = async (id, newValue) => {
    // First update UI for immediate feedback
    const updatedStrategies = strategies.map(strategy => 
      strategy.id === id ? { ...strategy, implementation: newValue, lastActivity: new Date().toISOString() } : strategy
    );
    
    setStrategies(updatedStrategies);
    setSavingStrategy(id);
    setSaveError(null);
    
    // Now update in Firebase
    if (updateRelationshipStrategy) {
      try {
        await updateRelationshipStrategy(id, { 
          implementation: newValue, 
          lastActivity: new Date().toISOString() 
        });
      } catch (error) {
        console.error("Error updating strategy:", error);
        setSaveError(`Could not save strategy "${updatedStrategies.find(s => s.id === id)?.name}". Please try again.`);
        
        // Revert to original value if there was an error
        setStrategies(strategies);
      } finally {
        setSavingStrategy(null);
      }
    }
  };

  // Toggle strategy details expansion
  const toggleStrategy = (id) => {
    setExpandedStrategy(expandedStrategy === id ? null : id);
  };

  // Get recommended strategies based on implementation levels
  const getRecommendedStrategies = () => {
    return strategies
      .filter(strategy => strategy.implementation < 50)
      .sort((a, b) => a.implementation - b.implementation)
      .slice(0, 3);
  };
  
  // Open implementation guide
  const openImplementationGuide = (strategyId) => {
    setSelectedGuideStrategyId(strategyId);
    setShowGuide(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
      </div>
    );
  }

  const recommendedStrategies = getRecommendedStrategies();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 font-roboto">10 Strategic Actions for Relationship Strength</h3>
        <p className="text-sm text-gray-600 mb-6 font-roboto">
          Based on research in parenting and relationship psychology, these ten strategies will help strengthen your partnership while balancing family responsibilities.
        </p>
        
        {/* Error display */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle size={20} className="text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-600 font-medium font-roboto">{saveError}</p>
              <p className="text-sm text-red-600 font-roboto">Please try again or refresh the page.</p>
            </div>
          </div>
        )}
        
        {/* Recommendations Section */}
        {recommendedStrategies.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium mb-3 font-roboto">Recommended Focus Areas</h4>
            <div className="space-y-3">
              {recommendedStrategies.map(strategy => (
                <div key={strategy.id} className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    {strategy.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm font-roboto">{strategy.name}</p>
                    <p className="text-xs text-gray-600 font-roboto">{strategy.implementation}% implemented</p>
                    <div className="mt-1 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${strategy.implementation}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Task Weighting System */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-black">
          <h4 className="font-medium text-lg mb-2 font-roboto">Allie Task Weighting System</h4>
          <p className="text-sm font-roboto mb-3">
            Our proprietary task weighting system goes beyond simple counting to analyze the true impact of different tasks:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                <Clock size={16} className="text-blue-600" />
              </div>
              <div>
                <h5 className="font-medium text-sm font-roboto">Time & Frequency</h5>
                <p className="text-xs text-gray-600 font-roboto">Tasks done daily or requiring significant time receive higher weight</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                <Brain size={16} className="text-purple-600" />
              </div>
              <div>
                <h5 className="font-medium text-sm font-roboto">Invisibility Factor</h5>
                <p className="text-xs text-gray-600 font-roboto">Mental load from tasks that go unnoticed receives higher weight</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                <Heart size={16} className="text-red-600" />
              </div>
              <div>
                <h5 className="font-medium text-sm font-roboto">Emotional Labor</h5>
                <p className="text-xs text-gray-600 font-roboto">Tasks requiring emotional energy are weighted more heavily</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                <Users size={16} className="text-green-600" />
              </div>
              <div>
                <h5 className="font-medium text-sm font-roboto">Child Development Impact</h5>
                <p className="text-xs text-gray-600 font-roboto">Tasks that influence how children view gender roles receive higher weight</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategies List */}
        <div className="space-y-4">
          {strategies.map(strategy => (
            <div key={strategy.id} className="border rounded-lg overflow-hidden">
              {/* Strategy Header */}
              <div 
                className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${
                  expandedStrategy === strategy.id ? 'border-b' : ''
                }`}
                onClick={() => toggleStrategy(strategy.id)}
              >
                <div className="flex items-center">
                  <div className="mr-3 flex-shrink-0">
                    {strategy.icon}
                  </div>
                  <div>
                    <h4 className="font-medium font-roboto">{strategy.name}</h4>
                    <p className="text-xs text-gray-500 font-roboto">
                      {strategy.frequency.charAt(0).toUpperCase() + strategy.frequency.slice(1)} practice
                    </p>
                    {/* Associated Tool Label */}
                    {strategy.id === 'daily-checkins' && 
                      <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded font-roboto">Daily Check-in Tool</span>}
                    {strategy.id === 'date-nights' && 
                      <span className="text-xs bg-pink-100 text-pink-700 px-1 rounded font-roboto">Date Night Planner</span>}
                    {strategy.id === 'gratitude-affirmation' && 
                      <span className="text-xs bg-green-100 text-green-700 px-1 rounded font-roboto">Gratitude Tracker</span>}
                    {strategy.id === 'self-care' && 
                      <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded font-roboto">Self-Care Planner</span>}
                  </div>
                </div>
                
                <div className="flex items-center">
                  {/* Implementation Progress */}
                  <div className="hidden sm:block mr-4">
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${strategy.implementation}%` }} 
                        />
                      </div>
                      <span className="ml-2 text-xs font-roboto">{strategy.implementation}%</span>
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Icon */}
                  {expandedStrategy === strategy.id ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedStrategy === strategy.id && (
                <div className="p-4 bg-gray-50">
                  <p className="text-sm mb-4 font-roboto">{strategy.description}</p>
                  
                  {/* Implementation Tips */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 font-roboto">Implementation Tips:</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {strategy.tips.map((tip, index) => (
                        <li key={index} className="text-sm font-roboto">{tip}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Implementation Level Selector */}
                  <div>
                    <h5 className="text-sm font-medium mb-2 font-roboto">How well is this implemented in your family?</h5>
                    <div className="flex flex-wrap gap-2">
                      {[0, 25, 50, 75, 100].map(level => (
                        <button 
                          key={level}
                          className={`px-3 py-1 text-sm rounded-full font-roboto ${
                            strategy.implementation === level 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white border hover:bg-gray-100'
                          } ${savingStrategy === strategy.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleImplementationChange(strategy.id, level)}
                          disabled={savingStrategy === strategy.id}
                        >
                          {savingStrategy === strategy.id && level === strategy.implementation ? (
                            <span className="flex items-center">
                              <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1"></div>
                              Saving...
                            </span>
                          ) : (
                            level === 0 ? 'Not started' :
                            level === 25 ? 'Just beginning' :
                            level === 50 ? 'Partially implemented' :
                            level === 75 ? 'Mostly implemented' :
                            'Fully implemented'
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Milestone display */}
                  {strategy.implementation >= 50 && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="mt-0.5 mr-2 flex-shrink-0">
                          <CheckCircle size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800 font-roboto">Milestone Reached!</p>
                          <p className="text-xs text-green-700 font-roboto">
                            You've successfully implemented this strategy at the 50% level. 
                            {strategy.implementation >= 75 && " You're now at the advanced level of implementation!"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Effectiveness Recommendations */}
                  {strategy.implementation > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h5 className="text-sm font-medium text-purple-800 font-roboto">Implementation Tips</h5>
                      <p className="text-xs mt-1 text-purple-700 font-roboto">
                        {strategy.id === 'daily-checkins' ? 
                          "Try setting a consistent time each day for your check-in. Evening discussions work best for 78% of couples." : 
                        strategy.id === 'date-nights' ?
                          "Research shows planning dates 2 weeks in advance increases follow-through by 64%. Try scheduling your next 2-3 dates today." :
                        strategy.id === 'gratitude-affirmation' ?
                          "Couples who express gratitude daily report 37% higher relationship satisfaction. Consider adding appreciation to your daily routine." :
                        strategy.id === 'divide-conquer' ?
                          "The most successful couples revisit their task division monthly to adjust as needed. Schedule a monthly division review." :
                        "Families who fully implement this strategy report a 31% increase in relationship satisfaction. Keep making progress!"}
                      </p>
                    </div>
                  )}

                  {/* Quick Start Guide */}
                  <div className="mt-3">
                    <button
                      className="w-full py-2 px-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm flex items-center justify-center font-roboto hover:bg-blue-100"
                      onClick={() => openImplementationGuide(strategy.id)}
                    >
                      <Lightbulb size={16} className="mr-2" />
                      Implementation Guide
                    </button>
                  </div>

                  {/* Last Activity */}
                  {strategy.lastActivity && (
                    <p className="text-xs text-gray-500 mt-4 font-roboto">
                      Last updated: {new Date(strategy.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Strategy Implementation Guide Modal */}
      {showGuide && selectedGuideStrategyId && (
        <StrategyImplementationGuide 
          strategyId={selectedGuideStrategyId} 
          onClose={() => setShowGuide(false)} 
        />
      )}
    </div>
  );
};

export default StrategicActionsTracker;