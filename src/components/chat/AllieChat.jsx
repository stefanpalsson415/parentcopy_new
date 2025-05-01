// src/components/chat/AllieChat.jsx
import React, { useState, useEffect, useRef,useCallback } from 'react';
import { MessageSquare, X, MinusSquare, Send, Info, Calendar, PlusCircle, Mic, User, ChevronUp, ChevronDown, Upload, Camera, Maximize } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import EnhancedChatService from '../../services/EnhancedChatService';
import ConsolidatedNLU from '../../services/ConsolidatedNLU';
import ChatMessage from './ChatMessage';
import CalendarPromptChip from './CalendarPromptChip';
import ChatFeedback from './ChatFeedback';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import DatabaseService from '../../services/DatabaseService';
import { useLocation } from 'react-router-dom';
import CalendarService from '../../services/CalendarService';
import EventParserService from '../../services/EventParserService';
import { EventParser } from '../calendar';
import DocumentProcessingService from '../../services/DocumentProcessingService';
import DocumentCategoryService from '../../services/DocumentCategoryService';
import DocumentOCRService from '../../services/DocumentOCRService';
import ChatPersistenceService from '../../services/ChatPersistenceService';
import UnifiedParserService from '../../services/UnifiedParserService';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import FamilyBalanceChart from '../meeting/FamilyBalanceChart';
import ClaudeService from '../../services/ClaudeService';




const AllieChat = () => {
  // Utility function to format message dates into readable groups
  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset hours to compare dates only
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (messageDay.getTime() === todayDay.getTime()) {
      return "Today";
    } else if (messageDay.getTime() === yesterdayDay.getTime()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: messageDay.getFullYear() !== todayDay.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Date header component for message groups
  const DateHeader = ({ date }) => (
    <div className="flex justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-roboto">
        {date}
      </div>
    </div>
  );
  
  const { 
    familyId, 
    selectedUser, 
    familyMembers, 
    updateMemberProfile, 
    familyName, 
    currentWeek, 
    completedWeeks,
    surveyResponses,         // Add this
    taskRecommendations,     // Add this
    weekHistory 
  } = useFamily();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [canUseChat, setCanUseChat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [chatHeight, setChatHeight] = useState(45); // Default height (in rems)
  const [chatWidth, setChatWidth] = useState(60); // Default width (in rems) for desktop
  const [promptChips, setPromptChips] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const childEventDetector = useRef(null);
  const childTrackingService = useRef(null);
  const [responseCount, setResponseCount] = useState({});
const [showSuggestions, setShowSuggestions] = useState(false);
const [readyForNextStage, setReadyForNextStage] = useState(false);


  const [isMeetingMode, setIsMeetingMode] = useState(false);
const [meetingStage, setMeetingStage] = useState('intro');
const [meetingNotes, setMeetingNotes] = useState({
  wentWell: '',
  couldImprove: '',
  actionItems: '',
  nextWeekGoals: '',
  additionalNotes: '',
  kidsInput: '',
  balanceReflection: ''
});
  
  // Enhanced state variables
  const [showInsights, setShowInsights] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [showProfileUploadHelp, setShowProfileUploadHelp] = useState(false);
  const [profileUploadTarget, setProfileUploadTarget] = useState(null);
  const [userClosedChat, setUserClosedChat] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(42); // Increased default height in px
  const [detectedEventDetails, setDetectedEventDetails] = useState(null);
  const [showEventConfirmation, setShowEventConfirmation] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Event parsing variables
  const [parsedEventDetails, setParsedEventDetails] = useState(null);
  const [showEventParser, setShowEventParser] = useState(false);
  const [eventParsingSource, setEventParsingSource] = useState(null); // 'text', 'image', or 'voice'
  
  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null); // 'width', 'height', 'both'
  const [startResizePos, setStartResizePos] = useState({ x: 0, y: 0 });
  const [startResizeDims, setStartResizeDims] = useState({ width: 0, height: 0 });
  
  // Get current location to customize Allie's behavior
  const location = useLocation();
  
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const nlu = useRef(ConsolidatedNLU); // Fixed: use the imported instance directly
  
  // Initialize userClosedChat from localStorage on component mount
  useEffect(() => {
    const userClosed = localStorage.getItem('allieChat_userClosed') === 'true';
    setUserClosedChat(userClosed);
  }, []);
  
  // Check if current user can use chat
  useEffect(() => {
    if (!selectedUser) return;
    
    if (selectedUser.role === 'child') {
      // Check if children are allowed to use chat
      const parent = familyMembers.find(m => m.role === 'parent');
      setCanUseChat(parent?.settings?.childrenCanUseChat !== false);
    } else {
      setCanUseChat(true);
    }
  }, [selectedUser, familyMembers]);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setTranscription(transcript);
        setInput(transcript);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
      
      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);
  
  // Auto-resize textarea as user types - improved version
  useEffect(() => {
    if (textareaRef.current) {
      // Store the current scroll position
      const scrollPos = textareaRef.current.scrollTop;
      
      // Reset height to auto to correctly calculate new height
      textareaRef.current.style.height = 'auto';
      
      // Set new height based on content with a higher maximum
      const newHeight = Math.max(42, Math.min(150, textareaRef.current.scrollHeight));
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
      
      // Restore scroll position
      textareaRef.current.scrollTop = scrollPos;
    }
  }, [input]);
  
  // Add resize event listeners for the chat window
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startResizePos.x;
      const deltaY = e.clientY - startResizePos.y;
      
      if (resizeType === 'width' || resizeType === 'both') {
        // Calculate new width as percentage of viewport width
        const newWidthPx = startResizeDims.width - deltaX; // Reversed direction
        const newWidthRem = Math.max(40, Math.min(120, newWidthPx / 16));
        setChatWidth(newWidthRem);
      }
      
      if (resizeType === 'height' || resizeType === 'both') {
        // Calculate new height as percentage of viewport height
        const newHeightPx = startResizeDims.height - deltaY; // Reversed direction
        // Convert to vh (viewport height percentage)
        const viewportHeight = window.innerHeight;
        const newHeightRem = Math.max(40, Math.min(90, (newHeightPx / viewportHeight) * 100));
        setChatHeight(newHeightRem);
      }
    };
    
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizeType(null);
        document.body.style.cursor = 'default';
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startResizePos, startResizeDims, resizeType]);
  
  
  // Auto-open chat on specific pages or for missing profiles - with fix for reopening
  useEffect(() => {
    // Don't auto-open if user has explicitly closed the chat
    if (userClosedChat) return;
    
    // Check if we're on a page where we want to auto-open chat
    const shouldOpen = 
      location.pathname === '/login' || // Family selection screen
      location.pathname === '/survey' || // Initial survey
      location.pathname === '/kid-survey'; // Kid survey screen
    
    // Also check if we have family members without profile pictures
    const hasMissingProfiles = familyMembers.some(m => !m.profilePicture);
    
    // Auto-open on login page or if missing profiles, but only once and respect user choice
    if ((shouldOpen || hasMissingProfiles) && !isOpen && !shouldAutoOpen) {
      const timer = setTimeout(() => {
        setShouldAutoOpen(true);
        setIsOpen(true);
      }, 1500); // Slight delay for better UX
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, familyMembers, userClosedChat, isOpen, shouldAutoOpen]);
  
  // Set context-aware prompt chips based on current page and progress - improved version
  useEffect(() => {
    // Determine user's current phase in the app
    const isSurveyPhase = location.pathname.includes('/survey');
    const isOnboarding = location.pathname === '/login' || isSurveyPhase;
    const isMissingProfiles = familyMembers.some(m => !m.profilePicture);
    const hasSurveyResults = completedWeeks && completedWeeks.length > 0;
    
    // Check if user has completed the initial survey
    const hasCompletedInitialSurvey = selectedUser && selectedUser.completed;
    
    // Set different prompt chips based on phase
    if (isOnboarding || !hasCompletedInitialSurvey) {
      if (isMissingProfiles && location.pathname !== '/survey') {
        // Missing profile pictures is high priority except during survey
        setPromptChips([
          { type: 'profile', text: 'Add profile pictures' },
          { type: 'help', text: 'Why take the survey?' },
          { type: 'info', text: 'How does Allie work?' }
        ]);
      } else if (isSurveyPhase) {
        // Survey-specific prompts
        setPromptChips([
          { type: 'help', text: 'Why are these questions important?' },
          { type: 'info', text: 'How is task weight calculated?' },
          { type: 'balance', text: 'Why divide tasks by category?' }
        ]);
      } else {
        // General onboarding prompts
        setPromptChips([
          { type: 'help', text: 'What can Allie do?' },
          { type: 'survey', text: 'Tell me about the survey' },
          { type: 'profile', text: 'How to set up profiles' }
        ]);
      }
    } else {
      // Dashboard phase - regular app usage
      if (hasSurveyResults) {
        setPromptChips([
          { type: 'balance', text: 'How is our family balance?' },
          { type: 'task', text: 'What tasks do I have this week?' },
          { type: 'calendar', text: 'Add an event from invite' }
        ]);
      } else {
        setPromptChips([
          { type: 'help', text: 'What happens after the survey?' },
          { type: 'task', text: 'How will tasks be assigned?' },
          { type: 'calendar', text: 'Schedule a family meeting' }
        ]);
      }
    }
  }, [location.pathname, familyMembers, completedWeeks, selectedUser]);
  
  // Replace it with this enhanced version:
useEffect(() => {
  // This will run whenever messages change or when the chat is opened
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isOpen]);

  // Helper function to get recent messages for context
  const getRecentMessages = (count = 3) => {
    // Get the most recent messages, excluding AI processing messages
    return messages
      .filter(msg => !msg.text?.includes('analyzing') && !msg.text?.includes('I\'m processing'))
      .slice(-count);
  };
  

// Detect if a message is starting a meeting
const isMeetingStartMessage = (text) => {
  const lowerText = text.toLowerCase();
  return lowerText.includes('family meeting') || 
         lowerText.includes('guide me through') || 
         lowerText.includes('meeting guide') ||
         lowerText.includes('meeting for week');
};

// Add this function to AllieChat.jsx
const isCorrection = (text) => {
  const lowerText = text.toLowerCase().trim();
  return (
    lowerText === "not correct" ||
    lowerText === "that's not right" ||
    lowerText === "no" ||
    lowerText === "that's wrong" ||
    lowerText.includes("not an event") ||
    lowerText.includes("not a") ||
    lowerText.includes("incorrect") ||
    lowerText.includes("that's not what i")
  );
};



// Update meeting notes based on current stage
const updateMeetingNotes = (input) => {
  const stageToFieldMap = {
    'wentWell': 'wentWell',
    'couldImprove': 'couldImprove',
    'actionItems': 'actionItems',
    'kidsCorner': 'kidsInput',
    'nextWeekGoals': 'nextWeekGoals',
    'summary': 'additionalNotes'
  };
  
  const field = stageToFieldMap[meetingStage];
  if (field) {
    setMeetingNotes(prev => {
      // If this field already has content, append the new input
      if (prev[field]) {
        return {
          ...prev,
          [field]: `${prev[field]}\n${input}`
        };
      }
      
      // Otherwise, set the input as the content
      return {
        ...prev,
        [field]: input
      };
    });
  }
};

// Generate meeting summary for review
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

// Save meeting notes to database
const saveMeetingNotes = async () => {
  try {
    await DatabaseService.saveFamilyMeetingNotes(familyId, currentWeek, meetingNotes);
    console.log("Family meeting notes saved successfully");
  } catch (error) {
    console.error("Error saving family meeting notes:", error);
  }
};


// Add this function to get a personalized meeting response from Claude
const getMeetingResponse = async (userMessage, stage) => {
  try {
    // Create a detailed prompt that includes family context and current meeting stage
    const familyContext = {
      familyId,
      familyName,
      familyMembers,
      currentWeek,
      surveyResponses,
      tasks: taskRecommendations
    };

    // Create a specialized prompt based on meeting stage
    let systemPrompt = `You are Allie, guiding the ${familyName || 'family'} through their Week ${currentWeek} family meeting.

IMPORTANT CONTEXT:
- Current meeting stage: ${stage}
- Family members: ${JSON.stringify(familyMembers.map(m => ({ name: m.name, role: m.role })))}
- Current tasks: ${JSON.stringify(taskRecommendations?.slice(0, 5))}

MEETING GOAL:
You are facilitating a weekly family meeting to help distribute household responsibilities more equitably. 
Give thoughtful, specific responses that reference their actual family data.

GUIDELINES:
1. BE CONVERSATIONAL and WARM - this is a family discussion
2. OFFER CONCRETE EXAMPLES specific to their family
3. IF THEY ASK FOR SUGGESTIONS, provide 3-4 specific ideas with explanations
4. REMEMBER details they've mentioned earlier in the meeting
5. Make the conversation feel NATURAL and PERSONAL, not scripted
6. IF THEY SEEM UNCERTAIN, provide helpful prompts to get them thinking`;

    // Add stage-specific instructions
    switch(stage) {
      case 'wentWell':
        systemPrompt += `\n\nFor the "What Went Well" stage:
- Ask for specific successes in workload sharing
- Acknowledge specific tasks they completed from their task list
- If they ask for suggestions, mention things like: "Did you complete the meal planning task together?" or "Did you notice more balance in morning routines?"
- Validate small wins - even tiny improvements matter`;
        break;
      case 'couldImprove':
        systemPrompt += `\n\nFor the "What Could Improve" stage:
- Encourage honest reflection about challenges
- If they ask for suggestions, mention specific categories with imbalance
- Ask thoughtful follow-up questions about challenges mentioned
- Keep the tone constructive, not critical`;
        break;
      case 'actionItems':
        systemPrompt += `\n\nFor the "Action Items" stage:
- If they ask for suggestions, provide 3-4 SPECIFIC action items tailored to their tasks and survey responses
- Each suggestion should be concrete and actionable
- Link suggestions to challenges they mentioned earlier
- Make sure suggestions are realistic for the coming week`;
        break;
      // Add other cases for remaining stages
    }

    // Get personalized response from Claude
    const response = await ClaudeService.generateResponse(
      [
        { role: 'user', content: `Previous meeting notes so far:\n${JSON.stringify(meetingNotes)}\n\nUser message: ${userMessage}` }
      ],
      { 
        system: systemPrompt,
        familyId,
        currentWeek,
        taskRecommendations,
        familyMembers,
        surveyResponses
      }
    );
    
    return response;
  } catch (error) {
    console.error("Error getting meeting response from Claude:", error);
    // Fallback response if API fails
    return `I'm having trouble processing that. Let's continue with our discussion about ${getStageDisplayName(stage)}. What are your thoughts?`;
  }
};


// Helper function to determine if we should move to next stage
const shouldAdvanceStage = (message, currentStage) => {
  const lowerMsg = message.toLowerCase();
  
  // If user explicitly asks to move on
  if (lowerMsg.includes('next') || 
      lowerMsg.includes('move on') || 
      lowerMsg.includes('continue') ||
      lowerMsg.includes('let\'s go') ||
      lowerMsg.match(/next\s+(?:step|stage|question|topic)/)) {
    return true;
  }
  
  // If they've responded enough times to this stage
  const currentCount = responseCount[currentStage] || 0;
  if (currentCount >= 2) {
    // For important stages like action items, require more discussion
    if (currentStage === 'actionItems' && currentCount < 3) {
      return false;
    }
    return true;
  }
  
  // If they ask for help/suggestions but have already given a response
  if ((lowerMsg.includes('not sure') || 
       lowerMsg.includes('suggestions') || 
       lowerMsg.includes('help') ||
       lowerMsg.includes('don\'t know') ||
       lowerMsg.includes('what should')) && 
      currentCount > 0) {
    setShowSuggestions(true);
    return false;
  }
  
  // Default to false - don't advance yet
  return false;
};

const testFirebaseWrite = async () => {
  try {
    // Add test loading message as before
    setMessages(prev => [...prev, {
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: "Testing direct Firebase write...",
      timestamp: new Date().toISOString()
    }]);
    
    console.log("🔥 Starting direct Firebase write test");
    console.log("🔥 Current auth state:", auth.currentUser?.uid);
    console.log("🔥 Family ID:", familyId);
    
    // FIXED: Import with correct path
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../services/firebase');
    
    // Rest of function as before
    const testObject = {
      name: "Test Provider",
      type: "test",
      notes: "Created via debug button",
      familyId: familyId,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || 'debug-user',
      testTimestamp: new Date().toISOString()
    };
    
    // Try adding to providers collection
    console.log("🔥 Writing test object:", testObject);
    const providerRef = await addDoc(collection(db, "providers"), testObject);
    
    // Update UI with success
    setMessages(prev => prev.filter(m => !m.text?.includes("Testing direct")).concat({
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: `Firebase write test SUCCESSFUL! Provider ID: ${providerRef.id}`,
      timestamp: new Date().toISOString()
    }));
    
    return true;
  } catch (error) {
    // Error handling as before
    console.error("🔥 Firebase write test FAILED:", error);
    setMessages(prev => prev.filter(m => !m.text?.includes("Testing direct")).concat({
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: `Firebase write test FAILED: ${error.message}`,
      timestamp: new Date().toISOString()
    }));
    
    return false;
  }
};

// Replace the processMeetingStage function with this improved version:
const processMeetingStage = async (userMessage) => {
  // First message initiates meeting mode
  if (!isMeetingMode && isMeetingStartMessage(userMessage)) {
    setIsMeetingMode(true);
    setMeetingStage('intro');
    
    // Return introduction message
    return `Welcome to your Week ${currentWeek} Family Meeting! I'll guide you through a structured discussion to help your family celebrate wins, address challenges, and plan improvements for better balance.

Let's start with what went well this week. What are some successes your family experienced with workload sharing or task completion?`;
  }
  
  // If already in meeting mode, process the current stage
  if (isMeetingMode) {
    // Update meeting notes
    updateMeetingNotes(userMessage);
    
    // Check for help requests that need suggestions FIRST - before incrementing response count
    // This is the key fix - checking for suggestions before doing anything else
    if (needsSuggestions(userMessage)) {
      console.log("User needs suggestions for stage:", meetingStage);
      // Don't increment response count for help requests
      // This ensures we stay on the same stage and provide proper guidance
      
      // Get appropriate suggestions for this stage
      const suggestionResponse = await getStageSpecificSuggestions(meetingStage);
      return suggestionResponse;
    }
    
    // If not asking for help, update response count for current stage
    setResponseCount(prev => ({
      ...prev,
      [meetingStage]: (prev[meetingStage] || 0) + 1
    }));
    
    // Determine if we should move to the next stage
    const shouldAdvance = shouldAdvanceStage(userMessage, meetingStage);
    
    // Get appropriate response based on stage and advancement
    let response;
    
    if (shouldAdvance) {
      // Move to next stage
      const nextStage = getNextStage(meetingStage);
      setMeetingStage(nextStage);
      setShowSuggestions(false);
      response = await getStageTransitionPrompt(meetingStage, nextStage);
    } else {
      // Stay on current stage
      response = await getMeetingResponse(userMessage, meetingStage);
    }
    
    return response;
  }
  
  // Not in meeting mode or not a meeting start message
  return null;
};

// Also update the needsSuggestions function to be more comprehensive:
const needsSuggestions = (message) => {
  if (!message) return false;
  
  const lowerMsg = message.toLowerCase().trim();
  
  // Check for very short uncertain responses
  if (lowerMsg === "not sure" || 
      lowerMsg === "idk" || 
      lowerMsg === "i don't know" ||
      lowerMsg === "hmm" ||
      lowerMsg === "um" ||
      lowerMsg === "help" ||
      lowerMsg === "i need help") {
    return true;
  }
  
  // Check for longer phrases indicating uncertainty
  return lowerMsg.includes('not sure') || 
         lowerMsg.includes('suggestions') || 
         lowerMsg.includes('help me') ||
         lowerMsg.includes('don\'t know') ||
         lowerMsg.includes('what should') ||
         lowerMsg.includes('could you suggest') ||
         lowerMsg.includes('give me ideas') ||
         lowerMsg.includes('struggling') ||
         lowerMsg.includes('can\'t think') ||
         lowerMsg.match(/what (?:are|would be) (?:some|good)/);
};

// Update the getStageSpecificSuggestions function to return more helpful responses
const getStageSpecificSuggestions = async (stage) => {
  // Create a suggestions prompt for Claude with more specificity
  const suggestionsPrompt = `You are Allie, giving specific, helpful suggestions for the ${getStageDisplayName(stage)} phase of a family meeting.
  
Based on this family's data (tasks, survey responses, etc.), provide 3-4 VERY SPECIFIC suggestions that are tailored to their situation.
Each suggestion should be concrete and actionable.

For the "${getStageDisplayName(stage)}" stage specifically:
- Provide examples that directly relate to this specific topic
- Use a warm, encouraging tone
- Be conversational and supportive
- Reference their family context when possible

Format your response with bullet points for readability and be positive and encouraging.

Return ONLY the suggestions without meta-commentary about the suggestions themselves.`;

  try {
    const suggestions = await ClaudeService.generateResponse(
      [{ role: 'user', content: `The family needs specific ideas for ${getStageDisplayName(stage)}. They replied "not sure" and need help. Please provide helpful, concrete suggestions.` }],
      { 
        system: suggestionsPrompt,
        familyId,
        currentWeek,
        taskRecommendations,
        familyMembers,
        surveyResponses
      }
    );
    
    return `I understand it can be hard to think of examples on the spot! Here are some ideas for ${getStageDisplayName(stage)}:

${suggestions}

Do any of these resonate with your experience this week? Or would you like more specific suggestions?`;
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return getStageFallbackSuggestions(stage);
  }
};



// Fallback suggestions if API fails
const getStageFallbackSuggestions = (stage) => {
  const suggestions = {
    wentWell: [
      "• Did you complete any tasks together as a family?",
      "• Was there a moment when workload felt more balanced?",
      "• Did anyone step up to help with something unexpected?",
      "• Has communication about responsibilities improved?"
    ],
    couldImprove: [
      "• Are there recurring tasks that tend to fall to one person?",
      "• Are there 'invisible' tasks that aren't being acknowledged?",
      "• Is the mental load of planning and organizing shared?",
      "• Are there times when responsibilities feel particularly imbalanced?"
    ],
    actionItems: [
      "• Could one parent take over a task that the other usually handles?",
      "• Could you create a visual chart of responsibilities?",
      "• Could you schedule a mid-week check-in to adjust as needed?",
      "• Could you identify one 'invisible' task to explicitly assign?"
    ],
    kidsCorner: [
      "• What do the kids notice about how chores are divided?",
      "• Do they have suggestions for how to make things more fair?",
      "• Would they like to take on any new responsibilities?",
      "• What family tasks do they enjoy doing together?"
    ],
    nextWeekGoals: [
      "• What's one area where you want to see improvement next week?",
      "• Is there a specific balance percentage you're aiming for?",
      "• Are there any events next week that will require special planning?",
      "• What's one self-care activity each person will prioritize?"
    ]
  };
  
  return `I'd be happy to suggest some ideas for ${getStageDisplayName(stage)}:

${suggestions[stage]?.join('\n') || "Let me know what you're thinking, and we can build on your ideas."}

What do you think? Or do you have other ideas you'd like to discuss?`;
};

// Helper function to get stage display name
const getStageDisplayName = (stage) => {
  const stageNames = {
    intro: "Introduction",
    wentWell: "What Went Well",
    couldImprove: "What Could Improve",
    actionItems: "Action Items",
    kidsCorner: "Kids' Corner",
    nextWeekGoals: "Next Week's Goals",
    summary: "Meeting Summary",
    completed: "Completion"
  };
  
  return stageNames[stage] || stage;
};

// Helper function to get next stage
const getNextStage = (currentStage) => {
  const stageOrder = [
    'intro',
    'wentWell',
    'couldImprove',
    'actionItems',
    'kidsCorner',
    'nextWeekGoals',
    'summary',
    'completed'
  ];
  
  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return 'completed';
  }
  
  return stageOrder[currentIndex + 1];
};


// Get transition prompts between stages
const getStageTransitionPrompt = async (currentStage, nextStage) => {
  // Create appropriate transition message
  const transitions = {
    'wentWell-couldImprove': `Thank you for sharing what went well! It's important to celebrate these wins.

Now, let's talk about what could improve. What challenges did your family face with workload sharing this week?`,
    'couldImprove-actionItems': `I appreciate your honesty about the challenges. Identifying areas for improvement is the first step to making positive changes.

Let's move on to action items. What specific changes would your family like to commit to for next week?`,
    'actionItems-kidsCorner': `Those are great action items! I'll make sure to save these for your next week's plan.

Now let's hear from the kids. What did the children observe about family responsibilities this week?`,
    'kidsCorner-nextWeekGoals': `Thank you for including the kids' perspectives! This helps everyone feel valued and heard.

Finally, let's set some goals for next week. What are your family's top priorities for the coming week?`,
    'nextWeekGoals-summary': async () => {
      // Generate meeting summary
      const summary = generateMeetingSummary();
      return `Great goals! I've prepared a summary of our meeting for your review:

${summary}

Is there anything you'd like to add or change before we complete the meeting?`;
    },
    'summary-completed': async () => {
      // Save meeting notes
      await saveMeetingNotes();
      return `Thank you for a productive family meeting! I've saved all your notes and will use them to help track your progress.

You can now complete this week's cycle with the button in the Task tab, or discuss anything else that's on your mind.`;
    }
  };
  
  const key = `${currentStage}-${nextStage}`;
  if (transitions[key]) {
    return typeof transitions[key] === 'function' ? await transitions[key]() : transitions[key];
  }
  
  // Default transition if specific one not found
  return `Let's move on to talk about ${getStageDisplayName(nextStage)}. ${getStageInitialPrompt(nextStage)}`;
};

// Initial prompts for each stage
const getStageInitialPrompt = (stage) => {
  const prompts = {
    wentWell: "What are some successes your family experienced with workload sharing or task completion this week?",
    couldImprove: "What challenges did your family face with workload sharing this week?",
    actionItems: "What specific changes would your family like to commit to for next week?",
    kidsCorner: "What did the children observe about family responsibilities this week?",
    nextWeekGoals: "What are your family's top priorities for the coming week?"
  };
  
  return prompts[stage] || "What are your thoughts on this?";
};



// Current code in AllieChat.jsx (around line 710-820)
// REPLACE THE WHOLE handleSend function implementation with this improved version:

const handleSend = useCallback(async () => {
  if (input.trim() && canUseChat && selectedUser && familyId) {
    try {
      // Save the current message text before clearing it for UI
      const currentMessageText = input.trim();
      
      // Process with NLU first to show insights
      const intent = nlu.current.detectIntent(currentMessageText);
      const entities = nlu.current.extractEntities(currentMessageText, familyMembers);
      
      // Update NLU insights
      setDetectedIntent(intent);
      setExtractedEntities(entities);
      
      // Create user message
      const userMessage = {
        familyId,
        sender: selectedUser.id,
        userName: selectedUser.name,
        userImage: selectedUser.profilePicture,
        text: currentMessageText,
        timestamp: new Date().toISOString()
      };
      
      // Optimistically add message to UI
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setTranscription('');
      setLoading(true);
      
      // Reset image if any
      if (imageFile) {
        setImageFile(null);
        setImagePreview(null);
      }
      
      const lastAllieMessage = messages[messages.length - 1]?.sender === 'allie' ? messages[messages.length - 1] : null;
      if (lastAllieMessage && isCorrection(currentMessageText)) {
        // User is correcting Allie
        console.log("Detected correction, resetting conversation context");
        
        // Clear any misinterpreted intent
        setDetectedIntent(null);
        
        // Add a reset message
        setMessages(prev => [...prev, userMessage, {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I'm sorry for misunderstanding. Let's try again - what would you like me to help you with?",
          timestamp: new Date().toISOString()
        }]);
        
        setInput('');
        setLoading(false);
        return;
      }


      // Save user message to database first
      const savedMessage = await ChatPersistenceService.saveMessage(userMessage);
      
      // If saving failed, show error
      if (!savedMessage.success) {
        console.error("Failed to save message:", savedMessage.error);
        setMessages(prev => [...prev, {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I couldn't save your message. Please try again in a moment.",
          timestamp: new Date().toISOString(),
          error: true
        }]);
        setLoading(false);
        return;
      }
      
      // First check if this is a meeting-related message
      const meetingResponse = await processMeetingStage(currentMessageText);
      
      if (meetingResponse) {
        // This is a meeting-related message
        // Show typing indicator
        setMessages(prev => [...prev, {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          isTyping: true,
          timestamp: new Date().toISOString()
        }]);
        
        // Get Allie's response - either from cache or API
        let allieResponseText;
        if (typeof meetingResponse === 'string') {
          allieResponseText = meetingResponse;
        } else {
          // It's a promise, await it
          allieResponseText = await meetingResponse;
        }
        
        // Create Allie's response message
        const allieMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: allieResponseText,
          timestamp: new Date().toISOString()
        };
        
        // Save AI message to database
        const savedAIMessage = await ChatPersistenceService.saveMessage(allieMessage);
        
        // Remove typing indicator and add actual response
        setMessages(prev => prev.filter(msg => !msg.isTyping).concat(allieMessage));
        setLoading(false);
        return;
      }
      
      // Check for document action responses
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && (lastMessage.documentFile || lastMessage.awaitingChildSelection)) {
        const isDocumentResponse = await handleDocumentActionSelection(currentMessageText, lastMessage);
        
        if (isDocumentResponse) {
          setLoading(false);
          return;
        }
      }
      
      // Try to process specialized requests
      let handled = false;
      
      // Try various specialized handlers...
      // [Existing specialized handler code remains unchanged]
      
      // If we handled the request with a specialized parser, we're done
      if (handled) {
        setLoading(false);
        return;
      }
      
      // Show typing indicator
      setMessages(prev => [...prev, {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        isTyping: true,
        timestamp: new Date().toISOString()
      }]);
      
      try {
        // Get recent messages for context
        const recentContext = [...getRecentMessages(5), userMessage]; // Only use last 5 messages
        const aiResponse = await EnhancedChatService.getAIResponse(
          currentMessageText, 
          familyId, 
          recentContext
        );
        
        // CRITICAL: Validate response text
        let responseText = aiResponse;
        if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
          console.error("Received empty response from EnhancedChatService, using fallback");
          responseText = "I seem to be having trouble connecting to my language processing system. Please try again in a moment, or ask me something different.";
        }
        
        // Create a validated message object
        const allieMessage = {
          id: Date.now().toString(), // Temporary ID 
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: responseText,
          timestamp: new Date().toISOString()
        };
        
        // Save the validated message to the database
        const savedAIMessage = await ChatPersistenceService.saveMessage(allieMessage);
        if (savedAIMessage.success && savedAIMessage.messageId) {
          allieMessage.id = savedAIMessage.messageId;
        }
        
        // Remove typing indicator and add actual response
        setMessages(prev => 
          prev.filter(msg => !msg.isTyping).concat(allieMessage)
        );
      } catch (aiError) {
        console.error("Error getting AI response:", aiError);
        
        // Create a fallback message for errors
        const fallbackMessage = {
          id: Date.now().toString(),
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I'm experiencing some technical difficulties right now. Please try again in a moment. If the problem persists, you can try refreshing the page.",
          timestamp: new Date().toISOString()
        };
        
        // Save the fallback message
        try {
          const savedFallback = await ChatPersistenceService.saveMessage(fallbackMessage);
          if (savedFallback.success && savedFallback.messageId) {
            fallbackMessage.id = savedFallback.messageId;
          }
        } catch (saveError) {
          console.error("Error saving fallback message:", saveError);
        }
        
        // Remove typing indicator and add fallback
        setMessages(prev => 
          prev.filter(msg => !msg.isTyping).concat(fallbackMessage)
        );
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setLoading(false);
      
      // Show error message
      setMessages(prev => [...prev, {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        error: true
      }]);
    }
  }
}, [input, canUseChat, selectedUser, familyId, imageFile, messages, getRecentMessages]);



// Add this new useEffect to listen for external chat triggers
useEffect(() => {
  const handleOpenChatEvent = (event) => {
    console.log("Received open-allie-chat event:", event.detail);
    
    // Open the chat if it's not already open
    if (!isOpen) {
      setIsOpen(true);
    }
    
    // Set the input with the message from the event
    if (event.detail?.message) {
      setInput(event.detail.message);
      
      // Wait for the chat to fully open and render
      setTimeout(() => {
        // Send the message after the chat is open
        handleSend();
      }, 800); // Give it more time to open and render
    }
  };
  
  // Add event listener for our custom event
  window.addEventListener('open-allie-chat', handleOpenChatEvent);
  
  // Cleanup
  return () => {
    window.removeEventListener('open-allie-chat', handleOpenChatEvent);
  };
}, [isOpen, handleSend]); // Dependencies

// Add a second useEffect specifically for meeting guidance
useEffect(() => {
  // Check if this is specifically for a family meeting (check URL parameters or path)
  const isMeetingPage = location.pathname.includes('/tasks') || 
                        location.search.includes('meeting');

  if (isOpen && isMeetingPage && !initialMessageSent) {
    // Small delay to ensure the chat is fully rendered
    const timer = setTimeout(() => {
      const meetingPrompt = `Guide me through a family meeting for Week ${currentWeek}`;
      setInput(meetingPrompt);
      
      // Add another small delay to ensure input is set before sending
      setTimeout(() => {
        handleSend();
        setInitialMessageSent(true);
      }, 300);
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [isOpen, initialMessageSent, location, currentWeek, handleSend]);

// Also add this new useEffect to ensure scrolling happens after the chat opens
useEffect(() => {
  if (isOpen) {
    // Small delay to ensure DOM is updated before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [isOpen]);
  
  // Load messages when component mounts or familyId changes
  useEffect(() => {
    if (selectedUser && familyId) {
      loadMessages();
    }
  }, [selectedUser, familyId]);
  
  // Send an initial welcome/tutorial message when chat is first opened
  useEffect(() => {
    if (isOpen && shouldAutoOpen && !initialMessageSent && familyId) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        // Check for missing profile pictures first
        const missingProfiles = familyMembers.filter(m => !m.profilePicture);
        
        // Check the current page to customize the message
        let initialMessage = "";
        
        if (location.pathname === '/login') {
          // Family selection screen - focus on profile pictures
          if (missingProfiles.length > 0) {
            initialMessage = `Welcome to Allie! I noticed that ${missingProfiles.length > 1 ? 'some family members' : missingProfiles[0].name} ${missingProfiles.length > 1 ? "don't" : "doesn't"} have profile pictures yet. Would you like me to help you upload ${missingProfiles.length > 1 ? 'them' : 'one'}? Just say "Add profile picture" or select a family member to upload for.`;
            
            // Update prompt chips for profile upload
            setPromptChips([
              { type: 'profile', text: 'Add profile pictures' },
              { type: 'help', text: 'What can Allie do?' },
              { type: 'survey', text: 'Tell me about the survey' }
            ]);
          } else {
            initialMessage = `Hi ${selectedUser?.name || 'there'}! I'm Allie, your family's AI assistant. I'll help balance responsibilities and improve family harmony. Would you like to learn about what I can do?`;
          }
        } else if (location.pathname === '/survey' || location.pathname === '/kid-survey') {
          // Survey screen - focus specifically on the initial survey
          initialMessage = `Hi ${selectedUser?.name || 'there'}! I'm here to help with your initial family survey. This survey is how I learn about your family's task distribution. Feel free to ask me about any question like "Why is this important?" or "What does task weight mean?" You can also say "Do you know any dad jokes?" if you need a laugh while completing the survey!`;
          
          // Update prompt chips for survey
          setPromptChips([
            { type: 'help', text: 'Why are these questions important?' },
            { type: 'info', text: 'How is task weight calculated?' },
            { type: 'fun', text: 'Tell me a dad joke!' }
          ]);
        } else {
          // Default welcome message
          initialMessage = `Hello ${selectedUser?.name || 'there'}! I'm Allie, your family's AI assistant. I'm here to help with family balance, schedule management, and relationship insights. How can I help you today?`;
        }
        
        // Add the initial message to the messages array
        const welcomeMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: initialMessage,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, welcomeMessage]);
        setInitialMessageSent(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldAutoOpen, initialMessageSent, location.pathname, familyId, familyMembers, selectedUser]);
  
  // Load messages with retry capability
  const loadMessages = async (loadMore = false) => {
    try {
      if (!selectedUser || !familyId) {
        console.warn("loadMessages called without selectedUser or familyId", { selectedUser, familyId });
        return;
      }
      
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      console.log(`Attempting to load messages for family ${familyId}`, { loadMore });
      
      const result = await ChatPersistenceService.loadMessages(familyId, {
        pageSize: 25,
        loadMore,
        includeMetadata: false
      });
      
      console.log("Message loading result:", result);
      
      if (result.error) {
        console.error("Error from ChatPersistenceService:", result.error);
        throw new Error(result.error);
      }
      
      setHasMoreMessages(result.hasMore);
      
      if (loadMore) {
        // Prepend the older messages to the current list
        setMessages(prev => [...result.messages, ...prev]);
      } else {
        // Replace all messages
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error("Error loading chat messages:", error, {
        stack: error.stack,
        familyId,
        selectedUser: selectedUser?.id
      });
      
      // Only show error message if we're not loading more
      if (!loadMore) {
        setMessages([{
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I had trouble loading your conversation history. Please try again or check your connection.",
          timestamp: new Date().toISOString(),
          error: true
        }]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Retry loading messages on failure
  const retryLoadMessages = (attempts = 3, delay = 1000) => {
    let retryCount = 0;
    
    const attemptLoad = async () => {
      try {
        await loadMessages();
        console.log("Successfully loaded messages after retry");
      } catch (error) {
        retryCount++;
        console.log(`Attempt ${retryCount} failed, ${attempts - retryCount} attempts remaining`);
        
        if (retryCount < attempts) {
          setTimeout(attemptLoad, delay);
        } else {
          console.error("All retry attempts failed");
        }
      }
    };
    
    attemptLoad();
  };



  // The handleSend function has a syntax error - this is what needs to be fixed
// The problem is likely a misplaced closing brace that's closing the function too early
// Let me provide the corrected function implementation

// Add function to handle message edits and rerun
const handleEditMessage = async (messageId, editedText) => {
  // Find the message index
  const messageIndex = messages.findIndex(msg => msg.id === messageId);
  if (messageIndex === -1) return;
  
  const originalMessage = messages[messageIndex];
  
  // Create a new message array with the edited message
  const messagesUpToEdit = [...messages.slice(0, messageIndex)];
  
  // Add the edited message
  const editedMessage = {
    ...originalMessage,
    text: editedText,
    isEdited: true,
    timestamp: new Date().toISOString()
  };
  messagesUpToEdit.push(editedMessage);
  
  // Update UI
  setMessages(messagesUpToEdit);
  setLoading(true);
  
  // Show processing message
  const processingMessage = {
    familyId,
    sender: 'allie',
    userName: 'Allie',
    text: `I'm processing your edited message...`,
    timestamp: new Date().toISOString()
  };
  
  setMessages(prev => [...prev, processingMessage]);
  
  try {
    // Save the edited message
    await ChatPersistenceService.saveMessage(editedMessage);
    
    // Get AI response based on edited message
    const aiResponse = await EnhancedChatService.getAIResponse(
      editedText, 
      familyId, 
      [...getRecentMessages(5), editedMessage]
    );
    
    // Remove processing message
    setMessages(prev => prev.filter(msg => msg !== processingMessage));
    
    // Add AI response
    const allieMessage = {
      id: Date.now().toString(), 
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: aiResponse,
      timestamp: new Date().toISOString()
    };
    
    // Save AI message to database
    const savedAIMessage = await ChatPersistenceService.saveMessage(allieMessage);
    if (savedAIMessage.success && savedAIMessage.messageId) {
      allieMessage.id = savedAIMessage.messageId;
    }
    
    // Add AI response to messages
    setMessages(prev => [...prev, allieMessage]);
  } catch (error) {
    console.error("Error processing edited message:", error);
    
    // Show error message
    setMessages(prev => [...prev.filter(msg => msg !== processingMessage), {
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: "I encountered an error processing your edited message. Please try again.",
      timestamp: new Date().toISOString(),
      error: true
    }]);
  } finally {
    setLoading(false);
  }
};

// Add a function to handle message deletion
const handleDeleteMessage = async (messageId) => {
  try {
    // First delete the message from the database
    const result = await ChatPersistenceService.deleteMessage(messageId, familyId);
    
    if (result.success) {
      // Only update the UI if the database operation was successful
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } else {
      console.error("Failed to delete message from database:", result.error);
      // Optionally show an error toast/message to the user
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    // Optionally show an error toast/message to the user
  }
};

  // Process specific request types with focused context
const processSpecificRequest = async (messageText, type) => {
  try {
    // Get family context but keep it minimal
    const familyContext = {
      familyId,
      familyMembers: familyMembers
    };
    
    // Get recent relevant messages for context
    const recentMessages = getRecentMessages(3);
    
    if (type === 'todo') {
      // FALLBACK: Still try to parse using the old method in case the primary method failed
      const todoData = await UnifiedParserService.parseTodo(messageText, familyContext, recentMessages);
      
      // NEW CODE for processSpecificRequest function
if (todoData && todoData.text) {
  try {
    // Create task for Kanban board - using successful pattern
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../services/firebase');
    
    console.log("🔥 Starting to create kanban task:", todoData.text);
    
    // Format as kanban task
    const taskItem = {
      title: todoData.text,
      description: todoData.notes || "Added via Allie Chat",
      dueDate: todoData.dueDate,
      priority: "medium",
      category: todoData.category || "household",
      assignedTo: null,
      column: "upcoming",
      familyId: familyId,
      createdAt: serverTimestamp(),
      createdBy: selectedUser?.id || 'allie-chat',
      updatedAt: serverTimestamp(),
      subtasks: [],
      comments: [],
      completed: false
    };
    
    // Try to match assignee to a family member
    if (todoData.assignedTo) {
      const assignee = familyMembers.find(member => 
        member.name.toLowerCase() === todoData.assignedTo.toLowerCase()
      );
      
      if (assignee) {
        taskItem.assignedTo = assignee.id;
        taskItem.assignedToName = assignee.name;
      }
    }
    
    // Add to Kanban tasks collection
    console.log("🔥 About to add to kanbanTasks collection:", { familyId });
    const docRef = await addDoc(collection(db, "kanbanTasks"), taskItem);
    console.log("🔥 Kanban task created successfully:", docRef.id);          
          // Trigger update event for the UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kanban-task-added', { 
              detail: { taskId: docRef.id }
            }));
          }
          
          // Success message
          const successMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've added "${taskItem.title}" to your tasks${taskItem.assignedToName ? ` and assigned it to ${taskItem.assignedToName}` : ''}. You'll find it in the Upcoming column on your task board.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(successMessage));
          return true;
        } catch (error) {
          console.error("Error creating task item:", error);
          
          // Error message
          const errorMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I had trouble adding the task. Please try again or add it directly from the Task Board.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(errorMessage));
          return false;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${type} request:`, error);
    return false;
  }
};

  // Process provider requests with focused context
  const processProviderRequest = async (messageText) => {
    try {
      // Get minimal context
      const familyContext = {
        familyId,
        familyMembers
      };
      
      // Get recent relevant messages
      const recentMessages = getRecentMessages(3);
      
      // Extract provider info using the dedicated method
      const providerDetails = await UnifiedParserService.parseProvider(messageText, familyContext, recentMessages);
      
      if (providerDetails && providerDetails.name && providerDetails.name !== "Unknown Provider") {
        console.log("Successfully parsed provider:", providerDetails);
        
        try {
          // Load ProviderService dynamically
          const ProviderService = (await import('../../services/ProviderService')).default;
          
          // Add family ID
          providerDetails.familyId = familyId;
          
          // Save to database
          const result = await ProviderService.saveProvider(familyId, providerDetails);
          
          if (result.success) {
            // Trigger UI update
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('provider-added'));
            }
            
            // Send success message
            const successMessage = {
              familyId,
              sender: 'allie',
              userName: 'Allie',
              text: `I've added ${providerDetails.name} as a ${providerDetails.specialty || providerDetails.type || 'provider'} to your provider directory${providerDetails.forChild ? ` for ${providerDetails.forChild}` : ''}.`,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(successMessage));
            return true;
          } else {
            throw new Error(result.error || "Failed to save provider");
          }
        } catch (error) {
          console.error("Error saving provider:", error);
          
          // Error message
          const errorMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I had trouble adding the provider. Please try again or add it directly from the Provider Directory.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(errorMessage));
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error processing provider:", error);
      return false;
    }
  };

  // Process messages for calendar events
  const processMessageForEvents = async (text) => {
    try {
      if (!text || !familyId || !selectedUser) return false;
      
      console.log("Processing potential event:", text);
      
      // Get minimal family context for parsing
      const familyContext = {
        familyId,
        children: familyMembers.filter(m => m.role === 'child'),
        parents: familyMembers.filter(m => m.role === 'parent')
      };
      
      // Get recent relevant messages for context
      const recentMessages = getRecentMessages(3);
      
      // Use UnifiedParserService with recent context
      const parsedEvent = await UnifiedParserService.parseEvent(text, familyContext, recentMessages);
      
      if (parsedEvent && (parsedEvent.title || parsedEvent.eventType)) {
        console.log("Successfully parsed event:", parsedEvent);
        
        // Add metadata
        parsedEvent.creationSource = 'text';
        parsedEvent.userId = selectedUser.id;
        parsedEvent.familyId = familyId;
        
        // Create the event
        const response = await createCalendarEventDirectly(parsedEvent);
        
        if (response.success) {
          // Format a nice date string
          const dateString = new Date(parsedEvent.dateTime).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric'
          });
          
          const timeString = new Date(parsedEvent.dateTime).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          });
          
          // Send success message - replace any processing message first
          const successMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've added the following event to your calendar:

Event: ${parsedEvent.title || parsedEvent.eventType}
Date: ${dateString}
Time: ${timeString}
${parsedEvent.location ? `Location: ${parsedEvent.location}` : ''}
${parsedEvent.childName ? `For: ${parsedEvent.childName}` : ''}

You can view and manage this in your calendar.`,
            timestamp: new Date().toISOString()
          };
          
          // Replace the processing message with the success message
          setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(successMessage));
          
          // Trigger calendar refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          }
          
          return true;
        } else {
          // Show the event parser UI if direct creation failed
          setParsedEventDetails(parsedEvent);
          setShowEventParser(true);
          setEventParsingSource('text');
          
          // Replace the processing message
          const helperMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've extracted these event details from your message. Please review them before I add this to your calendar.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(helperMessage));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error processing event from message:", error);
      // Add error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I had trouble understanding the event details. Could you please try describing it again with the date, time, and location?`,
        timestamp: new Date().toISOString()
      };
      
      // Replace processing message with error
      setMessages(prev => prev.filter(m => !m.text?.includes('analyzing')).concat(errorMessage));
      return false;
    }
  };

  // Create event directly from parsed data
  const createCalendarEventDirectly = async (eventDetails) => {
    try {
      if (!eventDetails || !selectedUser) {
        return { success: false, error: "Missing event details or user" };
      }
      
      // Format and standardize the event
      const startDate = eventDetails.dateTime instanceof Date ? 
        eventDetails.dateTime : new Date(eventDetails.dateTime);
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1); // Default 1 hour event
      
      // Check if "me and wife" or similar phrases are in the original text
      const hasSpouse = eventDetails.originalText?.toLowerCase().includes('wife') || 
                      eventDetails.originalText?.toLowerCase().includes('husband') ||
                      eventDetails.originalText?.toLowerCase().includes('spouse') ||
                      eventDetails.originalText?.toLowerCase().includes('partner');
      
      // Extract mentioned people
      const attendees = [];
      
      // Add current user (me)
      if (selectedUser) {
        attendees.push({
          id: selectedUser.id,
          name: selectedUser.name,
          role: selectedUser.role
        });
      }
      
      // Add spouse if mentioned
      if (hasSpouse) {
        const spouse = familyMembers.find(m => 
          m.role === 'parent' && m.id !== selectedUser.id
        );
        
        if (spouse) {
          attendees.push({
            id: spouse.id,
            name: spouse.name,
            role: spouse.role
          });
        }
      }
      
      // Include any attendees from event details
      if (eventDetails.attendees && eventDetails.attendees.length > 0) {
        eventDetails.attendees.forEach(attendee => {
          // Only add if not already in the list
          if (!attendees.some(a => a.id === attendee.id)) {
            attendees.push(attendee);
          }
        });
      }
      
      // Create event object for the calendar
      const event = {
        summary: eventDetails.title,
        title: eventDetails.title,
        description: eventDetails.description || `Added from Allie chat`,
        location: eventDetails.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Add all metadata
        familyId: familyId,
        eventType: eventDetails.eventType || 'general',
        category: eventDetails.category || 'general',
        // Include attendee information
        attendees: attendees,
        // Track source
        source: 'chat',
        creationSource: 'direct_creation',
        originalText: eventDetails.originalText || '',
        // Add child ID and name if present
        childId: eventDetails.childId,
        childName: eventDetails.childName
      };
      
      // Add the event to the calendar
      const result = await CalendarService.addEvent(event, selectedUser.id);
      
      if (result.success) {
        // Force calendar refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        return { 
          success: true, 
          eventId: result.eventId || result.firestoreId,
          message: "Event added successfully"
        };
      } else {
        return { 
          success: false, 
          error: result.error || "Failed to add event to calendar" 
        };
      }
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return { 
        success: false, 
        error: error.message || "Error creating calendar event" 
      };
    }
  };

  // Handle image processing for event extraction
  const handleImageProcessForEvent = async (file) => {
    try {
      setLoading(true);
      
      // Add a processing message to give user feedback
      const processingMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm analyzing the image to see if it contains event information...`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image");
      }
      
      // Get family context for better parsing
      const familyContext = {
        familyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Use our new UnifiedParserService to parse the image
      const eventDetails = await UnifiedParserService.parseImage(file, 'event', familyContext);
      
      if (eventDetails && (eventDetails.title || eventDetails.eventType)) {
        // We successfully parsed an event
        eventDetails.creationSource = 'image';
        setParsedEventDetails(eventDetails);
        setShowEventParser(true);
        setEventParsingSource('image');
        
        // Add a message about what we found
        const infoMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `I found what looks like an event in your image! I've extracted these details: ${eventDetails.title || eventDetails.eventType} ${eventDetails.dateTime ? `on ${new Date(eventDetails.dateTime).toLocaleDateString()}` : ''}. Would you like to add this to your calendar?`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev.filter(m => m !== processingMessage), infoMessage]);
        return true;
      } else {
        // Could not parse an event
        const errorMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `I analyzed the image but couldn't find clear event details. If this is an invitation, you can describe the event to me and I'll help you add it to your calendar.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev.filter(m => m !== processingMessage), errorMessage]);
        return false;
      }
    } catch (error) {
      console.error("Error processing image for event:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I had trouble analyzing that image. If it contains an event invitation, you can tell me about the event directly and I'll help you add it to your calendar.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev.filter(m => m.text?.includes('analyzing')), errorMessage]);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add child event to both calendar and child tracking
  const addChildEventToTracking = async (eventDetails) => {
    try {
      if (!eventDetails || !selectedUser) return false;
      
      // Ensure we have required details
      if (!eventDetails.childId || !eventDetails.trackingType) {
        // Add error message
        setMessages(prev => [...prev, {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `I couldn't add this event because some required information is missing. Please make sure you've selected a child and event type.`,
          timestamp: new Date().toISOString()
        }]);
        return false;
      }
      
      // Make sure we have the ChildTrackingService
      if (!childTrackingService.current) {
        const ChildTracking = (await import('../services/ChildTrackingService')).default;
        childTrackingService.current = ChildTracking;
      }
      
      // Determine if this is a medical appointment or activity
      let result;
      let eventType;
      
      if (eventDetails.trackingType === 'medical') {
        // It's a medical appointment
        result = await childTrackingService.current.addMedicalAppointment(
          familyId,
          eventDetails.childId,
          eventDetails,
          true // Add to calendar too
        );
        eventType = "medical appointment";
      } else {
        // It's an activity
        result = await childTrackingService.current.addActivity(
          familyId,
          eventDetails.childId,
          eventDetails,
          true // Add to calendar too
        );
        eventType = "activity";
      }
      
      if (result.success) {
        // Success message
        const successMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `Great! I've added the ${eventType} "${eventDetails.title}" for ${eventDetails.childName} on ${new Date(eventDetails.dateTime).toLocaleDateString()} at ${new Date(eventDetails.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. This has been added to both your family calendar and ${eventDetails.childName}'s ${eventDetails.trackingType === 'medical' ? 'medical records' : 'activities'}.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, successMessage]);
        
        // Force calendar refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          
          // Dispatch child tracking update event
          window.dispatchEvent(new CustomEvent('child-tracking-updated', {
            detail: { 
              childId: eventDetails.childId,
              type: eventDetails.trackingType
            }
          }));
        }
        
        return true;
      } else {
        throw new Error(result.error || "Failed to add event to tracking");
      }
    } catch (error) {
      console.error("Error adding child event to tracking:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm sorry, I couldn't add this event to tracking. ${error.message || "Please try again or add it manually through the Children tab."}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return false;
    }
  };

  // Handle document processing
  const handleDocumentProcess = async (file, detectedType) => {
    setLoading(true);
    
    try {
      // Add a processing message to give user feedback
      const processingMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm analyzing your ${detectedType.primaryType}...`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // Use the DocumentProcessingService to process the document
      const result = await DocumentProcessingService.processDocument(file, familyId, selectedUser.id);
      
      if (!result.success) {
        throw new Error(result.error || "Error processing document");
      }
      
      const document = result.documentData;
      
      // Determine response based on document category
      let responseText = "";
      
      switch (document.category) {
        case 'medical':
          const children = familyMembers.filter(m => m.role === 'child');
          
          responseText = "I processed your medical document. Would you like me to:";
          
          if (children.length === 1) {
            responseText += `\n1. Add it to ${children[0].name}'s medical records`;
          } else if (children.length > 1) {
            responseText += "\n1. Add it to a child's medical records";
          }
          
          responseText += "\n2. Save it to your document library";
          responseText += "\n3. Check if it contains appointment information";
          break;
          
        case 'school':
          responseText = "I analyzed this school document. Would you like me to:";
          responseText += "\n1. Add it to a child's school records";
          responseText += "\n2. Extract homework or assignment details";
          responseText += "\n3. Save it to your document library";
          break;
          
        case 'event':
          responseText = "This looks like an event or invitation! I've extracted the following details:";
          
          if (document.entities && document.entities.dates && document.entities.dates.length > 0) {
            responseText += `\nDate: ${document.entities.dates[0]}`;
          }
          
          if (document.entities && document.entities.addresses && document.entities.addresses.length > 0) {
            responseText += `\nLocation: ${document.entities.addresses[0]}`;
          }
          
          responseText += "\n\nWould you like me to add this to your calendar?";
          
          // Try to extract calendar event
          const eventDetails = await EventParserService.parseEventFromDocument(document);
          if (eventDetails) {
            setParsedEventDetails(eventDetails);
            setShowEventParser(true);
            setEventParsingSource('document');
          }
          break;
          
        default:
          responseText = `I've processed your ${document.category} document and saved it to your library. You can view and manage it in the Document Library section.`;
          
          // Include extracted details if available
          if (document.entities) {
            const entityCounts = Object.entries(document.entities)
              .filter(([_, values]) => values && values.length > 0)
              .map(([type, values]) => `${type}: ${values.length}`);
              
            if (entityCounts.length > 0) {
              responseText += `\n\nI extracted the following information: ${entityCounts.join(', ')}.`;
            }
          }
      }
      
      // Remove processing message
      setMessages(prev => prev.filter(m => m !== processingMessage));
      
      // Add response message
      const responseMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: responseText,
        timestamp: new Date().toISOString(),
        documentId: document.id,
        documentData: document,
        documentFile: file
      };
      
      setMessages(prev => [...prev, responseMessage]);
      return;
    } catch (error) {
      console.error("Error processing document:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I had trouble processing your document: ${error.message}. Please try uploading it directly to the Document Library.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev.filter(m => m.text?.includes('analyzing')), errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Detect document type from file
  const detectDocumentType = async (file) => {
    try {
      // First check by file type
      const fileType = file.type.toLowerCase();
      
      // Image types - could be events, medical records, school flyers, etc.
      if (fileType.startsWith('image/')) {
        // For images, we need to look at content to determine type
        return {
          primaryType: 'image',
          possibleTypes: ['event', 'medical', 'school', 'general']
        };
      }
      
      // PDF documents
      if (fileType === 'application/pdf') {
        return {
          primaryType: 'document',
          possibleTypes: ['medical', 'school', 'event', 'general']
        };
      }
      
      // Word documents
      if (fileType.includes('word') || 
          fileType.includes('document') || 
          fileType.includes('msword') || 
          fileType.includes('officedocument')) {
        return {
          primaryType: 'document',
          possibleTypes: ['medical', 'school', 'general']
        };
      }
      
      // Text files
      if (fileType.includes('text') || fileType === 'text/plain') {
        return {
          primaryType: 'text',
          possibleTypes: ['note', 'general']
        };
      }
      
      // CSV or Excel files
      if (fileType.includes('csv') || 
          fileType.includes('excel') || 
          fileType.includes('spreadsheet')) {
        return {
          primaryType: 'spreadsheet',
          possibleTypes: ['growth', 'schedule', 'general']
        };
      }
      
      // Default for unknown types
      return {
        primaryType: 'unknown',
        possibleTypes: ['general']
      };
    } catch (error) {
      console.error("Error detecting document type:", error);
      return {
        primaryType: 'unknown',
        possibleTypes: ['general']
      };
    }
  };

  // Get document type from file
  const getDocumentTypeFromFile = async (file) => {
    try {
      // Use the document type detection from the DocumentProcessingService
      const validationResult = DocumentProcessingService.validateDocument(file);
      if (!validationResult.valid) {
        return {
          primaryType: 'unsupported',
          possibleTypes: ['general'],
          error: validationResult.error
        };
      }
      
      // Determine main type based on file type
      const fileType = file.type.toLowerCase();
      
      // Image types - could be events, medical records, school flyers, etc.
      if (fileType.startsWith('image/')) {
        return {
          primaryType: 'image',
          possibleTypes: ['event', 'medical', 'school', 'general']
        };
      }
      
      // PDF documents
      if (fileType === 'application/pdf') {
        return {
          primaryType: 'document',
          possibleTypes: ['medical', 'school', 'event', 'general']
        };
      }
      
      // Word documents
      if (fileType.includes('word') || 
          fileType.includes('document') || 
          fileType.includes('msword') || 
          fileType.includes('officedocument')) {
        return {
          primaryType: 'document',
          possibleTypes: ['medical', 'school', 'general']
        };
      }
      
      // Text files
      if (fileType.includes('text') || fileType === 'text/plain') {
        return {
          primaryType: 'text',
          possibleTypes: ['note', 'general']
        };
      }
      
      // CSV or Excel files
      if (fileType.includes('csv') || 
          fileType.includes('excel') || 
          fileType.includes('spreadsheet')) {
        return {
          primaryType: 'spreadsheet',
          possibleTypes: ['growth', 'schedule', 'general']
        };
      }
      
      // Default for unknown types
      return {
        primaryType: 'unknown',
        possibleTypes: ['general']
      };
    } catch (error) {
      console.error("Error detecting document type:", error);
      return {
        primaryType: 'unknown',
        possibleTypes: ['general'],
        error: error.message
      };
    }
  };

  // Handle user selection for document actions
  const handleDocumentActionSelection = async (text, messageWithDocument) => {
    if (!messageWithDocument || !messageWithDocument.documentFile) {
      return false;
    }
    
    const file = messageWithDocument.documentFile;
    const documentType = messageWithDocument.documentType || 'general';
    
    // Check which option was selected
    if (text.includes("1") || text.toLowerCase().includes("add to") || text.toLowerCase().includes("medical records") || text.toLowerCase().includes("school records")) {
      // Show child selection for adding to records
      const children = familyMembers.filter(m => m.role === 'child');
      
      if (children.length === 0) {
        const noChildMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `I don't see any children in your family profile. Let's save the document to your library instead.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, noChildMessage]);
        saveDocumentToLibrary(file, documentType);
        return true;
      } else if (children.length === 1) {
        // Only one child, save directly
        saveDocumentToLibrary(file, documentType, children[0].id);
        return true;
      } else {
        // Multiple children, ask which one
        const childSelectMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `Which child would you like to connect this document to?\n${children.map((child, index) => `${index + 1}. ${child.name}`).join('\n')}`,
          timestamp: new Date().toISOString(),
          documentFile: file,
          documentType,
          awaitingChildSelection: true
        };
        
        setMessages(prev => [...prev, childSelectMessage]);
        return true;
      }
    } else if (text.includes("2") || text.toLowerCase().includes("save to") || text.toLowerCase().includes("document library")) {
      // Save to document library
      saveDocumentToLibrary(file, documentType);
      return true;
    } else if (text.includes("3") || text.toLowerCase().includes("check") || text.toLowerCase().includes("event information")) {
      // Try to parse as event
      handleImageProcessForEvent(file);
      return true;
    }
    
    return false;
  };

  // Save document to the document library
  const saveDocumentToLibrary = async (file, category = 'general', childId = null) => {
    try {
      setLoading(true);
      
      // Create storage reference
      const storagePath = `family-documents/${familyId}/${childId || 'general'}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create document metadata
      const documentData = {
        title: file.name,
        description: `Added from Allie Chat`,
        category: category,
        childId: childId,
        familyId,
        fileName: file.name,
        filePath: storagePath,
        fileUrl: downloadURL,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: selectedUser?.id,
        uploadedAt: new Date().toISOString()
      };
      
      // Add document to Firestore
      await DatabaseService.saveDocument(documentData);
      
      // Success message
      const successMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I've saved the document to your library${childId ? ` and connected it to ${familyMembers.find(m => m.id === childId)?.name || 'child'}'s profile` : ''}. You can view it in the Document Library.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, successMessage]);
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Error saving document to library:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I had trouble saving your document to the library. Please try uploading it directly from the Document Library.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
      return false;
    }
  };

  // Handle image file from message for profile picture
  const handleImageFileFromMessage = async (file, memberId) => {
    if (!file || !memberId) return false;
    
    setIsProcessingImage(true);
    
    try {
      // Upload the image
      const imageUrl = await DatabaseService.uploadProfileImage(memberId, file);
      
      // Update the member profile with the new image URL
      await updateMemberProfile(memberId, { profilePicture: imageUrl });
      
      // Success message
      const successMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I've updated the profile picture successfully! It looks great! Would you like to add another profile picture for someone else?`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, successMessage]);
      setIsProcessingImage(false);
      setShowProfileUploadHelp(false);
      setProfileUploadTarget(null);
      
      return true;
    } catch (error) {
      console.error("Error processing image from message:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm sorry, I couldn't update the profile picture. Please try again or use the profile page to upload directly.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessingImage(false);
      setShowProfileUploadHelp(false);
      setProfileUploadTarget(null);
      
      return false;
    }
  };

  // Add event to calendar
  const addEventToCalendar = async (eventDetails) => {
    try {
      if (!eventDetails || !selectedUser) return false;
      
      // Ensure we have a valid Date object
      const startDate = eventDetails.dateTime ? 
        (eventDetails.dateTime instanceof Date ? 
          eventDetails.dateTime : 
          new Date(eventDetails.dateTime)) : 
        new Date();
        
      // Log the date conversion for debugging
      console.log("Event date conversion:", {
        original: eventDetails.dateTime,
        converted: startDate,
        iso: startDate.toISOString()
      });
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1); // Default 1 hour event
      
      // Determine event title
      let eventTitle = eventDetails.title || 'New Event';
      
      // Determine if this is an invitation (child attending) or an event (child hosting)
      const isInvitation = eventDetails.isInvitation || 
                          (eventDetails.extraDetails?.eventRelationship === "attending");
      
      // Add more context to title based on event type and relationship
      if (eventDetails.eventType === 'birthday') {
        if (isInvitation && eventDetails.extraDetails?.hostName) {
          const childAge = eventDetails.extraDetails.birthdayChildAge 
            ? ` (${eventDetails.extraDetails.birthdayChildAge})` 
            : '';
          eventTitle = `${eventDetails.extraDetails.hostName}'s Birthday Party${childAge}`;
        } else if (eventDetails.extraDetails?.birthdayChildName) {
          const childAge = eventDetails.extraDetails.birthdayChildAge 
            ? ` (${eventDetails.extraDetails.birthdayChildAge})` 
            : '';
          eventTitle = `${eventDetails.extraDetails.birthdayChildName}'s Birthday${childAge}`;
        }
      }
      
      // If it's an invitation, make sure to reflect that in the title
      if (isInvitation && eventDetails.childName) {
        if (!eventTitle.includes("'s")) {
          // If no specific host is in the title, add context that this is an invitation
          eventTitle = `${eventDetails.childName} attending: ${eventTitle}`;
        } else if (!eventTitle.includes(eventDetails.childName)) {
          // If host is in title but not the child, add that info
          eventTitle = `${eventDetails.childName} invited to ${eventTitle}`;
        }
      } else if (!isInvitation && eventDetails.childName && !eventTitle.includes(eventDetails.childName)) {
        // For hosted events, add child name if not already in title
        eventTitle = `${eventTitle} - ${eventDetails.childName}`;
      }
      
      // Create event object with explicit structure
      const event = {
        summary: eventTitle,
        title: eventTitle, // Include both for compatibility
        description: eventDetails.extraDetails?.notes || `Added from Allie chat`,
        location: eventDetails.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: true
        },
        // Add additional metadata
        familyId: familyId,
        eventType: eventDetails.eventType || 'general',
        childId: eventDetails.childId,
        childName: eventDetails.childName,
        extraDetails: eventDetails.extraDetails || {},
        // Include attendee information if available
        attendingParentId: eventDetails.attendingParentId || null,
        // Include sibling information if available
        siblingIds: eventDetails.siblingIds || [],
        siblingNames: eventDetails.siblingNames || [],
        // Track source of event creation
        source: 'chat',
        // Include original text for reference
        originalText: eventDetails.originalText || '',
        // Flag if this is an invitation vs. a hosted event
        isInvitation: isInvitation
      };
      
      console.log("Adding event to calendar:", event);
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, selectedUser.id);
      
      if (result.success) {
        // Success message - adjusted based on invitation vs. hosted event
        let successText;
        if (isInvitation) {
          successText = `Great! I've added "${eventTitle}" to your calendar for ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.${eventDetails.location ? ` Location: ${eventDetails.location}.` : ''} This has been added as an invitation for ${eventDetails.childName} to attend.`;
        } else {
          successText = `Great! I've added "${eventTitle}" to your calendar for ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.${eventDetails.location ? ` Location: ${eventDetails.location}.` : ''}`;
        }
        
        const successMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: successText,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, successMessage]);
        
        // Force calendar refresh with multiple events to ensure it's caught
        if (typeof window !== 'undefined') {
          // Create event detail with important metadata
          const eventDetail = {
            eventId: result.eventId || result.firestoreId,
            universalId: result.universalId,
            title: eventTitle,
            time: startDate.toISOString(),
            childId: eventDetails.childId,
            childName: eventDetails.childName,
            isInvitation: isInvitation
          };
          
          // First dispatch the standard event
          const calendarEvent = new CustomEvent('calendar-event-added', {
            detail: eventDetail
          });
          window.dispatchEvent(calendarEvent);
          
          // Additional event for child-specific handling
          if (eventDetails.childId) {
            window.dispatchEvent(new CustomEvent('calendar-child-event-added', {
              detail: eventDetail
            }));
          }
          
          // Then dispatch the force refresh event with a slight delay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          }, 300);
        }
        
        return true;
      } else {
        throw new Error("Failed to add event to calendar");
      }
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      
      // Error message
      const errorMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm sorry, I couldn't add the event to your calendar. Please try again or add it manually through the calendar page.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return false;
    } finally {
      setDetectedEventDetails(null);
      setShowEventConfirmation(false);
    }
  };

  // Format date for display
  const formatEventDate = (date) => {
    if (!date) return 'Unknown date';
    
    // Try to convert string to date if needed
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(eventDate.getTime())) return 'Unknown date';
    
    // Format as "Tuesday, April 9 at 2:00 PM"
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }) + ' at ' + eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Drag event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    // Only set isDragging to false when the counter reaches 0
    // This prevents the overlay from flickering when dragging over child elements
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Always set this to true for consistent behavior
    setIsDragging(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Detect the document type
      const documentType = await detectDocumentType(droppedFile);
      
      // Check if it's an image
      if (droppedFile.type.startsWith('image/')) {
        // Create a preview URL
        const previewUrl = URL.createObjectURL(droppedFile);
        setImageFile(droppedFile);
        setImagePreview(previewUrl);
        
        // If we have a profile upload target, process the image
        if (profileUploadTarget) {
          handleImageFileFromMessage(droppedFile, profileUploadTarget.id);
        } else {
          // Process the document based on its detected type
          await handleDocumentProcess(droppedFile, documentType);
        }
      } else if (droppedFile.type === 'application/pdf' || 
                droppedFile.type.includes('text') || 
                droppedFile.type.includes('document') ||
                droppedFile.type.includes('spreadsheet') ||
                droppedFile.type.includes('excel') ||
                droppedFile.type.includes('csv')) {
        // Handle document files
        const processingMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `I see you've shared a document. I'm analyzing it now...`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, processingMessage]);
        
        // Process the document based on its detected type
        await handleDocumentProcess(droppedFile, documentType);
      } else {
        // Unsupported file type
        const errorMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: `Sorry, I can't process this type of file (${droppedFile.type}). I can work with images, PDFs, text documents, and spreadsheets.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  // Toggle chat open/closed
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // If user is closing the chat, remember this choice
    if (isOpen) {
      setUserClosedChat(true);
      localStorage.setItem('allieChat_userClosed', 'true');
    }
  };

  // Handle using a prompt chip
  const handleUsePrompt = (promptText, memberId) => {
    if (memberId) {
      // This is a member profile prompt
      const member = familyMembers.find(m => m.id === memberId);
      if (member) {
        setProfileUploadTarget(member);
        setShowProfileUploadHelp(true);
        setInput(`I want to upload a profile picture for ${member.name}`);
      } else {
        setInput(promptText);
      }
    } else if (promptText.includes('event from invite')) {
      // This is an event parsing prompt
      setInput('I want to add an event from an invitation');
      setShowEventParser(true);
      
      // Add a helper message
      const helperMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I can help you add an event to your calendar from an invitation! Please paste the invitation text or upload a screenshot, and I'll extract the details for you.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, helperMessage]);
    } else {
      setInput(promptText);
    }
    
    // Focus on the textarea after setting the input
    textareaRef.current?.focus();
  };

  // Toggle microphone for voice input
  const handleToggleMic = () => {
    if (isListening) {
      if (recognition.current) {
        recognition.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognition.current) {
        recognition.current.start();
        setIsListening(true);
      } else {
        alert("Your browser doesn't support speech recognition.");
      }
    }
  };

  // Handle enter key for sending
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        // Create a preview URL
        const previewUrl = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(previewUrl);
        
        // If we have a profile upload target, process the image
        if (profileUploadTarget) {
          handleImageFileFromMessage(file, profileUploadTarget.id);
        } else if (showEventParser) {
          // If we're in event parsing mode, try to extract event details
          handleImageProcessForEvent(file);
        } else {
          setIsProcessingImage(false);
        }
      } else {
        alert("Please upload an image file.");
      }
    }
  };

  // Handle attaching an image
  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };

  // Handle removing an image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Release object URL to free memory
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  // Resize button handler (upward/downward adjustment)
  const handleResize = (direction) => {
    const minHeight = 50; // Min height in rems
    const maxHeight = 85; // Max height in rems (almost full screen)
    
    if (direction === 'up' && chatHeight > minHeight) {
      setChatHeight(chatHeight - 5);
    } else if (direction === 'down' && chatHeight < maxHeight) {
      setChatHeight(chatHeight + 5);
    }
  };

  // Start resize drag operation
  const handleStartResize = (e, type) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType(type);
    setStartResizePos({ x: e.clientX, y: e.clientY });
    
    // Get current dimensions
    const rect = chatContainerRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
    setStartResizeDims({ width: rect.width, height: rect.height });
    
    // Set cursor based on resize type
    if (type === 'width') {
      document.body.style.cursor = 'ew-resize';
    } else if (type === 'height') {
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.cursor = 'nwse-resize';
    }
  };

  // Open camera for profile picture
  const openCameraForProfile = () => {
    if (!profileUploadTarget) {
      return;
    }
    
    const videoElement = document.createElement('video');
    const canvasElement = document.createElement('canvas');
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        
        // Create camera UI
        const cameraModal = document.createElement('div');
        cameraModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        
        const cameraContainer = document.createElement('div');
        cameraContainer.className = 'bg-white p-4 rounded-lg max-w-md w-full font-roboto';
        
        const title = document.createElement('h3');
        title.textContent = `Take a Picture for ${profileUploadTarget.name}`;
        title.className = 'text-lg font-medium mb-4 font-roboto';
        
        const videoContainer = document.createElement('div');
        videoContainer.className = 'relative mb-4';
        videoContainer.appendChild(videoElement);
        videoElement.className = 'w-full rounded';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-between';
        
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Take Photo';
        captureButton.className = 'px-4 py-2 bg-black text-white rounded font-roboto';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'px-4 py-2 border rounded font-roboto';
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(captureButton);
        
        cameraContainer.appendChild(title);
        cameraContainer.appendChild(videoContainer);
        cameraContainer.appendChild(buttonContainer);
        cameraModal.appendChild(cameraContainer);
        
        document.body.appendChild(cameraModal);
        
        // Handle capture
        captureButton.addEventListener('click', () => {
          // Set canvas dimensions to match video
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          
          // Draw current video frame to canvas
          canvasElement.getContext('2d').drawImage(
            videoElement, 0, 0, canvasElement.width, canvasElement.height
          );
          
          // Convert to blob
          canvasElement.toBlob(blob => {
            // Stop all tracks to close camera
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            
            // Remove modal
            document.body.removeChild(cameraModal);
            
            // Process the image blob
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            handleImageFileFromMessage(file, profileUploadTarget.id);
          }, 'image/jpeg');
        });
        
        // Handle cancel
        cancelButton.addEventListener('click', () => {
          // Stop all tracks to close camera
          videoElement.srcObject.getTracks().forEach(track => track.stop());
          
          // Remove modal
          document.body.removeChild(cameraModal);
        });
      })
      .catch(error => {
        console.error("Error accessing camera:", error);
        
        // Show error message in chat
        const errorMessage = {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I wasn't able to access your camera. Please check your camera permissions or try uploading an image file instead.",
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      });
  };

  // Make sure the chat doesn't render without a user
  if (!selectedUser && !familyId) {
    return null;
  }

  // Render the chat component
  return (
    <div className="fixed bottom-0 right-0 z-50 md:w-auto w-full flex flex-col">
      {/* Chat header (shown when closed) */}
      {!isOpen && (
        <div 
          className="bg-white shadow-lg rounded-t-lg p-4 mx-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={toggleChat}
        >
          <div className="flex items-center">
            <MessageSquare className="text-blue-600 mr-2" />
            <span className="font-semibold font-roboto">Chat with Allie</span>
          </div>
          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {messages.filter(m => m.sender === 'allie').length}
              </span>
            )}
            <ChevronUp />
          </div>
        </div>
      )}
      
      {/* Full chat interface (shown when open) */}
      {isOpen && (
        <div 
          ref={chatContainerRef}
          className="bg-white shadow-xl rounded-t-lg mx-4 flex flex-col transition-all duration-300 font-roboto relative overflow-hidden"
          style={{ 
            height: `${chatHeight}vh`, 
            width: `${chatWidth}rem`, 
            maxWidth: '95vw',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay - shows only when dragging files */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <Upload size={32} className="mx-auto text-blue-500 mb-2" />
                <p className="text-lg font-medium">Drop files here</p>
                <p className="text-sm text-gray-500 mt-1">Images & documents accepted</p>
              </div>
            </div>
          )}
          
          {/* Chat header */}
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="text-blue-600 mr-2" />
              <span className="font-semibold">Chat with Allie</span>
            </div>
            <div className="flex items-center">
              {/* Toggle NLU insights */}
              <button 
                onClick={() => setShowInsights(!showInsights)} 
                className={`p-1 rounded mr-1 ${showInsights ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Toggle NLU insights"
              >
                <Info size={18} />
              </button>
              
              {/* Add this inside the chat header div, next to the other buttons */}
<button 
  onClick={testFirebaseWrite}
  className="p-1 bg-red-100 text-red-700 rounded mr-1 text-xs"
  title="Test Firebase Write"
>
  Test DB
</button>

              {/* Resize buttons */}
              <button 
                onClick={() => handleResize('up')} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Make chat smaller"
              >
                <ChevronDown size={18} />
              </button>
              <button 
                onClick={() => handleResize('down')} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Make chat larger"
              >
                <ChevronUp size={18} />
              </button>
              
              {/* Minimize button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Minimize chat"
              >
                <MinusSquare size={18} />
              </button>
              
              {/* Close button */}
              <button 
                onClick={toggleChat} 
                className="p-1 hover:bg-gray-100 rounded"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Load more button */}
            {hasMoreMessages && (
              <div className="text-center py-2">
                <button 
                  onClick={() => loadMessages(true)} 
                  disabled={loadingMore}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-3 h-3 border-2 border-t-0 border-blue-500 rounded-full animate-spin mr-2"></div>
                      Loading more...
                    </>
                  ) : (
                    'Load earlier messages'
                  )}
                </button>
              </div>
            )}
            
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <span className="font-medium">Allie</span>
                </div>
                <p className="text-sm">
                  Hello{selectedUser ? ` ${selectedUser.name}` : ''}! I'm Allie, your family balance assistant. I can help with workload balance, 
                  relationship insights, task management, and more. How can I support your family today?
                </p>
              </div>
            )}
            
            {/* Render messages with date headers */}
{(() => {
  let currentDate = null;
  return messages.map((msg, index) => {
    const messageDate = new Date(msg.timestamp);
    const messageDateStr = formatMessageDate(messageDate);
    
    // Check if this message is from a different date than the previous one
    const showDateHeader = currentDate !== messageDateStr;
    if (showDateHeader) {
      currentDate = messageDateStr;
    }
    
    return (
      <React.Fragment key={index}>
        {showDateHeader && <DateHeader date={currentDate} />}
        <ChatMessage 
          key={index} 
          message={msg} 
          onDelete={handleDeleteMessage}
          onEdit={handleEditMessage} 
          showFeedback={true}
        />
      </React.Fragment>
    );
  });
})()}
            
            {/* Event confirmation UI */}
            {showEventConfirmation && detectedEventDetails && (
              <div className="bg-blue-50 p-3 rounded-lg ml-4">
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">Allie</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-sm mb-2">
                  I noticed an event in your message. Would you like me to add this to your calendar?
                </p>
                <div className="bg-white rounded-md p-2 mb-2 text-xs border">
                  <div className="mb-1"><span className="font-medium">Event:</span> {detectedEventDetails.title || 'New Event'}</div>
                  {detectedEventDetails.childName && (
                    <div className="mb-1"><span className="font-medium">For:</span> {detectedEventDetails.childName}</div>
                  )}
                  <div className="mb-1"><span className="font-medium">When:</span> {formatEventDate(detectedEventDetails.startDate || detectedEventDetails.dateTime)}</div>
                  {detectedEventDetails.location && (
                    <div className="mb-1"><span className="font-medium">Location:</span> {detectedEventDetails.location}</div>
                  )}
                  {detectedEventDetails.category && (
                    <div className="mb-1"><span className="font-medium">Type:</span> {detectedEventDetails.category}</div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowEventParser(true)}
                    className="flex-1 bg-black text-white px-3 py-1 rounded-md text-xs flex items-center justify-center"
                  >
                    <Calendar size={12} className="mr-1" />
                    Edit & Add to Calendar
                  </button>
                  <button
                    onClick={() => {
                      setDetectedEventDetails(null);
                      setShowEventConfirmation(false);
                    }}
                    className="flex-1 border px-3 py-1 rounded-md text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Event Parser UI */}
            {showEventParser && (
              <div className="bg-blue-50 p-3 rounded-lg ml-4">
                <div className="mb-2 text-sm font-medium flex items-center">
                  <Calendar size={14} className="mr-1 text-blue-600" />
                  <span>Let's add this event to your {parsedEventDetails?.trackingType ? `calendar and ${parsedEventDetails.childName}'s records` : 'calendar'}</span>
                </div>
                
                <EventParser 
                  initialEvent={parsedEventDetails || detectedEventDetails}
                  onParseSuccess={(event) => {
                    // Check if this is a child tracking event
                    if (event.trackingType === 'medical' || event.trackingType === 'activity') {
                      // Add to both calendar and child tracking
                      addChildEventToTracking(event).then(() => {
                        // Close event parser
                        setShowEventParser(false);
                        setParsedEventDetails(null);
                        setDetectedEventDetails(null);
                      });
                    } else {
                      // Regular calendar event
                      addEventToCalendar(event).then(() => {
                        // Close event parser
                        setShowEventParser(false);
                        setParsedEventDetails(null);
                        setDetectedEventDetails(null);
                      });
                    }
                  }}
                  onEdit={(updatedEvent) => {
                    if (parsedEventDetails) {
                      setParsedEventDetails(updatedEvent);
                    } else {
                      setDetectedEventDetails(updatedEvent);
                    }
                  }}
                  onCancel={() => {
                    setShowEventParser(false);
                    setParsedEventDetails(null);
                    setDetectedEventDetails(null);
                    
                    // Add message that user cancelled
                    setMessages(prev => [...prev, {
                      familyId,
                      sender: 'allie',
                      userName: 'Allie',
                      text: `No problem! I won't add that event to your calendar. Is there anything else I can help with?`,
                      timestamp: new Date().toISOString()
                    }]);
                  }}
                  familyId={familyId}
                />
              </div>
            )}
            
            {/* Profile upload UI */}
            {showProfileUploadHelp && profileUploadTarget && (
              <div className="bg-blue-50 p-3 rounded-lg ml-4">
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">Allie</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-sm mb-2">
                  I'll help you upload a profile picture for {profileUploadTarget.name}. You can either:
                </p>
                <div className="flex space-x-3 mb-2">
                  <button
                    onClick={handleAttachImage}
                    className="flex items-center justify-center bg-black text-white px-3 py-2 rounded-md text-xs"
                  >
                    <Upload size={14} className="mr-1" />
                    Choose File
                  </button>
                  
                  <button
                    onClick={openCameraForProfile}
                    className="flex items-center justify-center bg-purple-600 text-white px-3 py-2 rounded-md text-xs"
                  >
                    <Camera size={14} className="mr-1" />
                    Take Photo
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  The profile picture will be updated immediately in your family profiles.
                </p>
              </div>
            )}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center space-x-1 my-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* NLU insights panel */}
          {showInsights && (
            <div className="border-t p-2 bg-gray-50 text-xs overflow-y-auto max-h-40">
              {detectedIntent ? (
                <div className="mb-2">
                  <span className="font-medium">Intent:</span>
                  <span className="ml-1 font-mono">{detectedIntent}</span>
                </div>
              ) : (
                <div className="mb-2 text-gray-500">No intent detected yet. Send a message to see intent analysis.</div>
              )}
              
              {extractedEntities && Object.keys(extractedEntities).length > 0 ? (
                <div>
                  <span className="font-medium">Entities:</span>
                  <div className="bg-white p-1 rounded border mt-1 overflow-x-auto">
                    <pre className="text-xs">{JSON.stringify(extractedEntities, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="mb-2 text-gray-500">No entities detected in recent messages.</div>
              )}
              
              {conversationContext && conversationContext.length > 0 ? (
                <div className="mt-2">
                  <span className="font-medium">Recent Context:</span>
                  <ul className="list-disc list-inside pl-2 mt-1">
                    {conversationContext.slice(0, 3).map((topic, idx) => (
                      <li key={idx} className="truncate">
                        {topic.query || "Previous topic"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-2 text-gray-500">No conversation context available yet.</div>
              )}
              
              <div className="mt-3 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  This panel shows Allie's understanding of your messages through natural language processing.
                </span>
              </div>
            </div>
          )}
          
          {/* Prompt chips */}
          <div className="px-3 py-2 flex flex-wrap gap-2">
            {promptChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleUsePrompt(chip.text, chip.memberId)}
                className="bg-gray-100 hover:bg-gray-200 text-xs px-3 py-1 rounded-full font-roboto"
              >
                {chip.type === 'calendar' && <Calendar size={12} className="inline mr-1" />}
                {chip.type === 'profile' && <User size={12} className="inline mr-1" />}
                {chip.text}
              </button>
            ))}
          </div>
          
          {/* Image preview area */}
          {imagePreview && (
            <div className="p-2 border-t relative">
              <div className="relative w-32 h-32">
                <img 
                  src={imagePreview} 
                  alt="Upload preview" 
                  className="w-full h-full object-cover rounded-md border"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
              {isProcessingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-sm">Processing...</div>
                </div>
              )}
            </div>
          )}
          
          {/* Input area */}
          <div className="p-3 border-t mt-auto">
            {!canUseChat ? (
              <div className="bg-amber-50 p-2 rounded-md text-xs text-amber-800 mb-2">
                Chat is disabled for children. Please ask a parent to enable this feature.
              </div>
            ) : (
              <>
                <div className="flex items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={isListening ? transcription : input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message Allie..."
                      className="w-full border rounded-l-md p-3 pl-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none font-roboto"
                      style={{ height: `${textareaHeight}px`, maxHeight: '150px' }}
                      rows="1"
                      disabled={isListening}
                    ></textarea>
                  </div>
                  <div className="flex bg-white rounded-r-md border-t border-r border-b">
                    <button
                      onClick={handleToggleMic}
                      className={`p-3 ${isListening ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
                      title={isListening ? "Stop recording" : "Record voice"}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      onClick={handleAttachImage}
                      className="p-3 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Upload image"
                    >
                      <Upload size={18} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && !imageFile) || loading}
                      className="bg-blue-600 text-white p-3 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                      title="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                {isListening && (
                  <p className="text-xs text-red-500 mt-1 animate-pulse">
                    Listening... speak now
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Resize handles */}
          <div 
            className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize" 
            onMouseDown={(e) => handleStartResize(e, 'both')}
            title="Resize chat"
          >
            <div className="w-3 h-3 border-t-2 border-l-2 border-gray-400 absolute top-1 left-1"></div>
          </div>
          
          <div 
            className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize"
            onMouseDown={(e) => handleStartResize(e, 'width')}
          ></div>
          
          <div 
            className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize"
            onMouseDown={(e) => handleStartResize(e, 'height')}
          ></div>
        </div>
      )}
    </div>
  );
};

export default AllieChat;