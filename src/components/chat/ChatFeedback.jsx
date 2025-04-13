// src/components/chat/ChatFeedback.jsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import FeedbackLearningSystem from '../../services/FeedbackLearningSystem';
import ConversationContext from '../../services/ConversationContext';

const ChatFeedback = ({ messageId, familyId }) => {
  const [feedback, setFeedback] = useState(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (isPositive) => {
    if (isSubmitting) return;
    
    const feedbackType = isPositive ? 'helpful' : 'unhelpful';
    
    if (feedback === feedbackType) {
      // Toggle feedback off if clicking the same button again
      setFeedback(null);
      setShowComment(false);
    } else {
      // Set new feedback
      setFeedback(feedbackType);
      
      // Only show comment box for negative feedback
      if (!isPositive) {
        setShowComment(true);
      } else {
        // For positive feedback, just record without comment
        await submitFeedback(feedbackType, '');
      }
    }
  };

  const submitFeedback = async (type, userComment = '') => {
    setIsSubmitting(true);
    
    try {
      // Use our new feedback system
      await FeedbackLearningSystem.recordFeedback(
        messageId,
        type,
        userComment,
        {
          familyId,
          ...ConversationContext.getConversationSummary(familyId)
        }
      );
      
      // Hide comment box after submission
      if (type !== 'helpful') {
        setShowComment(false);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    // Determine specific feedback type based on content
    let specificType = 'unhelpful';
    
    if (comment.match(/(?:not right|wrong|incorrect)/i)) {
      specificType = 'incorrect_information';
    } else if (comment.match(/(?:confusing|don'?t understand|unclear)/i)) {
      specificType = 'confusing';
    } else if (comment.match(/(?:more information|not enough|incomplete)/i)) {
      specificType = 'incomplete';
    }
    
    await submitFeedback(specificType, comment);
    setComment('');
  };

  return (
    <div className="mt-2 flex flex-col">
      <div className="flex items-center text-xs space-x-2 justify-end">
        <button
          onClick={() => handleFeedback(true)}
          className={`p-1 rounded-md transition ${
            feedback === 'helpful' 
              ? 'bg-green-100 text-green-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="Helpful"
        >
          <ThumbsUp size={12} />
        </button>
        <button
          onClick={() => handleFeedback(false)}
          className={`p-1 rounded-md transition ${
            feedback === 'unhelpful' 
              ? 'bg-red-100 text-red-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="Not helpful"
        >
          <ThumbsDown size={12} />
        </button>
        {!showComment && feedback === 'unhelpful' && (
          <button
            onClick={() => setShowComment(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition"
            title="Add comment"
          >
            <MessageSquare size={12} />
          </button>
        )}
      </div>
      
      {showComment && (
        <form onSubmit={handleCommentSubmit} className="mt-2">
          <div className="flex">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was wrong with this response?"
              className="flex-1 text-xs p-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSubmitting ? "..." : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatFeedback;