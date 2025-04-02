import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, User, Users, Home } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import DatabaseService from '../../services/DatabaseService';
import CalendarService from '../../services/CalendarService';
import { Calendar, Download, ChevronDown, ChevronUp, Settings, Globe, Check, Apple } from 'lucide-react';

const UserSettingsScreen = ({ onClose }) => {
  const { 
    selectedUser, 
    familyMembers, 
    familyName,
    familyId,
    updateMemberProfile, 
    updateFamilyName,
    updateFamilyPicture
  } = useFamily();
  
  const { currentUser, logout } = useAuth();
  
  const [newFamilyName, setNewFamilyName] = useState(familyName || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'profile' or 'family'
  const [uploadError, setUploadError] = useState(null);
  const [settingsTab, setSettingsTab] = useState('profile'); // 'profile', 'family', 'app', or 'calendar'
  const [uploadForMember, setUploadForMember] = useState(null);

  // Handler for family name update
  const handleFamilyNameUpdate = async () => {
    if (newFamilyName.trim() === '') return;
    
    try {
      await updateFamilyName(newFamilyName);
      // Update document title with family name
      document.title = `${newFamilyName} Family Allie`;
    } catch (error) {
      console.error("Error updating family name:", error);
      alert("Failed to update family name. Please try again.");
    }
  };
  
  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      if (uploadType === 'profile') {
        // Upload profile picture
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error("File size exceeds 5MB limit");
        }
        
        const imageUrl = await readFileAsDataURL(file);
        await updateMemberProfile(selectedUser.id, { 
          profilePicture: imageUrl 
        });
      } else if (uploadType === 'family') {
        // For family picture, use Firebase Storage
        if (!familyId) {
          throw new Error("Family ID is required to upload family picture");
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert("File is too large. Please select a file under 10MB.");
          return;
        }
        
        // Use the dedicated method for uploading family pictures
        const downloadURL = await DatabaseService.uploadFamilyPicture(familyId, file);
        
        // Update family picture in context
        await updateFamilyPicture(downloadURL);
        
        // Update favicon
        updateFavicon(downloadURL);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(error.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };
  
  // Read file as data URL (for preview and simple storage)
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };
  
  const CalendarSettingsTab = ({ userId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [calendarSettings, setCalendarSettings] = useState(null);
    const [activeCalendarType, setActiveCalendarType] = useState('allie');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ type: '', message: '' });
    
    // Load calendar settings on component mount
    useEffect(() => {
      const loadSettings = async () => {
        if (!userId) {
          setIsLoading(false);
          return;
        }
        
        try {
          // Load user's calendar settings
          const settings = await CalendarService.loadUserCalendarSettings(userId);
          setCalendarSettings(settings);
          setActiveCalendarType('allie'); // Always use Allie calendar
          
        } catch (error) {
          console.error("Error loading calendar settings:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadSettings();
    }, [userId]);
    
    // Save calendar settings
    const saveCalendarSettings = async () => {
      if (!userId) return;
      
      setIsSaving(true);
      setSaveMessage({ type: '', message: '' });
      
      try {
        // Prepare updated settings
        const updatedSettings = {
          ...calendarSettings,
          defaultCalendarType: 'allie',
          allieCalendar: {
            enabled: true
          }
        };
        
        // Save to Firebase
        await CalendarService.saveUserCalendarSettings(userId, updatedSettings);
        setCalendarSettings(updatedSettings);
        
        // Create a visible success notification
        setSaveMessage({
          type: 'success',
          message: 'Calendar settings saved successfully'
        });
        
        // Use React state to handle button success state instead of direct DOM manipulation
        setIsSaving(false);
        
        // Clear message after delay using a safe approach
        const messageTimer = setTimeout(() => {
          setSaveMessage({ type: '', message: '' });
        }, 5000);
        
        // Clean up the timer if component unmounts
        return () => clearTimeout(messageTimer);
      } catch (error) {
        console.error("Error saving calendar settings:", error);
        setSaveMessage({
          type: 'error',
          message: 'Failed to save calendar settings: ' + error.message
        });
        setIsSaving(false);
      }
    };
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
          <div className="flex items-start">
            <Calendar className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={22} />
            <div>
              <h4 className="font-medium text-blue-800 font-roboto">How Calendar Integration Works</h4>
              <p className="text-sm text-blue-700 mt-1 font-roboto">
                Allie helps you keep track of family meetings, tasks, and events in one place
                to better manage your family schedule and send helpful reminders.
              </p>
            </div>
          </div>
        </div>
        
        {/* Allie Calendar Settings */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Allie Calendar Settings</h4>
          
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Allie provides a simple calendar system to help you track important family events and tasks.
            </p>
            
            <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
              <p className="flex items-center">
                <Check size={16} className="mr-2" />
                Allie Calendar is enabled
              </p>
            </div>
          </div>
        </div>
        
        {/* ICS Download Settings */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Calendar Download</h4>
          
          <p className="text-sm text-gray-600 mb-4">
            You can download calendar files (.ics) for any event to import into your preferred calendar application.
          </p>
          
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <p>
              After downloading, open the .ics file with your preferred calendar application to add the event.
            </p>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Calendar Notifications</h4>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 mr-2"
                checked={calendarSettings?.notifications?.taskReminders}
                onChange={(e) => setCalendarSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev?.notifications,
                    taskReminders: e.target.checked
                  }
                }))}
              />
              <span className="text-sm">Include reminders for tasks</span>
            </label>
            
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 mr-2"
                checked={calendarSettings?.notifications?.meetingReminders}
                onChange={(e) => setCalendarSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev?.notifications,
                    meetingReminders: e.target.checked
                  }
                }))}
              />
              <span className="text-sm">Include reminders for family meetings</span>
            </label>
            
            <div>
              <label className="block text-sm mb-1">Reminder time</label>
              <select
                className="p-2 border rounded w-full"
                value={calendarSettings?.notifications?.reminderTime || 30}
                onChange={(e) => setCalendarSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev?.notifications,
                    reminderTime: parseInt(e.target.value)
                  }
                }))}
              >
                <option value="10">10 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveCalendarSettings}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-white transition-colors duration-300 ${
              saveMessage.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </span>
            ) : (
              saveMessage.type === 'success' ? '✓ Saved' : 'Save Calendar Settings'
            )}
          </button>
        </div>
        
        {/* Save Message */}
        {saveMessage.message && (
          <div className={`p-3 rounded text-sm ${
            saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {saveMessage.message}
          </div>
        )}
      </div>
    );
  };

  // Update favicon
  const updateFavicon = (imageUrl) => {
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = imageUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Settings Navigation */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-3 font-medium ${
                settingsTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
              onClick={() => setSettingsTab('profile')}
            >
              <div className="flex items-center">
                <User size={16} className="mr-2" />
                <span>Personal</span>
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium ${
                settingsTab === 'family' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
              onClick={() => setSettingsTab('family')}
            >
              <div className="flex items-center">
                <Users size={16} className="mr-2" />
                <span>Family</span>
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium ${
                settingsTab === 'calendar' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
              onClick={() => setSettingsTab('calendar')}
            >
              <div className="flex items-center">
                <Calendar size={16} className="mr-2" />
                <span>Calendar</span>
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium ${
                settingsTab === 'app' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
              }`}
              onClick={() => setSettingsTab('app')}
            >
              <div className="flex items-center">
                <Home size={16} className="mr-2" />
                <span>App Settings</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Chat Settings */}
        <div className="p-4 border-b">
          <h4 className="font-medium mb-2">Chat Settings</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 mr-2" 
                defaultChecked 
                onChange={(e) => {
                  // Save setting to user profile
                  updateMemberProfile(selectedUser.id, { 
                    settings: {
                      ...selectedUser.settings,
                      childrenCanUseChat: e.target.checked
                    }
                  });
                }}
              />
              <span>Allow children to use chat with Allie</span>
            </label>
          </div>
        </div>

        {/* Profile Settings */}
        {settingsTab === 'profile' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-roboto">Personal Settings</h3>
            
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                    <img 
                      src={selectedUser?.profilePicture} 
                      alt={selectedUser?.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full"
                    onClick={() => {
                      setUploadType('profile');
                      setUploadForMember(selectedUser);
                      document.getElementById('image-upload').click();
                    }}
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">Update profile picture</p>
              </div>
              
              {/* User Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={selectedUser?.name || ''}
                    readOnly // For now, we're not allowing name changes
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-gray-50"
                    value={selectedUser?.role || ''}
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded bg-gray-50"
                    value={selectedUser?.email || currentUser?.email || ''}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Family Settings */}
        {settingsTab === 'family' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-roboto">Family Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Family Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Family Name</label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded-l"
                    placeholder="Enter family name"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                  />
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-r"
                    onClick={handleFamilyNameUpdate}
                  >
                    Update
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  This will update your family name throughout the app and in the browser tab.
                </p>
              </div>
              
              {/* Family Picture */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Family Picture</label>
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded overflow-hidden border-2 border-gray-200">
                      <img 
                        src={familyPicture || "/favicon.ico"} 
                        alt="Family" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full"
                      onClick={() => {
                        setUploadType('family');
                        setUploadForMember({id: 'family'});
                        document.getElementById('image-upload').click();
                      }}
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This image will appear as your app icon.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Family Members */}
            <div className="mt-8">
              <h4 className="font-medium mb-3">Family Members</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {familyMembers.map(member => (
                  <div key={member.id} className="border rounded-lg p-3 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                      <img 
                        src={member.profilePicture} 
                        alt={member.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Calendar Settings */}
        {settingsTab === 'calendar' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-roboto">Calendar Integration</h3>
            
            <CalendarSettingsTab userId={currentUser?.uid} />
          </div>
        )}

        {/* App Settings */}
        {settingsTab === 'app' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-roboto">App Settings</h3>
            
            <div className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h4 className="font-medium mb-2">Email Notifications</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 mr-2" 
                      defaultChecked 
                    />
                    <span>Weekly progress reports</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 mr-2" 
                      defaultChecked 
                    />
                    <span>Survey reminders</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 mr-2" 
                      defaultChecked 
                    />
                    <span>Family meeting reminders</span>
                  </label>
                </div>
              </div>
              
              {/* Theme Preferences */}
              <div>
                <h4 className="font-medium mb-2">Theme</h4>
                <div className="flex space-x-2">
                  <button className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-sm"></button>
                  <button className="w-8 h-8 bg-purple-600 rounded-full"></button>
                  <button className="w-8 h-8 bg-green-600 rounded-full"></button>
                  <button className="w-8 h-8 bg-amber-600 rounded-full"></button>
                </div>
              </div>
              
              {/* Privacy */}
              <div>
                <h4 className="font-medium mb-2">Privacy</h4>
                <p className="text-sm text-gray-600 mb-2">
                  All your family data is stored securely and never shared with third parties.
                </p>
                <button className="text-blue-600 text-sm">View Privacy Policy</button>
              </div>
              
              {/* About */}
              <div>
                <h4 className="font-medium mb-2">About Allie</h4>
                <p className="text-sm text-gray-600">
                  Version 1.0.0<br />
                  Helping families balance responsibilities since 2025.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* File Upload Input (hidden) */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="image-upload"
          onChange={handleImageUpload}
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

export default UserSettingsScreen;