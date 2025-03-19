import React, { useState } from 'react';
import { X, Save, Heart, MessageCircle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';

const CoupleCheckInScreen = ({ onClose }) => {
  const { 
    familyId, 
    familyMembers, 
    currentWeek, 
    selectedUser,
    saveCoupleCheckInData
  } = useFamily();
  
  const [responses, setResponses] = useState({
    satisfaction: 3,
    communication: 3,
    balance: 3,
    stress: 3,
    appreciation: 3,
    notes: '',
    nextSteps: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Get parent members for showing responses
  const parentMembers = familyMembers.filter(m => m.role === 'parent');
  const mamaUser = parentMembers.find(m => m.roleType === 'Mama');
  const papaUser = parentMembers.find(m => m.roleType === 'Papa');
  
  // Handle response change
  const handleResponseChange = (field, value) => {
    setResponses(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Format rating as text
  const getRatingText = (rating, field) => {
    const texts = {
      satisfaction: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
      communication: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
      balance: ['Very Imbalanced', 'Imbalanced', 'Somewhat Balanced', 'Balanced', 'Very Balanced'],
      stress: ['Very High', 'High', 'Moderate', 'Low', 'Very Low'],
      appreciation: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']
    };
    
    return texts[field][rating - 1];
  };
  
  // Save check-in data
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCoupleCheckInData(currentWeek, {
        responses,
        completedBy: selectedUser.id,
        completedByName: selectedUser.name,
        completedAt: new Date().toISOString()
      });
      
      if (onClose) onClose(true);
    } catch (error) {
      console.error("Error saving couple check-in:", error);
      alert("There was an error saving your check-in. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Heart size={20} className="text-pink-600 mr-2" />
            <h2 className="text-xl font-bold font-roboto">Couple Check-in: Cycle {currentWeek}</h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6 font-roboto">
            This quick check-in helps track how workload balance affects your relationship.
            Your responses will help guide future recommendations.
          </p>
          
          {/* Questions */}
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2 font-roboto">1. Overall Relationship Satisfaction</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                How satisfied are you with your relationship this week?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 border rounded">
                <span className="text-sm text-gray-600 font-roboto">Very Dissatisfied</span>
                <div className="flex space-x-4 my-3">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full ${
                        responses.satisfaction === value 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleResponseChange('satisfaction', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-roboto">Very Satisfied</span>
              </div>
              <div className="text-center mt-2">
                <span className="font-medium font-roboto">{getRatingText(responses.satisfaction, 'satisfaction')}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">2. Communication Quality</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                How would you rate the quality of communication about household and parenting tasks?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 border rounded">
                <span className="text-sm text-gray-600 font-roboto">Very Poor</span>
                <div className="flex space-x-4 my-3">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full ${
                        responses.communication === value 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleResponseChange('communication', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-roboto">Excellent</span>
              </div>
              <div className="text-center mt-2">
                <span className="font-medium font-roboto">{getRatingText(responses.communication, 'communication')}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">3. Workload Balance</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                How balanced do you feel the workload distribution was this week?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 border rounded">
                <span className="text-sm text-gray-600 font-roboto">Very Imbalanced</span>
                <div className="flex space-x-4 my-3">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full ${
                        responses.balance === value 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleResponseChange('balance', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-roboto">Very Balanced</span>
              </div>
              <div className="text-center mt-2">
                <span className="font-medium font-roboto">{getRatingText(responses.balance, 'balance')}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">4. Stress Level</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                How would you rate your stress level related to household and parenting responsibilities?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 border rounded">
                <span className="text-sm text-gray-600 font-roboto">Very High Stress</span>
                <div className="flex space-x-4 my-3">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full ${
                        responses.stress === value 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleResponseChange('stress', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-roboto">Very Low Stress</span>
              </div>
              <div className="text-center mt-2">
                <span className="font-medium font-roboto">{getRatingText(responses.stress, 'stress')}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">5. Appreciation</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                How often did you feel appreciated for your contributions this week?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 border rounded">
                <span className="text-sm text-gray-600 font-roboto">Never</span>
                <div className="flex space-x-4 my-3">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      className={`w-10 h-10 rounded-full ${
                        responses.appreciation === value 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleResponseChange('appreciation', value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-roboto">Always</span>
              </div>
              <div className="text-center mt-2">
                <span className="font-medium font-roboto">{getRatingText(responses.appreciation, 'appreciation')}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">6. Additional Notes</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                Any other thoughts about how workload balance affected your relationship this week?
              </p>
              <textarea
                value={responses.notes}
                onChange={(e) => handleResponseChange('notes', e.target.value)}
                className="w-full border rounded p-3 h-24 font-roboto"
                placeholder="Share your thoughts..."
              ></textarea>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 font-roboto">7. Next Steps</h3>
              <p className="text-sm text-gray-600 mb-3 font-roboto">
                What specific actions would you like to see to improve balance and your relationship?
              </p>
              <textarea
                value={responses.nextSteps}
                onChange={(e) => handleResponseChange('nextSteps', e.target.value)}
                className="w-full border rounded p-3 h-24 font-roboto"
                placeholder="What would help improve balance and your relationship?"
              ></textarea>
            </div>
          </div>
        </div>
        
        {/* Footer with save button */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-black text-white rounded font-roboto flex items-center"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Check-In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoupleCheckInScreen;