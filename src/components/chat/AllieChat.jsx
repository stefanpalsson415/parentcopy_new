// src/components/chat/AllieChat.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const { familyId, selectedUser, familyMembers, updateMemberProfile, familyName, currentWeek, completedWeeks } = useFamily();
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
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
  

/// Replace the loadMessages function in AllieChat.jsx with this improved version
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

// Add a "Load More" button at the top of the messages section
// In the chat messages div, add at the top:
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

const handleSend = async () => {
  if (input.trim() && canUseChat && selectedUser && familyId) {
    try {
      // Process with NLU first to show insights
      const intent = nlu.current.detectIntent(input);
      const entities = nlu.current.extractEntities(input, familyMembers);
      
      // Update NLU insights
      setDetectedIntent(intent);
      setExtractedEntities(entities);
      
      // Create user message
      const userMessage = {
        familyId,
        sender: selectedUser.id,
        userName: selectedUser.name,
        userImage: selectedUser.profilePicture,
        text: input,
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
      
      // Save message to database first (we'll handle AI response after event processing if needed)
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
      
      // Always try to parse the message as an event first
      const isEvent = await processMessageForEvents(input);
      
      const processingMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: `I'm analyzing your event details using AI. This might take a moment...`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, processingMessage]);

      // Check if this is a response to document action options
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && (lastMessage.documentFile || lastMessage.awaitingChildSelection)) {
        const isDocumentResponse = handleDocumentActionSelection(input, lastMessage);
        
        if (isDocumentResponse) {
          // If we handled the document action, don't send to AI
          setLoading(false);
          return;
        }
      }
      
      // Check if this is a profile picture request
      const isProfileRequest = 
        input.toLowerCase().includes('profile picture') || 
        input.toLowerCase().includes('profile photo') ||
        input.toLowerCase().includes('upload picture') ||
        input.toLowerCase().includes('add picture') ||
        input.toLowerCase().includes('change picture');
        
      // Handle profile upload request
      if (isProfileRequest) {
        // Profile handling code
        setLoading(false);
        return;
      }
      
      // If event was successfully processed, don't get AI response
      if (isEvent) {
        setLoading(false);
        return;
      }
      
      // Update conversation context
      const updatedContext = EnhancedChatService.updateConversationContext(familyId, {
        query: input,
        intent,
        entities
      });
      
      setConversationContext(updatedContext?.recentTopics || []);
      
      // Get AI response for normal messages
      const aiResponse = await EnhancedChatService.getAIResponse(
        input, 
        familyId, 
        [...messages, userMessage]
      );
      
      // Add AI response to messages
      const allieMessage = {
        id: Date.now().toString(), // Temporary ID 
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
      
      // Update messages state with AI response
      setMessages(prev => [...prev, allieMessage]);
      
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
};
  
  const tryParseCalendarEvent = async (messageText) => {
    if (!messageText.trim()) return false;
    
    // Get family context for parsing
    const familyContext = {
      familyId,
      children: familyMembers.filter(m => m.role === 'child')
    };
    
    try {
      console.log("Attempting to parse potential calendar event from message");
      
      // Use the EventParserService to parse the text
      const eventDetails = await EventParserService.parseEventText(messageText, familyContext);
      
      // If we got valid event details, show the event parser UI
      if (eventDetails && (eventDetails.title || eventDetails.eventType)) {
        console.log("Successfully parsed calendar event:", eventDetails);
        setParsedEventDetails(eventDetails);
        setShowEventParser(true);
        setEventParsingSource('text');
        return true;
      }
    } catch (error) {
      console.error("Error parsing potential calendar event:", error);
    }
    
    return false;
  };


// Add this function to AllieChat.jsx
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

// Then modify the useEffect that loads messages:
useEffect(() => {
  if (selectedUser && familyId) {
    retryLoadMessages();
  }
}, [selectedUser, familyId]);

const processMessageForEvents = async (text) => {
  try {
    // Only try to parse events if we have family context
    if (!familyId || !selectedUser) return false;
    
    // Get basic NLU analysis
    const intentObj = nlu.current.detectIntent(text);
    const intent = intentObj?.intent || '';
    const entities = nlu.current.extractEntities(text, familyMembers);
    
    // Enhanced detection for calendar-related content
    const isCalendarRelated = 
      intent.startsWith('calendar.') || 
      text.toLowerCase().includes('calendar') ||
      text.toLowerCase().includes('appointment') ||
      text.toLowerCase().includes('event') ||
      text.toLowerCase().includes('schedule') ||
      text.toLowerCase().includes('plan a') ||
      text.toLowerCase().includes('date') ||
      text.toLowerCase().includes('meet');
    
    // If this appears to be calendar-related, try to parse it as an event
    if (isCalendarRelated) {
      // Get family context for better parsing
      const familyContext = {
        familyId,
        children: familyMembers.filter(m => m.role === 'child'),
        parents: familyMembers.filter(m => m.role === 'parent')
      };
      
      // Use our new UnifiedParserService to parse the event
      const parsedEvent = await UnifiedParserService.parseEvent(text, familyContext);
      
      if (parsedEvent && (parsedEvent.title || parsedEvent.eventType)) {
        console.log("Successfully parsed event:", parsedEvent);
        
        // Add source tracking for learning feedback
        parsedEvent.creationSource = 'text';
        // Add user and family IDs
        parsedEvent.userId = selectedUser.id;
        parsedEvent.familyId = familyId;
        
        // Extract mentioned people
        const mentionedPeople = extractMentionedPeople(text, familyMembers);
        
        // Add mentioned people as attendees
        if (mentionedPeople && mentionedPeople.length > 0) {
          parsedEvent.attendees = mentionedPeople.map(person => ({
            id: person.id || null,
            name: person.name,
            role: person.role || null
          }));
          
          // If "me" is mentioned, add the current user
          if (text.toLowerCase().includes(' me ') || 
              text.toLowerCase().includes('for me') || 
              text.toLowerCase().startsWith('me ')) {
            const currentUser = familyMembers.find(m => m.id === selectedUser.id);
            if (currentUser && !parsedEvent.attendees.some(a => a.id === currentUser.id)) {
              parsedEvent.attendees.push({
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role
              });
            }
          }
          
          // If "wife" or "husband" is mentioned, try to find the spouse
          const spouseTerms = ['wife', 'husband', 'spouse', 'partner'];
          const hasSpouseTerm = spouseTerms.some(term => text.toLowerCase().includes(term));
          
          if (hasSpouseTerm) {
            const currentUser = familyMembers.find(m => m.id === selectedUser.id);
            const spouses = familyMembers.filter(m => 
              m.role === 'parent' && m.id !== currentUser.id
            );
            
            if (spouses.length > 0) {
              const spouse = spouses[0];
              if (!parsedEvent.attendees.some(a => a.id === spouse.id)) {
                parsedEvent.attendees.push({
                  id: spouse.id,
                  name: spouse.name,
                  role: spouse.role
                });
              }
            }
          }
        }
        
        // If this is a personal event for adults (like a date night), set appropriate properties
        if (text.toLowerCase().includes('date night') || 
            text.toLowerCase().includes('plan a date') || 
            text.toLowerCase().includes('night out')) {
          parsedEvent.eventType = 'date';
          parsedEvent.category = 'relationship';
          
          // Make sure both parents are included
          const parents = familyMembers.filter(m => m.role === 'parent');
          if (parents.length > 0) {
            parsedEvent.attendees = parents.map(parent => ({
              id: parent.id,
              name: parent.name,
              role: parent.role
            }));
          }
        }
        
        // Now that we have all the details, create the event directly
        const response = await createCalendarEventDirectly(parsedEvent);

        
        if (response.success) {
          // Send success message
          const successMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've added the following event to your family's shared calendar:\n\nEvent: ${parsedEvent.title}\nDate: ${new Date(parsedEvent.dateTime).toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}\nTime: ${new Date(parsedEvent.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nLocation: ${parsedEvent.location || 'Not specified'}\n\nThis has been added to your family's shared calendar. You can view and manage this in your calendar.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, successMessage]);
          return true;
        } else {
          // If direct creation failed, show the event parser UI
          setParsedEventDetails(parsedEvent);
          setShowEventParser(true);
          setEventParsingSource('text');
          
          const helperMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've extracted event details from your message. Please review before adding to your calendar.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, helperMessage]);
          return true;
        }
      }
    }
    
    // Check for todo-related requests
    const todoKeywords = ['todo', 'to-do', 'to do', 'add a task', 'create a task', 'make a task'];
    const isTodoRequest = todoKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isTodoRequest || text.toLowerCase().includes('create') && text.toLowerCase().includes('for')) {
      // Get family context for better parsing
      const familyContext = {
        familyId,
        familyMembers: familyMembers
      };
      
      // Use new UnifiedParserService to parse todo
      const parsedTodo = await UnifiedParserService.parseTodo(text, familyContext);
      
      if (parsedTodo && parsedTodo.text) {
        // Try to handle as a shared todo request
        const todoData = {
          text: parsedTodo.text,
          completed: false,
          familyId: familyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: selectedUser.id || 'allie-chat',
          assignedTo: null,
          category: parsedTodo.category || 'general',
          position: 0,
          notes: parsedTodo.notes || 'Added via Allie Chat',
          dueDate: parsedTodo.dueDate || null
        };
        
        // If we have an assignee, find the corresponding family member
        if (parsedTodo.assignedTo) {
          const assignee = familyMembers.find(member => 
            member.name.toLowerCase() === parsedTodo.assignedTo.toLowerCase()
          );
          
          if (assignee) {
            todoData.assignedTo = assignee.id;
          }
        }
        
        try {
          // Add to Firestore
          const docRef = await addDoc(collection(db, "relationshipTodos"), todoData);
          
          // Trigger update event for the UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('todo-added', { 
              detail: { todoId: docRef.id }
            }));
          }
          
          // Success message
          const successMessage = {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `Perfect! I've added "${todoData.text}" to your todo list. ${todoData.assignedTo ? `It's assigned to ${familyMembers.find(m => m.id === todoData.assignedTo)?.name || 'the assigned person'}. ` : ''}${todoData.dueDate ? `It's due by ${new Date(todoData.dueDate).toLocaleDateString()}. ` : ''}You can find it in the To-Do List section where you can edit, assign, or mark it complete.`,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, successMessage]);
          return true;
        } catch (error) {
          console.error("Error creating todo item:", error);
          // Error message will be handled by the catch block below
        }
      }
    }
    
    // Check for provider-related requests
    const providerKeywords = ['doctor', 'dentist', 'teacher', 'provider', 'specialist', 'tutor'];
    const isProviderRequest = 
      intent.startsWith('provider.') || 
      providerKeywords.some(keyword => text.toLowerCase().includes(keyword)) &&
      (text.toLowerCase().includes('add') || text.toLowerCase().includes('new'));
      
    if (isProviderRequest) {
      // Get family context for better parsing
      const familyContext = {
        familyId,
        familyMembers: familyMembers
      };
      
      // Use new UnifiedParserService to parse provider
      const providerDetails = await UnifiedParserService.parseProvider(text, familyContext);
      
      if (providerDetails && providerDetails.name) {
        try {
          // Load ProviderService dynamically if needed
          const ProviderService = (await import('../../services/ProviderService')).default;
          
          // Add family ID
          providerDetails.familyId = familyId;
          
          // Save provider to database
          const result = await ProviderService.saveProvider(familyId, providerDetails);
          
          if (result.success) {
            // Trigger UI update event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('provider-added'));
            }
            
            // Success message
            const successMessage = {
              familyId,
              sender: 'allie',
              userName: 'Allie',
              text: `Successfully added ${providerDetails.type === 'education' ? 'teacher' : 'provider'} ${providerDetails.name} to your provider directory. ${providerDetails.forChild ? `I've noted that this is for ${providerDetails.forChild}.` : ''}`,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, successMessage]);
            return true;
          }
        } catch (error) {
          console.error("Error saving provider:", error);
          // Error message will be handled by the catch block below
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error parsing event from message:", error);
    
    // Send error message
    const errorMessage = {
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: `I'm sorry, I had trouble processing that request. Could you try rephrasing it or providing more details?`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, errorMessage]);
    return false;
  }
};

// Helper method to extract mentioned people
const extractMentionedPeople = (text, familyMembers) => {
  if (!text || !familyMembers || familyMembers.length === 0) {
    return [];
  }
  
  const mentionedPeople = [];
  
  // Check for each family member by name
  familyMembers.forEach(member => {
    const namePattern = new RegExp(`\\b${member.name}\\b`, 'i');
    if (namePattern.test(text)) {
      mentionedPeople.push({
        id: member.id,
        name: member.name,
        role: member.role
      });
    }
  });
  
  // Check for "me" references
  if (text.toLowerCase().includes(' me ') || 
      text.toLowerCase().includes(' my ') || 
      text.toLowerCase().includes('for me') || 
      text.toLowerCase().startsWith('me ')) {
    const currentUser = familyMembers.find(m => m.id === selectedUser.id);
    if (currentUser && !mentionedPeople.some(p => p.id === currentUser.id)) {
      mentionedPeople.push({
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role
      });
    }
  }
  
  // Check for spouse references
  if (text.toLowerCase().includes('wife') || 
      text.toLowerCase().includes('husband') || 
      text.toLowerCase().includes('spouse') || 
      text.toLowerCase().includes('partner')) {
    
    // Find the spouse (assuming the other parent is the spouse)
    const currentUser = familyMembers.find(m => m.id === selectedUser.id);
    const spouse = familyMembers.find(m => 
      m.role === 'parent' && m.id !== currentUser?.id
    );
    
    if (spouse && !mentionedPeople.some(p => p.id === spouse.id)) {
      mentionedPeople.push({
        id: spouse.id,
        name: spouse.name,
        role: spouse.role
      });
    }
  }
  
  return mentionedPeople;
};

// Helper method to create calendar event directly
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
    
    // Create event object with explicit structure
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
      originalText: eventDetails.originalText || ''
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
}
  
// Add this helper function to src/components/chat/AllieChat.jsx

// UPDATED addChildEventToTracking function to remove setError call

// Add child event to both calendar and child tracking
const addChildEventToTracking = async (eventDetails) => {
  try {
    if (!eventDetails || !selectedUser) return false;
    
    // Ensure we have required details
    if (!eventDetails.childId || !eventDetails.trackingType) {
      // Add error message directly instead of using setError
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
// Check message history for potential calendar events
const checkMessageHistoryForEvents = () => {
  // Only check if no event parser is already showing
  if (showEventParser || !messages.length) return;
  
  // Get the last few messages to analyze
  const recentMessages = messages.slice(-5);
  
  // Check if any recent messages might contain calendar events
  const calendarMessages = recentMessages.filter(msg => {
    const text = msg.text.toLowerCase();
    return (
      text.includes('birthday') ||
      text.includes('party') ||
      text.includes('invite') ||
      (text.includes('calendar') && text.includes('add')) ||
      (text.includes('event') && (text.includes('add') || text.includes('create')))
    );
  });
  
  // If we found potential calendar messages, offer to extract events
  if (calendarMessages.length > 0) {
    // Get the most recent calendar-related message
    const latestCalendarMessage = calendarMessages[calendarMessages.length - 1];
    
    // Add a suggestion to the message list
    const suggestionMessage = {
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: "I noticed we were discussing something that might be an event. Would you like me to help add it to your calendar?",
      timestamp: new Date().toISOString(),
      suggestion: true,
      originalMessageId: latestCalendarMessage.id
    };
    
    setMessages(prev => [...prev, suggestionMessage]);
  }
};




  // Handle image file from message
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
        
        setMessages(prev => [...prev, infoMessage]);
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
        
        setMessages(prev => [...prev, errorMessage]);
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
      
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
      return false;
    } finally {
      setLoading(false);
    }
  };


// Detect document type based on content and metadata
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



// Updated code for AllieChat.jsx - document processing related functions

// Replace the existing handleDocumentProcess function with this improved version:
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
    
    // Use the new DocumentProcessingService to process the document
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
    
    // Add response message
    const responseMessage = {
      familyId,
      sender: 'allie',
      userName: 'Allie',
      text: responseText,
      timestamp: new Date().toISOString(),
      documentId: document.id,
      documentData: document
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
    
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
};

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
const handleDocumentActionSelection = (text, messageWithDocument) => {
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


// Add these drag event handlers before the return statement (around line 670)
// NEW CODE - Improved drag handlers
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
  
  // In AllieChat.jsx - Update the addEventToCalendar function
  // src/components/chat/AllieChat.jsx - Update the addEventToCalendar function
  
// In src/components/chat/AllieChat.jsx - Update the addEventToCalendar function
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
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
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
  
  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };
  
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
  
  // Toggle chat open/closed
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // If user is closing the chat, remember this choice
    if (isOpen) {
      setUserClosedChat(true);
      localStorage.setItem('allieChat_userClosed', 'true');
    }
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
        // In src/components/chat/AllieChat.jsx

// First, find the main chat container div (around line 570)
// The ref={chatContainerRef} div should have these event handlers added:

// NEW CODE - Remove the permanent drop box
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
  
  {/* Rest of the chat content */}
  {/* Removed the permanent drop box that was here */}    
  
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
        <div className={`flex mb-4 ${msg.sender === 'allie' ? 'justify-start' : 'justify-end'}`}>
          {msg.sender === 'allie' && (
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-xs font-bold">A</span>
            </div>
          )}
          
          <div className={`max-w-[80%] p-3 rounded-lg ${
            msg.sender === 'allie' 
              ? 'bg-white border border-gray-100 shadow-sm' 
              : 'bg-blue-600 text-white'
          } transition-all duration-200 hover:shadow-md`}>
          
            <div className="flex justify-between items-start">
              {!msg.sender !== 'allie' && (
                <div className="font-medium text-xs mb-1">{msg.userName}</div>
              )}
              {msg.sender === 'allie' && (
                <div className="font-medium text-xs mb-1">Allie</div>
              )}
              <div className="text-xs text-gray-500 ml-2">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
            
            <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
            
            {/* Add feedback component for Allie messages */}
            {msg.sender === 'allie' && msg.id && (
              <ChatFeedback messageId={msg.id} familyId={familyId} />
            )}
          </div>
          
          {msg.sender !== 'allie' && msg.userImage && (
            <div className="h-8 w-8 rounded-full overflow-hidden ml-2 flex-shrink-0">
              <img 
                src={msg.userImage} 
                alt={msg.userName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
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
          // Regular calendar event - add success message
          setMessages(prev => [...prev, {
            familyId,
            sender: 'allie',
            userName: 'Allie',
            text: `I've added "${event.title}" to your calendar on ${new Date(event.dateTime || event.startDate).toLocaleDateString()} at ${new Date(event.dateTime || event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
            timestamp: new Date().toISOString()
          }]);
          
          // Close event parser
          setShowEventParser(false);
          setParsedEventDetails(null);
          setDetectedEventDetails(null);
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
          
          {/* Replace the input area (around line 966) */}
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