import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Heart, Shield, TrendingUp, Clock, Brain, 
  BarChart2, PieChart, LineChart, CircleUser, Users, 
  Calendar, CheckCircle, Activity, Lightbulb, Award,
  ChevronDown, ChevronUp, Maximize, Minimize,
  AlertTriangle, Target, ArrowRight, Star, Sparkles,
  Plus, Info, ThumbsUp, MoreHorizontal
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import AllieAIService from '../../../services/AllieAIService';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import DatabaseService from '../../../services/DatabaseService';

import { 
  ResponsiveContainer, PieChart as RechartPie, Pie, Cell, 
  LineChart as RechartLine, Line, BarChart, Bar,
  AreaChart, Area, ComposedChart, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// Main Dashboard Component
const DashboardTab = () => {
  // Access family data from context
  const { 
    familyId,
    familyName,
    familyMembers,
    surveyResponses,
    completedWeeks, 
    currentWeek,
    getWeekHistoryData,
    impactInsights,
    taskRecommendations,
    taskEffectivenessData,
    familyPriorities,
    weightedScores: globalWeightedScores,
    setWeightedScores: setGlobalWeightedScores,
    weekHistory,
    loadCurrentWeekTasks
  } = useFamily();
  
  // Access survey data from context
  const { fullQuestionSet } = useSurvey();
  
  // State for expanded/collapsed sections and loading indicators
  const [expandedSections, setExpandedSections] = useState({
    harmonyPulse: true,
    memberJourneys: true,
    childDevelopment: true,
    timeline: true,
    impactHub: true
  });
  
  // State for various data metrics and loading
  const [loading, setLoading] = useState({
    harmonyPulse: true,
    memberJourneys: true,
    childDevelopment: true,
    timeline: true,
    impactHub: true
  });
  
  // State for time filter
  const [timeFilter, setTimeFilter] = useState('all');
  
  // State for weighted scores and harmony metrics
  const [weightedScores, setWeightedScores] = useState(null);
  const [harmonyScore, setHarmonyScore] = useState(null);
  const [memberInsights, setMemberInsights] = useState({});
  const [childInsights, setChildInsights] = useState({});
  const [timelineData, setTimelineData] = useState([]);
  const [impactData, setImpactData] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childTrackingData, setChildTrackingData] = useState({});
  
  // State for creating habits from insights
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitDetails, setNewHabitDetails] = useState({
    title: '',
    description: '',
    assignedTo: '',
    category: ''
  });
  
  // Toggle expanded sections - modified to prevent propagation
  const toggleSection = useCallback((section, event) => {
    if (event) {
      // Only trigger if clicked directly on the header, not on child elements
      if (event.currentTarget === event.target || 
          event.target.closest('.section-header-clickable')) {
        setExpandedSections(prev => ({
          ...prev,
          [section]: !prev[section]
        }));
      }
    } else {
      // For programmatic toggling without event
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  }, []);
  
  // Helper function to stop propagation for interactive elements
  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  // Helper function to format date
  const formatDate = (date) => {
    if (!date) return "Not available";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Helper function to determine if a user is a child
  const isChild = (member) => {
    return member.role === 'child';
  };
  
  // Helper function to determine if a user is a parent
  const isParent = (member) => {
    return member.role === 'parent';
  };
  
  // Get parents and children from family members
  const parents = useMemo(() => familyMembers.filter(isParent), [familyMembers]);
  const children = useMemo(() => familyMembers.filter(isChild), [familyMembers]);
  
  // Handle habit creation
  const createHabitFromInsight = useCallback(async (insightData) => {
    try {
      if (!familyId) return;
      
      // Create a new habit from the insight
      const habitData = {
        title: insightData.title || 'New Habit from Insight',
        description: insightData.description || '',
        assignedTo: insightData.assignTo || parents[0]?.roleType || 'Papa',
        assignedToName: parents.find(p => p.roleType === (insightData.assignTo || 'Papa'))?.name || 'Parent',
        category: insightData.category || 'Invisible Parental Tasks',
        focusArea: insightData.focusArea || insightData.category || 'Balance Improvement',
        isAIGenerated: true,
        aiInsight: insightData.insight || 'This habit will help improve family balance',
        subTasks: [
          {
            id: `habit-subtask-${Date.now()}-1`,
            title: "Plan specific steps",
            description: "Define clear actions for this habit",
            completed: false
          },
          {
            id: `habit-subtask-${Date.now()}-2`,
            title: "Implement consistently",
            description: "Practice this habit regularly",
            completed: false
          },
          {
            id: `habit-subtask-${Date.now()}-3`,
            title: "Reflect on impact",
            description: "Evaluate how this habit affects family balance",
            completed: false
          }
        ],
        createdAt: new Date().toISOString(),
        createdFrom: 'insight',
        cycleNumber: currentWeek
      };
      
      // Add a unique ID
      habitData.id = `cycle${currentWeek}-habit-${Date.now()}`;
      
      // Add to task recommendations (which are actually habits)
      const updatedHabits = [...(taskRecommendations || []), habitData];
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({
        tasks: updatedHabits, // Tasks collection is used for habits in the database
        updatedAt: new Date().toISOString()
      }, familyId);
      
      // Reload habits to reflect changes
      await loadCurrentWeekTasks();
      
      // Show success message
      alert(`New habit "${habitData.title}" created successfully!`);
      
      return true;
    } catch (error) {
      console.error("Error creating habit from insight:", error);
      alert("Failed to create habit. Please try again.");
      return false;
    }
  }, [familyId, taskRecommendations, parents, currentWeek, loadCurrentWeekTasks]);
  
 // Effect hook to load all dashboard data
useEffect(() => {
  const loadDashboardData = async () => {
    try {
      // Set all sections to loading
      setLoading({
        harmonyPulse: true,
        memberJourneys: true,
        childDevelopment: true,
        timeline: true,
        impactHub: true
      });
      
      if (!familyId) {
        console.log("No family ID available, cannot load dashboard data");
        return;
      }
      
      console.log("Loading dashboard data for family:", familyId);
      
      // 1. Calculate weighted scores for Harmony Pulse
      if (fullQuestionSet && Object.keys(surveyResponses).length > 0) {
        const scores = calculateBalanceScores(fullQuestionSet, surveyResponses, familyPriorities);
        setWeightedScores(scores);
        
        // Update global state with weighted scores for other components
        if (scores && typeof setGlobalWeightedScores === 'function') {
          setGlobalWeightedScores(scores);
        }
        
        // Calculate harmony score (0-100) based on balance and other factors
        const balanceScore = calculateHarmonyScore(scores);
        setHarmonyScore(balanceScore);
        
        setLoading(prev => ({ ...prev, harmonyPulse: false }));
      } else {
        console.log("Insufficient data for weighted scores calculation");
        setLoading(prev => ({ ...prev, harmonyPulse: false }));
      }
      
      // Add a short delay before making more AI calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. Generate member-specific insights using AI Service
      const memberData = {};
      
      for (const member of familyMembers) {
        // Different approach for parents vs children
        if (isParent(member)) {
          try {
            // Use AllieAIService for parent insights
            const insights = await AllieAIService.generateDashboardInsights(
              familyId,
              currentWeek,
              { memberId: member.id, memberType: 'parent', componentId: 'memberJourneys' }
            );
            
            // Process and format the insights
            memberData[member.id] = processParentInsights(member, insights);
            
            // Add a small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Error generating AI insights for parent ${member.id}:`, error);
            // Fallback to regular analysis if AI fails
            memberData[member.id] = await generateParentInsights(member);
          }
        } else if (isChild(member)) {
          try {
            // Use AllieAIService for child journey insights
            const insights = await AllieAIService.generateDashboardInsights(
              familyId,
              currentWeek,
              { memberId: member.id, memberType: 'child', componentId: 'memberJourneys' }
            );
            
            // Process and format the insights
            memberData[member.id] = processChildJourneyInsights(member, insights);
            
            // Add a small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Error generating AI insights for child ${member.id}:`, error);
            // Fallback to regular analysis if AI fails
            memberData[member.id] = await generateChildJourneyInsights(member);
          }
        }
      }
      
      setMemberInsights(memberData);
      setLoading(prev => ({ ...prev, memberJourneys: false }));
      
      // Add a short delay before making more AI calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Load child tracking data for all children
      const trackingData = {};
      
      for (const child of children) {
        try {
          // Fetch child-specific tracking data from database
          const childData = await fetchChildTrackingData(child.id);
          trackingData[child.id] = childData;
        } catch (error) {
          console.error(`Error loading tracking data for child ${child.id}:`, error);
          trackingData[child.id] = null;
        }
      }
      
      setChildTrackingData(trackingData);
      
      // 4. Generate child development insights using AI service
      const childDevelopmentData = {};
      
      for (const child of children) {
        try {
          // Use AllieAIService to generate insights with real data
          const insights = await AllieAIService.generateChildInsights(
            familyId, 
            { childId: child.id, childData: trackingData[child.id] }
          );
          
          childDevelopmentData[child.id] = insights;
          
          // Add a small delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error generating AI insights for child ${child.id}:`, error);
          // Fallback to local generation if AI service fails
          childDevelopmentData[child.id] = await generateChildDevelopmentInsights(child, trackingData[child.id]);
        }
      }
      
      setChildInsights(childDevelopmentData);
      setLoading(prev => ({ ...prev, childDevelopment: false }));
      
      // 5. Build transformation timeline data
      const timeline = await buildTimelineData();
      setTimelineData(timeline);
      setLoading(prev => ({ ...prev, timeline: false }));
      
      // Add a longer delay before making the final AI call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 6. Calculate impact data using AI service
      let impact;
      try {
        impact = await AllieAIService.generateBalanceImpactData(familyId, currentWeek);
      } catch (error) {
        console.error("Error generating AI impact data:", error);
        // Fallback to local calculation if AI fails
        impact = await calculateImpactData();
      }
      
      setImpactData(impact);
      setLoading(prev => ({ ...prev, impactHub: false }));
      
      // Set first parent as default selected member if none selected
      if (!selectedMember && parents.length > 0) {
        setSelectedMember(parents[0].id);
      }
      
      // Set first child as default selected child if none selected
      if (!selectedChildId && children.length > 0) {
        setSelectedChildId(children[0].id);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      
      // Set all sections to not loading on error
      setLoading({
        harmonyPulse: false,
        memberJourneys: false,
        childDevelopment: false,
        timeline: false,
        impactHub: false
      });
    }
  };
  
  loadDashboardData();
}, [familyId, fullQuestionSet, surveyResponses, familyMembers, selectedMember, selectedChildId, completedWeeks, currentWeek, children, parents]);

  // Fetch child tracking data from database
  const fetchChildTrackingData = async (childId) => {
    if (!familyId || !childId) return null;
    
    try {
      // Fetch from Firebase
      const docRef = await DatabaseService.loadFamilyData(familyId);
      
      if (!docRef || !docRef.childrenData || !docRef.childrenData[childId]) {
        return {
          medicalAppointments: [],
          growthData: [],
          activities: []
        };
      }
      
      return docRef.childrenData[childId];
    } catch (error) {
      console.error(`Error fetching child tracking data for ${childId}:`, error);
      return null;
    }
  };
  
  // Process parent insights from AI service response
  const processParentInsights = (parent, aiInsights) => {
    // Extract assigned habits
    const assignedHabits = (taskRecommendations || [])
      .filter(task => task.assignedTo === parent.roleType)
      .map(task => ({
        ...task,
        completionRate: task.completed ? 100 : 0
      }));
    
    // Calculate completions
    const completedHabits = assignedHabits.filter(task => task.completed);
    
    // Process AI insights if provided
    let personalizedInsights = [];
    
    if (aiInsights && aiInsights.insights) {
      personalizedInsights = aiInsights.insights
        .filter(insight => {
          return insight.category === parent.roleType || 
                !insight.category || 
                insight.category === 'general';
        })
        .map(insight => ({
          title: insight.title || 'Personal Insight',
          description: insight.description || insight.actionItem || 'Personalized recommendation',
          category: insight.category || 'general'
        }));
    }
    
    // Calculate strengths and growth areas from habits
    const strengthCategories = completedHabits.reduce((acc, task) => {
      const category = task.category || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const strengths = Object.entries(strengthCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        description: getCategoryDescription(category)
      }));
    
    const growthCategories = assignedHabits
      .filter(task => !task.completed)
      .reduce((acc, task) => {
        const category = task.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
    
    const growthAreas = Object.entries(growthCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        description: getCategoryDescription(category)
      }));
    
    return {
      strengths: strengths.slice(0, 3),
      growthAreas: growthAreas.slice(0, 3),
      taskCompletionRate: assignedHabits.length > 0 
        ? Math.round((completedHabits.length / assignedHabits.length) * 100) 
        : 0,
      personalizedInsights: personalizedInsights.length > 0 ? personalizedInsights : 
        [{ 
          title: "Start Building Habits", 
          description: "Complete more cycles to generate personalized insights", 
          category: "general" 
        }],
      taskDistribution: groupTasksByCategory(assignedHabits)
    };
  };
  
  // Process child insights from AI service response
  const processChildJourneyInsights = (child, aiInsights) => {
    let strengths = [];
    let contributionsRecognized = false;
    let participationGrowth = "Just getting started";
    
    // Process AI insights if provided
    if (aiInsights && aiInsights.insights) {
      // Extract strengths from AI insights
      strengths = aiInsights.insights
        .filter(insight => insight.type === 'strength' || insight.category === 'strength')
        .map(insight => ({
          title: insight.title || 'Strength',
          description: insight.description || insight.content || 'Unique quality'
        }));
      
      // Extract contribution recognition
      const contributionInsight = aiInsights.insights.find(
        insight => insight.type === 'contribution' || insight.category === 'participation'
      );
      
      if (contributionInsight) {
        contributionsRecognized = true;
        participationGrowth = contributionInsight.description || "Increasing participation over time";
      }
    }
    
    // If no strengths were found in AI insights, generate some
    if (strengths.length === 0) {
      strengths = generateChildStrengths(child);
    }
    
    // Use child data from tracking if available
    const childAge = child.age ? parseInt(child.age) : null;
    
    return {
      contributionsRecognized,
      ageAppropriateProgress: childAge,
      participationGrowth,
      strengths: strengths.slice(0, 3)
    };
  };
  
  // Function to calculate harmony score from various metrics
const calculateHarmonyScore = (scores) => {
  // Start with a base score
  let harmonyScore = 70;
  
  if (!scores || !scores.categoryBalance) return harmonyScore;
  
  // Calculate weighted average imbalance across categories - accounts for varying question counts
  const categories = Object.values(scores.categoryBalance);
  
  // Calculate total weight based on question counts per category
  const totalWeight = categories.reduce((sum, cat) => sum + (cat.questionCount || 1), 0);
  const weightedImbalance = categories.reduce((sum, cat) => {
    // Weight by question count and category importance
    const categoryImportance = 
      cat.category === "Invisible Parental Tasks" ? 1.3 :
      cat.category === "Invisible Household Tasks" ? 1.2 : 
      cat.category === "Visible Parental Tasks" ? 1.1 : 1.0;
    
    // If we have question count, use it for weighting, otherwise treat all equally
    const weight = (cat.questionCount || 1) * categoryImportance;
    return sum + (Math.abs(cat.imbalance) * weight);
  }, 0) / totalWeight;
  
  // Adjust score based on imbalance (more imbalance = lower score)
  harmonyScore -= weightedImbalance / 2;
  
  // Adjust for completed habits (more completed habits = higher score)
  const completedHabitsCount = (taskRecommendations || []).filter(t => t.completed).length;
  harmonyScore += completedHabitsCount * 2;
  
  // Cap score between 0 and 100
  return Math.max(0, Math.min(100, Math.round(harmonyScore)));
};
  
  // Function to generate insights for a parent using direct data analysis
  const generateParentInsights = async (parent) => {
    try {
      // Filter responses specific to this parent
      const parentResponses = Object.entries(surveyResponses)
        .filter(([key, value]) => {
          return key.includes(parent.id) || value === parent.roleType;
        })
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
      
      // Get habits assigned to this parent
      const assignedHabits = (taskRecommendations || [])
        .filter(task => task.assignedTo === parent.roleType)
        .map(task => ({
          ...task,
          completionRate: task.completed ? 100 : 0
        }));
      
      // Calculate strength areas based on habit completion history
      const completedHabits = assignedHabits.filter(task => task.completed);
      
      const strengthCategories = completedHabits.reduce((acc, task) => {
        const category = task.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      // Find top strength category
      const strengths = Object.entries(strengthCategories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({
          category,
          count,
          description: getCategoryDescription(category)
        }));
      
      // Calculate growth areas based on incomplete habits and imbalances
      const incompleteHabits = assignedHabits.filter(task => !task.completed);
      
      const growthCategories = incompleteHabits.reduce((acc, task) => {
        const category = task.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      // Find top growth category
      const growthAreas = Object.entries(growthCategories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({
          category,
          count,
          description: getCategoryDescription(category)
        }));
      
      // Create personalized insights based on available data
      let personalizedInsights = [];
      
      // Add default insights if none were generated
      if (personalizedInsights.length === 0) {
        personalizedInsights = [
          {
            title: 'Balance Opportunity',
            description: `Focus on ${growthAreas[0]?.category || 'shared responsibilities'} to improve your family's balance.`,
            category: 'balance'
          },
          {
            title: 'Habit Consistency',
            description: 'Regular practice of balance habits leads to lasting change in family dynamics.',
            category: 'habits'
          }
        ];
      }
      
      // Return compiled insights
      return {
        strengths: strengths.slice(0, 3),
        growthAreas: growthAreas.slice(0, 3),
        taskCompletionRate: assignedHabits.length > 0 
          ? Math.round((completedHabits.length / assignedHabits.length) * 100) 
          : 0,
        personalizedInsights,
        taskDistribution: groupTasksByCategory(assignedHabits)
      };
    } catch (error) {
      console.error(`Error generating insights for parent ${parent.id}:`, error);
      return {
        strengths: [],
        growthAreas: [],
        taskCompletionRate: 0,
        personalizedInsights: [],
        taskDistribution: []
      };
    }
  };
  
  // Function to generate journey insights for a child
  const generateChildJourneyInsights = async (child) => {
    try {
      // For children, we focus on contributions and developmental aspects
      
      // Filter for child-specific data
      const childData = weekHistory ? Object.values(weekHistory)
        .filter(week => week && week.familyMembers)
        .map(week => week.familyMembers.find(m => m.id === child.id))
        .filter(Boolean) : [];
      
      // Generate age-appropriate insights
      const childAge = child.age ? parseInt(child.age) : null;
      
      // Try to get tracking data
      const tracking = childTrackingData[child.id];
      let participationGrowth = "Just getting started";
      
      if (tracking && tracking.activities && tracking.activities.length > 0) {
        participationGrowth = "Participating in regular activities";
      } else if (childData.length > 1) {
        participationGrowth = "Increasing participation over time";
      }
      
      // Return compiled insights
      return {
        contributionsRecognized: childData.length > 0 || (tracking && Object.keys(tracking).length > 0),
        ageAppropriateProgress: childAge,
        participationGrowth,
        strengths: generateChildStrengths(child)
      };
    } catch (error) {
      console.error(`Error generating journey insights for child ${child.id}:`, error);
      return {
        contributionsRecognized: false,
        ageAppropriateProgress: null,
        participationGrowth: "Could not calculate",
        strengths: []
      };
    }
  };
  
  // Generate child development insights
  const generateChildDevelopmentInsights = async (child, childData) => {
    try {
      // Generate insights using child-specific data
      const childAge = child.age ? parseInt(child.age) : null;
      
      // Create development milestones based on child age
      const milestones = generateAgeMilestones(childAge, child.name);
      
      // Generate emotional intelligence insights
      const emotionalInsights = generateEmotionalInsights(child);
      
      // Generate parental balance suggestions
      const parentalBalanceSuggestions = generateParentalBalanceSuggestions(child);
      
      // Generate AI insights based on tracking data
      let aiInsights = [];
      
      // Use tracking data if available
      if (childData) {
        // Generate growth insights if we have growth data
        if (childData.growthData && childData.growthData.length > 0) {
          aiInsights.push({
            title: 'Growth Pattern',
            description: `Regular growth tracking shows ${child.name} is developing consistently.`,
            type: 'growth',
            actionItem: 'Continue to record measurements quarterly for consistent tracking.'
          });
        }
        
        // Generate medical insights if we have appointment data
        if (childData.medicalAppointments && childData.medicalAppointments.length > 0) {
          // Find most recent appointment
          const sortedAppointments = [...childData.medicalAppointments]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          
          if (sortedAppointments.length > 0) {
            const recentAppointment = sortedAppointments[0];
            aiInsights.push({
              title: 'Medical Care',
              description: `Last appointment on ${formatDate(recentAppointment.date)} for ${recentAppointment.title || 'checkup'}.`,
              type: 'medical',
              actionItem: 'Schedule next regular checkup to maintain consistent healthcare.'
            });
          }
        }
        
        // Generate activity insights if we have activity data
        if (childData.activities && childData.activities.length > 0) {
          aiInsights.push({
            title: 'Activity Engagement',
            description: `${child.name} participates in ${childData.activities.length} regular activities.`,
            type: 'activity',
            actionItem: 'Ensure both parents participate equally in supporting these activities.'
          });
        }
      }
      
      return {
        milestones,
        emotionalInsights,
        suggestions: parentalBalanceSuggestions,
        aiInsights: aiInsights.length > 0 ? aiInsights : [
          {
            title: 'Start Tracking',
            description: `Begin recording ${child.name}'s growth, appointments, and activities for more personalized insights.`,
            type: 'recommendation',
            actionItem: 'Visit the Child Tracking tab to add information about milestones and development.'
          }
        ]
      };
    } catch (error) {
      console.error(`Error generating development insights for child ${child.id}:`, error);
      return {
        milestones: [],
        emotionalInsights: [],
        suggestions: [],
        aiInsights: []
      };
    }
  };
  
  // Generate age-appropriate milestones based on child's age
  const generateAgeMilestones = (age, name) => {
    if (!age) return [];
    
    // Define age groups and milestones
    const milestonesByAge = {
      // Toddlers (1-3)
      toddler: [
        { title: 'Language Development', description: 'Expanding vocabulary and simple sentences' },
        { title: 'Motor Skills', description: 'Running, climbing, and exploring' },
        { title: 'Social Development', description: 'Beginning to engage in parallel play' }
      ],
      // Preschoolers (3-5)
      preschool: [
        { title: 'Emotional Regulation', description: 'Learning to identify and express feelings' },
        { title: 'Cognitive Growth', description: 'Asking questions and learning concepts' },
        { title: 'Independence', description: 'Developing self-care routines' }
      ],
      // School Age (6-12)
      schoolAge: [
        { title: 'Academic Development', description: 'Reading, writing, and critical thinking' },
        { title: 'Peer Relationships', description: 'Building friendships and social skills' },
        { title: 'Responsibility', description: 'Taking on age-appropriate tasks' }
      ],
      // Teenagers (13-18)
      teen: [
        { title: 'Identity Formation', description: 'Developing sense of self and values' },
        { title: 'Higher Thinking', description: 'Abstract reasoning and future planning' },
        { title: 'Independence', description: 'Preparing for adulthood and responsibility' }
      ]
    };
    
    // Determine age group
    let ageGroup;
    if (age < 3) {
      ageGroup = 'toddler';
    } else if (age < 6) {
      ageGroup = 'preschool';
    } else if (age < 13) {
      ageGroup = 'schoolAge';
    } else {
      ageGroup = 'teen';
    }
    
    // Return age-appropriate milestones
    return milestonesByAge[ageGroup].map(milestone => ({
      ...milestone,
      childName: name
    }));
  };
  
  // Generate emotional intelligence insights
  const generateEmotionalInsights = (child) => {
    const insights = [
      {
        title: 'Emotional Recognition',
        description: `${child.name} is developing the ability to recognize and name emotions.`,
        suggestion: 'Both parents should regularly discuss feelings during daily activities.'
      },
      {
        title: 'Self-Regulation',
        description: `Learning to manage emotions effectively is a key skill for ${child.name}'s age group.`,
        suggestion: 'Consistent approaches from both parents help develop emotional regulation.'
      },
      {
        title: 'Empathy Development',
        description: `${child.name} is learning to understand other people's perspectives and feelings.`,
        suggestion: 'Model empathy in your own interactions to teach this important skill.'
      }
    ];
    
    return insights;
  };
  
  // Generate parental balance suggestions specific to this child
  const generateParentalBalanceSuggestions = (child) => {
    // Base suggestions on family data if possible
    const balanceData = weightedScores?.categoryBalance || {};
    const imbalancedCategories = Object.entries(balanceData)
      .sort((a, b) => Math.abs(b[1].imbalance) - Math.abs(a[1].imbalance))
      .slice(0, 2)
      .map(([category, _]) => category);
    
    // Create child-specific balance suggestions
    return [
      {
        title: 'Balanced Attention',
        description: `Equal engagement from both parents helps ${child.name} develop secure attachments.`,
        imbalancedArea: imbalancedCategories[0] || 'Parental Tasks',
        actionable: true
      },
      {
        title: 'Consistent Approaches',
        description: `When parents align on expectations and routines, ${child.name} feels more secure.`,
        imbalancedArea: imbalancedCategories[1] || 'Household Tasks',
        actionable: true
      },
      {
        title: 'Shared Special Time',
        description: `Each parent should have regular one-on-one time with ${child.name} to build connection.`,
        imbalancedArea: 'Quality Time',
        actionable: true
      }
    ];
  };
  
  // Generate strengths for a child
  const generateChildStrengths = (child) => {
    // These would ideally come from survey data or AI
    // For now using placeholder strengths based on child's name for demonstration
    const nameSum = child.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    const possibleStrengths = [
      { title: 'Creativity', description: 'Shows imagination in play and activities' },
      { title: 'Empathy', description: "Demonstrates care for others' feelings" },
      { title: 'Curiosity', description: 'Always eager to learn new things' },
      { title: 'Persistence', description: 'Keeps trying even when things are difficult' },
      { title: 'Leadership', description: 'Takes initiative in group settings' },
      { title: 'Adaptability', description: 'Handles changes in routine well' },
      { title: 'Problem Solving', description: 'Finds creative solutions to challenges' },
      { title: 'Teamwork', description: 'Works well with others on shared tasks' }
    ];
    
    // Select strengths pseudo-randomly based on name
    const strengthIndices = [];
    let index = nameSum % possibleStrengths.length;
    
    for (let i = 0; i < 3; i++) {
      strengthIndices.push(index);
      index = (index + 3) % possibleStrengths.length;
    }
    
    return strengthIndices.map(i => possibleStrengths[i]);
  };
  
  // Build timeline data from cycle history - updated to use actual values
  const buildTimelineData = async () => {
    const timeline = [];
    
    // Add initial survey as first point if available
    if (weekHistory && weekHistory.initial) {
      const initialData = weekHistory.initial;
      
      // Extract actual balance data or use default if not available
      const initialBalance = initialData.balance || 
                            (initialData.responses ? calculateBalanceFromResponses(initialData.responses) : { mama: 50, papa: 50 });
      
      timeline.push({
        cycleNumber: 0,
        label: 'Initial Survey',
        date: formatDate(initialData.completionDate),
        balance: initialBalance,
        completedHabits: 0,
        keyEvent: 'Started family balance journey'
      });
    }
    
    // Add data for each completed cycle (week)
    completedWeeks.forEach(cycleNum => {
      const cycleData = getWeekHistoryData(cycleNum);
      
      if (cycleData) {
        // Extract actual balance data or use default if not available
        const cycleBalance = cycleData.balance || 
                           (cycleData.surveyResponses ? calculateBalanceFromResponses(cycleData.surveyResponses) : { mama: 50, papa: 50 });
        
        // Count completed habits
        const completedHabits = (cycleData.tasks || []).filter(t => t.completed).length;
        
        // Determine if this was a key event cycle
        const isKeyEvent = completedHabits > 2 || (cycleBalance && Math.abs(cycleBalance.mama - 50) < 5);
        
        timeline.push({
          cycleNumber: cycleNum,
          label: `Cycle ${cycleNum}`,
          date: formatDate(cycleData.completionDate),
          balance: cycleBalance,
          completedHabits,
          keyEvent: isKeyEvent ? 
            (completedHabits > 2 ? 'Achievement milestone' : 'Balance milestone') : null
        });
      }
    });
    
    // Add current cycle if not in completed cycles
    if (!completedWeeks.includes(currentWeek)) {
      // Try to get actual current balance data
      let currentBalance = { mama: 50, papa: 50 }; // Default
      
      if (weightedScores && weightedScores.overallBalance) {
        currentBalance = {
          mama: weightedScores.overallBalance.mama,
          papa: weightedScores.overallBalance.papa
        };
      }
      
      timeline.push({
        cycleNumber: currentWeek,
        label: `Current (Cycle ${currentWeek})`,
        date: formatDate(new Date()),
        balance: currentBalance,
        completedHabits: (taskRecommendations || []).filter(t => t.completed).length,
        current: true
      });
    }
    
    return timeline.sort((a, b) => a.cycleNumber - b.cycleNumber);
  };
  
  // Helper function to calculate balance from survey responses
  const calculateBalanceFromResponses = (responses) => {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses || {}).forEach(response => {
      if (response === 'Mama' || response === 'Papa') {
        totalCount++;
        if (response === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    const mamaPercentage = totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
    
    return {
      mama: mamaPercentage,
      papa: 100 - mamaPercentage
    };
  };
  
  // Calculate impact data with AI-driven experiments
  const calculateImpactData = async () => {
    try {
      // Calculate time saved based on habit balance improvements
      let timeSaved = 0;
      let relationshipBoost = 0;
      let stressReduction = 0;
      
      // If we have enough timeline data, use it to calculate
      if (timelineData.length >= 2) {
        const initialBalance = timelineData[0].balance;
        const currentBalance = timelineData[timelineData.length - 1].balance;
        
        // Calculate improvement in balance
        const initialImbalance = Math.abs(initialBalance.mama - initialBalance.papa);
        const currentImbalance = Math.abs(currentBalance.mama - currentBalance.papa);
        const improvement = initialImbalance - currentImbalance;
        
        // For each 10% improvement in balance, estimate 2 hours saved per week
        timeSaved = Math.max(0, Math.round((improvement / 10) * 2));
        
        // Relationship boost is directly related to balance improvement
        relationshipBoost = Math.min(100, Math.max(0, 50 + improvement * 2));
        
        // Stress reduction is also related to balance improvement
        stressReduction = Math.min(100, Math.max(0, 40 + improvement * 1.5));
      } else {
        // Default values if we don't have enough data
        timeSaved = 1;
        relationshipBoost = 55;
        stressReduction = 45;
      }
      
      // Get total completed habits
      const completedHabits = (taskRecommendations || []).filter(t => t.completed).length;
      
      // Generate experiment ideas
      const experiments = await generateBalanceExperiments();
      
      return {
        timeSaved,
        relationshipBoost,
        stressReduction,
        completedHabits,
        experiments
      };
    } catch (error) {
      console.error("Error calculating impact data:", error);
      return {
        timeSaved: 0,
        relationshipBoost: 0,
        stressReduction: 0,
        completedHabits: 0,
        experiments: []
      };
    }
  };
  
  // Generate balance experiments - now AI-powered
  const generateBalanceExperiments = async () => {
    try {
      // Try to get AI-powered experiments first
      try {
        const aiExperiments = await AllieAIService.generateBalanceExperiments(familyId, weightedScores);
        
        if (aiExperiments && Array.isArray(aiExperiments) && aiExperiments.length > 0) {
          return aiExperiments;
        }
      } catch (aiError) {
        console.error("Error generating AI experiments:", aiError);
        // Continue with backup approach if AI fails
      }
      
      // Backup approach: Generate experiments based on imbalance data
      let experiments = [
        {
          title: "Weekly Role Reversal",
          description: "Switch roles for one day each cycle - the parent who usually handles meals tries childcare, and vice versa.",
          estimatedImpact: "May improve balance by ~7% in targeted categories",
          difficulty: "moderate",
          actionable: true
        },
        {
          title: "Shared Calendar Day",
          description: "Dedicate 30 minutes each Sunday to joint calendar review and habit planning for the cycle ahead.",
          estimatedImpact: "Can reduce invisible work imbalance by ~12%",
          difficulty: "easy",
          actionable: true
        },
        {
          title: "Mental Load Shift",
          description: "Explicitly transfer responsibility for one 'invisible' household system (meal planning, gift buying, etc.) to the less-involved parent.",
          estimatedImpact: "Potential 15-20% improvement in invisible household category",
          difficulty: "challenging",
          actionable: true
        }
      ];
      
      // If we have imbalance data, customize to the family's needs
      if (weightedScores && weightedScores.categoryBalance) {
        const categories = Object.entries(weightedScores.categoryBalance);
        
        // Find most imbalanced category
        const mostImbalanced = categories.sort((a, b) => Math.abs(b[1].imbalance) - Math.abs(a[1].imbalance))[0];
        
        if (mostImbalanced) {
          const [category, data] = mostImbalanced;
          const dominantParent = data.mama > data.papa ? "Mama" : "Papa";
          const otherParent = dominantParent === "Mama" ? "Papa" : "Mama";
          
          // Add a customized experiment
          experiments.unshift({
            title: `${category} Balance Boost`,
            description: `${otherParent} takes lead on ${category.toLowerCase()} for two cycles, with ${dominantParent} providing guidance rather than doing tasks.`,
            estimatedImpact: `Could reduce ${Math.round(Math.abs(data.imbalance))}% imbalance by half`,
            difficulty: "challenging",
            targeted: true,
            actionable: true,
            category: category,
            assignTo: otherParent
          });
        }
      }
      
      return experiments;
    } catch (error) {
      console.error("Error generating balance experiments:", error);
      return [];
    }
  };
  
  // Helper function to group tasks by category
  const groupTasksByCategory = (tasks) => {
    const grouped = tasks.reduce((acc, task) => {
      const category = task.category || 'Other';
      
      if (!acc[category]) {
        acc[category] = {
          category,
          count: 0,
          completed: 0
        };
      }
      
      acc[category].count++;
      if (task.completed) {
        acc[category].completed++;
      }
      
      return acc;
    }, {});
    
    return Object.values(grouped).map(group => ({
      ...group,
      completionRate: group.count > 0 ? Math.round((group.completed / group.count) * 100) : 0
    }));
  };
  
  // Helper function to get category descriptions
  const getCategoryDescription = (category) => {
    const descriptions = {
      "Visible Household Tasks": "Cleaning, cooking, and other observable home maintenance",
      "Invisible Household Tasks": "Planning, organizing, and mental load of home management",
      "Visible Parental Tasks": "Direct childcare, driving, and helping with homework",
      "Invisible Parental Tasks": "Emotional support, scheduling, and anticipating children's needs",
      "Other": "Miscellaneous tasks and responsibilities"
    };
    
    return descriptions[category] || "Tasks and responsibilities in this area";
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value}${entry.unit || '%'}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // COLORS
  const MAMA_COLOR = '#8884d8'; // Purple
  const PAPA_COLOR = '#82ca9d'; // Green
  const ACCENT_COLOR = '#ff7300'; // Orange
  const SUCCESS_COLOR = '#4caf50'; // Green
  const WARNING_COLOR = '#ff9800'; // Orange
  const ERROR_COLOR = '#f44336'; // Red
  
  // Define section components
  
  // Dashboard Overview - Summary of all sections
  const DashboardOverview = () => {
    return (
      <div className="bg-white rounded-lg shadow border-l-4 border-black mb-6 p-5">
        <h2 className="text-2xl font-bold font-roboto mb-3">Family Balance Dashboard</h2>
        <p className="text-gray-700 font-roboto mb-4">
          Welcome to your comprehensive family balance dashboard, designed to give you a 360° view of your journey 
          toward a more equitable distribution of responsibilities.
        </p>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-medium font-roboto mb-2">Why These 5 Key Areas Matter</h3>
          <p className="text-gray-700 font-roboto mb-3">
            This dashboard brings together five complementary perspectives that together create a complete picture 
            of your family's balance journey:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-gray-700 font-roboto">
            <li>
              <span className="font-medium">Family Harmony Pulse:</span> Visualizes your current balance state with real-time metrics 
              on distribution of responsibilities.
            </li>
            <li>
              <span className="font-medium">Individual Member Journeys:</span> Tracks each family member's personal growth, strengths, 
              and contributions to family balance.
            </li>
            <li>
              <span className="font-medium">Child Development Observatory:</span> Shows how balanced parenting positively impacts your 
              children's developmental outcomes.
            </li>
            <li>
              <span className="font-medium">Family Transformation Timeline:</span> Charts your progress over time, highlighting key 
              milestones and balance improvements.
            </li>
            <li>
              <span className="font-medium">Balance Impact Hub:</span> Quantifies tangible benefits of improved balance on your family's 
              time, relationships, and wellbeing.
            </li>
          </ul>
        </div>
        
        <p className="text-gray-700 font-roboto italic">
          Each section is personalized based on your family's unique data and works together to give you actionable 
          insights for continued growth.
        </p>
      </div>
    );
  };
  
  // 1. Family Harmony Pulse Component
  const FamilyHarmonyPulse = () => {
    // Scale the harmony score to a 0-100 scale for visualization
    const scoreValue = harmonyScore || 70;
    
    // Determine score level
    const getScoreLevel = (score) => {
      if (score >= 80) return { label: 'Excellent', color: SUCCESS_COLOR };
      if (score >= 65) return { label: 'Good', color: '#8bc34a' };
      if (score >= 50) return { label: 'Moderate', color: WARNING_COLOR };
      return { label: 'Needs Attention', color: ERROR_COLOR };
    };
    
    const scoreLevel = getScoreLevel(scoreValue);
    
    // Get current balance data
    const balanceData = weightedScores?.overallBalance 
      ? [
          { name: 'Mama', value: Math.round(weightedScores.overallBalance.mama) },
          { name: 'Papa', value: Math.round(weightedScores.overallBalance.papa) }
        ]
      : [
          { name: 'Mama', value: 50 },
          { name: 'Papa', value: 50 }
        ];
    
    // Get category breakdown data
    const categoryData = weightedScores?.categoryBalance
      ? Object.entries(weightedScores.categoryBalance).map(([category, data]) => ({
          category: category.replace(' Tasks', ''),
          mama: Math.round(data.mama),
          papa: Math.round(data.papa),
          imbalance: Math.round(Math.abs(data.imbalance))
        }))
      : [];
    
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Introduction to the Harmony Pulse section */}
        <div className="bg-gray-50 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold font-roboto mb-1">What You're Seeing in the Harmony Pulse</h3>
          <p className="text-sm text-gray-700 font-roboto">
            The Family Harmony Pulse visualizes your family's current balance state using data from your surveys,
            habit completion, and category-by-category analysis. The harmony score combines multiple factors, with
            perfect 50/50 balance and consistent habit completion resulting in higher scores.
          </p>
        </div>
      
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Harmony Score */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2 font-roboto">Family Harmony Score</h3>
              <div className="relative w-40 h-40">
                {/* Circular progress */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e6e6e6"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={scoreLevel.color}
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * scoreValue) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{scoreValue}</span>
                  <span className="text-sm text-gray-500">{scoreLevel.label}</span>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600 font-roboto">
                <p>Based on habit completion rates, survey responses, and balance metrics</p>
                <p className="mt-1 text-xs bg-gray-100 p-2 rounded">
                  Scores above 80 indicate excellent balance and consistent habit formation
                </p>
              </div>
            </div>
            
            {/* Current Balance */}
            <div className="flex flex-col p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2 font-roboto">Current Balance</h3>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={balanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        <Cell key="cell-0" fill={MAMA_COLOR} />
                        <Cell key="cell-1" fill={PAPA_COLOR} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <span 
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      Math.abs((balanceData[0].value - 50)) <= 5
                        ? 'bg-green-100 text-green-800'
                        : Math.abs((balanceData[0].value - 50)) <= 15
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {Math.abs((balanceData[0].value - 50)) <= 5
                      ? 'Well Balanced'
                      : Math.abs((balanceData[0].value - 50)) <= 15
                      ? 'Moderately Balanced'
                      : 'Needs Balancing'}
                  </span>
                  
                  <p className="mt-2 text-sm text-gray-600">
                    This visualization shows the current distribution of all responsibilities between parents,
                    calculated from your latest survey responses.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Category Breakdown */}
            <div className="flex flex-col p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2 font-roboto">Category Breakdown</h3>
              <div className="flex-1">
                {categoryData.length > 0 ? (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="category" type="category" width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="mama" name="Mama" stackId="a" fill={MAMA_COLOR} />
                        <Bar dataKey="papa" name="Papa" stackId="a" fill={PAPA_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-56 bg-gray-100 rounded">
                    <p className="text-gray-500 text-center font-roboto">
                      Complete surveys to see category breakdown
                    </p>
                  </div>
                )}
                
                <p className="mt-2 text-sm text-gray-600">
                  This chart breaks down workload distribution by category, helping you identify specific
                  areas for focused improvement.
                </p>
              </div>
            </div>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {/* Imbalance Alert */}
            {categoryData.length > 0 && (
              <div className={`p-4 rounded-lg bg-white border ${
                categoryData.some(cat => cat.imbalance > 20)
                  ? 'border-amber-300'
                  : 'border-green-300'
              }`}>
                <div className="flex items-start">
                  {categoryData.some(cat => cat.imbalance > 20) ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-2" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
                  )}
                  <div>
                    <h3 className="font-medium font-roboto">
                      {categoryData.some(cat => cat.imbalance > 20)
                        ? 'Imbalance Alert'
                        : 'Good Balance'}
                    </h3>
                    <p className="text-sm text-gray-600 font-roboto">
                      {categoryData.some(cat => cat.imbalance > 20)
                        ? `${categoryData.sort((a, b) => b.imbalance - a.imbalance)[0].category} shows a ${
                            categoryData.sort((a, b) => b.imbalance - a.imbalance)[0].imbalance
                          }% imbalance`
                        : 'All categories are reasonably balanced'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Habit Completion */}
            <div className="p-4 rounded-lg bg-white border border-blue-300">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium font-roboto">Habit Completion</h3>
                  <p className="text-sm text-gray-600 font-roboto">
                    {taskRecommendations && taskRecommendations.length > 0
                      ? `${taskRecommendations.filter(t => t.completed).length} of ${taskRecommendations.length} habits completed`
                      : 'No habits created yet'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Cycle Progress */}
            <div className="p-4 rounded-lg bg-white border border-purple-300">
              <div className="flex items-start">
                <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium font-roboto">Cycle Progress</h3>
                  <p className="text-sm text-gray-600 font-roboto">
                    {completedWeeks.length > 0
                      ? `${completedWeeks.length} cycles completed, on cycle ${currentWeek}`
                      : 'Just getting started'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Family Size */}
            <div className="p-4 rounded-lg bg-white border border-green-300">
              <div className="flex items-start">
                <Users className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium font-roboto">Family Members</h3>
                  <p className="text-sm text-gray-600 font-roboto">
                    {parents.length} parents, {children.length} {children.length === 1 ? 'child' : 'children'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 2. Individual Member Journeys Component
  const IndividualMemberJourneys = () => {
    // Get selected member data
    const selectedMemberData = selectedMember ? 
      familyMembers.find(m => m.id === selectedMember) : null;
    
    // Get member insights
    const insights = selectedMember && memberInsights[selectedMember]  
      ? memberInsights[selectedMember] 
      : null;
    
    // Handle clicks on tabs to prevent section collapse
    const handleMemberClick = (memberId, e) => {
      e.stopPropagation();
      setSelectedMember(memberId);
    };
    
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Introduction to the individual journeys section */}
        <div className="bg-gray-50 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold font-roboto mb-1">Understanding Individual Member Journeys</h3>
          <p className="text-sm text-gray-700 font-roboto">
            Each family member contributes uniquely to your family's balance. This section provides personalized insights 
            for each person based on surveys, habit completion, tracking data, and AI analysis. Select different family members 
            to see their individual strengths and growth areas.
          </p>
        </div>
      
        <div className="p-5">
          {/* Member selection tabs */}
          <div className="flex flex-wrap gap-2 mb-6" onClick={stopPropagation}>
            {familyMembers.map(member => (
              <button
                key={member.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-roboto ${
                  selectedMember === member.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={(e) => handleMemberClick(member.id, e)}
              >
                {member.name}
              </button>
            ))}
          </div>
          
          {/* Selected member details */}
          {selectedMemberData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Member Profile */}
              <div className="bg-gray-50 rounded-lg p-5">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    {selectedMemberData.profilePicture ? (
                      <img 
                        src={selectedMemberData.profilePicture} 
                        alt={selectedMemberData.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <CircleUser className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium font-roboto">{selectedMemberData.name}</h3>
                  <p className="text-sm text-gray-500 font-roboto capitalize">
                    {isParent(selectedMemberData) 
                      ? `${selectedMemberData.roleType || 'Parent'}`
                      : `Child (Age ${selectedMemberData.age || 'unknown'})`}
                  </p>
                </div>
                
                {/* Key Metrics */}
                {isParent(selectedMemberData) && insights ? (
                  <div className="space-y-4">
                    {/* Habit Completion Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium font-roboto">Habit Completion</span>
                        <span className="text-sm font-roboto">{insights.taskCompletionRate}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${insights.taskCompletionRate}%` }} 
                        />
                      </div>
                    </div>
                    
                    {/* Habit Distribution */}
                    {insights.taskDistribution && insights.taskDistribution.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 font-roboto">Habit Distribution</h4>
                        <div className="space-y-3">
                          {insights.taskDistribution.map((category, index) => (
                            <div key={index}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-roboto">{category.category}</span>
                                <span className="text-xs font-roboto">{category.completionRate}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500" 
                                  style={{ width: `${category.completionRate}%` }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isChild(selectedMemberData) && memberInsights[selectedMemberData.id] ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded p-3">
                      <h4 className="text-sm font-medium font-roboto text-blue-700">
                        Participation Journey
                      </h4>
                      <p className="text-xs text-blue-600 font-roboto mt-1">
                        {memberInsights[selectedMemberData.id].participationGrowth}
                      </p>
                    </div>
                    
                    {/* Child-specific activities - Enhanced to show actual activities */}
                    {childTrackingData[selectedMemberData.id] && (
                      <div className="bg-green-50 rounded p-3">
                        <h4 className="text-sm font-medium font-roboto text-green-700">
                          Activities & Development
                        </h4>
                        <ul className="text-xs text-green-600 font-roboto mt-1 space-y-1">
                          {childTrackingData[selectedMemberData.id].activities?.length > 0 ? (
                            childTrackingData[selectedMemberData.id].activities.slice(0, 3).map((activity, index) => (
                              <li key={index} className="flex items-center">
                                <Activity className="w-3 h-3 mr-1 text-green-500" />
                                {activity.name || activity.title}
                              </li>
                            ))
                          ) : (
                            <li className="flex items-center">
                              <Info className="w-3 h-3 mr-1 text-green-500" />
                              No activities recorded yet
                            </li>
                          )}
                        </ul>
                        
                        {/* Growth data summary */}
                        {childTrackingData[selectedMemberData.id].growthData?.length > 0 && (
                          <div className="mt-2 bg-white p-2 rounded">
                            <p className="text-xs font-medium text-green-700">
                              Growth Tracking
                            </p>
                            <div className="mt-1">
                              {childTrackingData[selectedMemberData.id].growthData.length > 1 ? (
                                <div className="text-xs">
                                  <span className="font-medium">Latest:</span> {
                                    formatDate(childTrackingData[selectedMemberData.id].growthData
                                      .sort((a, b) => new Date(b.date) - new Date(a.date))[0].date)
                                  }
                                  {childTrackingData[selectedMemberData.id].growthData[0].height && (
                                    <span className="ml-2">Height: {childTrackingData[selectedMemberData.id].growthData[0].height}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs">
                                  {childTrackingData[selectedMemberData.id].growthData.length} growth record
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-500 text-sm font-roboto">
                      Complete more cycles to see detailed metrics
                    </p>
                  </div>
                )}
              </div>
              
              {/* Strengths and Growth Areas */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="text-md font-medium mb-4 font-roboto">Strengths & Growth Areas</h3>
                
                {isParent(selectedMemberData) && insights ? (
                  <div className="space-y-4">
                    {/* Strengths */}
                    <div>
                      <h4 className="flex items-center text-sm font-medium mb-2 font-roboto">
                        <Award className="w-4 h-4 text-yellow-500 mr-1" />
                        Strengths
                      </h4>
                      <div className="space-y-2">
                        {insights.strengths && insights.strengths.length > 0 ? (
                          insights.strengths.map((strength, index) => (
                            <div key={index} className="p-2 bg-white rounded border border-green-100">
                              <p className="text-sm font-medium font-roboto">{strength.category}</p>
                              <p className="text-xs text-gray-600 font-roboto mt-1">{strength.description}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 font-roboto">
                            Complete more habits to reveal strengths
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Growth Areas */}
                    <div>
                      <h4 className="flex items-center text-sm font-medium mb-2 font-roboto">
                        <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                        Growth Areas
                      </h4>
                      <div className="space-y-2">
                        {insights.growthAreas && insights.growthAreas.length > 0 ? (
                          insights.growthAreas.map((area, index) => (
                            <div key={index} className="p-2 bg-white rounded border border-blue-100">
                              <p className="text-sm font-medium font-roboto">{area.category}</p>
                              <p className="text-xs text-gray-600 font-roboto mt-1">{area.description}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 font-roboto">
                            All habit areas look good
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isChild(selectedMemberData) && memberInsights[selectedMemberData.id] ? (
                  <div className="space-y-4">
                    {/* Child Strengths */}
                    <div>
                      <h4 className="flex items-center text-sm font-medium mb-2 font-roboto">
                        <Sparkles className="w-4 h-4 text-yellow-500 mr-1" />
                        Unique Qualities
                      </h4>
                      <div className="space-y-2">
                        {memberInsights[selectedMemberData.id].strengths && 
                         memberInsights[selectedMemberData.id].strengths.length > 0 ? (
                          memberInsights[selectedMemberData.id].strengths.map((strength, index) => (
                            <div key={index} className="p-2 bg-white rounded border border-yellow-100">
                              <p className="text-sm font-medium font-roboto">{strength.title}</p>
                              <p className="text-xs text-gray-600 font-roboto mt-1">{strength.description}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 font-roboto">
                            Add more information about {selectedMemberData.name} to see strengths
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* For children, show how parents can support their development */}
                    <div>
                      <h4 className="flex items-center text-sm font-medium mb-2 font-roboto">
                        <Heart className="w-4 h-4 text-pink-500 mr-1" />
                        Parental Support Opportunities
                      </h4>
                      <div className="p-2 bg-white rounded border border-pink-100">
                        <p className="text-sm font-medium font-roboto">Balanced Engagement</p>
                        <p className="text-xs text-gray-600 font-roboto mt-1">
                          Both parents should engage equally in {selectedMemberData.name}'s activities and development to model balanced relationships.
                        </p>
                        {/* Add ability to create a habit */}
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              createHabitFromInsight({
                                title: `Balanced Engagement with ${selectedMemberData.name}`,
                                description: `Ensure both parents participate equally in ${selectedMemberData.name}'s activities and care`,
                                category: 'Invisible Parental Tasks',
                                insight: 'Children benefit from equal engagement from both parents'
                              });
                            }}
                            className="flex items-center text-xs bg-pink-100 hover:bg-pink-200 text-pink-800 px-2 py-1 rounded"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create Habit
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Development Milestones */}
                    {selectedMemberData.age && (
                      <div>
                        <h4 className="flex items-center text-sm font-medium mb-2 font-roboto">
                          <Target className="w-4 h-4 text-purple-500 mr-1" />
                          Age-Appropriate Development
                        </h4>
                        <div className="p-2 bg-white rounded border border-purple-100">
                          <p className="text-sm font-medium font-roboto">
                            Development Focus for Age {selectedMemberData.age}
                          </p>
                          <p className="text-xs text-gray-600 font-roboto mt-1">
                            {selectedMemberData.age < 5 ? 
                              `At this age, ${selectedMemberData.name} is developing language skills, motor coordination, and early social abilities.` :
                              selectedMemberData.age < 10 ?
                              `At this age, ${selectedMemberData.name} is developing reading/writing skills, peer relationships, and increasing independence.` :
                              `At this age, ${selectedMemberData.name} is developing abstract thinking, social identity, and independent decision-making.`
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-500 text-sm font-roboto">
                      Complete more cycles to reveal strengths & growth areas
                    </p>
                  </div>
                )}
              </div>
              
              {/* Personalized Insights */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="text-md font-medium mb-4 font-roboto">Personalized Insights</h3>
                
                {isParent(selectedMemberData) && insights && insights.personalizedInsights ? (
                  <div className="space-y-3">
                    {insights.personalizedInsights.length > 0 ? (
                      insights.personalizedInsights.map((insight, index) => (
                        <div key={index} className="p-3 bg-white rounded shadow-sm">
                          <div className="flex items-start">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium font-roboto">{insight.title}</h4>
                              <p className="text-xs text-gray-600 font-roboto mt-1">{insight.description}</p>
                            </div>
                          </div>
                          {/* Add ability to create a habit from insight */}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                createHabitFromInsight({
                                  title: insight.title,
                                  description: insight.description,
                                  category: insight.category || 'Invisible Household Tasks',
                                  insight: 'Based on personalized AI analysis of your family data'
                                });
                              }}
                              className="flex items-center text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Create Habit
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-gray-500 text-sm font-roboto">
                          No personalized insights available yet
                        </p>
                      </div>
                    )}
                  </div>
                ) : isChild(selectedMemberData) ? (
                  <div className="space-y-3">
                    {/* Child-specific insights based on tracking data */}
                    {childTrackingData[selectedMemberData.id] && childTrackingData[selectedMemberData.id].medicalAppointments?.length > 0 ? (
                      <div className="p-3 bg-white rounded shadow-sm">
                        <div className="flex items-start">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium font-roboto">Healthcare Tracking</h4>
                            <p className="text-xs text-gray-600 font-roboto mt-1">
                              {selectedMemberData.name} has {childTrackingData[selectedMemberData.id].medicalAppointments.length} medical appointments recorded. Last visit was on {
                                formatDate(childTrackingData[selectedMemberData.id].medicalAppointments.sort((a, b) => 
                                  new Date(b.date) - new Date(a.date))[0].date)
                              }.
                            </p>
                          </div>
                        </div>
                        {/* Add ability to create a habit */}
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              createHabitFromInsight({
                                title: 'Balance Healthcare Management',
                                description: `Ensure both parents participate in ${selectedMemberData.name}'s healthcare appointments and follow-ups`,
                                category: 'Invisible Parental Tasks',
                                insight: 'Shared healthcare responsibility ensures both parents understand medical needs'
                              });
                            }}
                            className="flex items-center text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create Habit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded shadow-sm">
                        <div className="flex items-start">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium font-roboto">Child Tracking</h4>
                            <p className="text-xs text-gray-600 font-roboto mt-1">
                              Track {selectedMemberData.name}'s growth, appointments, and activities in the Child Tracking section for personalized insights.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 bg-white rounded shadow-sm">
                      <div className="flex items-start">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium font-roboto">Development Observation</h4>
                          <p className="text-xs text-gray-600 font-roboto mt-1">
                            {selectedMemberData.name}'s development benefits from balanced engagement from both parents. Check the Child Development Observatory for more specific insights.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Add insight about extracurricular activities if present */}
                    {childTrackingData[selectedMemberData.id]?.activities?.length > 0 && (
                      <div className="p-3 bg-white rounded shadow-sm">
                        <div className="flex items-start">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium font-roboto">Activity Engagement</h4>
                            <p className="text-xs text-gray-600 font-roboto mt-1">
                              {selectedMemberData.name} participates in {childTrackingData[selectedMemberData.id].activities.length} activities. 
                              Balance parent participation in these activities to show equal support.
                            </p>
                          </div>
                        </div>
                        {/* Add ability to create a habit */}
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              createHabitFromInsight({
                                title: 'Balanced Activity Support',
                                description: `Alternate which parent takes ${selectedMemberData.name} to activities and lessons`,
                                category: 'Visible Parental Tasks',
                                insight: 'Children benefit from seeing both parents involved in their extracurricular activities'
                              });
                            }}
                            className="flex items-center text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create Habit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-500 text-sm font-roboto">
                      Complete more cycles to generate personalized insights
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!selectedMemberData && (
            <div className="py-8 text-center">
              <p className="text-gray-500 font-roboto">
                Select a family member to view their journey
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 3. Child Development Observatory Component
  const ChildDevelopmentObservatory = () => {
    // Handle clicks on child tabs to prevent section collapse
    const handleChildClick = (childId, e) => {
      e.stopPropagation();
      setSelectedChildId(childId);
    };
    
    // Handle create habit from suggestion
    const handleCreateHabit = (suggestion, e) => {
      e.stopPropagation();
      
      const habitData = {
        title: suggestion.title,
        description: suggestion.description,
        assignedTo: parents[0]?.roleType || 'Papa',
        assignedToName: parents.find(p => p.roleType === (parents[0]?.roleType || 'Papa'))?.name,
        category: suggestion.imbalancedArea || 'Invisible Parental Tasks',
        focusArea: suggestion.imbalancedArea || 'Parental Tasks',
        isAIGenerated: true,
        aiInsight: "This habit will help ensure balanced parenting for your child's development",
        cycleNumber: currentWeek
      };
      
      createHabitFromInsight(habitData);
    };
    
    // Get selected child data
    const selectedChildData = selectedChildId ? 
      children.find(child => child.id === selectedChildId) : null;
    
    // Get child insights
    const insights = selectedChildId && childInsights[selectedChildId] 
      ? childInsights[selectedChildId] 
      : null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Introduction to Child Development Observatory */}
        <div className="bg-gray-50 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold font-roboto mb-1">Child Development Observatory: Why It Matters</h3>
          <p className="text-sm text-gray-700 font-roboto">
            How parents share responsibilities directly impacts children's development. This observatory connects your family's 
            balance patterns to research-backed child development insights, showing how balanced parenting supports your 
            {children.length > 1 ? " children's" : " child's"} growth. Click "Create Habit" on any insight to create a habit 
            that supports balanced child development.
          </p>
        </div>
      
        <div className="p-5">
          {children.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-600 font-roboto">
                No children added to your family yet
              </p>
            </div>
          ) : (
            <>
              {/* Child selection tabs */}
              <div className="flex flex-wrap gap-2 mb-6" onClick={stopPropagation}>
                {children.map(child => (
                  <button
                    key={child.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-roboto ${
                      selectedChildId === child.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={(e) => handleChildClick(child.id, e)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
              
              {/* Child insights */}
              {selectedChildData && insights ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-5">
                    {/* Milestones */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-md font-medium mb-3 text-blue-800 font-roboto">
                        Age-Appropriate Milestones
                      </h3>
                      <div className="space-y-3">
                        {insights.milestones && insights.milestones.length > 0 ? (
                          insights.milestones.map((milestone, index) => (
                            <div key={index} className="bg-white rounded p-3 shadow-sm">
                              <h4 className="text-sm font-medium font-roboto">{milestone.title}</h4>
                              <p className="text-xs text-gray-600 font-roboto mt-1">
                                {milestone.description}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600 font-roboto">
                            Add {selectedChildData.name}'s age to see developmentally appropriate milestones
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Emotional Intelligence */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h3 className="text-md font-medium mb-3 text-purple-800 font-roboto">
                        Emotional Intelligence Insights
                      </h3>
                      <div className="space-y-3">
                        {insights.emotionalInsights && insights.emotionalInsights.length > 0 ? (
                          insights.emotionalInsights.map((insight, index) => (
                            <div key={index} className="bg-white rounded p-3 shadow-sm">
                              <h4 className="text-sm font-medium font-roboto">{insight.title}</h4>
                              <p className="text-xs text-gray-600 font-roboto mt-1">
                                {insight.description}
                              </p>
                              {insight.suggestion && (
                                <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700 font-roboto">
                                  <strong>Suggestion:</strong> {insight.suggestion}
                                </div>
                              )}
                              {/* Add create habit button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createHabitFromInsight({
                                      title: insight.title,
                                      description: insight.suggestion || insight.description,
                                      category: 'Invisible Parental Tasks',
                                      insight: 'Emotional intelligence development benefits from consistent parenting approaches'
                                    });
                                  }}
                                  className="flex items-center text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Habit
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600 font-roboto">
                            Complete more surveys to generate emotional intelligence insights
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-5">
                    {/* Parental Balance Impact */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-md font-medium mb-3 text-green-800 font-roboto">
                        Parental Balance Impact
                      </h3>
                      <div className="space-y-3">
                        {insights.suggestions && insights.suggestions.length > 0 ? (
                          insights.suggestions.map((suggestion, index) => (
                            <div key={index} className="bg-white rounded p-3 shadow-sm">
                              <h4 className="text-sm font-medium font-roboto">{suggestion.title}</h4>
                              <p className="text-xs text-gray-600 font-roboto mt-1">
                                {suggestion.description}
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded font-roboto">
                                  {suggestion.imbalancedArea}
                                </span>
                                
                                {suggestion.actionable && (
                                  <button
                                    onClick={(e) => handleCreateHabit(suggestion, e)}
                                    className="flex items-center text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Create Habit
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600 font-roboto">
                            Complete more surveys to see how parental balance affects {selectedChildData.name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* AI Insights */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h3 className="text-md font-medium mb-3 text-amber-800 font-roboto">
                        AI-Generated Insights
                      </h3>
                      <div className="space-y-3">
                        {insights.aiInsights && insights.aiInsights.length > 0 ? (
                          insights.aiInsights.map((insight, index) => (
                            <div key={index} className="bg-white rounded p-3 shadow-sm">
                              <div className="flex items-start">
                                <Brain className="w-4 h-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium font-roboto">
                                    {insight.title || 'Development Insight'}
                                  </h4>
                                  <p className="text-xs text-gray-600 font-roboto mt-1">
                                    {insight.description || insight.content || 'Personalized insight for your child'}
                                  </p>
                                  {insight.actionItem && (
                                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700 font-roboto">
                                      <strong>Action:</strong> {insight.actionItem}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Add "Create Habit" button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createHabitFromInsight({
                                      title: insight.title || 'Development Support',
                                      description: insight.description || insight.content || 'Support child development',
                                      category: insight.type || 'Invisible Parental Tasks',
                                      insight: insight.actionItem
                                    });
                                  }}
                                  className="flex items-center text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Habit
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600 font-roboto">
                            Our AI is gathering more data to provide personalized insights
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Developmental Activities */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-md font-medium mb-3 text-blue-800 font-roboto">
                        Age-Appropriate Activities
                      </h3>
                      <div className="space-y-3">
                        {selectedChildData.age ? (
                          <>
                            <div className="bg-white rounded p-3 shadow-sm">
                              <div className="flex items-start">
                                <Activity className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium font-roboto">
                                    Balanced Engagement
                                  </h4>
                                  <p className="text-xs text-gray-600 font-roboto mt-1">
                                    Each parent should aim for 15-30 minutes of focused one-on-one time with {selectedChildData.name} daily.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Add "Create Habit" button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createHabitFromInsight({
                                      title: `Daily Focus Time with ${selectedChildData.name}`,
                                      description: `Schedule 15-30 minutes of focused one-on-one time with ${selectedChildData.name} each day`,
                                      category: 'Invisible Parental Tasks',
                                      insight: 'Balanced engagement from both parents supports healthy child development'
                                    });
                                  }}
                                  className="flex items-center text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Habit
                                </button>
                              </div>
                            </div>
                            
                            <div className="bg-white rounded p-3 shadow-sm">
                              <div className="flex items-start">
                                <Calendar className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium font-roboto">
                                    Consistency Matters
                                  </h4>
                                  <p className="text-xs text-gray-600 font-roboto mt-1">
                                    Create a shared calendar for {selectedChildData.name}'s activities, ensuring both parents participate equally.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Add "Create Habit" button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createHabitFromInsight({
                                      title: `Shared Calendar for ${selectedChildData.name}`,
                                      description: `Maintain a shared calendar for ${selectedChildData.name}'s activities with balanced parent participation`,
                                      category: 'Invisible Household Tasks',
                                      insight: 'Consistent scheduling provides security and predictability for children'
                                    });
                                  }}
                                  className="flex items-center text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Habit
                                </button>
                              </div>
                            </div>
                            
                            <div className="bg-white rounded p-3 shadow-sm">
                              <div className="flex items-start">
                                <Users className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium font-roboto">
                                    Gender-Neutral Modeling
                                  </h4>
                                  <p className="text-xs text-gray-600 font-roboto mt-1">
                                    Alternate who handles different types of care to show {selectedChildData.name} that roles aren't gender-specific.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Add "Create Habit" button */}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    createHabitFromInsight({
                                      title: 'Role Rotation',
                                      description: `Regularly alternate caregiving roles to model gender-neutral responsibilities for ${selectedChildData.name}`,
                                      category: 'Visible Parental Tasks',
                                      insight: 'Children develop healthier gender perceptions when they see balanced role-sharing'
                                    });
                                  }}
                                  className="flex items-center text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Habit
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-600 font-roboto">
                            Add {selectedChildData.name}'s age to see appropriate activities
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-lg">
                  <p className="text-gray-600 font-roboto">
                    Select a child to view development insights
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  // 4. Family Transformation Timeline Component
  const FamilyTransformationTimeline = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Timeline introduction */}
        <div className="bg-gray-50 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold font-roboto mb-1">Your Family's Balance Transformation Journey</h3>
          <p className="text-sm text-gray-700 font-roboto">
            This timeline charts your family's progress from your initial survey through each completed cycle. 
            The graph shows how the workload distribution between parents has evolved, alongside the number of habits completed. 
            Key milestone moments are highlighted to show how specific achievements have impacted your family balance.
          </p>
        </div>
      
        <div className="p-5">
          {timelineData.length <= 1 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-600 font-roboto">
                Complete more cycles to build your transformation timeline
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance Trend Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-3 font-roboto">Balance Progress</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="balance.mama" 
                        name="Mama's Share" 
                        fill={MAMA_COLOR} 
                        stroke={MAMA_COLOR}
                        fillOpacity={0.3}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="balance.papa" 
                        name="Papa's Share" 
                        fill={PAPA_COLOR} 
                        stroke={PAPA_COLOR}
                        fillOpacity={0.3}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="completedHabits" 
                        name="Completed Habits" 
                        stroke={ACCENT_COLOR} 
                      />
                      {/* Add a reference line for 50/50 balance */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={() => 50}
                        name="Perfect Balance"
                        stroke="#888"
                        strokeDasharray="3 3"
                        activeDot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-sm text-center text-gray-600 font-roboto">
                  <p>This visualization shows how your family's workload distribution has changed over time, along with completed habits.</p>
                  <p className="mt-1">The dotted line at 50% represents perfect balance, which is the ideal target.</p>
                </div>
              </div>
              
              {/* Key Journey Milestones */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-3 font-roboto">Key Journey Milestones</h3>
                
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-300"></div>
                  
                  <div className="space-y-4 pl-16 relative">
                    {/* First milestone - Start of journey */}
                    <div className="relative">
                      <div className="absolute left-[-44px] top-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-md font-medium font-roboto">Started Balance Journey</h4>
                        <p className="text-sm text-gray-600 font-roboto">
                          {timelineData[0]?.date || 'N/A'} - Initial survey completed
                        </p>
                        <div className="mt-1 flex items-center">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-roboto">
                            Initial Balance: Mama {Math.round(timelineData[0]?.balance?.mama || 0)}% / Papa {Math.round(timelineData[0]?.balance?.papa || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Filter for key events */}
                    {timelineData
                      .filter(point => point.keyEvent && point.cycleNumber > 0)
                      .map((point, index) => (
                        <div key={index} className="relative">
                          <div className="absolute left-[-44px] top-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Star className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="text-md font-medium font-roboto">{point.keyEvent}</h4>
                            <p className="text-sm text-gray-600 font-roboto">
                              {point.date} - Cycle {point.cycleNumber}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-roboto">
                                Balance: Mama {Math.round(point.balance?.mama || 0)}% / Papa {Math.round(point.balance?.papa || 0)}%
                              </span>
                              {point.completedHabits > 0 && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-roboto">
                                  {point.completedHabits} Habits Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Current point */}
                    {timelineData.find(point => point.current) && (
                      <div className="relative">
                        <div className="absolute left-[-44px] top-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-md font-medium font-roboto">Current Cycle</h4>
                          <p className="text-sm text-gray-600 font-roboto">
                            {timelineData.find(point => point.current)?.date || 'N/A'} - Cycle {currentWeek}
                          </p>
                          <div className="mt-1 flex items-center">
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-roboto">
                              Keep going!
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress Summary */}
              {timelineData.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-2 text-blue-800 font-roboto">Balance Improvement</h3>
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mr-3 text-xl font-bold text-blue-600 font-roboto">
                        {Math.abs(
                          Math.abs(timelineData[0].balance.mama - 50) - 
                          Math.abs(timelineData[timelineData.length - 1].balance.mama - 50)
                        ).toFixed(0)}%
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-roboto">
                          {Math.abs(timelineData[0].balance.mama - 50) > 
                           Math.abs(timelineData[timelineData.length - 1].balance.mama - 50)
                            ? 'Closer to equal balance'
                            : 'Change in balance distribution'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-2 text-green-800 font-roboto">Habits Completed</h3>
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mr-3 text-xl font-bold text-green-600 font-roboto">
                        {timelineData.reduce((sum, point) => sum + (point.completedHabits || 0), 0)}
                      </div>
                      <div>
                        <p className="text-sm text-green-700 font-roboto">
                          Total habits completed across all cycles
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-2 text-purple-800 font-roboto">Journey Progress</h3>
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mr-3 text-xl font-bold text-purple-600 font-roboto">
                        {Math.round((completedWeeks.length / 8) * 100)}%
                      </div>
                      <div>
                        <p className="text-sm text-purple-700 font-roboto">
                          {completedWeeks.length > 0
                            ? `${completedWeeks.length} of 8 cycles completed`
                            : 'Journey just started'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 5. Balance Impact Hub Component
  const BalanceImpactHub = () => {
    // Handle create habit from experiment
    const handleCreateExperimentHabit = (experiment, e) => {
      e.stopPropagation();
      
      if (!experiment.actionable) return;
      
      const habitData = {
        title: experiment.title,
        description: experiment.description,
        assignedTo: experiment.assignTo || (parents[0]?.roleType || 'Papa'),
        assignedToName: experiment.assignTo ? 
          parents.find(p => p.roleType === experiment.assignTo)?.name : 
          parents.find(p => p.roleType === (parents[0]?.roleType || 'Papa'))?.name,
        category: experiment.category || 'Invisible Household Tasks',
        focusArea: experiment.title,
        isAIGenerated: true,
        aiInsight: experiment.estimatedImpact || "This habit will help improve family balance",
        targeted: experiment.targeted || false,
        difficulty: experiment.difficulty || 'moderate'
      };
      
      createHabitFromInsight(habitData);
    };
    
    return (
      <div className="bg-white rounded-lg shadow-sm mb-6">
        {/* Impact hub introduction */}
        <div className="bg-gray-50 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold font-roboto mb-1">Balance Impact: Real-World Benefits</h3>
          <p className="text-sm text-gray-700 font-roboto">
            This hub translates your balance improvements into tangible benefits for your family. The metrics show how 
            more equitable workload distribution saves time, boosts relationship satisfaction, and reduces stress. 
            The "Balance Experiments" section offers personalized suggestions to try, which you can convert directly 
            into habits by clicking "Create Habit."
          </p>
        </div>
      
        <div className="p-5">
          {!impactData ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-600 font-roboto">
                Complete more cycles to unlock impact insights
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Impact Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Time Saved */}
                <div className="bg-blue-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-blue-800 font-roboto">Time Reclaimed</h3>
                  <div className="mt-3 flex items-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Clock className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-blue-600 font-roboto">{impactData.timeSaved}hr</p>
                      <p className="text-sm text-blue-700 font-roboto">per week</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-blue-600 font-roboto">
                    Better balance means more time for what matters to you
                  </p>
                </div>
                
                {/* Relationship Quality */}
                <div className="bg-red-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-red-800 font-roboto">Relationship Boost</h3>
                  <div className="mt-3 flex items-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <Heart className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <div className="w-32 bg-red-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-red-500 h-full" 
                          style={{ width: `${impactData.relationshipBoost}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-red-700 mt-1 font-roboto">
                        {impactData.relationshipBoost}% satisfaction
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-red-600 font-roboto">
                    Equitable workload leads to stronger relationships
                  </p>
                </div>
                
                {/* Stress Reduction */}
                <div className="bg-green-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-green-800 font-roboto">Stress Reduction</h3>
                  <div className="mt-3 flex items-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <Shield className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <div className="w-32 bg-green-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${impactData.stressReduction}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-green-700 mt-1 font-roboto">
                        {impactData.stressReduction}% decrease
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-green-600 font-roboto">
                    Shared responsibilities mean less stress for everyone
                  </p>
                </div>
              </div>
              
              {/* Balance Experiments */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-medium mb-3 font-roboto">Try These Balance Experiments</h3>
                <p className="text-sm text-gray-600 mb-3 font-roboto">
                  These personalized experiments are designed based on your family's unique balance patterns. 
                  Click "Create Habit" on any experiment to add it to your habits.
                </p>
                <div className="space-y-3">
                  {impactData.experiments && impactData.experiments.length > 0 ? (
                    impactData.experiments.map((experiment, index) => (
                      <div key={index} className={`bg-white rounded-lg p-4 shadow-sm border ${experiment.targeted ? 'border-yellow-300' : 'border-transparent'}`}>
                        <div className="flex items-start">
                          <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center mr-3 ${
                            experiment.difficulty === 'easy' ? 'bg-green-100' :
                            experiment.difficulty === 'moderate' ? 'bg-blue-100' :
                            'bg-purple-100'
                          }`}>
                            <Lightbulb className={`w-4 h-4 ${
                              experiment.difficulty === 'easy' ? 'text-green-600' :
                              experiment.difficulty === 'moderate' ? 'text-blue-600' :
                              'text-purple-600'
                            }`} />
                          </div>
                          <div>
                            <h4 className="text-md font-medium font-roboto flex items-center">
                              {experiment.title}
                              {experiment.targeted && (
                                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-roboto">
                                  Personalized
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 font-roboto">
                              {experiment.description}
                            </p>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-roboto">
                                {experiment.estimatedImpact}
                              </span>
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 mr-3 font-roboto">
                                  Difficulty: {experiment.difficulty}
                                </span>
                                {experiment.actionable && (
                                  <button
                                    onClick={(e) => handleCreateExperimentHabit(experiment, e)}
                                    className="flex items-center text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Create Habit
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 font-roboto">
                      Complete more surveys to unlock personalized experiments
                    </p>
                  )}
                </div>
              </div>
              
              {/* Child Wellbeing Indicators */}
              {children.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3 font-roboto">Child Wellbeing Impact</h3>
                  <div className="prose max-w-none">
                    <p className="text-sm text-gray-600 font-roboto">
                      Research shows that when parents share responsibilities more equally:
                    </p>
                    <ul className="mt-2 space-y-2">
                      <li className="text-sm text-gray-600 font-roboto">
                        Children develop more flexible gender role attitudes and expectations
                      </li>
                      <li className="text-sm text-gray-600 font-roboto">
                        Both parents build stronger, more secure attachments with children
                      </li>
                      <li className="text-sm text-gray-600 font-roboto">
                        Children experience more consistent parenting and lower household stress
                      </li>
                      <li className="text-sm text-gray-600 font-roboto">
                        Children learn valuable life skills by observing collaborative problem-solving
                      </li>
                    </ul>
                  </div>
                  
                  {/* Impact Projection */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 font-roboto flex items-center">
                      <Target className="w-4 h-4 mr-1 text-blue-600" />
                      Long-Term Impact Projection
                    </h4>
                    <p className="text-sm text-blue-700 mt-1 font-roboto">
                      Continuing on your current balance journey could lead to significant improvements in your 
                      {children.length > 1 ? " children's" : " child's"} development of healthy relationship models,
                      emotional intelligence, and future relationship success.
                    </p>
                    
                    {/* Create habit from this insight */}
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          createHabitFromInsight({
                            title: 'Model Balanced Communication',
                            description: 'Demonstrate healthy, balanced communication and decision-making to show children positive relationship dynamics',
                            category: 'Invisible Parental Tasks',
                            insight: 'Children internalize relationship patterns they observe, making balance modeling crucial for their future relationships'
                          });
                        }}
                        className="flex items-center text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create Modeling Habit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main Dashboard Tab return
  return (
    <div className="space-y-4">
      {/* Dashboard Overview */}
      <DashboardOverview />
      
      {/* Harmony Pulse Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
      >
        <div className="p-4 flex justify-between items-center cursor-pointer section-header-clickable"
             onClick={(e) => toggleSection('harmonyPulse', e)}>
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Activity className="w-5 h-5 mr-2" />
            Family Harmony Pulse
          </h2>
          {expandedSections.harmonyPulse ? (
            <Minimize size={20} className="text-gray-500" />
          ) : (
            <Maximize size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.harmonyPulse && (
          <div className="px-4 pb-4" onClick={stopPropagation}>
            {loading.harmonyPulse ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading harmony data...</p>
                </div>
              </div>
            ) : (
              <FamilyHarmonyPulse />
            )}
          </div>
        )}
      </div>
      
      {/* Individual Member Journeys Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
      >
        <div className="p-4 flex justify-between items-center cursor-pointer section-header-clickable"
             onClick={(e) => toggleSection('memberJourneys', e)}>
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Users className="w-5 h-5 mr-2" />
            Individual Member Journeys
          </h2>
          {expandedSections.memberJourneys ? (
            <Minimize size={20} className="text-gray-500" />
          ) : (
            <Maximize size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.memberJourneys && (
          <div className="px-4 pb-4">
            {loading.memberJourneys ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading member journeys...</p>
                </div>
              </div>
            ) : (
              <IndividualMemberJourneys />
            )}
          </div>
        )}
      </div>
      
      {/* Child Development Observatory Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
      >
        <div className="p-4 flex justify-between items-center cursor-pointer section-header-clickable"
             onClick={(e) => toggleSection('childDevelopment', e)}>
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Brain className="w-5 h-5 mr-2" />
            Child Development Observatory
          </h2>
          {expandedSections.childDevelopment ? (
            <Minimize size={20} className="text-gray-500" />
          ) : (
            <Maximize size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.childDevelopment && (
          <div className="px-4 pb-4">
            {loading.childDevelopment ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading child development data...</p>
                </div>
              </div>
            ) : (
              <ChildDevelopmentObservatory />
            )}
          </div>
        )}
      </div>
      
      {/* Family Transformation Timeline Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
      >
        <div className="p-4 flex justify-between items-center cursor-pointer section-header-clickable"
             onClick={(e) => toggleSection('timeline', e)}>
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <TrendingUp className="w-5 h-5 mr-2" />
            Family Transformation Timeline
          </h2>
          {expandedSections.timeline ? (
            <Minimize size={20} className="text-gray-500" />
          ) : (
            <Maximize size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.timeline && (
          <div className="px-4 pb-4">
            {loading.timeline ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading transformation timeline...</p>
                </div>
              </div>
            ) : (
              <FamilyTransformationTimeline />
            )}
          </div>
        )}
      </div>
      
      {/* Balance Impact Hub Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
      >
        <div className="p-4 flex justify-between items-center cursor-pointer section-header-clickable"
             onClick={(e) => toggleSection('impactHub', e)}>
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Target className="w-5 h-5 mr-2" />
            Balance Impact Hub
          </h2>
          {expandedSections.impactHub ? (
            <Minimize size={20} className="text-gray-500" />
          ) : (
            <Maximize size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.impactHub && (
          <div className="px-4 pb-4">
            {loading.impactHub ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading impact data...</p>
                </div>
              </div>
            ) : (
              <BalanceImpactHub />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;