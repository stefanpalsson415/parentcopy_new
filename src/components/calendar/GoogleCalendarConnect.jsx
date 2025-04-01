// src/components/calendar/GoogleCalendarConnect.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, Lock } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';

const GoogleCalendarConnect = ({ onSuccess, buttonText = "Connect Calendar", showExplanation = true }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('initial'); // 'initial', 'connecting', 'connected', 'error'
  
  // Check if already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!currentUser) return;
      
      try {
        // Set a flag in localStorage to prevent multiple checks
        const lastCheck = localStorage.getItem('gcalCheckTimestamp');
        if (lastCheck && Date.now() - parseInt(lastCheck) < 60000) { // Only check once per minute
          const savedStatus = localStorage.getItem('gcalConnected');
          if (savedStatus === 'true') {
            setIsConnected(true);
            setConnectionStatus('connected');
            return;
          }
        }
        
        // Update check timestamp
        localStorage.setItem('gcalCheckTimestamp', Date.now().toString());
        
        // Use a more resilient approach to check connection
        try {
          await CalendarService.initializeGoogleCalendar();
          const signedIn = CalendarService.isSignedInToGoogle();
          
          setIsConnected(signedIn);
          setConnectionStatus(signedIn ? 'connected' : 'initial');
          localStorage.setItem('gcalConnected', signedIn.toString());
          
          if (signedIn && onSuccess) {
            onSuccess(true);
          }
        } catch (error) {
          console.log("Calendar connection check failed, assuming not connected");
          setIsConnected(false);
          setConnectionStatus('initial');
        }
      } catch (error) {
        console.error("Error in calendar connection check:", error);
        // Don't show error to user for initial check
      }
    };
    
    checkConnection();
  }, [currentUser, onSuccess]);
  
  const handleConnect = async () => {
    if (isLoading || connectionStatus === 'connecting') return;
    
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      // Initialize Google Calendar
      await CalendarService.initializeGoogleCalendar();
      
      // Then attempt to sign in
      const result = await CalendarService.signInToGoogle();
      
      setIsConnected(true);
      setConnectionStatus('connected');
      localStorage.setItem('gcalConnected', 'true');
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess(true);
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      
      // More user-friendly error messages
      let errorMessage = "Couldn't connect to Google Calendar";
      
      if (error.message && error.message.includes("popup")) {
        errorMessage = "Please allow popups for this site to connect Google Calendar";
      } else if (error.message && error.message.includes("access_denied")) {
        errorMessage = "You declined Google Calendar access. Please try again and allow access.";
      }
      
      setError(errorMessage);
      setConnectionStatus('error');
      
      // Call onSuccess callback with false to indicate failure
      if (onSuccess) onSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render different button states
  const renderButton = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="p-2 bg-green-50 rounded-lg border border-green-200 flex items-center">
            <Check size={16} className="text-green-600 mr-2" />
            <span className="text-sm text-green-700 font-roboto">Calendar connected successfully!</span>
          </div>
        );
        
      case 'connecting':
        return (
          <button 
            disabled={true}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="font-roboto text-sm">Connecting...</span>
          </button>
        );
        
      case 'error':
        return (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            <AlertCircle size={16} className="mr-2" />
            <span className="font-roboto text-sm">Try Again</span>
          </button>
        );
        
      default:
        return (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          >
            <Calendar size={16} className="mr-2" />
            <span className="font-roboto text-sm">{buttonText}</span>
          </button>
        );
    }
  };
  
  return (
    <div className="w-full">
      {showExplanation && connectionStatus !== 'connected' && (
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
      
      {renderButton()}
      
      {connectionStatus !== 'connected' && (
        <p className="text-xs text-gray-500 mt-2 flex items-center justify-center font-roboto">
          <Lock size={10} className="mr-1" />
          Your information is kept private
        </p>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;