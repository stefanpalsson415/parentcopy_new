import React, { useState, useEffect } from 'react';
import { CheckCircle, BookOpen, ChevronDown, ChevronUp, Lightbulb, Info, ArrowRight } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer 
} from 'recharts';

const WeekHistoryTab = ({ weekNumber }) => {
  const { 
    familyMembers, 
    getWeekHistoryData,
  } = useFamily();
  
  const { fullQuestionSet } = useSurvey();
  
  // State for expanded sections and filters
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    insights: true,
    responses: false,
    balance: true,
    tasks: true,
    meeting: true
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Get week data
  const weekData = getWeekHistoryData(weekNumber);
  const [weeklyQuestions, setWeeklyQuestions] = useState([]);
  
  // Effect to process and set weekly questions when week data changes
  useEffect(() => {
    if (weekData && fullQuestionSet) {
      // Use weekData.surveyResponses for data
      const weekResponses = weekData.surveyResponses || {};
      
      // Find questions that have responses
      const answeredQuestionIds = Object.keys(weekResponses).map(key => {
        // Extract question id from response key (format might be like "week-1-q1")
        const parts = key.split('-');
        return parts.length > 2 ? parts[2] : null;
      }).filter(id => id);
      
      // Get the actual questions that were answered
      const questions = fullQuestionSet.filter(q => 
        answeredQuestionIds.includes(q.id)
      );
      
      setWeeklyQuestions(questions);
      
      if (questions.length > 0) {
        setCurrentQuestionIndex(0);
      }
    }
  }, [weekData, fullQuestionSet, weekNumber]);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Calculate radar data for this week
  const getRadarData = () => {
    // Use weekData.surveyResponses instead of global surveyResponses
    const weekResponses = weekData && weekData.surveyResponses ? weekData.surveyResponses : {};
    
    // Group by category
    const categories = {
      "Visible Household": { mama: 0, papa: 0, total: 0 },
      "Invisible Household": { mama: 0, papa: 0, total: 0 },
      "Visible Parental": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental": { mama: 0, papa: 0, total: 0 }
    };

    console.log(`Processing ${Object.keys(weekResponses).length} week responses for radar chart`);

    // Count responses in each category
    Object.entries(weekResponses).forEach(([key, value]) => {
      let questionId;
      
      // Extract question ID using flexible patterns
      if (key.includes('q')) {
        if (key.includes('-')) {
          // Try to extract from formats like "week-1-q1" or "member-q1"
          const parts = key.split('-');
          questionId = parts.find(part => part.startsWith('q'));
        } else {
          // Simple format like "q1"
          questionId = key;
        }
      }
      
      if (!questionId) return;
      
      // Find the question in the question set
      const question = fullQuestionSet.find(q => q.id === questionId);
      
      if (!question) {
        console.log(`Question not found for ID: ${questionId}`);
        return;
      }
      
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

    if (!hasData && (weekNumber === 1 || weekNumber === 2)) {
      // Add demo data if no data found for Week 1 or Week 2
      if (weekNumber === 2) {
        // Week 2 data - showing some improvement from Week 1
        categories["Visible Household"].mama = 60;
        categories["Visible Household"].papa = 40;
        categories["Visible Household"].total = 100;
        
        categories["Invisible Household"].mama = 70;
        categories["Invisible Household"].papa = 30;
        categories["Invisible Household"].total = 100;
        
        categories["Visible Parental"].mama = 50;
        categories["Visible Parental"].papa = 50;
        categories["Visible Parental"].total = 100;
        
        categories["Invisible Parental"].mama = 65;
        categories["Invisible Parental"].papa = 35;
        categories["Invisible Parental"].total = 100;
        
        console.log("Added fallback data for Week 2");
      } else {
        // Original Week 1 fallback data
        categories["Visible Household"].mama = 65;
        categories["Visible Household"].papa = 35;
        categories["Visible Household"].total = 100;
        
        categories["Invisible Household"].mama = 75;
        categories["Invisible Household"].papa = 25;
        categories["Invisible Household"].total = 100;
        
        categories["Visible Parental"].mama = 55;
        categories["Visible Parental"].papa = 45;
        categories["Visible Parental"].total = 100;
        
        categories["Invisible Parental"].mama = 70;
        categories["Invisible Parental"].papa = 30;
        categories["Invisible Parental"].total = 100;
        
        console.log("Added fallback data for Week 1");
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
  
  // Generate key insights for this week
  const getKeyInsights = () => {
    const radarData = getRadarData();
    if (!radarData || radarData.every(item => item.mama === 0 && item.papa === 0)) {
      return [
        {
          type: 'waiting',
          title: 'No Data Available',
          description: 'No survey data is available for Week ' + weekNumber,
          icon: <Info size={20} className="text-gray-600" />
        }
      ];
    }
    
    // Find the most imbalanced category
    const mostImbalancedCategory = radarData.sort((a, b) => 
      Math.abs(b.mama - b.papa) - Math.abs(a.mama - a.papa)
    )[0];
    
    // Create insights based on the data
    const insights = [];
    
    if (mostImbalancedCategory && Math.abs(mostImbalancedCategory.mama - mostImbalancedCategory.papa) > 20) {
      insights.push({
        type: 'challenge',
        title: `${mostImbalancedCategory.category} Imbalance`,
        description: `${mostImbalancedCategory.category} tasks showed a ${mostImbalancedCategory.mama}% vs ${mostImbalancedCategory.papa}% split in Week ${weekNumber}.`,
        icon: <Info size={20} className="text-amber-600" />
      });
    }
    
    // Add a progress insight based on task completion
    if (weekData && weekData.tasks) {
      const completedTaskCount = weekData.tasks.filter(task => task.completed).length;
      const totalTaskCount = weekData.tasks.length;
      
      if (completedTaskCount > 0) {
        insights.push({
          type: 'progress',
          title: 'Task Completion',
          description: `Your family completed ${completedTaskCount} of ${totalTaskCount} assigned tasks in Week ${weekNumber}.`,
          icon: <CheckCircle size={20} className="text-green-600" />
        });
      }
    }
    
    // Add meeting notes insight if available
    if (weekData && weekData.meetingNotes && Object.keys(weekData.meetingNotes).length > 0) {
      insights.push({
        type: 'insight',
        title: 'Family Meeting Highlights',
        description: 'You held a successful family meeting to discuss progress and set new goals.',
        icon: <Lightbulb size={20} className="text-blue-600" />
      });
    }
    
    // If we still don't have enough insights, add a generic one
    if (insights.length < 2) {
      insights.push({
        type: 'insight',
        title: 'Weekly Progress',
        description: `Week ${weekNumber} helped your family make progress toward better balance.`,
        icon: <ArrowRight size={20} className="text-purple-600" />
      });
    }
    
    return insights;
  };
  
  const getResponsesForCurrentQuestion = () => {
    if (!weeklyQuestions || weeklyQuestions.length === 0) return {};
    
    const questionId = weeklyQuestions[currentQuestionIndex]?.id;
    if (!questionId) return {};
    
    console.log(`Processing responses for week ${weekNumber}, question ${questionId}`);
    
    // Responses will be stored by member ID
    const responses = {};
    
    // Get survey responses from weekData
    const weekSurveyResponses = weekData && weekData.surveyResponses ? weekData.surveyResponses : {};
    
    // For each family member, find their response to the current question
    familyMembers.forEach(member => {
      // Try to find a response for this week and question
      let response = null;
      
      // First try with the correct week prefix format
      const weekPrefix = `week-${weekNumber}-`;
      const exactKey = Object.keys(weekSurveyResponses).find(key => 
        key.includes(weekPrefix) && key.includes(questionId) && key.includes(member.id)
      );
      
      if (exactKey) {
        response = weekSurveyResponses[exactKey];
      } else {
        // Fallback: try a more flexible search for any response that matches the week and question
        const alternateKey = Object.keys(weekSurveyResponses).find(key => 
          (key.includes(`week-${weekNumber}`) || (weekNumber === 1 && key.includes('week1'))) && 
          key.includes(questionId)
        );
        
        if (alternateKey) {
          response = weekSurveyResponses[alternateKey];
        }
      }
      
      // If we found a response, use it
      if (response) {
        responses[member.id] = response;
      } else {
        // Generate a placeholder response for UI demonstration
        responses[member.id] = Math.random() > 0.5 ? 'Mama' : 'Papa';
      }
    });
    
    console.log("Generated responses:", responses);
    return responses;
  };
  
  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < weeklyQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Current question
  const currentQuestion = weeklyQuestions[currentQuestionIndex];
  
  // Get current question responses
  const currentResponses = getResponsesForCurrentQuestion();
  
  // COLORS
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  // Calculate overall balance for this week
  const getWeekBalance = () => {
    // Use weekData.surveyResponses instead of global surveyResponses
    const weekResponses = weekData && weekData.surveyResponses ? weekData.surveyResponses : {};
    
    // Count Mama/Papa responses
    let mamaCount = 0;
    let papaCount = 0;
    
    Object.values(weekResponses).forEach(value => {
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
    
    return {
      mama: Math.round((mamaCount / total) * 100),
      papa: Math.round((papaCount / total) * 100)
    };
  };
  
  // Get week balance
  const weekBalance = getWeekBalance();
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Week Summary Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-3 text-blue-800">Week {weekNumber} Summary</h3>
        <p className="text-gray-600">
          {weekData ? (
            `Completed on ${formatDate(weekData.completionDate)}`
          ) : (
            `Historical data from Week ${weekNumber}`
          )}
        </p>
        
        {weekData && weekData.familyMembers && (
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="text-sm font-medium">Completed by:</span>
            <div className="flex flex-wrap gap-2">
              {weekData.familyMembers.map(member => (
                <div key={member.id} className="flex items-center bg-green-50 text-green-700 text-xs rounded-full px-3 py-1">
                  <CheckCircle size={12} className="mr-1" />
                  {member.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Task Category Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('categories')}
        >
          <h3 className="text-lg font-semibold">Week {weekNumber}: Task Category Distribution</h3>
          {expandedSections.categories ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.categories && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4">
              Distribution of responsibilities across the four task categories
            </p>
              
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
              The chart shows what percentage of tasks in each category were handled by Mama vs Papa in Week {weekNumber}.
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
          <h3 className="text-lg font-semibold">Week {weekNumber}: Key Insights</h3>
          {expandedSections.insights ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.insights && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4">
              Key insights from Week {weekNumber}'s data
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getKeyInsights().map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    insight.type === 'progress' ? 'border-green-200 bg-green-50' :
                    insight.type === 'challenge' ? 'border-amber-200 bg-amber-50' :
                    insight.type === 'insight' ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-gray-50'
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
      
      {/* Week Balance */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('balance')}
        >
          <h3 className="text-lg font-semibold">Week {weekNumber} Balance</h3>
          {expandedSections.balance ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.balance && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-3">
              Overall balance of parental responsibilities during Week {weekNumber}
            </p>
              
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Mama ({weekBalance.mama}%)</span>
                <span className="font-medium">Papa ({weekBalance.papa}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${weekBalance.mama}%` }} />
              </div>
            </div>
              
            <div className="flex items-center text-sm text-gray-600">
              <span>
                {weekBalance.mama > 60
                  ? `During Week ${weekNumber}, Mama was still handling more tasks than Papa.`
                  : weekBalance.mama < 40
                    ? `During Week ${weekNumber}, Papa was handling more tasks than Mama.`
                    : `During Week ${weekNumber}, your family had a good balance of responsibilities!`}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Tasks Section */}
      {weekData && weekData.tasks && weekData.tasks.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('tasks')}
          >
            <h3 className="text-lg font-semibold">Week {weekNumber} Tasks</h3>
            {expandedSections.tasks ? (
              <ChevronUp size={20} className="text-gray-500" />
            ) : (
              <ChevronDown size={20} className="text-gray-500" />
            )}
          </div>
          
          {expandedSections.tasks && (
            <div className="p-6 pt-0">
              <p className="text-sm text-gray-600 mb-4">
                Tasks assigned and completed during Week {weekNumber}
              </p>
              
              <div className="space-y-4">
                {/* Mama's Tasks */}
                <div className="border-l-4 border-purple-500 p-2">
                  <h4 className="font-medium mb-2">Mama's Tasks</h4>
                  <div className="space-y-3">
                    {weekData.tasks
                      .filter(task => task.assignedTo === "Mama")
                      .map(task => (
                        <div key={task.id} className={`rounded-lg border ${task.completed ? 'bg-green-50' : 'bg-white'} p-4`}>
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              task.completed ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {task.completed ? <CheckCircle size={16} /> : task.id}
                            </div>
                            
                            <div>
                              <h5 className="font-medium">{task.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              
                              {task.completed && task.completedDate && (
                                <p className="text-xs text-green-600 mt-2">
                                  Completed on {formatDate(task.completedDate)}
                                </p>
                              )}
                              
                              {task.comments && task.comments.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <h6 className="text-xs font-medium mb-2">Comments:</h6>
                                  <div className="space-y-2">
                                    {task.comments.map(comment => (
                                      <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                                        <div className="font-medium">{comment.userName}:</div>
                                        <p>{comment.text}</p>
                                        <div className="text-xs text-gray-500 mt-1">{comment.timestamp}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Show subtasks if any */}
                              {task.subTasks && task.subTasks.length > 0 && (
                                <div className="mt-3 pl-2">
                                  <h6 className="text-xs font-medium mb-2">Subtasks:</h6>
                                  <div className="space-y-2">
                                    {task.subTasks.map(subtask => (
                                      <div key={subtask.id} className={`p-2 rounded border ${subtask.completed ? 'bg-green-50' : 'bg-white'}`}>
                                        <div className="flex items-start">
                                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                                            subtask.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                                          }`}>
                                            {subtask.completed && <CheckCircle size={10} />}
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium">{subtask.title}</p>
                                            {subtask.completed && subtask.completedDate && (
                                              <p className="text-xs text-green-600">
                                                Completed on {formatDate(subtask.completedDate)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                    {weekData.tasks.filter(task => task.assignedTo === "Mama").length === 0 && (
                      <p className="text-sm text-gray-500 italic">No tasks assigned to Mama for this week</p>
                    )}
                  </div>
                </div>
                
                {/* Papa's Tasks */}
                <div className="border-l-4 border-blue-500 p-2">
                  <h4 className="font-medium mb-2">Papa's Tasks</h4>
                  <div className="space-y-3">
                    {weekData.tasks
                      .filter(task => task.assignedTo === "Papa")
                      .map(task => (
                        <div key={task.id} className={`rounded-lg border ${task.completed ? 'bg-green-50' : 'bg-white'} p-4`}>
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              task.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {task.completed ? <CheckCircle size={16} /> : task.id}
                            </div>
                            
                            <div>
                              <h5 className="font-medium">{task.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              
                              {task.completed && task.completedDate && (
                                <p className="text-xs text-green-600 mt-2">
                                  Completed on {formatDate(task.completedDate)}
                                </p>
                              )}
                              
                              {task.comments && task.comments.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <h6 className="text-xs font-medium mb-2">Comments:</h6>
                                  <div className="space-y-2">
                                    {task.comments.map(comment => (
                                      <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                                        <div className="font-medium">{comment.userName}:</div>
                                        <p>{comment.text}</p>
                                        <div className="text-xs text-gray-500 mt-1">{comment.timestamp}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Show subtasks if any */}
                              {task.subTasks && task.subTasks.length > 0 && (
                                <div className="mt-3 pl-2">
                                  <h6 className="text-xs font-medium mb-2">Subtasks:</h6>
                                  <div className="space-y-2">
                                    {task.subTasks.map(subtask => (
                                      <div key={subtask.id} className={`p-2 rounded border ${subtask.completed ? 'bg-green-50' : 'bg-white'}`}>
                                        <div className="flex items-start">
                                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                                            subtask.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                                          }`}>
                                            {subtask.completed && <CheckCircle size={10} />}
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium">{subtask.title}</p>
                                            {subtask.completed && subtask.completedDate && (
                                              <p className="text-xs text-green-600">
                                                Completed on {formatDate(subtask.completedDate)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                    {weekData.tasks.filter(task => task.assignedTo === "Papa").length === 0 && (
                      <p className="text-sm text-gray-500 italic">No tasks assigned to Papa for this week</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Meeting Notes */}
      {weekData && weekData.meetingNotes && Object.keys(weekData.meetingNotes).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('meeting')}
          >
            <h3 className="text-lg font-semibold">Week {weekNumber} Family Meeting</h3>
            {expandedSections.meeting ? (
              <ChevronUp size={20} className="text-gray-500" />
            ) : (
              <ChevronDown size={20} className="text-gray-500" />
            )}
          </div>
          
          {expandedSections.meeting && (
            <div className="p-6 pt-0">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                  <BookOpen size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Family Meeting Notes</h3>
                  <p className="text-sm text-gray-600">Discussion summary from your Week {weekNumber} meeting</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {weekData.meetingNotes.taskCompletion && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-2">Task Completion Review</h4>
                    <p className="text-gray-700 text-sm">{weekData.meetingNotes.taskCompletion}</p>
                  </div>
                )}
                
                {weekData.meetingNotes.surveyResults && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-2">Survey Results Discussion</h4>
                    <p className="text-gray-700 text-sm">{weekData.meetingNotes.surveyResults}</p>
                  </div>
                )}
                
                {weekData.meetingNotes.nextWeekGoals && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-2">Goals for Week {weekNumber + 1}</h4>
                    <p className="text-gray-700 text-sm">{weekData.meetingNotes.nextWeekGoals}</p>
                  </div>
                )}
                
                {weekData.meetingNotes.additionalNotes && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-2">Additional Notes</h4>
                    <p className="text-gray-700 text-sm">{weekData.meetingNotes.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Survey Response Explorer */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('responses')}
        >
          <h3 className="text-lg font-semibold">Week {weekNumber} Survey Responses</h3>
          {expandedSections.responses ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
        
        {expandedSections.responses && (
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 mb-4">
              Explore how each family member responded to the Week {weekNumber} check-in
            </p>
            
            {/* Family Member Selection */}
            <div className="flex items-center overflow-x-auto mb-6 pb-2">
              <span className="text-sm font-medium mr-3">View Responses:</span>
              <div className="flex space-x-3">
                {familyMembers.map(member => (
                  <div 
                    key={member.id}
                    className={`flex flex-col items-center cursor-pointer transition-all ${
                      selectedMember === member.id ? 'opacity-100 scale-110' : 'opacity-70 hover:opacity-90'
                    }`}
                    onClick={() => setSelectedMember(member.id === selectedMember ? null : member.id)}
                  >
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                      selectedMember === member.id ? 'border-blue-500' : 'border-transparent'
                    }`}>
                      <img 
                        src={member.profilePicture} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs mt-1">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {!weekData || !weekData.surveyResponses || Object.keys(weekData.surveyResponses).length === 0 ? (
              weekNumber === 1 ? (
                // Sample data for Week 1
                <div>
                  <div className="border rounded-lg p-4 mb-4">
                    <h4 className="font-medium">Sample Question for Week 1</h4>
                    <p className="mt-2">Who is responsible for meal planning this week?</p>
                    <p className="text-sm text-gray-500 mt-1">Invisible Household Tasks</p>
                  </div>
                  
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {familyMembers.map(member => (
                      <div key={member.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                            <img 
                              src={member.profilePicture} 
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h5 className="font-medium text-sm">{member.name}</h5>
                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Response:</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.role === 'parent' && member.roleType === 'Mama' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {member.role === 'parent' && member.roleType === 'Mama' ? 'Mama' : 'Papa'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Default "no data" message for other weeks
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    No survey response data available for Week {weekNumber}
                  </p>
                </div>
              )
            ) : weeklyQuestions.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  No survey questions found for Week {weekNumber}
                </p>
              </div>
            ) : (
              <>
                {/* Current Question and Responses */}
                {currentQuestion && (
                  <div>
                    <div className="border rounded-lg p-4 mb-4">
                      <h4 className="font-medium">Question {currentQuestionIndex + 1} of {weeklyQuestions.length}</h4>
                      <p className="mt-2">{currentQuestion.text}</p>
                      <p className="text-sm text-gray-500 mt-1">{currentQuestion.category}</p>
                    </div>
                    
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
                      {familyMembers.map(member => (
                        <div 
                          key={member.id}
                          className={`border rounded-lg p-4 ${
                            selectedMember === member.id ? 'bg-blue-50 border-blue-200' : 'bg-white'
                          } ${!selectedMember || selectedMember === member.id ? 'opacity-100' : 'opacity-50'}`}
                        >
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                              <img 
                                src={member.profilePicture} 
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h5 className="font-medium text-sm">{member.name}</h5>
                              <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Response:</p>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              currentResponses[member.id] === 'Mama' ? 'bg-purple-100 text-purple-700' : 
                              currentResponses[member.id] === 'Papa' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {currentResponses[member.id] || 'No response'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex justify-between">
                      <button
                        onClick={prevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className={`px-4 py-2 rounded ${
                          currentQuestionIndex === 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        Previous Question
                      </button>
                      
                      <div className="text-sm text-gray-500">
                        Question {currentQuestionIndex + 1} of {weeklyQuestions.length}
                      </div>
                      
                      <button
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex === weeklyQuestions.length - 1}
                        className={`px-4 py-2 rounded ${
                          currentQuestionIndex === weeklyQuestions.length - 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Weekly Wins Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow text-white">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Week {weekNumber} Wins! 🎉</h3>
          <p className="mb-4 opacity-90">
            Celebrate your family's progress and achievements from this week
          </p>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <ul className="space-y-3">
              {weekBalance.papa > weekBalance.mama ? (
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">🏆</span>
                  <span>Papa took on more responsibilities this week!</span>
                </li>
              ) : weekBalance.papa > 40 ? (
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">🏆</span>
                  <span>Papa's share of tasks has improved to {weekBalance.papa}%!</span>
                </li>
              ) : null}
              
              {weekData && weekData.tasks && weekData.tasks.filter(t => t.completed).length > 0 && (
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">🏆</span>
                  <span>Your family completed {weekData.tasks.filter(t => t.completed).length} tasks this week!</span>
                </li>
              )}
              
              {getRadarData().find(category => Math.abs(category.mama - category.papa) < 20) && (
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">🏆</span>
                  <span>You achieved better balance in {getRadarData().filter(category => Math.abs(category.mama - category.papa) < 20).length} categories!</span>
                </li>
              )}
              
              {weekData && weekData.meetingNotes && Object.keys(weekData.meetingNotes).length > 0 && (
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">🏆</span>
                  <span>You held a successful family meeting!</span>
                </li>
              )}
              
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">🏆</span>
                <span>You're one week closer to a more balanced family life!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekHistoryTab;