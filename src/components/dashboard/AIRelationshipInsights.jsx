import React, { useState } from 'react';
import { Brain, Lightbulb, Heart, Users, RefreshCw, ArrowRight } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import AllieAIEngineService from '../../services/AllieAIEngineService';

const AIRelationshipInsights = ({ insights = [], onActionClick }) => {
  const { familyId, currentWeek, relationshipStrategies, coupleCheckInData } = useFamily();
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Handle click on actionable item
  const handleActionClick = (insight) => {
    // Determine template type from action text
    let templateType = null;
    
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
    
    // Call the parent's handler with the template type
    if (onActionClick) {
      onActionClick(templateType);
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
      
      // Generate new insights using the AI engine
      const newInsights = await AllieAIEngineService.generateRelationshipInsights(
        familyId,
        currentWeek,
        trendData,
        relationshipStrategies,
        checkInData
      );
      
      setLastRefresh(new Date());
      
      // Return new insights to parent component
      if (onActionClick && typeof onActionClick === 'function') {
        // If onActionClick has a second parameter for updating insights
        if (onActionClick.length > 1) {
          onActionClick(null, newInsights);
        }
      }
      
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
      title: "Emotional Connection",
      description: "Daily check-ins strengthen your emotional bond. Couples who connect daily report 47% higher relationship satisfaction.",
      actionable: "Try our 5-minute check-in template tonight.",
      icon: <Heart size={20} className="text-pink-600" />,
      category: "connection"
    },
    {
      id: "mental-load",
      title: "Mental Load Sharing",
      description: "We've detected an imbalance in invisible tasks. Sharing mental load is crucial for relationship health.",
      actionable: "Review the Task Division strategy in your Strategic Actions.",
      icon: <Brain size={20} className="text-purple-600" />,
      category: "workload"
    },
    {
      id: "appreciation",
      title: "Appreciation Gap",
      description: "Expressing gratitude 3x more often could significantly boost your connection. Current expression rate is below optimal.",
      actionable: "Set a daily reminder to express appreciation.",
      icon: <Users size={20} className="text-blue-600" />,
      category: "gratitude"
    }
  ];

  const displayInsights = insights.length > 0 ? insights : getDefaultInsights();

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
          Personalized insights based on your relationship data, check-ins, and strategy implementation.
        </p>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayInsights.map((insight) => (
              <div 
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.category === 'connection' ? 'bg-pink-50 border-pink-200' :
                  insight.category === 'workload' ? 'bg-purple-50 border-purple-200' :
                  insight.category === 'gratitude' ? 'bg-blue-50 border-blue-200' :
                  'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start">
                  <div className="mt-1 mr-3">
                    {insight.icon || <Lightbulb size={20} className="text-yellow-600" />}
                  </div>
                  <div>
                    <h4 className="font-medium font-roboto">{insight.title}</h4>
                    <p className="text-sm mt-1 font-roboto">{insight.description}</p>
                    
                    {insight.actionable && (
                      <div 
                        className="mt-3 p-2 bg-white rounded border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => handleActionClick(insight)}
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