// src/components/notifications/EmailNotifications.jsx
import React, { useState, useEffect } from 'react';
import { Mail, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EmailNotificationService from '../../services/EmailNotificationService';

const EmailNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load notifications when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      loadNotifications();
    }
  }, [currentUser]);
  
  // Load notifications from service
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const emailNotifications = await EmailNotificationService.getEmailNotifications(currentUser.uid);
      setNotifications(emailNotifications);
    } catch (error) {
      console.error("Error loading email notifications:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark a notification as read
  const handleDismiss = async (notificationId) => {
    try {
      await EmailNotificationService.markNotificationAsRead(notificationId);
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };
  
  // If no notifications and not loading, don't render anything
  if (!loading && notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4 font-roboto">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-3 mb-2 rounded-md flex items-start ${
            notification.type === 'email_processing_error'
              ? 'bg-red-50 border border-red-100'
              : 'bg-yellow-50 border border-yellow-100'
          }`}
        >
          <div className="mt-0.5 mr-2 flex-shrink-0">
            {notification.type === 'email_processing_error' ? (
              <AlertTriangle size={16} className="text-red-500" />
            ) : (
              <Mail size={16} className="text-yellow-500" />
            )}
          </div>
          
          <div className="flex-grow">
            <div className="text-sm font-medium">
              {notification.title || 'Email Notification'}
            </div>
            <div className="text-xs">
              {notification.message || 'There was an issue with an email you sent to Allie.'}
            </div>
            
            {notification.type === 'email_manual_review' && (
              <button className="mt-1 text-xs text-blue-600 underline">
                Review Event
              </button>
            )}
          </div>
          
          <button
            onClick={() => handleDismiss(notification.id)}
            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      
      {loading && (
        <div className="p-3 bg-gray-50 border rounded-md flex items-center">
          <div className="w-4 h-4 border-2 border-t-transparent border-gray-500 rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-gray-500">Loading notifications...</span>
        </div>
      )}
    </div>
  );
};

export default EmailNotifications;