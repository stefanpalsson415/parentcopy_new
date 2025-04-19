import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, CalendarDays, CheckCircle2, 
  BarChart3, ArrowRight, Lightbulb, Info, Filter,
  MessageCircle, Layers, Star, ChevronsLeft, ChevronsRight,
  ArrowLeft, Edit, AlertTriangle, User, Clock, Target
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import QuestionFeedbackService from '../../../services/QuestionFeedbackService';
import QuestionFeedbackPanel from '../../survey/QuestionFeedbackPanel';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar 
} from 'recharts';

// Helper function to format dates consistently
const formatDate = (date) => {
  if (!date) return "Not available";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  });
};

const FamilyJourneyTab = () => {
  // Get data from context
  const { 
    getWeekHistoryData,
    familyMembers,
    surveyResponses,
    completedWeeks,
    currentWeek,
    familyId,
    weekHistory,
    taskRecommendations,
    getTaskImpactInsights
  } = useFamily();
  
  const { 
    fullQuestionSet,
    getQuestionsByCategory,
    generateWeeklyQuestions
  } = useSurvey();
  
  // State variables
  const [selectedCycle, setSelectedCycle] = useState(1);
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    distribution: true,
    balance: true,
    meeting: true,
    tasks: false,
    survey: false,
    insights: true,
    comparison: false
  });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [radarFilter, setRadarFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [personalizedQuestions, setPersonalizedQuestions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [excludedQuestions, setExcludedQuestions] = useState({});
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState({});
  const [familyResponseStats, setFamilyResponseStats] = useState({
    total: 0,
    completed: 0,
    categories: {},
    mamaPercent: 50,
    papaPercent: 50
  });
  
  // Journey data - contains all historical cycles for comparison
  const [journeyData, setJourneyData] = useState([]);
  
  // Profile colors for avatar placeholders
  const profileColors = [
    'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-green-500', 
    'bg-amber-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500',
  ];
  
  // Get consistent color for a member based on their id
  const getMemberColor = (member) => {
    if (!member || !member.id) return profileColors[0];
    
    // Use a simple hash of the member's id to pick a color consistently
    const hashCode = member.id.split('').reduce(
      (acc, char) => acc + char.charCodeAt(0), 0
    );
    
    return profileColors[hashCode % profileColors.length];
  };
  
  // Check if image URL is valid
  const isValidImageUrl = (url) => {
    // Check if url is defined and not empty
    if (!url || url === '') return false;
    
    // Explicit check for problematic cases
    const invalidPatterns = ['undefined', 'null', 'Tegner', 'Profile', 'broken', 'placeholder'];
    if (invalidPatterns.some(pattern => url.includes(pattern))) return false;
    
    // If it's a data URL, it's likely valid
    if (url.startsWith('data:image/')) return true;
    
    // If it has a common image extension, it's likely valid
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return validExtensions.some(ext => url.toLowerCase().includes(ext));
  };
  
  // Load cycle data and journey data when component mounts or selectedCycle changes
  useEffect(() => {
    const loadCycleAndJourneyData = async () => {
      setLoading(true);
      
      try {
        // Get cycle data from the family context
        const data = await getWeekHistoryData(selectedCycle);
        console.log(`Cycle ${selectedCycle} data:`, data);
        setCycleData(data);
        
        // Load all completed cycles for journey data
        const journeyEntries = [];
        
        // Add initial survey as "Cycle 0" if available
        const initialData = await getWeekHistoryData(0);
        if (initialData) {
          journeyEntries.push({
            cycleNumber: 0,
            label: "Initial",
            data: initialData,
            completionDate: initialData.completionDate
          });
        }
        
        // Add all other completed cycles
        for (const weekNum of completedWeeks) {
          const weekData = await getWeekHistoryData(weekNum);
          if (weekData) {
            journeyEntries.push({
              cycleNumber: weekNum,
              label: `Cycle ${weekNum}`,
              data: weekData,
              completionDate: weekData.completionDate
            });
          }
        }
        
        // Sort by cycle number for consistent display
        journeyEntries.sort((a, b) => a.cycleNumber - b.cycleNumber);
        setJourneyData(journeyEntries);
        
        // Load personalized questions and calculate stats for current cycle
        await loadPersonalizedData(selectedCycle);
      } catch (error) {
        console.error(`Error loading data:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCycleAndJourneyData();
  }, [selectedCycle, completedWeeks, getWeekHistoryData]);

  // Load personalized questions and excluded questions
  const loadPersonalizedData = async (cycleNumber) => {
    if (!familyId) return;
    
    setIsLoading(true);
    
    try {
      // Initialize an object to store personalized questions per member
      const memberQuestions = {};
      const excludedQuestionsMap = {};
      
      // Get family-wide excluded questions
      const familyExcluded = await QuestionFeedbackService.getQuestionsToExclude(familyId);
      excludedQuestionsMap['family'] = familyExcluded;
      
      // Create family data for personalization
      const familyData = {
        familyId,
        parents: familyMembers.filter(m => m.role === 'parent').map(p => ({
          name: p.name, 
          role: p.roleType || 'parent'
        })),
        children: familyMembers.filter(m => m.role === 'child').map(c => ({
          name: c.name,
          age: c.age || 10
        }))
      };
      
      // Generate base personalized questions - special handling for initial survey vs weekly
      let baseQuestions;
      if (cycleNumber === 0) {
        baseQuestions = fullQuestionSet.slice(0, 72);
      } else {
        baseQuestions = generateWeeklyQuestions(cycleNumber, false, familyData, null);
      }
      
      // For each family member, get their personalized questions
      for (const member of familyMembers) {
        // For children, get child-specific excluded questions
        if (member.role === 'child') {
          const childExcluded = await QuestionFeedbackService.getQuestionsToExclude(familyId, member.id);
          excludedQuestionsMap[member.id] = childExcluded;
          
          // Filter questions for children (simpler subset)
          memberQuestions[member.id] = baseQuestions.filter(q => 
            !excludedQuestionsMap[member.id].includes(q.id)
          ).slice(0, cycleNumber === 0 ? 72 : 20); // 72 for initial, 20 for weekly
        } else {
          // For parents, use the full set minus excluded
          memberQuestions[member.id] = baseQuestions.filter(q => 
            !excludedQuestionsMap['family'].includes(q.id)
          ).slice(0, cycleNumber === 0 ? 72 : 20);
        }
      }
      
      setPersonalizedQuestions(memberQuestions);
      setExcludedQuestions(excludedQuestionsMap);
      
      // Load feedback for all questions
      const allFeedback = await QuestionFeedbackService.getAllFamilyFeedback(familyId);
      if (allFeedback) {
        const feedbackMap = {};
        allFeedback.forEach(item => {
          feedbackMap[item.questionId] = item;
        });
        setQuestionFeedback(feedbackMap);
      }
      
      // Calculate family response statistics for this cycle
      calculateFamilyResponseStats(cycleNumber);
    } catch (error) {
      console.error("Error loading personalized questions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate family response statistics for the specific cycle
  const calculateFamilyResponseStats = (cycleNumber) => {
    // Skip if no survey responses
    if (!surveyResponses || Object.keys(surveyResponses).length === 0) return;
    
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks", 
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Count responses by category and parent
    const stats = {
      total: 0,
      completed: 0,
      mamaCount: 0,
      papaCount: 0,
      categories: {}
    };
    
    // Initialize category stats
    categories.forEach(category => {
      stats.categories[category] = {
        total: 0,
        mama: 0,
        papa: 0
      };
    });
    
    // Get responses for this specific cycle
    const cycleResponses = getCycleResponses(cycleNumber);
    
    // Analyze responses
    Object.entries(cycleResponses).forEach(([key, response]) => {
      // Skip non Mama/Papa responses
      if (response !== 'Mama' && response !== 'Papa') return;
      
      // Extract question ID
      let questionId = null;
      if (key.includes('q')) {
        const qMatch = key.match(/q(\d+)/);
        questionId = qMatch ? `q${qMatch[1]}` : null;
      }
      
      if (!questionId) return;
      
      // Find the question in the full set
      const question = fullQuestionSet.find(q => q.id === questionId);
      if (!question) return;
      
      // Update overall counts
      stats.total++;
      stats.completed++;
      
      if (response === 'Mama') {
        stats.mamaCount++;
      } else if (response === 'Papa') {
        stats.papaCount++;
      }
      
      // Update category counts
      if (question.category && stats.categories[question.category]) {
        stats.categories[question.category].total++;
        
        if (response === 'Mama') {
          stats.categories[question.category].mama++;
        } else if (response === 'Papa') {
          stats.categories[question.category].papa++;
        }
      }
    });
    
    // Calculate percentages
    if (stats.completed > 0) {
      stats.mamaPercent = Math.round((stats.mamaCount / stats.completed) * 100);
      stats.papaPercent = Math.round((stats.papaCount / stats.completed) * 100);
      
      // Calculate percentages for each category
      categories.forEach(category => {
        const catStats = stats.categories[category];
        if (catStats.total > 0) {
          catStats.mamaPercent = Math.round((catStats.mama / catStats.total) * 100);
          catStats.papaPercent = Math.round((catStats.papa / catStats.total) * 100);
        } else {
          catStats.mamaPercent = 50;
          catStats.papaPercent = 50;
        }
      });
    } else {
      stats.mamaPercent = 50;
      stats.papaPercent = 50;
    }
    
    setFamilyResponseStats(stats);
  };
  
  // Get cycle-specific responses
  const getCycleResponses = (cycleNumber) => {
    if (!surveyResponses) return {};
    
    const cycleResponses = {};
    
    if (cycleNumber === 0) {
      // For initial survey, include all responses without week prefixes
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (!key.includes('week-') && !key.includes('weekly-') && !key.includes('week')) {
          cycleResponses[key] = value;
        }
      });
    } else {
      // For specific cycles, look for matching prefixes
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (
          key.includes(`week-${cycleNumber}`) || 
          key.includes(`weekly-${cycleNumber}`) || 
          key.includes(`week${cycleNumber}-`) || 
          key.includes(`week${cycleNumber}_`) || 
          key.includes(`week${cycleNumber}q`)
        ) {
          cycleResponses[key] = value;
        }
      });
    }
    
    return cycleResponses;
  };
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Get balance data by category for radar chart
  const getCategoryBalance = (cycle) => {
    // Try to get from cycle data first
    if (cycle && cycle.data && cycle.data.categoryBalance) {
      return Object.entries(cycle.data.categoryBalance).map(([category, data]) => ({
        category: category.replace(" Tasks", ""),
        mama: data.mamaPercent || 50,
        papa: data.papaPercent || 50
      }));
    }
    
    // Fall back to calculating from stats
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    return categories.map(category => {
      const stats = familyResponseStats.categories[category] || {
        mamaPercent: 50,
        papaPercent: 50
      };
      
      return {
        category: category.replace(" Tasks", ""),
        mama: stats.mamaPercent || 50,
        papa: stats.papaPercent || 50
      };
    });
  };
  
  // Generate trend data for line charts
  const getTrendData = useMemo(() => {
    // Format journey data for trend charts
    return journeyData.map(cycle => {
      // Get overall balance from cycle data
      const balance = cycle.data && cycle.data.balance 
        ? cycle.data.balance
        : { mama: 50, papa: 50 };
      
      // Get category balance data
      const categoryBalance = cycle.data && cycle.data.categoryBalance || {};
      
      return {
        name: cycle.cycleNumber === 0 ? "Initial" : `Cycle ${cycle.cycleNumber}`,
        cycleNumber: cycle.cycleNumber,
        mamaOverall: balance.mama || 50,
        papaOverall: balance.papa || 50,
        visibleHousehold: categoryBalance["Visible Household Tasks"]?.mamaPercent || 50,
        invisibleHousehold: categoryBalance["Invisible Household Tasks"]?.mamaPercent || 50,
        visibleParental: categoryBalance["Visible Parental Tasks"]?.mamaPercent || 50,
        invisibleParental: categoryBalance["Invisible Parental Tasks"]?.mamaPercent || 50,
      };
    });
  }, [journeyData]);
  
  // Get key insights from task impact
  const getKeyInsights = () => {
    // Check if we have impact insights
    const impactInsights = getTaskImpactInsights();
    
    // If we have impact insights, use them
    if (impactInsights && impactInsights.length > 0) {
      return impactInsights.map(insight => ({
        type: insight.type || 'insight',
        title: insight.category,
        description: insight.message,
        icon: insight.type === 'success' 
          ? <CheckCircle2 size={20} className="text-green-600" />
          : insight.type === 'warning'
            ? <AlertTriangle size={20} className="text-amber-600" />
            : <Lightbulb size={20} className="text-blue-600" />
      }));
    }
    
    // Generate insights based on trend data
    const insights = [];
    
    // Only generate if we have enough data
    if (getTrendData.length > 1) {
      // Get current and previous cycle data
      const currentCycle = getTrendData[getTrendData.length - 1];
      const prevCycle = getTrendData[getTrendData.length - 2];
      
      // Compare overall balance
      const overallChange = currentCycle.mamaOverall - prevCycle.mamaOverall;
      
      if (Math.abs(overallChange) > 5) {
        insights.push({
          type: overallChange > 0 ? 'warning' : 'success',
          title: 'Overall Balance Change',
          description: `Your family's overall workload distribution has ${
            overallChange > 0 
              ? `shifted ${Math.abs(overallChange).toFixed(1)}% more toward Mama` 
              : `improved ${Math.abs(overallChange).toFixed(1)}% toward balance`
          } since the previous cycle.`,
          icon: overallChange > 0 
            ? <AlertTriangle size={20} className="text-amber-600" />
            : <CheckCircle2 size={20} className="text-green-600" />
        });
      }
      
      // Find most improved category
      const categories = [
        { name: "Visible Household", key: "visibleHousehold" },
        { name: "Invisible Household", key: "invisibleHousehold" },
        { name: "Visible Parental", key: "visibleParental" },
        { name: "Invisible Parental", key: "invisibleParental" }
      ];
      
      const categoryChanges = categories.map(cat => ({
        ...cat,
        change: Math.abs(50 - currentCycle[cat.key]) - Math.abs(50 - prevCycle[cat.key])
      }));
      
      // Sort by improvement (negative change is good - closer to 50%)
      categoryChanges.sort((a, b) => a.change - b.change);
      
      if (categoryChanges[0].change < -5) {
        // Most improved
        insights.push({
          type: 'success',
          title: `${categoryChanges[0].name} Improvement`,
          description: `Your ${categoryChanges[0].name} tasks have moved ${Math.abs(categoryChanges[0].change).toFixed(1)}% closer to balance since last cycle.`,
          icon: <CheckCircle2 size={20} className="text-green-600" />
        });
      }
      
      // Most worsened
      if (categoryChanges[categoryChanges.length - 1].change > 5) {
        insights.push({
          type: 'warning',
          title: `${categoryChanges[categoryChanges.length - 1].name} Challenge`,
          description: `Your ${categoryChanges[categoryChanges.length - 1].name} tasks have become ${categoryChanges[categoryChanges.length - 1].change.toFixed(1)}% more imbalanced since last cycle.`,
          icon: <AlertTriangle size={20} className="text-amber-600" />
        });
      }
    }
    
    // Add a default insight if we don't have enough
    if (insights.length === 0) {
      insights.push({
        type: 'insight',
        title: 'Journey Progress',
        description: `Your family has completed ${journeyData.length} cycles so far. Keep tracking to see balance trends emerge.`,
        icon: <Lightbulb size={20} className="text-blue-600" />
      });
    }
    
    return insights;
  };
  
  // Get cycle tasks with completed status
  const getCycleTasks = (cycle) => {
    if (!cycle || !cycle.data || !cycle.data.tasks) return [];
    
    return cycle.data.tasks;
  };
  
  // Get family member participation for this cycle
  const getCycleParticipation = (cycle) => {
    if (!cycle || !cycle.data || !cycle.data.familyMembers) return [];
    
    return cycle.data.familyMembers;
  };
  
  // Navigate to next question in survey explorer
  const nextQuestion = () => {
    if (!selectedMember) return;
    
    const memberQuestions = personalizedQuestions[selectedMember] || [];
    if (currentQuestionIndex < memberQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Navigate to first question
  const firstQuestion = () => {
    setCurrentQuestionIndex(0);
  };
  
  // Navigate to last question
  const lastQuestion = () => {
    if (!selectedMember) return;
    
    const memberQuestions = personalizedQuestions[selectedMember] || [];
    setCurrentQuestionIndex(memberQuestions.length - 1);
  };
  
  // Enhanced function to get responses for the current question from ALL family members
  const getResponsesForCurrentQuestion = () => {
    if (!selectedMember) return {};
    
    const memberQuestions = personalizedQuestions[selectedMember] || [];
    const questionId = memberQuestions[currentQuestionIndex]?.id;
    if (!questionId) return {};
    
    const responses = {};
    const cycleResponses = getCycleResponses(selectedCycle);
    
    // First, look for any direct matches with just the question ID
    if (cycleResponses[questionId]) {
      if (selectedMember) {
        const selectedFamilyMember = familyMembers.find(m => m.id === selectedMember);
        if (selectedFamilyMember) {
          responses[selectedMember] = cycleResponses[questionId];
        }
      }
    }
    
    // Check for responses from all family members
    familyMembers.forEach(member => {
      // Skip if we already found a response for this member
      if (responses[member.id]) return;
      
      // Check if this question was in this member's personalized set
      const memberSet = personalizedQuestions[member.id] || [];
      const isInMemberSet = memberSet.some(q => q.id === questionId);
      
      if (isInMemberSet) {
        // Check various possible key formats
        const possibleFormats = [
          `${member.id}-${questionId}`,
          `${questionId}-${member.id}`,
          `${member.id}_${questionId}`,
          `${questionId}_${member.id}`,
          ...(member.id === selectedMember ? [questionId] : [])
        ];
        
        // Add cycle-specific formats
        if (selectedCycle > 0) {
          possibleFormats.push(
            `week-${selectedCycle}-${member.id}-${questionId}`,
            `weekly-${selectedCycle}-${member.id}-${questionId}`,
            `week${selectedCycle}-${member.id}-${questionId}`
          );
        }
        
        // Check each possible format
        for (const format of possibleFormats) {
          if (cycleResponses[format]) {
            responses[member.id] = cycleResponses[format];
            break;
          }
        }
        
        // If still not found, look through all responses
        if (!responses[member.id]) {
          Object.entries(cycleResponses).forEach(([key, value]) => {
            if (key.includes(member.id) && key.includes(questionId) && 
                (value === 'Mama' || value === 'Papa')) {
              responses[member.id] = value;
            }
          });
        }
      }
    });
    
    return responses;
  };
  
  // Handle opening feedback panel for a question
  const handleOpenFeedback = (question) => {
    setSelectedQuestion(question);
    setShowFeedbackPanel(true);
  };
  
  // Handle feedback submission
  const handleFeedbackSubmitted = async (feedbackType) => {
    setShowFeedbackPanel(false);
    
    // Reload the personalized questions to reflect changes
    await loadPersonalizedData(selectedCycle);
  };
  
  // Current question for survey explorer
  const currentQuestion = selectedMember && personalizedQuestions[selectedMember] 
    ? personalizedQuestions[selectedMember][currentQuestionIndex] 
    : null;
  
  // Get current question responses
  const currentResponses = getResponsesForCurrentQuestion();
  
  // Determine if cycle exists in journey data
  const currentCycleEntry = journeyData.find(c => c.cycleNumber === selectedCycle);
  
  // Get selected cycle data
  const selectedCycleData = currentCycleEntry ? currentCycleEntry.data : null;
  
  // Colors for charts
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 font-roboto">
      {/* Timeline Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 font-roboto">Family Journey</h2>
        
        <div className="relative">
          {/* Cycle timeline */}
          <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
            <div className="absolute h-1 bg-gray-200 left-0 right-0 top-5"></div>
            
            {journeyData.map((cycle, index) => (
              <div 
                key={cycle.cycleNumber} 
                className="flex flex-col items-center cursor-pointer relative"
                onClick={() => setSelectedCycle(cycle.cycleNumber)}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 font-medium ${
                    cycle.cycleNumber === selectedCycle 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border-2 border-gray-300 text-gray-700'
                  }`}
                >
                  {cycle.cycleNumber === 0 ? 'I' : cycle.cycleNumber}
                </div>
                <span className={`text-xs mt-2 ${
                  cycle.cycleNumber === selectedCycle ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  {cycle.cycleNumber === 0 ? 'Initial' : `Cycle ${cycle.cycleNumber}`}
                </span>
                {cycle.completionDate && (
                  <span className="text-xs text-gray-400">{formatDate(cycle.completionDate)}</span>
                )}
                
                {/* Connection line to next cycle */}
                {index < journeyData.length - 1 && (
                  <div className="absolute w-10 h-1 bg-gray-200 left-10 top-5"></div>
                )}
              </div>
            ))}
            
            {/* Current cycle marker if not yet completed */}
            {!journeyData.some(c => c.cycleNumber === currentWeek) && (
              <div 
                className="flex flex-col items-center cursor-pointer relative"
                onClick={() => setSelectedCycle(currentWeek)}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 font-medium ${
                    currentWeek === selectedCycle 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border-2 border-gray-300 text-gray-700'
                  }`}
                >
                  {currentWeek}
                </div>
                <span className={`text-xs mt-2 ${
                  currentWeek === selectedCycle ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  Current
                </span>
                <span className="text-xs text-gray-400">In progress</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Selected cycle overview */}
        <div className="bg-gray-50 p-4 rounded-lg border mt-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">
                {selectedCycle === 0 ? 'Initial Survey' : `Cycle ${selectedCycle}`}
              </h3>
              {selectedCycleData?.completionDate && (
                <div className="flex items-center text-gray-500 text-sm">
                  <CalendarDays size={14} className="mr-1" />
                  <span>Completed on {formatDate(selectedCycleData.completionDate)}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-600">Overall Balance</div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-purple-600 font-medium">{familyResponseStats.mamaPercent || 50}% Mama</span>
                <span>/</span>
                <span className="text-green-600 font-medium">{familyResponseStats.papaPercent || 50}% Papa</span>
              </div>
            </div>
          </div>
          
          {/* Cycle stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(getCycleResponses(selectedCycle)).length}
              </div>
              <div className="text-xs text-gray-600">Survey Responses</div>
            </div>
            
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-2xl font-bold text-green-600">
                {getCycleTasks(currentCycleEntry)?.filter(t => t.completed)?.length || 0}/{getCycleTasks(currentCycleEntry)?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Tasks Completed</div>
            </div>
            
            <div className="bg-white p-3 rounded border text-center">
              <div className="text-2xl font-bold text-purple-600">
                {getCycleParticipation(currentCycleEntry)?.length || familyMembers.length}
              </div>
              <div className="text-xs text-gray-600">Family Participants</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Radar Chart for Task Categories */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('distribution')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Task Category Distribution
          </h3>
          {expandedSections.distribution ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.distribution && (
          <div className="p-6 pt-0">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 font-roboto">
                Distribution of responsibilities across the four task categories
              </p>
              <div className="flex items-center text-sm">
                <span className="mr-2 font-roboto">View:</span>
                <div className="flex border rounded overflow-hidden">
                  <button 
                    className={`px-2 py-1 font-roboto ${radarFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                    onClick={() => setRadarFilter('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`px-2 py-1 border-l font-roboto ${radarFilter === 'parents' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                    onClick={() => setRadarFilter('parents')}
                  >
                    Parents
                  </button>
                  <button 
                    className={`px-2 py-1 border-l font-roboto ${radarFilter === 'children' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}
                    onClick={() => setRadarFilter('children')}
                  >
                    Children
                  </button>
                </div>
              </div>
            </div>
              
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="80%" data={getCategoryBalance(currentCycleEntry)}>
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
              
            <div className="mt-4 text-sm text-center text-gray-500 font-roboto">
              The chart shows what percentage of tasks in each category are handled by Mama vs Papa.
            </div>
            
            {/* Overall balance bar display */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Overall Workload Distribution</h4>
              <div className="flex justify-between mb-1">
                <span>Mama ({familyResponseStats.mamaPercent}%)</span>
                <span>Papa ({familyResponseStats.papaPercent}%)</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500" 
                  style={{ width: `${familyResponseStats.mamaPercent}%` }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Based on {familyResponseStats.completed} survey responses in {selectedCycle === 0 ? 'the initial survey' : `cycle ${selectedCycle}`}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Journey Insights Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('insights')}
        >
          <h3 className="text-lg font-semibold font-roboto">Journey Insights</h3>
          {expandedSections.insights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.insights && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Actionable insights based on your family's journey data
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getKeyInsights().map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    insight.type === 'success' ? 'border-green-200 bg-green-50' :
                    insight.type === 'warning' || insight.type === 'challenge' ? 'border-amber-200 bg-amber-50' :
                    insight.type === 'insight' ? 'border-blue-200 bg-blue-50' :
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
            
            {/* Trend chart */}
            {getTrendData.length > 1 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Balance Trends Over Time</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        name="Overall (Mama %)" 
                        type="monotone" 
                        dataKey="mamaOverall" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        name="Invisible Household" 
                        type="monotone" 
                        dataKey="invisibleHousehold" 
                        stroke="#82ca9d" 
                      />
                      <Line 
                        name="Invisible Parental" 
                        type="monotone" 
                        dataKey="invisibleParental" 
                        stroke="#ff7300" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  This chart shows percentage of workload handled by Mama over time. Closer to 50% indicates better balance.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Family Meeting Notes Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('meeting')}
        >
          <h3 className="text-lg font-semibold flex items-center font-roboto">
            <MessageCircle size={18} className="mr-2 text-amber-600" />
            Family Meeting
          </h3>
          {expandedSections.meeting ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.meeting && selectedCycleData?.meetingNotes ? (
          <div className="p-6 pt-0">
            <div className="border rounded-lg p-5 bg-white">
              <h4 className="text-base font-medium mb-4 font-roboto">Meeting Notes & Outcomes</h4>
              
              {/* What went well */}
              {selectedCycleData.meetingNotes.wentWell && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 text-green-600">✓</div>
                    <h5 className="font-medium text-green-800 font-roboto">What Went Well</h5>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.wentWell}
                  </div>
                </div>
              )}
              
              {/* What could improve */}
              {selectedCycleData.meetingNotes.couldImprove && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 text-amber-600">⚠</div>
                    <h5 className="font-medium text-amber-800 font-roboto">What Could Improve</h5>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.couldImprove}
                  </div>
                </div>
              )}
              
              {/* Action items */}
              {selectedCycleData.meetingNotes.actionItems && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 text-blue-600">→</div>
                    <h5 className="font-medium text-blue-800 font-roboto">Action Items</h5>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.actionItems.split('\n').map((item, idx) => (
                      item.trim() ? (
                        <div key={idx} className="flex items-center mb-2">
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center mr-2 text-blue-600 border border-blue-300 text-xs">
                            {idx + 1}
                          </div>
                          <span>{item}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
              
              {/* Kids' Corner */}
              {selectedCycleData.meetingNotes.kidsInput && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2 text-indigo-600">👪</div>
                    <h5 className="font-medium text-indigo-800 font-roboto">Kids' Corner</h5>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.kidsInput}
                  </div>
                </div>
              )}
              
              {/* Next cycle goals */}
              {selectedCycleData.meetingNotes.nextWeekGoals && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2 text-purple-600">🎯</div>
                    <h5 className="font-medium text-purple-800 font-roboto">Next Cycle Goals</h5>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.nextWeekGoals.split('\n').map((goal, idx) => (
                      goal.trim() ? (
                        <div key={idx} className="flex items-start mb-2">
                          <Star size={16} className="text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{goal}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
              
              {/* Additional notes */}
              {selectedCycleData.meetingNotes.additionalNotes && (
                <div>
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 text-gray-600">📝</div>
                    <h5 className="font-medium text-gray-800 font-roboto">Additional Notes</h5>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-4 font-roboto ml-8">
                    {selectedCycleData.meetingNotes.additionalNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          expandedSections.meeting && (
            <div className="p-6 pt-0">
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 font-roboto">No family meeting notes were recorded for this cycle.</p>
              </div>
            </div>
          )
        )}
      </div>
      
      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('tasks')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Cycle Tasks
          </h3>
          {expandedSections.tasks ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.tasks && (
          <div className="p-6 pt-0">
            {getCycleTasks(currentCycleEntry)?.length > 0 ? (
              <div className="space-y-4">
                {getCycleTasks(currentCycleEntry).map((task) => (
                  <div 
                    key={task.id} 
                    className={`border rounded-lg p-4 ${task.completed ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className={`mr-3 p-1 rounded-full ${
                          task.completed 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {task.completed ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <Target size={18} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium font-roboto">{task.title}</h4>
                          <p className="text-sm text-gray-600 font-roboto">
                            {task.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 font-roboto">
                            Assigned to: {task.assignedTo || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      {task.completed && (
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          Completed {task.completedDate ? formatDate(task.completedDate) : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Subtasks if present */}
                    {task.subTasks && task.subTasks.length > 0 && (
                      <div className="mt-3 ml-8 space-y-2">
                        <p className="text-xs font-medium text-gray-500">Subtasks:</p>
                        {task.subTasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-2 flex-shrink-0 ${
                              subtask.completed ? 'bg-green-100 border border-green-400' : 'bg-gray-100 border border-gray-300'
                            }`}></div>
                            <span className={`text-sm ${subtask.completed ? 'text-green-700' : 'text-gray-700'}`}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Task insight if available */}
                    {task.aiInsight && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
                        <div className="flex">
                          <Lightbulb size={16} className="text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                          <span>{task.aiInsight}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 font-roboto">No tasks found for this cycle.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Survey Responses Explorer */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('survey')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Survey Response Explorer
          </h3>
          {expandedSections.survey ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.survey && (
          <div className="p-6 pt-0">
            <div className="p-4 mb-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
              <div className="flex items-start">
                <Lightbulb size={20} className="text-blue-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">About {selectedCycle === 0 ? 'Initial Survey' : 'Weekly Check-in'}</p>
                  <p>
                    {selectedCycle === 0 
                      ? "Allie selects 72 personalized questions for each family member based on your family's structure and needs."
                      : `Allie selects 20 personalized questions each week for family members based on previous responses and areas needing attention.`}
                    {' '}Questions marked as "not applicable" are removed from future surveys.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Explore how each family member responded to the survey questions
            </p>
            
            {/* Category filter */}
            <div className="mb-4 flex items-center">
              <Filter size={16} className="text-gray-500 mr-1" />
              <span className="text-sm text-gray-600 mr-2 font-roboto">Filter by category:</span>
              <select
                className="border rounded p-1 text-sm font-roboto"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Visible Household Tasks">Visible Household Tasks</option>
                <option value="Invisible Household Tasks">Invisible Household Tasks</option>
                <option value="Visible Parental Tasks">Visible Parental Tasks</option>
                <option value="Invisible Parental Tasks">Invisible Parental Tasks</option>
              </select>
            </div>
            
            {/* Family Member Selection */}
            <div className="flex flex-wrap gap-4 mb-6 justify-center">
              {familyMembers.map(member => {
                const memberQuestions = personalizedQuestions[member.id] || [];
                return (
                  <div 
                    key={member.id}
                    className={`flex flex-col items-center cursor-pointer transition-all p-2 rounded-lg ${
                      selectedMember === member.id ? 'bg-gray-100 ring-2 ring-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedMember(member.id);
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                      selectedMember === member.id ? 'border-blue-500' : 'border-gray-200'
                    }`}>
                      {isValidImageUrl(member.profilePicture) ? (
                        <img 
                          src={member.profilePicture}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${getMemberColor(member)}`}>
                          <span className="text-xl font-medium">
                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      <p className="text-xs text-blue-600">{memberQuestions.length} Questions</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {selectedMember ? (
              <div>
                {/* Member info banner */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-center mb-4 md:mb-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 mr-4">
                      {isValidImageUrl(familyMembers.find(m => m.id === selectedMember)?.profilePicture) ? (
                        <img 
                          src={familyMembers.find(m => m.id === selectedMember)?.profilePicture} 
                          alt={familyMembers.find(m => m.id === selectedMember)?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${getMemberColor(familyMembers.find(m => m.id === selectedMember))}`}>
                          <span className="text-xl font-medium">
                            {familyMembers.find(m => m.id === selectedMember)?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-lg">{familyMembers.find(m => m.id === selectedMember)?.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{familyMembers.find(m => m.id === selectedMember)?.role}</div>
                    </div>
                  </div>
                  
                  {/* Category filter */}
                  <div className="flex items-center">
                    <Filter size={16} className="text-gray-500 mr-2" />
                    <select
                      className="border rounded p-1 text-sm"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="Visible Household Tasks">Visible Household</option>
                      <option value="Invisible Household Tasks">Invisible Household</option>
                      <option value="Visible Parental Tasks">Visible Parental</option>
                      <option value="Invisible Parental Tasks">Invisible Parental</option>
                    </select>
                  </div>
                </div>
                
                {currentQuestion ? (
                  <div>
                    {/* Question display panel */}
                    <div className="border rounded-lg overflow-hidden mb-6">
                      {/* Question header */}
                      <div className="flex items-center justify-between bg-gray-50 p-4 border-b">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3">
                            Q
                          </div>
                          <div>
                            <h4 className="font-medium">Question {currentQuestionIndex + 1} of {personalizedQuestions[selectedMember]?.length || 0}</h4>
                            <span className="text-xs text-gray-500">
                              {currentQuestion.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {/* Show question feedback status */}
                          {questionFeedback[currentQuestion.id] ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center mr-3">
                              <Info size={12} className="mr-1" />
                              Feedback Added
                            </span>
                          ) : null}
                          
                          {/* Edit feedback button */}
                          <button 
                            onClick={() => handleOpenFeedback(currentQuestion)}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center hover:bg-gray-200"
                          >
                            <Edit size={12} className="mr-1" />
                            {questionFeedback[currentQuestion.id] ? 'Edit Feedback' : 'Add Feedback'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Question main content */}
                      <div className="p-4">
                        <p className="text-lg mb-4">{currentQuestion.text}</p>
                        
                        {/* Show weight information */}
                        <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                          <div className="flex items-start">
                            <div className="mr-2 text-gray-400 mt-0.5">
                              <Lightbulb size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Question Weight: {currentQuestion.totalWeight}</p>
                              <p className="text-gray-600 text-xs mt-1">{currentQuestion.weightExplanation || "This question helps measure workload distribution in your family."}</p>
                              {currentQuestion.weeklyExplanation && (
                                <p className="text-gray-600 text-xs mt-1 italic">Weekly context: {currentQuestion.weeklyExplanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Display if question is excluded */}
                        {excludedQuestions['family']?.includes(currentQuestion.id) ? (
                          <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center mb-4">
                            <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                            <span>This question has been marked as "Not Applicable" for your family</span>
                          </div>
                        ) : null}
                        
                        {/* Family member responses */}
                        <div className="rounded-lg border mt-2">
                          <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                            <h5 className="font-medium">Family Responses</h5>
                            <span className="text-xs text-gray-500">Question ID: {currentQuestion.id}</span>
                          </div>
                          
                          <div className="p-4">
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                              {familyMembers.map(member => {
                                // Check if this question was in this member's personalized set
                                const memberQuestions = personalizedQuestions[member.id] || [];
                                const questionInMemberSet = memberQuestions.some(q => q.id === currentQuestion.id);
                                
                                // If not in set, don't show
                                if (!questionInMemberSet) return null;
                                
                                const response = currentResponses[member.id];
                                
                                return (
                                  <div 
                                    key={member.id}
                                    className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-center mb-2">
                                      <div className="w-10 h-10 rounded-full overflow-hidden mr-2 flex-shrink-0">
                                        {isValidImageUrl(member.profilePicture) ? (
                                          <img 
                                            src={member.profilePicture} 
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className={`w-full h-full flex items-center justify-center text-white ${getMemberColor(member)}`}>
                                            <span className="text-sm font-medium">
                                              {member.name.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-medium text-sm">{member.name}</h5>
                                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-1">
                                      <p className="text-sm font-medium">Response:</p>
                                      {response ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          response === 'Mama' ? 'bg-purple-100 text-purple-700' : 
                                          response === 'Papa' ? 'bg-green-100 text-green-700' : 
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {response}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">No response</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* No responses message */}
                            {!Object.values(currentResponses).some(r => r === 'Mama' || r === 'Papa') && (
                              <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500 text-sm mt-4">
                                <p>No responses recorded for this question in this cycle</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Response Insights Section */}
                        {Object.values(currentResponses).some(r => r) && (
                          <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <h5 className="font-medium mb-3 flex items-center">
                              <Lightbulb size={18} className="text-purple-600 mr-2" />
                              Response Insights
                            </h5>
                            
                            {/* Count Mama/Papa responses */}
                            {(() => {
                              const responseCounts = Object.values(currentResponses).reduce((acc, response) => {
                                if (response === 'Mama' || response === 'Papa') {
                                  acc[response] = (acc[response] || 0) + 1;
                                }
                                return acc;
                              }, {});
                              
                              const mamaCount = responseCounts['Mama'] || 0;
                              const papaCount = responseCounts['Papa'] || 0;
                              const totalResponses = mamaCount + papaCount;
                              
                              if (totalResponses === 0) return null;
                              
                              const percentMama = totalResponses > 0 ? Math.round((mamaCount / totalResponses) * 100) : 0;
                              const percentPapa = totalResponses > 0 ? Math.round((papaCount / totalResponses) * 100) : 0;
                              
                              let agreementText = '';
                              if (totalResponses > 1) {
                                if (mamaCount === totalResponses) {
                                  agreementText = "Everyone agrees that Mama handles this task.";
                                } else if (papaCount === totalResponses) {
                                  agreementText = "Everyone agrees that Papa handles this task.";
                                } else {
                                  agreementText = "There's disagreement about who handles this task.";
                                }
                              }
                              
                              return (
                                <div>
                                  <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-purple-700">Mama ({percentMama}%)</span>
                                    <span className="text-green-700">Papa ({percentPapa}%)</span>
                                  </div>
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                    <div 
                                      className="h-full bg-purple-500" 
                                      style={{ width: `${percentMama}%` }} 
                                    />
                                  </div>
                                  <p className="text-sm text-gray-700 mt-2">
                                    {agreementText}
                                  </p>
                                  
                                  {/* Additional insights based on who responded what */}
                                  {Object.entries(currentResponses).length > 1 && (
                                    <div className="mt-3 text-sm">
                                      <p className="font-medium mb-1">Perception differences:</p>
                                      <ul className="list-disc pl-5 space-y-1 text-xs">
                                        {Object.entries(currentResponses).map(([memberId, response]) => {
                                          if (!response) return null;
                                          const member = familyMembers.find(m => m.id === memberId);
                                          if (!member) return null;
                                          
                                          return (
                                            <li key={memberId} className="text-gray-700">
                                              <span className="font-medium">{member.name}</span> 
                                              {member.role === 'child' 
                                                ? ` (child) sees that ${response} handles this task.` 
                                                : ` (${member.roleType || 'parent'}) reports that ${response} handles this task.`}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Question navigation controls */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={firstQuestion}
                          disabled={currentQuestionIndex === 0}
                          className={`p-2 rounded ${
                            currentQuestionIndex === 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          title="First Question"
                        >
                          <ChevronsLeft size={18} />
                        </button>
                        <button
                          onClick={prevQuestion}
                          disabled={currentQuestionIndex === 0}
                          className={`p-2 rounded ${
                            currentQuestionIndex === 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Previous Question"
                        >
                          <ArrowLeft size={18} />
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Question {currentQuestionIndex + 1} of {personalizedQuestions[selectedMember]?.length || 0}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={nextQuestion}
                          disabled={currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1}
                          className={`p-2 rounded ${
                            currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Next Question"
                        >
                          <ArrowRight size={18} />
                        </button>
                        <button
                          onClick={lastQuestion}
                          disabled={currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1}
                          className={`p-2 rounded ${
                            currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Last Question"
                        >
                          <ChevronsRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No questions available for this family member in this cycle.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={24} className="text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">Select a Family Member</h4>
                  <p className="text-gray-500 mb-6">
                    Choose a family member above to explore their personalized survey questions and responses
                  </p>
                  <p className="text-sm text-blue-600">
                    Each family member receives {selectedCycle === 0 ? '72' : '20'} personalized questions {selectedCycle === 0 ? '' : 'each cycle '}based on your family's needs
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Family Participation Section */}
      {currentCycleEntry?.data?.familyMembers && currentCycleEntry.data.familyMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-roboto">Family Participation</h3>
          
          <div className="flex flex-wrap gap-3">
            {currentCycleEntry.data.familyMembers.map((member, index) => (
              <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg border">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mr-3 font-roboto">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium font-roboto">{member.name}</div>
                  <div className="text-sm text-gray-500 capitalize font-roboto">{member.role}</div>
                  {member.completedDate && (
                    <div className="text-xs text-green-600 font-roboto">
                      Completed on {formatDate(member.completedDate)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Question Feedback Modal */}
      {showFeedbackPanel && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <QuestionFeedbackPanel
            questionId={selectedQuestion.id}
            questionText={selectedQuestion.text}
            category={selectedQuestion.category}
            familyId={familyId}
            existingFeedback={questionFeedback[selectedQuestion.id]}
            onSave={handleFeedbackSubmitted}
            onCancel={() => setShowFeedbackPanel(false)}
          />
        </div>
      )}
    </div>
  );
};

export default FamilyJourneyTab;