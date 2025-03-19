import React, { useState, useEffect } from 'react';
import { Filter, Info, ChevronDown, ChevronUp, Lightbulb, User, ArrowRight } from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer 
} from 'recharts';

const InitialSurveyTab = () => {
  const { 
    familyMembers, 
    surveyResponses
  } = useFamily();
  
  const { fullQuestionSet } = useSurvey();
  
  // State for filters and expanded sections
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'parents', 'children'
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    insights: true,
    responses: false
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Sample radar chart data based on family's task distribution
  const getRadarData = (filter) => {
    // This would be calculated from actual survey responses
    // Based on the filter, we'd show different data views
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
    if (currentQuestionIndex < fullQuestionSet.length - 1) {
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
    const questionId = fullQuestionSet[currentQuestionIndex]?.id;
    if (!questionId) return {};
    
    // In a real implementation, this would fetch actual responses from the surveyResponses data
    // For now, we'll generate some sample responses
    const responses = {};
    
    familyMembers.forEach(member => {
      // Use actual responses if available, otherwise generate sample ones
      const memberResponse = surveyResponses[`${member.id}-${questionId}`];
      responses[member.id] = memberResponse || (Math.random() > 0.5 ? 'Mama' : 'Papa');
    });
    
    return responses;
  };
  
  // Current question
  const currentQuestion = fullQuestionSet[currentQuestionIndex];
  
  // Get current question responses
  const currentResponses = getResponsesForCurrentQuestion();
  
  // COLORS
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  return (
    <div className="space-y-4">
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
            
            {/* Current Question and Responses */}
            {currentQuestion && (
              <div>
                <div className="border rounded-lg p-4 mb-4">
                  <h4 className="font-medium">Question {currentQuestionIndex + 1} of {fullQuestionSet.length}</h4>
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
                          currentResponses[member.id] === 'Mama' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {currentResponses[member.id]}
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
                    Question {currentQuestionIndex + 1} of {fullQuestionSet.length}
                  </div>
                  
                  <button
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex === fullQuestionSet.length - 1}
                    className={`px-4 py-2 rounded ${
                      currentQuestionIndex === fullQuestionSet.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    Next Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialSurveyTab;