import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, Clock, 
  MessageCircle, Brain, Info, CheckCircle, Lightbulb, Target,
  AlertCircle, Bell, Award, Clipboard, X, RefreshCw, ArrowRight
} from 'lucide-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSurvey } from '../../../contexts/SurveyContext';
import DailyCheckInTool from '../DailyCheckInTool';
import GratitudeTracker from '../GratitudeTracker';
import DateNightPlanner from '../DateNightPlanner';
import SelfCarePlanner from '../SelfCarePlanner';
import CoupleRelationshipChart from '../CoupleRelationshipChart';
import RelationshipProgressChart from '../RelationshipProgressChart';
import AIRelationshipInsights from '../AIRelationshipInsights';
import AllieAIEngineService from '../../../services/AllieAIEngineService';
import { db } from '../../../services/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import CalendarService from '../../../services/CalendarService';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
};

// Cycle Status Component
const CycleStatusTracker = ({ 
  cycle, 
  cycleData, 
  questionnaireCompleted, 
  onStartQuestionnaire, 
  onStartMeeting 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold font-roboto">Cycle {cycle} Status</h3>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-roboto">
          Current Cycle
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`border rounded-lg p-4 text-center ${questionnaireCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <div className="mb-2">
            {questionnaireCompleted ? (
              <CheckCircle className="mx-auto text-green-600" size={24} />
            ) : (
              <Clipboard className="mx-auto text-gray-400" size={24} />
            )}
          </div>
          <h4 className="text-sm font-medium font-roboto mb-1">Assessment</h4>
          <p className="text-xs text-gray-600 font-roboto">
            {questionnaireCompleted ? 'Completed' : 'Not started'}
          </p>
          {!questionnaireCompleted && (
            <button 
              onClick={onStartQuestionnaire}
              className="mt-2 px-3 py-1 bg-black text-white text-xs rounded-full font-roboto"
            >
              Start
            </button>
          )}
        </div>
        
        <div className={`border rounded-lg p-4 text-center ${cycleData?.meeting ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <div className="mb-2">
            {cycleData?.meeting ? (
              <CheckCircle className="mx-auto text-green-600" size={24} />
            ) : (
              <Users className="mx-auto text-gray-400" size={24} />
            )}
          </div>
          <h4 className="text-sm font-medium font-roboto mb-1">Couple Meeting</h4>
          <p className="text-xs text-gray-600 font-roboto">
            {cycleData?.meeting ? 'Completed' : questionnaireCompleted ? 'Ready to start' : 'Complete assessment first'}
          </p>
          {questionnaireCompleted && !cycleData?.meeting && (
            <button 
              onClick={onStartMeeting}
              className="mt-2 px-3 py-1 bg-black text-white text-xs rounded-full font-roboto"
            >
              Start
            </button>
          )}
        </div>
        
        <div className={`border rounded-lg p-4 text-center ${cycleData?.metrics ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <div className="mb-2">
            {cycleData?.metrics ? (
              <CheckCircle className="mx-auto text-green-600" size={24} />
            ) : (
              <Target className="mx-auto text-gray-400" size={24} />
            )}
          </div>
          <h4 className="text-sm font-medium font-roboto mb-1">Results</h4>
          <p className="text-xs text-gray-600 font-roboto">
            {cycleData?.metrics ? 'Available' : 'Complete assessment first'}
          </p>
          {cycleData?.metrics && (
            <button 
              onClick={() => {
                // Scroll to charts section
                document.getElementById('relationship-charts')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-2 px-3 py-1 bg-black text-white text-xs rounded-full font-roboto"
            >
              View
            </button>
          )}
        </div>
      </div>
      
      {cycleData?.metrics && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-700">{cycleData.metrics.satisfaction?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600">Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{cycleData.metrics.communication?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600">Communication</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{cycleData.metrics.connection?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600">Connection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{cycleData.metrics.workload?.toFixed(1) || "3.0"}</div>
            <div className="text-xs text-gray-600">Workload Balance</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Relationship Health Questionnaire Component
const RelationshipHealthQuestionnaire = ({ questions, onSubmit, cycle, previousData, onCancel }) => {
  const [responses, setResponses] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with previous data if available
  useEffect(() => {
    if (previousData?.questionnaireResponses) {
      setResponses(previousData.questionnaireResponses);
    }
  }, [previousData]);

  // Group questions by category
  const categories = {
    "satisfaction": { title: "Relationship Satisfaction", questions: [] },
    "communication": { title: "Communication", questions: [] },
    "connection": { title: "Connection Quality", questions: [] },
    "workload": { title: "Workload Balance", questions: [] }
  };

  // Assign questions to categories
  questions.forEach(question => {
    if (question.text.toLowerCase().includes("satisfaction") || 
        question.text.toLowerCase().includes("happy") || 
        question.text.toLowerCase().includes("fulfillment")) {
      categories.satisfaction.questions.push(question);
    } else if (question.text.toLowerCase().includes("communication") || 
              question.text.toLowerCase().includes("listen") || 
              question.text.toLowerCase().includes("understand")) {
      categories.communication.questions.push(question);
    } else if (question.text.toLowerCase().includes("connect") || 
              question.text.toLowerCase().includes("intimacy") || 
              question.text.toLowerCase().includes("quality time")) {
      categories.connection.questions.push(question);
    } else if (question.text.toLowerCase().includes("workload") || 
              question.text.toLowerCase().includes("balance") || 
              question.text.toLowerCase().includes("share")) {
      categories.workload.questions.push(question);
    } else {
      // Default to satisfaction if no category matches
      categories.satisfaction.questions.push(question);
    }
  });

  // Create steps from categories
  const steps = Object.entries(categories)
    .filter(([_, category]) => category.questions.length > 0)
    .map(([key, category]) => ({
      key,
      title: category.title,
      questions: category.questions
    }));

  // Handle response change (always using 1-5 scale)
  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await onSubmit(responses);
      if (result) {
        // Successfully saved
        return true;
      } else {
        throw new Error("Failed to save questionnaire");
      }
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      setError(err.message || "Failed to save questionnaire");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Navigate to next step
  const handleNext = () => {
    // Check if all questions in current step are answered
    const currentQuestions = steps[step].questions;
    const allAnswered = currentQuestions.every(q => responses[q.id] !== undefined);
    
    if (!allAnswered) {
      setError("Please answer all questions before continuing");
      return;
    }
    
    setError(null);
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Last step, submit
      handleSubmit();
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Render the current step
  const renderCurrentStep = () => {
    if (steps.length === 0) return null;
    
    const currentStep = steps[step];
    
    return (
      <div>
        <h4 className="font-medium text-lg mb-4 font-roboto">{currentStep.title}</h4>
        
        <div className="space-y-6">
          {currentStep.questions.map(question => (
            <div key={question.id} className="border rounded-lg p-4">
              <p className="mb-3 font-roboto">{question.text}</p>
              
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500 font-roboto">Low</span>
                <div className="flex space-x-4">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full flex items-center justify-center 
                                ${responses[question.id] === value 
                                  ? 'bg-black text-white' 
                                  : 'bg-white border hover:bg-gray-100'}`}
                      onClick={() => handleResponseChange(question.id, value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500 font-roboto">High</span>
              </div>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm font-roboto">
            {error}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          {step === 0 ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded font-roboto"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-roboto"
            >
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : step < steps.length - 1 ? (
              <>Next<ArrowRight size={16} className="ml-2" /></>
            ) : (
              <>Complete<CheckCircle size={16} className="ml-2" /></>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Health Assessment</h3>
        <p className="text-gray-600 font-roboto">
          This questionnaire helps track your relationship health for Cycle {cycle}. 
          Your responses are confidential and will help provide personalized insights.
        </p>
      </div>
      
      {/* Progress indicators */}
      <div className="flex mb-6">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div 
              className={`h-2 ${
                i < step ? 'bg-black' : i === step ? 'bg-gray-400' : 'bg-gray-200'
              } ${i === 0 ? 'rounded-l' : i === steps.length - 1 ? 'rounded-r' : ''}`}
            ></div>
            <p className={`text-xs mt-1 text-center font-roboto ${
              i === step ? 'font-medium' : 'text-gray-500'
            }`}>
              {s.title}
            </p>
          </div>
        ))}
      </div>
      
      {renderCurrentStep()}
    </div>
  );
};

// Cycle History Component
const RelationshipCycleHistory = ({ history, onSelectCycle }) => {
  // Get color for metric value
  const getMetricColor = (value) => {
    if (!value) return 'text-gray-500';
    if (value >= 4.5) return 'text-green-700';
    if (value >= 4) return 'text-green-600';
    if (value >= 3.5) return 'text-blue-600';
    if (value >= 3) return 'text-yellow-600';
    if (value >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  // Helper to render metric indicator
  const renderMetricIndicator = (value, prevValue) => {
    if (!prevValue) return null;
    
    const change = value - prevValue;
    const isImproved = change > 0;
    
    return (
      <span className={`text-xs ${isImproved ? 'text-green-600' : 'text-red-600'}`}>
        {isImproved ? '↑' : '↓'} {Math.abs(change).toFixed(1)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium font-roboto flex items-center">
          <Bell size={20} className="mr-2 text-indigo-600" />
          <span>Relationship Cycle History</span>
        </h4>
        <p className="text-sm text-gray-500 font-roboto">
          View past cycles to track your progress over time
        </p>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No relationship history yet. Complete your first cycle to start tracking progress.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.slice(0, 3).map((cycle, index) => {
            const prevCycle = index < history.length - 1 ? history[index + 1] : null;
            
            return (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
                  onClick={() => onSelectCycle(cycle.cycle)}>
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium font-roboto">Cycle {cycle.cycle}</h5>
                  <span className="text-sm text-gray-500 font-roboto">
                    {formatDate(cycle.date)}
                  </span>
                </div>
                
                {cycle.data?.metrics && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.satisfaction)}`}>
                          {cycle.data.metrics.satisfaction?.toFixed(1) || "3.0"}
                        </div>
                        {prevCycle && prevCycle.data?.metrics && (
                          <div className="ml-1">
                            {renderMetricIndicator(
                              cycle.data.metrics.satisfaction, 
                              prevCycle.data.metrics.satisfaction
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Satisfaction</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.communication)}`}>
                          {cycle.data.metrics.communication?.toFixed(1) || "3.0"}
                        </div>
                        {prevCycle && prevCycle.data?.metrics && (
                          <div className="ml-1">
                            {renderMetricIndicator(
                              cycle.data.metrics.communication, 
                              prevCycle.data.metrics.communication
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Communication</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.connection)}`}>
                          {cycle.data.metrics.connection?.toFixed(1) || "3.0"}
                        </div>
                        {prevCycle && prevCycle.data?.metrics && (
                          <div className="ml-1">
                            {renderMetricIndicator(
                              cycle.data.metrics.connection, 
                              prevCycle.data.metrics.connection
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Connection</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.workload)}`}>
                          {cycle.data.metrics.workload?.toFixed(1) || "3.0"}
                        </div>
                        {prevCycle && prevCycle.data?.metrics && (
                          <div className="ml-1">
                            {renderMetricIndicator(
                              cycle.data.metrics.workload, 
                              prevCycle.data.metrics.workload
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Workload</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    {cycle.data?.meeting?.completedAt && (
                      <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-roboto mr-2">
                        <CheckCircle size={12} className="mr-1" />
                        Meeting Completed
                      </span>
                    )}
                    
                    {cycle.data?.questionnaireCompleted && (
                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-roboto">
                        <Clipboard size={12} className="mr-1" />
                        Questionnaire Completed
                      </span>
                    )}
                  </div>
                  
                  <button className="text-blue-600 text-sm flex items-center hover:underline font-roboto">
                    View Details <ArrowRight size={14} className="ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {history.length > 3 && (
            <div className="text-center">
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-roboto">
                Show More History
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Template Card Component
const TemplateCard = ({ id, title, description, steps, onClose, onNavigate }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold font-roboto">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={20} />
        </button>
      </div>
      
      <p className="text-gray-600 mb-6 font-roboto">{description}</p>
      
      {steps && (
        <div className="mb-6">
          <h4 className="font-medium mb-3 font-roboto">Steps:</h4>
          <ol className="list-decimal pl-5 space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="font-roboto">
                {typeof step === 'string' ? (
                  step
                ) : (
                  <>
                    <span className="font-medium">{step.title}</span>: {step.description}
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      
      <div className="flex justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded font-roboto"
        >
          Close
        </button>
        
        <button
          onClick={onNavigate}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto"
        >
          Go to Tool
        </button>
      </div>
    </div>
  );
};

// Cycle Details Modal Component
const CycleDetailsModal = ({ cycle, onClose }) => {
  if (!cycle) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold font-roboto">Cycle {cycle.cycle} Details</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-medium font-roboto">Completed on {formatDate(cycle.date)}</h4>
            
            <div className="flex space-x-2">
              {cycle.data?.metrics && (
                <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                  <Award size={12} className="mr-1" />
                  {cycle.data.metrics.overall?.toFixed(1) || "3.0"}/5 Overall
                </span>
              )}
            </div>
          </div>
          
          {cycle.data?.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-700">{cycle.data.metrics.satisfaction?.toFixed(1) || "3.0"}</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{cycle.data.metrics.communication?.toFixed(1) || "3.0"}</div>
                <div className="text-sm text-gray-600">Communication</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">{cycle.data.metrics.connection?.toFixed(1) || "3.0"}</div>
                <div className="text-sm text-gray-600">Connection</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{cycle.data.metrics.workload?.toFixed(1) || "3.0"}</div>
                <div className="text-sm text-gray-600">Workload</div>
              </div>
            </div>
          )}
          
          {/* Meeting Notes */}
          {cycle.data?.meeting && (
            <div>
              <h4 className="font-medium mb-2 font-roboto">Meeting Notes</h4>
              
              {cycle.data.meeting.topicResponses && Object.keys(cycle.data.meeting.topicResponses).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(cycle.data.meeting.topicResponses).map(([topic, response], index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <h5 className="text-sm font-medium mb-1 font-roboto">{topic}</h5>
                      <p className="text-sm text-gray-600 font-roboto whitespace-pre-wrap">{response}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 font-roboto">No detailed meeting notes available.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Questionnaire Responses */}
          {cycle.data?.questionnaireResponses && Object.keys(cycle.data.questionnaireResponses).length > 0 && (
            <div>
              <h4 className="font-medium mb-2 font-roboto">Questionnaire Responses</h4>
              
              <div className="space-y-3">
                {Object.entries(cycle.data.questionnaireResponses)
                  .slice(0, 5) // Show only the first 5 for brevity
                  .map(([questionId, response], index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium font-roboto">Question {index + 1}</h5>
                        </div>
                        <div className="ml-2">
                          <div className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                            <span className="text-sm font-medium">{response}/5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {Object.keys(cycle.data.questionnaireResponses).length > 5 && (
                  <p className="text-sm text-center text-gray-500 font-roboto">
                    + {Object.keys(cycle.data.questionnaireResponses).length - 5} more responses
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main RelationshipTab Component
const RelationshipTab = ({ onOpenRelationshipMeeting }) => {
  const { 
    selectedUser, 
    familyMembers, 
    familyId,
    currentWeek,
    relationshipStrategies,
    coupleCheckInData,
    getCoupleCheckInData,
    getRelationshipTrendData,
    weekHistory,
    updateRelationshipStrategy,
    getRelationshipStrategies,
    saveCoupleCheckInData
  } = useFamily();
  
  const { currentUser } = useAuth();
  const { getQuestionsByCategory } = useSurvey();

  // We'll use currentCycle instead of currentWeek for clarity
  const currentCycle = currentWeek;

  // State variables
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    tools: true,
    charts: true,
    history: true,
    resources: true
  });
  
  const [relationshipQuestions, setRelationshipQuestions] = useState([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [insights, setInsights] = useState([]);
  const [cycleData, setCycleData] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [templateToShow, setTemplateToShow] = useState(null);
  const [hasError, setHasError] = useState(null);
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);
  
  // Refs for scrolling
  const toolsRef = useRef(null);
  const chartsRef = useRef(null);
  
  // Load relationship data
  useEffect(() => {
    const loadRelationshipData = async () => {
      setIsLoadingData(true);
      try {
        if (!familyId) return;
        
        // Load relationship strategies
        const strategies = await getRelationshipStrategies();
        
        // Get cycle check-in data
        const coupleData = getCoupleCheckInData(currentCycle);
        setCycleData(coupleData);
        
        // Load relationship questions
        const questions = getQuestionsByCategory('Relationship Health') || [];
        setRelationshipQuestions(questions);
        
        // Check if couple needs to complete questionnaire
        const needsToComplete = !coupleData || !coupleData.questionnaireCompleted;
        setShowQuestionnaire(needsToComplete);
        setQuestionnaireCompleted(!needsToComplete);
        
        // Load previous cycle history
        await loadCycleHistory();
        
        // Load AI insights
        try {
          if (window.AllieAIEngineService) {
            const aiInsights = await AllieAIEngineService.generateRelationshipInsights(
              familyId,
              currentCycle,
              getRelationshipTrendData(),
              strategies || [],
              coupleData || {}
            );
            
            if (aiInsights && aiInsights.length > 0) {
              setInsights(aiInsights);
            }
          }
        } catch (insightError) {
          console.error("Error loading relationship insights:", insightError);
        }
        
        setIsLoadingData(false);
      } catch (error) {
        console.error("Error loading relationship data:", error);
        setHasError("There was an error loading your relationship data. Please try refreshing the page.");
        setIsLoadingData(false);
      }
    };
    
    loadRelationshipData();
  }, [familyId, currentCycle, getCoupleCheckInData, getRelationshipStrategies, getRelationshipTrendData, getQuestionsByCategory]);
  
  // Load cycle history
  const loadCycleHistory = async () => {
    try {
      if (!familyId) return;
      
      // Query Firestore for all cycle data
      const coupleCheckInsRef = collection(db, "coupleCheckIns");
      const q = query(coupleCheckInsRef, where("familyId", "==", familyId));
      const querySnapshot = await getDocs(q);
      
      const history = [];
      
      // Process each document
      querySnapshot.forEach((doc) => {
        // Extract cycle number from document ID (format: familyId-weekX)
        const cycleMatch = doc.id.match(/-week(\d+)$/);
        if (cycleMatch && cycleMatch[1]) {
          const cycleNum = parseInt(cycleMatch[1]);
          const data = doc.data();
          
          history.push({
            cycle: cycleNum,
            data: data.data || {},
            date: data.completedAt || new Date().toISOString()
          });
        }
      });
      
      // Also add data from weekHistory
      Object.keys(weekHistory)
        .filter(key => key.startsWith('week') && key !== 'weekStatus')
        .forEach(weekKey => {
          const week = weekHistory[weekKey];
          const weekNum = parseInt(weekKey.replace('week', ''));
          
          // Only add if not already in history
          if (week && week.coupleCheckIn && !history.some(h => h.cycle === weekNum)) {
            history.push({
              cycle: weekNum,
              data: week.coupleCheckIn,
              date: week.completionDate || new Date().toISOString()
            });
          }
        });
      
      // Sort by cycle number (descending)
      history.sort((a, b) => b.cycle - a.cycle);
      setCycleHistory(history);
      
    } catch (error) {
      console.error("Error loading cycle history:", error);
    }
  };
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle relationship meeting
  const handleOpenRelationshipMeeting = () => {
    if (onOpenRelationshipMeeting) {
      onOpenRelationshipMeeting();
    }
  };
  
  // Handle relationship questionnaire submission
  const handleQuestionnaireSubmit = async (responses) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Get current couple data or initialize
      const currentData = getCoupleCheckInData(currentCycle) || {};
      
      // Create updated data with questionnaire responses
      const updatedData = {
        ...currentData,
        questionnaireResponses: responses,
        questionnaireCompleted: true,
        questionnaireCompletedAt: new Date().toISOString()
      };
      
      // Calculate relationship metrics based on responses
      const metrics = calculateRelationshipMetrics(responses);
      
      // Add metrics to the data
      updatedData.metrics = metrics;
      
      // Save to Firebase using the context method
      await saveCoupleCheckInData(familyId, currentCycle, updatedData);
      
      // Update local state
      setCycleData(updatedData);
      setQuestionnaireCompleted(true);
      setShowQuestionnaire(false);
      
      // Add to calendar
      addQuestionnaireToCalendar();
      
      // Refresh cycle history
      await loadCycleHistory();
      
      return true;
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      setHasError("There was an error saving your questionnaire. Please try again.");
      return false;
    }
  };
  
  // Calculate relationship metrics from questionnaire
  const calculateRelationshipMetrics = (responses) => {
    // Calculate average scores for different dimensions
    const dimensions = {
      satisfaction: ['satisfaction', 'happiness', 'fulfillment'],
      communication: ['communication', 'listening', 'understanding'],
      connection: ['connection', 'intimacy', 'quality_time'],
      workload: ['workload_balance', 'task_sharing', 'mental_load']
    };
    
    const metrics = {};
    
    // Calculate averages for each dimension
    Object.entries(dimensions).forEach(([dimension, keys]) => {
      const values = [];
      
      // First try to find exact match questions
      Object.entries(responses).forEach(([questionId, value]) => {
        // Convert value to number if it's not already
        const numValue = typeof value === 'number' ? value : parseInt(value);
        
        if (!isNaN(numValue)) {
          // Check if question contains any of the keywords
          const matchesKeyword = keys.some(key => 
            questionId.toLowerCase().includes(key) || 
            relationshipQuestions.find(q => q.id === questionId)?.text.toLowerCase().includes(key)
          );
          
          if (matchesKeyword) {
            values.push(numValue);
          }
        }
      });
      
      // If we have values, calculate average
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        metrics[dimension] = Math.min(5, Math.max(1, average)); // Ensure 1-5 range
      } else {
        // Default value if no matched questions
        metrics[dimension] = 3.0;
      }
    });
    
    // Calculate overall score (1-5 scale)
    const allScores = Object.values(metrics);
    metrics.overall = allScores.length > 0 
      ? allScores.reduce((sum, val) => sum + val, 0) / allScores.length
      : 3.0; // Default to middle if no data
    
    return metrics;
  };
  
  // Add completed questionnaire to calendar
  const addQuestionnaireToCalendar = async () => {
    try {
      if (!currentUser || !familyId) return;
      
      // Create calendar event
      const event = {
        summary: `Relationship Questionnaire (Cycle ${currentCycle})`,
        description: `Completed the relationship health questionnaire for cycle ${currentCycle}`,
        start: {
          dateTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date().getTime() + 30*60000).toISOString(), // 30 min after
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      // Add to calendar
      await CalendarService.addEvent(event, currentUser.uid);
      
    } catch (error) {
      console.error("Error adding questionnaire to calendar:", error);
    }
  };
  
  // Show action template based on insight recommendation
  const showActionTemplate = (templateId) => {
    setTemplateToShow(templateId);
  };
  
  // Navigate to a section when template suggests a tool
  const navigateToTool = (toolId) => {
    setTemplateToShow(null);
    
    // Scroll to the appropriate section
    if (toolId === 'daily-checkin' || toolId === 'gratitude-practice') {
      setExpandedSections(prev => ({...prev, tools: true}));
      setTimeout(() => {
        toolsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setExpandedSections(prev => ({...prev, charts: true}));
      setTimeout(() => {
        chartsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };
  
  // Handle switching to a history cycle
  const handleSelectHistoryCycle = (cycleNum) => {
    // Find the cycle data
    const cycleData = cycleHistory.find(c => c.cycle === cycleNum);
    if (cycleData) {
      setSelectedHistoryCycle(cycleData);
    }
  };
  
  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, description, borderColor = "border-pink-500", icon = <Heart size={20} className="mr-2" />, notificationCount = 0) => (
    <div className={`border-l-4 ${borderColor} p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2`} 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex-1">
        <div className="flex items-center">
          {icon}
          <h4 className="font-medium text-lg font-roboto">{title}</h4>
          {notificationCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
              {notificationCount}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600 mt-1 font-roboto ml-7">{description}</p>
        )}
      </div>
      <button className="p-2 rounded-full hover:bg-gray-100">
        {expandedSections[sectionKey] ? 
          <ChevronUp size={20} className="text-gray-400" /> : 
          <ChevronDown size={20} className="text-gray-400" />
        }
      </button>
    </div>
  );
  
  // Generate relationship template
  const renderTemplate = (templateId) => {
    switch(templateId) {
      case 'daily-checkin':
        return (
          <TemplateCard
            id="daily-checkin"
            title="5-Minute Check-in Template"
            description="A quick daily check-in helps maintain connection amid busy lives. This simple format takes just 5 minutes but keeps your relationship strong."
            steps={[
              { title: "High point", description: "Each share one positive moment from today" },
              { title: "Challenge", description: "Each share one difficulty you faced" },
              { title: "Support", description: "Ask \"How can I support you tomorrow?\"" },
              { title: "Appreciation", description: "Express gratitude for one thing your partner did" },
              { title: "Connection", description: "Share a brief physical connection (hug, kiss, hand hold)" }
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('daily-checkin')}
          />
        );
        
      case 'gratitude-practice':
        return (
          <TemplateCard
            id="gratitude-practice"
            title="Daily Gratitude Practice"
            description="Research shows that expressing appreciation regularly strengthens relationships and increases happiness."
            steps={[
              "Use prompts like \"I appreciate the way you...\", \"Thank you for always...\", or \"I'm grateful that you...\"",
              "Be specific about what your partner did and how it affected you",
              "Express appreciation both verbally and in writing",
              "Aim for at least one expression of gratitude daily",
              "Notice the small things, not just big gestures"
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('gratitude-practice')}
          />
        );
        
      case 'date-night':
        return (
          <TemplateCard
            id="date-night"
            title="Meaningful Date Night"
            description="Regular date nights are essential for maintaining connection and romance in your relationship."
            steps={[
              "Schedule date night at least 2 weeks in advance",
              "Take turns planning - one person plans each date",
              "Create a no-phone rule during your time together",
              "Mix up activities - try something new alongside familiar favorites",
              "End with a meaningful conversation about your relationship"
            ]}
            onClose={() => setTemplateToShow(null)}
            onNavigate={() => navigateToTool('date-night')}
          />
        );
        
      default:
        return null;
    }
  };
  
  // Check if user is a parent
  const isParent = selectedUser && selectedUser.role === 'parent';

  // If user is not a parent, show limited view
  if (!isParent) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Heart size={60} className="mx-auto text-pink-500 mb-4" />
          <h3 className="text-xl font-bold mb-3 font-roboto">Relationship Features</h3>
          <p className="text-gray-600 mb-4 font-roboto">
            These features are designed for parents to strengthen their relationship.
          </p>
          <p className="text-gray-600 font-roboto">
            Please log in as a parent to access these tools.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
      </div>
    );
  }
  
  // Show error state if there was a problem
  if (hasError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="mr-2" size={24} />
          <h3 className="text-lg font-bold font-roboto">Error Loading Relationship Data</h3>
        </div>
        <p className="text-gray-600 mb-4 font-roboto">{hasError}</p>
        <button 
          className="px-4 py-2 bg-black text-white rounded font-roboto"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Main view for parents
  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start mb-6">
          <div className="mr-4 flex-shrink-0">
            <Heart size={32} className="text-pink-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Strength</h3>
            <p className="text-gray-600 font-roboto">
              Research shows that a strong parental relationship directly impacts family balance and children's wellbeing. 
              Use these tools to nurture your partnership while balancing family responsibilities.
            </p>
          </div>
        </div>

        {/* Cycle Status Tracker */}
        <CycleStatusTracker 
          cycle={currentCycle}
          cycleData={cycleData}
          questionnaireCompleted={questionnaireCompleted}
          onStartQuestionnaire={() => setShowQuestionnaire(true)}
          onStartMeeting={handleOpenRelationshipMeeting}
        />
      </div>

      {/* Relationship Health Questionnaire - Only show when needed */}
      {showQuestionnaire && (
        <RelationshipHealthQuestionnaire 
          questions={relationshipQuestions}
          onSubmit={handleQuestionnaireSubmit}
          cycle={currentCycle}
          previousData={cycleData}
          onCancel={() => setShowQuestionnaire(false)}
        />
      )}

      {/* AI Insights Section */}
      {renderSectionHeader(
        "AI Relationship Insights", 
        "insights", 
        "Personalized recommendations based on your relationship data",
        "border-purple-500", 
        <Brain size={20} className="mr-2 text-purple-600" />
      )}
      {expandedSections.insights && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  // Show loading message or spinner
                  const aiInsights = await AllieAIEngineService.generateRelationshipInsights(
                    familyId,
                    currentCycle,
                    getRelationshipTrendData(),
                    await getRelationshipStrategies() || [],
                    getCoupleCheckInData(currentCycle) || {}
                  );
                  
                  if (aiInsights && aiInsights.length > 0) {
                    setInsights(aiInsights);
                  }
                } catch (error) {
                  console.error("Error refreshing insights:", error);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm flex items-center mb-4"
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh Insights
            </button>
          </div>
          
          <AIRelationshipInsights 
            insights={insights}
            onActionClick={showActionTemplate} 
          />
          
          {/* Template Modal */}
          {templateToShow && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full m-4">
                {renderTemplate(templateToShow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Relationship Charts Section */}
      {renderSectionHeader(
        "Relationship Charts", 
        "charts", 
        "Track your relationship progress over time",
        "border-green-500", 
        <Target size={20} className="mr-2 text-green-600" />
      )}
      {expandedSections.charts && (
        <div id="relationship-charts" ref={chartsRef} className="space-y-6">
          <CoupleRelationshipChart />
          <RelationshipProgressChart />
        </div>
      )}

      {/* Relationship Tools Section */}
      {renderSectionHeader(
        "Relationship Tools", 
        "tools", 
        "Tools to strengthen your connection daily",
        "border-blue-500", 
        <Clock size={20} className="mr-2 text-blue-600" />
      )}
      {expandedSections.tools && (
        <div id="relationship-tools" ref={toolsRef} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailyCheckInTool />
            <GratitudeTracker />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateNightPlanner />
            <SelfCarePlanner />
          </div>
        </div>
      )}

      {/* Relationship History Section */}
      {renderSectionHeader(
        "Relationship History", 
        "history", 
        "View your past relationship cycles and progress",
        "border-indigo-500", 
        <Bell size={20} className="mr-2 text-indigo-600" />
      )}
      {expandedSections.history && (
        <RelationshipCycleHistory 
          history={cycleHistory} 
          onSelectCycle={handleSelectHistoryCycle}
        />
      )}

      {/* Research Section */}
      {renderSectionHeader(
        "Relationship Resources", 
        "resources", 
        "Research-backed information to strengthen your relationship",
        "border-gray-500", 
        <Info size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.resources && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Connection Between Balance and Relationship Health
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Studies show that couples who share household and parenting responsibilities more equitably report 37% higher relationship satisfaction and are 45% more likely to describe their relationship as "thriving."
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                How Children Benefit from Strong Parental Relationships
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Children in homes with strong parental bonds show better emotional regulation, higher academic achievement, and fewer behavioral problems regardless of family structure.
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                Building Connection During Busy Family Life
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Daily micro-connections of just 5-10 minutes have been shown to maintain relationship satisfaction even during highly stressful family periods. Quality matters more than quantity.
              </p>
            </div>
            
            {/* Recommended Books */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-roboto">Recommended Books</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Lightbulb size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">The 5 Love Languages</h5>
                      <p className="text-xs text-gray-600 font-roboto">Gary Chapman</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Lightbulb size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">Fair Play</h5>
                      <p className="text-xs text-gray-600 font-roboto">Eve Rodsky</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Lightbulb size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">And Baby Makes Three</h5>
                      <p className="text-xs text-gray-600 font-roboto">John & Julie Gottman</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Cycle View Modal */}
      {selectedHistoryCycle && (
        <CycleDetailsModal 
          cycle={selectedHistoryCycle} 
          onClose={() => setSelectedHistoryCycle(null)} 
        />
      )}
    </div>
  );
};

export default RelationshipTab;