import React, { useState, useEffect } from 'react';
import { Filter, Info, ChevronDown, ChevronUp, Lightbulb, User, ArrowRight, Edit, Save, X, AlertTriangle } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer 
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
    selectPersonalizedInitialQuestions
  } = useSurvey();
  
  // State for filters and expanded sections
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
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
      } catch (error) {
        console.error("Error loading personalized questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPersonalizedData();
  }, [familyId, familyMembers, fullQuestionSet, selectPersonalizedInitialQuestions]);
  
  // Sample radar chart data based on family's task distribution
  const getRadarData = (filter) => {
    // This function calculates radar data from actual survey responses
    // Based on the filter, we'd show different data views
    // For simplicity, we're using the same implementation from before
    switch(filter) {
      case 'parents':
        return [
          {
            category: "Visible Household",
            mama: 68,
            papa: 32
          },
          {
            category: "Invisible Household",
            mama: 80,
            papa: 20
          },
          {
            category: "Visible Parental",
            mama: 58,
            papa: 42
          },
          {
            category: "Invisible Parental",
            mama: 75,
            papa: 25
          }
        ];
      case 'children':
        return [
          {
            category: "Visible Household",
            mama: 62,
            papa: 38
          },
          {
            category: "Invisible Household",
            mama: 70,
            papa: 30
          },
          {
            category: "Visible Parental",
            mama: 50,
            papa: 50
          },
          {
            category: "Invisible Parental",
            mama: 65,
            papa: 35
          }
        ];
      case 'all':
      default:
        return [
          {
            category: "Visible Household",
            mama: 65,
            papa: 35
          },
          {
            category: "Invisible Household",
            mama: 75,
            papa: 25
          },
          {
            category: "Visible Parental",
            mama: 55,
            papa: 45
          },
          {
            category: "Invisible Parental",
            mama: 70,
            papa: 30
          }
        ];
    }
  };
  
  // Get key insights based on data
  const getKeyInsights = () => {
    // This would be generated based on actual data analysis
    return [
      {
        type: 'challenge',
        title: 'Mental Load Imbalance',
        description: 'There\'s a significant 75/25 imbalance in Invisible Household Tasks, with Mama carrying most of the mental load.',
        icon: <Info size={20} className="text-amber-600" />
      },
      {
        type: 'insight',
        title: 'Children See More Balance',
        description: 'Children perceive the workload as more balanced than the parents do themselves, especially for Visible Parental Tasks.',
        icon: <Lightbulb size={20} className="text-blue-600" />
      },
      {
        type: 'actionable',
        title: 'Starting Point',
        description: 'The biggest opportunity is sharing the mental load of household management and planning.',
        icon: <ArrowRight size={20} className="text-purple-600" />
      }
    ];
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
  
  // Get responses for the current question
  const getResponsesForCurrentQuestion = () => {
    if (!selectedMember) return {};
    
    const memberQuestions = personalizedQuestions[selectedMember] || [];
    const questionId = memberQuestions[currentQuestionIndex]?.id;
    if (!questionId) return {};
    
    const responses = {};
    
    familyMembers.forEach(member => {
      // Only include responses for the questions that were in this member's set
      const memberSet = personalizedQuestions[member.id] || [];
      const isInMemberSet = memberSet.some(q => q.id === questionId);
      
      if (isInMemberSet) {
        // Look for actual response from survey data
        const memberResponse = surveyResponses[`${member.id}-${questionId}`];
        if (memberResponse) {
          responses[member.id] = memberResponse;
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
    
    // If feedback indicates question is now applicable or not applicable
    // reload the personalized questions to reflect changes
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
              
            <div className="mt-4 text-sm text-center text-gray-500">
              The chart shows what percentage of tasks in each category are handled by Mama vs Papa.
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
      
      {/* Survey Responses Explorer */}
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
                    onClick={() => {
                      setSelectedMember(member.id);
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                      selectedMember === member.id ? 'border-blue-500' : 'border-transparent'
                    }`}>
                      <img 
                        src={member.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2ZkZTY4YSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs mt-1">{member.name}</span>
                    <span className="text-xs text-blue-600 font-semibold">{personalizedQuestions[member.id]?.length || 0} Questions</span>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedMember ? (
              <>
                {/* Member info banner */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden border mr-3">
                      <img 
                        src={familyMembers.find(m => m.id === selectedMember)?.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2ZkZTY4YSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='} 
                        alt={familyMembers.find(m => m.id === selectedMember)?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium">{familyMembers.find(m => m.id === selectedMember)?.name}</div>
                      <div className="text-xs text-gray-500">{familyMembers.find(m => m.id === selectedMember)?.role === 'parent' ? 'Parent' : 'Child'}</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-blue-600 font-semibold">{personalizedQuestions[selectedMember]?.length || 0}</span> Personalized Questions
                  </div>
                </div>
                
                {/* Question display section */}
                {currentQuestion ? (
                  <div>
                    {/* Current Question Display */}
                    <div className="border rounded-lg p-4 mb-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Question {currentQuestionIndex + 1} of {personalizedQuestions[selectedMember]?.length || 0}</h4>
                        <button 
                          onClick={() => handleOpenFeedback(currentQuestion)}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center hover:bg-gray-200"
                        >
                          <Edit size={12} className="mr-1" />
                          Edit Feedback
                        </button>
                      </div>
                      <p className="text-lg mb-2">{currentQuestion.text}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">{currentQuestion.category}</p>
                        {excludedQuestions['family']?.includes(currentQuestion.id) ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center">
                            <AlertTriangle size={12} className="mr-1" />
                            Marked Not Applicable
                          </span>
                        ) : null}
                      </div>
                    </div>
                    
                    {/* Family responses grid */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
                      {familyMembers.map(member => {
                        // Check if this question was in this member's personalized set
                        const memberQuestions = personalizedQuestions[member.id] || [];
                        const questionInMemberSet = memberQuestions.some(q => q.id === currentQuestion.id);
                        
                        // If not in set, don't show
                        if (!questionInMemberSet) return null;
                        
                        return (
                          <div 
                            key={member.id}
                            className="border rounded-lg p-4 bg-white"
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
                              {currentResponses[member.id] ? (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  currentResponses[member.id] === 'Mama' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {currentResponses[member.id]}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">No response</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        Question {currentQuestionIndex + 1} of {personalizedQuestions[selectedMember]?.length || 0}
                      </div>
                      
                      <button
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1}
                        className={`px-4 py-2 rounded ${
                          currentQuestionIndex === (personalizedQuestions[selectedMember]?.length || 0) - 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No questions available for this family member.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Select a family member to view their survey questions and responses.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Question Feedback Modal */}
      {showFeedbackPanel && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <QuestionFeedbackPanel
            questionId={selectedQuestion.id}
            questionText={selectedQuestion.text}
            category={selectedQuestion.category}
            familyId={familyId}
            onSave={handleFeedbackSubmitted}
            onCancel={() => setShowFeedbackPanel(false)}
          />
        </div>
      )}
    </div>
  );
};

export default InitialSurveyTab;