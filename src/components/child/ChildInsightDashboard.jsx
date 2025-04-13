// src/components/child/ChildInsightDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  User, Calendar, Activity, Book, Heart, TrendingUp, 
  Settings, PlusCircle, Info, Star, AlertCircle
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import ChildAnalyticsService from '../../services/ChildAnalyticsService';

const ChildInsightDashboard = ({ childId }) => {
  const { familyId } = useFamily();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartExplanation, setChartExplanation] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Color palette for visualizations
  const colors = {
    primary: '#6366F1',
    secondary: '#EC4899',
    success: '#22C55E',
    info: '#0EA5E9',
    warning: '#F59E0B',
    danger: '#EF4444',
    light: '#F3F4F6',
    dark: '#1F2937',
    // Additional colors for charts
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#F97316',
    teal: '#14B8A6',
    lime: '#84CC16',
    cyan: '#06B6D4',
    indigo: '#6366F1',
    rose: '#F43F5E',
    emerald: '#10B981'
  };
  
  // Mood colors for emotion charts
  const moodColors = {
    happy: colors.success,
    sad: colors.info,
    angry: colors.danger,
    excited: colors.orange,
    calm: colors.teal,
    afraid: colors.warning,
    anxious: colors.rose,
    bored: colors.light,
    confused: colors.purple,
    tired: colors.cyan,
    proud: colors.lime,
    silly: colors.pink,
    loved: colors.emerald,
    lonely: colors.indigo
  };
  
  // Load child analytics data
  useEffect(() => {
    if (familyId && childId) {
      fetchAnalytics();
    }
  }, [familyId, childId]);
  
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const analyticsData = await ChildAnalyticsService.getChildAnalytics(familyId, childId);
      setAnalytics(analyticsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading child analytics:", error);
      setLoading(false);
    }
  };
  
  // Handle natural language query submission
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    
    setIsQuerying(true);
    try {
      const result = await ChildAnalyticsService.processNaturalLanguageQuery(
        queryInput,
        familyId,
        childId
      );
      
      setQueryResult(result);
      setQueryInput('');
      
      // Set chart explanation if available
      if (result.visualizationType && result.data) {
        const explanation = ChildAnalyticsService.generateChartExplanation(
          result.data,
          result.visualizationType,
          analytics.basicInfo
        );
        
        setChartExplanation(explanation);
      }
    } catch (error) {
      console.error("Error processing query:", error);
      setQueryResult({
        answer: "I'm sorry, I couldn't process your query. Please try again.",
        error: error.message
      });
    } finally {
      setIsQuerying(false);
    }
  };
  
  // Handle preset query clicks
  const handlePresetQuery = (query) => {
    setQueryInput(query);
    setTimeout(() => {
      handleQuerySubmit({ preventDefault: () => {} });
    }, 100);
  };
  
  // Render loading placeholder
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 max-w-5xl mx-auto font-roboto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }
  
  // Render error state if no data
  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6 max-w-5xl mx-auto font-roboto">
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Couldn't Load Insights</h3>
          <p className="text-gray-500 mb-4">There was a problem loading insights for this child.</p>
          <button 
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow max-w-6xl mx-auto font-roboto">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="mr-4">
              {analytics.basicInfo.profilePicture ? (
                <img 
                  src={analytics.basicInfo.profilePicture} 
                  alt={analytics.basicInfo.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={32} className="text-indigo-500" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{analytics.basicInfo.name}'s Insights</h1>
              <p className="text-gray-500">
                {ChildAnalyticsService.calculateChildAge(analytics.basicInfo)}-year-old {analytics.basicInfo.gender || 'child'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={fetchAnalytics}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center hover:bg-gray-50"
            >
              <Activity size={14} className="mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Natural Language Query Section */}
      <div className="bg-indigo-50 p-4 border-b">
        <form onSubmit={handleQuerySubmit} className="flex flex-col md:flex-row md:items-center">
          <div className="flex-1">
            <label htmlFor="query" className="font-medium text-indigo-700 mb-1 block">
              Ask a question about {analytics.basicInfo.name}
            </label>
            <div className="flex">
              <input
                id="query"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={`E.g., "What is ${analytics.basicInfo.name}'s growth trend?" or "When is the next medical appointment?"`}
                className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isQuerying}
              />
              <button
                type="submit"
                disabled={isQuerying || !queryInput.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isQuerying ? 'Processing...' : 'Ask'}
              </button>
            </div>
          </div>
        </form>
        
        {/* Suggested Queries */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-indigo-700">Try asking:</span>
          <button
            onClick={() => handlePresetQuery(`What is ${analytics.basicInfo.name}'s growth trend?`)}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Growth trend
          </button>
          <button
            onClick={() => handlePresetQuery(`How is ${analytics.basicInfo.name} feeling recently?`)}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Recent emotions
          </button>
          <button
            onClick={() => handlePresetQuery(`What academic subjects does ${analytics.basicInfo.name} have?`)}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Academic subjects
          </button>
          <button
            onClick={() => handlePresetQuery(`What recommendations do you have for ${analytics.basicInfo.name}?`)}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Recommendations
          </button>
        </div>
      </div>
      
      {/* Query Result */}
      {queryResult && (
        <div className="p-6 border-b">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-full mr-3">
                <Info size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="mb-4">{queryResult.answer}</p>
                
                {/* Visualization based on query result */}
                {queryResult.visualizationType && queryResult.data && (
                  <div className="mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {renderVisualization(queryResult.data, queryResult.visualizationType)}
                    </div>
                    
                    {/* Chart explanation */}
                    {chartExplanation && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        {chartExplanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b px-6">
        <div className="flex overflow-x-auto">
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'growth' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('growth')}
          >
            Growth
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'medical' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('medical')}
          >
            Medical
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'emotional' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('emotional')}
          >
            Emotional
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'academic' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('academic')}
          >
            Academic
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'activities' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Dashboard Overview</h2>
            
            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {analytics.insights.length > 0 ? (
                analytics.insights.map((insight, index) => (
                  <div key={index} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="p-2 bg-indigo-100 rounded-full mr-3">
                        <Star size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-indigo-800 mb-1">{insight.title}</h3>
                        <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                        <p className="text-xs font-medium text-indigo-600">{insight.actionItem}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-white border rounded-lg p-4 text-center py-8">
                  <Info size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Not enough data to generate insights yet. Add more tracking data for personalized insights.</p>
                </div>
              )}
            </div>
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Growth Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Growth Tracking</h3>
                  <div className="p-1 bg-green-100 rounded-full">
                    <TrendingUp size={16} className="text-green-600" />
                  </div>
                </div>
                
                {analytics.growthAnalytics.latestMeasurements ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Height</span>
                      <span className="font-medium">{analytics.growthAnalytics.latestMeasurements.height} cm</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Weight</span>
                      <span className="font-medium">{analytics.growthAnalytics.latestMeasurements.weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Last Updated</span>
                      <span className="text-sm">{new Date(analytics.growthAnalytics.latestMeasurements.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm mb-2">No growth data yet</p>
                    <button 
                      onClick={() => setActiveTab('growth')}
                      className="text-xs text-indigo-600 flex items-center mx-auto"
                    >
                      <PlusCircle size={12} className="mr-1" />
                      Add measurements
                    </button>
                  </div>
                )}
              </div>
              
              {/* Medical Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Medical</h3>
                  <div className="p-1 bg-red-100 rounded-full">
                    <Heart size={16} className="text-red-600" />
                  </div>
                </div>
                
                {analytics.medicalAnalytics.lastCheckup || 
                 (analytics.medicalAnalytics.upcomingAppointments && 
                  analytics.medicalAnalytics.upcomingAppointments.length > 0) ? (
                  <div>
                    {analytics.medicalAnalytics.lastCheckup && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500 text-sm">Last Checkup</span>
                        <span className="font-medium">{new Date(analytics.medicalAnalytics.lastCheckup.date || analytics.medicalAnalytics.lastCheckup.dateTime).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Checkup Status</span>
                      <span className={`text-sm font-medium ${
                        analytics.medicalAnalytics.checkupStatus === 'up-to-date' ? 'text-green-600' :
                        analytics.medicalAnalytics.checkupStatus === 'overdue' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {analytics.medicalAnalytics.checkupStatus === 'up-to-date' ? 'Up to date' :
                         analytics.medicalAnalytics.checkupStatus === 'overdue' ? 'Overdue' :
                         'Unknown'}
                      </span>
                    </div>
                    
                    {analytics.medicalAnalytics.upcomingAppointments && 
                     analytics.medicalAnalytics.upcomingAppointments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Next Appointment</span>
                        <span className="text-sm">{new Date(analytics.medicalAnalytics.upcomingAppointments[0].date || analytics.medicalAnalytics.upcomingAppointments[0].dateTime).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm mb-2">No medical data yet</p>
                    <button 
                      onClick={() => setActiveTab('medical')}
                      className="text-xs text-indigo-600 flex items-center mx-auto"
                    >
                      <PlusCircle size={12} className="mr-1" />
                      Add medical info
                    </button>
                  </div>
                )}
              </div>
              
              {/* Emotional Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Emotional</h3>
                  <div className="p-1 bg-orange-100 rounded-full">
                    <Heart size={16} className="text-orange-600" />
                  </div>
                </div>
                
                {analytics.emotionalAnalytics.recentMood ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Recent Mood</span>
                      <span className="font-medium">{analytics.emotionalAnalytics.recentMood.emotion || analytics.emotionalAnalytics.recentMood.mood}</span>
                    </div>
                    
                    {analytics.emotionalAnalytics.predominantEmotions && 
                     analytics.emotionalAnalytics.predominantEmotions.length > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500 text-sm">Most Common</span>
                        <span className="text-sm">{analytics.emotionalAnalytics.predominantEmotions[0].emotion} ({analytics.emotionalAnalytics.predominantEmotions[0].percentage}%)</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Check-ins</span>
                      <span className="text-sm">{analytics.emotionalAnalytics.moodTrends?.totalCheckIns || 0} total</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm mb-2">No emotional data yet</p>
                    <button 
                      onClick={() => setActiveTab('emotional')}
                      className="text-xs text-indigo-600 flex items-center mx-auto"
                    >
                      <PlusCircle size={12} className="mr-1" />
                      Add check-ins
                    </button>
                  </div>
                )}
              </div>
              
              {/* Academic Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Academic</h3>
                  <div className="p-1 bg-blue-100 rounded-full">
                    <Book size={16} className="text-blue-600" />
                  </div>
                </div>
                
                {(analytics.academicAnalytics.currentAssignments?.length > 0 || 
                  analytics.academicAnalytics.completedAssignments?.length > 0) ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Pending</span>
                      <span className="font-medium">{analytics.academicAnalytics.currentAssignments?.length || 0} assignments</span>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Completed</span>
                      <span className="text-sm">{analytics.academicAnalytics.completedAssignments?.length || 0} assignments</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm">Subjects</span>
                      <span className="text-sm">{analytics.academicAnalytics.subjects?.length || 0} total</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm mb-2">No academic data yet</p>
                    <button 
                      onClick={() => setActiveTab('academic')}
                      className="text-xs text-indigo-600 flex items-center mx-auto"
                    >
                      <PlusCircle size={12} className="mr-1" />
                      Add assignments
                    </button>
                  </div>
                )}
              </div>
              
              {/* Activities Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Activities</h3>
                  <div className="p-1 bg-purple-100 rounded-full">
                    <Activity size={16} className="text-purple-600" />
                  </div>
                </div>
                
                {analytics.activityAnalytics.upcomingActivities?.length > 0 ? (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Upcoming</span>
                      <span className="font-medium">{analytics.activityAnalytics.upcomingActivities?.length || 0} activities</span>
                    </div>
                    
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-sm">Categories</span>
                      <span className="text-sm">{analytics.activityAnalytics.activityCategories?.length || 0} total</span>
                    </div>
                    
                    {analytics.activityAnalytics.upcomingActivities?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Next Activity</span>
                        <span className="text-sm">{new Date(analytics.activityAnalytics.upcomingActivities[0].date || analytics.activityAnalytics.upcomingActivities[0].dateTime).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm mb-2">No activity data yet</p>
                    <button 
                      onClick={() => setActiveTab('activities')}
                      className="text-xs text-indigo-600 flex items-center mx-auto"
                    >
                      <PlusCircle size={12} className="mr-1" />
                      Add activities
                    </button>
                  </div>
                )}
              </div>
              
              {/* Recommendations Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">Recommendations</h3>
                  <div className="p-1 bg-yellow-100 rounded-full">
                    <Settings size={16} className="text-yellow-600" />
                  </div>
                </div>
                
                {/* Combine all recommendations */}
                {(() => {
                  const allRecommendations = [
                    ...(analytics.medicalAnalytics.recommendations || []),
                    ...(analytics.growthAnalytics.recommendations || []),
                    ...(analytics.emotionalAnalytics.recommendations || []),
                    ...(analytics.academicAnalytics.recommendations || []),
                    ...(analytics.activityAnalytics.recommendations || [])
                  ].sort((a, b) => {
                    const priorityMap = { high: 3, medium: 2, low: 1 };
                    return priorityMap[b.priority] - priorityMap[a.priority];
                  });
                  
                  return allRecommendations.length > 0 ? (
                    <div className="space-y-2">
                      {allRecommendations.slice(0, 3).map((rec, index) => (
                        <div key={index} className={`text-xs p-2 rounded ${
                          rec.priority === 'high' ? 'bg-red-50 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {rec.message}
                        </div>
                      ))}
                      
                      {allRecommendations.length > 3 && (
                        <div className="text-xs text-center text-indigo-600">
                          +{allRecommendations.length - 3} more recommendations
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-400 text-sm">No recommendations yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add more tracking data for personalized recommendations</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'growth' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Growth & Development</h2>
            
            {analytics.growthAnalytics.latestMeasurements ? (
              <div className="space-y-6">
                {/* Current Measurements */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Current Measurements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-blue-700 font-medium mb-1">Height</div>
                      <div className="text-2xl font-semibold">{analytics.growthAnalytics.latestMeasurements.height} cm</div>
                      {analytics.growthAnalytics.growthPercentiles?.height && (
                        <div className="text-sm text-blue-500 mt-1">
                          {analytics.growthAnalytics.growthPercentiles.height}th percentile
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-green-700 font-medium mb-1">Weight</div>
                      <div className="text-2xl font-semibold">{analytics.growthAnalytics.latestMeasurements.weight} kg</div>
                      {analytics.growthAnalytics.growthPercentiles?.weight && (
                        <div className="text-sm text-green-500 mt-1">
                          {analytics.growthAnalytics.growthPercentiles.weight}th percentile
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-700 font-medium mb-1">Last Measured</div>
                      <div className="text-lg font-medium">
                        {new Date(analytics.growthAnalytics.latestMeasurements.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Math.floor((new Date() - new Date(analytics.growthAnalytics.latestMeasurements.date)) / (1000 * 60 * 60 * 24))} days ago
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Growth Trends */}
                {analytics.growthAnalytics.growthHistory?.length > 1 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Growth Trends</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.growthAnalytics.growthHistory.sort((a, b) => new Date(a.date) - new Date(b.date))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                          />
                          <YAxis yAxisId="left" orientation="left" stroke={colors.primary} />
                          <YAxis yAxisId="right" orientation="right" stroke={colors.secondary} />
                          <Tooltip 
                            formatter={(value, name) => [
                              `${value} ${name === 'height' ? 'cm' : 'kg'}`,
                              name === 'height' ? 'Height' : 'Weight'
                            ]}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="height" 
                            name="Height" 
                            stroke={colors.primary} 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="weight" 
                            name="Weight" 
                            stroke={colors.secondary} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Growth Analysis */}
                    {analytics.growthAnalytics.growthTrends && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm">
                        <p>
                          Over the past {analytics.growthAnalytics.growthTrends.period.toFixed(1)} months, 
                          {analytics.basicInfo.name} has grown {analytics.growthAnalytics.growthTrends.heightChangeTotal.toFixed(1)} cm 
                          in height ({analytics.growthAnalytics.growthTrends.heightChangePerMonth.toFixed(1)} cm/month) 
                          and changed by {analytics.growthAnalytics.growthTrends.weightChangeTotal.toFixed(1)} kg 
                          in weight ({analytics.growthAnalytics.growthTrends.weightChangePerMonth.toFixed(1)} kg/month).
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Recommendations */}
                {analytics.growthAnalytics.recommendations.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Recommendations</h3>
                    <div className="space-y-2">
                      {analytics.growthAnalytics.recommendations.map((rec, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-lg ${
                            rec.priority === 'high' ? 'bg-red-50' :
                            rec.priority === 'medium' ? 'bg-yellow-50' :
                            'bg-green-50'
                          }`}
                        >
                          <div className="flex">
                            <AlertCircle 
                              size={18} 
                              className={`mr-2 flex-shrink-0 ${
                                rec.priority === 'high' ? 'text-red-500' :
                                rec.priority === 'medium' ? 'text-yellow-500' :
                                'text-green-500'
                              }`} 
                            />
                            <p className="text-sm">{rec.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-4 text-center py-8">
                <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">No Growth Data Yet</h3>
                <p className="text-gray-500 mb-4">
                  Start tracking {analytics.basicInfo.name}'s growth to see trends and insights.
                </p>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                  Add First Measurement
                </button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'medical' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Medical Information</h2>
            
            {(analytics.medicalAnalytics.pastAppointments?.length > 0 || 
              analytics.medicalAnalytics.upcomingAppointments?.length > 0) ? (
              <div className="space-y-6">
                {/* Medical Summary */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Medical Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-blue-700 font-medium mb-1">Checkup Status</div>
                      <div className={`text-lg font-medium ${
                        analytics.medicalAnalytics.checkupStatus === 'up-to-date' ? 'text-green-600' :
                        analytics.medicalAnalytics.checkupStatus === 'overdue' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {analytics.medicalAnalytics.checkupStatus === 'up-to-date' ? 'Up to date' :
                         analytics.medicalAnalytics.checkupStatus === 'overdue' ? 'Overdue' :
                         'Unknown'}
                      </div>
                      {analytics.medicalAnalytics.lastCheckup && (
                        <div className="text-sm text-blue-500 mt-1">
                          Last checkup: {new Date(analytics.medicalAnalytics.lastCheckup.date || analytics.medicalAnalytics.lastCheckup.dateTime).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-purple-700 font-medium mb-1">Appointments</div>
                      <div className="text-lg font-medium">
                        {analytics.medicalAnalytics.pastAppointments.length} past
                      </div>
                      <div className="text-sm text-purple-500 mt-1">
                        {analytics.medicalAnalytics.upcomingAppointments.length} upcoming
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-green-700 font-medium mb-1">Recommended Schedule</div>
                      <div className="text-sm font-medium">
                        {analytics.medicalAnalytics.recommendedSchedule || 'Based on age'}
                      </div>
                      {analytics.medicalAnalytics.recommendedVaccines && (
                        <div className="text