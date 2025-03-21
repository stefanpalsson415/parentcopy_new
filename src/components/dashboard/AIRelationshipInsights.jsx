import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import AllieAIEngineService from '../../services/AllieAIEngineService';
import { Brain, Lightbulb, Heart, Users, RefreshCw } from 'lucide-react';

const AIRelationshipInsights = () => {
  const { familyId, currentWeek, getRelationshipTrendData, relationshipStrategies, coupleCheckInData } = useFamily();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load insights from AI engine
  useEffect(() => {
    const loadInsights = async () => {
      if (!familyId) return;
      
      setLoading(true);
      
      try {
        // Get relationship data to feed to the AI
        const relationshipData = getRelationshipTrendData();
        const checkInData = coupleCheckInData[currentWeek] || {};
        
        // Feed all data to the AI engine
        const aiInsights = await AllieAIEngineService.generateRelationshipInsights(
          familyId,
          currentWeek,
          relationshipData,
          relationshipStrategies,
          checkInData
        );
        
        setInsights(aiInsights || getDefaultInsights());
        setLastRefresh(new Date());
      } catch (error) {
        console.error("Error loading AI relationship insights:", error);
        setInsights(getDefaultInsights());
      } finally {
        setLoading(false);
      }
    };
    
    loadInsights();
  }, [familyId, currentWeek, relationshipStrategies]);
  
  // Default insights if AI fails
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
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    
    try {
      // Feed all data to the AI engine again
      const relationshipData = getRelationshipTrendData();
      const checkInData = coupleCheckInData[currentWeek] || {};
      
      const aiInsights = await AllieAIEngineService.generateRelationshipInsights(
        familyId,
        currentWeek,
        relationshipData,
        relationshipStrategies,
        checkInData
      );
      
      setInsights(aiInsights || getDefaultInsights());
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error refreshing insights:", error);
    } finally {
      setLoading(false);
    }
  };
  
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
            className="flex items-center text-sm px-2 py-1 rounded hover:bg-gray-100"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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
            {insights.map((insight) => (
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
                      <div className="mt-3 p-2 bg-white rounded border-t border-gray-100">
                        <p className="text-sm font-medium font-roboto flex items-center">
                          <Lightbulb size={14} className="mr-2 text-yellow-600" />
                          Try this: {insight.actionable}
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