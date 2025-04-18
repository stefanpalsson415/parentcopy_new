import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, CalendarDays, CheckCircle2, PieChart, 
  BarChart3, ArrowRight, Brain, Clock, Target, Filter, Users,
  MessageCircle, Layers, Info, Lightbulb, Star, ChevronsLeft, ChevronsRight,
  ArrowLeft, Edit, AlertTriangle, User
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import HabitProgressTracker from '../../habits/HabitProgressTracker';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import QuestionFeedbackService from '../../../services/QuestionFeedbackService';
import QuestionFeedbackPanel from '../../survey/QuestionFeedbackPanel';

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

const WeekHistoryTab = ({ weekNumber }) => {
  const { 
    getWeekHistoryData,
    familyMembers,
    surveyResponses,
    familyId
  } = useFamily();
  
  const { 
    fullQuestionSet,
    getQuestionsByCategory,
    generateWeeklyQuestions
  } = useSurvey();
  
  // State variables
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    habits: false,
    surveyResponses: false,
    familyMeeting: true,
    balance: true,
    categories: true,
    insights: true
  });
  const [expandedHabits, setExpandedHabits] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
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
  
  // Load week data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Get week history data from the family context
        const data = await getWeekHistoryData(weekNumber);
        console.log(`Cycle ${weekNumber} data:`, data);
        console.log("All survey responses:", surveyResponses);
        setWeekData(data);
      } catch (error) {
        console.error(`Error loading cycle ${weekNumber} data:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Load personalized questions and excluded questions
    const loadPersonalizedData = async () => {
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
        
        // Generate base personalized questions
        const baseQuestions = generateWeeklyQuestions(weekNumber, false, familyData, null);
        
        // For each family member, get their personalized questions
        for (const member of familyMembers) {
          // For children, get child-specific excluded questions
          if (member.role === 'child') {
            const childExcluded = await QuestionFeedbackService.getQuestionsToExclude(familyId, member.id);
            excludedQuestionsMap[member.id] = childExcluded;
            
            // Filter questions for children (simpler subset)
            memberQuestions[member.id] = baseQuestions.filter(q => 
              !excludedQuestionsMap[member.id].includes(q.id)
            ).slice(0, 20); // Ensure max 20 questions for weekly
          } else {
            // For parents, use the full set minus excluded
            memberQuestions[member.id] = baseQuestions.filter(q => 
              !excludedQuestionsMap['family'].includes(q.id)
            ).slice(0, 20); // Ensure max 20 questions for weekly
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
        
        // Calculate family response statistics
        calculateFamilyResponseStats(weekNumber);
      } catch (error) {
        console.error("Error loading personalized questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPersonalizedData();
  }, [weekNumber, getWeekHistoryData, surveyResponses, familyId, familyMembers, generateWeeklyQuestions]);
  
  // Calculate family response statistics for the specific week
  const calculateFamilyResponseStats = (weekNum) => {
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
    
    // Filter responses for this specific week
    const weekResponses = {};
    Object.entries(surveyResponses).forEach(([key, value]) => {
      // Include responses for this specific week
      if (key.includes(`week-${weekNum}`) || 
          key.includes(`weekly-${weekNum}`) || 
          key.includes(`week${weekNum}-`) || 
          key.includes(`week${weekNum}_`) || 
          key.includes(`week${weekNum}q`) || 
          (weekNum === 1 && (
            key.includes('weekly') || 
            key.includes('week1') || 
            key.includes('week-1') || 
            key.includes('week_1')
          ))) {
        weekResponses[key] = value;
      }
    });
    
    // Analyze responses
    Object.entries(weekResponses).forEach(([key, response]) => {
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
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle habit expansion
  const toggleHabit = (habitId) => {
    setExpandedHabits(prev => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  // Get survey responses for the specific week - ENHANCED VERSION
  const getWeekSurveyResponses = () => {
    if (!surveyResponses) return {};
    
    const weekResponsesObj = {};
    const memberRoleMap = {};
    
    // Create a map of member IDs to roles for filtering
    familyMembers.forEach(member => {
      memberRoleMap[member.id] = member.role;
    });
    
    // Try all possible formats for week keys with expanded patterns
    Object.entries(surveyResponses).forEach(([key, value]) => {
      // Extract member ID if present in the key (format: memberId-questionId)
      const keyParts = key.split('-');
      const memberId = keyParts.length > 1 ? keyParts[0] : null;
      const memberRole = memberId ? memberRoleMap[memberId] : null;
      
      // Extract question ID
      let questionId;
      if (key.includes('q')) {
        const qMatch = key.match(/q(\d+)/);
        questionId = qMatch ? `q${qMatch[1]}` : null;
      }
      
      // Skip if we couldn't extract a question ID
      if (!questionId) return;
      
      // Get the question number to check if applicable for children
      const qNumMatch = questionId.match(/q(\d+)/);
      const qNum = qNumMatch ? parseInt(qNumMatch[1]) : 0;
      
      // For children, only include questions in their reduced set (first 72)
      const isApplicableForRole = memberRole === 'child' ? qNum <= 72 : true;
      
      // Skip if not applicable for this member's role
      if (!isApplicableForRole) return;
      
      // For initial survey data in weekly tabs, include if this is week 1
      if (weekNumber === 1 && !key.includes('week') && !key.includes('weekly') && key.includes('q')) {
        weekResponsesObj[`${memberId}-${questionId}`] = value;
      }
      
      // Check for week-specific formats
      if (
        key.includes(`week-${weekNumber}`) || 
        key.includes(`weekly-${weekNumber}`) || 
        key.includes(`week${weekNumber}-`) || 
        key.includes(`week${weekNumber}_`) || 
        key.includes(`week${weekNumber}q`) || 
        (weekNumber === 1 && (
          key.includes('weekly') || 
          key.includes('week1') || 
          key.includes('week-1') || 
          key.includes('week_1')
        ))
      ) {
        // For keys with format week-1-q1, extract just the q1 part
        weekResponsesObj[`${memberId}-${questionId}`] = value;
      }
    });
    
    return weekResponsesObj;
  };
  
  // Get survey questions for this week
  const getWeekQuestions = () => {
    // Try to use weekly questions first
    const weeklyQuestions = generateWeeklyQuestions(weekNumber);
    
    if (weeklyQuestions && weeklyQuestions.length > 0) {
      return weeklyQuestions;
    }
    
    // Fall back to all questions if needed
    return fullQuestionSet;
  };
  
  const weekSurveyResponses = getWeekSurveyResponses();
  const weekQuestions = getWeekQuestions();
  
  // Filter questions by category if needed
  const getFilteredQuestions = () => {
    if (categoryFilter === 'all') {
      return weekQuestions;
    }
    
    return weekQuestions.filter(q => q.category === categoryFilter);
  };
  
  // Calculate balance scores
  const getBalanceScores = () => {
    if (!weekSurveyResponses || Object.keys(weekSurveyResponses).length === 0) {
      return weekData?.balance || { mama: 0, papa: 0 };
    }
    
    try {
      // Try to calculate from survey responses
      const scores = calculateBalanceScores(
        fullQuestionSet, 
        weekSurveyResponses
      );
      
      return scores.overallBalance;
    } catch (error) {
      console.error("Error calculating balance scores:", error);
      // Fall back to week data if available
      return weekData?.balance || { mama: 0, papa: 0 };
    }
  };
  
  // Get balance data by category
  const getCategoryBalance = () => {
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    const balanceData = [];
    
    // Get responses by role type
    const responsesByRole = {
      parent: {},
      child: {}
    };
    
    // Organize responses by role
    Object.entries(weekSurveyResponses).forEach(([key, value]) => {
      // Format should be memberId-questionId
      const [memberId, questionId] = key.split('-');
      
      // Find the member's role
      const member = familyMembers.find(m => m.id === memberId);
      if (!member) return;
      
      // Add to the appropriate role group
      const roleType = member.role === 'child' ? 'child' : 'parent';
      responsesByRole[roleType][questionId] = value;
    });
    
    // Process each category with normalization
    categories.forEach(category => {
      // Get questions for this category
      const categoryQuestions = getQuestionsByCategory(category);
      
      // Count by role
      const roleCounts = {
        parent: { mama: 0, papa: 0, total: 0 },
        child: { mama: 0, papa: 0, total: 0 }
      };
      
      // Count responses by role
      Object.entries(responsesByRole).forEach(([role, responses]) => {
        categoryQuestions.forEach(question => {
          const response = responses[question.id];
          
          if (response) {
            roleCounts[role].total++;
            
            if (response === 'Mama') {
              roleCounts[role].mama++;
            } else if (response === 'Papa') {
              roleCounts[role].papa++;
            }
          }
        });
      });
      
      // Calculate percentages with normalized view
      const normalizedCounts = { mama: 0, papa: 0, total: 0 };
      
      // Weight parent and child perspectives equally if we have both
      if (roleCounts.parent.total > 0 && roleCounts.child.total > 0) {
        // Parent percentage
        const parentMamaPercent = roleCounts.parent.total > 0 
          ? (roleCounts.parent.mama / roleCounts.parent.total) * 100 
          : 0;
        
        // Child percentage
        const childMamaPercent = roleCounts.child.total > 0 
          ? (roleCounts.child.mama / roleCounts.child.total) * 100 
          : 0;
        
        // Average the perspectives with equal weight
        normalizedCounts.mama = Math.round((parentMamaPercent + childMamaPercent) / 2);
        normalizedCounts.papa = 100 - normalizedCounts.mama;
        normalizedCounts.total = roleCounts.parent.total + roleCounts.child.total;
      } 
      // Otherwise use what we have
      else if (roleCounts.parent.total > 0) {
        normalizedCounts.mama = Math.round((roleCounts.parent.mama / roleCounts.parent.total) * 100);
        normalizedCounts.papa = 100 - normalizedCounts.mama;
        normalizedCounts.total = roleCounts.parent.total;
      }
      else if (roleCounts.child.total > 0) {
        normalizedCounts.mama = Math.round((roleCounts.child.mama / roleCounts.child.total) * 100);
        normalizedCounts.papa = 100 - normalizedCounts.mama;
        normalizedCounts.total = roleCounts.child.total;
      }
      
      balanceData.push({
        category: category,
        mama: normalizedCounts.mama,
        papa: normalizedCounts.papa,
        questionCount: normalizedCounts.total, // Include count for transparency
        parentCount: roleCounts.parent.total,
        childCount: roleCounts.child.total
      });
    });
    
    return balanceData;
  };
  
  // Get radar data for chart
  const getRadarData = (filter) => {
    // Base on category balance
    const categoryBalance = getCategoryBalance();
    
    // If we have actual data, use it
    if (categoryBalance.some(item => item.mama > 0 || item.papa > 0)) {
      return categoryBalance;
    }
    
    // Otherwise use sample data based on week number
    const sampleData = [
      {
        category: "Visible Household Tasks",
        mama: weekNumber === 1 ? 65 : weekNumber === 2 ? 60 : 55,
        papa: weekNumber === 1 ? 35 : weekNumber === 2 ? 40 : 45
      },
      {
        category: "Invisible Household Tasks",
        mama: weekNumber === 1 ? 75 : weekNumber === 2 ? 70 : 65,
        papa: weekNumber === 1 ? 25 : weekNumber === 2 ? 30 : 35
      },
      {
        category: "Visible Parental Tasks",
        mama: weekNumber === 1 ? 60 : weekNumber === 2 ? 55 : 53,
        papa: weekNumber === 1 ? 40 : weekNumber === 2 ? 45 : 47
      },
      {
        category: "Invisible Parental Tasks",
        mama: weekNumber === 1 ? 70 : weekNumber === 2 ? 65 : 60,
        papa: weekNumber === 1 ? 30 : weekNumber === 2 ? 35 : 40
      }
    ];
    
    return sampleData;
  };
  
  // Navigate to next question
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
    
    // First, look for any direct matches with just the question ID (common for initial survey)
    if (surveyResponses[questionId]) {
      // If there's a direct response to this question ID, find which member it belongs to
      // This is often the case for the initially selected member
      if (selectedMember) {
        const selectedFamilyMember = familyMembers.find(m => m.id === selectedMember);
        if (selectedFamilyMember) {
          responses[selectedMember] = surveyResponses[questionId];
        }
      }
    }
    
    // Check ALL possible response formats for EACH family member
    familyMembers.forEach(member => {
      // Skip if we already found a response for this member
      if (responses[member.id]) return;
      
      // Check if this question was in this member's personalized set
      const memberSet = personalizedQuestions[member.id] || [];
      const isInMemberSet = memberSet.some(q => q.id === questionId);
      
      if (isInMemberSet) {
        const possibleKeyFormats = [
          // Basic formats
          `${member.id}-${questionId}`,
          `${questionId}-${member.id}`,
          `${member.id}_${questionId}`,
          `${questionId}_${member.id}`,
          // Just the question ID (if this member is currently selected)
          ...(member.id === selectedMember ? [questionId] : []),
          // With various prefixes that might be used
          `initial-${member.id}-${questionId}`,
          `week-${weekNumber}-${member.id}-${questionId}`,
          `weekly-${weekNumber}-${member.id}-${questionId}`,
          `week${weekNumber}-${member.id}-${questionId}`
        ];
        
        // Check each possible format
        for (const keyFormat of possibleKeyFormats) {
          if (surveyResponses[keyFormat]) {
            responses[member.id] = surveyResponses[keyFormat];
            break;
          }
        }
        
        // If still not found, do a more comprehensive search through all survey responses
        if (!responses[member.id]) {
          // Look for any key that contains both the member ID and question ID
          Object.entries(surveyResponses).forEach(([key, value]) => {
            if (key.includes(member.id) && key.includes(questionId) && 
                (value === 'Mama' || value === 'Papa')) {
              responses[member.id] = value;
            }
          });
        }
      }
    });
    
    // Last attempt - scan through all responses for any potential matches
    // This is a fallback for unusual key formats
    if (Object.keys(responses).length < familyMembers.length) {
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.includes(questionId) && (value === 'Mama' || value === 'Papa')) {
          // Try to determine which member this belongs to
          familyMembers.forEach(member => {
            if (!responses[member.id] && key.includes(member.id)) {
              responses[member.id] = value;
            }
          });
        }
      });
    }
    
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
    const loadPersonalizedData = async () => {
      try {
        // Get updated excluded questions
        const familyExcluded = await QuestionFeedbackService.getQuestionsToExclude(familyId);
        const updatedExcluded = {...excludedQuestions, family: familyExcluded};
        
        // Update excluded questions state
        setExcludedQuestions(updatedExcluded);
        
        // Update personalized questions for each member
        const updatedQuestions = {...personalizedQuestions};
        
        // For each family member, update their questions list
        for (const member of familyMembers) {
          // Get excluded questions for this member
          const memberExcluded = member.role === 'child' 
            ? await QuestionFeedbackService.getQuestionsToExclude(familyId, member.id)
            : familyExcluded;
          
          // Update the map
          updatedExcluded[member.id] = memberExcluded;
          
          // Filter the member's questions
          const baseQuestions = personalizedQuestions[member.id] || [];
          updatedQuestions[member.id] = baseQuestions.filter(q => 
            !memberExcluded.includes(q.id)
          );
        }
        
        // Update states
        setExcludedQuestions(updatedExcluded);
        setPersonalizedQuestions(updatedQuestions);
        
        // Reload feedback data
        const allFeedback = await QuestionFeedbackService.getAllFamilyFeedback(familyId);
        if (allFeedback) {
          const feedbackMap = {};
          allFeedback.forEach(item => {
            feedbackMap[item.questionId] = item;
          });
          setQuestionFeedback(feedbackMap);
        }
      } catch (error) {
        console.error("Error updating questions after feedback:", error);
      }
    };
    
    await loadPersonalizedData();
  };
  
  // Determine if we have actual survey response data
  const hasSurveyData = Object.keys(weekSurveyResponses).length > 0;
  
  // Current question
  const currentQuestion = selectedMember && personalizedQuestions[selectedMember] 
    ? personalizedQuestions[selectedMember][currentQuestionIndex] 
    : null;
  
  // Get current question responses
  const currentResponses = getResponsesForCurrentQuestion();
  
  // COLORS
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!weekData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-6">
          <div className="text-4xl font-bold text-gray-300 mb-2">?</div>
          <h3 className="text-lg font-medium mb-1 font-roboto">No data available</h3>
          <p className="text-gray-500 font-roboto">
            Data for Cycle {weekNumber} could not be found. This could be because the cycle hasn't been completed yet.
          </p>
        </div>
      </div>
    );
  }
  
  // Mock data for habits demonstration - in production this would come from the context or API
  const habitData = {
    habits: [
      {
        id: "habit-1",
        title: "Shared Meal Planning",
        description: "Both parents plan meals together weekly",
        assignedTo: "Papa",
        streak: weekNumber * 3, // For demo purposes
        record: weekNumber * 3 + 2,
        goalDays: 21,
        category: "Invisible Household Tasks",
        focusArea: "Meal Planning",
        completed: true,
        completedDate: new Date().toISOString()
      },
      {
        id: "habit-2",
        title: "Morning Routine Support",
        description: "Help children prepare for school in the mornings",
        assignedTo: "Mama",
        streak: weekNumber * 2, 
        record: weekNumber * 2,
        goalDays: 21,
        category: "Visible Parental Tasks",
        focusArea: "Morning Routines",
        completed: true,
        completedDate: new Date().toISOString()
      },
      {
        id: "habit-3",
        title: "Emotional Check-ins",
        description: "Regular emotional support for children",
        assignedTo: "Papa",
        streak: weekNumber, 
        record: weekNumber + 1,
        goalDays: 21,
        category: "Invisible Parental Tasks",
        focusArea: "Emotional Support",
        completed: weekNumber > 1,
        completedDate: weekNumber > 1 ? new Date().toISOString() : null
      }
    ]
  };
  
  return (
    <div className="space-y-6">
      {/* Header with completion date */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2 font-roboto">Cycle {weekNumber} Summary</h2>
            {weekData.completionDate && (
              <div className="flex items-center text-gray-500 text-sm font-roboto">
                <CalendarDays size={14} className="mr-1" />
                <span>Completed on {formatDate(weekData.completionDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Radar Chart for Task Categories */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('categories')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Task Category Distribution
          </h3>
          {expandedSections.categories ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.categories && (
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
              <div className="mt-2 grid grid-cols-2 gap-2">
                {getRadarData(radarFilter).map((category, index) => (
                  <div key={index} className="text-xs text-gray-500 flex justify-between items-center bg-gray-50 p-1 rounded">
                    <span>{category.category.split(' ').pop()}</span>
                    <div className="flex items-center">
                      <span className="bg-blue-50 text-blue-700 px-1 rounded">
                        {category.questionCount || 0} Qs
                      </span>
                      {category.parentCount > 0 && category.childCount > 0 && (
                        <span className="ml-1 text-gray-400">
                          ({category.parentCount}P/{category.childCount}C)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              
            <div className="mt-4 text-sm text-center text-gray-500 font-roboto">
              The chart shows what percentage of tasks in each category are handled by Mama vs Papa.
            </div>
          </div>
        )}
      </div>
      
      {/* Balance Overview Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('balance')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Balance Distribution
          </h3>
          {expandedSections.balance ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.balance && (
          <div className="p-6 pt-0">
            <div className="mb-6">
              <h4 className="text-base font-medium mb-3 font-roboto">Overall Balance</h4>
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="font-medium font-roboto">Mama ({getBalanceScores().mama}%)</span>
                  <span className="font-medium font-roboto">Papa ({getBalanceScores().papa}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${getBalanceScores().mama}%` }} 
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 font-roboto">
                  {getBalanceScores().mama > 60
                    ? "There was a significant imbalance in workload during this cycle, with Mama handling more responsibilities."
                    : getBalanceScores().mama < 40
                      ? "There was a significant imbalance in workload during this cycle, with Papa handling more responsibilities."
                      : "The workload was relatively balanced during this cycle."}
                </p>
              </div>
              
              <h4 className="text-base font-medium mb-3 font-roboto">Balance by Category</h4>
              <div className="space-y-4">
                {getCategoryBalance().map((category, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-roboto">{category.category}</span>
                      <div className="flex text-sm">
                        <span className="text-blue-600 font-roboto">{category.mama}%</span>
                        <span className="mx-1 text-gray-400 font-roboto">/</span>
                        <span className="text-green-600 font-roboto">{category.papa}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${category.mama}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Habits Progress Section (Replaced Tasks Section) */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('habits')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Habit Progress
          </h3>
          {expandedSections.habits ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.habits && (
          <div className="p-6 pt-0">
            {/* Habit Summary */}
            <div className="mb-6 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 font-roboto">
                    {habitData.habits.filter(h => h.completed).length}/{habitData.habits.length}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Habits Maintained</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 text-blue-600 font-roboto">
                    {habitData.habits.filter(h => h.assignedTo === 'Mama' && h.completed).length}/{habitData.habits.filter(h => h.assignedTo === 'Mama').length}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Mama's Habits</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 text-green-600 font-roboto">
                    {habitData.habits.filter(h => h.assignedTo === 'Papa' && h.completed).length}/{habitData.habits.filter(h => h.assignedTo === 'Papa').length}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Papa's Habits</div>
                </div>
              </div>
            </div>
            
            {/* Habit List */}
            <div className="space-y-4">
              {habitData.habits.map((habit) => (
                <div 
                  key={habit.id} 
                  className="border rounded-lg"
                >
                  <div 
                    className={`p-4 flex justify-between items-center cursor-pointer ${
                      expandedHabits[habit.id] ? 'border-b' : ''
                    } ${habit.completed ? 'bg-green-50' : 'bg-white'}`}
                    onClick={() => toggleHabit(habit.id)}
                  >
                    <div className="flex items-center">
                      <div className={`mr-3 p-1 rounded-full ${
                        habit.completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {habit.completed ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <Target size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium font-roboto">{habit.title}</h4>
                        <p className="text-sm text-gray-600 font-roboto">
                          Assigned to: {habit.assignedTo}
                        </p>
                      </div>
                    </div>
                    {expandedHabits[habit.id] ? (
                      <ChevronUp size={18} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-500" />
                    )}
                  </div>
                  
                  {/* Expanded habit details */}
                  {expandedHabits[habit.id] && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4 font-roboto">{habit.description}</p>
                      
                      {/* Habit type and category */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {habit.category && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-roboto">
                            {habit.category}
                          </span>
                        )}
                        {habit.focusArea && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-roboto">
                            {habit.focusArea}
                          </span>
                        )}
                      </div>
                      
                      {/* Habit Progress Tracker */}
                      <HabitProgressTracker 
                        streak={habit.streak} 
                        record={habit.record} 
                        goalDays={habit.goalDays}
                        habit={habit}
                      />
                      
                      {/* Completion status */}
                      {habit.completed && (
                        <div className="flex items-center text-green-600 text-sm mb-4 mt-4 font-roboto">
                          <CheckCircle2 size={16} className="mr-1" />
                          <span>
                            Maintained through {formatDate(habit.completedDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {habitData.habits.length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No habits recorded for this cycle.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Family Meeting Section - ENHANCED VERSION */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('familyMeeting')}
        >
          <h3 className="text-lg font-semibold flex items-center font-roboto">
            <MessageCircle size={18} className="mr-2 text-amber-600" />
            Family Meeting
          </h3>
          {expandedSections.familyMeeting ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.familyMeeting && (
          <div className="p-6 pt-0">
            {/* Family Meeting Educational Info */}
            <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="text-base font-medium mb-2 font-roboto flex items-center">
                <Lightbulb className="text-amber-600 mr-2" size={18} />
                Why Family Meetings Matter
              </h4>
              <p className="text-sm text-amber-700 mb-3 font-roboto">
                Regular family meetings are essential for maintaining balance and open communication. 
                Research shows families who meet weekly report 67% fewer conflicts over household responsibilities.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    title: "Why Family Meetings Matter",
                    description: "Regular family meetings create structure, improve communication, and ensure all voices are heard.",
                    icon: <Info size={16} className="text-blue-600" />
                  },
                  {
                    title: "The Sprint Retrospective Format",
                    description: "This format (What went well, What could improve, Action items) comes from agile software development and helps teams continuously improve.",
                    icon: <Layers size={16} className="text-purple-600" />
                  },
                  {
                    title: "Research Finding",
                    description: "Studies show families who meet regularly report 42% higher satisfaction and better division of responsibilities.",
                    icon: <Lightbulb size={16} className="text-amber-600" />
                  }
                ].map((resource, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-amber-100">
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-2 flex-shrink-0">
                        {resource.icon}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium mb-1 font-roboto">{resource.title}</h5>
                        <p className="text-xs text-gray-600 font-roboto">{resource.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Meeting Agenda */}
            <div className="mb-6 border rounded-lg p-4">
              <h4 className="text-base font-medium mb-3 font-roboto flex items-center">
                <Layers className="text-gray-600 mr-2" size={18} />
                Meeting Agenda Structure
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 flex-shrink-0">1</div>
                  <div>
                    <h5 className="font-medium font-roboto">What Went Well (10 min)</h5>
                    <p className="text-sm text-gray-600 font-roboto">
                      Celebrate wins and progress from the past week. This builds positive momentum and reinforces good habits.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3 flex-shrink-0">2</div>
                  <div>
                    <h5 className="font-medium font-roboto">What Could Improve (10 min)</h5>
                    <p className="text-sm text-gray-600 font-roboto">
                      Identify challenges and obstacles to balance. This helps pinpoint specific areas that need attention.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0">3</div>
                  <div>
                    <h5 className="font-medium font-roboto">Action Items (10 min)</h5>
                    <p className="text-sm text-gray-600 font-roboto">
                      Create specific, actionable steps to address challenges. Each action should have a clear owner.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 flex-shrink-0">4</div>
                  <div>
                    <h5 className="font-medium font-roboto">Set Goals (5 min)</h5>
                    <p className="text-sm text-gray-600 font-roboto">
                      Define clear objectives for the next cycle to keep the family focused on progress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Meeting Notes Content */}
            {weekData.meetingNotes ? (
              <div className="border rounded-lg p-5 bg-white">
                <h4 className="text-base font-medium mb-4 font-roboto">Meeting Notes & Outcomes</h4>
                
                {/* What went well */}
                {weekData.meetingNotes.wentWell && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 text-green-600">✓</div>
                      <h5 className="font-medium text-green-800 font-roboto">What Went Well</h5>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.wentWell}
                    </div>
                    <div className="mt-2 ml-8">
                      <p className="text-xs text-green-600 italic font-roboto">
                        Celebrating successes creates positive reinforcement and motivates continued improvement.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* What could improve */}
                {weekData.meetingNotes.couldImprove && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 text-amber-600">⚠</div>
                      <h5 className="font-medium text-amber-800 font-roboto">What Could Improve</h5>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.couldImprove}
                    </div>
                    <div className="mt-2 ml-8">
                      <p className="text-xs text-amber-600 italic font-roboto">
                        Identifying challenges openly creates opportunities for growth and better balance.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Action items */}
                {weekData.meetingNotes.actionItems && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 text-blue-600">→</div>
                      <h5 className="font-medium text-blue-800 font-roboto">Action Items</h5>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.actionItems.split('\n').map((item, idx) => (
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
                    <div className="mt-2 ml-8">
                      <p className="text-xs text-blue-600 italic font-roboto">
                        Specific action items create accountability and clear next steps.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Kids' Corner - New Section */}
                {weekData.meetingNotes.kidsInput && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2 text-indigo-600">👪</div>
                      <h5 className="font-medium text-indigo-800 font-roboto">Kids' Corner</h5>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.kidsInput}
                    </div>
                    <div className="mt-2 ml-8">
                      <p className="text-xs text-indigo-600 italic font-roboto">
                        Including children in family discussions helps them understand balance and responsibility.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Next week goals */}
                {weekData.meetingNotes.nextWeekGoals && (
                  <div className="mb-5">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2 text-purple-600">🎯</div>
                      <h5 className="font-medium text-purple-800 font-roboto">Next Cycle Goals</h5>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.nextWeekGoals.split('\n').map((goal, idx) => (
                        goal.trim() ? (
                          <div key={idx} className="flex items-start mb-2">
                            <Star size={16} className="text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{goal}</span>
                          </div>
                        ) : null
                      ))}
                    </div>
                    <div className="mt-2 ml-8">
                      <p className="text-xs text-purple-600 italic font-roboto">
                        Setting clear goals provides direction and purpose for the coming week.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Additional notes */}
                {weekData.meetingNotes.additionalNotes && (
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 text-gray-600">📝</div>
                      <h5 className="font-medium text-gray-800 font-roboto">Additional Notes</h5>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 font-roboto ml-8">
                      {weekData.meetingNotes.additionalNotes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 font-roboto">No family meeting notes were recorded for this cycle.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Key Insights Section (Based on InitialSurveyTab) */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('insights')}
        >
          <h3 className="text-lg font-semibold font-roboto">Cycle {weekNumber} Insights</h3>
          {expandedSections.insights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.insights && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Actionable insights based on your family's survey data for this cycle
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  type: 'challenge',
                  title: `${getCategoryBalance()[0]?.category || "Category"} Imbalance`,
                  description: getCategoryBalance()[0] ? 
                    `There's a significant ${Math.abs(getCategoryBalance()[0].mama - 50).toFixed(0)}% imbalance in ${getCategoryBalance()[0].category}, with ${getCategoryBalance()[0].mama > 50 ? 'Mama' : 'Papa'} carrying most of the workload.` :
                    "There's a significant imbalance in task distribution that could be addressed.",
                  icon: <AlertTriangle size={20} className="text-amber-600" />
                },
                {
                  type: 'insight',
                  title: 'Different Perspectives',
                  description: 'Children often perceive workload differently than parents. Compare responses to identify perception gaps in your family.',
                  icon: <Lightbulb size={20} className="text-blue-600" />
                },
                {
                  type: 'actionable',
                  title: 'Invisible Work Gap',
                  description: `${familyResponseStats.categories["Invisible Household Tasks"]?.mamaPercent > familyResponseStats.categories["Visible Household Tasks"]?.mamaPercent ? 'Mama' : 'Papa'} handles significantly more invisible work compared to visible tasks. Invisible work often creates mental load that goes unrecognized.`,
                  icon: <ArrowRight size={20} className="text-purple-600" />
                },
                {
                  type: 'success',
                  title: 'Balance Progress',
                  description: `Your family's overall workload is currently split ${familyResponseStats.mamaPercent}% Mama / ${familyResponseStats.papaPercent}% Papa based on cycle ${weekNumber} survey responses.`,
                  icon: <Info size={20} className="text-green-600" />
                }
              ].map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    insight.type === 'progress' ? 'border-green-200 bg-green-50' :
                    insight.type === 'challenge' ? 'border-amber-200 bg-amber-50' :
                    insight.type === 'insight' ? 'border-blue-200 bg-blue-50' :
                    insight.type === 'success' ? 'border-green-200 bg-green-50' :
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
          </div>
        )}
      </div>
      
      {/* Survey Responses Explorer - ENHANCED VERSION */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('surveyResponses')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Cycle {weekNumber} Survey Responses
          </h3>
          {expandedSections.surveyResponses ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.surveyResponses && (
          <div className="p-6 pt-0">
            <div className="p-4 mb-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
              <div className="flex items-start">
                <Lightbulb size={20} className="text-blue-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">About Weekly Survey Responses</p>
                  <p>Allie selects 20 personalized questions each week for family members based on previous responses and areas needing attention. Questions marked as "not applicable" are removed from future surveys.</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 font-roboto">
              Explore how each family member responded to the weekly survey questions
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
            
            {/* Family Member Selection - Enhanced with colored initials */}
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
                        // Colored placeholder with initial
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
                            {familyMembers.find(m => m.id === selectedMember)?.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-lg">{familyMembers.find(m => m.id === selectedMember)?.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{familyMembers.find(m => m.id === selectedMember)?.role}</div>
                    </div>
                  </div>
                  
                  {/* Category filter (duplicate for responsive design) */}
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
                    {/* Question display panel - Enhanced with more context */}
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
                        
                        {/* Family member responses - IMPROVED */}
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
                                
                                // Search for response in multiple formats
                                let response = null;
                                
                                // Format 1: Direct key with memberId-questionId
                                const directKey = `${member.id}-${currentQuestion.id}`;
                                if (surveyResponses[directKey]) {
                                  response = surveyResponses[directKey];
                                }
                                
                                // Format 2: Just questionId (legacy format)
                                else if (surveyResponses[currentQuestion.id] && member.id === selectedMember) {
                                  response = surveyResponses[currentQuestion.id];
                                }
                                
                                // Format 3: Search for keys containing both memberId and questionId
                                else {
                                  Object.entries(surveyResponses).forEach(([key, value]) => {
                                    if (key.includes(member.id) && key.includes(currentQuestion.id)) {
                                      response = value;
                                    }
                                  });
                                }
                                
                                // Format 4: For initial survey data, key may just be the question ID
                                if (!response && member.id === selectedMember) {
                                  if (surveyResponses[currentQuestion.id]) {
                                    response = surveyResponses[currentQuestion.id];
                                  }
                                }
                                
                                // Try one more approach: For keys like "memberId_questionId"
                                if (!response) {
                                  const altKey = `${member.id}_${currentQuestion.id}`;
                                  if (surveyResponses[altKey]) {
                                    response = surveyResponses[altKey];
                                  }
                                }
                                
                                // Try with week prefix
                                if (!response) {
                                  const weekPrefixKey = `week-${weekNumber}-${member.id}-${currentQuestion.id}`;
                                  if (surveyResponses[weekPrefixKey]) {
                                    response = surveyResponses[weekPrefixKey];
                                  }
                                }
                                
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
                                <p>No responses recorded for this question yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Response Insights Section - NEW */}
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
                    
                    {/* Improved navigation controls */}
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
                    <p className="text-gray-500">No questions available for this family member.</p>
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
                    Each family member receives 20 personalized questions each week based on your family's needs
                  </p>
                </div>
              </div>
            )}
            
            {hasSurveyData ? null : (
              <div className="text-center py-6 bg-gray-50 rounded-lg mt-4">
                <p className="text-gray-500 font-roboto">No survey questions found for Cycle {weekNumber}.</p>
                <div className="text-sm text-gray-400 mt-2 font-roboto">
                  This could be because the responses were not saved correctly or the survey format changed.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Family Participation Section */}
      {weekData.familyMembers && weekData.familyMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-roboto">Family Participation</h3>
          
          <div className="flex flex-wrap gap-3">
            {weekData.familyMembers.map((member, index) => (
              <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg border">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mr-3 font-roboto">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium font-roboto">{member.name}</div>
                  <div className="text-sm text-gray-500 capitalize font-roboto">{member.role}</div>
                  {member.completedDate && (
                    <div className="text-xs text-green-600 font-roboto">
                      Completed survey on {formatDate(member.completedDate)}
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

export default WeekHistoryTab;