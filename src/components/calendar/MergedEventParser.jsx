import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, X, Clipboard, Upload, Mic, Check, 
  Image, AlertCircle, Info, MapPin, User, Users, 
  Clock, CheckCircle, Edit
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import EventParserService from '../../services/EventParserService';
import CalendarService from '../../services/CalendarService';
import UserAvatar from '../common/UserAvatar';
import { useEvents } from '../../contexts/EventContext';



/**
 * MergedEventParser - A unified component that handles both event parsing and confirmation
 * 
 * This component combines the functionality of EventParserComponent and EventConfirmationCard
 * to provide a seamless workflow for parsing and adding events to the calendar.
 * 
 * @param {Object} props
 * @param {string} props.initialText - Initial text to parse
 * @param {Function} props.onParseSuccess - Callback when an event is successfully parsed and added
 * @param {Function} props.onClose - Callback to close the component
 * @param {string} props.familyId - Family ID for event context
 */
const MergedEventParser = ({ 
  initialText = '', 
  onParseSuccess = null, 
  onClose = null,
  familyId = null 
}) => {
  const { familyMembers, familyId: contextFamilyId } = useFamily();
  const { currentUser } = useAuth();
  
  // Parsing state
  const [inputText, setInputText] = useState(initialText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingStage, setProcessingStage] = useState(null); // 'ocr', 'parsing', 'done'
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Confirmation state
  const [parsedEvent, setParsedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Edit mode for confirmation view
  const [editedEvent, setEditedEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [attendingParent, setAttendingParent] = useState('undecided');
  const [selectedSiblings, setSelectedSiblings] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { addEvent } = useEvents();

  
  // Refs for DOM manipulation
  const fileInputRef = useRef(null);
  const recognition = useRef(null);
  const textareaRef = useRef(null);
  
  // Get family data for easier access
  const effectiveFamilyId = familyId || contextFamilyId;
  const parents = familyMembers.filter(m => m.role === 'parent');
  const children = familyMembers.filter(m => m.role === 'child');

  const [conflictingEvents, setConflictingEvents] = useState([]);
const [familyAvailability, setFamilyAvailability] = useState({});
  
  // Initialize with the provided text if any
  useEffect(() => {
    if (initialText && initialText.trim() !== '') {
      setInputText(initialText);
      
      // If initial text is provided, automatically start parsing
      if (initialText.trim().length > 10) {
        setTimeout(() => {
          handleTextParse();
        }, 500);
      }
    }
  }, [initialText]);
  
  // Initialize speech recognition for voice input
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInputText(transcript);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);
  
  // PARSING FUNCTIONS
  
  // Paste from clipboard helper
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setInputText(clipboardText);
      setImageFile(null);
      setImagePreview(null);
      
      // Focus and scroll to the bottom of textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    } catch (error) {
      console.error("Error accessing clipboard:", error);
      setError("Could not access clipboard. Please paste the text manually.");
    }
  };
  
  // Handle text parsing
  const handleTextParse = async () => {
    if (!inputText.trim() && !imageFile) {
      setError("Please enter invitation text or upload an image");
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStage('parsing');
      
      // Get family context for parsing
      const familyContext = {
        familyId: effectiveFamilyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the text using EventParserService
      const result = await EventParserService.parseEventText(inputText, familyContext);
      
      setParsedEvent(result);
      setProcessingStage('done');
      setIsProcessing(false);
      
      // Pre-select a child if it was identified
      if (result.childId) {
        setAttendingParent(parents[0]?.id || 'undecided');
      }
      
      // Initialize edited event
      setEditedEvent(result);
    } catch (error) {
      console.error("Error parsing event text:", error);
      setError("Could not parse event details. Please try again or enter manually.");
      setProcessingStage(null);
      setIsProcessing(false);
    }
  };
  
  // Handle image parsing
  const handleImageParse = async () => {
    if (!imageFile) {
      setError("Please upload an image first");
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStage('ocr');
      
      // Get family context for parsing
      const familyContext = {
        familyId: effectiveFamilyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the image using EventParserService
      const result = await EventParserService.parseEventImage(imageFile, familyContext);
      
      // If OCR extracted text, show it in the input
      if (result.originalText) {
        setInputText(result.originalText);
      }
      
      setParsedEvent(result);
      setEditedEvent(result);
      setProcessingStage('done');
      setIsProcessing(false);
      
      // Pre-select a child if it was identified
      if (result.childId) {
        setAttendingParent(parents[0]?.id || 'undecided');
      }
    } catch (error) {
      console.error("Error parsing event image:", error);
      setError("Could not extract text from image. Please try again or enter manually.");
      setProcessingStage(null);
      setIsProcessing(false);
    }
  };
  
  // Voice input handler
  const handleVoiceInput = () => {
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
        setError("Speech recognition is not supported in your browser.");
      }
    }
  };
  
  const checkForEventConflicts = async (eventDetails) => {
    if (!eventDetails || !eventDetails.dateTime) return [];
    
    try {
      // Create date range for checking conflicts (2 hours before and after)
      const eventDate = new Date(eventDetails.dateTime);
      const startCheck = new Date(eventDate);
      startCheck.setHours(startCheck.getHours() - 2);
      
      const endCheck = new Date(eventDate);
      endCheck.setHours(endCheck.getHours() + 2);
      
      // Get events in this time range from CalendarService
      const events = await CalendarService.getEventsForUser(
        currentUser.uid,
        startCheck,
        endCheck
      );
      
      // Filter to find events that overlap with our event time
      const conflicts = events.filter(event => {
        // Convert event times to Date objects for comparison
        let eventStart = new Date(event.start?.dateTime || event.date || event.dateTime);
        let eventEnd = new Date(event.end?.dateTime || event.endTime || new Date(eventStart.getTime() + 60 * 60 * 1000));
        
        // If this is the same event, don't mark as conflict
        if (event.id === eventDetails.id) return false;
        
        // Calculate our event end time (assume 1 hour duration if not specified)
        const ourEventEnd = eventDetails.endDateTime ? 
          new Date(eventDetails.endDateTime) : 
          new Date(eventDate.getTime() + 60 * 60 * 1000);
        
        // Check for overlap
        return (eventStart <= ourEventEnd) && (eventEnd >= eventDate);
      });
      
      return conflicts;
    } catch (error) {
      console.error("Error checking for event conflicts:", error);
      return [];
    }
  };
  
  // Add this function to analyze family availability
  const analyzeAvailability = (conflictingEvents, familyMembers) => {
    const availability = {};
    
    // Initialize availability for all family members
    familyMembers.forEach(member => {
      availability[member.id] = {
        available: true,
        conflictingEvent: null
      };
    });
    
    // Check conflicts for each family member
    conflictingEvents.forEach(event => {
      // Check for directly assigned events
      if (event.childId) {
        // Child is not available
        if (availability[event.childId]) {
          availability[event.childId] = {
            available: false,
            conflictingEvent: event
          };
        }
        
        // Attending parent is not available
        if (event.attendingParentId && event.attendingParentId !== 'both' && 
            event.attendingParentId !== 'undecided' && availability[event.attendingParentId]) {
          availability[event.attendingParentId] = {
            available: false,
            conflictingEvent: event
          };
        } else if (event.attendingParentId === 'both') {
          // Both parents are unavailable
          familyMembers.filter(m => m.role === 'parent').forEach(parent => {
            if (availability[parent.id]) {
              availability[parent.id] = {
                available: false,
                conflictingEvent: event
              };
            }
          });
        }
      }
      
      // Check for attendees
      if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(attendee => {
          if (availability[attendee.id]) {
            availability[attendee.id] = {
              available: false,
              conflictingEvent: event
            };
          }
        });
      }
    });
    
    return availability;
  };
  
  // Add this useEffect to check for conflicts when event changes
  useEffect(() => {
    if (parsedEvent) {
      // Check for conflicts
      checkForEventConflicts(parsedEvent).then(conflicts => {
        setConflictingEvents(conflicts);
        
        // Analyze family availability
        const availability = analyzeAvailability(conflicts, familyMembers);
        setFamilyAvailability(availability);
      });
    }
  }, [parsedEvent]);




  // File upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(previewUrl);
        setInputText(''); // Clear text input when uploading an image
      } else {
        setError("Please upload an image file.");
      }
    }
  };
  
  // Remove uploaded image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
  
  // CONFIRMATION FUNCTIONS
  
  // Toggle sibling selection
  const toggleSibling = (siblingId) => {
    setSelectedSiblings(prev => {
      if (prev.includes(siblingId)) {
        return prev.filter(id => id !== siblingId);
      } else {
        return [...prev, siblingId];
      }
    });
  };
  
  // Handle editing
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  // Handle input changes in edit mode
  const handleInputChange = (field, value) => {
    setEditedEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Reset the entire form
  const resetForm = () => {
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setParsedEvent(null);
    setEditedEvent(null);
    setError(null);
    setProcessingStage(null);
    setShowSuccess(false);
    setAttendingParent('undecided');
    setSelectedSiblings([]);
  };
  
  // Handle cancellation
  const handleCancel = () => {
    resetForm();
    
    // Close the component if close handler is provided
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };
  
  // Handle event save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!editedEvent) {
        setError("No event data to save");
        setSaving(false);
        return;
      }
      
      if (!editedEvent.title) {
        setError("Please provide an event title");
        setSaving(false);
        return;
      }
      
      // Get current user ID
      const currentUserId = currentUser?.uid;
      
      if (!currentUserId) {
        setError("You must be logged in to add events to the calendar");
        setSaving(false);
        return;
      }
      
      // Update with attending parent selection
      const finalEvent = {
        ...editedEvent,
        attendingParentId: attendingParent,
        familyId: effectiveFamilyId,
        userId: currentUserId,
        source: 'parser'
      };
      
      // Only add siblingIds if siblings are selected
      if (selectedSiblings && selectedSiblings.length > 0) {
        finalEvent.siblingIds = selectedSiblings;
        
        // Add siblings' names for display purposes
        finalEvent.siblingNames = selectedSiblings.map(sibId => {
          const sibling = children.find(c => c.id === sibId);
          return sibling ? sibling.name : '';
        }).filter(Boolean);
      }
      
      // Convert to standard calendar event format
      let calendarEvent = {
        summary: finalEvent.title,
        title: finalEvent.title,
        description: finalEvent.description || `Event for ${finalEvent.childName || 'family'}`,
        location: finalEvent.location || '',
        start: {
          dateTime: new Date(finalEvent.dateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date(finalEvent.dateTime).getTime() + 3600000).toISOString(), // Add 1 hour
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Add all metadata
        category: finalEvent.eventType || 'event',
        childId: finalEvent.childId,
        childName: finalEvent.childName,
        eventType: finalEvent.eventType || 'general',
        extraDetails: finalEvent.extraDetails || {},
        attendingParentId: finalEvent.attendingParentId,
        familyId: effectiveFamilyId,
        siblingIds: finalEvent.siblingIds,
        siblingNames: finalEvent.siblingNames,
        source: finalEvent.source,
        originalText: finalEvent.originalText,
        hostParent: finalEvent.hostParent || ''
      };
      
      // Clean the object - remove any undefined values
      calendarEvent = Object.fromEntries(
        Object.entries(calendarEvent).filter(([_, value]) => value !== undefined)
      );
      
      // Add the event to the calendar
      const result = await addEvent(calendarEvent);
      
      // If siblings are selected, create separate events for them too
      if (selectedSiblings && selectedSiblings.length > 0 && result.success) {
        for (const siblingId of selectedSiblings) {
          const sibling = children.find(c => c.id === siblingId);
          if (sibling) {
            let siblingEvent = {
              ...calendarEvent,
              childId: siblingId,
              childName: sibling.name,
              summary: calendarEvent.summary.replace(finalEvent.childName || '', sibling.name),
              title: calendarEvent.title.replace(finalEvent.childName || '', sibling.name),
              linkedToEventId: result.firestoreId,
              universalId: result.universalId + `-sibling-${siblingId}`,
              // Don't include siblingIds in the sibling's own event
              siblingIds: undefined,
              siblingNames: undefined
            };
            
            // Clean the object
            siblingEvent = Object.fromEntries(
              Object.entries(siblingEvent).filter(([_, value]) => value !== undefined)
            );
            
            await CalendarService.addEvent(siblingEvent, currentUserId);
          }
        }
      }
      
      if (result.success) {
        // Dispatch a force refresh event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          if (onParseSuccess && typeof onParseSuccess === 'function') {
            onParseSuccess({
              ...finalEvent,
              firestoreId: result.firestoreId,
              universalId: result.universalId,
              id: result.eventId || result.firestoreId || result.universalId
            });
          }
          
          // Reset form after success
          resetForm();
        }, 1500);
      } else {
        setError(result.error || "Failed to save event");
      }
      
      setSaving(false);
    } catch (error) {
      console.error("Error saving event:", error);
      setError("An error occurred while saving the event");
      setSaving(false);
    }
  };
  
  // Format helpers
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Get badge for event type
  const getEventTypeBadge = () => {
    const eventType = editedEvent?.eventType || 'event';
    const typeConfig = {
      'birthday': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Birthday', icon: '🎂' },
      'doctor': { bg: 'bg-red-100', text: 'text-red-800', label: 'Doctor', icon: '👨‍⚕️' },
      'dental': { bg: 'bg-red-100', text: 'text-red-800', label: 'Dental', icon: '🦷' },
      'playdate': { bg: 'bg-green-100', text: 'text-green-800', label: 'Playdate', icon: '👭' },
      'sports': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sports', icon: '🏀' },
      'music': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Music', icon: '🎵' },
      'dance': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Dance', icon: '💃' },
      'school': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'School', icon: '🏫' },
      'art': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Art', icon: '🎨' },
      'coding': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Coding', icon: '💻' },
      'tutoring': { bg: 'bg-lime-100', text: 'text-lime-800', label: 'Tutoring', icon: '📚' },
      'camp': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Camp', icon: '⛺' },
      'sleepover': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Sleepover', icon: '🛌' },
      'family': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Family', icon: '👪' },
      'religious': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Religious', icon: '🙏' },
      'community': { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Community', icon: '🌱' },
      'appointment': { bg: 'bg-red-100', text: 'text-red-800', label: 'Appointment', icon: '🩺' },
      'event': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Event', icon: '📅' }
    };
    
    const config = typeConfig[eventType] || typeConfig['event'];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };
  
  // Examples of invitations to help users
  const exampleInvites = [
    {
      language: 'English (US)',
      text: "Hey! My son John is having his 7th birthday party on 4/12 at 2:00 PM at Pizza Palace (123 Main St). Please let me know if Tommy can come!"
    },
    {
      language: 'Swedish',
      text: "Hej! Välkommen på kalas för Anna som fyller 6 år den 12/4 kl. 14.00. Vi firar på Laserdome, Instrumentvägen 25. Hälsningar från familjen Andersson"
    },
    {
      language: 'English (Forwarded Invitation)',
      text: "Hey Stefan - I want to invite Tegner to a birthday party!! He is invited to John's 9th birthday party!! The party is at Skrappen on April 10th. The party starts at 4pm. The party is a dress up party with the theme of cowboys!"
    }
  ];
  
  return (
    <div className="bg-white rounded-lg shadow-md font-roboto">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center">
          <Calendar size={20} className="mr-2" />
          {parsedEvent ? 'Confirm Event Details' : 'Add Event from Message'}
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowInstructions(!showInstructions)}
            className="p-1 rounded-full hover:bg-gray-100"
            title="Show instructions"
          >
            <Info size={18} />
          </button>
          {onClose && (
            <button 
              onClick={handleCancel}
              className="p-1 rounded-full hover:bg-gray-100"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      
      {showInstructions && (
        <div className="p-4 bg-blue-50 text-sm">
          <p className="font-medium mb-2">How to use:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Paste an invitation text from a messaging app, or upload a screenshot</li>
            <li>Allie will automatically detect the event details (date, time, location)</li>
            <li>Review the extracted information and make any corrections</li>
            <li>Select which parent will attend with your child</li>
            <li>Save to your family calendar</li>
          </ol>
          <div className="mt-3">
            <p className="font-medium mb-1">Examples of invitations Allie can parse:</p>
            <div className="space-y-2 mt-2">
              {exampleInvites.map((example, index) => (
                <div key={index} className="bg-white p-2 rounded border text-xs">
                  <p className="font-medium mb-1">{example.language}:</p>
                  <p className="italic">{example.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PARSING VIEW */}
      {!parsedEvent ? (
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Paste invitation or event message
            </label>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste invitation text here..."
              className="w-full border rounded p-3 min-h-[120px] text-sm focus:ring-1 focus:ring-blue-500"
              disabled={isProcessing || isListening}
            ></textarea>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={handlePasteFromClipboard}
              className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              <Clipboard size={16} className="mr-1" />
              Paste from Clipboard
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              <Upload size={16} className="mr-1" />
              Upload Screenshot
            </button>
            
            <button
              onClick={handleVoiceInput}
              className={`flex items-center px-3 py-2 rounded-md text-sm ${
                isListening ? 'bg-red-100 text-red-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Mic size={16} className="mr-1" />
              {isListening ? 'Stop Listening' : 'Voice Input'}
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          {imagePreview && (
            <div className="mb-4 relative">
              <div className="w-full max-h-64 overflow-hidden rounded-md border">
                <img 
                  src={imagePreview} 
                  alt="Screenshot preview" 
                  className="w-full object-contain"
                />
              </div>
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={handleRemoveImage}
                  className="bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          
          {isListening && (
            <div className="mb-4 p-2 bg-red-50 rounded-md text-red-700 text-sm flex items-center">
              <Mic size={16} className="mr-1" />
              Listening... speak now
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin mr-2"></div>
                {processingStage === 'ocr' ? 'Reading text from image...' : 'Analyzing invitation details...'}
              </div>
              <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 animate-pulse"
                  style={{ width: processingStage === 'ocr' ? '40%' : '80%' }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={imageFile ? handleImageParse : handleTextParse}
              disabled={(!inputText.trim() && !imageFile) || isProcessing}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-2" />
                  Parse Event
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        // CONFIRMATION VIEW
        <div className="p-4">
          <div className="mb-3 flex items-center">
            <CheckCircle size={18} className="mr-2 text-green-500" />
            <h3 className="text-lg font-medium">Event Details {getEventTypeBadge()}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between">
                <h4 className="font-medium text-lg mb-2">{editedEvent?.title}</h4>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
              
              {!isEditing ? (
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-start">
                    <Clock size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Date & Time</div>
                      <div className="text-sm">{formatDate(editedEvent?.dateTime)}</div>
                      <div className="text-sm">{formatTime(editedEvent?.dateTime)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Location</div>
                      <div className="text-sm">{editedEvent?.location || 'No location specified'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <User size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">For Child</div>
                      <div className="text-sm">{editedEvent?.childName || 'Unknown child'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Users size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Host</div>
                      <div className="text-sm">{editedEvent?.hostParent || 'No host information'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                // Edit mode form
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Event Title</label>
                    <input
                      type="text"
                      value={editedEvent?.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder="e.g., Birthday Party, Soccer Practice"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={editedEvent?.dateTime ? new Date(editedEvent.dateTime).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = new Date(editedEvent?.dateTime || new Date());
                          const newDate = new Date(e.target.value);
                          date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                          handleInputChange('dateTime', date.toISOString());
                        }}
                        className="w-full border rounded p-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <input
                        type="time"
                        value={editedEvent?.dateTime ? new Date(editedEvent.dateTime).toTimeString().slice(0, 5) : ''}
                        onChange={(e) => {
                          const date = new Date(editedEvent?.dateTime || new Date());
                          const [hours, minutes] = e.target.value.split(':');
                          date.setHours(hours, minutes);
                          handleInputChange('dateTime', date.toISOString());
                        }}
                        className="w-full border rounded p-2 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={editedEvent?.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder="e.g., Laserdome, Pizza Palace"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">For Child</label>
                    <select
                      value={editedEvent?.childId || ''}
                      onChange={(e) => {
                        const child = children.find(c => c.id === e.target.value);
                        handleInputChange('childId', e.target.value);
                        handleInputChange('childName', child ? child.name : '');
                      }}
                      className="w-full border rounded p-2 text-sm"
                    >
                      <option value="">Select child</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Host</label>
                    <input
                      type="text"
                      value={editedEvent?.hostParent || ''}
                      onChange={(e) => handleInputChange('hostParent', e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder="e.g., Emma's mom"
                    />
                  </div>
                  
                  {editedEvent?.eventType === 'birthday' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Birthday Child's Name</label>
                        <input
                          type="text"
                          value={editedEvent?.extraDetails?.birthdayChildName || ''}
                          onChange={(e) => setEditedEvent(prev => ({
                            ...prev,
                            extraDetails: {
                              ...prev?.extraDetails,
                              birthdayChildName: e.target.value
                            }
                          }))}
                          className="w-full border rounded p-2 text-sm"
                          placeholder="e.g., Emma"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Age</label>
                        <input
                          type="number"
                          value={editedEvent?.extraDetails?.birthdayChildAge || ''}
                          onChange={(e) => setEditedEvent(prev => ({
                            ...prev,
                            extraDetails: {
                              ...prev?.extraDetails,
                              birthdayChildAge: e.target.value ? parseInt(e.target.value) : ''
                            }
                          }))}
                          className="w-full border rounded p-2 text-sm"
                          placeholder="e.g., 8"
                          min="1"
                          max="18"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={editedEvent?.extraDetails?.notes || ''}
                      onChange={(e) => setEditedEvent(prev => ({
                        ...prev,
                        extraDetails: {
                          ...prev?.extraDetails,
                          notes: e.target.value
                        }
                      }))}
                      className="w-full border rounded p-2 text-sm min-h-[80px]"
                      placeholder="e.g., Bring socks, will have cake"
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50 mr-2"
                    >
                      <X size={14} className="mr-1 inline" />
                      Cancel
                    </button>
                    
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                    >
                      <CheckCircle size={14} className="mr-1 inline" />
                      Update
                    </button>
                  </div>
                </div>
              )}
              
              {editedEvent?.eventType === 'birthday' && editedEvent?.extraDetails && !isEditing && (
                <div className="mt-3 p-2 bg-purple-50 rounded-md text-sm">
                  <div className="font-medium text-purple-800">Birthday Details</div>
                  <div className="text-purple-800">
                    {editedEvent.extraDetails.birthdayChildName || 'Child'} is turning {' '}
                    {editedEvent.extraDetails.birthdayChildAge || '?'}
                  </div>
                </div>
              )}
              
              {editedEvent?.extraDetails?.notes && !isEditing && (
                <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                  <div className="font-medium text-sm text-yellow-800">Notes</div>
                  <div className="text-sm text-yellow-800">{editedEvent.extraDetails.notes}</div>
                </div>
              )}
            </div>
            
            {/* Parent Selection */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="font-medium mb-2">Who will take {editedEvent?.childName || 'the child'}?</div>
              
              <div className="flex flex-wrap gap-2">
                {parents.map(parent => (
                  <button
                    key={parent.id}
                    onClick={() => setAttendingParent(parent.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      attendingParent === parent.id 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {parent.name || parent.roleType}
                  </button>
                ))}
                
                <button
                  onClick={() => setAttendingParent('both')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    attendingParent === 'both' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  Both Parents
                </button>
                
                <button
                  onClick={() => setAttendingParent('undecided')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    attendingParent === 'undecided' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  Decide Later
                </button>
              </div>
            </div>
            
            {/* Sibling Selection */}
            {children.filter(c => c.id !== editedEvent?.childId).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="font-medium mb-2">Include siblings?</div>
                
                <div className="flex flex-wrap gap-2">
                  {children.filter(c => c.id !== editedEvent?.childId).map(sibling => (
                    <button
                      key={sibling.id}
                      onClick={() => toggleSibling(sibling.id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedSiblings.includes(sibling.id) 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      {sibling.name}
                      {selectedSiblings.includes(sibling.id) && 
                        <CheckCircle size={12} className="ml-1 inline" />
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
                <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-3">
              <button
                onClick={handleCancel}
                className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Saving...
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
      
      {/* Success animation */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
          <div className="bg-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ease-out scale-100 opacity-100 animate-bounce">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Event Added!</h3>
              <p className="text-sm text-gray-500">Successfully added to your calendar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MergedEventParser;