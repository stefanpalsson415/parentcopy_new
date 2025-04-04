import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const EnhancedRelationshipQuestionnaire = ({ questions, onSubmit, cycle, previousData, onCancel }) => {
  const [responses, setResponses] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Categorize questions by type and group them into meaningful steps
  useEffect(() => {
    if (!questions || questions.length === 0) return;

    // Analyze questions to determine their type
    const categorizedQuestions = questions.map(question => {
      let type = 'scale'; // Default type

      // Determine question type based on content
      if (question.text.toLowerCase().includes('which') || 
          question.text.toLowerCase().includes('select') ||
          question.text.toLowerCase().includes('choose')) {
        type = 'select';
      } else if (question.text.toLowerCase().includes('describe') || 
                question.text.toLowerCase().includes('explain') ||
                question.text.toLowerCase().includes('share')) {
        type = 'text';
      }

      // Determine category
      let category = 'general';
      if (question.text.toLowerCase().includes('satisfaction')) {
        category = 'satisfaction';
      } else if (question.text.toLowerCase().includes('communication')) {
        category = 'communication';
      } else if (question.text.toLowerCase().includes('connection')) {
        category = 'connection';
      } else if (question.text.toLowerCase().includes('workload') || 
                question.text.toLowerCase().includes('balance')) {
        category = 'workload';
      }

      return {
        ...question,
        type,
        category
      };
    });

    // Group questions by category
    const groupedQuestions = categorizedQuestions.reduce((acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = [];
      }
      acc[question.category].push(question);
      return acc;
    }, {});

    // Create steps from categories
    const questionSteps = Object.entries(groupedQuestions).map(([category, categoryQuestions]) => ({
      title: getCategoryTitle(category),
      category,
      questions: categoryQuestions
    }));

    setSteps(questionSteps);

    // Load previous responses if available
    if (previousData?.questionnaireResponses) {
      setResponses(previousData.questionnaireResponses);
    }
  }, [questions, previousData]);

  // Helper to get a human-readable title for each category
  const getCategoryTitle = (category) => {
    const titles = {
      'satisfaction': 'Relationship Satisfaction',
      'communication': 'Communication Quality',
      'connection': 'Emotional Connection',
      'workload': 'Workload Balance',
      'general': 'Your Relationship'
    };
    return titles[category] || 'Relationship Assessment';
  };

  // Update progress based on step and completed questions
  useEffect(() => {
    if (steps.length === 0) return;
    
    const totalQuestions = steps.reduce((total, step) => total + step.questions.length, 0);
    const answeredCount = Object.keys(responses).length;
    
    setProgress(Math.min((answeredCount / totalQuestions) * 100, 100));
  }, [responses, steps]);

  // Handle response changes for different question types
  const handleResponse = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Check if the current step is complete
  const isCurrentStepComplete = () => {
    if (steps.length === 0 || currentStep >= steps.length) return false;
    
    const currentQuestions = steps[currentStep].questions;
    return currentQuestions.every(q => responses[q.id] !== undefined);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await onSubmit(responses);
      setLoading(false);
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      setError(err.message || "Failed to save your responses");
      setLoading(false);
    }
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render a scale question (1-5)
  const renderScaleQuestion = (question) => (
    <div key={question.id} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <p className="mb-3 font-roboto">{question.text}</p>
      
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-500 font-roboto">Low</span>
        <div className="flex space-x-4">
          {[1, 2, 3, 4, 5].map(value => (
            <button
              key={value}
              className={`w-12 h-12 rounded-full font-roboto flex items-center justify-center transition-all ${
                responses[question.id] === value 
                  ? 'bg-black text-white shadow-md' 
                  : 'bg-white border hover:bg-gray-100'
              }`}
              onClick={() => handleResponse(question.id, value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 font-roboto">High</span>
      </div>
    </div>
  );
  
  // Render a text input question
  const renderTextQuestion = (question) => (
    <div key={question.id} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <p className="mb-3 font-roboto">{question.text}</p>
      
      <textarea
        className="w-full p-4 border rounded-lg min-h-[120px] font-roboto focus:ring-1 focus:ring-black focus:outline-none"
        placeholder="Share your thoughts here..."
        value={responses[question.id] || ''}
        onChange={(e) => handleResponse(question.id, e.target.value)}
      ></textarea>
    </div>
  );
  
  // Render a selection question
  const renderSelectQuestion = (question) => {
    // Generate options based on question content
    const options = getOptionsForQuestion(question);
    
    return (
      <div key={question.id} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <p className="mb-4 font-roboto">{question.text}</p>
        
        <div className="space-y-3">
          {options.map(option => (
            <div 
              key={option}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                responses[question.id] === option
                  ? 'border-black bg-gray-50 shadow-sm'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleResponse(question.id, option)}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border flex-shrink-0 ${
                  responses[question.id] === option
                    ? 'border-black bg-black'
                    : 'border-gray-400'
                }`}></div>
                <span className="ml-3 font-roboto">{option}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Generate options based on the question content
  const getOptionsForQuestion = (question) => {
    const text = question.text.toLowerCase();
    
    if (text.includes('area') && text.includes('improve')) {
      return [
        'Communication',
        'Emotional Connection',
        'Quality Time',
        'Physical Intimacy',
        'Appreciation & Recognition',
        'Workload Balance',
        'Future Planning'
      ];
    } else if (text.includes('frequency')) {
      return [
        'Daily',
        'Several times a week',
        'Weekly',
        'Every few weeks',
        'Monthly or less'
      ];
    } else if (text.includes('support')) {
      return [
        'Listening without judgment',
        'Providing practical help',
        'Giving encouragement',
        'Offering perspective',
        'Physical comfort (hugs, etc.)'
      ];
    } else {
      // Default options
      return [
        'Strongly Agree',
        'Agree',
        'Neutral',
        'Disagree',
        'Strongly Disagree'
      ];
    }
  };

  // Render the current step
  const renderCurrentStep = () => {
    if (steps.length === 0) return null;
    if (currentStep >= steps.length) return null;
    
    const step = steps[currentStep];
    
    return (
      <div>
        <h4 className="font-medium text-lg mb-6 font-roboto">{step.title}</h4>
        
        {step.questions.map(question => {
          if (question.type === 'text') {
            return renderTextQuestion(question);
          } else if (question.type === 'select') {
            return renderSelectQuestion(question);
          } else {
            return renderScaleQuestion(question);
          }
        })}
      </div>
    );
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center p-6">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 font-roboto">No Questions Available</h3>
          <p className="text-gray-600 font-roboto">
            No relationship assessment questions are available right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Health Assessment</h3>
          <p className="text-gray-600 font-roboto">
            This assessment helps track your relationship health for Cycle {cycle}. 
            Your responses will help provide personalized insights for your relationship.
          </p>
        </div>
        
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-1 font-roboto">
            <span>Your progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {/* Step indicators */}
        <div className="flex mb-8">
          {steps.map((step, index) => (
            <div key={index} className="flex-1 relative">
              <div className={`h-1 ${
                index < currentStep ? 'bg-black' : 
                index === currentStep ? 'bg-gray-500' : 'bg-gray-200'
              }`}></div>
              <div className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center ${
                index < currentStep ? 'bg-black text-white' :
                index === currentStep ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {index < currentStep ? <CheckCircle size={16} /> : index + 1}
              </div>
              <p className={`text-xs mt-4 text-center font-roboto ${
                index === currentStep ? 'font-medium' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
            </div>
          ))}
        </div>
        
        {/* Questions */}
        {renderCurrentStep()}
        
        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-roboto">
            <div className="flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {currentStep === 0 ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 flex items-center border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={18} className="mr-1" />
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={loading || !isCurrentStepComplete()}
            className={`px-4 py-2 rounded-lg font-roboto flex items-center ${
              loading || !isCurrentStepComplete()
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : currentStep < steps.length - 1 ? (
              <>
                Next
                <ChevronRight size={18} className="ml-1" />
              </>
            ) : (
              <>
                Complete
                <CheckCircle size={18} className="ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedRelationshipQuestionnaire;