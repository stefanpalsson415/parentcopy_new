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
  
  const { currentUser, linkAccountWithGoogle } = useAuth();
  
  const [newFamilyName, setNewFamilyName] = useState(familyName || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'profile' or 'family'
  const [uploadError, setUploadError] = useState(null);
  const [settingsTab, setSettingsTab] = useState('profile'); // 'profile', 'family', 'app', or 'calendar'

// Track Google auth status
const [googleAuthStatus, setGoogleAuthStatus] = useState({
  isConnected: false,
  email: null,
  loading: true
});

useEffect(() => {
  const checkGoogleAuthStatus = async () => {
    try {
      if (!selectedUser) {
        setGoogleAuthStatus({
          isConnected: false,
          email: null,
          loading: false
        });
        return;
      }
      
      console.log("Checking Google auth for selected user:", {
        selectedUserId: selectedUser.id,
        selectedUserName: selectedUser.name,
        selectedUserRole: selectedUser.roleType,
        selectedUserEmail: selectedUser.email,
        hasGoogleAuthData: !!selectedUser.googleAuth
      });
      
      // CRITICAL: First check the selected user's googleAuth property
      if (selectedUser.googleAuth && selectedUser.googleAuth.email) {
        console.log(`User ${selectedUser.name} has Google auth data with email: ${selectedUser.googleAuth.email}`);
        
        // Double-check if we have a token for this user
        try {
          const userToken = localStorage.getItem(`googleToken_${selectedUser.id}`);
          
          // If we don't have a token for this user but have googleAuth data, create one
          if (!userToken && selectedUser.googleAuth.uid) {
            localStorage.setItem(`googleToken_${selectedUser.id}`, JSON.stringify({
              email: selectedUser.googleAuth.email,
              uid: selectedUser.googleAuth.uid,
              timestamp: Date.now()
            }));
            console.log(`Created missing token for ${selectedUser.name}`);
          }
        } catch (e) {
          console.warn("Error checking/creating user token:", e);
        }
        
        setGoogleAuthStatus({
          isConnected: true,
          email: selectedUser.googleAuth.email,
          loading: false
        });
        return;
      }
      
      // Look for a token specifically for this user
      const userTokenKey = `googleToken_${selectedUser.id}`;
      try {
        const userToken = localStorage.getItem(userTokenKey);
        if (userToken) {
          const tokenData = JSON.parse(userToken);
          if (tokenData && tokenData.email) {
            console.log(`Found token for ${selectedUser.name} with email: ${tokenData.email}`);
            
            // Update the user's profile with this Google auth data
            // This fixes cases where the token exists but the profile doesn't have googleAuth data
            await updateMemberProfile(selectedUser.id, {
              googleAuth: {
                uid: tokenData.uid,
                email: tokenData.email,
                lastConnected: new Date().toISOString()
              }
            });
            
            setGoogleAuthStatus({
              isConnected: true,
              email: tokenData.email,
              loading: false
            });
            return;
          }
        }
      } catch (e) {
        console.warn(`Error checking token for ${userTokenKey}:`, e);
      }
      
      // Finally, check for role-based token as a fallback
      try {
        if (selectedUser.roleType) {
          const roleToken = localStorage.getItem(`googleToken_${selectedUser.roleType.toLowerCase()}`);
          if (roleToken) {
            const tokenData = JSON.parse(roleToken);
            if (tokenData && tokenData.email) {
              console.log(`Found role-based token for ${selectedUser.roleType} with email: ${tokenData.email}`);
              
              // Don't automatically update the user profile with this data
              // Just show the status for now
              setGoogleAuthStatus({
                isConnected: true,
                email: tokenData.email,
                loading: false,
                isRoleBased: true
              });
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Error checking role token:", e);
      }
      
      // No valid Google auth data found
      console.log(`User ${selectedUser.name} does NOT have Google auth connected`);
      setGoogleAuthStatus({
        isConnected: false,
        email: null,
        loading: false
      });
    } catch (error) {
      console.error("Error checking Google auth status:", error);
      setGoogleAuthStatus({
        isConnected: false,
        email: null,
        loading: false,
        error: error.message
      });
    }
  };
  
  if (selectedUser) {
    checkGoogleAuthStatus();
  }
}, [currentUser, selectedUser]);
// Helper function to clear only the specific user's Google auth data without affecting others
const clearUserGoogleAuth = async (userId) => {
  try {
    console.log(`Clearing Google auth data specifically for user ${userId}`);
    
    // Only remove this specific user's token
    localStorage.removeItem(`googleToken_${userId}`);
    
    // Update the user's profile to remove Google auth data
    await updateMemberProfile(userId, { googleAuth: null });
    
    return true;
  } catch (error) {
    console.error("Error clearing user Google auth:", error);
    return false;
  }
};

  
  // Handle family name update
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
    const [googleCalendars, setGoogleCalendars] = useState([]);
    const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
    const [selectedGoogleCalendar, setSelectedGoogleCalendar] = useState('primary');
    const [activeCalendarType, setActiveCalendarType] = useState(null);
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
          setActiveCalendarType(settings?.defaultCalendarType || null);
          
          if (settings?.googleCalendar?.calendarId) {
            setSelectedGoogleCalendar(settings.googleCalendar.calendarId);
          }
          
          // Check if signed in to Google
          try {
            await CalendarService.initializeGoogleCalendar();
            const signedIn = CalendarService.isSignedInToGoogle();
            setIsGoogleSignedIn(signedIn);
            
            // If signed in, load available calendars
            if (signedIn) {
              const calendars = await CalendarService.listUserCalendars();
              setGoogleCalendars(calendars);
            }
          } catch (googleError) {
            console.error("Error checking Google sign-in status:", googleError);
          }
        } catch (error) {
          console.error("Error loading calendar settings:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadSettings();
    }, [userId]);
    
    // Handle Google sign in
    const handleGoogleSignIn = async () => {
      try {
        await CalendarService.signInToGoogle();
        setIsGoogleSignedIn(true);
        
        // Load available calendars
        const calendars = await CalendarService.listUserCalendars();
        setGoogleCalendars(calendars);
      } catch (error) {
        console.error("Error signing in to Google:", error);
        alert("Failed to sign in to Google Calendar. Please try again.");
      }
    };
    
    // Handle Google sign out
    const handleGoogleSignOut = async () => {
      try {
        await CalendarService.signOutFromGoogle();
        setIsGoogleSignedIn(false);
        setGoogleCalendars([]);
      } catch (error) {
        console.error("Error signing out from Google:", error);
      }
    };
    
    // Handle Google calendar selection
    const handleGoogleCalendarChange = (e) => {
      setSelectedGoogleCalendar(e.target.value);
    };
    
    // Handle calendar type selection
    const handleCalendarTypeChange = (type) => {
      setActiveCalendarType(type);
    };
    
    // Save calendar settings
// Save calendar settings
const saveCalendarSettings = async () => {
  if (!userId) return;
  
  setIsSaving(true);
  setSaveMessage({ type: '', message: '' });
  
  try {
    // Prepare updated settings
    const updatedSettings = {
      ...calendarSettings,
      defaultCalendarType: activeCalendarType,
      googleCalendar: {
        ...calendarSettings?.googleCalendar,
        enabled: activeCalendarType === 'google',
        calendarId: selectedGoogleCalendar
      },
      appleCalendar: {
        ...calendarSettings?.appleCalendar,
        enabled: activeCalendarType === 'apple'
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
                Allie uses your Google account to sync family meetings, tasks, and events with your calendar. 
                This keeps your family schedule in one place and sends helpful reminders.
              </p>
              
              {!isGoogleSignedIn && (
                <div className="mt-3">
                  <button
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1.5 flex items-center justify-center bg-white rounded border border-blue-300 text-blue-700 hover:bg-blue-50 text-sm font-roboto"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
                    </svg>
                    Connect Google Calendar Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Default Calendar Selection */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-3">Default Calendar</h4>
          <p className="text-sm text-gray-600 mb-4">
            Select which calendar system you want to use by default when adding events from Allie.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className={`p-4 border rounded-lg cursor-pointer ${
                activeCalendarType === 'google' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
              }`}
              onClick={() => handleCalendarTypeChange('google')}
            >
              <div className="flex items-center mb-2">
                <div className={`w-4 h-4 rounded-full border ${
                  activeCalendarType === 'google' ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                } flex items-center justify-center mr-2`}>
                  {activeCalendarType === 'google' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className="font-medium">Google Calendar</span>
              </div>
              <div className="flex items-center justify-center h-10 mb-2">
                <Globe size={24} className="text-gray-700" />
              </div>
              <p className="text-xs text-gray-500">
                Sync with your Google Calendar account
              </p>
            </div>
            
            <div
              className={`p-4 border rounded-lg cursor-pointer ${
                activeCalendarType === 'apple' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
              } ${!CalendarService.appleCalendarAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => CalendarService.appleCalendarAvailable && handleCalendarTypeChange('apple')}
            >
              <div className="flex items-center mb-2">
                <div className={`w-4 h-4 rounded-full border ${
                  activeCalendarType === 'apple' ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                } flex items-center justify-center mr-2`}>
                  {activeCalendarType === 'apple' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className="font-medium">Apple Calendar</span>
              </div>
              <div className="flex items-center justify-center h-10 mb-2">
                <Apple size={24} className="text-gray-700" />
              </div>
              <p className="text-xs text-gray-500">
                {CalendarService.appleCalendarAvailable 
                  ? "Sync with your Apple Calendar" 
                  : "Not available in this browser"}
              </p>
            </div>
            
            <div
              className={`p-4 border rounded-lg cursor-pointer ${
                activeCalendarType === 'ics' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
              }`}
              onClick={() => handleCalendarTypeChange('ics')}
            >
              <div className="flex items-center mb-2">
                <div className={`w-4 h-4 rounded-full border ${
                  activeCalendarType === 'ics' ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                } flex items-center justify-center mr-2`}>
                  {activeCalendarType === 'ics' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className="font-medium">ICS Download</span>
              </div>
              <div className="flex items-center justify-center h-10 mb-2">
                <Download size={24} className="text-gray-700" />
              </div>
              <p className="text-xs text-gray-500">
                Download ICS files to import into any calendar system
              </p>
            </div>
          </div>
        </div>
        
        {/* Google Calendar Settings */}
        {activeCalendarType === 'google' && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Google Calendar Settings</h4>
            
            {!isGoogleSignedIn ? (
              <div className="text-center p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Sign in to your Google account to connect your calendar.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center mx-auto"
                >
                  <Globe size={16} className="mr-2" />

                  Sign in with Google
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-green-600 flex items-center">
                    <Check size={16} className="mr-1" />
                    Connected to Google Calendar
                  </p>
                  <button
                    onClick={handleGoogleSignOut}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Sign Out
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Calendar
                  </label>
                  <select
                    value={selectedGoogleCalendar}
                    onChange={handleGoogleCalendarChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="primary">Primary Calendar</option>
                    {googleCalendars.map(calendar => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Allie will add events to this calendar.
                  </p>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <button
                    onClick={() => window.open('https://calendar.google.com/', '_blank')}
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <Settings size={14} className="mr-1" />
                    Manage Google Calendar Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
{/* Diagnostic Button */}
{process.env.NODE_ENV === 'development' && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h4 className="font-medium mb-2">Google Auth Diagnostic</h4>
    <button
      onClick={async () => {
        try {
          if (!familyId) {
            alert("No family ID available");
            return;
          }
          
          const result = await DatabaseService.diagnoseAndFixGoogleAuth(familyId);
          console.log("Google auth diagnostic result:", result);
          
          if (result.success) {
            alert("Diagnosis complete. Check console for detailed report.\n\n" + 
                 (result.needsRepair ? "Repairs were needed and applied." : "No repairs needed."));
          } else {
            alert("Diagnosis failed: " + result.report);
          }
        } catch (error) {
          console.error("Error running Google auth diagnostic:", error);
          alert(`Error running diagnostic: ${error.message}`);
        }
      }}
      className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm"
    >
      Run Google Auth Diagnostic
    </button>
  </div>
)}

// Add this after the existing diagnostic button in UserSettingsScreen.jsx (around line 500-550 in the Calendar Settings section)

{/* Repair Button */}
<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
  <h4 className="font-medium mb-2">Repair Google Auth</h4>
  <p className="text-sm text-red-700 mb-2">
    If you're experiencing issues with Google accounts showing the wrong email or not connecting properly, 
    you can try to repair the Google auth data.
  </p>
  <button
    onClick={async () => {
      try {
        if (!familyId) {
          alert("No family ID available");
          return;
        }
        
        const result = await DatabaseService.repairFamilyGoogleAuth(familyId);
        console.log("Google auth repair result:", result);
        
        if (result.success) {
          alert("Google auth data has been repaired successfully. Please refresh the page to see the changes.");
          window.location.reload();
        } else {
          alert("Failed to repair Google auth data: " + (result.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error running Google auth repair:", error);
        alert(`Error running repair: ${error.message}`);
      }
    }}
    className="px-3 py-1 bg-red-100 border border-red-300 rounded text-red-800 text-sm"
  >
    Repair Google Auth Data
  </button>
</div>

{/* Repair Button */}
<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
  <h4 className="font-medium mb-2">Repair Google Auth</h4>
  <p className="text-sm text-red-700 mb-2">
    If you're experiencing issues with Google accounts showing the wrong email or not connecting properly, 
    you can try to repair the Google auth data.
  </p>
  <button
    onClick={async () => {
      try {
        if (!familyId) {
          alert("No family ID available");
          return;
        }
        
        const result = await DatabaseService.repairFamilyGoogleAuth(familyId);
        console.log("Google auth repair result:", result);
        
        if (result.success) {
          alert("Google auth data has been repaired successfully. Please refresh the page to see the changes.");
          window.location.reload();
        } else {
          alert("Failed to repair Google auth data: " + (result.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error running Google auth repair:", error);
        alert(`Error running repair: ${error.message}`);
      }
    }}
    className="px-3 py-1 bg-red-100 border border-red-300 rounded text-red-800 text-sm"
  >
    Repair Google Auth Data
  </button>
</div>
        {/* Apple Calendar Settings */}
        {activeCalendarType === 'apple' && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Apple Calendar Settings</h4>
            
            {!CalendarService.appleCalendarAvailable ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Apple Calendar integration is only available on macOS devices using Safari or Chrome browsers.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  When you add events to your Apple Calendar, you'll be prompted to allow access to your calendar.
                </p>
                
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p>
                    Note: Allie will download .ics files that you can open with Apple Calendar. Simply click "Add to Calendar" 
                    when prompted.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Diagnostic Button */}
{process.env.NODE_ENV === 'development' && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h4 className="font-medium mb-2">Diagnostic Tools</h4>
    <button
      onClick={async () => {
        try {
          const result = await CalendarService.debugGoogleCalendarConnection();
          console.log("Google Calendar diagnostic result:", result);
          alert(result.success 
            ? `Connection successful! Found ${result.calendars?.length || 0} calendars.` 
            : `Connection failed: ${result.error}`);
        } catch (error) {
          console.error("Error running diagnostic:", error);
          alert(`Error running diagnostic: ${error.message}`);
        }
      }}
      className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm"
    >
      Test Google Calendar Connection
    </button>
  </div>
)}

{/* Diagnostic Button */}
{process.env.NODE_ENV === 'development' && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h4 className="font-medium mb-2">Diagnostic Tools</h4>
    <button
      onClick={async () => {
        try {
          const result = await CalendarService.diagnoseGoogleCalendarIssues();
          alert(result);
        } catch (error) {
          console.error("Error running diagnostic:", error);
          alert(`Error running diagnostic: ${error.message}`);
        }
      }}
      className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm"
    >
      Run Google Calendar Diagnostic
    </button>
  </div>
)}
        {/* ICS Download Settings */}
        {activeCalendarType === 'ics' && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-3">ICS Download Settings</h4>
            
            <p className="text-sm text-gray-600 mb-4">
              Allie will generate .ics files for you to download. These files can be imported into any calendar 
              application including Google Calendar, Apple Calendar, Outlook, and more.
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              <p>
                After downloading, open the .ics file with your preferred calendar application to add the event.
              </p>
            </div>
          </div>
        )}
        
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
                    ...prev.notifications,
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
                    ...prev.notifications,
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
                    ...prev.notifications,
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
        {/* Diagnostic Button */}
{process.env.NODE_ENV === 'development' && (
  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h4 className="font-medium mb-2">Diagnostic Tools</h4>
    <button
      onClick={async () => {
        try {
          const result = await CalendarService.diagnoseGoogleCalendarIssues();
          alert(result);
        } catch (error) {
          console.error("Error running diagnostic:", error);
          alert(`Error running diagnostic: ${error.message}`);
        }
      }}
      className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm"
    >
      Run Google Calendar Diagnostic
    </button>
  </div>
)}


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
<div>
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
            onClick={() => setUploadType('profile')}
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
            value={currentUser?.email || ''}
            readOnly
          />
        </div>
      </div>
    </div>
    
    {/* Google Account Linking Section */}
    <div className="mt-8 border-t pt-6">
      <h4 className="font-medium mb-4">Connected Accounts</h4>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border shadow-sm mr-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-medium">Google Account</h5>
              <p className="text-xs text-gray-500">
  {googleAuthStatus.loading ? (
    "Checking status..."
  ) : googleAuthStatus.isConnected ? (
    `Connected as ${googleAuthStatus.email || currentUser?.email}`
  ) : (
    'Not connected'
  )}
</p>
            </div>
          </div>
          
          <button

  // Replace the onClick handler for the Google connect/disconnect button
onClick={async () => {
  if (googleAuthStatus.isConnected) {
    // Already connected - ask if they want to disconnect
    const confirmDisconnect = window.confirm('Are you sure you want to disconnect your Google account?');
    if (confirmDisconnect) {
      try {
        // Clear only this specific user's Google auth data
        await clearUserGoogleAuth(selectedUser.id);
        
        // Update local state to reflect changes
        setGoogleAuthStatus({
          isConnected: false,
          email: null,
          loading: false
        });
        
        alert('Google account disconnected successfully!');
      } catch (error) {
        console.error('Error disconnecting Google account:', error);
        alert('Failed to disconnect Google account: ' + error.message);
      }
    }
  } else {
    // Not connected - connect now
    try {
      // Now connect with Google
      const user = await linkAccountWithGoogle();
      
      // Store token specifically for this user
      localStorage.setItem(`googleToken_${selectedUser.id}`, JSON.stringify({
        email: user.email,
        uid: user.uid,
        timestamp: Date.now()
      }));
      
      // Update the member profile with Google data - IMPORTANT: only for this specific member
      await updateMemberProfile(selectedUser.id, {
        googleAuth: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastConnected: new Date().toISOString()
        }
      });
      
      // Update status locally
      setGoogleAuthStatus({
        isConnected: true,
        email: user.email,
        loading: false
      });
      
      alert('Google account connected successfully!');
    } catch (error) {
      console.error('Error connecting Google account:', error);
      alert('Failed to connect Google account. Please try again.');
    }
  }
}}
className={`px-3 py-1.5 rounded text-sm ${
  selectedUser?.googleAuth 
    ? 'border border-gray-300 text-gray-700 hover:bg-gray-100' 
    : 'bg-black text-white hover:bg-gray-800'
}`}
>
  {googleAuthStatus.isConnected ? 'Disconnect' : 'Connect'}
</button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          Connecting your Google account enables calendar integration and simplifies sign-in.
        </p>
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
                        src="/favicon.ico" 
                        alt="Family" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full"
                      onClick={() => setUploadType('family')}
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
        
        {/* Upload Modal */}
        {uploadType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium mb-4">
                {uploadType === 'profile' ? 'Update Profile Picture' : 'Update Family Picture'}
              </h3>
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
                  {uploadError}
                </div>
              )}
              
              <div className="flex items-center justify-center mb-4">
                {isUploading ? (
                  <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded border flex items-center">
                    <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin mr-2"></div>
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : (
                  <label 
                    htmlFor="image-upload" 
                    className="flex flex-col items-center px-4 py-3 bg-blue-50 text-blue-700 rounded cursor-pointer border border-blue-300 hover:bg-blue-100"
                  >
                    <Upload size={20} className="mb-1" />
                    <span className="text-sm">Select Photo</span>
                    {uploadType === 'profile' 
                      ? <span className="text-xs text-gray-500 mt-1">Maximum size: 5MB</span>
                      : <span className="text-xs text-gray-500 mt-1">Maximum size: 2MB</span>
                    }
                  </label>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  onClick={() => {
                    setUploadType(null);
                    setUploadError(null);
                  }}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettingsScreen;