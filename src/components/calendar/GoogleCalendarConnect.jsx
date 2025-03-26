import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';

const GoogleCalendarConnect = ({ onSuccess, buttonText = "Connect Calendar", showExplanation = true }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (currentUser) {
        try {
          await CalendarService.initializeGoogleCalendar();
          const signedIn = CalendarService.isSignedInToGoogle();
          setIsConnected(signedIn);
        } catch (error) {
          console.error("Error checking Google Calendar connection:", error);
        }
      }
    };
    
    checkConnection();
  }, [currentUser]);
  
  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await CalendarService.signInToGoogle();
      setIsConnected(true);
      
      // Load available calendars
      const calendars = await CalendarService.listUserCalendars();
      console.log("Available calendars:", calendars);
      
      // Update calendar settings
      if (currentUser) {
        const settings = await CalendarService.loadUserCalendarSettings(currentUser.uid) || {};
        await CalendarService.saveUserCalendarSettings(currentUser.uid, {
          ...settings,
          defaultCalendarType: 'google',
          googleCalendar: {
            enabled: true,
            calendarId: 'primary'
          }
        });
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess(true);
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      setError(error.message || "Failed to connect. Please try again.");
      
      // Call onSuccess callback with false to indicate failure
      if (onSuccess) onSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full">
      {showExplanation && !isConnected && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Calendar className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-sm text-blue-700 font-roboto">
              Connect to Google Calendar to sync family meetings, tasks, and important dates automatically.
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start">
            <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-sm text-red-700 font-roboto">{error}</p>
          </div>
        </div>
      )}
      
      {isConnected ? (
        <div className="p-2 bg-green-50 rounded-lg border border-green-200 flex items-center">
          <Check size={16} className="text-green-600 mr-2" />
          <span className="text-sm text-green-700 font-roboto">Calendar connected successfully!</span>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className={`w-full flex items-center justify-center p-2 rounded-lg ${
            isLoading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="font-roboto text-sm">Connecting...</span>
            </>
          ) : (
            <>
              <Calendar size={16} className="mr-2" />
              <span className="font-roboto text-sm">{buttonText}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;