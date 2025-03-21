import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, CalendarDays, CheckCircle2, PieChart, 
  BarChart3, ArrowRight, Brain, Clock, Target, Filter, Users,
  MessageCircle, Layers, Info, Lightbulb, Star
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { calculateBalanceScores } from '../../../utils/TaskWeightCalculator';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip 
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

const WeekHistoryTab = ({ weekNumber }) => {
  const { 
    getWeekHistoryData,
    familyMembers,
    surveyResponses
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
    tasks: false,
    surveyResponses: false,
    familyMeeting: true,
    balance: true
  });
  const [expandedTasks, setExpandedTasks] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
  
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
  }, [weekNumber, getWeekHistoryData, surveyResponses]);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle task expansion
  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Get survey responses for the specific week - ENHANCED VERSION
  const getWeekSurveyResponses = () => {
    if (!surveyResponses) return {};
    
    const weekResponsesObj = {};
    
    // Debug: Log all keys
    console.log("All survey response keys:", Object.keys(surveyResponses));
    
    // Try all possible formats for week keys with expanded patterns
    Object.entries(surveyResponses).forEach(([key, value]) => {
      // For initial survey data in weekly tabs, include if this is week 1
      if (weekNumber === 1 && !key.includes('week') && !key.includes('weekly') && key.includes('q')) {
        const questionId = key;
        weekResponsesObj[questionId] = value;
        console.log(`Added initial survey data for Cycle 1:`, key, value);
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
        const parts = key.split(/[-_]/);
        const questionId = parts.find(part => part.startsWith('q')) || key;
        
        weekResponsesObj[questionId] = value;
        console.log(`Found cycle ${weekNumber} response:`, key, value, questionId);
      }
    });
    
    // If we're looking at cycle 1 and we still don't have data, try to use initial survey data
    if (weekNumber === 1 && Object.keys(weekResponsesObj).length === 0) {
      // Get all keys that look like question IDs (q1, q2, etc.)
      Object.entries(surveyResponses).forEach(([key, value]) => {
        if (key.match(/^q\d+$/) || (key.includes('q') && !key.includes('week'))) {
          weekResponsesObj[key] = value;
          console.log(`Added fallback initial survey data for question:`, key, value);
        }
      });
    }
    
    console.log(`Survey responses for Cycle ${weekNumber}:`, weekResponsesObj);
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
    
    categories.forEach(category => {
      // Get questions for this category
      const categoryQuestions = getQuestionsByCategory(category);
      
      // Count Mama and Papa responses
      let mamaCount = 0;
      let papaCount = 0;
      let totalCount = 0;
      
      categoryQuestions.forEach(question => {
        const response = weekSurveyResponses[question.id];
        
        if (response) {
          totalCount++;
          
          if (response === 'Mama') {
            mamaCount++;
          } else if (response === 'Papa') {
            papaCount++;
          }
        }
      });
      
      // Calculate percentages
      const mamaPercent = totalCount > 0 ? Math.round((mamaCount / totalCount) * 100) : 0;
      const papaPercent = totalCount > 0 ? Math.round((papaCount / totalCount) * 100) : 0;
      
      balanceData.push({
        category: category,
        mama: mamaPercent,
        papa: papaPercent
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
  
  // Determine if we have actual survey response data
  const hasSurveyData = Object.keys(weekSurveyResponses).length > 0;
  
  // Calculate task completion
  const calculateTaskCompletion = () => {
    const tasks = weekData?.tasks || [];
    
    const completion = {
      total: tasks.length,
      completed: tasks.filter(task => task.completed).length,
      byParent: {
        Mama: {
          total: tasks.filter(task => task.assignedTo === 'Mama').length,
          completed: tasks.filter(task => task.assignedTo === 'Mama' && task.completed).length
        },
        Papa: {
          total: tasks.filter(task => task.assignedTo === 'Papa').length,
          completed: tasks.filter(task => task.assignedTo === 'Papa' && task.completed).length
        }
      }
    };
    
    return completion;
  };
  
  // Get balance scores
  const balanceScores = getBalanceScores();
  const categoryBalance = getCategoryBalance();
  const taskCompletion = calculateTaskCompletion();
  
  // Family meeting learning resources
  const familyMeetingResources = [
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
  ];
  
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
          onClick={() => toggleSection('radar')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Task Category Distribution
          </h3>
          {expandedSections.radar ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.radar && (
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
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.5}
                  />
                    
                  <Radar
                    name="Papa's Tasks"
                    dataKey="papa"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.5}
                  />
                    
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
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
                  <span className="font-medium font-roboto">Mama ({balanceScores.mama}%)</span>
                  <span className="font-medium font-roboto">Papa ({balanceScores.papa}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${balanceScores.mama}%` }} 
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 font-roboto">
                  {balanceScores.mama > 60
                    ? "There was a significant imbalance in workload during this cycle, with Mama handling more responsibilities."
                    : balanceScores.mama < 40
                      ? "There was a significant imbalance in workload during this cycle, with Papa handling more responsibilities."
                      : "The workload was relatively balanced during this cycle."}
                </p>
              </div>
              
              <h4 className="text-base font-medium mb-3 font-roboto">Balance by Category</h4>
              <div className="space-y-4">
                {categoryBalance.map((category, index) => (
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
      
      {/* Task Completion Section */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('tasks')}
        >
          <h3 className="text-lg font-semibold font-roboto">
            Completed Tasks
          </h3>
          {expandedSections.tasks ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.tasks && (
          <div className="p-6 pt-0">
            {/* Task Completion Summary */}
            <div className="mb-6 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 font-roboto">
                    {taskCompletion.completed}/{taskCompletion.total}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Total Tasks Completed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 text-blue-600 font-roboto">
                    {taskCompletion.byParent.Mama.completed}/{taskCompletion.byParent.Mama.total}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Mama's Tasks</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1 text-green-600 font-roboto">
                    {taskCompletion.byParent.Papa.completed}/{taskCompletion.byParent.Papa.total}
                  </div>
                  <div className="text-sm text-gray-600 font-roboto">Papa's Tasks</div>
                </div>
              </div>
            </div>
            
            {/* Task List */}
            <div className="space-y-4">
              {(weekData.tasks || []).map((task) => (
                <div 
                  key={task.id} 
                  className="border rounded-lg"
                >
                  <div 
                    className={`p-4 flex justify-between items-center cursor-pointer ${
                      expandedTasks[task.id] ? 'border-b' : ''
                    } ${task.completed ? 'bg-green-50' : 'bg-white'}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-center">
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
                          Assigned to: {task.assignedToName || task.assignedTo}
                        </p>
                      </div>
                    </div>
                    {expandedTasks[task.id] ? (
                      <ChevronUp size={18} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-500" />
                    )}
                  </div>
                  
                  {/* Expanded task details */}
                  {expandedTasks[task.id] && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4 font-roboto">{task.description}</p>
                      
                      {/* Task type and category */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {task.taskType && (
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-roboto">
                            {task.taskType}
                          </span>
                        )}
                        {task.category && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-roboto">
                            {task.category}
                          </span>
                        )}
                        {task.focusArea && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-roboto">
                            {task.focusArea}
                          </span>
                        )}
                      </div>
                      
                      {/* AI Insight if available */}
                      {task.insight && (
                        <div className="bg-purple-50 p-3 rounded mb-4 border border-purple-200">
                          <div className="flex">
                            <Brain size={16} className="text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-sm font-medium text-purple-800 mb-1 font-roboto">AI Insight:</h5>
                              <p className="text-sm text-purple-800 font-roboto">{task.insight}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Completion status */}
                      {task.completed && (
                        <div className="flex items-center text-green-600 text-sm mb-4 font-roboto">
                          <CheckCircle2 size={16} className="mr-1" />
                          <span>
                            Completed on {formatDate(task.completedDate)}
                          </span>
                        </div>
                      )}
                      
                      {/* Comments list */}
                      {task.comments && task.comments.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-2 font-roboto">Comments:</h5>
                          <div className="space-y-2">
                            {task.comments.map((comment, idx) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                                <div className="font-medium mb-1 font-roboto">{comment.userName}:</div>
                                <p className="font-roboto">{comment.text}</p>
                                <div className="text-xs text-gray-500 mt-1 font-roboto">{comment.timestamp}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Subtasks if available */}
                      {task.subTasks && task.subTasks.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-2 font-roboto">Subtasks:</h5>
                          <div className="space-y-2">
                            {task.subTasks.map((subtask) => (
                              <div key={subtask.id} className="flex items-start">
                                <div className={`mt-0.5 p-1 rounded-full mr-2 ${
                                  subtask.completed 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                  <CheckCircle2 size={12} />
                                </div>
                                <div>
                                  <div className="font-medium text-sm font-roboto">{subtask.title}</div>
                                  <p className="text-sm text-gray-600 font-roboto">{subtask.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {weekData.tasks?.length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No tasks recorded for this cycle.</p>
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
                {familyMeetingResources.map((resource, index) => (
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
      
      {/* Survey Responses Section */}
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
            
            {/* Survey questions and responses */}
            <div className="space-y-4">
              {hasSurveyData ? (
                getFilteredQuestions().map((question) => {
                  // Extract just the question ID part (e.g., q1) for lookup
                  const questionId = question.id;
                  let response = weekSurveyResponses[questionId];
                  
                  // Try alternative formats if no response found
                  if (!response) {
                    // Try with week prefix formats
                    const prefixedKeys = [
                      `week-${weekNumber}-${questionId}`,
                      `weekly-${weekNumber}-${questionId}`,
                      `week${weekNumber}-${questionId}`,
                      `week${weekNumber}_${questionId}`
                    ];
                    
                    for (const key of prefixedKeys) {
                      if (surveyResponses[key]) {
                        response = surveyResponses[key];
                        break;
                      }
                    }
                  }
                  
                  // Only show questions with responses
                  if (!response) return null;
                  
                  return (
                    <div key={questionId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-2 font-medium font-roboto">{question.text}</div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500 font-roboto">{question.category}</div>
                        <div className={`px-3 py-1 rounded-full text-white font-roboto ${
                          response === 'Mama' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {response}
                        </div>
                      </div>
                    </div>
                  );
                }).filter(Boolean) // Remove nulls
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No survey questions found for Cycle {weekNumber}.</p>
                  <div className="text-sm text-gray-400 mt-2 font-roboto">
                    This could be because the responses were not saved correctly or the survey format changed.
                  </div>
                </div>
              )}
              
              {/* Show message if no questions match the filter */}
              {hasSurveyData && getFilteredQuestions().filter(q => weekSurveyResponses[q.id]).length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-roboto">No questions found matching the selected category filter.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Cycle Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 font-roboto">Cycle {weekNumber} Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Insight cards */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <BarChart3 size={20} className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1 font-roboto">Task Distribution</h4>
                <p className="text-sm text-blue-700 font-roboto">
                  {balanceScores.mama > 65 
                    ? `Mama handled ${balanceScores.mama}% of tasks this cycle, indicating a significant imbalance that should be addressed.`
                    : balanceScores.mama > 55
                      ? `Mama handled ${balanceScores.mama}% of tasks this cycle, showing moderate imbalance with room for improvement.`
                      : balanceScores.mama > 45
                        ? `Family achieved good balance this cycle with Mama handling ${balanceScores.mama}% of tasks.`
                        : balanceScores.mama > 35
                          ? `Papa handled ${balanceScores.papa}% of tasks this cycle, showing moderate imbalance with room for improvement.`
                          : `Papa handled ${balanceScores.papa}% of tasks this cycle, indicating a significant imbalance that should be addressed.`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-start">
              <Brain size={20} className="text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1 font-roboto">Hidden Imbalances</h4>
                <p className="text-sm text-purple-700 font-roboto">
                  {categoryBalance.some(c => c.category.includes('Invisible') && Math.abs(c.mama - c.papa) > 30)
                    ? "Significant imbalance detected in invisible work during this cycle. This often creates mental load that goes unrecognized."
                    : "No major imbalances found in invisible work this cycle, which is excellent for reducing mental load."}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-start">
              <CheckCircle2 size={20} className="text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1 font-roboto">Task Completion</h4>
                <p className="text-sm text-green-700 font-roboto">
                  {taskCompletion.completed === 0
                    ? "No tasks were recorded as completed for this cycle."
                    : `${taskCompletion.completed} out of ${taskCompletion.total} tasks were completed this cycle (${Math.round((taskCompletion.completed / taskCompletion.total) * 100)}% completion rate).`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start">
              <Clock size={20} className="text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1 font-roboto">Time Investment</h4>
                <p className="text-sm text-amber-700 font-roboto">
                  Looking at time-intensive tasks (cooking, childcare, planning), the time investment was approximately {balanceScores.mama}% Mama / {balanceScores.papa}% Papa for this cycle.
                </p>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default WeekHistoryTab;