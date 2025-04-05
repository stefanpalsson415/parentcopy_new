import React, { useState, useEffect } from 'react';
import { Filter, Info, ChevronDown, ChevronUp, PieChart, Brain, Calendar, Heart, Scale, Clock, Users } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import AllieAIService from '../../../services/AllieAIService';

import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, 
  PieChart as RechartPieChart, Pie, Cell, Area, ComposedChart
} from 'recharts';

const DashboardTab = () => {
  const { 
    familyId,
    completedWeeks, 
    currentWeek, 
    familyMembers,
    surveyResponses,
    getWeekHistoryData,
    impactInsights,
    taskEffectivenessData,
    familyPriorities,
    weightedScores: globalWeightedScores,
    setWeightedScores: setGlobalWeightedScores
  } = useFamily();
  
  const { fullQuestionSet } = useSurvey();
  
  // State for filters and expanded sections
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'initial', 'current', 'week1', 'week2', etc.
  const [expandedSections, setExpandedSections] = useState({
    balance: true,
    history: true,
    categories: true,
    weightInsights: true,
    aiInsights: true
  });
  
  // Loading states
  const [loading, setLoading] = useState({
    balance: true,
    history: true,
    categories: true,
    weightInsights: true,
    aiInsights: true
  });
  
  // Local state for calculated metrics
  const [weightedScores, setWeightedScores] = useState(null);
  const [weightedInsights, setWeightedInsights] = useState([]);
  const [weightByFactorData, setWeightByFactorData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Calculate time filter options based on completed weeks
  const getTimeFilterOptions = () => {
    const options = [];
    
    // Add All Time option
    options.push({ id: 'all', label: 'All Time' });
    
    // Add Initial Survey option
    options.push({ id: 'initial', label: 'Initial Survey' });
    
    // Add only completed weeks (sorted)
    [...completedWeeks]
      .sort((a, b) => a - b)
      .forEach(week => {
        options.push({ id: `week${week}`, label: `Week ${week}` });
      });
    
    // Add current week if not in completed weeks
    if (!completedWeeks.includes(currentWeek)) {
      options.push({ id: `week${currentWeek}`, label: `Week ${currentWeek}` });
    }
    
    return options;
  };
  
  // Load and calculate dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Set loading states
        setLoading({
          balance: true,
          history: true,
          categories: true,
          weightInsights: true,
          aiInsights: true
        });
        
        // Get filtered responses based on time period
        const filteredResponses = getFilteredResponses();
        
        // Calculate weight-based metrics if we have questions and responses
        if (fullQuestionSet && fullQuestionSet.length > 0 && filteredResponses && Object.keys(filteredResponses).length > 0) {
          // Calculate weighted scores using the TaskWeightCalculator
          const scores = calculateBalanceScores(fullQuestionSet, filteredResponses, familyPriorities);
          setWeightedScores(scores);
          
          // Update global state with weighted scores for other components
          if (scores && typeof setGlobalWeightedScores === 'function') {
            setGlobalWeightedScores(scores);
          }
          
          // Generate weight-based insights
          const insights = generateWeightBasedInsights(scores);
          setWeightedInsights(insights);
          
          // Create data for factor-based charts
          const factorData = generateWeightByFactorData(filteredResponses);
          setWeightByFactorData(factorData);
        } else {
          console.log("Not enough data to calculate weighted metrics", {
            hasQuestionSet: !!fullQuestionSet,
            questionCount: fullQuestionSet?.length || 0,
            responseCount: Object.keys(filteredResponses || {}).length
          });
        }
        
        // Calculate balance history data
        const historyData = calculateBalanceHistory();
        setBalanceHistory(historyData);
        
        // Load AI insights
        try {
          console.log("Loading AI insights...");
          const insights = await AllieAIService.generateDashboardInsights(
            familyId, 
            currentWeek
          );
          
          // Ensure insights is always an array
          if (insights && insights.insights && Array.isArray(insights.insights)) {
            setAiInsights(insights.insights);
          } else if (Array.isArray(insights)) {
            setAiInsights(insights);
          } else {
            console.warn("AI insights returned invalid format:", insights);
            setAiInsights([]);
          }
        } catch (insightError) {
          console.error("Error loading AI insights:", insightError);
          setAiInsights([]);
        }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        // Finish loading
        setLoading({
          balance: false,
          history: false,
          categories: false,
          weightInsights: false,
          aiInsights: false
        });
      }
    };
    
    loadData();
  }, [timeFilter, radarFilter, fullQuestionSet, surveyResponses, familyPriorities, familyId, currentWeek, setGlobalWeightedScores]);
  
  
  // Get filtered responses based on selected time period
  const getFilteredResponses = () => {
    if (!surveyResponses) return {};
    
    const filteredResponses = {};
    
    if (timeFilter === 'initial') {
      // Only include responses from initial survey
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (!key.includes('week-') && !key.includes('weekly-') && key.includes('q')) {
          filteredResponses[key] = value;
        }
      });
    } else if (timeFilter.startsWith('week')) {
      // Extract week number
      const weekNum = parseInt(timeFilter.replace('week', ''));
      
      // Include responses for this specific week - with expanded formats
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.includes(`week-${weekNum}`) || 
            key.includes(`weekly-${weekNum}`) || 
            key.includes(`week${weekNum}-`) || 
            (weekNum === 1 && (key.includes('weekly') || key.includes('week1')))) {
          filteredResponses[key] = value;
        }
      });
      
      // If we're still not finding any responses for week 1, add a debug log
      if (weekNum === 1 && Object.keys(filteredResponses).length === 0) {
        console.log("No Week 1 responses found with standard filtering. Available keys:", Object.keys(surveyResponses));
      }
    } else {
      // 'all' - include all responses
      return surveyResponses;
    }
    
    return filteredResponses;
  };
  
  // Generate weight-based insights
  const generateWeightBasedInsights = (scores) => {
    if (!scores) return [];
    
    const insights = [];
    
    // Find the most imbalanced categories
    const imbalancedCategories = Object.entries(scores.categoryBalance)
      .sort((a, b) => b[1].imbalance - a[1].imbalance);
    
    if (imbalancedCategories.length > 0) {
      const mostImbalanced = imbalancedCategories[0];
      const category = mostImbalanced[0];
      const imbalanceData = mostImbalanced[1];
      
      // High impact insight for the most imbalanced category
      insights.push({
        title: `Highest Weighted Imbalance: ${category}`,
        description: `${category} shows a ${Math.round(imbalanceData.imbalance)}% imbalance when accounting for task complexity, frequency, and emotional labor.`,
        type: 'weight-critical',
        icon: <Scale size={20} className="text-amber-600" />
      });
      
      // Insight for invisible work if it's highly imbalanced
      if (category.includes('Invisible') && imbalanceData.imbalance > 30) {
        insights.push({
          title: 'Invisible Work Imbalance',
          description: `Our analysis shows that invisible work (mental load, planning, coordination) is significantly imbalanced in your family.`,
          type: 'weight-invisible',
          icon: <Brain size={20} className="text-purple-600" />
        });
      }
    }
    
    // Add insight about emotional labor impact if relevant
    const emotionalCategory = imbalancedCategories.find(([cat]) => cat.includes('Parental'));
    if (emotionalCategory && emotionalCategory[1].imbalance > 25) {
      insights.push({
        title: 'Emotional Labor Impact',
        description: 'Tasks with high emotional labor requirements (handling children\'s emotions, resolving conflicts) show significant imbalance. These create substantial mental load.',
        type: 'weight-emotional',
        icon: <Heart size={20} className="text-red-600" />
      });
    }
    
    return insights;
  };
  
  // Generate data for weight by factor charts based on actual survey data
  const generateWeightByFactorData = (responses) => {
    if (!fullQuestionSet || !responses || Object.keys(responses).length === 0) return [];
    
    // Initialize factor counters
    const factorCounts = {
      'Emotional Labor': { mama: 0, papa: 0, total: 0 },
      'Invisible Tasks': { mama: 0, papa: 0, total: 0 },
      'Child Development': { mama: 0, papa: 0, total: 0 },
      'Time Investment': { mama: 0, papa: 0, total: 0 }
    };
    
    // Count responses by factor
    Object.entries(responses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question ID and find the question
      let questionId = key;
      if (key.includes('-')) {
        const parts = key.split('-');
        questionId = parts.find(part => part.startsWith('q')) || key;
      }
      
      const question = fullQuestionSet.find(q => q.id === questionId);
      if (!question) return;
      
      // Count by emotional labor level
      if (question.emotionalLabor === 'high' || question.emotionalLabor === 'extreme') {
        factorCounts['Emotional Labor'].total++;
        if (value === 'Mama') factorCounts['Emotional Labor'].mama++;
        else if (value === 'Papa') factorCounts['Emotional Labor'].papa++;
      }
      
      // Count by invisibility
      if (question.invisibility === 'mostly' || question.invisibility === 'completely') {
        factorCounts['Invisible Tasks'].total++;
        if (value === 'Mama') factorCounts['Invisible Tasks'].mama++;
        else if (value === 'Papa') factorCounts['Invisible Tasks'].papa++;
      }
      
      // Count by child development impact
      if (question.childDevelopment === 'high') {
        factorCounts['Child Development'].total++;
        if (value === 'Mama') factorCounts['Child Development'].mama++;
        else if (value === 'Papa') factorCounts['Child Development'].papa++;
      }
      
      // Count by time investment (base weight)
      if (question.baseWeight >= 4) {
        factorCounts['Time Investment'].total++;
        if (value === 'Mama') factorCounts['Time Investment'].mama++;
        else if (value === 'Papa') factorCounts['Time Investment'].papa++;
      }
    });
    
    // Convert to percentages for charting
    return Object.entries(factorCounts).map(([factor, counts]) => {
      if (counts.total === 0) {
        return null; // Skip factors with no data
      }
      
      const mamaPercent = Math.round((counts.mama / counts.total) * 100);
      const papaPercent = Math.round((counts.papa / counts.total) * 100);
      
      return {
        name: factor,
        mama: mamaPercent,
        papa: papaPercent,
        imbalance: Math.abs(mamaPercent - papaPercent)
      };
    }).filter(Boolean); // Remove null entries
  };
  
  // Calculate radar data based on survey responses and question categories
  const getRadarData = () => {
    // Use the weighted scores if available
    if (weightedScores && weightedScores.categoryBalance) {
      return Object.entries(weightedScores.categoryBalance).map(([category, data]) => ({
        category,
        mama: Math.round(data.mama),
        papa: Math.round(data.papa)
      }));
    }
    
    // Define the categories
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Filter survey responses based on the selected time period
    const filteredResponses = getFilteredResponses();
    
    // Count responses by category
    Object.entries(filteredResponses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question ID from key (assuming format like "q1" or "week-1-q1")
      let questionId = key;
      if (key.includes('-')) {
        const parts = key.split('-');
        // Look for the part that starts with "q"
        questionId = parts.find(part => part.startsWith('q')) || key;
      }
      
      // Find the question in the question set
      const question = fullQuestionSet.find(q => q.id === questionId);
      
      if (!question) return;
      
      // Update counts
      const category = question.category;
      if (categories[category]) {
        categories[category].total++;
        if (value === 'Mama') {
          categories[category].mama++;
        } else if (value === 'Papa') {
          categories[category].papa++;
        }
      }
    });
    
    // Convert counts to percentages for radar chart
    return Object.entries(categories).map(([category, counts]) => {
      const total = counts.total;
      if (total === 0) {
        return { category, mama: 0, papa: 0 };
      }
      
      return {
        category,
        mama: Math.round((counts.mama / total) * 100),
        papa: Math.round((counts.papa / total) * 100)
      };
    });
  };
  
  // Get current balance using weighted scores if available
  const getCurrentBalance = () => {
    if (weightedScores && weightedScores.overallBalance) {
      return {
        mama: Math.round(weightedScores.overallBalance.mama),
        papa: Math.round(weightedScores.overallBalance.papa)
      };
    }
    
    // If no weighted scores, calculate directly from responses
    const filteredResponses = getFilteredResponses();
    
    // Count Mama and Papa responses
    let mamaCount = 0;
    let papaCount = 0;
    
    Object.values(filteredResponses).forEach(value => {
      if (value === 'Mama') {
        mamaCount++;
      } else if (value === 'Papa') {
        papaCount++;
      }
    });
    
    const total = mamaCount + papaCount;
    
    if (total === 0) {
      return { mama: 0, papa: 0 };
    }
    
    // Calculate percentages
    return {
      mama: Math.round((mamaCount / total) * 100),
      papa: Math.round((papaCount / total) * 100)
    };
  };
  
  // Calculate balance history data from actual survey responses
  const calculateBalanceHistory = () => {
    const history = [];
    
    // Add initial survey data point
    let initialMama = 0;
    let initialPapa = 0;
    let initialTotal = 0;
    
    // Count responses from initial survey
    Object.entries(surveyResponses).forEach(([key, value]) => {
      // Include responses without week prefix (likely from initial survey)
      if (!key.includes('week-') && !key.includes('weekly-') && key.includes('q')) {
        if (value === 'Mama') initialMama++;
        else if (value === 'Papa') initialPapa++;
        initialTotal++;
      }
    });
    
    // Add initial survey data point if we have data
    if (initialTotal > 0) {
      history.push({
        week: 'Initial',
        mama: Math.round((initialMama / initialTotal) * 100),
        papa: Math.round((initialPapa / initialTotal) * 100)
      });
    }
    
    // Add data points for each completed week
    completedWeeks.forEach(weekNum => {
      // Try to get data from week history first
      const weekData = getWeekHistoryData(weekNum);
      
      if (weekData && weekData.balance) {
        // Use saved balance data if available
        history.push({
          week: `Week ${weekNum}`,
          mama: Math.round(weekData.balance.mama),
          papa: Math.round(weekData.balance.papa)
        });
        return;
      }
      
      // If no saved data, calculate from survey responses
      let weekMama = 0;
      let weekPapa = 0;
      let weekTotal = 0;
      
      // Count responses for this week
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.includes(`week-${weekNum}`) || 
            key.includes(`weekly-${weekNum}`) ||
            key.includes(`week${weekNum}-`)) {
          if (value === 'Mama') weekMama++;
          else if (value === 'Papa') weekPapa++;
          weekTotal++;
        }
      });
      
      // Add week data point if we have data
      if (weekTotal > 0) {
        history.push({
          week: `Week ${weekNum}`,
          mama: Math.round((weekMama / weekTotal) * 100),
          papa: Math.round((weekPapa / weekTotal) * 100)
        });
      }
    });
    
    // Add current week if it's not in completed weeks and we have data
    if (!completedWeeks.includes(currentWeek)) {
      let currentWeekMama = 0;
      let currentWeekPapa = 0;
      let currentWeekTotal = 0;
      
      // Count responses for current week
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.includes(`week-${currentWeek}`) || 
            key.includes(`weekly-${currentWeek}`) ||
            key.includes(`week${currentWeek}-`)) {
          if (value === 'Mama') currentWeekMama++;
          else if (value === 'Papa') currentWeekPapa++;
          currentWeekTotal++;
        }
      });
      
      // Add current week data point if we have data
      if (currentWeekTotal > 0) {
        history.push({
          week: `Week ${currentWeek}`,
          mama: Math.round((currentWeekMama / currentWeekTotal) * 100),
          papa: Math.round((currentWeekPapa / currentWeekTotal) * 100)
        });
      }
    }
    
    return history;
  };
  
  // Filter data based on selected time period
  const filterDataByTime = (data) => {
    if (!data || data.length === 0) return [];
    
    if (timeFilter === 'all') return data;
    
    if (timeFilter === 'initial') {
      // For Initial survey view, we want to show just the initial survey point
      return data.filter(item => item.week === 'Initial');
    }
    
    // Handle specific week filters (like 'week1', 'week2')
    if (timeFilter.startsWith('week')) {
      const weekNum = parseInt(timeFilter.replace('week', ''));
      
      // For Week N view, we want to show data from Initial through Week N
      return data.filter(item => {
        if (item.week === 'Initial') return true;
        
        if (item.week.startsWith('Week ')) {
          const itemWeekNum = parseInt(item.week.replace('Week ', ''));
          return itemWeekNum <= weekNum;
        }
        
        return false;
      });
    }
    
    return data;
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // COLORS
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  // Get current balance
  const currentBalance = getCurrentBalance();
  
  // Filter balance history data by time period
  const filteredBalanceHistory = filterDataByTime(balanceHistory);
  
  return (
    <div className="space-y-4">
      {/* Time Filter */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-end">
        <div className="flex items-center text-sm">
          <Filter size={14} className="mr-1" />
          <span className="mr-2">Time Period:</span>
          <select 
            className="border rounded py-1 px-2 bg-white"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            {getTimeFilterOptions().map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* AI Insights Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('aiInsights')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Brain size={20} className="text-purple-600 mr-2" />
            Allie's AI Insights
          </h3>
          {expandedSections.aiInsights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.aiInsights && (
          <div className="p-6 pt-0">
            {loading.aiInsights ? (
              <div className="h-24 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Generating AI insights...</p>
                </div>
              </div>
            ) : !aiInsights || !Array.isArray(aiInsights) || aiInsights.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  Not enough data to generate AI insights yet. Complete more surveys to unlock personalized AI analysis.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Personalized AI-generated insights based on your family's unique data
                </p>
                
                {aiInsights.map((insight, index) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-800">{insight.title}</h4>
                    <p className="text-sm mt-2 text-purple-700">{insight.description}</p>
                    
                    {insight.actionItem && (
                      <div className="flex items-start mt-3 bg-white p-3 rounded border border-purple-100">
                        <Calendar size={16} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                        <p className="text-sm">{insight.actionItem}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Balance card */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('balance')}
        >
          <h3 className="text-lg font-semibold">Current Family Balance</h3>
          {expandedSections.balance ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.balance && (
          <div className="p-6 pt-0">
            {loading.balance ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : !currentBalance || 
            (currentBalance.mama === 0 && currentBalance.papa === 0) ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center p-6 bg-gray-50 rounded-lg max-w-md">
                  <p className="text-gray-600">
                    Not enough data to display balance information yet. Complete the initial survey and weekly check-ins to see your family balance data.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {timeFilter === 'initial' 
                    ? 'Initial survey distribution of parental responsibilities'
                    : timeFilter.startsWith('week')
                      ? `Week ${timeFilter.replace('week', '')} distribution of parental responsibilities`
                      : 'Current distribution of parental responsibilities'}
                </p>
                  
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Mama ({currentBalance.mama}%)</span>
                    <span className="font-medium">Papa ({currentBalance.papa}%)</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${currentBalance.mama}%` }} />
                  </div>
                  
                  <div className="mt-2 text-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      Math.abs(currentBalance.mama - 50) > 20
                        ? 'bg-red-100 text-red-700'
                        : Math.abs(currentBalance.mama - 50) > 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {Math.abs(currentBalance.mama - 50) > 20
                        ? 'Significant Imbalance'
                        : Math.abs(currentBalance.mama - 50) > 10
                          ? 'Moderate Imbalance'
                          : 'Good Balance'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <span>
                    {currentBalance.mama > 60
                      ? "Mama is handling significantly more tasks than Papa. Focus on the recommendations for ways to improve balance."
                      : currentBalance.mama < 40
                        ? "Papa is handling significantly more tasks than Mama. Check the recommendations for ways to improve balance."
                        : "Your family has a good balance of responsibilities!"}
                  </span>
                </div>
                
                {/* Pie chart of current distribution */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartPieChart>
                      <Pie
                        data={[
                          { name: 'Mama', value: currentBalance.mama },
                          { name: 'Papa', value: currentBalance.papa }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell key="cell-0" fill={MAMA_COLOR} />
                        <Cell key="cell-1" fill={PAPA_COLOR} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartPieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Balance Scale Visualization */}
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Family Balance Scale</h4>
                  
                  <div className="h-36 relative">
                    {/* The Balance Scale */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-4 h-24 bg-gray-700 rounded"></div>
                    
                    {/* The Balance Beam - rotated based on current balance */}
                    <div 
                      className="absolute left-1/2 top-8 transform -translate-x-1/2 w-64 h-4 bg-gray-700 rounded transition-transform duration-700 ease-in-out"
                      style={{ 
                        transformOrigin: 'center',
                        transform: `translateX(-50%) rotate(${(currentBalance.mama - 50) * 0.8}deg)` 
                      }}
                    >
                      {/* Mama's Side */}
                      <div className="absolute left-0 -top-20 w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center transform -translate-x-1/2">
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-800">{currentBalance.mama}%</div>
                          <div className="text-xs text-purple-700">Mama</div>
                        </div>
                      </div>
                      
                      {/* Papa's Side */}
                      <div className="absolute right-0 -top-20 w-16 h-16 bg-green-200 rounded-full flex items-center justify-center transform translate-x-1/2">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-800">{currentBalance.papa}%</div>
                          <div className="text-xs text-green-700">Papa</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-center text-blue-700 mt-2">
                    {Math.abs(currentBalance.mama - 50) <= 5 
                      ? "Great job! Your family's workload is well balanced."
                      : currentBalance.mama > 50
                        ? "The scale is tipping toward Mama. Papa can help balance it by taking on more tasks."
                        : "The scale is tipping toward Papa. Mama can help balance it by taking on more tasks."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
        
      {/* Balance history chart */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('history')}
        >
          <h3 className="text-lg font-semibold">Task Balance History</h3>
          {expandedSections.history ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.history && (
          <div className="p-6 pt-0">
            {loading.history ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : !filteredBalanceHistory || filteredBalanceHistory.length < 2 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center p-6 bg-gray-50 rounded-lg max-w-md">
                  <p className="text-gray-600">
                    Not enough data to display history yet. Complete at least one weekly check-in to see your progress over time.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  See how your family's task balance has changed over time
                </p>
                  
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredBalanceHistory}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="mama" 
                        name="Mama's Tasks" 
                        stroke={MAMA_COLOR} 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="papa" 
                        name="Papa's Tasks" 
                        stroke={PAPA_COLOR} 
                      />
                      {/* Add a reference line for 50/50 balance */}
                      <Line
                        type="monotone"
                        dataKey={() => 50}
                        name="50/50 Balance"
                        stroke="#888"
                        strokeDasharray="3 3"
                        activeDot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                  
                <div className="mt-4 text-sm text-center text-gray-500">
                  {filteredBalanceHistory.length > 2 && 
                   filteredBalanceHistory[0].mama !== filteredBalanceHistory[filteredBalanceHistory.length - 1].mama ? (
                    <>
                      {filteredBalanceHistory[0].mama > filteredBalanceHistory[filteredBalanceHistory.length - 1].mama ? (
                        <>
                          Your balance is improving! Papa's task share has increased by 
                          {' '}{filteredBalanceHistory[filteredBalanceHistory.length - 1].papa - filteredBalanceHistory[0].papa}% 
                          since the initial survey.
                        </>
                      ) : (
                        <>
                          Your balance has changed since the initial survey, with Mama's task share increasing by 
                          {' '}{filteredBalanceHistory[filteredBalanceHistory.length - 1].mama - filteredBalanceHistory[0].mama}%.
                        </>
                      )}
                    </>
                  ) : (
                    "Complete more weekly check-ins to see your progress over time."
                  )}
                </div>
                
                {/* Task Impact Insights Section */}
                {impactInsights && impactInsights.length > 0 && (
                  <div className="mt-6 p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-medium text-purple-800">Impact Insights</h4>
                    <p className="text-sm mt-1 text-purple-600 mb-3">
                      Here's how your completed tasks have impacted your family's balance:
                    </p>
                    
                    <div className="space-y-2">
                      {impactInsights.map((insight, index) => (
                        <div key={index} className={`p-2 text-sm rounded ${
                          insight.type === 'success' ? 'bg-green-100 text-green-700' :
                          insight.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {insight.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Weight-Based Insights Section - Redesigned */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('weightInsights')}
        >
          <h3 className="text-lg font-semibold">Advanced Balance Analysis</h3>
          {expandedSections.weightInsights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.weightInsights && (
          <div className="p-6 pt-0">
            {loading.weightInsights ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Analyzing weight data...</p>
                </div>
              </div>
            ) : !weightByFactorData || weightByFactorData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center p-6 bg-gray-50 rounded-lg max-w-md">
                  <p className="text-gray-600">
                    Not enough data to display advanced analysis yet. Complete more surveys to see this detailed breakdown.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Our advanced analysis examines your family's balance across multiple dimensions that impact workload
                </p>
                
                <div className="bg-white rounded-lg p-4 mb-6 border shadow-sm">
                  <h4 className="font-medium text-lg mb-3 font-roboto">Important Balance Factors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                        <Brain size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm font-roboto">Invisible Mental Load</h5>
                        <p className="text-xs text-gray-600 font-roboto">Planning, remembering, and coordinating tasks creates significant workload</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                        <Heart size={16} className="text-red-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm font-roboto">Emotional Labor</h5>
                        <p className="text-xs text-gray-600 font-roboto">Supporting family emotions requires energy and mental bandwidth</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <Clock size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm font-roboto">Time Investment</h5>
                        <p className="text-xs text-gray-600 font-roboto">Tasks that require significant time or frequent repetition</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                        <Users size={16} className="text-green-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm font-roboto">Child Development Impact</h5>
                        <p className="text-xs text-gray-600 font-roboto">Tasks that influence how children view gender roles and relationships</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Weight Factor Bar Chart */}
                <h4 className="font-medium mb-3">Distribution by Impact Factor</h4>
                <div className="h-64 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weightByFactorData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="mama" name="Mama's Share" fill={MAMA_COLOR} />
                      <Bar dataKey="papa" name="Papa's Share" fill={PAPA_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Weight insights */}
                <div className="space-y-4">
                  {weightedInsights.map((insight, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'weight-critical' ? 'border-amber-200 bg-amber-50' :
                        insight.type === 'weight-invisible' ? 'border-purple-200 bg-purple-50' :
                        insight.type === 'weight-emotional' ? 'border-red-200 bg-red-50' :
                        insight.type === 'weight-development' ? 'border-green-200 bg-green-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="mt-1 mr-3 flex-shrink-0">
                          {insight.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm mt-1">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Task effectiveness insights */}
                  {taskEffectivenessData && taskEffectivenessData.length > 0 && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium">Task Effectiveness Analysis</h4>
                      <p className="text-sm mt-1 text-gray-600 mb-3">
                        Our analysis shows which types of tasks have been most effective in improving your family's balance:
                      </p>
                      
                      <div className="space-y-2">
                        {taskEffectivenessData
                          .sort((a, b) => b.effectiveness - a.effectiveness)
                          .slice(0, 3)
                          .map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{item.taskType} tasks</span>
                              <div className="flex items-center">
                                <span className="text-xs mr-2">
                                  {Math.round(item.effectiveness * 100)}% effective
                                </span>
                                <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500" 
                                    style={{ width: `${item.effectiveness * 100}%` }} 
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
        
      {/* Task Category Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('categories')}
        >
          <h3 className="text-lg font-semibold">Task Category Distribution</h3>
          {expandedSections.categories ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.categories && (
          <div className="p-6 pt-0">
            {loading.categories ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : !getRadarData() || getRadarData().every(item => item.mama === 0 && item.papa === 0) ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center p-6 bg-gray-50 rounded-lg max-w-md">
                  <p className="text-gray-600">
                    Not enough data to display category distribution yet. Complete the initial survey to see the breakdown by task category.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    Distribution of responsibilities across four task categories
                  </p>
                  
                  <div className="flex items-center text-sm">
                    <span className="mr-2">View:</span>
                    <div className="flex border rounded overflow-hidden">
                      <button 
                        className={`px-2 py-1 ${radarFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                        onClick={() => setRadarFilter('all')}
                      >
                        All
                      </button>
                      <button 
                        className={`px-2 py-1 border-l ${radarFilter === 'parents' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                        onClick={() => setRadarFilter('parents')}
                      >
                        Parents
                      </button>
                      <button 
                        className={`px-2 py-1 border-l ${radarFilter === 'children' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                        onClick={() => setRadarFilter('children')}
                      >
                        Children
                      </button>
                    </div>
                  </div>
                </div>
                  
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius="80%" data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        
                      <Radar
                        name="Mama's Tasks"
                        dataKey="mama"
                        stroke={MAMA_COLOR}
                        fill={MAMA_COLOR}
                        fillOpacity={0.5}
                      />
                        
                      <Radar
                        name="Papa's Tasks"
                        dataKey="papa"
                        stroke={PAPA_COLOR}
                        fill={PAPA_COLOR}
                        fillOpacity={0.5}
                      />
                        
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                  
                <div className="mt-4 text-sm text-center text-gray-500">
                  The chart shows what percentage of tasks in each category are handled by Mama vs Papa.
                </div>

                {/* Add a bar chart version for easier visual comparison */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Category Breakdown</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getRadarData()}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="category" type="category" width={150} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="mama" name="Mama's Share" stackId="a" fill={MAMA_COLOR} />
                        <Bar dataKey="papa" name="Papa's Share" stackId="a" fill={PAPA_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Explanation */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-800 text-sm">Visible Household Tasks</h5>
                    <p className="text-xs mt-1 text-blue-600">
                      Tasks like cleaning, cooking, laundry, yard work, and home maintenance that are easily observable.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h5 className="font-medium text-purple-800 text-sm">Invisible Household Tasks</h5>
                    <p className="text-xs mt-1 text-purple-600">
                      Tasks like planning, scheduling, budgeting, and household management that often go unnoticed.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-800 text-sm">Visible Parental Tasks</h5>
                    <p className="text-xs mt-1 text-green-600">
                      Direct childcare activities like helping with homework, driving kids, bathing, and bedtime routines.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-red-50 rounded-lg">
                    <h5 className="font-medium text-red-800 text-sm">Invisible Parental Tasks</h5>
                    <p className="text-xs mt-1 text-red-600">
                      Emotional labor, monitoring development, healthcare coordination, and anticipating children's needs.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;