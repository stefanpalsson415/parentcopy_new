// QuestionFeedbackPanel.jsx
import React, { useState } from 'react';
import { Lightbulb, Save, X } from 'lucide-react';
import QuestionFeedbackService from '../../services/QuestionFeedbackService';

const QuestionFeedbackPanel = ({ questionId, questionText, category, familyId, onSave, onCancel }) => {
  const [isRelevant, setIsRelevant] = useState(true);
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSubmit = async () => {
    setIsSaving(true);
    
    try {
      // Create feedback object
      const feedback = {
        questionId,
        questionText,
        category,
        familyId,
        feedbackType: isRelevant ? 'applicable' : 'not_applicable',
        feedbackData: {
          isRelevant,
          comments
        },
        timestamp: new Date().toISOString()
      };
      
      // Send feedback to service
      await QuestionFeedbackService.recordQuestionFeedback(feedback);
      
      // Call the onSave callback with result
      onSave(isRelevant ? 'applicable' : 'not_applicable');
    } catch (error) {
      console.error("Error saving question feedback:", error);
      alert("There was an error saving your feedback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg border shadow-md p-4 w-full max-w-xl font-roboto">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium">Question Feedback</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-start">
        <Lightbulb size={18} className="mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
        <p>Your feedback helps Allie learn which questions are most relevant to your family. This improves future surveys and personalization.</p>
      </div>
      
      <div className="space-y-4">
        {/* Question preview */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">Question:</p>
          <p className="text-sm italic mt-1">{questionText}</p>
        </div>
        
        {/* Simple relevance selection */}
        <div>
          <p className="font-medium mb-2">Is this question relevant to your family?</p>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsRelevant(true)}
              className={`px-4 py-3 rounded-lg border flex-1 transition-colors ${
                isRelevant 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Relevant
            </button>
            <button
              onClick={() => setIsRelevant(false)}
              className={`px-4 py-3 rounded-lg border flex-1 transition-colors ${
                !isRelevant 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Not Relevant
            </button>
          </div>
        </div>
        
        {/* Comments */}
        <div>
          <label className="font-medium text-sm mb-1 block">Additional Comments (Optional)</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Any other feedback about this question..."
            rows={2}
          />
        </div>
        
        {/* Feedback result explanation */}
        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
          <p>If you mark this question as "Not Relevant":</p>
          <ul className="list-disc ml-5 mt-1 text-xs">
            <li>It will be removed from future surveys for your family</li>
            <li>Similar questions may be filtered out in upcoming cycles</li>
            <li>Allie will learn your family's unique structure and preferences</li>
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionFeedbackPanel;