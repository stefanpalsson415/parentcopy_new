// src/components/chat/AllieChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, MinusSquare, Send, Info, Calendar, PlusCircle, Mic, User, ChevronUp, ChevronDown, Upload, Camera } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import EnhancedChatService from '../../services/EnhancedChatService';
import EnhancedNLU from '../../services/EnhancedNLU';
import ChatMessage from './ChatMessage';
import CalendarPromptChip from './CalendarPromptChip';
import ChatFeedback from './ChatFeedback';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import DatabaseService from '../../services/DatabaseService';
import { useLocation } from 'react-router-dom';

const AllieChat = () => {
  const { familyId, selectedUser, familyMembers, updateMemberProfile, familyName } = useFamily();
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
  const [chatHeight, setChatHeight] = useState(68); // Default height (in rems)
  const [promptChips, setPromptChips] = useState([
    { type: 'calendar', text: 'Add an event to my calendar' },
    { type: 'task', text: 'What tasks do I have this week?' },
    { type: 'balance', text: 'How is our family balance?' }
  ]);
  // New state variables for enhanced features
  const [showInsights, setShowInsights] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [showProfileUploadHelp, setShowProfileUploadHelp] = useState(false);
  const [profileUploadTarget, setProfileUploadTarget] = useState(null);
  
  // Get current location to customize Allie's behavior
  const location = useLocation();
  
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const fileInputRef = useRef(null);
  const nlu = useRef(new EnhancedNLU());
  
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
  
  // Auto-open chat based on the current page and user state
  useEffect(() => {
    // Check if we're on a page where we want to auto-open chat
    const shouldOpen = 
      location.pathname === '/login' || // Family selection screen
      location.pathname === '/survey' || // Initial survey
      location.pathname === '/kid-survey'; // Kid survey screen
    
    // Also check if we have family members without profile pictures
    const hasMissingProfiles = familyMembers.some(m => !m.profilePicture);
    
    // Auto-open on login page or if missing profiles
    if ((shouldOpen || hasMissingProfiles) && !isOpen) {
      setTimeout(() => {
        setShouldAutoOpen(true);
        setIsOpen(true);
      }, 1500); // Slight delay for better UX
    }
  }, [location.pathname, familyMembers, isOpen]);
  
  // Send an initial welcome/tutorial message when chat is first opened
  useEffect(() => {
    if (isOpen && shouldAutoOpen && !initialMessageSent && familyId) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        // Check the current page to customize the message
        let initialMessage = "";
        
        if (location.pathname === '/login') {
          // Family selection screen - focus on profile pictures
          const missingProfiles = familyMembers.filter(m => !m.profilePicture);
          
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
          // Survey screen - explain the survey
          initialMessage = `Hi ${selectedUser?.name || 'there'}! I'm here to help with your family survey. This helps me understand how tasks are distributed in your family. Feel free to ask me any questions about the survey or why specific questions are important.`;
          
          // Update prompt chips for survey
          setPromptChips([
            { type: 'help', text: 'Why are these questions important?' },
            { type: 'info', text: 'How is data used?' },
            { type: 'balance', text: 'What is family balance?' }
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
  
  const loadMessages = async () => {
    try {
      if (!selectedUser || !familyId) return;
      
      setLoading(true);
      const chatMessages = await EnhancedChatService.loadMessages(familyId);
      setMessages(chatMessages);
      setLoading(false);
    } catch (error) {
      console.error("Error loading chat messages:", error);
      setLoading(false);
    }
  };
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
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
        
        // Check if this is a profile picture request
        const isProfileRequest = 
          input.toLowerCase().includes('profile picture') || 
          input.toLowerCase().includes('profile photo') ||
          input.toLowerCase().includes('upload picture') ||
          input.toLowerCase().includes('add picture') ||
          input.toLowerCase().includes('change picture');
        
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
        
        // Save message to database
        const savedMessage = await EnhancedChatService.saveMessage(userMessage);
        
        // Update conversation context
        const updatedContext = EnhancedChatService.updateConversationContext(familyId, {
          query: input,
          intent,
          entities
        });
        
        setConversationContext(updatedContext?.recentTopics || []);
        
        // Handle profile upload request
        if (isProfileRequest) {
          // Look for a specific member mentioned
          let targetMember = null;
          
          if (entities.people && entities.people.length > 0) {
            const mentionedName = entities.people[0].name;
            targetMember = familyMembers.find(m => 
              m.name.toLowerCase() === mentionedName.toLowerCase()
            );
          }
          
          // If no specific member found, list options
          if (!targetMember) {
            const missingProfiles = familyMembers.filter(m => !m.profilePicture);
            
            let responseText = "";
            if (missingProfiles.length > 0) {
              responseText = `I'd be happy to help with profile pictures! Who would you like to add a picture for? ${missingProfiles.map(m => m.name).join(', ')} still ${missingProfiles.length > 1 ? "don't" : "doesn't"} have profile pictures.`;
            } else {
              responseText = "I'd be happy to help update profile pictures! Who would you like to update a picture for?";
            }
            
            const allieMessage = {
              familyId,
              sender: 'allie',
              userName: 'Allie',
              text: responseText,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, allieMessage]);
            setLoading(false);
            setShowProfileUploadHelp(true);
            
            // Update prompt chips for member selection
            setPromptChips(
              familyMembers.slice(0, 3).map(member => ({
                type: 'profile',
                text: `For ${member.name}`,
                memberId: member.id
              }))
            );
          } else {
            // Specific member found, offer to upload
            setProfileUploadTarget(targetMember);
            
            const allieMessage = {
              familyId,
              sender: 'allie',
              userName: 'Allie',
              text: `Great! I'll help you upload a profile picture for ${targetMember.name}. You can either upload an image file or take a photo with your camera. Just click the button below to choose.`,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, allieMessage]);
            setLoading(false);
            setShowProfileUploadHelp(true);
          }
          
          return;
        }
        
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
        const savedAIMessage = await EnhancedChatService.saveMessage(allieMessage);
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
          timestamp: new Date().toISOString()
        }]);
      }
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
    } else {
      setInput(promptText);
    }
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
  
  const handleResize = (direction) => {
    const minHeight = 50; // Min height in rems
    const maxHeight = 85; // Max height in rems (almost full screen)
    
    if (direction === 'up' && chatHeight > minHeight) {
      setChatHeight(chatHeight - 5);
    } else if (direction === 'down' && chatHeight < maxHeight) {
      setChatHeight(chatHeight + 5);
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
    <div className="fixed bottom-0 right-0 z-50 md:w-96 w-full flex flex-col">
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
          className="bg-white shadow-lg rounded-t-lg mx-4 flex flex-col transition-all duration-300 font-roboto"
          style={{ height: `${chatHeight}vh` }}
        >
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
            
            {/* Render messages */}
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-lg ${msg.sender === 'allie' ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}>
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">{msg.userName || (msg.sender === 'allie' ? 'Allie' : 'You')}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                
                {/* Add feedback component for Allie messages */}
                {msg.sender === 'allie' && msg.id && (
                  <ChatFeedback messageId={msg.id} familyId={familyId} />
                )}
              </div>
            ))}
            
            {/* Profile upload UI */}
            {showProfileUploadHelp && profileUploadTarget && (
              <div className="bg-blue-50 p-3 rounded-lg ml-4">
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">Allie</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date().toLocaleTimeString()}
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
          {showInsights && (detectedIntent || (extractedEntities && Object.keys(extractedEntities).length > 0)) && (
            <div className="border-t p-2 bg-gray-50 text-xs overflow-y-auto max-h-40">
              {detectedIntent && (
                <div className="mb-2">
                  <span className="font-medium">Intent:</span>
                  <span className="ml-1 font-mono">{detectedIntent}</span>
                </div>
              )}
              
              {extractedEntities && Object.keys(extractedEntities).length > 0 && (
                <div>
                  <span className="font-medium">Entities:</span>
                  <div className="bg-white p-1 rounded border mt-1 overflow-x-auto">
                    <pre className="text-xs">{JSON.stringify(extractedEntities, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {conversationContext && conversationContext.length > 0 && (
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
              )}
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
                {chip.type === 'profile' && <Camera size={12} className="inline mr-1" />}
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
                  <textarea
                    value={isListening ? transcription : input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message Allie..."
                    className="flex-1 border rounded-l-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none font-roboto"
                    rows="1"
                    disabled={isListening}
                  ></textarea>
                  <div className="flex bg-gray-100 rounded-r-md border-t border-r border-b">
                    <button
                      onClick={handleToggleMic}
                      className={`p-3 ${isListening ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                      title={isListening ? "Stop recording" : "Record voice"}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      onClick={handleAttachImage}
                      className="p-3 text-gray-500 hover:text-gray-700"
                      title="Upload image"
                    >
                      <Upload size={18} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && !imageFile) || loading}
                      className="bg-blue-600 text-white p-3 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
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
        </div>
      )}
    </div>
  );
};

export default AllieChat;