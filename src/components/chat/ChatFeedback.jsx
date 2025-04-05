// src/components/chat/ChatFeedback.jsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, X, Star, Smile, Frown } from 'lucide-react';
import EnhancedChatService from '../../services/EnhancedChatService';

/**
 * Enhanced component for collecting user feedback on AI responses
 */
const ChatFeedback = ({ messageId, familyId }) => {
  const [feedback, setFeedback] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correction, setCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);

  // Handle feedback button click
  const handleFeedback = async (type) => {
    try {
      setFeedback(type);
      
      // For negative feedback, show correction form
      if (type === 'negative') {
        setShowCorrectionForm(true);
      } else {
        // For positive feedback, submit immediately
        setIsSubmitting(true);
        await EnhancedChatService.saveUserFeedback(messageId, 'positive');
        setSubmitted(true);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error providing feedback:", error);
      setIsSubmitting(false);
    }
  };

  // Handle specific feedback type selection
  const handleFeedbackType = (type) => {
    setFeedbackType(type);
  };

  // Handle correction submission
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      // Include feedback type in the submission if selected
      const feedbackData = {
        feedback: 'negative',
        correction: correction,
        feedbackType: feedbackType
      };
      await EnhancedChatService.saveUserFeedback(messageId, 'negative', correction, familyId, feedbackType);
      setSubmitted(true);
      setShowCorrectionForm(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting correction:", error);
      setIsSubmitting(false);
    }
  };

  // Reset feedback
  const handleReset = () => {
    setFeedback(null);
    setShowCorrectionForm(false);
    setCorrection('');
    setSubmitted(false);
    setFeedbackType(null);
  };

  // If feedback already submitted, show thank you message
  if (submitted) {
    return (
      <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
        <p className="font-roboto flex items-center">
          <ThumbsUp size={12} className="mr-1 text-green-500" />
          Thanks for your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs">
      {!showCorrectionForm ? (
        <div className="flex items-center">
          <span className="text-gray-500 mr-2 font-roboto">Was this helpful?</span>
          <button
            onClick={() => handleFeedback('positive')}
            disabled={isSubmitting}
            className={`p-1 rounded-full ${
              feedback === 'positive' 
                ? 'bg-green-100 text-green-600' 
                : 'hover:bg-gray-100'
            }`}
            aria-label="This was helpful"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => handleFeedback('negative')}
            disabled={isSubmitting}
            className={`p-1 rounded-full ml-1 ${
              feedback === 'negative' 
                ? 'bg-red-100 text-red-600' 
                : 'hover:bg-gray-100'
            }`}
            aria-label="This was not helpful"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleCorrectionSubmit} className="bg-gray-50 p-2 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium font-roboto flex items-center">
              <MessageSquare size={12} className="mr-1" />
              What was wrong with this response?
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cancel feedback"
            >
              <X size={14} />
            </button>
          </div>
          
          {/* Feedback type selection */}
          <div className="flex mb-2 gap-1">
            <button
              type="button"
              onClick={() => handleFeedbackType('incorrect')}
              className={`flex items-center text-xs p-1 rounded flex-1 ${
                feedbackType === 'incorrect' ? 'bg-red-100 text-red-700' : 'bg-white border'
              }`}
            >
              <Frown size={12} className="mr-1" />
              Incorrect
            </button>
            <button
              type="button"
              onClick={() => handleFeedbackType('confusing')}
              className={`flex items-center text-xs p-1 rounded flex-1 ${
                feedbackType === 'confusing' ? 'bg-amber-100 text-amber-700' : 'bg-white border'
              }`}
            >
              <MessageSquare size={12} className="mr-1" />
              Confusing
            </button>
            <button
              type="button"
              onClick={() => handleFeedbackType('better')}
              className={`flex items-center text-xs p-1 rounded flex-1 ${
                feedbackType === 'better' ? 'bg-blue-100 text-blue-700' : 'bg-white border'
              }`}
            >
              <Star size={12} className="mr-1" />
              Could be better
            </button>
          </div>
          
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            className="w-full border rounded text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-roboto"
            placeholder="Please explain what was incorrect or unhelpful..."
            rows="2"
            required
          ></textarea>
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={isSubmitting || !correction.trim()}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300 font-roboto"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatFeedback;