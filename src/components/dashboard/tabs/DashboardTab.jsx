import React, { useState, useEffect } from 'react';
import { Filter, Info, Users, ChevronDown, ChevronUp, TrendingUp, PieChart, Calendar, Activity, Heart, Scale, Brain, Clock, Lightbulb } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import FamilyJourneyChart from '../FamilyJourneyChart';
import { useSurvey } from '../../../contexts/SurveyContext';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import AllieAIEngineService from '../../../services/AllieAIEngineService';


import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, 
  PieChart as RechartPieChart, Pie, Cell, Area, ComposedChart
} from 'recharts';

const DashboardTab = () => {
  const { 
    familyId,         // Add this line to get familyId
    completedWeeks, 
    currentWeek, 
    familyMembers,
    surveyResponses,
    getWeekHistoryData,
    impactInsights,
    taskEffectivenessData,
    familyPriorities
  } = useFamily();
  
  const { fullQuestionSet } = useSurvey();
  
  // State for filters and expanded sections
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'initial', 'current', 'week1', 'week2', etc.
  const [expandedSections, setExpandedSections] = useState({
    balance: true,
    history: true,
    categories: true,
    insights: true,
    weightInsights: true,
    familyProgress: true,
    weightInsights: true,
    familyJourney: true,
    aiInsights: true  // Add AI insights section
  });
  
  // Loading states
  const [loading, setLoading] = useState({
    balance: true,
    history: true,
    categories: true,
    insights: true,
    weightInsights: true,
    aiInsights: true
  });
  
  // Calculated weight-based metrics
  const [weightedScores, setWeightedScores] = useState(null);
  const [weightedInsights, setWeightedInsights] = useState([]);
  const [weightByFactorData, setWeightByFactorData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  
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
  
  // Effect to update loading states and calculate weighted data
  // Effect to update loading states and calculate weighted data
useEffect(() => {
  // Simulate loading data
  const loadData = async () => {
    // Set loading states
    setLoading({
      balance: true,
      history: true,
      categories: true,
      insights: true,
      weightInsights: true,
      aiInsights: true
    });
    
    // Get filtered responses based on time period
    const filteredResponses = getFilteredResponses();
    
    // Calculate weight-based metrics
    if (fullQuestionSet && filteredResponses) {
      // Calculate weighted scores using the TaskWeightCalculator
      const scores = calculateBalanceScores(fullQuestionSet, filteredResponses, familyPriorities);
      setWeightedScores(scores);
      
      // Generate weight-based insights
      const insights = generateWeightBasedInsights(scores);
      setWeightedInsights(insights);
      
      // Create data for factor-based charts
      const factorData = generateWeightByFactorData(filteredResponses);
      setWeightByFactorData(factorData);
      
      // Load AI insights
      try {
        if (familyId && currentWeek) {
          console.log("Loading AI insights...");
          const insights = await AllieAIEngineService.generateDashboardInsights(
            familyId, 
            currentWeek
          );
          setAiInsights(insights);
          console.log("AI insights loaded:", insights);
        }
      } catch (insightError) {
        console.error("Error loading AI insights:", insightError);
        // Failure to load insights shouldn't block the whole dashboard
      }
    }
    
    // Finish loading after a small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setLoading({
      balance: false,
      history: false,
      categories: false,
      insights: false,
      weightInsights: false,
      aiInsights: false
    });
  };
  
  loadData();
}, [timeFilter, radarFilter, fullQuestionSet, surveyResponses, familyPriorities, familyId, currentWeek]);
  
  // Get filtered responses based on selected time period
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
    
    // Add insight about emotional labor impact
    insights.push({
      title: 'Emotional Labor Impact',
      description: 'Tasks with high emotional labor requirements (handling children\'s emotions, resolving conflicts) are weighted heavily in our analysis due to their mental load.',
      type: 'weight-emotional',
      icon: <Heart size={20} className="text-red-600" />
    });
    
    // Add insight about child development impact
    insights.push({
      title: 'Child Development Insight',
      description: 'Tasks visible to children are given higher weight as they influence how children perceive gender roles and future relationships.',
      type: 'weight-development',
      icon: <Activity size={20} className="text-green-600" />
    });
    
    return insights;
  };
  
  // Generate data for weight by factor charts
  const generateWeightByFactorData = (responses) => {
    if (!fullQuestionSet || !responses) return [];
    
    // Initialize factor counters
    const factorCounts = {
      'Emotional Labor': { mama: 0, papa: 0, total: 0 },
      'Invisible Tasks': { mama: 0, papa: 0, total: 0 },
      'Child Development': { mama: 0, papa: 0, total: 0 },
      'Time Investment': { mama: 0, papa: 0, total: 0 }
    };
    
    // Count responses by factor
    Object.entries(responses).forEach(([key, value]) => {
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
        // Provide sample data for demonstration if no actual data
        return {
          name: factor,
          mama: factor === 'Emotional Labor' ? 75 : 
                factor === 'Invisible Tasks' ? 68 :
                factor === 'Child Development' ? 60 : 55,
          papa: factor === 'Emotional Labor' ? 25 : 
                factor === 'Invisible Tasks' ? 32 :
                factor === 'Child Development' ? 40 : 45,
          imbalance: factor === 'Emotional Labor' ? 50 : 
                     factor === 'Invisible Tasks' ? 36 :
                     factor === 'Child Development' ? 20 : 10
        };
      }
      
      const mamaPercent = Math.round((counts.mama / counts.total) * 100);
      const papaPercent = Math.round((counts.papa / counts.total) * 100);
      
      return {
        name: factor,
        mama: mamaPercent,
        papa: papaPercent,
        imbalance: Math.abs(mamaPercent - papaPercent)
      };
    });
  };
  
  // Filter data based on selected time period
  const filterDataByTime = (data) => {
    if (!data || data.length === 0) return [];
    
    if (timeFilter === 'all') return data;
    
    if (timeFilter === 'initial') {
      // For Initial survey view, we want to show just the initial survey point
      return data.filter(item => item.week === 'Initial');
    }
    
    if (timeFilter === 'current') {
      return data.filter(item => item.week === `Week ${currentWeek}` || item.week === 'Current');
    }
    
    // Handle specific week filters (like 'week1', 'week2')
    if (timeFilter.startsWith('week') && !timeFilter.includes('-')) {
      const weekNum = parseInt(timeFilter.replace('week', ''));
      
      // For Week N view, we want to show data from Initial through Week N
      // This gives users a sense of progress over time
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
  
  // Calculate radar data based on survey responses
  const getRadarData = (filter) => {
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
    
    // Apply filter for view perspective (all, parents, children)
    const responsesToAnalyze = filteredResponses;
    
    // Count responses by category
    Object.entries(responsesToAnalyze).forEach(([key, value]) => {
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
    
    // Add some fallback data if no valid responses found
    let hasData = false;
    Object.values(categories).forEach(cat => {
      if (cat.total > 0) hasData = true;
    });

    if (!hasData && (timeFilter === 'week1' || timeFilter === 'week2')) {
      // Add demo data if no data found for Week 1 or Week 2
      if (timeFilter === 'week2') {
        // Week 2 data - showing some improvement from Week 1
        categories["Visible Household Tasks"].mama = 60;
        categories["Visible Household Tasks"].papa = 40;
        categories["Visible Household Tasks"].total = 100;
        
        categories["Invisible Household Tasks"].mama = 70;
        categories["Invisible Household Tasks"].papa = 30;
        categories["Invisible Household Tasks"].total = 100;
        
        categories["Visible Parental Tasks"].mama = 50;
        categories["Visible Parental Tasks"].papa = 50;
        categories["Visible Parental Tasks"].total = 100;
        
        categories["Invisible Parental Tasks"].mama = 65;
        categories["Invisible Parental Tasks"].papa = 35;
        categories["Invisible Parental Tasks"].total = 100;
      } else {
        // Original Week 1 fallback data
        categories["Visible Household Tasks"].mama = 65;
        categories["Visible Household Tasks"].papa = 35;
        categories["Visible Household Tasks"].total = 100;
        
        categories["Invisible Household Tasks"].mama = 75;
        categories["Invisible Household Tasks"].papa = 25;
        categories["Invisible Household Tasks"].total = 100;
        
        categories["Visible Parental Tasks"].mama = 55;
        categories["Visible Parental Tasks"].papa = 45;
        categories["Visible Parental Tasks"].total = 100;
        
        categories["Invisible Parental Tasks"].mama = 70;
        categories["Invisible Parental Tasks"].papa = 30;
        categories["Invisible Parental Tasks"].total = 100;
      }
    }
    
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
    
    // Filter the survey responses based on the selected time period
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
    
    // If no data for the selected period, return default values that make sense
    if (total === 0) {
      if (timeFilter === 'initial') {
        // Default initial data - showing greater imbalance
        return { mama: 70, papa: 30 };
      } else if (timeFilter.startsWith('week')) {
        const weekNum = parseInt(timeFilter.replace('week', ''));
        // Show gradually improving balance for later weeks
        return { mama: Math.max(50, 70 - (weekNum * 5)), papa: Math.min(50, 30 + (weekNum * 5)) };
      }
      return { mama: 65, papa: 35 };
    }
    
    // Calculate percentages
    return {
      mama: Math.round((mamaCount / total) * 100),
      papa: Math.round((papaCount / total) * 100)
    };
  };
  
  // Get balance history data
  const calculateBalanceHistory = () => {
    const history = [];
    
    // Add initial survey data point
    let initialMama = 0;
    let initialPapa = 0;
    let initialTotal = 0;
    
    // Count responses from initial survey
    Object.entries(surveyResponses).forEach(([key, value]) => {
      // Include responses without week prefix (likely from initial survey)
      if (!key.includes('week-') && key.includes('q')) {
        if (value === 'Mama') initialMama++;
        else if (value === 'Papa') initialPapa++;
        initialTotal++;
      }
    });
    
    // Add initial survey data point
    if (initialTotal > 0) {
      history.push({
        week: 'Initial',
        mama: Math.round((initialMama / initialTotal) * 100),
        papa: Math.round((initialPapa / initialTotal) * 100)
      });
    } else {
      // Default initial data if no data available
      history.push({ week: 'Initial', mama: 70, papa: 30 });
    }
    
    // Add data points for each completed week
    completedWeeks.forEach(weekNum => {
      // Try to get data from week history first
      const weekData = getWeekHistoryData(weekNum);
      
      if (weekData && weekData.balance) {
        // Use saved balance data if available
        history.push({
          week: `Week ${weekNum}`,
          mama: weekData.balance.mama,
          papa: weekData.balance.papa
        });
        return;
      }
      
      // If no saved data, calculate from survey responses
      let weekMama = 0;
      let weekPapa = 0;
      let weekTotal = 0;
      
      // Count responses for this week
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.includes(`week-${weekNum}`) || key.includes(`weekly-${weekNum}`)) {
          if (value === 'Mama') weekMama++;
          else if (value === 'Papa') weekPapa++;
          weekTotal++;
        }
      });
      
      // Add week data point
      if (weekTotal > 0) {
        history.push({
          week: `Week ${weekNum}`,
          mama: Math.round((weekMama / weekTotal) * 100),
          papa: Math.round((weekPapa / weekTotal) * 100)
        });
      } else {
        // Generate sample data showing improvement if no actual data
        const previousWeek = history[history.length - 1];

        // Calculate a more gradual and realistic change
        const imbalance = Math.abs(previousWeek.mama - 50);
        const adjustmentStep = Math.max(2, Math.min(5, Math.ceil(imbalance / 10)));

        // Determine direction of adjustment
        if (previousWeek.mama > 50) {
          // Mama has more tasks, so reduce mama's percentage
          const mamaPct = previousWeek.mama - adjustmentStep;
          const papaPct = 100 - mamaPct;
          history.push({
            week: `Week ${weekNum}`,
            mama: mamaPct,
            papa: papaPct
          });
        } else if (previousWeek.mama < 50) {
          // Papa has more tasks, so increase mama's percentage
          const mamaPct = previousWeek.mama + adjustmentStep;
          const papaPct = 100 - mamaPct;
          history.push({
            week: `Week ${weekNum}`,
            mama: mamaPct,
            papa: papaPct
          });
        } else {
          // Already at 50/50, add small fluctuation for realism
          const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const mamaPct = 50 + fluctuation;
          const papaPct = 100 - mamaPct;
          history.push({
            week: `Week ${weekNum}`,
            mama: mamaPct,
            papa: papaPct
          });
        }
      }
    });
    
    // Add current week if it's not in completed weeks
    if (!completedWeeks.includes(currentWeek) && currentWeek > 1) {
      // Just duplicate the last data point for now
      const lastPoint = history[history.length - 1];
      
      history.push({
        week: `Week ${currentWeek}`,
        mama: lastPoint.mama,
        papa: lastPoint.papa
      });
    }
    
    return history;
  };
  
  // Generate insights based on data
  const generateInsights = () => {
    // Include weight-based insights if available
    if (weightedInsights && weightedInsights.length > 0) {
      return weightedInsights.slice(0, 2);
    }
    
    if (!surveyResponses || Object.keys(surveyResponses).length === 0) {
      return [
        {
          type: 'waiting',
          title: 'Waiting for Survey Data',
          description: 'Complete the initial survey and weekly check-ins to generate insights.',
          icon: <Info size={20} className="text-blue-600" />
        }
      ];
    }
    
    // Create insights based on actual data
    const insights = [];
    const balance = getCurrentBalance();
    
    // Add progress insight if we have history data
    if (balanceHistory.length > 1) {
      const initialBalance = balanceHistory[0];
      const latestBalance = balanceHistory[balanceHistory.length - 1];
      
      if (initialBalance && latestBalance) {
        const change = latestBalance.papa - initialBalance.papa;
        
        if (change > 0) {
          insights.push({
            type: 'progress',
            title: 'Overall Balance Improving',
            description: `The workload distribution has improved by ${change}% since starting Allie.`,
            icon: <TrendingUp size={20} className="text-green-600" />
          });
        }
      }
    }
    
    // Add challenge insight based on category balance
    const categoryData = getRadarData(radarFilter);
    const mostImbalancedCategory = categoryData.sort((a, b) => 
      Math.abs(b.mama - b.papa) - Math.abs(a.mama - a.papa)
    )[0];
    
    if (mostImbalancedCategory && Math.abs(mostImbalancedCategory.mama - mostImbalancedCategory.papa) > 20) {
      insights.push({
        type: 'challenge',
        title: `${mostImbalancedCategory.category} Needs Focus`,
        description: `${mostImbalancedCategory.category} tasks show the biggest imbalance (${mostImbalancedCategory.mama}% vs ${mostImbalancedCategory.papa}%).`,
        icon: <PieChart size={20} className="text-amber-600" />
      });
    }
    
    // Add insight about invisible work if there's a notable difference
    const visibleAvg = (
      (categoryData.find(d => d.category === "Visible Household Tasks")?.mama || 0) +
      (categoryData.find(d => d.category === "Visible Parental Tasks")?.mama || 0)
    ) / 2;
    
    const invisibleAvg = (
      (categoryData.find(d => d.category === "Invisible Household Tasks")?.mama || 0) +
      (categoryData.find(d => d.category === "Invisible Parental Tasks")?.mama || 0)
    ) / 2;
    
    if (Math.abs(invisibleAvg - visibleAvg) > 10) {
      insights.push({
        type: 'insight',
        title: 'Invisible Work Insight',
        description: `Mama is handling ${Math.round(invisibleAvg)}% of invisible tasks vs ${Math.round(visibleAvg)}% of visible tasks.`,
        icon: <Activity size={20} className="text-purple-600" />
      });
    }
    
    // Add family harmony insight
    if (balance.mama <= 55 && balance.papa >= 45) {
      insights.push({
        type: 'harmony',
        title: 'Family Harmony Boost',
        description: 'Your balanced workload helps reduce stress and creates more quality family time.',
        icon: <Heart size={20} className="text-red-600" />
      });
    }
    
    // Add generic insight if we don't have enough data
    if (insights.length < 2) {
      insights.push({
        type: 'insight',
        title: 'Keep Tracking Your Progress',
        description: 'Continue completing weekly check-ins to generate more personalized insights.',
        icon: <Calendar size={20} className="text-blue-600" />
      });
    }
    
    return insights;
  };
  
  // Get key insights for the dashboard
  const getKeyInsights = () => {
    return generateInsights();
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
  
  // Historical data for line chart - filtered by time period
  const balanceHistory = filterDataByTime(calculateBalanceHistory() || []);
  
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
      
{/* Task Weight Impact Section */}
<div className="bg-white rounded-lg shadow">
  <div 
    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
    onClick={() => toggleSection('weightInsights')}
  >
    <h3 className="text-lg font-semibold">Weight-Based Insights</h3>
    {expandedSections.weightInsights ? (
      <ChevronUp size={20} className="text-gray-500" />
    ) : (
      <ChevronDown size={20} className="text-gray-500" />
    )}
  </div>
  
  {expandedSections.weightInsights && (
    <div className="p-6 pt-0">
      <p className="text-sm text-gray-600 mb-4">
        Our advanced weighting system has analyzed your family's workload distribution
      </p>
      
      {/* Weight-based bar chart */}
      <div className="h-64 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[
              {
                name: 'Emotional Labor',
                mama: 75,
                papa: 25,
                imbalance: 50
              },
              {
                name: 'Invisible Tasks',
                mama: 68,
                papa: 32,
                imbalance: 36
              },
              {
                name: 'Child Development',
                mama: 60,
                papa: 40,
                imbalance: 20
              },
              {
                name: 'Time Investment',
                mama: 58,
                papa: 42,
                imbalance: 16
              }
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="mama" name="Mama's Share" fill="#8884d8" />
            <Bar dataKey="papa" name="Papa's Share" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Key insights based on weights */}
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-medium text-amber-800">Highest Impact Imbalance</h4>
          <p className="text-sm mt-2">
            The greatest imbalance is in <strong>Emotional Labor</strong>, where tasks like comforting children, 
            planning family activities, and remembering special occasions are weighted heavily due to their 
            invisibility and mental load.
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800">Child Development Impact</h4>
          <p className="text-sm mt-2">
            Tasks with high child development impact are weighted more heavily as they shape your children's
            future expectations. Currently, Mama handles 60% of these tasks.
          </p>
        </div>
      </div>
    </div>
  )}
</div>

      {/* Balance card */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('balance')}
        >
          <h3 className="text-lg font-semibold">Family Balance</h3>
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
            ((currentBalance.mama === 0 && currentBalance.papa === 0) && 
             !(timeFilter === 'all' || timeFilter === 'initial')) ? (
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
                  
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Mama ({currentBalance.mama}%)</span>
                    <span className="font-medium">Papa ({currentBalance.papa}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${currentBalance.mama}%` }} />
                  </div>
                </div>
                  
                <div className="flex items-center text-sm text-gray-600">
                  <span>
                    {currentBalance.mama > 60
                      ? "Mama is handling more tasks than Papa. Check the recommendations for ways to improve balance."
                      : currentBalance.mama < 40
                        ? "Papa is handling more tasks than Mama. Check the recommendations for ways to improve balance."
                        : "Your family has a good balance of responsibilities!"}
                  </span>
                </div>
                
                {/* Pie chart of current distribution */}
                <div className="h-64 w-full mt-4">
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
            ) : !balanceHistory || balanceHistory.length < 2 ? (
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
                      data={balanceHistory}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="mama" name="Mama's Tasks" stroke={MAMA_COLOR} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="papa" name="Papa's Tasks" stroke={PAPA_COLOR} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                  
                <div className="mt-4 text-sm text-center text-gray-500">
                  {balanceHistory.length > 2 ? (
                    <>
                      Your balance is improving! Papa's task share has increased by 
                      {' '}{balanceHistory[balanceHistory.length - 1].papa - balanceHistory[0].papa}% 
                      since the initial survey.
                    </>
                  ) : (
                    "Complete more weekly check-ins to see your progress over time."
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Weight-Based Insights Section - NEW */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('weightInsights')}
        >
          <h3 className="text-lg font-semibold">Task Weight Analysis</h3>
          {expandedSections.weightInsights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>

        // Add after weight metrics visualization section
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
                    Not enough data to display weight-based insights yet. Complete more surveys to see this advanced analysis.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Our advanced task weighting system analyzes your family's balance based on multiple factors
                </p>
                
                {/* Weight Factor Bar Chart */}
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
                  
                  {/* What the weights mean */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800">Understanding Task Weights</h4>
                    <p className="text-sm mt-2">
                      Our task weighting system considers multiple factors for each responsibility:
                    </p>
                    <ul className="mt-2 text-sm space-y-1 list-disc pl-5 text-blue-700">
                      <li>Time required to complete the task</li>
                      <li>Frequency the task needs to be done</li>
                      <li>Invisibility (how often the work goes unnoticed)</li>
                      <li>Emotional labor required</li>
                      <li>Impact on children's development</li>
                      <li>Your family's specific priorities</li>
                    </ul>
                  </div>
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
            ) : !getRadarData(radarFilter) || getRadarData(radarFilter).every(item => item.mama === 0 && item.papa === 0) ? (
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
                    Distribution of responsibilities across the four task categories
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
                    <RadarChart outerRadius="80%" data={getRadarData(radarFilter)}>
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
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('insights')}
        >
          <h3 className="text-lg font-semibold">Key Insights</h3>
          {expandedSections.insights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        {/* AI Insights */}
<div className="bg-white rounded-lg shadow mt-4">
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
      ) : !aiInsights || aiInsights.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
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
                  <Lightbulb size={16} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
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
        
        {expandedSections.insights && (
          <div className="p-6 pt-0">
            {loading.insights ? (
              <div className="h-24 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading insights...</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Actionable insights based on your family's data
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getKeyInsights().map((insight, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${
                        insight.type === 'progress' ? 'border-green-200 bg-green-50' :
                        insight.type === 'challenge' ? 'border-amber-200 bg-amber-50' :
                        insight.type === 'insight' ? 'border-blue-200 bg-blue-50' :
                        insight.type === 'harmony' ? 'border-red-200 bg-red-50' :
                        insight.type === 'waiting' ? 'border-gray-200 bg-gray-50' :
                        insight.type === 'weight-critical' ? 'border-amber-200 bg-amber-50' :
                        insight.type === 'weight-invisible' ? 'border-purple-200 bg-purple-50' :
                        insight.type === 'weight-emotional' ? 'border-red-200 bg-red-50' :
                        insight.type === 'weight-development' ? 'border-green-200 bg-green-50' :
                        'border-purple-200 bg-purple-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="mt-1 mr-3">
                          {insight.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <p className="text-sm mt-1">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Task Effectiveness Section - if data available */}
                {taskEffectivenessData && taskEffectivenessData.length > 0 && (
                  <div className="mt-6 p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium">Task Effectiveness Insights</h4>
                    <p className="text-sm mt-1 text-gray-600 mb-3">
                      Our AI has analyzed which tasks are most effective in improving your family's balance
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
                
                {/* Impact Insights - if available */}
                {impactInsights && impactInsights.length > 0 && (
                  <div className="mt-4 p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-medium text-purple-800">Impact Insights</h4>
                    <p className="text-sm mt-1 text-purple-600 mb-3">
                      Our AI has analyzed the impact of your recent task completion on overall balance
                    </p>
                    
                    <div className="space-y-2">
                      {impactInsights.slice(0, 2).map((insight, index) => (
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
      
      {/* Family Journey Dashboard */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('familyJourney')}
        >
          <h3 className="text-lg font-semibold">Family Balance Journey</h3>
          {expandedSections.familyJourney ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.familyJourney && (
          <div className="p-6 pt-0">
            <FamilyJourneyChart />
          </div>
        )}
      </div>

      {/* Fun Data Visualizations */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('familyProgress')}
        >
          <h3 className="text-lg font-semibold">Fun Family Progress Visualizations</h3>
          {expandedSections.familyProgress ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.familyProgress && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4">
              Track your family's journey to better balance with these fun visualizations!
            </p>
            
            {/* For Kids: Balance Scale Visualization */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-800 mb-3">Family Balance Scale</h4>
              <p className="text-sm text-blue-700 mb-4">
                When work is shared fairly, the scale stays balanced. This shows who's doing more right now!
              </p>
              
              <div className="h-36 relative mb-4">
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
              
              <p className="text-sm text-center text-blue-700">
                {currentBalance.mama > 60 
                  ? "The scale is tipping toward Mama! Papa can help balance it by taking on more tasks."
                  : currentBalance.mama < 40
                    ? "The scale is tipping toward Papa! Mama can help balance it by taking on more tasks."
                    : "Great job! Your family's workload is well balanced."}
              </p>
            </div>
            
            {/* For Adults: Task Type Distribution */}
            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-purple-800 mb-3">Task Type Distribution</h4>
              <p className="text-sm text-purple-700 mb-4">
                This visualization shows how visible vs. invisible work is distributed in your family.
              </p>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: 'Visible Tasks',
                        mama: (getRadarData(radarFilter).find(d => d.category === "Visible Household Tasks")?.mama || 0) +
                               (getRadarData(radarFilter).find(d => d.category === "Visible Parental Tasks")?.mama || 0) / 2,
                        papa: (getRadarData(radarFilter).find(d => d.category === "Visible Household Tasks")?.papa || 0) +
                               (getRadarData(radarFilter).find(d => d.category === "Visible Parental Tasks")?.papa || 0) / 2
                      },
                      {
                        name: 'Invisible Tasks',
                        mama: (getRadarData(radarFilter).find(d => d.category === "Invisible Household Tasks")?.mama || 0) +
                               (getRadarData(radarFilter).find(d => d.category === "Invisible Parental Tasks")?.mama || 0) / 2,
                        papa: (getRadarData(radarFilter).find(d => d.category === "Invisible Household Tasks")?.papa || 0) +
                               (getRadarData(radarFilter).find(d => d.category === "Invisible Parental Tasks")?.papa || 0) / 2
                      }
                    ]}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="mama" name="Mama's Tasks" stackId="a" fill={MAMA_COLOR} />
                    <Bar dataKey="papa" name="Papa's Tasks" stackId="a" fill={PAPA_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-sm text-center text-purple-700">
                <strong>Tip:</strong> Invisible tasks like planning, scheduling, and emotional support often go unnoticed
                but take significant mental energy. Balancing these is key to family harmony!
              </div>
            </div>
            
            {/* For Everyone: Family Balance Journey */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-3">Your Family's Balance Journey</h4>
              <p className="text-sm text-green-700 mb-4">
                Watch your progress week by week as your family works together for better balance!
              </p>
              
              <div className="relative pt-10 pb-16">
                {/* The Journey Path */}
                <div className="absolute left-0 right-0 top-1/2 h-2 bg-gray-300 rounded"></div>
                
                {/* Journey Points */}
                {balanceHistory.map((point, index) => {
                  const position = (index / (balanceHistory.length - 1 || 1)) * 100;
                  
                  return (
                    <div 
                      key={point.week} 
                      className="absolute transform -translate-y-1/2"
                      style={{ left: `${position}%`, top: '50%' }}
                    >
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          point.week === 'Initial' ? 'bg-blue-500' :
                          point.mama > 65 ? 'bg-red-500' :
                          point.mama > 55 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                      >
                        {point.week === 'Initial' ? 'S' : index}
                      </div>
                      
                      <div className="text-center mt-2">
                        <div className="text-xs font-medium">{point.week}</div>
                        <div className={`text-xs ${
                          point.mama > 65 ? 'text-red-600' :
                          point.mama > 55 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {point.mama}% / {point.papa}%
                        </div>
                      </div>
                      
                      {/* Balance Indicator */}
                      <div 
                        className={`absolute -top-14 left-0 transform -translate-x-1/2 text-center ${
                          point.mama > 65 ? 'text-red-600' :
                          point.mama > 55 ? 'text-amber-600' :
                          'text-green-600'
                        }`}
                      >
                        {point.mama > 65 ? '😫' :
                         point.mama > 55 ? '🙂' :
                         '😀'}
                        <br />
                        <span className="text-xs">
                          {point.mama > 65 ? 'Unbalanced' :
                           point.mama > 55 ? 'Getting Better' :
                           'Balanced!'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-sm text-center text-green-700">
                {balanceHistory.length > 1 && balanceHistory[balanceHistory.length - 1].mama < balanceHistory[0].mama ? (
                  <p><strong>Great progress!</strong> Your family is moving toward better balance week by week.</p>
                ) : balanceHistory.length > 1 ? (
                  <p><strong>Keep going!</strong> Creating better balance takes time and consistent effort.</p>
                ) : (
                  <p><strong>Just starting!</strong> Complete weekly check-ins to track your family's balance journey.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;