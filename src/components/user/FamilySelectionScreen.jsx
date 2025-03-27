import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, PlusCircle, CheckCircle, AlertCircle, Upload, Calendar, Mail, Lock, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { useSurvey } from '../../contexts/SurveyContext';  // Add this here
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import DatabaseService from '../../services/DatabaseService';



const FamilySelectionScreen = () => {
  const { currentUser, 
    availableFamilies, 
    loadFamilyData, 
    familyData, 
    login, 
    logout, 
    loadAllFamilies,
    getMemberSurveyResponses,
    updateFamilyPicture,
    ensureFamiliesLoaded,
    signInWithGoogle  } = useAuth();
  const { 
    familyMembers, 
    selectedUser, 
    selectFamilyMember, 
    setFamilyMembers,
    updateMemberProfile,
    completedWeeks,
  currentWeek, 
    familyId,
  familyName,
  familyPicture
  } = useFamily();

  const { currentSurveyResponses } = useSurvey();

  const navigate = useNavigate();
  
  // State management
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [uploadForMember, setUploadForMember] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showEmptyState, setShowEmptyState] = useState(false);
  
 // Get functions from survey context at component level
const { setCurrentSurveyResponses } = useSurvey();
  
  const [uploadType, setUploadType] = useState(null);

// Check for direct navigation state
// Check for direct navigation state
const location = useLocation();
useEffect(() => {
  if (location.state?.directAccess) {
    console.log("DIRECT ACCESS detected, loading families");
    
    // Only proceed if we have a current user
    if (currentUser) {
      // Let's make sure we load the family data correctly
      loadAllFamilies(currentUser.uid)
        .then(families => {
          if (families && families.length > 0) {
            return loadFamilyData(families[0].familyId);
          }
        })
        .then(() => {
          console.log("Family loaded successfully for direct access");
          
          // If jumpToDashboard is set and we have family members loaded, go straight to dashboard
          if (location.state?.jumpToDashboard && familyMembers && familyMembers.length > 0) {
            console.log("Jumping to dashboard as requested");
            navigate('/dashboard');
          }
        })
        .catch(error => console.error("Error loading family:", error));
    }
  }
}, [location, currentUser, familyMembers]);

  // Effect to update login form visibility based on auth state
  useEffect(() => {
    if (currentUser) {
      setShowLoginForm(false);
    } else {
      setShowLoginForm(true);
    }
  }, [currentUser]);
  
// Effect to update empty state visibility based on whether we have family members
// Effect to update empty state visibility based on whether we have family members
useEffect(() => {
  console.log("Current user:", currentUser);
  console.log("Family members:", familyMembers);
  console.log("Available families:", availableFamilies);
  
  if (currentUser && familyMembers.length === 0 && availableFamilies.length === 0) {
    // Only show empty state if there are truly no families
    setShowEmptyState(true);
  } else {
    setShowEmptyState(false);
  }
  
  // Don't redirect in these cases:
  // 1. No current user
  // 2. We're in the process of logging in
  // 3. We're in a direct access flow
  // 4. We have families or family members already loaded
  // 5. We haven't waited long enough for families to load
  const shouldRedirectToOnboarding = 
    currentUser && 
    !isLoggingIn &&
    !location.state?.directAccess &&
    availableFamilies.length === 0 && 
    familyMembers.length === 0;
  
  // Use a reference to track if we've already tried loading
  if (shouldRedirectToOnboarding && currentUser) {
    // Try to load families one more time before redirecting
    console.log("No families found, attempting to load again before redirect");
    
    // Try loading families once more
    loadAllFamilies(currentUser.uid)
      .then(families => {
        // Only redirect if we still have no families after loading
        if (!families || families.length === 0) {
          console.log("Confirmed no families, redirecting to onboarding");
          navigate('/onboarding');
        } else {
          console.log("Found families after retry, not redirecting");
        }
      })
      .catch(err => {
        console.error("Error loading families:", err);
        // Only redirect on load failure if we have no other data
        if (availableFamilies.length === 0 && familyMembers.length === 0) {
          navigate('/onboarding');
        }
      });
  }
}, [currentUser, familyMembers, availableFamilies, navigate, isLoggingIn, location]);  
  // Debug logging
  useEffect(() => {
    console.log("Current user:", currentUser);
    console.log("Available families:", availableFamilies);
    console.log("Family members:", familyMembers);
  }, [currentUser, availableFamilies, familyMembers]);
  


 // Get default profile image based on role
const getDefaultProfileImage = (member) => {
  if (!member.profilePicture) {
    if (member.role === 'parent') {
      return member.roleType === 'Mama' 
        ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2U5YjFkYSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=' 
        : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iIzg0YzRlMiIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
    } else {
      // Child icon
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjEyOCIgZmlsbD0iI2ZkZTY4YSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjkwIiByPSI0MCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yMTUsMTcyLjVjMCwzNS05NSwzNS05NSwzNXMtOTUsMC05NS0zNWMwLTIzLjMsOTUtMTAsOTUtMTBTMjE1LDE0OS4yLDIxNSwxNzIuNVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
    }
  }
  return member.profilePicture;
};
  
  // Handle selecting a user from the family
  const handleSelectUser = async (member) => {
    // Select the family member first
    selectFamilyMember(member);
    
    // Navigate to the appropriate screen based on survey completion
    if (member.completed) {
      navigate('/dashboard');
    } else {
      try {
        // Check if this member has a paused survey
        let hasInProgressSurvey = false;
        try {
          const surveyProgress = localStorage.getItem('surveyInProgress');
          if (surveyProgress) {
            const progress = JSON.parse(surveyProgress);
            hasInProgressSurvey = progress.userId === member.id;
          }
        } catch (e) {
          console.error("Error checking survey progress:", e);
        }
        
        if (hasInProgressSurvey) {
          // Try to load their saved responses before navigating
          const responses = await getMemberSurveyResponses(member.id, 'initial');
          if (responses && Object.keys(responses).length > 0) {
            // Update the survey context with their saved responses
            setCurrentSurveyResponses(responses);  // Use the function from the top level
            console.log("Loaded saved survey progress:", Object.keys(responses).length, "responses");
          }
        }
        
        // Then navigate to the survey
        navigate('/survey');
      } catch (error) {
        console.error("Error loading saved survey progress:", error);
        // Still navigate to survey even if loading fails
        navigate('/survey');
      }
    }
  };
  
  // Get the next action for a family member
  const getNextAction = (member) => {
    if (!member.completed) {
      // Check if this specific member has a surveyInProgress flag in localStorage
      let hasInProgressSurvey = false;
      try {
        const surveyProgress = localStorage.getItem('surveyInProgress');
        if (surveyProgress) {
          const progress = JSON.parse(surveyProgress);
          hasInProgressSurvey = progress.userId === member.id;
        }
      } catch (e) {
        console.error("Error checking survey progress:", e);
      }
      
      return {
        text: hasInProgressSurvey ? "Resume initial survey" : "Initial survey needed",
        icon: <AlertCircle size={12} className="mr-1" />,
        className: hasInProgressSurvey ? "text-blue-600" : "text-amber-600"
   
      };
    }
    
    // If they've completed the initial survey, check weekly survey status
    const latestWeeklyCheckIn = member.weeklyCompleted && member.weeklyCompleted.length > 0 
      ? member.weeklyCompleted[member.weeklyCompleted.length - 1]
      : null;
      
    if (!latestWeeklyCheckIn || !latestWeeklyCheckIn.completed) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (7 - dueDate.getDay())); // Next Sunday
      
      return {
        text: `Complete weekly check-in by ${dueDate.toLocaleDateString()}`,
        icon: <Calendar size={12} className="mr-1" />,
        className: "text-blue-600"
      };
    }
    
    return {
      text: "All tasks completed",
      icon: <CheckCircle size={12} className="mr-1" />,
      className: "text-green-600"
    };
  };
  
  // Profile picture upload functions
  const handleSelectForUpload = (member, e) => {
    e.stopPropagation();
    setUploadForMember(member);
    setShowProfileUpload(true);
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && uploadForMember) {
      handleImageFile(file);
    }
  };
  
  const handleImageFile = async (file) => {
    setIsUploading(true);
    
    // Validate file size before attempting upload
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setIsUploading(false);
      alert("File is too large. Please select an image under 5MB.");
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setIsUploading(false);
      alert("Please select a valid image file.");
      return;
    }
    
    // Safety timeout to prevent endless loading
    const safetyTimeout = setTimeout(() => {
      console.log("Safety timeout triggered - resetting upload state");
      setIsUploading(false);
      setShowProfileUpload(false);
      alert("Upload timed out. Please try again.");
    }, 30000); // 30 seconds timeout
    
    try {
      // Add detailed logging
      console.log("Starting upload with details:", {
        uploadForMember,
        familyId,
        fileType: file.type,
        fileSize: file.size,
        authState: !!currentUser
      });
      
      if (!uploadForMember || !uploadForMember.id) {
        throw new Error("Missing member information for upload");
      }
      
      if (uploadForMember.id === 'family') {
        // Handle family picture upload
        if (!familyId) {
          throw new Error("Missing family ID for family picture upload");
        }
        
        console.log("Uploading family picture for family ID:", familyId);
        
        // Use DatabaseService method directly with the original file
        const imageUrl = await DatabaseService.uploadFamilyPicture(familyId, file);
        console.log("Family picture uploaded successfully:", imageUrl);
        
        // Update the family picture in state
        await updateFamilyPicture(imageUrl);
  
        setShowProfileUpload(false);
      } else {
        // Handle individual profile upload
        console.log("Uploading profile picture for member ID:", uploadForMember.id);
        
        // Directly use DatabaseService with the original file
        const imageUrl = await DatabaseService.uploadProfileImage(uploadForMember.id, file);
        console.log("Profile picture uploaded successfully:", imageUrl);
        
        // Now update the member profile with the new image URL
        await updateMemberProfile(uploadForMember.id, { profilePicture: imageUrl });
        
        // Update local state to show the new image immediately
        const updatedMembers = familyMembers.map(member => {
          if (member.id === uploadForMember.id) {
            return {...member, profilePicture: imageUrl};
          }
          return member;
        });
        
        setFamilyMembers(updatedMembers);
        setShowProfileUpload(false);
      }
      
      // Clear the safety timeout since upload completed successfully
      clearTimeout(safetyTimeout);
    } catch (error) {
      // Clear the safety timeout on error
      clearTimeout(safetyTimeout);
      
      console.error("Error uploading image:", error);
      console.log("Upload error details:", {
        memberId: uploadForMember?.id,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack
      });
      
      let errorMessage = "Failed to upload image. Please try again.";
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = "You don't have permission to upload files.";
      } else if (error.code === 'storage/canceled') {
        errorMessage = "Upload was canceled.";
      } else if (error.code === 'storage/unknown') {
        errorMessage = "An unknown error occurred during upload.";
      }
      
      alert(errorMessage);
    } finally {
      // Make absolutely sure loading state is reset
      setIsUploading(false);
    }
  };
  
  // Camera capture function
  const openCameraCapture = () => {
    const videoElement = document.createElement('video');
    const canvasElement = document.createElement('canvas');
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        
        // Create camera UI
        const cameraModal = document.createElement('div');
        cameraModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        
        const cameraContainer = document.createElement('div');
        cameraContainer.className = 'bg-white p-4 rounded-lg max-w-md w-full';
        
        const title = document.createElement('h3');
        title.textContent = 'Take a Profile Picture';
        title.className = 'text-lg font-medium mb-4';
        
        const videoContainer = document.createElement('div');
        videoContainer.className = 'relative mb-4';
        videoContainer.appendChild(videoElement);
        videoElement.className = 'w-full rounded';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-between';
        
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Take Photo';
        captureButton.className = 'px-4 py-2 bg-black text-white rounded';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'px-4 py-2 border rounded';
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(captureButton);
        
        cameraContainer.appendChild(title);
        cameraContainer.appendChild(videoContainer);
        cameraContainer.appendChild(buttonContainer);
        cameraModal.appendChild(cameraContainer);
        
        document.body.appendChild(cameraModal);
        
        // Handle capture
        captureButton.addEventListener('click', () => {
          // Set canvas dimensions to match video
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          
          // Draw current video frame to canvas
          canvasElement.getContext('2d').drawImage(
            videoElement, 0, 0, canvasElement.width, canvasElement.height
          );
          
          // Convert to blob
          canvasElement.toBlob(blob => {
            // Stop all tracks to close camera
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            
            // Remove modal
            document.body.removeChild(cameraModal);
            
            // Process the image blob
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            handleImageFile(file);
          }, 'image/jpeg');
        });
        
        // Handle cancel
        cancelButton.addEventListener('click', () => {
          // Stop all tracks to close camera
          videoElement.srcObject.getTracks().forEach(track => track.stop());
          
          // Remove modal
          document.body.removeChild(cameraModal);
        });
      })
      .catch(error => {
        console.error("Error accessing camera:", error);
        alert("Could not access camera. Please check permissions or use file upload instead.");
      });
  };
  
  // Login and logout functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const user = await login(email, password);
      console.log("Login successful:", user);

      await new Promise(resolve => setTimeout(resolve, 500));

      
      // Explicitly load all families
      const families = await loadAllFamilies(user.uid);
    console.log("Loaded families:", families);

     // If families exist, load the first one to populate familyMembers
     if (families && families.length > 0) {
      console.log("Loading first family:", families[0].familyId);
      await loadFamilyData(families[0].familyId);
    }
      
      // Stay on the family selection screen
          setShowLoginForm(false);
  } catch (error) {
    console.error("Login error:", error);
    setLoginError('Invalid email or password. Please try again.');
  } finally {
    setIsLoggingIn(false);
  }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      setShowLoginForm(true);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
// Render the completion screen that matches the screenshot
const renderCompletionScreen = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Warning icon */}
        <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={30} className="text-amber-500" />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-black mb-4 font-roboto">
          Waiting for All Survey Responses
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-600 text-lg mb-10 font-roboto">
          All family members need to complete the initial survey before we can generate accurate reports.
        </p>
        
        {/* Family Progress section */}
        <h2 className="text-xl font-semibold mb-6 font-roboto">Family Progress</h2>
        
        {/* Family members in a row */}
        <div className="flex justify-center flex-wrap gap-8 mb-10">
          {familyMembers.map((member) => (
            <div key={member.id} className="flex flex-col items-center">
              {/* Profile picture */}
              <div 
                className="w-16 h-16 rounded-full overflow-hidden mb-2 cursor-pointer"
                onClick={() => handleSelectUser(member)}
              >
                <img 
                  src={member.profilePicture || getDefaultProfileImage(member)}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Name */}
              <p className="font-medium font-roboto">{member.name}</p>
              
              {/* Status - always "Pending" in amber color as shown in screenshot */}
              <p className="text-amber-500 text-sm font-roboto">
                {member.completed ? "Completed" : "Pending"}
              </p>
            </div>
          ))}
        </div>
        
        {/* Switch User button */}
        <button
          onClick={() => navigate('/login')}
          className="px-10 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-roboto"
        >
          Switch User
        </button>
      </div>
    </div>
  );
};



  // Login Form UI
  const renderLoginForm = () => {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {familyMembers.some(m => !m.profilePicture) && (
  <div className="flex-1 flex flex-col items-center justify-center p-6">
    <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg shadow-sm mb-6 max-w-md w-full">
      <div className="flex items-start">
        <Camera className="text-purple-600 mr-3 mt-1 flex-shrink-0" size={20} />
        <div>
          <h4 className="font-medium text-purple-800 font-roboto">Make Allie Personal!</h4>
          <p className="text-sm text-purple-700 mt-1 font-roboto">
            Adding family photos makes Allie feel more personalized and helps us create a better experience just for you.
          </p>
        </div>
      </div>
    </div>
  </div>
)}
  <div className="flex-1 flex flex-col items-center justify-center p-6">
  {familyMembers.some(m => !m.profilePicture) && (
    <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg shadow-sm mb-6 max-w-md w-full">
      <div className="flex items-start">
        <Camera className="text-purple-600 mr-3 mt-1 flex-shrink-0" size={20} />
        <div>
          <h4 className="font-medium text-purple-800 font-roboto">Make Allie Personal!</h4>
          <p className="text-sm text-purple-700 mt-1 font-roboto">
            Adding family photos makes Allie feel more personalized and helps us create a better experience just for you.
          </p>
        </div>
      </div>
    </div>
  )}
    {familyMembers.some(m => !m.profilePicture) && (
      <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg shadow-sm mb-6 max-w-md w-full">
        <div className="flex items-start">
          <Camera className="text-purple-600 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-medium text-purple-800 font-roboto">Make Allie Personal!</h4>
            <p className="text-sm text-purple-700 mt-1 font-roboto">
              Adding family photos makes Allie feel more personalized and helps us create a better experience just for you.
            </p>
          </div>
        </div>
      </div>
    )}
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
  <a href="/" className="text-3xl font-bold text-black mb-2 inline-block hover:underline">Allie</a>
  <p className="text-gray-600 font-roboto">
    Log in to access your family's workload balancer
  </p>
</div>
            
            {/* Login Form */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center">Log In</h2>
              
              {loginError && (
                <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                  {loginError}
                </div>
              )}
              <div className="mt-4 relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-2 bg-white text-gray-500">or</span>
  </div>
</div>

<button
  onClick={async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      // Call Google sign-in and properly handle the async response
      const user = await signInWithGoogle();
      if (user) {
        console.log("Successfully signed in with Google:", user.email);
        
        // Load family data for this user
        const families = await loadAllFamilies(user.uid);
        if (families && families.length > 0) {
          await loadFamilyData(families[0].familyId);
        }
        
        setShowLoginForm(false);
      } else {
        // User cancelled or something went wrong but was handled in the service
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setLoginError('Google sign-in failed: ' + (error.message || 'Unknown error'));
      setIsLoggingIn(false);
    }
  }}
  disabled={isLoggingIn}
  className="w-full mt-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50 flex items-center justify-center"
>
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
  </svg>
  Sign in with Google
</button>
              
              
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="flex border rounded-md overflow-hidden">
                      <div className="bg-gray-100 p-2 flex items-center justify-center">
                        <Mail size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 p-2 focus:outline-none"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="flex border rounded-md overflow-hidden">
                      <div className="bg-gray-100 p-2 flex items-center justify-center">
                        <Lock size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 p-2 focus:outline-none"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </div>

                  {/* Family Name and Photo */}
<div className="flex items-center">
  {/* Family photo */}
  <div className="mr-4 hidden md:block relative">
    <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg">
      <img 
        src={familyPicture || '/favicon.svg'}
        alt={`${familyName || 'Family'} Photo`}
        className="w-full h-full object-cover"
      />
    </div>
    <button
      className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full"
      onClick={() => {
        setUploadForMember({id: 'family', name: 'Family'});
        setUploadType('family');
        setShowProfileUpload(true);
      }}
    >
      <Camera size={8} />
    </button>
  </div>
  <div className="flex flex-col">
    <h1 className="text-xl font-bold font-roboto">Allie</h1>
    <p className="text-sm font-roboto">Balance family responsibilities together</p>
    <p className="text-xs text-gray-300 font-roboto">The {familyName ? familyName.split(' ')[0] : ''} Family</p>
  </div>
</div>
                  
<button
  type="submit"
  disabled={isLoggingIn}
  className="w-full py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center justify-center"
>
  {isLoggingIn ? (
    <>
      <div className="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Logging in...
    </>
  ) : (
    'Log In'
  )}
</button>


{window.location.hostname === "localhost" && (
  <button
    onClick={async () => {
      setIsLoggingIn(true);
      try {
        // Use the development login function
        const user = await DatabaseService.signInForDevelopment();
        
        // Manually update UI/state to simulate login
        console.log("Development login successful with user:", user);
        
        // Attempt to load families for this user
        await loadAllFamilies(user.uid);
      } catch (error) {
        console.error("Development login error:", error);
        setLoginError('Development login failed');
      } finally {
        setIsLoggingIn(false);
      }
    }}
    className="w-full mt-2 py-2 border border-orange-300 rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 flex items-center justify-center"
  >
    DEV MODE: Test Login
  </button>
)}



               </div>
              </form>
            </div>
            
            {/* Create New Family Button */}
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full py-3 px-4 rounded-md font-medium text-black border border-black hover:bg-gray-50 flex items-center justify-center"
            >
              <PlusCircle size={16} className="mr-2" />
              Create New Family
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 text-center text-sm text-gray-500">
          <p>Allie v1.0 - Balance family responsibilities together</p>
        </div>
      </div>
    );
  };
  
  // Empty state UI for when there are no families
  const renderEmptyState = () => {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
          <div className="text-center mb-8">
  <a href="/" className="text-3xl font-bold text-black mb-2 inline-block hover:underline">Allie</a>
  <p className="text-gray-600 font-roboto">
    Welcome to Allie, your family workload balancer
  </p>
</div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center">No Families Found</h2>
              <p className="text-center text-gray-600 mb-6">
                It looks like you don't have any families set up yet. Would you like to create one?
              </p>
              
              <button
                onClick={() => navigate('/onboarding')}
                className="w-full py-3 px-4 rounded-md font-medium text-white bg-black hover:bg-gray-800 flex items-center justify-center"
              >
                <PlusCircle size={16} className="mr-2" />
                Create New Family
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full mt-4 py-3 px-4 rounded-md font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
              >
                <LogOut size={16} className="mr-2" />
                Log Out
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          <p>Allie v1.0 - Balance family responsibilities together</p>
        </div>
      </div>
    );
  };
  
  // If showing login form, render it
  if (showLoginForm) {
    return renderLoginForm();
  }
  
  // Redirect if no family members, show empty state
if (showEmptyState) {
  return renderEmptyState();
}

// Check if some family members have completed the survey but others haven't
const someCompleted = familyMembers.some(m => m.completed);
const someIncomplete = familyMembers.some(m => !m.completed);

// If some completed but not all, show the special completion screen
if (someCompleted && someIncomplete) {
  return renderCompletionScreen();
}

// Normal profile selection view
return (
  <div className="min-h-screen bg-white flex flex-col">
  <div className="flex-1 flex flex-col items-center justify-center p-6">
    {/* Profile Pictures Callout */}
{familyMembers.some(m => !m.profilePicture) && (
  <div className="fixed right-4 top-32 w-64 rounded-lg border-2 border-pink-400 bg-gradient-to-br from-pink-50 to-purple-50 p-4 shadow-lg transform rotate-3 z-10">
    <div className="absolute -top-3 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
      New!
    </div>
    <div className="text-center mb-2">
      <Camera className="text-purple-600 w-10 h-10 mx-auto" />
      <h3 className="font-bold text-purple-800 mt-1 font-roboto">Picture Perfect!</h3>
    </div>
    <p className="text-sm text-purple-700 font-roboto">
      Add profile pics to make Allie more fun! Our AI works 73% better when it can see your smiling faces! 😊
    </p>
    <div className="text-center mt-3">
      <div className="text-xs text-gray-500 italic font-roboto">
        *According to our very scientific happiness research
      </div>
    </div>
  </div>
)}
    {familyMembers.some(m => !m.profilePicture) && (
      <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg shadow-sm mb-6 max-w-md w-full">
        <div className="flex items-start">
          <Camera className="text-purple-600 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-medium text-purple-800 font-roboto">Make Allie Personal!</h4>
            <p className="text-sm text-purple-700 mt-1 font-roboto">
              Adding family photos makes Allie feel more personalized and helps us create a better experience just for you.
            </p>
          </div>
        </div>
      </div>
    )}
        <div className="w-full max-w-md">
          {/* Header with Logout */}
          <div className="flex justify-between items-center mb-8">
  <a href="/" className="text-3xl font-bold text-black hover:underline">Allie</a>
  <button 
    onClick={handleLogout}
    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
  >
              <LogOut size={16} className="mr-1" />
              Log Out
            </button>
          </div>
          
          <p className="text-gray-600 text-center mb-6">
            Who are you in the family? Select your profile to begin.
          </p>

          {/* Family member selection */}
<div className="bg-white rounded-xl shadow-lg p-6 mb-8">
  <h2 className="text-xl font-semibold mb-4 text-center">Choose Your Profile</h2>
    
  <div className="grid grid-cols-1 gap-4">
    {familyMembers.length > 0 ? (
      familyMembers.map((member) => (
        <div 
  key={member.id}
  className={`border rounded-lg p-4 cursor-pointer transition-all ${
    selectedUser?.id === member.id 
      ? 'border-black bg-gray-50' 
      : 'border-gray-200 hover:border-gray-900'
  }`}
  onClick={() => handleSelectUser(member)}
>
  <div className="flex items-center">
    <div className="flex-shrink-0 mr-4 relative">
      {!member.profilePicture ? (
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-pink-400 relative bg-gray-50 flex items-center justify-center">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-white bg-black bg-opacity-50">
            <Camera size={14} className="mb-1" />
            <span className="text-xs font-bold">Add photo</span>
          </div>
          <button
            className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full shadow-lg transform hover:scale-110 transition-transform"
            onClick={(e) => handleSelectForUpload(member, e)}
          >
            <Camera size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
            <img 
              src={member.profilePicture} 
              alt={`${member.name}'s profile`}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full shadow-lg"
            onClick={(e) => handleSelectForUpload(member, e)}
          >
            <Camera size={12} />
          </button>
        </div>
      )}
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-lg font-roboto">{member.name}</h3>
      <p className="text-sm text-gray-500 capitalize font-roboto">{member.role}</p>
      {!member.profilePicture && (
        <div className="mt-1 bg-pink-50 text-pink-700 text-xs p-1 rounded font-roboto">
          <span>⭐ Photos make Allie more personal!</span>
        </div>
      )}
      <div className="mt-1">
        <span className={`text-xs flex items-center ${getNextAction(member).className} font-roboto`}>
          {getNextAction(member).icon}
          {getNextAction(member).text}
        </span>
      </div>
    </div>
  </div>
</div>
      ))
    ) : (
      <div className="text-center p-6 text-gray-500">
        <p>No family members found. Please check your account or create a new family.</p>
      </div>
    )}
  </div>
</div>

          {/* Action buttons */}
          <div className="text-center space-y-4">
            <button 
              disabled={!selectedUser}
              onClick={() => selectedUser && handleSelectUser(selectedUser)}
              className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                selectedUser 
                  ? 'bg-black hover:bg-gray-800' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {selectedUser 
                ? `Continue as ${selectedUser.name}` 
                : "Select your profile to continue"}
            </button>
              
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full py-3 px-4 rounded-md font-medium text-black border border-black hover:bg-gray-50 flex items-center justify-center"
            >
              <PlusCircle size={16} className="mr-2" />
              Create New Family
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-sm text-gray-500">
        <p>Allie v1.0 - Balance family responsibilities together</p>
      </div>

      {/* Profile picture upload modal */}
{showProfileUpload && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
      <h3 className="text-lg font-medium mb-4 font-roboto">Update Profile Picture</h3>
      <p className="text-sm text-gray-600 mb-4 font-roboto">
        Select a new photo for {uploadForMember?.name}
      </p>
        
      <div className="flex justify-center mb-4">
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 relative">
          <img 
            src={uploadForMember?.profilePicture || getDefaultProfileImage(uploadForMember)} 
            alt="Current profile" 
            className="w-full h-full object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
      
      {isUploading ? (
        <div className="text-center mb-4">
          <p className="text-purple-600 font-roboto animate-pulse">Uploading your beautiful image...</p>
          <p className="text-sm text-gray-600 font-roboto">This will just take a moment</p>
        </div>
      ) : (
        <div className="flex space-x-3 justify-center mb-4">
          <label 
            htmlFor="image-upload" 
            className="flex flex-col items-center px-4 py-3 bg-black text-white rounded cursor-pointer border border-black hover:bg-gray-800 transition-colors"
          >
            <Upload size={20} className="mb-1" />
            <span className="text-sm font-roboto">Choose File</span>
            <span className="text-xs text-gray-300 font-roboto">Max 5MB</span>
            <input
              id="image-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>
          
          <button
            onClick={openCameraCapture}
            className="flex flex-col items-center px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded cursor-pointer border border-transparent hover:opacity-90 transition-opacity"
          >
            <Camera size={20} className="mb-1" />
            <span className="text-sm font-roboto">Take Photo</span>
            <span className="text-xs font-roboto">Use camera</span>
          </button>
        </div>
      )}
        
      <div className="flex justify-end">
        <button
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-roboto"
          onClick={() => setShowProfileUpload(false)}
          disabled={isUploading}
        >
          {isUploading ? "Please wait..." : "Cancel"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default FamilySelectionScreen;