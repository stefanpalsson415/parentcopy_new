// src/components/settings/EmailSettingsCard.jsx
import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, Settings, AlertTriangle, Clock } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import EmailIngestService from '../../services/EmailIngestService';

const EmailSettingsCard = () => {
  const { familyId, familyMembers } = useFamily();
  const [familyEmail, setFamilyEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    sendConfirmations: true,
    allowAutoCreateEvents: true,
    allowedSenders: []
  });
  const [emailHistory, setEmailHistory] = useState([]);
  
  // Load email settings and history
  useEffect(() => {
    if (familyId) {
      setLoading(true);
      
      Promise.all([
        EmailIngestService.getPersonalizedEmailAddress(familyId),
        EmailIngestService.getEmailSettings(familyId),
        EmailIngestService.getEmailHistory(familyId, 5)
      ])
        .then(([email, settings, history]) => {
          setFamilyEmail(email);
          setEmailSettings(settings);
          setEmailHistory(history);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error loading email settings:", error);
          setLoading(false);
        });
    }
  }, [familyId]);

  // Handle copying email to clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(familyEmail)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(error => {
        console.error("Error copying to clipboard:", error);
      });
  };
  
  // Handle toggling settings
  const handleToggleSetting = (setting) => {
    const updatedSettings = {
      ...emailSettings,
      [setting]: !emailSettings[setting]
    };
    
    setEmailSettings(updatedSettings);
    
    // Save settings
    EmailIngestService.updateEmailSettings(familyId, updatedSettings)
      .catch(error => {
        console.error("Error updating email settings:", error);
        // Revert on error
        setEmailSettings(emailSettings);
      });
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-white">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg shadow-sm bg-white font-roboto">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center">
          <Mail size={18} className="mr-2" />
          Email to Calendar
        </h3>
        <div className="flex items-center text-sm text-gray-500">
          <Settings size={14} className="mr-1" />
          Settings
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Family Email Address</label>
          <div className="flex">
            <div className="flex-grow bg-gray-50 border rounded-l p-2 text-sm truncate">
              {familyEmail || 'Loading...'}
            </div>
            <button
              onClick={handleCopyEmail}
              className="bg-black text-white px-3 py-2 rounded-r flex items-center text-sm"
            >
              {copied ? (
                <>
                  <Check size={14} className="mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Send emails to this address to automatically add events to your family calendar.
          </p>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Email-to-Calendar</div>
              <div className="text-xs text-gray-500">Allow creating events from emails</div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="enable"
                id="enable"
                checked={emailSettings.enabled}
                onChange={() => handleToggleSetting('enabled')}
                className="checked:bg-black outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label
                htmlFor="enable"
                className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                  emailSettings.enabled ? 'bg-black' : ''
                }`}
              ></label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Email Confirmations</div>
              <div className="text-xs text-gray-500">Send confirmation after processing</div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="confirm"
                id="confirm"
                checked={emailSettings.sendConfirmations}
                onChange={() => handleToggleSetting('sendConfirmations')}
                className="checked:bg-black outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label
                htmlFor="confirm"
                className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                  emailSettings.sendConfirmations ? 'bg-black' : ''
                }`}
              ></label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Auto-Create Events</div>
              <div className="text-xs text-gray-500">Create events without confirmation</div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="auto"
                id="auto"
                checked={emailSettings.allowAutoCreateEvents}
                onChange={() => handleToggleSetting('allowAutoCreateEvents')}
                className="checked:bg-black outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label
                htmlFor="auto"
                className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                  emailSettings.allowAutoCreateEvents ? 'bg-black' : ''
                }`}
              ></label>
            </div>
          </div>
        </div>
        
        {/* Email History */}
        {emailHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Clock size={14} className="mr-1" />
              Recent Email History
            </h4>
            <div className="border rounded overflow-hidden">
              {emailHistory.map((item, index) => (
                <div 
                  key={item.id}
                  className={`text-sm p-2 flex items-start ${
                    index !== emailHistory.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0 ${
                    item.processingResult?.eventCreated 
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  }`}></div>
                  <div className="flex-grow">
                    <div className="font-medium truncate">{item.subject}</div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{item.from}</span>
                      <span>{formatDate(item.processedAt || item.receivedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {emailHistory.length === 0 && (
          <div className="text-center p-4 border rounded-md bg-gray-50">
            <Mail size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No email history yet</p>
            <p className="text-xs text-gray-400">
              Send an email to your family address to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSettingsCard;