// src/components/meeting/AllieChatMeeting.jsx
import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import FamilyBalanceChart from './FamilyBalanceChart';
import { Message, MessageSquare, Save, Download } from 'lucide-react';

const AllieChatMeeting = ({ onClose }) => {
  const { 
    currentWeek, 
    saveFamilyMeetingNotes, 
    familyMembers, 
    surveyResponses,
    completedWeeks,
    completeWeek,
    familyId,
    weekHistory,
    taskRecommendations
  } = useFamily();
  
  // State for the meeting
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [currentStage, setCurrentStage] = useState('intro');
  const [meetingNotes, setMeetingNotes] = useState({
    wentWell: '',
    couldImprove: '',
    actionItems: '',
    nextWeekGoals: '',
    additionalNotes: '',
    kidsInput: '',
    balanceReflection: ''
  });
  const [loading, setLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Stages of the meeting
  const stages = [
    'intro',
    'wentWell',
    'couldImprove',
    'actionItems',
    'kidsCorner',
    'nextWeekGoals',
    'summary'
  ];
  
  // Initialize the chat with a welcome message
  useEffect(() => {
    initializeChat();
  }, []);
  
  // Initialize the chat with Allie's welcome
  const initializeChat = () => {
    const welcomeMessage = {
      sender: 'allie',
      content: `Welcome to your Week ${currentWeek} Family Meeting! I'm Allie, and I'll guide you through this meeting to help your family celebrate wins, address challenges, and plan improvements for better balance in the upcoming week.`,
      timestamp: new Date()
    };
    
    // Add chart component to the initial message
    const chartMessage = {
      sender: 'allie',
      content: 'Here\'s a visualization of your family balance journey so far:',
      component: <FamilyBalanceChart weekHistory={weekHistory} completedWeeks={completedWeeks} />,
      timestamp: new Date()
    };
    
    // First prompt for what went well
    const promptMessage = {
      sender: 'allie',
      content: `Let's start with what went well this week. What are some successes your family experienced with workload sharing or task completion?`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage, chartMessage, promptMessage]);
    setCurrentStage('wentWell');
  };
  
  // Handle user input
  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };
  
  // Send a message
  const sendMessage = () => {
    if (!userInput.trim()) return;
    
    // Add user message
    const newMessage = {
      sender: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Update meeting notes based on current stage
    updateMeetingNotes(userInput);
    
    // Process the message and determine next steps
    setLoading(true);
    
    // Clear input
    setUserInput('');
    
    // Simulate Allie's response after a short delay
    setTimeout(() => {
      processStageAndRespond(newMessage.content);
      setLoading(false);
    }, 1000);
  };
  
  // Update meeting notes based on current stage
  const updateMeetingNotes = (input) => {
    setMeetingNotes(prev => {
      // If this stage already has content, append the new input
      if (prev[currentStage]) {
        return {
          ...prev,
          [currentStage]: `${prev[currentStage]}\n${input}`
        };
      }
      
      // Otherwise, set the input as the content
      return {
        ...prev,
        [currentStage]: input
      };
    });
  };
  
  // Process the current stage and respond appropriately
  const processStageAndRespond = (userMessage) => {
    let response;
    let nextStage = currentStage;
    
    // Based on current stage, generate a response and determine next stage
    switch (currentStage) {
      case 'wentWell':
        response = `Thank you for sharing what went well! It's important to celebrate these wins.\n\nNow, let's talk about what could improve. What challenges did your family face with workload sharing this week?`;
        nextStage = 'couldImprove';
        break;
        
      case 'couldImprove':
        response = `I appreciate your honesty about the challenges. Identifying areas for improvement is the first step to making positive changes.\n\nLet's move on to action items. What specific changes would your family like to commit to for next week?`;
        nextStage = 'actionItems';
        break;
        
      case 'actionItems':
        response = `Those are great action items! I'll make sure to save these for your next week's plan.\n\nNow let's hear from the kids. What did the children observe about family responsibilities this week?`;
        nextStage = 'kidsCorner';
        break;
        
      case 'kidsCorner':
        response = `Thank you for including the kids' perspectives! This helps everyone feel valued and heard.\n\nFinally, let's set some goals for next week. What are your family's top priorities for the coming week?`;
        nextStage = 'nextWeekGoals';
        break;
        
      case 'nextWeekGoals':
        // Generate a summary for review
        const summary = generateMeetingSummary();
        response = `Great goals! I've prepared a summary of our meeting for your review:\n\n${summary}\n\nIs there anything you'd like to add or change before we complete the meeting?`;
        nextStage = 'summary';
        break;
        
      case 'summary':
        response = `Thank you for a productive family meeting! I've saved all your notes and will use them to help track your progress.\n\nYou can now complete this week's cycle or download a summary of the meeting.`;
        nextStage = 'completed';
        break;
        
      default:
        response = `I'm not sure what stage we're at. Let's start again with what went well this week.`;
        nextStage = 'wentWell';
    }
    
    // Add Allie's response
    const newResponse = {
      sender: 'allie',
      content: response,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newResponse]);
    setCurrentStage(nextStage);
    
    // If we've completed all stages, save the meeting notes
    if (nextStage === 'completed') {
      saveFamilyMeetingNotes(currentWeek, meetingNotes);
    }
  };
  
  // Generate a meeting summary
  const generateMeetingSummary = () => {
    return `
## What Went Well
${meetingNotes.wentWell || "No notes recorded."}

## What Could Improve
${meetingNotes.couldImprove || "No notes recorded."}

## Action Items
${meetingNotes.actionItems || "No action items recorded."}

## Kids' Corner
${meetingNotes.kidsInput || "No kids' input recorded."}

## Next Week's Goals
${meetingNotes.nextWeekGoals || "No goals recorded."}
`;
  };
  
  // Handle meeting completion
  const handleCompleteMeeting = async () => {
    setIsCompleting(true);
    
    try {
      // Save final notes
      await saveFamilyMeetingNotes(currentWeek, meetingNotes);
      
      // Complete the week
      await completeWeek(currentWeek);
      
      // Add a completion message
      const completionMessage = {
        sender: 'allie',
        content: `Week ${currentWeek} has been completed successfully! You're now moving to Week ${currentWeek + 1}. The meeting notes have been saved.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, completionMessage]);
      
      // Close after a delay
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error completing meeting:", error);
      
      // Add an error message
      const errorMessage = {
        sender: 'allie',
        content: `There was an error completing the week. Please try again.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsCompleting(false);
    }
  };
  
  // Download meeting summary
  const handleDownloadSummary = () => {
    const summary = generateMeetingSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Family-Meeting-Week-${currentWeek}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold font-roboto">Week {currentWeek} Family Meeting</h2>
            <div className="flex items-center text-gray-600 text-sm">
              <MessageSquare size={16} className="mr-1" />
              <span className="font-roboto">Allie Chat Meeting</span>
            </div>
          </div>
          
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"></path>
              <path d="M6 6L18 18"></path>
            </svg>
          </button>
        </div>
        
        {/* Chat messages */}
        <div className="p-4 space-y-4 mb-16">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`p-3 rounded-lg max-w-3/4 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
                {msg.component && (
                  <div className="mt-2">
                    {msg.component}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input area */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center space-x-2">
          {currentStage === 'completed' ? (
            <div className="w-full flex space-x-2">
              <button
                onClick={handleDownloadSummary}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
              >
                <Download size={18} className="mr-2" />
                Download Summary
              </button>
              <button
                onClick={handleCompleteMeeting}
                disabled={isCompleting}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center"
              >
                {isCompleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Complete Week
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={userInput}
                onChange={handleUserInput}
                placeholder="Type your response..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
              >
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllieChatMeeting;