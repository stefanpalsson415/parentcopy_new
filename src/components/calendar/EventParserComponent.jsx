// src/components/calendar/EventParserComponent.jsx
import React, { useState, useRef } from 'react';
import { Clipboard, Upload, Mic, X, Calendar, Check } from 'lucide-react';
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
  
  const fileInputRef = useRef(null);
  const recognition = useRef(null);
  
  // Initialize speech recognition
  React.useEffect(() => {
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
  
  const handleTextParse = async () => {
    if (!inputText.trim()) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Get family context for parsing
      const familyContext = {
        familyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the text using EventParserService
      const result = await EventParserService.parseEventText(inputText, familyContext);
      
      setParsedEvent(result);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error parsing event text:", error);
      setError("Could not parse event details. Please try again or enter manually.");
      setIsProcessing(false);
    }
  };
  
  const handleImageParse = async () => {
    if (!imageFile) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Get family context for parsing
      const familyContext = {
        familyId,
        children: familyMembers.filter(m => m.role === 'child')
      };
      
      // Parse the image using EventParserService
      const result = await EventParserService.parseEventImage(imageFile, familyContext);
      
      setParsedEvent(result);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error parsing event image:", error);
      setError("Could not extract text from image. Please try again or enter manually.");
      setIsProcessing(false);
    }
  };
  
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
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(previewUrl);
      } else {
        setError("Please upload an image file.");
      }
    }
  };
  
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
  
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardData = await navigator.clipboard.readText();
      setInputText(clipboardData);
    } catch (error) {
      console.error("Error accessing clipboard:", error);
      setError("Could not access clipboard. Please paste the text manually.");
    }
  };
  
  const resetForm = () => {
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setParsedEvent(null);
    setError(null);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow font-roboto">
      <h3 className="text-lg font-medium mb-3">Add Event from Message</h3>
      
      {!parsedEvent ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Paste invitation text or upload screenshot
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste invitation text here..."
              className="w-full border rounded p-2 min-h-[100px] text-sm focus:ring-1 focus:ring-blue-500"
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
              <div className="w-full max-h-60 overflow-hidden rounded-md">
                <img src={imagePreview} alt="Screenshot preview" className="w-full object-contain" />
              </div>
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                title="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
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
        </>
      ) : (
        <EventConfirmationCard 
          event={parsedEvent} 
          onConfirm={() => {/* Handle confirmation */}}
          onEdit={(updatedEvent) => setParsedEvent(updatedEvent)}
          onCancel={resetForm}
        />
      )}
    </div>
  );
};

export default EventParserComponent;