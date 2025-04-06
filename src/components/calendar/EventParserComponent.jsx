// src/components/calendar/EventParserComponent.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Upload, Mic, X, Calendar, Check, Image, AlertCircle, Info } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import EventParserService from '../../services/EventParserService';
import EventConfirmationCard from './EventConfirmationCard';

const EventParserComponent = () => {
  const { familyId, familyMembers, selectedUser } = useFamily();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedEvent, setParsedEvent] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingStage, setProcessingStage] = useState(null); // 'ocr', 'parsing', 'done'
  const [showInstructions, setShowInstructions] = useState(false);
  
  const fileInputRef = useRef(null);
  const recognition = useRef(null);
  const textareaRef = useRef(null);
  
  // Initialize speech recognition
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
        familyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the text using EventParserService
      const result = await EventParserService.parseEventText(inputText, familyContext);
      
      setParsedEvent(result);
      setProcessingStage('done');
      setIsProcessing(false);
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
        familyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the image using EventParserService
      const result = await EventParserService.parseEventImage(imageFile, familyContext);
      
      // If OCR extracted text, show it in the input
      if (result.originalText) {
        setInputText(result.originalText);
      }
      
      setParsedEvent(result);
      setProcessingStage('done');
      setIsProcessing(false);
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
  
  // Reset form
  const resetForm = () => {
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setParsedEvent(null);
    setError(null);
    setProcessingStage(null);
  };
  
  // Handle event edited/updated from confirmation card
  const handleEventEdit = (updatedEvent) => {
    setParsedEvent(updatedEvent);
  };
  
  // Handle event confirmation
  const handleEventConfirm = () => {
    resetForm();
    // Show success message or redirect to calendar
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
    }
  ];
  
  return (
    <div className="bg-white rounded-lg shadow-md font-roboto">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center">
          <Calendar size={20} className="mr-2" />
          Add Event from Message
        </h3>
        <button 
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <Info size={18} />
        </button>
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
        <EventConfirmationCard 
          event={parsedEvent} 
          onConfirm={handleEventConfirm}
          onEdit={handleEventEdit}
          onCancel={resetForm}
          familyId={familyId}
        />
      )}
    </div>
  );
};

export default EventParserComponent;