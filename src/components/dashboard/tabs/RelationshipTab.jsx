import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Heart, Calendar, ChevronDown, ChevronUp, Clock, 
  MessageCircle, Brain, Info, CheckCircle, Lightbulb, Target,
  AlertCircle, Bell, PhoneOutgoing, Book, Star, Smartphone,
  ArrowRight, RefreshCw, Award, Clipboard, Edit, Save, X
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
import StrategicActionsTracker from '../StrategicActionsTracker';
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

// Relationship Health Questionnaire Component
const RelationshipHealthQuestionnaire = ({ questions, onSubmit, cycle, previousData }) => {
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

  // Handle response change
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
          <button
            onClick={handlePrevious}
            disabled={step === 0}
            className={`px-4 py-2 rounded font-roboto ${
              step === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            Previous
          </button>
          
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

// Phone Number Collection Component
const PhoneNumberSetup = ({ phoneNumbers, onSave, onCancel }) => {
  const [numbers, setNumbers] = useState(phoneNumbers || { mama: '', papa: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Handle phone number change
  const handleChange = (role, value) => {
    setNumbers(prev => ({
      ...prev,
      [role]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Basic validation
      if (!numbers.mama && !numbers.papa) {
        setError("Please enter at least one phone number");
        return;
      }
      
      // Format validation - simple check for now
      const phoneRegex = /^\+?[0-9\s()-]{10,15}$/;
      if (numbers.mama && !phoneRegex.test(numbers.mama.trim())) {
        setError("Please enter a valid phone number for Mama");
        return;
      }
      
      if (numbers.papa && !phoneRegex.test(numbers.papa.trim())) {
        setError("Please enter a valid phone number for Papa");
        return;
      }
      
      await onSave(numbers);
      
    } catch (err) {
      console.error("Error saving phone numbers:", err);
      setError(err.message || "Failed to save phone numbers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start mb-6">
        <PhoneOutgoing size={24} className="text-blue-600 mr-3 flex-shrink-0" />
        <div>
          <h4 className="font-bold mb-2 font-roboto">Phone Number Setup</h4>
          <p className="text-sm text-gray-600 font-roboto">
            Add your phone numbers to enable sending gratitude messages via SMS.
            This is optional but enhances the experience.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1 font-roboto">Mama's Phone</label>
          <input
            type="tel"
            className="w-full p-2 border rounded font-roboto"
            placeholder="+1 (555) 123-4567"
            value={numbers.mama}
            onChange={(e) => handleChange('mama', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 font-roboto">Papa's Phone</label>
          <input
            type="tel"
            className="w-full p-2 border rounded font-roboto"
            placeholder="+1 (555) 123-4567"
            value={numbers.papa}
            onChange={(e) => handleChange('papa', e.target.value)}
          />
        </div>
      </div>
      
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm font-roboto">
          {error}
        </div>
      )}
      
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded font-roboto"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto flex items-center"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Smartphone size={16} className="mr-2" />
              Enable SMS
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Relationship Cycle History Component
const RelationshipCycleHistory = ({ history, onSelectCycle }) => {
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
      <h4 className="font-medium mb-6 font-roboto flex items-center">
        <Bell size={20} className="mr-2" />
        Relationship Cycle History
      </h4>
      
      {history.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-roboto">No relationship history yet. Complete your first cycle to start tracking progress.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((cycle, index) => {
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
                        <div className="text-lg font-bold text-pink-700">{cycle.data.metrics.satisfaction?.toFixed(1) || "N/A"}</div>
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
                        <div className="text-lg font-bold text-blue-700">{cycle.data.metrics.communication?.toFixed(1) || "N/A"}</div>
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
                        <div className="text-lg font-bold text-purple-700">{cycle.data.metrics.connection?.toFixed(1) || "N/A"}</div>
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
                        <div className="text-lg font-bold text-green-700">{cycle.data.metrics.workload?.toFixed(1) || "N/A"}</div>
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

// Notes Display with Editing
const RelationshipNotesEditor = ({ notes, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes || {});
  const [saving, setSaving] = useState(false);

  // Updated notes when props change
  useEffect(() => {
    setEditedNotes(notes || {});
  }, [notes]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedNotes);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium font-roboto">Relationship Notes</h4>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm flex items-center bg-gray-100 hover:bg-gray-200 rounded font-roboto"
          >
            <Edit size={14} className="mr-1" />
            Edit Notes
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm border rounded font-roboto"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-sm bg-black text-white rounded font-roboto flex items-center"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1"></div>
              ) : (
                <Save size={14} className="mr-1" />
              )}
              Save
            </button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 font-roboto">Strengths</label>
            <textarea
              value={editedNotes.strengths || ''}
              onChange={(e) => setEditedNotes({...editedNotes, strengths: e.target.value})}
              className="w-full p-2 border rounded min-h-[100px] font-roboto"
              placeholder="Note your relationship strengths..."
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 font-roboto">Areas to Improve</label>
            <textarea
              value={editedNotes.improvements || ''}
              onChange={(e) => setEditedNotes({...editedNotes, improvements: e.target.value})}
              className="w-full p-2 border rounded min-h-[100px] font-roboto"
              placeholder="Note areas you'd like to improve..."
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 font-roboto">Goals</label>
            <textarea
              value={editedNotes.goals || ''}
              onChange={(e) => setEditedNotes({...editedNotes, goals: e.target.value})}
              className="w-full p-2 border rounded min-h-[100px] font-roboto"
              placeholder="Note your relationship goals..."
            ></textarea>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium mb-1 font-roboto">Strengths</h5>
            <div className="p-3 bg-gray-50 rounded min-h-[60px] text-sm font-roboto">
              {editedNotes.strengths || "No strengths noted yet."}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium mb-1 font-roboto">Areas to Improve</h5>
            <div className="p-3 bg-gray-50 rounded min-h-[60px] text-sm font-roboto">
              {editedNotes.improvements || "No improvement areas noted yet."}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium mb-1 font-roboto">Goals</h5>
            <div className="p-3 bg-gray-50 rounded min-h-[60px] text-sm font-roboto">
              {editedNotes.goals || "No goals noted yet."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
    questionnaire: true,
    tools: true,
    quality: true,
    tracking: true,
    strategies: true,
    resources: true,
    history: true,
    notes: true
  });
  
  const [relationshipQuestions, setRelationshipQuestions] = useState([]);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [showSmsSetup, setShowSmsSetup] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState({
    mama: '',
    papa: ''
  });
  const [insights, setInsights] = useState([]);
  const [cycleData, setCycleData] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [templateToShow, setTemplateToShow] = useState(null);
  const [hasError, setHasError] = useState(null);
  const [selectedHistoryCycle, setSelectedHistoryCycle] = useState(null);
  const [relationshipNotes, setRelationshipNotes] = useState({});
  const [isSmsSending, setIsSmsSending] = useState(false);
  
  // Refs for scrolling
  const toolsRef = useRef(null);
  const qualityRef = useRef(null);
  const gratitudeRef = useRef(null);
  const checkInRef = useRef(null);
  
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
        setNeedsQuestionnaire(needsToComplete);
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
        
        // Load phone numbers for SMS
        await loadPhoneNumbers();
        
        // Load relationship notes
        await loadRelationshipNotes();
        
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
  
  // Load phone numbers for SMS feature
  const loadPhoneNumbers = async () => {
    try {
      if (!familyId) return;
      
      // Try to get parent phone numbers from user profiles
      const mamaParent = familyMembers.find(m => m.roleType === 'Mama');
      const papaParent = familyMembers.find(m => m.roleType === 'Papa');
      
      // Check if phone numbers already exist in context
      const phonesExist = mamaParent?.phoneNumber && papaParent?.phoneNumber;
      
      if (phonesExist) {
        setPhoneNumbers({
          mama: mamaParent.phoneNumber,
          papa: papaParent.phoneNumber
        });
        setSmsEnabled(true);
      } else {
        // Try to get from Firebase
        const docRef = doc(db, "familyProfiles", familyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().phoneNumbers) {
          const phones = docSnap.data().phoneNumbers;
          setPhoneNumbers(phones);
          setSmsEnabled(Object.values(phones).some(p => p));
        }
      }
    } catch (error) {
      console.error("Error loading phone numbers:", error);
    }
  };
  
  // Load relationship notes
  const loadRelationshipNotes = async () => {
    try {
      if (!familyId) return;
      
      const docRef = doc(db, "relationshipNotes", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setRelationshipNotes(docSnap.data());
      }
    } catch (error) {
      console.error("Error loading relationship notes:", error);
    }
  };
  
  // Save relationship notes
  const saveRelationshipNotes = async (notes) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Save to Firestore
      const docRef = doc(db, "relationshipNotes", familyId);
      await setDoc(docRef, {
        ...notes,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local state
      setRelationshipNotes(notes);
      
      return true;
    } catch (error) {
      console.error("Error saving relationship notes:", error);
      throw error;
    }
  };
  
  // Save phone numbers for SMS
  const savePhoneNumbers = async (phoneData) => {
    try {
      if (!familyId) return false;
      
      setPhoneNumbers(phoneData);
      
      // Save to Firebase
      const docRef = doc(db, "familyProfiles", familyId);
      await setDoc(docRef, {
        phoneNumbers: phoneData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSmsEnabled(Object.values(phoneData).some(p => p));
      setShowSmsSetup(false);
      
      return true;
    } catch (error) {
      console.error("Error saving phone numbers:", error);
      return false;
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
      setNeedsQuestionnaire(false);
      
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
      const values = keys
        .map(key => {
          const matchingQuestion = Object.entries(responses).find(([qId, _]) => 
            qId.toLowerCase().includes(key)
          );
          return matchingQuestion ? parseInt(matchingQuestion[1]) : null;
        })
        .filter(val => val !== null);
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        metrics[dimension] = Math.min(5, Math.max(1, average)); // Ensure 1-5 range
      }
    });
    
    // Calculate overall score (1-5 scale)
    const allScores = Object.values(metrics);
    metrics.overall = allScores.length > 0 
      ? allScores.reduce((sum, val) => sum + val, 0) / allScores.length
      : 3; // Default to middle if no data
    
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
  
  // Send gratitude via SMS
  const sendGratitudeSms = async (gratitude) => {
    try {
      if (!smsEnabled) return false;
      setIsSmsSending(true);
      
      // Get recipient phone number
      const recipientRole = gratitude.toId === familyMembers.find(m => m.roleType === 'Mama')?.id ? 'mama' : 'papa';
      const senderRole = gratitude.fromId === familyMembers.find(m => m.roleType === 'Mama')?.id ? 'mama' : 'papa';
      
      const recipientPhone = phoneNumbers[recipientRole];
      if (!recipientPhone) {
        setIsSmsSending(false);
        return false;
      }
      
      // Create message text
      const message = `💌 From ${gratitude.fromName}: ${gratitude.text}`;
      
      // In a real implementation, this would call a serverless function to send SMS
      // For now, simulating a successful API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Log the SMS sending attempt
      const smsLogRef = doc(collection(db, "smsLogs"));
      await setDoc(smsLogRef, {
        from: gratitude.fromName,
        to: gratitude.toName,
        message: gratitude.text,
        timestamp: serverTimestamp(),
        familyId
      });
      
      setIsSmsSending(false);
      return true;
    } catch (error) {
      console.error("Error sending SMS:", error);
      setIsSmsSending(false);
      return false;
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
    let ref;
    switch (toolId) {
      case 'daily-checkin':
        ref = checkInRef;
        setExpandedSections(prev => ({...prev, tools: true}));
        break;
      case 'gratitude-practice':
        ref = gratitudeRef;
        setExpandedSections(prev => ({...prev, tools: true}));
        break;
      case 'date-night':
        ref = qualityRef;
        setExpandedSections(prev => ({...prev, quality: true}));
        break;
      default:
        ref = toolsRef;
        setExpandedSections(prev => ({...prev, tools: true}));
    }
    
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle switching to a history cycle
  const handleSelectHistoryCycle = (cycleNum) => {
    setSelectedHistoryCycle(cycleNum);
  };
  
  // Render section header with expand/collapse functionality
  const renderSectionHeader = (title, sectionKey, borderColor = "border-pink-500", icon = <Heart size={20} className="mr-2" />, notificationCount = 0) => (
    <div className={`border-l-4 ${borderColor} p-4 flex justify-between items-center cursor-pointer bg-white rounded-lg shadow-sm mb-2`} 
         onClick={() => toggleSection(sectionKey)}>
      <div className="flex items-center">
        {icon}
        <h4 className="font-medium text-lg font-roboto">{title}</h4>
        {notificationCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full font-roboto">
            {notificationCount}
          </span>
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

        {/* Relationship Meeting Card */}
        <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Users size={20} className="text-pink-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-roboto">Couple Relationship Meeting</h3>
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                Spend 15-20 minutes with your partner discussing your relationship for Cycle {currentCycle}
              </p>
              
              <div className="mt-3">
                <div className="text-sm text-gray-600 flex items-center mb-3">
                  <Clock size={14} className="mr-1 text-gray-500" />
                  <span className="font-roboto">Recommended: 15-20 minutes</span>
                </div>
                
                <button
                  onClick={handleOpenRelationshipMeeting}
                  className="px-4 py-2 rounded-md flex items-center font-roboto bg-pink-100 text-pink-800 hover:bg-pink-200"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Start Relationship Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Notes Section */}
      {renderSectionHeader(
        "Relationship Notes",
        "notes",
        "border-blue-500",
        <Clipboard size={20} className="mr-2 text-blue-600" />
      )}
      {expandedSections.notes && (
        <RelationshipNotesEditor 
          notes={relationshipNotes}
          onSave={saveRelationshipNotes}
        />
      )}

      {/* Relationship Health Questionnaire Section */}
      {renderSectionHeader(
        "Relationship Health Questionnaire", 
        "questionnaire", 
        "border-purple-500", 
        <Book size={20} className="mr-2 text-purple-600" />, 
        needsQuestionnaire ? 1 : 0
      )}
      {expandedSections.questionnaire && (
        <div className="space-y-4">
          {needsQuestionnaire ? (
            <RelationshipHealthQuestionnaire 
              questions={relationshipQuestions}
              onSubmit={handleQuestionnaireSubmit}
              cycle={currentCycle}
              previousData={cycleData}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center text-green-600 mb-4">
                <CheckCircle className="mr-2" size={24} />
                <h3 className="text-lg font-bold font-roboto">Questionnaire Completed</h3>
              </div>
              <p className="text-gray-600 mb-4 font-roboto">
                You've completed the relationship health questionnaire for Cycle {currentCycle}.
                The results are reflected in your relationship charts below.
              </p>
              
              {cycleData?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 text-center">
                    <div className="text-2xl font-bold text-pink-700">{cycleData.metrics.satisfaction?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-pink-700">Satisfaction</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">{cycleData.metrics.communication?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-blue-700">Communication</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                    <div className="text-2xl font-bold text-purple-700">{cycleData.metrics.connection?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-purple-700">Connection</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                    <div className="text-2xl font-bold text-green-700">{cycleData.metrics.workload?.toFixed(1) || "N/A"}</div>
                    <div className="text-sm text-green-700">Workload Balance</div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm"
                  onClick={() => setNeedsQuestionnaire(true)}
                >
                  Take Again
                </button>
                
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-roboto text-sm flex items-center"
                  onClick={() => {
                    // Scroll to charts
                    const chartsSection = document.getElementById('relationship-charts');
                    if (chartsSection) {
                      chartsSection.scrollIntoView({ behavior: 'smooth' });
                      setExpandedSections(prev => ({...prev, tracking: true}));
                    }
                  }}
                >
                  <Target size={16} className="mr-1" />
                  View Charts
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Insights Section */}
      {renderSectionHeader(
        "AI Relationship Insights", 
        "insights", 
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
          
          <div id="relationship-charts">
            <CoupleRelationshipChart />
          </div>
        </div>
      )}

      {/* Daily Connection Tools Section */}
      {renderSectionHeader(
        "Daily Connection Tools", 
        "tools", 
        "border-blue-500", 
        <Clock size={20} className="mr-2 text-blue-600" />
      )}
      {expandedSections.tools && (
        <div id="daily-connection-tools" ref={toolsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div ref={checkInRef}>
            <DailyCheckInTool />
          </div>
          
          <div id="gratitude-tracker" ref={gratitudeRef}>
            <GratitudeTracker 
              smsEnabled={smsEnabled} 
              onSendSms={sendGratitudeSms}
              isSending={isSmsSending}
              onEnableSms={() => setShowSmsSetup(true)}
            />
          </div>
          
          {/* SMS Setup Modal */}
          {showSmsSetup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="max-w-md w-full m-4">
                <PhoneNumberSetup 
                  phoneNumbers={phoneNumbers}
                  onSave={savePhoneNumbers}
                  onCancel={() => setShowSmsSetup(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quality Time Section */}
      {renderSectionHeader(
        "Quality Time Planning", 
        "quality", 
        "border-pink-500", 
        <Calendar size={20} className="mr-2 text-pink-600" />
      )}
      {expandedSections.quality && (
        <div ref={qualityRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateNightPlanner />
          <SelfCarePlanner />
        </div>
      )}

      {/* Progress Tracking Section */}
      {renderSectionHeader(
        "Progress Tracking", 
        "tracking", 
        "border-green-500", 
        <Target size={20} className="mr-2 text-green-600" />
      )}
      {expandedSections.tracking && (
        <div className="space-y-6">
          <RelationshipProgressChart />
        </div>
      )}

      {/* Strategy Section */}
      {renderSectionHeader(
        "Strategic Actions", 
        "strategies", 
        "border-yellow-500", 
        <Lightbulb size={20} className="mr-2 text-yellow-600" />
      )}
      {expandedSections.strategies && (
        <div className="space-y-4">
          <StrategicActionsTracker />
        </div>
      )}

      {/* History Section */}
      {renderSectionHeader(
        "Relationship History", 
        "history", 
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
        "border-gray-500", 
        <Info size={20} className="mr-2 text-gray-600" />
      )}
      {expandedSections.resources && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-medium mb-4 font-roboto">Research-Backed Resources</h4>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Connection Between Balance and Relationship Health
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Studies show that couples who share household and parenting responsibilities more equitably report 37% higher relationship satisfaction and are 45% more likely to describe their relationship as "thriving."
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                How Children Benefit from Strong Parental Relationships
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Children in homes with strong parental bonds show better emotional regulation, higher academic achievement, and fewer behavioral problems regardless of family structure.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the research →</a>
            </div>
            
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2 font-roboto flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                The Ten Essential Habits of Balanced Families
              </h5>
              <p className="text-sm text-gray-600 font-roboto">
                Based on a study of over 1,000 families, researchers identified ten key habits that help parents maintain both strong relationships and balanced family workloads.
              </p>
              <a href="#" className="text-blue-600 text-sm mt-2 inline-block font-roboto">Read the guide →</a>
            </div>
            
            {/* Recommended Books */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-roboto flex items-center">
                <Book size={18} className="mr-2" />
                Recommended Books
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">The 5 Love Languages</h5>
                      <p className="text-xs text-gray-600 font-roboto">Gary Chapman</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
                    <div>
                      <h5 className="font-medium text-sm font-roboto">Fair Play</h5>
                      <p className="text-xs text-gray-600 font-roboto">Eve Rodsky</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <Star size={16} className="text-yellow-500 mr-2 mt-1" />
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
      {selectedHistoryCycle !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold font-roboto">Cycle {selectedHistoryCycle} Details</h3>
              <button
                onClick={() => setSelectedHistoryCycle(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Find the selected cycle data */}
              {(() => {
                const cycleData = cycleHistory.find(c => c.cycle === selectedHistoryCycle);
                if (!cycleData) {
                  return (
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 font-roboto">No data available for Cycle {selectedHistoryCycle}.</p>
                    </div>
                  );
                }
                
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium font-roboto">Completed on {formatDate(cycleData.date)}</h4>
                      
                      <div className="flex space-x-2">
                        {cycleData.data?.metrics && (
                          <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                            <Award size={12} className="mr-1" />
                            {cycleData.data.metrics.overall?.toFixed(1) || "N/A"}/5 Overall
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {cycleData.data?.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-pink-700">{cycleData.data.metrics.satisfaction?.toFixed(1) || "N/A"}</div>
                          <div className="text-sm text-gray-600">Satisfaction</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">{cycleData.data.metrics.communication?.toFixed(1) || "N/A"}</div>
                          <div className="text-sm text-gray-600">Communication</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{cycleData.data.metrics.connection?.toFixed(1) || "N/A"}</div>
                          <div className="text-sm text-gray-600">Connection</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-700">{cycleData.data.metrics.workload?.toFixed(1) || "N/A"}</div>
                          <div className="text-sm text-gray-600">Workload</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Meeting Notes */}
                    {cycleData.data?.meeting && (
                      <div>
                        <h4 className="font-medium mb-2 font-roboto">Meeting Notes</h4>
                        
                        {cycleData.data.meeting.topicResponses && Object.keys(cycleData.data.meeting.topicResponses).length > 0 ? (
                          <div className="space-y-3">
                            {Object.entries(cycleData.data.meeting.topicResponses).map(([topic, response], index) => (
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
                    
                    {/* Selected Strategies */}
                    {cycleData.data?.meeting?.selectedStrategies && cycleData.data.meeting.selectedStrategies.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 font-roboto">Selected Strategies</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cycleData.data.meeting.selectedStrategies.map((strategy, index) => (
                            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center">
                                <Lightbulb size={16} className="text-yellow-600 mr-2" />
                                <p className="text-sm font-medium font-roboto">{strategy}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipTab;