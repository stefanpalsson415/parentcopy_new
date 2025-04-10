import React, { useState, useEffect } from 'react';
import { Filter, Info, ChevronDown, ChevronUp, Lightbulb, ArrowRight, Edit, AlertTriangle, ArrowLeft, ArrowUp, ArrowDown, ChevronsLeft, ChevronsRight, User } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import QuestionFeedbackService from '../../../services/QuestionFeedbackService';
import QuestionFeedbackPanel from '../../survey/QuestionFeedbackPanel';

const InitialSurveyTab = () => {
  const { 
    familyMembers, 
    surveyResponses,
    familyId
  } = useFamily();
  
  const { 
    fullQuestionSet,
    getPersonalizedInitialQuestions, 
    selectPersonalizedInitialQuestions,
    getQuestionsByCategory
  } = useSurvey();
  
  // State for filters and expanded sections
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    insights: true,
    responses: false
  });
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
  
  // Profile colors for avatar placeholders - same as in FamilySelectionScreen
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
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load personalized questions and excluded questions
  useEffect(() => {
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
        const baseQuestions = selectPersonalizedInitialQuestions(fullQuestionSet, familyData, 72);
        
        // For each family member, get their personalized questions
        for (const member of familyMembers) {
          // For children, get child-specific excluded questions
          if (member.role === 'child') {
            const childExcluded = await QuestionFeedbackService.getQuestionsToExclude(familyId, member.id);
            excludedQuestionsMap[member.id] = childExcluded;
            
            // Filter questions for children (simpler subset)
            memberQuestions[member.id] = baseQuestions.filter(q => 
              !excludedQuestionsMap[member.id].includes(q.id)
            ).slice(0, 72); // Ensure max 72 questions
          } else {
            // For parents, use the full set minus excluded
            memberQuestions[member.id] = baseQuestions.filter(q => 
              !excludedQuestionsMap['family'].includes(q.id)
            ).slice(0, 72); // Ensure max 72 questions
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
        calculateFamilyResponseStats();
      } catch (error) {
        console.error("Error loading personalized questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPersonalizedData();
  }, [familyId, familyMembers, fullQuestionSet, selectPersonalizedInitialQuestions, surveyResponses]);
  
  // Calculate family response statistics
  const calculateFamilyResponseStats = () => {
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
    
    // Analyze responses
    Object.entries(surveyResponses).forEach(([key, response]) => {
      // Only count initial survey responses (not weekly ones)
      if (key.includes('week-') || key.includes('weekly-')) return;
      
      // Skip non Mama/Papa responses
      if (response !== 'Mama' && response !== 'Papa') return;
      
      // Extract question ID
      const questionId = key.includes('-') ? key.split('-').pop() : key;
      
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
  
  // Get radar chart data based on actual survey responses
  const getRadarData = (filter) => {
    // Use real data from family response stats
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Return formatted data for the radar chart
    return categories.map(category => {
      const categoryStats = familyResponseStats.categories[category] || {
        mamaPercent: 50,
        papaPercent: 50,
        total: 0
      };
      
      return {
        category: category.replace(" Tasks", ""),
        mama: categoryStats.mamaPercent || 50,
        papa: categoryStats.papaPercent || 50,
        total: categoryStats.total || 0
      };
    });
  };
  
  // Get key insights based on actual data
  const getKeyInsights = () => {
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Check if we have enough responses for meaningful insights
    if (familyResponseStats.completed < 10) {
      return [{
        type: 'info',
        title: 'More Responses Needed',
        description: 'Complete more survey questions to generate meaningful insights about your family workload balance.',
        icon: <Info size={20} className="text-blue-600" />
      }];
    }
    
    // Find most imbalanced category
    const categoryStats = categories.map(category => {
      const stats = familyResponseStats.categories[category] || { 
        mamaPercent: 50, 
        papaPercent: 50,
        total: 0
      };
      
      return {
        category,
        imbalance: Math.abs(stats.mamaPercent - 50),
        mamaPercent: stats.mamaPercent || 50,
        papaPercent: stats.papaPercent || 50,
        total: stats.total || 0
      };
    });
    
    categoryStats.sort((a, b) => b.imbalance - a.imbalance);
    
    // Generate insights based on data
    const insights = [];
    
    // Most imbalanced category
    if (categoryStats[0].imbalance > 10 && categoryStats[0].total > 2) {
      insights.push({
        type: 'challenge',
        title: `${categoryStats[0].category} Imbalance`,
        description: `There's a significant ${categoryStats[0].imbalance.toFixed(0)}% imbalance in ${categoryStats[0].category}, with ${categoryStats[0].mamaPercent > 50 ? 'Mama' : 'Papa'} carrying most of the workload.`,
        icon: <AlertTriangle size={20} className="text-amber-600" />
      });
    }
    
    // Compare parent vs. child perception if available
    if (familyMembers.some(m => m.role === 'child')) {
      insights.push({
        type: 'insight',
        title: 'Different Perspectives',
        description: 'Children often perceive workload differently than parents. Compare responses to identify perception gaps in your family.',
        icon: <Lightbulb size={20} className="text-blue-600" />
      });
    }
    
    // Invisible vs. visible work
    const invisibleCategories = ["Invisible Household Tasks", "Invisible Parental Tasks"];
    const visibleCategories = ["Visible Household Tasks", "Visible Parental Tasks"];
    
    const invisibleStats = invisibleCategories.reduce((acc, category) => {
      const stats = familyResponseStats.categories[category] || { 
        mama: 0, 
        papa: 0, 
        total: 0 
      };
      
      return {
        mama: acc.mama + stats.mama,
        papa: acc.papa + stats.papa,
        total: acc.total + stats.total
      };
    }, { mama: 0, papa: 0, total: 0 });
    
    const visibleStats = visibleCategories.reduce((acc, category) => {
      const stats = familyResponseStats.categories[category] || { 
        mama: 0, 
        papa: 0, 
        total: 0 
      };
      
      return {
        mama: acc.mama + stats.mama,
        papa: acc.papa + stats.papa,
        total: acc.total + stats.total
      };
    }, { mama: 0, papa: 0, total: 0 });
    
    // Calculate percentages
    const invisibleMamaPercent = invisibleStats.total > 0 
      ? Math.round((invisibleStats.mama / invisibleStats.total) * 100) 
      : 50;
      
    const visibleMamaPercent = visibleStats.total > 0 
      ? Math.round((visibleStats.mama / visibleStats.total) * 100) 
      : 50;
    
    // Add insight on invisible vs. visible work
    if (Math.abs(invisibleMamaPercent - visibleMamaPercent) > 10) {
      const higherInvisible = invisibleMamaPercent > visibleMamaPercent;
      
      insights.push({
        type: 'actionable',
        title: 'Invisible Work Gap',
        description: `${higherInvisible ? 'Mama' : 'Papa'} handles significantly more invisible work (${higherInvisible ? invisibleMamaPercent : 100-invisibleMamaPercent}%) compared to visible tasks (${higherInvisible ? visibleMamaPercent : 100-visibleMamaPercent}%). Invisible work often creates mental load that goes unrecognized.`,
        icon: <ArrowRight size={20} className="text-purple-600" />
      });
    }
    
    // Add general insight if we don't have enough specific ones
    if (insights.length < 2) {
      insights.push({
        type: 'insight',
        title: 'Starting Point',
        description: `Your family's overall workload is currently split ${familyResponseStats.mamaPercent}% Mama / ${familyResponseStats.papaPercent}% Papa based on survey responses.`,
        icon: <Info size={20} className="text-blue-600" />
      });
    }
    
    return insights;
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
        `week-1-${member.id}-${questionId}`,
        `weekly-1-${member.id}-${questionId}`,
        `week1-${member.id}-${questionId}`
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
  
  // Current question
  const currentQuestion = selectedMember && personalizedQuestions[selectedMember] 
    ? personalizedQuestions[selectedMember][currentQuestionIndex] 
    : null;
  
  // Get current question responses
  const currentResponses = getResponsesForCurrentQuestion();
  
  // COLORS
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 font-roboto">
      {/* Task Category Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('categories')}
        >
          <h3 className="text-lg font-semibold">Initial Survey: Task Category Distribution</h3>
          {expandedSections.categories ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.categories && (
          <div className="p-6 pt-0">
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
              
            <div className="mt-2 grid grid-cols-2 gap-2">
              {getRadarData(radarFilter).map((category, index) => (
                <div key={index} className="text-xs text-gray-500 flex justify-between items-center bg-gray-50 p-1 rounded">
                  <span>{category.category}</span>
                  <div className="flex items-center">
                    <span className="bg-blue-50 text-blue-700 px-1 rounded">
                      {category.total || 0} Qs
                    </span>
                  </div>
                </div>
              ))}
            </div>
              
            <div className="mt-4 text-sm text-center text-gray-500">
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
                Based on {familyResponseStats.completed} survey responses across {familyMembers.length} family members
              </p>
            </div>
          </div>
        )}
      </div>
        
      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('insights')}
        >
          <h3 className="text-lg font-semibold">Initial Survey: Key Insights</h3>
          {expandedSections.insights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.insights && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4">
              Actionable insights based on your family's initial survey
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getKeyInsights().map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    insight.type === 'progress' ? 'border-green-200 bg-green-50' :
                    insight.type === 'challenge' ? 'border-amber-200 bg-amber-50' :
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
          </div>
        )}
      </div>
      
      {/* Survey Responses Explorer - Redesigned with insights */}
<div className="bg-white rounded-lg shadow">
  <div 
    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
    onClick={() => toggleSection('responses')}
  >
    <h3 className="text-lg font-semibold">Survey Response Explorer</h3>
    {expandedSections.responses ? (
      <ChevronUp size={20} className="text-gray-500" />
    ) : (
      <ChevronDown size={20} className="text-gray-500" />
    )}
  </div>
  
  {expandedSections.responses && (
    <div className="p-6 pt-0">
      <div className="p-4 mb-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
        <div className="flex items-start">
          <Lightbulb size={20} className="text-blue-600 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">About Personalized Questions</p>
            <p>Allie selects 72 questions for each family member based on your family's structure and needs. Questions marked as "not applicable" are removed from future surveys. You can review and adjust question feedback here.</p>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Explore how each family member responded to the initial survey questions
      </p>
      
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
            
            {/* Category filter */}
            <div className="flex items-center">
              <Filter size={16} className="text-gray-500 mr-2" />
              <span className="text-sm mr-2">Filter by category:</span>
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
              Each family member receives 72 personalized questions based on your family's unique needs
            </p>
          </div>
        </div>
      )}
    </div>
  )}
</div>
      
      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Task Category Breakdown</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getRadarData(radarFilter)}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => [`${value}%`, name === 'mama' ? 'Mama' : 'Papa']}
                labelFormatter={(label) => `${label} Tasks`}
              />
              <Legend />
              <Bar dataKey="mama" name="Mama" fill={MAMA_COLOR} />
              <Bar dataKey="papa" name="Papa" fill={PAPA_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-center text-gray-500 mt-2">
          Distribution of tasks by category showing percentage handled by each parent
        </p>
      </div>
      
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

export default InitialSurveyTab;