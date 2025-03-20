import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';

const RelationshipMeetingScreen = ({ onClose }) => {
  const { 
    currentWeek,
    getCoupleCheckInData,
    saveFamilyMeetingNotes
  } = useFamily();
  
  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState([]);
  const [notes, setNotes] = useState({
    gratitudes: '',
    challengeDiscussion: '',
    agreements: '',
    nextSteps: ''
  });
  const [expandedSection, setExpandedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Generate a relationship meeting agenda based on check-in data
  useEffect(() => {
    const generateAgenda = async () => {
      setLoading(true);
      
      try {
        // Get couple check-in data
        const checkInData = await getCoupleCheckInData(currentWeek);
        
        if (!checkInData) {
          // Generate default agenda if no check-in data
          setAgenda(getDefaultAgenda());
        } else {
          // Generate tailored agenda based on check-in responses
          setAgenda(generateTailoredAgenda(checkInData));
        }
      } catch (error) {
        console.error("Error generating relationship meeting agenda:", error);
        setAgenda(getDefaultAgenda());
      } finally {
        setLoading(false);
      }
    };
    
    generateAgenda();
  }, [currentWeek, getCoupleCheckInData]);
  
  // Default agenda when no check-in data is available
  const getDefaultAgenda = () => [
    {
      id: 'appreciation',
      title: 'Express Appreciation',
      description: 'Begin by sharing what you appreciate about each other this week.',
      questions: [
        'What did your partner do this week that you felt grateful for?',
        'How did your partner's actions help you feel supported?',
        'What specific quality in your partner did you notice or appreciate recently?'
      ],
      tips: 'Be specific with your appreciation. Mention both actions and qualities you value.'
    },
    {
      id: 'challenges',
      title: 'Discuss Current Challenges',
      description: 'Talk about current difficulties affecting your relationship.',
      questions: [
        'What aspects of your workload balance feel most challenging right now?',
        'Are there communication obstacles you'd like to address?',
        'How has your time together been impacted by your responsibilities?'
      ],
      tips: 'Focus on "I" statements rather than blame. Describe how situations make you feel.'
    },
    {
      id: 'strategies',
      title: 'Review Your Strategic Actions',
      description: 'Discuss which relationship strategies you'd like to focus on or improve.',
      questions: [
        'Which of our 10 strategic actions do you feel we should prioritize?',
        'How can we better implement our daily check-ins?',
        'What would help us be more successful with dividing responsibilities?'
      ],
      tips: 'Choose 1-2 strategies to focus on rather than trying to improve everything at once.'
    },
    {
      id: 'agreements',
      title: 'Make Agreements',
      description: 'Create clear agreements about what each of you will do.',
      questions: [
        'What specific actions will each of you take this week?',
        'How will you support each other in maintaining these agreements?',
        'When will you check in on your progress?'
      ],
      tips: 'Make agreements SMART: Specific, Measurable, Achievable, Relevant, and Time-bound.'
    }
  ];
  
  // Generate a tailored agenda based on check-in responses
  const generateTailoredAgenda = (checkInData) => {
    const responses = checkInData.responses;
    const agenda = [];
    
    // Always start with appreciation section
    agenda.push({
      id: 'appreciation',
      title: 'Express Appreciation',
      description: 'Begin by sharing what you appreciate about each other this week.',
      questions: [
        'What did your partner do this week that you felt grateful for?',
        'How did your partner's actions help you feel supported?',
        'What specific quality in your partner did you notice or appreciate recently?'
      ],
      tips: 'Be specific with your appreciation. Mention both actions and qualities you value.'
    });
    
    // Add section based on satisfaction score
    if (responses.satisfaction < 4) {
      agenda.push({
        id: 'satisfaction',
        title: 'Relationship Satisfaction',
        description: 'Your check-in indicated some room for improvement in overall satisfaction.',
        questions: [
          'What factors are most affecting your relationship satisfaction right now?',
          'What would help you feel more satisfied in your relationship?',
          'What is one thing each of you could do to increase satisfaction?'
        ],
        tips: 'Focus on what you can create together rather than what's missing.'
      });
    }
    
    // Add section based on communication score
    if (responses.communication < 4) {
      agenda.push({
        id: 'communication',
        title: 'Communication Patterns',
        description: 'Your check-in indicated some challenges in communication.',
        questions: [
          'What communication patterns aren't working well for you?',
          'When do you feel most heard and understood by your partner?',
          'What would help improve how you communicate about sensitive topics?'
        ],
        tips: 'Practice reflective listening: repeat back what you heard before responding.'
      });
    }
    
    // Add section for strategies that need attention
    const lowImplementationStrategies = [];
    Object.entries(responses.strategies).forEach(([key, data]) => {
      if (data.implementation < 50) {
        // Convert camelCase to readable text
        const strategy = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
        
        lowImplementationStrategies.push({
          key,
          name: strategy,
          implementation: data.implementation,
          effectiveness: data.effectiveness
        });
      }
    });
    
    if (lowImplementationStrategies.length > 0) {
      // Sort by implementation level (lowest first)
      lowImplementationStrategies.sort((a, b) => a.implementation - b.implementation);
      
      // Create questions for the top 3 strategies that need attention
      const topStrategies = lowImplementationStrategies.slice(0, 3);
      const strategyQuestions = topStrategies.map(strategy => 
        `How can you improve your implementation of ${strategy.name}?`
      );
      
      // Add additional generic questions
      strategyQuestions.push(
        'What obstacles are preventing better implementation of these strategies?',
        'Which strategy would have the biggest positive impact if improved?'
      );
      
      agenda.push({
        id: 'strategies',
        title: 'Strategy Implementation',
        description: `Your check-in identified ${topStrategies.length} strategies that need attention.`,
        questions: strategyQuestions,
        tips: 'Choose 1-2 strategies to focus on rather than trying to improve everything at once.'
      });
    }
    
    // Add section based on workload balance impact
    if (responses.workloadBalance < 4) {
      agenda.push({
        id: 'workloadBalance',
        title: 'Workload Balance Impact',
        description: 'Your check-in indicated that workload balance is affecting your relationship.',
        questions: [
          'How is the current distribution of tasks affecting your relationship?',
          'What specific responsibilities create the most strain?',
          'What adjustments would make the biggest positive difference?'
        ],
        tips: 'Focus first on the mental load aspects, not just visible tasks.'
      });
    }
    
    // Always end with agreements section
    agenda.push({
      id: 'agreements',
      title: 'Make Agreements',
      description: 'Create clear agreements about what each of you will do.',
      questions: [
        'What specific actions will each of you take this week?',
        'How will you support each other in maintaining these agreements?',
        'When will you check in on your progress?'
      ],
      tips: 'Make agreements SMART: Specific, Measurable, Achievable, Relevant, and Time-bound.'
    });
    
    return agenda;
  };
  
  // Toggle section expansion
  const toggleSection = (sectionId) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
    }
  };
  
  // Handle notes change
  const handleNotesChange = (key, value) => {
    setNotes({
      ...notes,
      [key]: value
    });
  };
  
  // Complete meeting and save notes
  const handleComplete = async () => {
    setSaving(true);
    
    try {
      // Save meeting notes to database
      await saveFamilyMeetingNotes(currentWeek, {
        ...notes,
        type: 'relationship',
        completedAt: new Date().toISOString()
      });
      
      setSaved(true);
      setTimeout(() => {
        onClose(true); // Close with success
      }, 2000);
    } catch (error) {
      console.error("Error saving meeting notes:", error);
      alert("There was an error saving your notes. Please try again.");
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-roboto">Generating your relationship meeting agenda...</span>
        </div>
      </div>
    );
  }
  
  if (saved) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 font-roboto">Meeting Complete!</h3>
          <p className="text-gray-600 font-roboto">
            Your relationship meeting notes have been saved. Keep building on your progress together!
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Heart size={24} className="text-red-500 mr-2" />
            <div>
              <h2 className="text-xl font-bold font-roboto">Weekly Relationship Meeting</h2>
              <p className="text-sm text-gray-600 font-roboto">Week {currentWeek}</p>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Introduction */}
          <div className="mb-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <MessageCircle size={24} className="text-pink-600 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium font-roboto">Welcome to Your Relationship Meeting</h3>
                  <p className="text-sm mt-1 font-roboto">
                    This 15-20 minute conversation will help you strengthen your partnership and ensure you're 
                    supporting each other effectively. Research shows regular relationship check-ins lead to 
                    higher satisfaction and better workload balance.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">How to Use This Guide</h3>
              <ol className="list-decimal list-inside text-sm space-y-2 font-roboto">
                <li>Take turns answering questions in each section</li>
                <li>Listen fully to your partner before responding</li>
                <li>Focus on understanding, not just solving problems</li>
                <li>Use the notes section to document key insights and agreements</li>
                <li>End with clear agreements about what you'll each do differently</li>
              </ol>
            </div>
          </div>
          
          {/* Agenda Sections */}
          <div className="space-y-4 mb-6">
            {agenda.map((section, index) => (
              <div key={section.id} className="border rounded-lg overflow-hidden">
                <div 
                  className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${
                    expandedSection === section.id ? 'border-b' : ''
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <h3 className="font-medium font-roboto">{section.title}</h3>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronUp size={20} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500" />
                  )}
                </div>
                
                {expandedSection === section.id && (
                  <div className="p-4 bg-gray-50">
                    <p className="mb-4 font-roboto">{section.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 font-roboto">Discussion Questions</h4>
                      <ul className="list-disc list-inside space-y-2 font-roboto">
                        {section.questions.map((question, qIndex) => (
                          <li key={qIndex} className="text-sm">{question}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {section.tips && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm font-roboto">
                        <div className="flex items-start">
                          <Sparkles size={16} className="text-blue-600 mr-2 mt-0.5" />
                          <p><span className="font-medium">Tip:</span> {section.tips}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Notes for this section */}
                    <div>
                      <label className="block text-sm font-medium mb-2 font-roboto">
                        Notes from your discussion:
                      </label>
                      <textarea
                        className="w-full p-3 border rounded-md"
                        rows="4"
                        placeholder="Record your key insights, decisions, and agreements..."
                        value={notes[section.id] || ''}
                        onChange={(e) => handleNotesChange(section.id, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Notes Sections */}
          <div className="mb-6">
            <h3 className="font-medium mb-4 font-roboto">Meeting Summary</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 font-roboto">
                  Gratitudes shared:
                </label>
                <textarea
                  className="w-full p-3 border rounded-md font-roboto"
                  rows="3"
                  placeholder="What appreciations did you share with each other?"
                  value={notes.gratitudes}
                  onChange={(e) => handleNotesChange('gratitudes', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 font-roboto">
                  Key insights from challenge discussion:
                </label>
                <textarea
                  className="w-full p-3 border rounded-md font-roboto"
                  rows="3"
                  placeholder="What did you learn about your challenges?"
                  value={notes.challengeDiscussion}
                  onChange={(e) => handleNotesChange('challengeDiscussion', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 font-roboto">
                  Our agreements:
                </label>
                <textarea
                  className="w-full p-3 border rounded-md font-roboto"
                  rows="3"
                  placeholder="What specific agreements did you make?"
                  value={notes.agreements}
                  onChange={(e) => handleNotesChange('agreements', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 font-roboto">
                  Next steps:
                </label>
                <textarea
                  className="w-full p-3 border rounded-md font-roboto"
                  rows="3"
                  placeholder="What will you each do differently this week?"
                  value={notes.nextSteps}
                  onChange={(e) => handleNotesChange('nextSteps', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Complete Button */}
          <div className="flex justify-end">
            <button
              onClick={handleComplete}
              disabled={saving}
              className={`px-4 py-2 rounded font-roboto ${
                saving 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {saving ? 'Saving...' : 'Complete Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipMeetingScreen;