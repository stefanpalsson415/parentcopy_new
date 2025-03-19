import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import CalendarService from '../../services/CalendarService';

const CalendarIntegrationButton = ({ item, itemType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  // Check if user is signed in to Google
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        // Initialize Google API
        await CalendarService.initialize();
        setIsSignedIn(CalendarService.isSignedIn());
      } catch (error) {
        console.error("Error checking Google auth:", error);
      }
    };
    
    checkGoogleAuth();
  }, []);
  
  // Handle adding to calendar
  const handleAddToCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure we're signed in
      if (!isSignedIn) {
        await CalendarService.signIn();
        setIsSignedIn(true);
      }
      
      // Create event based on item type
      let event;
      if (itemType === 'task') {
        event = CalendarService.createEventFromTask(item);
      } else if (itemType === 'meeting') {
        event = CalendarService.createFamilyMeetingEvent(item.weekNumber, item.date);
      } else {
        throw new Error("Unknown item type");
      }
      
      // Add to calendar
      const result = await CalendarService.addEvent(event);
      console.log("Event added to calendar:", result);
      
      // Mark as added
      setIsAdded(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 3000);
    } catch (error) {
      console.error("Error adding to calendar:", error);
      setError(error.message || "Failed to add to calendar");
      
      // Reset error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleAddToCalendar}
      disabled={isLoading || isAdded}
      className={`flex items-center text-xs px-2 py-1 rounded ${
        isAdded 
          ? 'bg-green-100 text-green-700'
          : error
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {isLoading ? (
        <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin mr-1"></div>
      ) : isAdded ? (
        <Check size={12} className="mr-1" />
      ) : error ? (
        <AlertCircle size={12} className="mr-1" />
      ) : (
        <Calendar size={12} className="mr-1" />
      )}
      
      {isAdded 
        ? 'Added!' 
        : error
          ? 'Error'
          : 'Add to Calendar'}
    </button>
  );
};

export default CalendarIntegrationButton;