import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Shield, TrendingUp, Clock, Brain, 
  BarChart2, PieChart, LineChart, CircleUser, Users, 
  Calendar, CheckCircle, Activity, Lightbulb, Award,
  ChevronDown, ChevronUp, Maximize, Minimize,
  AlertTriangle, Target, ArrowRight, Star, Sparkles
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import AllieAIService from '../../../services/AllieAIService';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';

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
    weekHistory
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
  
  // Toggle expanded sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
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
        
        // 2. Generate member-specific insights
        const memberData = {};
        
        for (const member of familyMembers) {
          // Different approach for parents vs children
          if (isParent(member)) {
            // For parents, analyze contribution patterns
            memberData[member.id] = await generateParentInsights(member);
          } else if (isChild(member)) {
            // For children, generate age-appropriate insights
            memberData[member.id] = await generateChildJourneyInsights(member);
          }
        }
        
        setMemberInsights(memberData);
        setLoading(prev => ({ ...prev, memberJourneys: false }));
        
        // 3. Generate child development insights using AI service
        const childDevelopmentData = {};
        
        for (const child of children) {
          try {
            // Use AllieAIService to generate insights
            const insights = await generateChildDevelopmentInsights(child);
            childDevelopmentData[child.id] = insights;
          } catch (error) {
            console.error(`Error generating insights for child ${child.id}:`, error);
            childDevelopmentData[child.id] = {
              suggestions: [],
              milestones: [],
              emotionalInsights: [],
              error: error.message
            };
          }
        }
        
        setChildInsights(childDevelopmentData);
        setLoading(prev => ({ ...prev, childDevelopment: false }));
        
        // 4. Build transformation timeline data
        const timeline = buildTimelineData();
        setTimelineData(timeline);
        setLoading(prev => ({ ...prev, timeline: false }));
        
        // 5. Calculate impact data
        const impact = await calculateImpactData();
        setImpactData(impact);
        setLoading(prev => ({ ...prev, impactHub: false }));
        
        // Set first parent as default selected member if none selected
        if (!selectedMember && parents.length > 0) {
          setSelectedMember(parents[0].id);
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
  }, [familyId, fullQuestionSet, surveyResponses, familyMembers]);
  
  // Function to calculate harmony score from various metrics
  const calculateHarmonyScore = (scores) => {
    // Start with a base score
    let harmonyScore = 70;
    
    if (!scores || !scores.categoryBalance) return harmonyScore;
    
    // Calculate average imbalance across categories
    const categories = Object.values(scores.categoryBalance);
    const avgImbalance = categories.reduce((sum, cat) => sum + Math.abs(cat.imbalance), 0) / categories.length;
    
    // Adjust score based on imbalance (more imbalance = lower score)
    harmonyScore -= avgImbalance / 2;
    
    // Adjust for completed tasks (more completed tasks = higher score)
    const completedTasksCount = (taskRecommendations || []).filter(t => t.completed).length;
    harmonyScore += completedTasksCount * 2;
    
    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(harmonyScore)));
  };
  
  // Function to generate insights for a parent
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
      
      // Get tasks assigned to this parent
      const assignedTasks = (taskRecommendations || [])
        .filter(task => task.assignedTo === parent.roleType)
        .map(task => ({
          ...task,
          completionRate: task.completed ? 100 : 0
        }));
      
      // Calculate strength areas based on task completion history
      const completedTasks = assignedTasks.filter(task => task.completed);
      
      const strengthCategories = completedTasks.reduce((acc, task) => {
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
      
      // Calculate growth areas based on incomplete tasks and imbalances
      const incompleteTasks = assignedTasks.filter(task => !task.completed);
      
      const growthCategories = incompleteTasks.reduce((acc, task) => {
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
      
      // Create personalized insights using AI (if available)
      let personalizedInsights = [];
      try {
        if (familyId && parent.id) {
          // Generate insights using AllieAIService
          const aiInsights = await AllieAIService.generateDashboardInsights(
            familyId, 
            currentWeek
          );
          
          // Filter insights relevant to this parent
          if (aiInsights && aiInsights.insights) {
            personalizedInsights = aiInsights.insights
              .filter(insight => {
                // Include insights specific to this parent's role or general insights
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
        }
      } catch (error) {
        console.error("Error generating personalized insights:", error);
        // Provide fallback insights if AI fails
        personalizedInsights = [
          {
            title: 'Balance Opportunity',
            description: `Consider focusing on ${growthAreas[0]?.category || 'shared responsibilities'} to improve your family's balance.`,
            category: 'balance'
          }
        ];
      }
      
      // Return compiled insights
      return {
        strengths: strengths.slice(0, 3),
        growthAreas: growthAreas.slice(0, 3),
        taskCompletionRate: assignedTasks.length > 0 
          ? Math.round((completedTasks.length / assignedTasks.length) * 100) 
          : 0,
        personalizedInsights,
        taskDistribution: groupTasksByCategory(assignedTasks)
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
      
      // Return compiled insights
      return {
        contributionsRecognized: childData.length > 0,
        ageAppropriateProgress: childAge,
        participationGrowth: childData.length > 1 
          ? "Increasing participation over time" 
          : "Just getting started",
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
  
  // Generate child development insights using AllieAIService
  const generateChildDevelopmentInsights = async (child) => {
    try {
      // Use the AI service to generate child-specific insights
      // First check if we have direct data from AllieAIService
      let aiChildInsights = [];
      
      try {
        // This would be a call to an AI service to get child-specific insights
        // Normally this would be: await AllieAIService.generateChildInsights(familyId, child.id);
        // But since we don't have that exact method, we'll use a general approach
        
        const familyInsights = await AllieAIService.generateDashboardInsights(
          familyId, 
          currentWeek
        );
        
        // Extract child-relevant insights if possible
        if (familyInsights && familyInsights.insights) {
          aiChildInsights = familyInsights.insights
            .filter(insight => 
              insight.childId === child.id || 
              insight.category?.toLowerCase().includes('child') ||
              insight.title?.toLowerCase().includes('child') ||
              insight.description?.toLowerCase().includes(child.name?.toLowerCase() || '')
            );
        }
      } catch (error) {
        console.warn("Error fetching AI child insights:", error);
      }
      
      // Create development milestones based on child age
      const childAge = child.age ? parseInt(child.age) : null;
      const milestones = generateAgeMilestones(childAge, child.name);
      
      // Generate emotional intelligence insights
      const emotionalInsights = generateEmotionalInsights(child);
      
      // Generate parental balance suggestions
      const parentalBalanceSuggestions = generateParentalBalanceSuggestions(child);
      
      return {
        milestones,
        emotionalInsights,
        suggestions: parentalBalanceSuggestions,
        aiInsights: aiChildInsights
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
        imbalancedArea: imbalancedCategories[0] || 'Parental Tasks'
      },
      {
        title: 'Consistent Approaches',
        description: `When parents align on expectations and routines, ${child.name} feels more secure.`,
        imbalancedArea: imbalancedCategories[1] || 'Household Tasks'
      },
      {
        title: 'Shared Special Time',
        description: `Each parent should have regular one-on-one time with ${child.name} to build connection.`,
        imbalancedArea: 'Quality Time'
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
  
  // Build timeline data from week history
  const buildTimelineData = () => {
    const timeline = [];
    
    // Add initial survey as first point if available
    if (weekHistory && weekHistory.initial) {
      timeline.push({
        weekNumber: 0,
        label: 'Initial Survey',
        date: formatDate(weekHistory.initial.completionDate),
        balance: weekHistory.initial.balance || { mama: 50, papa: 50 },
        completedTasks: 0,
        keyEvent: 'Started family balance journey'
      });
    }
    
    // Add data for each completed week
    completedWeeks.forEach(weekNum => {
      const weekData = getWeekHistoryData(weekNum);
      
      if (weekData) {
        // Count completed tasks
        const completedTasks = (weekData.tasks || []).filter(t => t.completed).length;
        
        // Determine if this was a key event week
        const isKeyEvent = completedTasks > 2 || (weekData.balance && Math.abs(weekData.balance.mama - 50) < 5);
        
        timeline.push({
          weekNumber: weekNum,
          label: `Week ${weekNum}`,
          date: formatDate(weekData.completionDate),
          balance: weekData.balance || { mama: 50, papa: 50 },
          completedTasks,
          keyEvent: isKeyEvent ? 
            (completedTasks > 2 ? 'Productivity milestone' : 'Balance milestone') : null
        });
      }
    });
    
    // Add current week if not in completed weeks
    if (!completedWeeks.includes(currentWeek)) {
      timeline.push({
        weekNumber: currentWeek,
        label: `Current (Week ${currentWeek})`,
        date: formatDate(new Date()),
        balance: { mama: 50, papa: 50 }, // Placeholder until we have data
        completedTasks: 0,
        current: true
      });
    }
    
    return timeline.sort((a, b) => a.weekNumber - b.weekNumber);
  };
  
  // Calculate impact data
  const calculateImpactData = async () => {
    try {
      // This would ideally come from the AI service
      // For now we'll calculate it from available data
      
      // Calculate time saved based on task balance improvements
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
      
      // Get total completed tasks
      const completedTasks = (taskRecommendations || []).filter(t => t.completed).length;
      
      // Generate experiment ideas
      const experiments = await generateBalanceExperiments();
      
      return {
        timeSaved,
        relationshipBoost,
        stressReduction,
        completedTasks,
        experiments
      };
    } catch (error) {
      console.error("Error calculating impact data:", error);
      return {
        timeSaved: 0,
        relationshipBoost: 0,
        stressReduction: 0,
        completedTasks: 0,
        experiments: []
      };
    }
  };
  
  // Generate balance experiments
  const generateBalanceExperiments = async () => {
    try {
      // This would ideally use AI to generate personalized experiments
      // For now using static examples that might be useful for most families
      
      let experiments = [
        {
          title: "Weekly Role Reversal",
          description: "Switch roles for one day each week - the parent who usually handles meals tries childcare, and vice versa.",
          estimatedImpact: "May improve balance by ~7% in targeted categories",
          difficulty: "moderate"
        },
        {
          title: "Shared Calendar Day",
          description: "Dedicate 30 minutes each Sunday to joint calendar review and task planning for the week ahead.",
          estimatedImpact: "Can reduce invisible work imbalance by ~12%",
          difficulty: "easy"
        },
        {
          title: "Mental Load Shift",
          description: "Explicitly transfer responsibility for one 'invisible' household system (meal planning, gift buying, etc.) to the less-involved parent.",
          estimatedImpact: "Potential 15-20% improvement in invisible household category",
          difficulty: "challenging"
        }
      ];
      
      // If we have imbalance data, try to customize to the family's needs
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
            description: `${otherParent} takes lead on ${category.toLowerCase()} for two weeks, with ${dominantParent} providing guidance rather than doing tasks.`,
            estimatedImpact: `Could reduce ${Math.round(Math.abs(data.imbalance))}% imbalance by half`,
            difficulty: "challenging",
            targeted: true
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
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
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
            <p className="text-sm mt-4 text-center text-gray-600 font-roboto">
              Based on task balance, completion rates, and family dynamics
            </p>
          </div>
          
          {/* Current Balance */}
          <div className="flex flex-col p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2 font-roboto">Current Balance</h3>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-64">
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
            </div>
          </div>
          
          {/* Category Breakdown */}
          <div className="flex flex-col p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2 font-roboto">Category Breakdown</h3>
            <div className="flex-1">
              {categoryData.length > 0 ? (
                <div className="w-full h-60">
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
                <div className="flex items-center justify-center h-60 bg-gray-100 rounded">
                  <p className="text-gray-500 text-center font-roboto">
                    Complete surveys to see category breakdown
                  </p>
                </div>
              )}
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
          
          {/* Task Completion */}
          <div className="p-4 rounded-lg bg-white border border-blue-300">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium font-roboto">Task Completion</h3>
                <p className="text-sm text-gray-600 font-roboto">
                  {taskRecommendations && taskRecommendations.length > 0
                    ? `${taskRecommendations.filter(t => t.completed).length} of ${taskRecommendations.length} tasks completed`
                    : 'No tasks created yet'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Weekly Progress */}
          <div className="p-4 rounded-lg bg-white border border-purple-300">
            <div className="flex items-start">
              <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium font-roboto">Weekly Progress</h3>
                <p className="text-sm text-gray-600 font-roboto">
                  {completedWeeks.length > 0
                    ? `${completedWeeks.length} weeks completed, on week ${currentWeek}`
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
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        {/* Member selection tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {familyMembers.map(member => (
            <button
              key={member.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-roboto ${
                selectedMember === member.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedMember(member.id)}
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
                  {/* Task Completion Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium font-roboto">Task Completion</span>
                      <span className="text-sm font-roboto">{insights.taskCompletionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${insights.taskCompletionRate}%` }} 
                      />
                    </div>
                  </div>
                  
                  {/* Task Distribution */}
                  {insights.taskDistribution && insights.taskDistribution.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 font-roboto">Task Distribution</h4>
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
                          Complete more tasks to reveal strengths
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
                          All task areas look good
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
                <div className="py-6 text-center">
                  <p className="text-gray-500 text-sm font-roboto">
                    Check the Child Development section for insights about {selectedMemberData.name}
                  </p>
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
    );
  };
  
  // 3. Child Development Observatory Component
  const ChildDevelopmentObservatory = () => {
    // State for selected child
    const [selectedChild, setSelectedChild] = useState(
      children.length > 0 ? children[0].id : null
    );
    
    // Get selected child data
    const selectedChildData = selectedChild ? 
      children.find(child => child.id === selectedChild) : null;
    
    // Get child insights
    const insights = selectedChild && childInsights[selectedChild] 
      ? childInsights[selectedChild] 
      : null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Brain className="w-5 h-5 text-purple-600 mr-2" />
            Child Development Observatory
          </h2>
          <p className="text-gray-600 text-sm font-roboto mt-1">
            Science-backed insights personalized for your {children.length > 1 ? 'children' : 'child'}
          </p>
        </div>
        
        {children.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-600 font-roboto">
              No children added to your family yet
            </p>
          </div>
        ) : (
          <>
            {/* Child selection tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {children.map(child => (
                <button
                  key={child.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-roboto ${
                    selectedChild === child.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedChild(child.id)}
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
                            {suggestion.imbalancedArea && (
                              <div className="mt-2 flex items-center">
                                <span className="text-xs text-gray-500 mr-2 font-roboto">Focus area:</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-roboto">
                                  {suggestion.imbalancedArea}
                                </span>
                              </div>
                            )}
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
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600 font-roboto">
                          Our AI is gathering more data to provide personalized insights
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Developmental Progress */}
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
    );
  };
  
  // 4. Family Transformation Timeline Component
  const FamilyTransformationTimeline = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            Family Transformation Timeline
          </h2>
          <p className="text-gray-600 text-sm font-roboto mt-1">
            Track your progress from the beginning of your balance journey
          </p>
        </div>
        
        {timelineData.length <= 1 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-600 font-roboto">
              Complete more weekly cycles to build your transformation timeline
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
                      dataKey="completedTasks" 
                      name="Completed Tasks" 
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
              <p className="text-xs text-center text-gray-600 mt-2 font-roboto">
                Track your journey from initial survey through each completed week
              </p>
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
                          Initial Balance: Mama {timelineData[0]?.balance?.mama || 0}% / Papa {timelineData[0]?.balance?.papa || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Filter for key events */}
                  {timelineData
                    .filter(point => point.keyEvent && point.weekNumber > 0)
                    .map((point, index) => (
                      <div key={index} className="relative">
                        <div className="absolute left-[-44px] top-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-md font-medium font-roboto">{point.keyEvent}</h4>
                          <p className="text-sm text-gray-600 font-roboto">
                            {point.date} - Week {point.weekNumber}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-roboto">
                              Balance: Mama {point.balance?.mama || 0}% / Papa {point.balance?.papa || 0}%
                            </span>
                            {point.completedTasks > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-roboto">
                                {point.completedTasks} Tasks Completed
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
                        <h4 className="text-md font-medium font-roboto">Current Week</h4>
                        <p className="text-sm text-gray-600 font-roboto">
                          {timelineData.find(point => point.current)?.date || 'N/A'} - Week {currentWeek}
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
                  <h3 className="text-md font-medium mb-2 text-green-800 font-roboto">Tasks Completed</h3>
                  <div className="flex items-center">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mr-3 text-xl font-bold text-green-600 font-roboto">
                      {timelineData.reduce((sum, point) => sum + (point.completedTasks || 0), 0)}
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-roboto">
                        Total tasks completed across all weeks
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
                          ? `${completedWeeks.length} of 8 weeks completed`
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
    );
  };
  
  // 5. Balance Impact Hub Component
  const BalanceImpactHub = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-medium flex items-center font-roboto">
            <Activity className="w-5 h-5 text-green-600 mr-2" />
            Balance Impact Hub
          </h2>
          <p className="text-gray-600 text-sm font-roboto mt-1">
            See how improved balance translates to real-life benefits
          </p>
        </div>
        
        {!impactData ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-600 font-roboto">
              Complete more weekly cycles to unlock impact insights
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
                            <span className="text-xs text-gray-500 font-roboto">
                              Difficulty: {experiment.difficulty}
                            </span>
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Main Return - Dashboard Layout
  return (
    <div className="space-y-4">
      {/* Harmony Pulse Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
        onClick={() => toggleSection('harmonyPulse')}
      >
        <div className="p-4 flex justify-between items-center cursor-pointer">
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
          <div className="px-4 pb-4">
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
        onClick={() => toggleSection('memberJourneys')}
      >
        <div className="p-4 flex justify-between items-center cursor-pointer">
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
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading member data...</p>
                </div>
              </div>
            ) : (
              <IndividualMemberJourneys />
            )}
          </div>
        )}
      </div>
      
      {/* Child Development Observatory Section */}
      {children.length > 0 && (
        <div 
          className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
          onClick={() => toggleSection('childDevelopment')}
        >
          <div className="p-4 flex justify-between items-center cursor-pointer">
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
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-500 font-roboto">Loading child development data...</p>
                  </div>
                </div>
              ) : (
                <ChildDevelopmentObservatory />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Family Transformation Timeline Section */}
      <div 
        className="bg-white rounded-lg shadow border-l-4 border-black mb-6"
        onClick={() => toggleSection('timeline')}
      >
        <div className="p-4 flex justify-between items-center cursor-pointer">
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
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading timeline data...</p>
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
        onClick={() => toggleSection('impactHub')}
      >
        <div className="p-4 flex justify-between items-center cursor-pointer">
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
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 font-roboto">Loading impact data...</p>
                </div>
              </div>
            ) : (
              <BalanceImpactHub />
            )}
          </div>
        )}
      </div>
      
      {/* Action Button - Link to Tasks */}
      <div className="flex justify-center">
        <button
          onClick={() => window.location.href = '/tasks'}
          className="bg-black text-white font-medium py-3 px-6 rounded-lg shadow-md hover:bg-gray-800 transition-colors flex items-center font-roboto"
        >
          <ArrowRight className="mr-2 h-5 w-5" />
          View &amp; Complete Tasks
        </button>
      </div>
    </div>
  );
};

export default DashboardTab;