// QuestionFeedbackPanel.jsx
import React, { useState } from 'react';
import { Scale, Home, Clock, Star, SendHorizonal, Save, X, Lightbulb } from 'lucide-react';
import QuestionFeedbackService from '../../services/QuestionFeedbackService';

const QuestionFeedbackPanel = ({ questionId, questionText, category, familyId, onSave, onCancel }) => {
  const [feedbackData, setFeedbackData] = useState({
    structureRelevance: 5, // 1-5 scale, 5 = fully relevant
    roleDistribution: 5,   // 1-5 scale, 5 = standard distribution works
    taskFrequency: 5,      // 1-5 scale, 5 = we do this regularly
    importance: 5,         // 1-5 scale, 5 = very important
    comments: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSliderChange = (field, value) => {
    setFeedbackData({
      ...feedbackData,
      [field]: parseInt(value)
    });
  };
  
  const handleSubmit = async () => {
    setIsSaving(true);
    
    try {
      // Determine if the question is applicable based on aggregate feedback
      // If average is below 3, consider not applicable
      const feedbackValues = [
        feedbackData.structureRelevance,
        feedbackData.roleDistribution,
        feedbackData.taskFrequency,
        feedbackData.importance
      ];
      
      const average = feedbackValues.reduce((sum, val) => sum + val, 0) / feedbackValues.length;
      const isApplicable = average >= 3;
      
      // Create feedback object
      const feedback = {
        questionId,
        questionText,
        category,
        familyId,
        feedbackType: isApplicable ? 'applicable' : 'not_applicable',
        feedbackData: {
          ...feedbackData,
          isApplicable,
          average
        },
        timestamp: new Date().toISOString()
      };
      
      // Send feedback to service
      await QuestionFeedbackService.recordQuestionFeedback(feedback);
      
      // Call the onSave callback with result
      onSave(isApplicable ? 'applicable' : 'not_applicable');
    } catch (error) {
      console.error("Error saving question feedback:", error);
      alert("There was an error saving your feedback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper to get label and colors for different ratings
  const getRatingInfo = (field, value) => {
    const labels = {
      structureRelevance: [
        "Not relevant to our family structure",
        "Minimally relevant",
        "Somewhat relevant",
        "Mostly relevant",
        "Completely relevant to our family"
      ],
      roleDistribution: [
        "We have a completely different arrangement",
        "Our roles differ significantly",
        "Mixed relevance to our roles",
        "Mostly fits our role distribution",
        "Standard roles work for our family"
      ],
      taskFrequency: [
        "We never do this",
        "We rarely do this",
        "We occasionally do this",
        "We regularly do this",
        "We frequently do this"
      ],
      importance: [
        "Not at all important to us",
        "Low importance to our family",
        "Moderately important",
        "Important to our family",
        "Very important to our family"
      ]
    };
    
    return {
      label: labels[field][value - 1],
      color: value <= 2 ? "text-red-600" : value === 3 ? "text-amber-600" : "text-green-600"
    };
  };
  
  return (
    <div className="bg-white rounded-lg border shadow-md p-4 w-full max-w-xl">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium font-roboto">Question Feedback</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-start font-roboto">
        <Lightbulb size={18} className="mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
        <p>Your feedback helps Allie learn which questions are most relevant to your family. This improves future surveys and personalization.</p>
      </div>
      
      <div className="space-y-4">
        {/* Structure Relevance */}
        <div>
          <div className="flex items-center mb-1">
            <Home size={16} className="mr-2 text-gray-700" />
            <label className="font-medium text-sm font-roboto">Family Structure Relevance</label>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-roboto">Does this question fit your family's composition (parents, children, living arrangements)?</p>
          <input
            type="range"
            min="1"
            max="5"
            value={feedbackData.structureRelevance}
            onChange={(e) => handleSliderChange('structureRelevance', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 font-roboto">Not relevant</span>
            <span className={`text-xs font-medium font-roboto ${getRatingInfo('structureRelevance', feedbackData.structureRelevance).color}`}>
              {getRatingInfo('structureRelevance', feedbackData.structureRelevance).label}
            </span>
            <span className="text-xs text-gray-500 font-roboto">Very relevant</span>
          </div>
        </div>
        
        {/* Role Distribution */}
        <div>
          <div className="flex items-center mb-1">
            <Scale size={16} className="mr-2 text-gray-700" />
            <label className="font-medium text-sm font-roboto">Role Distribution</label>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-roboto">Do the Mama/Papa roles in this question match how your family divides responsibilities?</p>
          <input
            type="range"
            min="1"
            max="5"
            value={feedbackData.roleDistribution}
            onChange={(e) => handleSliderChange('roleDistribution', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 font-roboto">Different roles</span>
            <span className={`text-xs font-medium font-roboto ${getRatingInfo('roleDistribution', feedbackData.roleDistribution).color}`}>
              {getRatingInfo('roleDistribution', feedbackData.roleDistribution).label}
            </span>
            <span className="text-xs text-gray-500 font-roboto">Standard roles</span>
          </div>
        </div>
        
        {/* Task Frequency */}
        <div>
          <div className="flex items-center mb-1">
            <Clock size={16} className="mr-2 text-gray-700" />
            <label className="font-medium text-sm font-roboto">Task Frequency</label>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-roboto">How often does this task occur in your family's routine?</p>
          <input
            type="range"
            min="1"
            max="5"
            value={feedbackData.taskFrequency}
            onChange={(e) => handleSliderChange('taskFrequency', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 font-roboto">Never</span>
            <span className={`text-xs font-medium font-roboto ${getRatingInfo('taskFrequency', feedbackData.taskFrequency).color}`}>
              {getRatingInfo('taskFrequency', feedbackData.taskFrequency).label}
            </span>
            <span className="text-xs text-gray-500 font-roboto">Frequently</span>
          </div>
        </div>
        
        {/* Importance */}
        <div>
          <div className="flex items-center mb-1">
            <Star size={16} className="mr-2 text-gray-700" />
            <label className="font-medium text-sm font-roboto">Importance to Your Family</label>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-roboto">How much does this task matter in your household's daily functioning?</p>
          <input
            type="range"
            min="1"
            max="5"
            value={feedbackData.importance}
            onChange={(e) => handleSliderChange('importance', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 font-roboto">Not important</span>
            <span className={`text-xs font-medium font-roboto ${getRatingInfo('importance', feedbackData.importance).color}`}>
              {getRatingInfo('importance', feedbackData.importance).label}
            </span>
            <span className="text-xs text-gray-500 font-roboto">Very important</span>
          </div>
        </div>
        
        {/* Comments */}
        <div>
          <label className="font-medium text-sm mb-1 block font-roboto">Additional Comments (Optional)</label>
          <textarea
            value={feedbackData.comments}
            onChange={(e) => setFeedbackData({...feedbackData, comments: e.target.value})}
            className="w-full p-2 border rounded text-sm font-roboto"
            placeholder="Any other feedback about this question..."
            rows={2}
          />
        </div>
        
        {/* Feedback result explanation */}
        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 font-roboto">
          <p>If your feedback indicates this question isn't applicable to your family:</p>
          <ul className="list-disc ml-5 mt-1 text-xs">
            <li>It will be removed from future surveys for your family</li>
            <li>Similar questions may be filtered out in upcoming cycles</li>
            <li>Allie will learn your family's unique structure and preferences</li>
            <li>You can always update your feedback later</li>
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 font-roboto"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center font-roboto"
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