import React, { useState, useEffect } from 'react';
import { 
  Clock, Download, X, ChevronDown, ChevronUp, Sparkles, Star, 
  Users, RefreshCw, User, Calendar, CheckCircle, Trash2, Edit 
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';
import AllieAIService from '../../services/AllieAIService';
import CalendarService from '../../services/CalendarService';

// Confetti effect component for celebration
const Fireworks = () => {
  useEffect(() => {
    // Create confetti effect
    const createConfetti = () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      
      for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.opacity = Math.random() + 0.5;
        document.getElementById('confetti-container').appendChild(confetti);
        
        // Remove after animation completes
        setTimeout(() => {
          confetti.remove();
        }, 3000);
      }
    };
    
    // Create confetti at regular intervals
    const interval = setInterval(createConfetti, 300);
    
    // Play celebration sound
    const audio = new Audio('/sounds/celebration.mp3');
    audio.volume = 0.6;
    audio.play().catch(e => console.log("Audio play failed:", e));
    
    // Cleanup
    return () => {
      clearInterval(interval);
      const container = document.getElementById('confetti-container');
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, []);
  
  return (
    <div 
      id="confetti-container" 
      className="fixed inset-0 pointer-events-none z-50"
      style={{ perspective: '700px' }}
    >
      <style jsx="true">{`
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
        }
        
        @keyframes confetti-fall {
          0% {
            top: -10px;
            transform: translateZ(0) rotate(0deg);
          }
          100% {
            top: 100vh;
            transform: translateZ(400px) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

const FamilyMeetingScreen = ({ onClose }) => {
  const { 
    currentWeek, 
    saveFamilyMeetingNotes, 
    familyMembers, 
    surveyResponses,
    completeWeek,
    familyId
  } = useFamily();
  
  const { fullQuestionSet } = useSurvey();
  
  const [meetingNotes, setMeetingNotes] = useState({
    wentWell: '',
    couldImprove: '',
    actionItems: '',
    nextWeekGoals: '',
    additionalNotes: ''
  });
  const [expandedSection, setExpandedSection] = useState('wentWell'); // Default expanded section
  const [viewMode, setViewMode] = useState('agenda'); // 'agenda' or 'report'
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // New state for suggested items
  const [suggestedActionItems, setSuggestedActionItems] = useState([]);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [selectedActionItems, setSelectedActionItems] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [agenda, setAgenda] = useState(null);
  
  // Generate agenda topics based on family data
  const generateAgendaTopics = () => {
    // Analyze survey data to find insights (in a real app, this would be more sophisticated)
    const insights = analyzeData();
    
    return [
      {
        id: 'wentWell',
        title: '1. What Went Well',
        duration: '10 min',
        description: 'Celebrate your family\'s wins this week',
        guideQuestions: [
          'What tasks did each parent successfully complete?',
          'What worked well in terms of sharing responsibilities?',
          'When did you feel most balanced as a family this week?'
        ],
        insights: insights.successInsights
      },
      {
        id: 'couldImprove',
        title: '2. What Could Improve',
        duration: '10 min',
        description: 'Identify opportunities for better balance',
        guideQuestions: [
          'What challenges did you face with task completion?',
          'Where did the workload feel unbalanced?',
          'What obstacles prevented better sharing of responsibilities?'
        ],
        insights: insights.challengeInsights
      },
      {
        id: 'actionItems',
        title: '3. Action Items for Next Week',
        duration: '10 min',
        description: 'Commit to specific improvements',
        guideQuestions: [
          'What specific tasks will each parent take ownership of?',
          'How will you address the challenges identified earlier?',
          'What support does each family member need next week?'
        ],
        insights: insights.actionInsights
      }
    ];
  };
  
  // Analyze family data to generate insights
  const analyzeData = () => {
    // In a real app, this would analyze actual survey responses to find patterns
    return {
      successInsights: [
        "Papa completed 2 of 3 assigned tasks this week",
        "Mama successfully took on more meal planning",
        "The family had more balanced evenings together"
      ],
      challengeInsights: [
        "School-related communication is still 80% handled by Mama",
        "Morning routines remain unbalanced",
        "Unexpected work demands made task completion difficult"
      ],
      actionInsights: [
        "Focus on evening routine sharing",
        "Papa can take lead on school communications next week",
        "Set up family calendar to better coordinate schedules"
      ]
    };
  };
  
  // Generate suggested action items based on family data
  const generateSuggestedItems = () => {
    // This would use actual data in a real app
    return {
      actionItems: [
        "Papa to take over all school communications for the week",
        "Mama to teach Papa how to handle doctor appointments",
        "Create a shared digital calendar for all family activities",
        "Implement a 15-minute daily cleanup where everyone participates",
        "Set up a meal planning session with both parents involved"
      ],
      goals: [
        "Reduce Mama's mental load from 75% to 60% this week",
        "Make sure both parents attend at least one school function",
        "Complete morning routines without reminders from Mama",
        "Create a rotating schedule for managing household finances",
        "Have Papa handle emotional support for at least one child crisis"
      ]
    };
  };
  
  // Initialize suggested items
  useEffect(() => {
    const suggestions = generateSuggestedItems();
    setSuggestedActionItems(suggestions.actionItems);
    setSuggestedGoals(suggestions.goals);
  }, []);
  
  // Add this useEffect hook after your existing useEffect hooks
  useEffect(() => {
    const loadAgenda = async () => {
      if (!familyId || !currentWeek) return;
      
      try {
        console.log("Loading AI meeting agenda...");
        const meetingAgenda = await AllieAIService.generateFamilyMeetingAgenda(
          familyId,
          currentWeek
        );
        setAgenda(meetingAgenda);
        console.log("AI agenda loaded:", meetingAgenda);
      } catch (error) {
        console.error("Error loading meeting agenda:", error);
      }
    };
    
    loadAgenda();
  }, [familyId, currentWeek]);

  // Replace the addMeetingToCalendar function in FamilyMeetingScreen.jsx:
const addMeetingToCalendar = async () => {
  try {
    setIsAddingToCalendar(true);
    
    // Create a meeting date (default to next day)
    const meetingDate = new Date();
    meetingDate.setDate(meetingDate.getDate() + 1);
    meetingDate.setHours(19, 0, 0, 0); // 7 PM
    
    // Use EventContext to add event
    const { useEvents } = await import('../../contexts/EventContext');
    const { addEvent } = useEvents();
    
    // Add to calendar through context
    const result = await addEvent({
      title: `Family Meeting - Cycle ${currentWeek}`,
      summary: `Family Meeting - Cycle ${currentWeek}`,
      description: 'Weekly family meeting to discuss task balance and set goals for the coming week.',
      start: {
        dateTime: meetingDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(meetingDate.getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      category: 'meeting',
      eventType: 'meeting',
      linkedEntity: {
        type: 'meeting',
        id: currentWeek
      },
      // Add all family members as attendees
      attendees: familyMembers.map(member => ({
        id: member.id,
        name: member.name,
        profilePicture: member.profilePicture,
        role: member.role
      })),
      attendingParentId: 'both',
      universalId: `family-meeting-${familyId}-${currentWeek}`
    });
    
    if (result.success) {
      alert("Family meeting added to your calendar!");
    } else {
      alert("Couldn't add to calendar. Please try again.");
    }
  } catch (error) {
    console.error("Error adding meeting to calendar:", error);
    alert("There was an error adding the meeting to your calendar.");
  } finally {
    setIsAddingToCalendar(false);
  }
};

  // Generate weekly report data
  const generateWeeklyReport = () => {
    // This would use actual data in a real app
    return {
      balanceScore: {
        mama: 65,
        papa: 35
      },
      tasks: {
        mama: {
          completed: 1,
          total: 2,
          items: [
            { title: "Manage Home Repairs", status: 'completed' },
            { title: "Plan Family Activities", status: 'incomplete' }
          ]
        },
        papa: {
          completed: 2,
          total: 3,
          items: [
            { title: "Meal Planning", status: 'completed' },
            { title: "Childcare Coordination", status: 'completed' },
            { title: "Family Calendar Management", status: 'incomplete' }
          ]
        }
      },
      surveyHighlights: [
        "Papa has taken over meal planning for the week",
        "Visible household tasks are becoming more balanced",
        "Children report improvement in Papa's involvement with homework"
      ],
      discrepancies: [
        "Parents disagree on who handled doctor appointments this week",
        "Children perceive Mama is still managing most invisible tasks",
        "There's disagreement about who should coordinate school activities"
      ]
    };
  };
  
  // Get agenda topics
  const agendaTopics = generateAgendaTopics();
  
  // Get weekly report data
  const weeklyReport = generateWeeklyReport();
  
  // Handle input changes
  const handleInputChange = (section, value) => {
    setMeetingNotes({
      ...meetingNotes,
      [section]: value
    });
  };
  
  // Toggle section expansion
  const toggleSection = (sectionId) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
    }
  };
  
  // Helper function to analyze weekly trends in survey data
  const analyzeWeeklyTrends = () => {
    // In a real implementation, this would analyze actual survey data
    return {
      mostImprovedArea: "Visible Household Tasks",
      leastImprovedArea: "Invisible Parental Tasks",
      biggestImbalance: 25,
      overallTrend: "improving"
    };
  };

  // Helper function to analyze task completion patterns
  const analyzeTaskCompletionPatterns = () => {
    // In a real implementation, this would analyze actual task data
    return {
      completionRate: 68,
      bestCompleter: "Papa",
      incompleteReason: "Lack of time",
      recommendedTaskType: "Visible Household"
    };
  };

  // Add this function to generate better meeting agenda topics
  const generateEnhancedAgendaTopics = () => {
    // Get survey data trends
    const trends = analyzeWeeklyTrends();
    
    // Get task completion analysis
    const taskAnalysis = analyzeTaskCompletionPatterns();
    
    return [
      {
        id: 'wentWell',
        title: '1. Celebrate Progress',
        duration: '10 min',
        description: "Acknowledge improvements and wins from this week",
        guideQuestions: [
          'Which tasks did each person successfully complete?',
          `In which area have we improved the most? (${trends.mostImprovedArea})`,
          'What new balance strategies worked well this week?'
        ],
        insights: [
          `Your family improved most in ${trends.mostImprovedArea} this week`,
          `${taskAnalysis.bestCompleter} completed the most tasks this week!`,
          `You've maintained a ${taskAnalysis.completionRate}% task completion rate`
        ]
      },
      {
        id: 'couldImprove',
        title: '2. Address Challenges',
        duration: '10 min',
        description: "Identify what's still not working well",
        guideQuestions: [
          `Why does ${trends.leastImprovedArea} remain challenging?`,
          'What obstacles prevented task completion this week?',
          'Which responsibilities still feel unbalanced?'
        ],
        insights: [
          `${trends.leastImprovedArea} still shows a ${trends.biggestImbalance}% imbalance`,
          `${taskAnalysis.incompleteReason} was the most common reason tasks weren't completed`,
          'Tasks in the morning routines category had the lowest completion rate'
        ]
      },
      {
        id: 'actionItems',
        title: "3. Next Week's Plan",
        duration: '10 min',
        description: "Create specific actions for next week based on data",
        guideQuestions: [
          `How can we better balance ${trends.leastImprovedArea}?`,
          'Which new tasks would have the biggest impact?',
          'What support does each family member need next week?'
        ],
        insights: [
          `Based on your patterns, ${taskAnalysis.recommendedTaskType} tasks are most effective for your family`,
          'Morning routines need special attention next week',
          'Consider redistributing the emotional support tasks which are currently 70% handled by Mama'
        ]
      }
    ];
  };
  
  // Handle meeting completion
  const handleCompleteMeeting = async () => {
    setIsSaving(true);
    
    try {
      // Combine selected and custom action items and goals
      const combinedNotes = {
        ...meetingNotes,
        actionItems: selectedActionItems.join('\n') + 
          (meetingNotes.actionItems ? '\n' + meetingNotes.actionItems : ''),
        nextWeekGoals: selectedGoals.join('\n') + 
          (meetingNotes.nextWeekGoals ? '\n' + meetingNotes.nextWeekGoals : '')
      };
      
      // Save meeting notes to database
      await saveFamilyMeetingNotes(currentWeek, combinedNotes);
      
      // Show confirmation dialog
      setShowConfirmation(true);
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving meeting notes:", error);
      alert("There was an error saving your meeting notes. Please try again.");
      setIsSaving(false);
    }
  };
  
  const handleCompleteWeekTogether = async () => {
    setIsCompleting(true);
    
    try {
      console.log(`Starting to complete Week ${currentWeek}`);
      
      // Complete the week - this should:
      // 1. Mark the week as completed
      // 2. Create a historical record
      // 3. Advance to the next week
      const result = await completeWeek(currentWeek);
      
      console.log(`Week ${currentWeek} completed successfully:`, result);
      console.log(`Moving to Week ${currentWeek + 1}`);
      
      // Show celebration animation
      setShowCelebration(true);
      
      // Close dialog after celebration (5 seconds)
      setTimeout(() => {
        console.log("Closing meeting dialog after completion");
        onClose();
      }, 5000);
    } catch (error) {
      console.error("Error completing week:", error);
      alert("There was an error completing the week. Please try again.");
      setIsCompleting(false);
    }
  };
  
  // Handle downloadable report
  const handleDownloadReport = () => {
    // In a real app, this would generate a PDF or similar document
    console.log('Downloading report...');
    // For now, we'll just fake it with an alert
    alert('Report downloaded successfully!');
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-roboto">Week {currentWeek} Family Meeting</h2>
            <div className="flex items-center text-gray-600 text-sm">
              <Clock size={16} className="mr-1" />
              <span className="font-roboto">30 minutes</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className={`px-3 py-1 rounded-md text-sm font-medium font-roboto ${
                viewMode === 'agenda' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setViewMode('agenda')}
            >
              Agenda
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm font-medium font-roboto ${
                viewMode === 'report' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
              onClick={() => setViewMode('report')}
            >
              Weekly Report
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {viewMode === 'agenda' ? (
          /* Agenda View */
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded mb-4">
              <h3 className="font-medium text-blue-800 font-roboto">Meeting Purpose</h3>
              <p className="text-sm mt-1 font-roboto">
                This family meeting helps you discuss your progress in balancing family responsibilities 
                and set goals for the upcoming week. Use the discussion points below for a productive conversation.
              </p>
            </div>
            
            {/* Family Retrospective Info */}
            <div className="p-4 border rounded-lg mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h4 className="font-medium mb-3 text-blue-800 font-roboto">About Sprint Retrospectives</h4>
              <p className="text-sm text-blue-700 mb-2 font-roboto">
                We're using a format that professional teams use to improve how they work together! This simple 
                structure helps families reflect on what's working and what needs improvement.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-roboto">✓ What Went Well</span>
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-roboto">⚠ What Could Improve</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-roboto">→ Action Items</span>
              </div>
            </div>
            
            {/* Retrospective Sections */}
            <div className="space-y-6">
              {/* What Went Well Section */}
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium mb-2 flex items-center text-green-800 font-roboto">
                  <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2 text-green-600">✓</span>
                  What Went Well
                </h4>
                <p className="text-sm text-green-700 mb-3 font-roboto">
                  Celebrate your family's wins this week! What are you proud of? What balanced tasks did you accomplish?
                </p>
                <textarea
                  placeholder="Share your family's successes this week..."
                  className="w-full p-3 border border-green-200 rounded-md h-24 bg-white font-roboto"
                  value={meetingNotes.wentWell || ''}
                  onChange={(e) => handleInputChange('wentWell', e.target.value)}
                />
              </div>
              
              {/* AI-Generated Agenda */}
              {agenda && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4 font-roboto">This Week's Agenda</h3>
                  
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <p className="text-gray-700 mb-4 font-roboto">{agenda.introduction}</p>
                    
                    {agenda.timeEstimate && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <Clock className="text-gray-500 mr-2" size={18} />
                          <span className="text-gray-500 font-roboto">Suggested time: {agenda.timeEstimate}</span>
                        </div>
                      </div>
                    )}
                    
                    {agenda.sections && agenda.sections.map((section, index) => (
                      <div key={index} className="mb-6">
                        <h4 className="font-bold text-lg mb-2 font-roboto">{section.title}</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {section.items && section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="text-gray-700 font-roboto">{item}</li>
                          ))}
                        </ul>
                        {section.notes && (
                          <p className="text-sm text-gray-500 mt-2 italic font-roboto">{section.notes}</p>
                        )}
                      </div>
                    ))}
                    
                    {agenda.discussionQuestions && agenda.discussionQuestions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-2 font-roboto">Discussion Questions</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {agenda.discussionQuestions.map((question, index) => (
                            <li key={index} className="text-gray-700 font-roboto">{question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {agenda.closingThoughts && (
                      <div className="p-4 bg-gray-50 rounded border">
                        <p className="text-gray-700 font-roboto">{agenda.closingThoughts}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={addMeetingToCalendar}
                        disabled={isAddingToCalendar}
                        className="flex items-center px-4 py-2 bg-black text-white rounded font-roboto"
                      >
                        {isAddingToCalendar ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Adding to Calendar...
                          </>
                        ) : (
                          <>
                            <Calendar size={16} className="mr-2" />
                            Add to Calendar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* What Could Improve Section */}
              <div className="p-4 border rounded-lg bg-amber-50">
                <h4 className="font-medium mb-2 flex items-center text-amber-800 font-roboto">
                  <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-2 text-amber-600">⚠</span>
                  What Could Improve
                </h4>
                <p className="text-sm text-amber-700 mb-3 font-roboto">
                  What challenges did your family face? Where do you see room for better balance?
                </p>
                <textarea
                  placeholder="Discuss areas where your family could improve next week..."
                  className="w-full p-3 border border-amber-200 rounded-md h-24 bg-white font-roboto"
                  value={meetingNotes.couldImprove || ''}
                  onChange={(e) => handleInputChange('couldImprove', e.target.value)}
                />
              </div>
              
              {/* Action Items Section */}
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-2 flex items-center text-blue-800 font-roboto">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 text-blue-600">→</span>
                  Action Items
                </h4>
                <p className="text-sm text-blue-700 mb-3 font-roboto">
                  What specific changes will your family commit to next week? Who will do what?
                </p>
                
                {/* Suggested Action Items */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2 font-roboto">Suggested Action Items (Select up to 3):</h5>
                  <div className="space-y-2">
                    {suggestedActionItems.map((item, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded border cursor-pointer ${
                          selectedActionItems.includes(item) 
                            ? 'bg-blue-100 border-blue-400' 
                            : 'bg-white hover:bg-blue-50'
                        }`}
                        onClick={() => {
                          if (selectedActionItems.includes(item)) {
                            setSelectedActionItems(prev => prev.filter(i => i !== item));
                          } else if (selectedActionItems.length < 3) {
                            setSelectedActionItems(prev => [...prev, item]);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-2 ${
                            selectedActionItems.includes(item) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400'
                          }`}>
                            {selectedActionItems.includes(item) && '✓'}
                          </div>
                          <span className="text-sm font-roboto">{item}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Custom Action Items */}
                <textarea
                  placeholder="Add your own action items here..."
                  className="w-full p-3 border border-blue-200 rounded-md h-24 bg-white font-roboto"
                  value={meetingNotes.actionItems || ''}
                  onChange={(e) => handleInputChange('actionItems', e.target.value)}
                />
              </div>
              
              {/* Add this new component to the Family Meeting Screen */}
              <div className="p-4 border rounded-lg mb-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <h4 className="font-medium mb-3 text-purple-800 font-roboto">Weight-Based Insights</h4>
                <p className="text-sm text-purple-700 mb-2 font-roboto">
                  Our advanced task weight analysis has identified high-impact areas to focus on:
                </p>
                
                <div className="space-y-3 mt-4">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <h5 className="text-sm font-medium font-roboto">Highest Weighted Imbalance</h5>
                    <p className="text-xs mt-1 font-roboto">
                      Emotional Labor tasks (weighted heavily for invisibility and mental load)
                      show a 50% imbalance. Consider discussing ways to share these responsibilities.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <h5 className="text-sm font-medium font-roboto">Child Development Impact</h5>
                    <p className="text-xs mt-1 font-roboto">
                      Tasks with high visibility to children have a strong impact on future expectations.
                      Currently, these tasks have a 20% imbalance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Week Goals Section */}
              <div className="p-4 border rounded-lg bg-purple-50">
                <h4 className="font-medium mb-2 flex items-center text-purple-800 font-roboto">
                  <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-2 text-purple-600">🎯</span>
                  Next Week's Goals
                </h4>
                <p className="text-sm text-purple-700 mb-3 font-roboto">
                  What would a successful Week {currentWeek + 1} look like for your family?
                </p>
                
                {/* Suggested Goals */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2 font-roboto">Suggested Goals (Select up to 2):</h5>
                  <div className="space-y-2">
                    {suggestedGoals.map((goal, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded border cursor-pointer ${
                          selectedGoals.includes(goal) 
                            ? 'bg-purple-100 border-purple-400' 
                            : 'bg-white hover:bg-purple-50'
                        }`}
                        onClick={() => {
                          if (selectedGoals.includes(goal)) {
                            setSelectedGoals(prev => prev.filter(g => g !== goal));
                          } else if (selectedGoals.length < 2) {
                            setSelectedGoals(prev => [...prev, goal]);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-2 ${
                            selectedGoals.includes(goal) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-400'
                          }`}>
                            {selectedGoals.includes(goal) && '✓'}
                          </div>
                          <span className="text-sm font-roboto">{goal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <textarea
                  placeholder="Add your own goals here..."
                  className="w-full p-3 border border-purple-200 rounded-md h-24 bg-white font-roboto"
                  value={meetingNotes.nextWeekGoals || ''}
                  onChange={(e) => handleInputChange('nextWeekGoals', e.target.value)}
                />
              </div>
              
              {/* Additional Notes */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 font-roboto">Additional Notes</h4>
                <textarea
                  placeholder="Any other comments or observations from the family meeting..."
                  className="w-full p-3 border rounded-md h-24 font-roboto"
                  value={meetingNotes.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end pt-4 space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50 font-roboto"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteMeeting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-roboto"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Complete Meeting'}
              </button>
            </div>
          </div>
        ) : (
          /* Report View */
          <div className="p-4 space-y-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDownloadReport}
                className="flex items-center text-sm text-blue-600 font-roboto"
              >
                <Download size={16} className="mr-1" />
                Download Report
              </button>
            </div>
            
            {/* Balance Score Card */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3 font-roboto">Weekly Balance Score</h3>
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="font-medium font-roboto">Mama ({weeklyReport.balanceScore.mama}%)</span>
                  <span className="font-medium font-roboto">Papa ({weeklyReport.balanceScore.papa}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${weeklyReport.balanceScore.mama}%` }} 
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-800 font-roboto">
                This week's balance shows Mama handling {weeklyReport.balanceScore.mama}% of the family tasks.
                {weeklyReport.balanceScore.mama > 60 
                  ? " There's still room for improvement in balancing responsibilities."
                  : " Great progress on achieving a more balanced distribution!"
                }
              </p>
            </div>
            
            {/* Task Completion Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 font-roboto">Task Completion</h3>
              <div className="space-y-2">
                {Object.entries(weeklyReport.tasks).map(([parent, data]) => (
                  <div key={parent} className="flex justify-between items-center">
                    <span className="capitalize font-roboto">{parent}</span>
                    <div className="flex items-center">
                      <span className="mr-2 font-roboto">
                        {data.completed} of {data.total} tasks completed
                      </span>
                      <div className="w-32 h-2 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${(data.completed / data.total) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Survey Highlights */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 font-roboto">Survey Highlights</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm font-roboto">
                {weeklyReport.surveyHighlights.map((highlight, idx) => (
                  <li key={idx}>{highlight}</li>
                ))}
              </ul>
            </div>
            
            {/* Areas for Improvement */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 font-roboto">Areas for Discussion</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm font-roboto">
                {weeklyReport.discrepancies.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            
            {/* Action Buttons for Report View */}
            <div className="flex justify-end pt-4 space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50 font-roboto"
              >
                Close
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-roboto"
              >
                Back to Agenda
              </button>
            </div>
          </div>
        )}
        
        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-green-600" />
              </div>
              
              <h3 className="text-xl font-bold mb-2 font-roboto">Family Meeting Complete!</h3>
              <p className="text-gray-600 mb-6 font-roboto">
                Your family has completed the meeting for Week {currentWeek}. Ready to wrap up the week together?
              </p>
              
              <button
                onClick={handleCompleteWeekTogether}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md text-lg font-bold flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-all font-roboto"
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <Star className="mr-2" size={20} />
                    Complete Week Together!
                    <Users className="ml-2" size={20} />
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowConfirmation(false)}
                className="mt-4 text-gray-600 hover:text-gray-800 font-roboto"
                disabled={isCompleting}
              >
                Not yet
              </button>
            </div>
          </div>
        )}
        
        {/* Celebration Animation */}
        {showCelebration && <Fireworks />}
      </div>
    </div>
  );
};

export default FamilyMeetingScreen;