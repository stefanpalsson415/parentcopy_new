// src/components/dashboard/AIRelationshipInsights.jsx
import React, { useState, useEffect } from 'react';
import { Brain, Lightbulb, Heart, Users, RefreshCw, ArrowRight, Calendar, Clock, Info } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import AllieAIService from '../../services/AllieAIService';

const AIRelationshipInsights = ({ insights = [], onActionClick }) => {
  const { familyId, currentWeek, relationshipStrategies, coupleCheckInData } = useFamily();
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [hasData, setHasData] = useState(true);
  const [localInsights, setLocalInsights] = useState(insights);

  // Check if we have enough data on initial render
  useEffect(() => {
    // Check if we have relationship data
    const hasRelationshipData = 
      relationshipStrategies?.length > 0 || 
      Object.keys(coupleCheckInData || {}).length > 0;
    
    setHasData(hasRelationshipData);
  }, [relationshipStrategies, coupleCheckInData]);

  // Handle click on actionable item
  const handleActionClick = (insight) => {
    // Determine template type from action text
    let templateType = null;
    let category = insight.category || 'general';
    
    if (!insight?.actionable) return;
    
    const actionText = insight.actionable.toLowerCase();
    
    if (actionText.includes('check-in') || actionText.includes('check in')) {
      templateType = 'daily-checkin';
    } else if (actionText.includes('gratitude') || actionText.includes('appreciation')) {
      templateType = 'gratitude-practice';
    } else if (actionText.includes('date') || actionText.includes('night')) {
      templateType = 'date-night';
    } else if (actionText.includes('self-care') || actionText.includes('self care')) {
      templateType = 'self-care';
    } else {
      // Default to most relevant template based on category
      switch (insight.category) {
        case 'connection':
          templateType = 'daily-checkin';
          break;
        case 'gratitude':
          templateType = 'gratitude-practice';
          break;
        case 'workload':
          templateType = 'divide-conquer';
          break;
        default:
          templateType = 'daily-checkin';
      }
    }
    
    // Call the parent's handler with the template type and category
    if (onActionClick) {
      onActionClick(category);
    }
  };

  // Handle refresh insights
  const handleRefresh = async () => {
    if (!familyId || !currentWeek) return;
    
    setLoading(true);
    try {
      // Get relationship trend data
      const getRelationshipTrendData = () => {
        // This could be replaced with actual trend data if available
        return [
          { week: 'Initial', satisfaction: 3.5, communication: 3.0, workloadBalance: 65 },
          { week: `Cycle ${currentWeek}`, satisfaction: 3.8, communication: 3.2, workloadBalance: 58 }
        ];
      };
      
      const trendData = getRelationshipTrendData();
      const checkInData = coupleCheckInData[currentWeek] || {};
      
      // Generate new insights using the AI 
      const newInsights = await AllieAIService.generateRelationshipInsights(
        familyId,
        currentWeek,
        trendData,
        relationshipStrategies,
        checkInData
      );
      
      setLastRefresh(new Date());
      setLocalInsights(newInsights);
      
      setLoading(false);
    } catch (error) {
      console.error("Error refreshing insights:", error);
      setLoading(false);
    }
  };

  // Default insights if none provided
  const getDefaultInsights = () => [
    {
      id: "emotional-connection",
      title: "Start with Daily Check-ins",
      description: "Begin with quick 5-minute daily check-ins to strengthen your emotional bond. It's the foundation of a healthy partnership.",
      actionable: "Try our 5-minute check-in template tonight.",
      icon: <Heart size={20} className="text-pink-600" />,
      category: "connection"
    },
    {
      id: "appreciation",
      title: "Express Appreciation",
      description: "Couples who regularly express gratitude report 47% higher relationship satisfaction. Make appreciation a daily habit.",
      actionable: "Use the Gratitude Tracker to send a note of appreciation.",
      icon: <Users size={20} className="text-blue-600" />,
      category: "gratitude"
    },
    {
      id: "quality-time",
      title: "Schedule Quality Time",
      description: "Regular date nights help maintain connection amid busy family life. Plan meaningful time together.",
      actionable: "Add a date night to your calendar this week.",
      icon: <Calendar size={20} className="text-purple-600" />,
      category: "connection"
    }
  ];

  // Display default insights if none provided or data is insufficient
  const displayInsights = localInsights?.length > 0 ? localInsights : getDefaultInsights();

  // If there's truly no relationship data, show an introductory message instead
  if (!hasData && displayInsights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Brain size={20} className="text-purple-600 mr-2" />
              <h3 className="text-lg font-bold font-roboto">AI Relationship Insights</h3>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-4">
            <div className="flex items-start">
              <Info size={24} className="text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-2 font-roboto">Get Started with Relationship Insights</h4>
                <p className="text-sm text-blue-700 font-roboto mb-3">
                  Complete your first relationship check-in to receive personalized AI insights that will help strengthen your partnership.
                </p>
                <p className="text-sm text-blue-700 font-roboto mb-3">
                  Allie will analyze your relationship data and provide targeted recommendations based on:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700 font-roboto mb-3">
                  <li>Your specific relationship dynamics</li>
                  <li>Research-backed relationship strategies</li>
                  <li>Patterns between workload balance and relationship health</li>
                </ul>
                <button 
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-roboto flex items-center text-sm hover:bg-blue-700"
                  onClick={() => {
                    if (onActionClick) {
                      onActionClick('relationship-questionnaire');
                    }
                  }}
                >
                  Start Relationship Check-in
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Brain size={20} className="text-purple-600 mr-2" />
            <h3 className="text-lg font-bold font-roboto">AI Relationship Insights</h3>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center text-sm px-3 py-1 rounded hover:bg-gray-100 border font-roboto"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh Insights
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Personalized insights to strengthen your relationship based on your check-ins and questionnaire responses.
        </p>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-purple-600 font-roboto">Generating insights...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {displayInsights.map((insight) => (
              <div 
                key={insight.id}
                className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                  insight.category === 'connection' ? 'bg-pink-50 border-pink-200' :
                  insight.category === 'workload' ? 'bg-purple-50 border-purple-200' :
                  insight.category === 'gratitude' ? 'bg-blue-50 border-blue-200' :
                  'bg-green-50 border-green-200'
                }`}
                onClick={() => handleActionClick(insight)}
              >
                <div className="flex items-start">
                  <div className="mt-1 mr-3 flex-shrink-0">
                    {insight.icon || <Lightbulb size={20} className="text-yellow-600" />}
                  </div>
                  <div>
                    <h4 className="font-medium font-roboto">{insight.title}</h4>
                    <p className="text-sm mt-1 font-roboto">{insight.description}</p>
                    
                    {insight.actionable && (
                      <div 
                        className="mt-3 p-2 bg-white rounded border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <p className="text-sm font-medium font-roboto flex items-center justify-between">
                          <span className="flex items-center">
                            <Lightbulb size={14} className="mr-2 text-yellow-600" />
                            Try this: {insight.actionable}
                          </span>
                          <ArrowRight size={14} className="text-gray-400" />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {lastRefresh && (
              <p className="text-xs text-gray-500 text-right font-roboto">
                Last updated: {lastRefresh.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRelationshipInsights;