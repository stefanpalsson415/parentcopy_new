import React, { useState, useEffect } from 'react';
import { Heart, Clock, ChevronDown, ChevronUp, MessageCircle, Calendar, CheckCircle, Star, Smile, Sparkles, Brain, Lightbulb, AlertCircle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import AllieAIService from '../../services/AllieAIService';
import CalendarService from '../../services/CalendarService';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Confetti effect for celebration
const Celebration = () => {
  useEffect(() => {
    // Create heart confetti effect
    const createConfetti = () => {
      const colors = ['#FF6B6B', '#FFE66D', '#FF9A8B', '#FF6F91'];
      
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti heart';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.opacity = Math.random() + 0.5;
        confetti.innerHTML = '❤️';
        document.getElementById('confetti-container').appendChild(confetti);
        
        // Remove after animation completes
        setTimeout(() => {
          confetti.remove();
        }, 3000);
      }
    };
    
    // Create confetti at regular intervals
    const interval = setInterval(createConfetti, 300);
    
    // Play celebration sound (optional)
    try {
      const audio = new Audio('/sounds/celebration.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (error) {
      console.log("Audio not available:", error);
    }
    
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
          font-size: 24px;
          top: -20px;
          animation: confetti-fall 3s linear forwards;
        }
        
        @keyframes confetti-fall {
          0% {
            top: -20px;
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

const RelationshipMeetingScreen = ({ onClose }) => {
  const { 
    currentWeek, 
    familyId,
    familyMembers,
    getCoupleCheckInData,
    saveCoupleCheckInData,
    getRelationshipStrategies,
    updateRelationshipStrategy
  } = useFamily();
  
  // For terminology consistency, use cycle instead of week
  const currentCycle = currentWeek;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [meetingStep, setMeetingStep] = useState('intro'); // intro, discussion, reflection, action, completion
  const [expandedSection, setExpandedSection] = useState(null);
  const [meetingNotes, setMeetingNotes] = useState({
    strengths: '',
    challenges: '',
    actionItems: '',
    goals: '',
    strategies: []
  });
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategies, setSelectedStrategies] = useState([]);
  const [coupleData, setCoupleData] = useState(null);
  const [discussionTopics, setDiscussionTopics] = useState([]);
  const [topicResponses, setTopicResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // New state variables for AI agenda and calendar
  const [aiAgenda, setAiAgenda] = useState(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState(null);
  
  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };
  
  // Load meeting data
  useEffect(() => {
    const loadMeetingData = async () => {
      setLoading(true);
      
      try {
        // Get couple check-in data for context
        const checkInData = await getCoupleCheckInData(currentCycle);
        setCoupleData(checkInData || {});
        
        // Get relationship strategies
        const strategiesData = await getRelationshipStrategies();
        setStrategies(strategiesData || []);
        
        // Generate AI-powered discussion topics based on couple data
        const topicsData = generateDiscussionTopics(checkInData, strategiesData);
        setDiscussionTopics(topicsData);
        
        // Initialize empty responses for each topic
        const initialResponses = {};
        topicsData.forEach(topic => {
          initialResponses[topic.id] = '';
        });
        setTopicResponses(initialResponses);
        
        // Load AI agenda
        try {
          console.log("Loading AI relationship meeting agenda...");
          const meetingAgenda = await AllieAIService.generateRelationshipInsights(
            familyId,
            currentCycle,
            [],
            strategiesData || [],
            checkInData || {}
          );
          setAiAgenda(meetingAgenda);
          console.log("AI relationship agenda loaded:", meetingAgenda);
        } catch (aiError) {
          console.error("Error loading relationship meeting agenda:", aiError);
          // Non-blocking error, continue with meeting setup
        }
      } catch (error) {
        console.error("Error loading relationship meeting data:", error);
        setErrorMessage("Could not load meeting data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    loadMeetingData();
  }, [currentCycle, familyId, getCoupleCheckInData, getRelationshipStrategies]);
  
  // Add meeting to calendar
  const addMeetingToCalendar = async () => {
    try {
      setIsAddingToCalendar(true);
      setErrorMessage('');
      
      // Create a meeting date (default to weekend evening)
      const meetingDate = new Date();
      // Find next Saturday
      meetingDate.setDate(meetingDate.getDate() + (6 - meetingDate.getDay() + 7) % 7);
      meetingDate.setHours(20, 0, 0, 0); // 8 PM
      
      // Create meeting event
      const event = {
        summary: `Cycle ${currentCycle} Relationship Meeting`,
        description: 'Time to connect and strengthen your relationship with guided discussion topics.',
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(meetingDate.getTime() + 30*60000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: '3' // Red
      };
      
      // Add to calendar
      const result = await CalendarService.addEvent(event);
      
      if (result.success) {
        // Save the event details for later reference
        setCalendarEvent({
          date: meetingDate,
          id: result.id
        });
        
        alert("Relationship meeting added to your calendar!");
      } else {
        console.error("Calendar add failed:", result);
        setErrorMessage("Couldn't add to calendar. Please try again.");
      }
    } catch (error) {
      console.error("Error adding meeting to calendar:", error);
      setErrorMessage("There was an error adding the meeting to your calendar.");
    } finally {
      setIsAddingToCalendar(false);
    }
  };
  
  // Direct Firestore saving as a backup method
  const saveDirectToFirestore = async (meetingData) => {
    if (!familyId || !currentCycle) {
      throw new Error("Missing familyId or currentCycle");
    }
    
    try {
      // Document reference for the couple check-in
      const docRef = doc(db, "coupleCheckIns", `${familyId}-cycle${currentCycle}`);
      
      // Prepare the data to save
      const dataToSave = {
        familyId,
        cycleNumber: currentCycle,
        data: {
          ...coupleData,
          meeting: meetingData
        },
        completedAt: serverTimestamp()
      };
      
      // Save to Firestore
      await setDoc(docRef, dataToSave);
      
      // Also update the family document to mark this cycle's meeting as complete
      const familyDocRef = doc(db, "families", familyId);
      await updateDoc(familyDocRef, {
        [`coupleCheckIns.cycle${currentCycle}`]: {
          completed: true,
          completedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      console.log("Successfully saved meeting data directly to Firestore");
      return true;
    } catch (error) {
      console.error("Direct Firestore save error:", error);
      throw error;
    }
  };
  
  // Generate discussion topics based on couple data and strategies
  const generateDiscussionTopics = (coupleData, strategies) => {
    // Identify areas for discussion based on couple data
    const topics = [];
    
    // If we have couple check-in data, use it for personalized topics
    if (coupleData) {
      // Add topic based on satisfaction score
      if (coupleData.satisfaction) {
        const satisfactionTopic = {
          id: 'satisfaction',
          title: 'Relationship Satisfaction',
          description: `Based on your check-in, your current satisfaction level is ${coupleData.satisfaction}/5.`,
          questions: [
            'What moments brought you joy in your relationship this cycle?',
            'What would help increase your satisfaction level?',
            'What small gestures have meant the most to you?'
          ]
        };
        topics.push(satisfactionTopic);
      }
      
      // Add topic based on communication score
      if (coupleData.communication) {
        const communicationTopic = {
          id: 'communication',
          title: 'Communication Quality',
          description: `Your communication quality was rated ${coupleData.communication}/5 in your latest check-in.`,
          questions: [
            'When did you feel most heard this cycle?',
            'What communication challenges have you experienced?',
            'How can you improve the way you express needs and concerns?'
          ]
        };
        topics.push(communicationTopic);
      }
      
      // Add topic based on workload balance perception
      if (coupleData.balancePerception) {
        const balanceTopic = {
          id: 'balance',
          title: 'Workload Balance Impact',
          description: `You indicated that workload balance is affecting your relationship ${coupleData.balancePerception === 'positive' ? 'positively' : 'negatively'}.`,
          questions: [
            'How has the distribution of responsibilities affected your connection?',
            'What tasks cause the most tension when unbalanced?',
            'What balance improvements had the most positive effect?'
          ]
        };
        topics.push(balanceTopic);
      }
    }
    
    // Add topics based on relationship strategies
    if (strategies && strategies.length > 0) {
      // Find least implemented strategies
      const lowImplementationStrategies = strategies
        .filter(s => s.implementation < 50)
        .sort((a, b) => a.implementation - b.implementation)
        .slice(0, 2);
      
      if (lowImplementationStrategies.length > 0) {
        const strategiesTopic = {
          id: 'strategies',
          title: 'Relationship Strategy Implementation',
          description: `You have opportunities to strengthen your relationship through key strategies.`,
          questions: lowImplementationStrategies.map(s => 
            `How can you incorporate "${s.name}" into your routine (currently at ${s.implementation}% implementation)?`
          ),
          highlightedStrategies: lowImplementationStrategies.map(s => s.id)
        };
        topics.push(strategiesTopic);
      }
    }
    
    // If we don't have enough personalized topics, add general ones
    if (topics.length < 3) {
      topics.push({
        id: 'general-connection',
        title: 'Emotional Connection',
        description: 'Discussing your emotional connection can strengthen your bond.',
        questions: [
          'What makes you feel most connected to your partner?',
          'When do you feel most supported in your relationship?',
          'What activities would you like to do together more often?'
        ]
      });
      
      topics.push({
        id: 'appreciation',
        title: 'Appreciation & Recognition',
        description: 'Expressing gratitude strengthens relationships.',
        questions: [
          'What specific actions has your partner done that you appreciate?',
          'How do you prefer to receive recognition and appreciation?',
          'What efforts do you feel may be going unnoticed?'
        ]
      });
    }
    
    return topics;
  };
  
  // Render AI agenda for the discussion step
  const renderAIAgenda = () => {
    if (!aiAgenda) return null;
    
    return (
      <div className="mb-6 bg-white rounded-lg p-4 border border-pink-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium font-roboto">AI-Generated Discussion Guide</h3>
          <button
            onClick={addMeetingToCalendar}
            disabled={isAddingToCalendar}
            className="flex items-center text-xs px-3 py-1 bg-black text-white rounded font-roboto"
          >
            {isAddingToCalendar ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                Adding...
              </>
            ) : (
              <>
                <Calendar size={12} className="mr-1" />
                Schedule
              </>
            )}
          </button>
        </div>
        
        {aiAgenda.map((insight, index) => (
          <div key={index} className={`mb-4 p-3 rounded-lg border ${
            insight.category === 'connection' ? 'bg-pink-50 border-pink-200' :
            insight.category === 'workload' ? 'bg-blue-50 border-blue-200' :
            insight.category === 'gratitude' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <h4 className="font-medium text-sm mb-1 font-roboto">{insight.title}</h4>
            <p className="text-xs text-gray-600 mb-2 font-roboto">{insight.description}</p>
            
            {insight.actionable && (
              <div className="mt-2 p-2 bg-white rounded text-xs">
                <p className="font-medium font-roboto flex items-center">
                  <Lightbulb size={14} className="mr-2 text-yellow-600" />
                  Try this: {insight.actionable}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Handle topic response changes
  const handleTopicResponseChange = (topicId, value) => {
    setTopicResponses(prev => ({
      ...prev,
      [topicId]: value
    }));
  };
  
  // Handle strategy selection
  const toggleStrategySelection = (strategyId) => {
    setSelectedStrategies(prev => {
      if (prev.includes(strategyId)) {
        return prev.filter(id => id !== strategyId);
      } else {
        return [...prev, strategyId];
      }
    });
  };
  
  // Handle input changes for meeting notes
  const handleNoteChange = (field, value) => {
    setMeetingNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle meeting completion
  const handleCompleteMeeting = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Prepare meeting data
      const meetingData = {
        completedAt: new Date().toISOString(),
        notes: meetingNotes,
        topicResponses,
        selectedStrategies,
        calendarEvent
      };
      
      console.log("Attempting to save meeting data for cycle:", currentCycle);
      console.log("Meeting data:", meetingData);
      
      // Try the primary save method first
      try {
        await saveCoupleCheckInData(familyId, currentCycle, {
          ...coupleData, // Preserve existing check-in data
          meeting: meetingData // Add meeting data
        });
        
        console.log("Successfully saved meeting data via saveCoupleCheckInData");
      } catch (primaryError) {
        console.error("Primary save method failed:", primaryError);
        console.log("Attempting direct Firestore save as fallback...");
        
        // Fallback to direct Firestore save
        await saveDirectToFirestore(meetingData);
      }
      
      // Update strategy implementation levels
      const strategyUpdatePromises = selectedStrategies.map(strategyId => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (strategy) {
          // Increase implementation by 10% (up to 100%)
          const newImplementation = Math.min(100, (strategy.implementation || 0) + 10);
          return updateRelationshipStrategy(strategyId, {
            implementation: newImplementation,
            lastActivity: new Date().toISOString()
          });
        }
        return Promise.resolve(); // No-op for strategies not found
      });
      
      // Wait for all strategy updates to complete
      await Promise.all(strategyUpdatePromises);
      console.log("Successfully updated strategy implementation levels");
      
      // Record meeting completion in calendar if not already added
      if (!calendarEvent) {
        try {
          // Create a calendar event for the completed meeting
          const meetingCompletedEvent = {
            summary: `Completed Cycle ${currentCycle} Relationship Meeting`,
            description: 'Completed a relationship meeting with discussion and planning.',
            start: {
              dateTime: new Date().toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(new Date().getTime() + 30*60000).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            colorId: '10' // Green for completed
          };
          
          await CalendarService.addEvent(meetingCompletedEvent);
          console.log("Added completion event to calendar");
        } catch (calendarError) {
          console.error("Failed to add calendar entry, but meeting was saved:", calendarError);
          // Non-blocking error, continue with completion
        }
      }
      
      // Show celebration
      setShowCelebration(true);
      
      // Move to completion step
      setMeetingStep('completion');
    } catch (error) {
      console.error("Error completing relationship meeting:", error);
      setErrorMessage(
        "There was an error saving your meeting data. Please try again. " +
        "Error details: " + (error.message || "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate parent names
  const getParentNames = () => {
    const parents = familyMembers.filter(m => m.role === 'parent');
    if (parents.length >= 2) {
      return [parents[0].name, parents[1].name];
    }
    return ['Partner 1', 'Partner 2'];
  };
  
  const [parent1, parent2] = getParentNames();
  
  // If still loading, show a loading indicator
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-xl w-full">
          <div className="p-6 text-center">
            <div className="w-16 h-16 border-4 border-t-transparent border-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-roboto">Preparing your relationship meeting...</p>
            <p className="text-sm text-gray-500 font-roboto mt-2">
              We're generating personalized discussion topics
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-roboto">Cycle {currentCycle} Relationship Meeting</h2>
            <div className="flex items-center text-gray-600 text-sm font-roboto">
              <Clock size={16} className="mr-1" />
              <span>15-20 minutes</span>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Error message if present */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="font-roboto">{errorMessage}</span>
          </div>
        )}
        
        {/* Meeting content - Introduction step */}
        {meetingStep === 'intro' && (
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-pink-50 to-blue-50 p-6 rounded-lg border border-pink-100">
              <div className="flex items-start">
                <Heart size={24} className="text-pink-500 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-medium mb-2 font-roboto">Welcome to Your Relationship Meeting</h3>
                  <p className="text-sm mb-4 font-roboto">
                    This 15-20 minute conversation will help you strengthen your relationship while improving family workload balance.
                    Research shows that couples who have regular structured conversations experience:
                  </p>
                  <ul className="space-y-2 text-sm font-roboto">
                    <li className="flex items-center">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      Stronger emotional connection
                    </li>
                    <li className="flex items-center">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      Better conflict resolution skills
                    </li>
                    <li className="flex items-center">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      Improved parenting coordination
                    </li>
                    <li className="flex items-center">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      Higher overall relationship satisfaction
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 font-roboto">How This Meeting Works</h3>
              <ol className="space-y-3 text-sm font-roboto">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0">1</div>
                  <div>
                    <span className="font-medium">Guided Discussion (10 min)</span>
                    <p className="text-gray-600">
                      We've created personalized discussion topics based on your check-in data.
                      Take turns sharing your thoughts on each topic.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0">2</div>
                  <div>
                    <span className="font-medium">Reflection & Planning (5 min)</span>
                    <p className="text-gray-600">
                      Identify key relationship strengths and challenges.
                      Select specific strategies to implement this cycle.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0">3</div>
                  <div>
                    <span className="font-medium">Commitment (3 min)</span>
                    <p className="text-gray-600">
                      Document specific actions you'll take to strengthen your relationship
                      and balance family workload.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border font-roboto">
              <h3 className="font-medium mb-2">Tips for a Productive Conversation</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <MessageCircle size={16} className="text-gray-600 mr-2 mt-0.5" />
                  Listen actively without interrupting when your partner is speaking
                </li>
                <li className="flex items-start">
                  <MessageCircle size={16} className="text-gray-600 mr-2 mt-0.5" />
                  Use "I" statements to express your feelings ("I feel..." rather than "You always...")
                </li>
                <li className="flex items-start">
                  <MessageCircle size={16} className="text-gray-600 mr-2 mt-0.5" />
                  Focus on solutions rather than dwelling on problems
                </li>
                <li className="flex items-start">
                <MessageCircle size={16} className="text-gray-600 mr-2 mt-0.5" />
                Express appreciation for your partner's perspective
                </li>
              </ul>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setMeetingStep('discussion')}
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-800"
              >
                Start Discussion
              </button>
            </div>
          </div>
        )}
        
        {/* Meeting content - Discussion step */}
        {meetingStep === 'discussion' && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-4 font-roboto">
              <h3 className="font-medium mb-2">Guided Discussion</h3>
              <p className="text-sm">
                Spend about 10 minutes discussing these topics together. Take turns sharing your perspectives and 
                listening to your partner. Capture key insights in the text areas below.
              </p>
            </div>
            
            {/* AI Agenda Section */}
            {renderAIAgenda()}
            
            {/* Discussion topics */}
            {discussionTopics.map(topic => (
              <div key={topic.id} className="border rounded-lg overflow-hidden">
                <div 
                  className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${
                    expandedSection === topic.id ? 'border-b' : ''
                  }`}
                  onClick={() => toggleSection(topic.id)}
                >
                  <h3 className="font-medium font-roboto">{topic.title}</h3>
                  {expandedSection === topic.id ? (
                    <ChevronUp size={20} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500" />
                  )}
                </div>
                
                {expandedSection === topic.id && (
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm mb-3 font-roboto">{topic.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 font-roboto">Discussion Questions:</h4>
                      <ul className="space-y-2 list-disc pl-5">
                        {topic.questions.map((question, index) => (
                          <li key={index} className="text-sm font-roboto">{question}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2 font-roboto">Capture Your Insights:</h4>
                      <textarea
                        className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-roboto"
                        rows="4"
                        placeholder="Write your thoughts on this topic here..."
                        value={topicResponses[topic.id] || ''}
                        onChange={(e) => handleTopicResponseChange(topic.id, e.target.value)}
                      ></textarea>
                    </div>
                    
                    {/* Strategy highlight if applicable */}
                    {topic.highlightedStrategies && topic.highlightedStrategies.length > 0 && (
                      <div className="mt-4 bg-white p-3 rounded-lg border">
                        <h4 className="text-sm font-medium mb-2 font-roboto">Related Strategies:</h4>
                        <div className="space-y-2">
                          {topic.highlightedStrategies.map(strategyId => {
                            const strategy = strategies.find(s => s.id === strategyId);
                            return strategy ? (
                              <div key={strategyId} className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                                  <Heart size={12} />
                                </div>
                                <div className="text-sm font-roboto">
                                  <span className="font-medium">{strategy.name}</span>
                                  <span className="text-gray-500"> ({strategy.implementation || 0}% implemented)</span>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-between">
              <button 
                onClick={() => setMeetingStep('intro')}
                className="px-4 py-2 border border-black text-black rounded font-roboto hover:bg-gray-50"
              >
                Back
              </button>
              <button 
                onClick={() => setMeetingStep('reflection')}
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-800"
              >
                Continue to Reflection
              </button>
            </div>
          </div>
        )}
        
        {/* Meeting content - Reflection step */}
        {meetingStep === 'reflection' && (
          <div className="p-6 space-y-6">
            <div className="bg-green-50 p-4 rounded-lg mb-4 font-roboto">
              <h3 className="font-medium mb-2">Reflection & Planning</h3>
              <p className="text-sm">
                Reflect on your discussion and identify key relationship strengths and challenges.
                This will help you focus your efforts in the coming cycle.
              </p>
            </div>
            
            {/* Relationship strengths */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">Relationship Strengths</h3>
              <p className="text-sm mb-3 font-roboto">What's working well in your relationship?</p>
              <textarea
                className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-roboto"
                rows="3"
                placeholder="What are your relationship's greatest strengths?"
                value={meetingNotes.strengths}
                onChange={(e) => handleNoteChange('strengths', e.target.value)}
              ></textarea>
            </div>
            
            {/* Relationship challenges */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">Relationship Challenges</h3>
              <p className="text-sm mb-3 font-roboto">What could be improved in your relationship?</p>
              <textarea
                className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-roboto"
                rows="3"
                placeholder="What challenges are you currently facing?"
                value={meetingNotes.challenges}
                onChange={(e) => handleNoteChange('challenges', e.target.value)}
              ></textarea>
            </div>
            
            {/* Strategy selection */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3 font-roboto">Select Strategies to Focus On</h3>
              <p className="text-sm mb-3 font-roboto">Choose 1-3 strategies to implement this cycle:</p>
              
              <div className="space-y-2">
                {strategies.map(strategy => (
                  <div 
                    key={strategy.id} 
                    className={`p-3 border rounded-lg cursor-pointer ${
                      selectedStrategies.includes(strategy.id) ? 'bg-pink-50 border-pink-300' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => toggleStrategySelection(strategy.id)}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
                        selectedStrategies.includes(strategy.id) 
                          ? 'bg-pink-500 border-pink-500 text-white' 
                          : 'border-gray-300'
                      }`}>
                        {selectedStrategies.includes(strategy.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm font-roboto">{strategy.name}</h4>
                        <div className="flex items-center mt-1">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div 
                              className="h-full bg-pink-500" 
                              style={{ width: `${strategy.implementation || 0}%` }} 
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-roboto">{strategy.implementation || 0}% implemented</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => setMeetingStep('discussion')}
                className="px-4 py-2 border border-black text-black rounded font-roboto hover:bg-gray-50"
              >
                Back
              </button>
              <button 
                onClick={() => setMeetingStep('action')}
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-800"
              >
                Continue to Action Plan
              </button>
            </div>
          </div>
        )}
        
        {/* Meeting content - Action step */}
        {meetingStep === 'action' && (
          <div className="p-6 space-y-6">
            <div className="bg-purple-50 p-4 rounded-lg mb-4 font-roboto">
              <h3 className="font-medium mb-2">Commitment & Action Plan</h3>
              <p className="text-sm">
                Document specific actions you'll take to strengthen your relationship
                and balance family workload in the coming cycle.
              </p>
            </div>
            
            {/* Specific action items */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">Action Items</h3>
              <p className="text-sm mb-3 font-roboto">What specific actions will you both take this cycle?</p>
              <textarea
                className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-roboto"
                rows="4"
                placeholder="List specific, achievable actions you'll take this cycle..."
                value={meetingNotes.actionItems}
                onChange={(e) => handleNoteChange('actionItems', e.target.value)}
              ></textarea>
            </div>
            
            {/* Relationship goals */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">Relationship Goals</h3>
              <p className="text-sm mb-3 font-roboto">What relationship goals would you like to focus on?</p>
              <textarea
                className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-roboto"
                rows="3"
                placeholder="What goals will strengthen your relationship?"
                value={meetingNotes.goals}
                onChange={(e) => handleNoteChange('goals', e.target.value)}
              ></textarea>
            </div>
            
            {/* Schedule next meeting */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 font-roboto">Schedule Next Meeting</h3>
              <p className="text-sm mb-3 font-roboto">When will you have your next relationship conversation?</p>
              <div className="flex items-center">
                <Calendar size={20} className="text-gray-500 mr-2" />
                <input
                  type="date"
                  className="border rounded-md p-2 font-roboto"
                  defaultValue={(() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7); // Default to one week from now
                    return date.toISOString().split('T')[0];
                  })()}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => setMeetingStep('reflection')}
                className="px-4 py-2 border border-black text-black rounded font-roboto hover:bg-gray-50"
              >
                Back
              </button>
              <button 
                onClick={handleCompleteMeeting}
                disabled={isSubmitting}
                className="px-4 py-2 bg-black text-white rounded font-roboto hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Complete Meeting'
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Meeting content - Completion step */}
        {meetingStep === 'completion' && (
          <div className="p-6 space-y-6 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Heart size={32} className="text-pink-500" />
            </div>
            
            <h3 className="text-xl font-bold mb-2 font-roboto">Relationship Meeting Complete!</h3>
            <p className="text-gray-600 mb-6 font-roboto">
              You've taken an important step toward strengthening your relationship and improving family balance.
            </p>
            
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-100 text-left mb-6">
              <h3 className="font-medium mb-2 font-roboto">Your Relationship Action Plan</h3>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium font-roboto">Selected Strategies:</h4>
                <ul className="mt-2 space-y-1">
                  {selectedStrategies.map(strategyId => {
                    const strategy = strategies.find(s => s.id === strategyId);
                    return strategy ? (
                      <li key={strategyId} className="flex items-center text-sm font-roboto">
                        <CheckCircle size={16} className="text-pink-500 mr-2" />
                        {strategy.name}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              
              {meetingNotes.actionItems && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium font-roboto">Action Items:</h4>
                  <p className="text-sm mt-1 font-roboto">{meetingNotes.actionItems}</p>
                </div>
              )}
              
              {meetingNotes.goals && (
                <div>
                  <h4 className="text-sm font-medium font-roboto">Relationship Goals:</h4>
                  <p className="text-sm mt-1 font-roboto">{meetingNotes.goals}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-black text-white rounded-md font-roboto hover:bg-gray-800 flex items-center"
              >
                <Star size={16} className="mr-2" />
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
        
        {/* Celebration animation */}
        {showCelebration && <Celebration />}
      </div>
    </div>
  );
};

export default RelationshipMeetingScreen;