// src/components/relationship/CouplesMeeting.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Users, Heart, Calendar, ChevronDown, ChevronUp, MessageCircle, 
    CheckCircle, X, Edit, Calendar as CalendarIcon, Clock, Save,
    Plus, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';

// Helper to format date consistently
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const CouplesMeeting = ({ cycle, meetingData, onComplete, onCancel }) => {
  const { selectedUser, familyMembers } = useFamily();
  
  // State variables
  const [expandedTopics, setExpandedTopics] = useState({});
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [topicResponses, setTopicResponses] = useState({});
  const [actionItems, setActionItems] = useState([{ text: '', id: Date.now() }]);
  const [notesBeingEdited, setNotesBeingEdited] = useState({});
  const [nextMeetingDate, setNextMeetingDate] = useState(() => {
    // Default to 2 weeks from now
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  });
  const [nextMeetingTime, setNextMeetingTime] = useState('19:00'); // 7:00 PM
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('discussion'); // 'discussion', 'action', 'schedule'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const topicRefs = useRef({});
  
  // Initialize expanded topics
  useEffect(() => {
    if (meetingData?.agenda?.topics) {
      const initialExpanded = {};
      meetingData.agenda.topics.forEach((_, index) => {
        initialExpanded[index] = index === 0; // Only expand first topic initially
      });
      setExpandedTopics(initialExpanded);
    }
  }, [meetingData]);
  
  // Initialize topic responses
  useEffect(() => {
    if (meetingData?.agenda?.topics) {
      const initialResponses = {};
      meetingData.agenda.topics.forEach((topic, index) => {
        initialResponses[`topic-${index}`] = '';
      });
      setTopicResponses(initialResponses);
    }
  }, [meetingData]);
  
  // Toggle topic expansion
  const toggleTopic = (index) => {
    setExpandedTopics(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
    
    // If expanding, set as active topic
    if (!expandedTopics[index]) {
      setActiveTopicIndex(index);
      
      // Scroll to topic after a short delay
      setTimeout(() => {
        if (topicRefs.current[index]) {
          topicRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  
  // Handle response changes
  const handleResponseChange = (topicIndex, value) => {
    setTopicResponses(prev => ({
      ...prev,
      [`topic-${topicIndex}`]: value
    }));
  };
  
  // Toggle editing notes
  const toggleEditingNotes = (topicIndex) => {
    setNotesBeingEdited(prev => ({
      ...prev,
      [topicIndex]: !prev[topicIndex]
    }));
  };
  
  // Action item functions
  const handleActionItemChange = (id, value) => {
    setActionItems(prev => prev.map(item => item.id === id ? { ...item, text: value } : item));
  };
  
  const addActionItem = () => {
    setActionItems(prev => [...prev, { text: '', id: Date.now() }]);
  };
  
  const removeActionItem = (id) => {
    if (actionItems.length > 1) {
      setActionItems(prev => prev.filter(item => item.id !== id));
    }
  };
  
  // Get next meeting datetime
  const getNextMeetingDateTime = () => {
    const date = new Date(`${nextMeetingDate}T${nextMeetingTime}`);
    return date.toISOString();
  };
  
  // Move to next step
  const goToNextStep = () => {
    // Check if current step is complete
    if (step === 'discussion') {
      // Check if all topics have responses
      const allTopicsHaveResponses = Object.values(topicResponses).every(response => response.trim().length > 0);
      if (!allTopicsHaveResponses) {
        setError("Please add notes for all discussion topics before continuing");
        return;
      }
      setStep('action');
    } else if (step === 'action') {
      // Check if at least one action item
      const hasValidActionItems = actionItems.some(item => item.text.trim().length > 0);
      if (!hasValidActionItems) {
        setError("Please add at least one action item");
        return;
      }
      setStep('schedule');
    } else if (step === 'schedule') {
      // Submit the meeting
      handleSubmit();
    }
    
    // Clear any previous errors
    setError(null);
  };
  
  // Go back to previous step
  const goToPreviousStep = () => {
    if (step === 'action') {
      setStep('discussion');
    } else if (step === 'schedule') {
      setStep('action');
    }
    
    // Clear any previous errors
    setError(null);
  };
  
  // Submit the meeting
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Filter out empty action items
      const validActionItems = actionItems
        .filter(item => item.text.trim().length > 0)
        .map(item => item.text.trim());
      
      // Prepare meeting data
      const completedMeetingData = {
        notes: {
          topicResponses: topicResponses
        },
        actionItems: validActionItems,
        nextMeeting: getNextMeetingDateTime()
      };
      
      await onComplete(completedMeetingData);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Error completing meeting:", err);
      setError(err.message || "Failed to save meeting results");
      setIsSubmitting(false);
    }
  };
  
  // Render the discussion step
  const renderDiscussionStep = () => (
    <div>
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <div className="flex items-start">
          <Heart size={20} className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-2 font-roboto">Welcome to Your Couple's Meeting</h4>
            <p className="text-sm text-blue-800 font-roboto mb-2">
              {meetingData?.agenda?.introduction || 
               "This meeting is designed to strengthen your relationship through meaningful conversation. Take your time with each topic, ensuring both partners have a chance to share their thoughts."}
            </p>
            <p className="text-xs text-blue-700 font-roboto">
              Work through each topic together and capture your notes and insights.
            </p>
          </div>
        </div>
      </div>
      
      {/* Topics */}
      <div className="space-y-4 mb-6">
        {meetingData?.agenda?.topics?.map((topic, index) => (
          <div 
            key={index} 
            className={`border rounded-lg overflow-hidden ${
              expandedTopics[index] ? 'shadow-md' : ''
            }`}
            ref={el => topicRefs.current[index] = el}
          >
            {/* Topic Header */}
            <div 
              className={`p-4 flex items-center justify-between cursor-pointer ${
                expandedTopics[index] 
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-b' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleTopic(index)}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 text-purple-600">
                  {index + 1}
                </div>
                <h4 className="font-medium font-roboto">{topic.title}</h4>
              </div>
              <div className="flex items-center">
                {topicResponses[`topic-${index}`]?.trim().length > 0 && (
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                )}
                {expandedTopics[index] ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </div>
            </div>
            
            {/* Topic Content */}
            {expandedTopics[index] && (
              <div className="p-4">
                {/* Description */}
                <p className="text-sm text-gray-600 font-roboto mb-4">
                  {topic.description}
                </p>
                
                {/* Alignment */}
                {topic.alignment && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium font-roboto mb-1">
                      Partner Perspectives
                    </p>
                    <p className="text-sm text-gray-600 font-roboto">
                      {topic.alignment}
                    </p>
                  </div>
                )}
                
                {/* Discussion Questions */}
                {topic.questions && topic.questions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium font-roboto mb-2">
                      Discussion Questions
                    </p>
                    <div className="space-y-2">
                      {topic.questions.map((question, qIndex) => (
                        <div 
                          key={qIndex}
                          className="p-3 bg-white border rounded-lg"
                        >
                          <p className="text-sm font-roboto">{question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Suggested Actions */}
                {topic.suggestedActions && topic.suggestedActions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium font-roboto mb-2">
                      Suggested Actions
                    </p>
                    <div className="space-y-1">
                      {topic.suggestedActions.map((action, aIndex) => (
                        <div key={aIndex} className="flex items-start">
                          <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          </div>
                          <p className="text-sm font-roboto">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Notes Input */}
                <div className="mt-5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium font-roboto">
                      Your Discussion Notes
                    </p>
                    <button
                      onClick={() => toggleEditingNotes(index)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Edit size={12} className="mr-1" />
                      {notesBeingEdited[index] ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  
                  {notesBeingEdited[index] ? (
                    <textarea
                      value={topicResponses[`topic-${index}`] || ''}
                      onChange={(e) => handleResponseChange(index, e.target.value)}
                      placeholder="Capture your thoughts, insights, and conclusions from this discussion..."
                      className="w-full border rounded-lg p-3 min-h-[120px] font-roboto focus:ring-1 focus:ring-black focus:outline-none"
                    ></textarea>
                  ) : (
                    <div 
                      className="border rounded-lg p-3 min-h-[60px] bg-gray-50 text-sm font-roboto"
                      onClick={() => toggleEditingNotes(index)}
                    >
                      {topicResponses[`topic-${index}`] || 'Click to add notes...'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render the action step
  const renderActionStep = () => (
    <div>
      <div className="p-4 bg-amber-50 rounded-lg mb-6">
        <div className="flex items-start">
          <CheckCircle size={20} className="text-amber-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-2 font-roboto">Create Your Action Plan</h4>
            <p className="text-sm text-amber-800 font-roboto mb-2">
              Based on your discussion, what specific actions will you take to strengthen your relationship?
              These commitments will help translate your insights into meaningful change.
            </p>
            <p className="text-xs text-amber-700 font-roboto">
              Be specific, actionable, and realistic with your commitments.
            </p>
          </div>
        </div>
      </div>
      
      {/* Action Items */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-lg mb-4 font-roboto">Action Items</h4>
        
        {actionItems.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleActionItemChange(item.id, e.target.value)}
              placeholder={`Action item ${index + 1}`}
              className="flex-1 border rounded-lg p-3 font-roboto focus:ring-1 focus:ring-black focus:outline-none"
            />
            <button
              onClick={() => removeActionItem(item.id)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Remove item"
              disabled={actionItems.length <= 1}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        <button
          onClick={addActionItem}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-roboto"
        >
          <Plus size={16} className="mr-1" />
          Add another action item
        </button>
      </div>
      
      {/* Topic Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-medium text-sm mb-3 font-roboto">Discussion Summary</h4>
        
        <div className="space-y-2">
          {meetingData?.agenda?.topics?.map((topic, index) => (
            topicResponses[`topic-${index}`]?.trim().length > 0 && (
              <div key={index} className="bg-white p-3 rounded border">
                <p className="text-sm font-medium font-roboto mb-1">{topic.title}</p>
                <p className="text-xs text-gray-600 font-roboto">
                  {topicResponses[`topic-${index}`].length > 100 
                    ? topicResponses[`topic-${index}`].substring(0, 100) + '...' 
                    : topicResponses[`topic-${index}`]}
                </p>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
  
  // Render the schedule step
  const renderScheduleStep = () => (
    <div>
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <div className="flex items-start">
          <CalendarIcon size={20} className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-2 font-roboto">Schedule Your Next Meeting</h4>
            <p className="text-sm text-blue-800 font-roboto mb-2">
              Regular couple's meetings are key to maintaining relationship growth.
              Select a date and time for your next conversation.
            </p>
            <p className="text-xs text-blue-700 font-roboto">
              We recommend scheduling these meetings every 2-4 weeks.
            </p>
          </div>
        </div>
      </div>
      
      {/* Date and Time Selection */}
      <div className="mb-6">
        <h4 className="font-medium text-lg mb-4 font-roboto">Next Meeting Date</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 font-roboto">
              Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <CalendarIcon size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
                className="border rounded-lg py-2 pl-10 pr-3 w-full font-roboto focus:ring-1 focus:ring-black focus:outline-none"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 font-roboto">
              Time
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Clock size={16} className="text-gray-400" />
              </div>
              <input
                type="time"
                value={nextMeetingTime}
                onChange={(e) => setNextMeetingTime(e.target.value)}
                className="border rounded-lg py-2 pl-10 pr-3 w-full font-roboto focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <p className="font-medium text-sm mb-1 font-roboto">Next Meeting:</p>
          <p className="text-purple-700 font-roboto">
            {formatDate(`${nextMeetingDate}T${nextMeetingTime}`)}
          </p>
        </div>
      </div>
      
      {/* Meeting Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-medium text-sm mb-3 font-roboto">Meeting Summary</h4>
        
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border">
            <p className="text-sm font-medium font-roboto mb-1">Topics Discussed</p>
            <div className="space-y-1">
              {meetingData?.agenda?.topics?.map((topic, index) => (
                topicResponses[`topic-${index}`]?.trim().length > 0 && (
                  <p key={index} className="text-xs text-gray-600 font-roboto">
                    • {topic.title}
                  </p>
                )
              ))}
            </div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm font-medium font-roboto mb-1">Action Items</p>
            <div className="space-y-1">
              {actionItems
                .filter(item => item.text.trim().length > 0)
                .map((item, index) => (
                  <p key={index} className="text-xs text-gray-600 font-roboto">
                    • {item.text}
                  </p>
                ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Final Note */}
      <div className="mb-6">
        <p className="text-sm font-roboto">
          {meetingData?.agenda?.closingReflection || 
           "Congratulations on completing your couple's meeting! Remember that small, consistent efforts lead to significant positive change in your relationship. By committing to these regular check-ins, you're investing in the health and happiness of your partnership."}
        </p>
      </div>
    </div>
  );
  
  // Render appropriate step content
  const renderStepContent = () => {
    switch (step) {
      case 'discussion':
        return renderDiscussionStep();
      case 'action':
        return renderActionStep();
      case 'schedule':
        return renderScheduleStep();
      default:
        return renderDiscussionStep();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 font-roboto flex items-center">
            <Users size={20} className="text-purple-600 mr-2" />
            Couple's Meeting - Cycle {cycle}
          </h3>
          <p className="text-gray-600 font-roboto">
            This meeting is designed to strengthen your relationship through meaningful conversation and action planning.
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <div 
            className={`flex-1 border-b-2 ${step === 'discussion' || step === 'action' || step === 'schedule' ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step === 'action' || step === 'schedule' ? 'bg-black text-white' : 
                  step === 'discussion' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step === 'action' || step === 'schedule' ? <CheckCircle size={14} /> : "1"}
              </div>
              <div className="text-xs mt-1 font-roboto">Discussion</div>
            </div>
          </div>
          
          <div 
            className={`flex-1 border-b-2 ${step === 'action' || step === 'schedule' ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step === 'schedule' ? 'bg-black text-white' : 
                  step === 'action' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step === 'schedule' ? <CheckCircle size={14} /> : "2"}
              </div>
              <div className="text-xs mt-1 font-roboto">Action Plan</div>
            </div>
          </div>
          
          <div 
            className={`flex-1 border-b-2 ${step === 'schedule' ? 'border-black' : 'border-gray-200'}`}
            style={{ transition: 'border-color 0.3s' }}
          >
            <div className="relative top-[7px] flex flex-col items-center">
              <div 
                className={`rounded-full w-6 h-6 flex items-center justify-center ${
                  step === 'schedule' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step === 'complete' ? <CheckCircle size={14} /> : "3"}
              </div>
              <div className="text-xs mt-1 font-roboto">Next Meeting</div>
            </div>
          </div>
        </div>
        
        {/* Content based on current step */}
        <div className="mb-6">
          {renderStepContent()}
        </div>
        
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
          {step === 'discussion' ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={goToPreviousStep}
              className="px-4 py-2 flex items-center border border-gray-300 rounded-lg font-roboto text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={18} className="mr-1" />
              Back
            </button>
          )}
          
          <button
            onClick={goToNextStep}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg font-roboto flex items-center ${
              isSubmitting
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : step === 'schedule' ? (
              <>
                <Save size={18} className="mr-1" />
                Complete Meeting
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} className="ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouplesMeeting;