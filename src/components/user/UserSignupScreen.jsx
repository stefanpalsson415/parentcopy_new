import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Check, Edit, Trash2, User, Mail, Key, UserPlus, 
  Save, AlertCircle, Brain, Users, Camera, LogOut, CheckCircle, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import DatabaseService from '../../services/DatabaseService';

const UserSignupScreen = () => {
  const { 
    currentUser, 
    availableFamilies, 
    loadFamilyData, 
    createFamily,
    familyData: authFamilyData, 
    login, 
    logout, 
    loadAllFamilies,
    ensureFamiliesLoaded,
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [familyData, setFamilyData] = useState({
    familyName: '',
    parents: [
      { name: '', role: 'Mama', email: '', password: '' },
      { name: '', role: 'Papa', email: '', password: '' }
    ],
    children: [
      { name: '', age: '' }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSections, setEditingSections] = useState({
    familyName: false,
    parents: false,
    children: false
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [pendingFamilyData, setPendingFamilyData] = useState(null);
  const [error, setError] = useState(''); 
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [uploadForMember, setUploadForMember] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [uploadType, setUploadType] = useState(null);

  // Check if coming from payment with family data
  useEffect(() => {
    if (location?.state?.fromPayment && location?.state?.familyData) {
      const receivedData = location.state.familyData;
      console.log("Received family data from payment:", location.state.familyData);
      
      // Set the received data
      setFamilyData({
        familyName: receivedData.familyName || '',
        parents: receivedData.parents || [
          { name: '', role: 'Mama', email: '', password: '' },
          { name: '', role: 'Papa', email: '', password: '' }
        ],
        children: receivedData.children || [{ name: '', age: '' }]
      });
    }
  }, [location]);

  // Handle parent input change
  const handleParentChange = (index, field, value) => {
    const updatedParents = [...familyData.parents];
    updatedParents[index] = { ...updatedParents[index], [field]: value };
    setFamilyData({...familyData, parents: updatedParents});
    
    // Clear validation error when field is changed
    if (validationErrors[`parent_${index}_${field}`]) {
      const newErrors = {...validationErrors};
      delete newErrors[`parent_${index}_${field}`];
      setValidationErrors(newErrors);
    }
  };
  
  // Handle child input change
  const handleChildChange = (index, field, value) => {
    const updatedChildren = [...familyData.children];
    updatedChildren[index] = { ...updatedChildren[index], [field]: value };
    setFamilyData({...familyData, children: updatedChildren});
    
    // Clear validation error when field is changed
    if (validationErrors[`child_${index}_${field}`]) {
      const newErrors = {...validationErrors};
      delete newErrors[`child_${index}_${field}`];
      setValidationErrors(newErrors);
    }
  };
  
  // Add new child
  const addChild = () => {
    setFamilyData({
      ...familyData, 
      children: [...familyData.children, { name: '', age: '' }]
    });
  };
  
  // Remove child
  const removeChild = (index) => {
    if (familyData.children.length > 1) {
      const updatedChildren = [...familyData.children];
      updatedChildren.splice(index, 1);
      setFamilyData({...familyData, children: updatedChildren});
    }
  };

  // Toggle editing sections
  const toggleEditSection = (section) => {
    setEditingSections({
      ...editingSections,
      [section]: !editingSections[section]
    });
  };

  // Validate all form data
  const validateForm = () => {
    const errors = {};
    
    // Validate family name
    if (!familyData.familyName.trim()) {
      errors.familyName = 'Family name is required';
    }
    
    // Validate parents
    familyData.parents.forEach((parent, index) => {
      if (!parent.name.trim()) {
        errors[`parent_${index}_name`] = 'Name is required';
      }
      
      if (!parent.email.trim()) {
        errors[`parent_${index}_email`] = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(parent.email)) {
        errors[`parent_${index}_email`] = 'Email is invalid';
      }
      
      if (!parent.password.trim()) {
        errors[`parent_${index}_password`] = 'Password is required';
      } else if (parent.password.length < 6) {
        errors[`parent_${index}_password`] = 'Password must be at least 6 characters';
      }
    });
    
    // Validate children
    familyData.children.forEach((child, index) => {
      if (!child.name.trim()) {
        errors[`child_${index}_name`] = 'Name is required';
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
  
    setIsSubmitting(true);
    
    try {
      console.log("Starting family creation with data:", {
        familyName: familyData.familyName,
        parentData: familyData.parents.map(p => ({...p, password: '****'})), // Log without passwords
        children: familyData.children 
      });
      
      // Create the family in Firebase
      const result = await createFamily(familyData);
      console.log("Family creation result:", result);
      
      // Store the family ID in localStorage to help with debugging
      if (result && result.familyId) {
        localStorage.setItem('lastCreatedFamilyId', result.familyId);
        console.log("Stored family ID in localStorage:", result.familyId);
      }
      
      // Navigate to family selection screen with the newly created family
      console.log("Navigating to family selection with new family");
      localStorage.setItem('selectedFamilyId', result.familyId);
      // Set a flag to ensure we use this new family
      localStorage.setItem('directFamilyAccess', JSON.stringify({
        familyId: result.familyId,
        familyName: familyData.familyName,
        timestamp: new Date().getTime()
      }));
      navigate('/login', { 
        state: { 
          directAccess: true,
          familyId: result.familyId
        } 
      });
    } catch (error) {
      console.error("Detailed error creating family:", error);
      alert("There was an error creating your family: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && uploadForMember) {
      handleImageFile(file);
    }
  };
  
  const handleImageFile = async (file) => {
    setIsUploading(true);
    try {
      if (uploadForMember.id === 'family') {
        // For the signup screen, we'll store the temporary family picture
        // using a timestamp ID since we don't have a familyId yet
        const tempId = Date.now().toString();
        const storageRef = ref(storage, `temp-families/${tempId}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(snapshot.ref);
        
        // Store the family picture URL in the familyData state
        // We'll use this when creating the family in handleSubmit
        setFamilyData({...familyData, familyPicture: imageUrl});
        setShowProfileUpload(false);
      } else {
        // Handle individual profile upload
        const storageRef = ref(storage, `temp-profiles/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(snapshot.ref);
        
        // Update the appropriate parent or child with the profile picture
        if (uploadForMember.role === 'parent') {
          const updatedParents = familyData.parents.map((parent, i) => 
            parent.role === uploadForMember.role ? {...parent, profilePicture: imageUrl} : parent
          );
          setFamilyData({...familyData, parents: updatedParents});
        } else {
          // Must be a child
          const updatedChildren = familyData.children.map((child, i) => 
            i === parseInt(uploadForMember.id) ? {...child, profilePicture: imageUrl} : child
          );
          setFamilyData({...familyData, children: updatedChildren});
        }
        setShowProfileUpload(false);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
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
      setIsUploading(false);
    }
  };

  // Handle login
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
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setShowLoginForm(true);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 font-roboto">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header with logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Allie</h1>
          <p className="text-gray-600 font-light">
            Confirm Your Family Details
          </p>
        </div>
        
        {/* Main content card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-8">
            <div className="bg-purple-50 p-4 rounded-lg mb-6 border-l-4 border-purple-500">
              <h2 className="text-xl font-medium text-purple-800 mb-1">You're Almost There!</h2>
              <p className="text-purple-700">
                Just review your family information below to create your Allie account. You'll be balancing family responsibilities in just a moment!
              </p>
            </div>

            {familyData.parents.some(p => !p.profilePicture) && (
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg shadow-sm mb-6">
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
            
            {/* Family Name Section */}
            <div className="mb-6 border-b pb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Family Name</h3>
                <button 
                  onClick={() => toggleEditSection('familyName')}
                  className="text-blue-600 text-sm flex items-center hover:underline"
                >
                  {editingSections.familyName ? (
                    <><Save size={14} className="mr-1" /> Save</>
                  ) : (
                    <><Edit size={14} className="mr-1" /> Edit</>
                  )}
                </button>
              </div>
              
              {editingSections.familyName ? (
                <div>
                  <input
                    type="text"
                    className={`w-full p-3 border rounded mb-1 ${validationErrors.familyName ? 'border-red-500' : ''}`}
                    placeholder="e.g., Anderson"
                    value={familyData.familyName}
                    onChange={e => {
                      setFamilyData({...familyData, familyName: e.target.value});
                      if (validationErrors.familyName) {
                        const newErrors = {...validationErrors};
                        delete newErrors.familyName;
                        setValidationErrors(newErrors);
                      }
                    }}
                  />
                  {validationErrors.familyName && (
                    <p className="text-red-500 text-sm">{validationErrors.familyName}</p>
                  )}
                </div>
              ) : (
                <p className="text-lg">{familyData.familyName || 'Not specified'}</p>
              )}
            </div>
            
            {/* Parents Section */}
            <div className="mb-6 border-b pb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Parents</h3>
                <button 
                  onClick={() => toggleEditSection('parents')}
                  className="text-blue-600 text-sm flex items-center hover:underline"
                >
                  {editingSections.parents ? (
                    <><Save size={14} className="mr-1" /> Save</>
                  ) : (
                    <><Edit size={14} className="mr-1" /> Edit</>
                  )}
                </button>
              </div>
              
              {editingSections.parents ? (
                <div>
                  {familyData.parents.map((parent, index) => (
                    <div key={index} className="mb-4 p-4 border rounded bg-white">
                      <h4 className="font-medium mb-3">{parent.role} Information</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Name
                          </label>
                          <div className="flex items-center border rounded overflow-hidden">
                            <div className="bg-gray-100 p-2 flex items-center justify-center">
                              <User size={18} className="text-gray-500" />
                            </div>
                            <input
                              type="text"
                              className={`w-full p-2 focus:outline-none ${
                                validationErrors[`parent_${index}_name`] 
                                  ? 'border-red-500 bg-red-50' : ''
                              }`}
                              placeholder={`${parent.role}'s name`}
                              value={parent.name}
                              onChange={(e) => handleParentChange(index, 'name', e.target.value)}
                            />
                          </div>
                          {validationErrors[`parent_${index}_name`] && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors[`parent_${index}_name`]}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Email Address</label>
                          <div className="flex items-center border rounded overflow-hidden">
                            <div className="bg-gray-100 p-2 flex items-center justify-center">
                              <Mail size={18} className="text-gray-500" />
                            </div>
                            <input
                              type="email"
                              className={`w-full p-2 focus:outline-none ${validationErrors[`parent_${index}_email`] ? 'border-red-500 bg-red-50' : ''}`}
                              placeholder={`${parent.role}'s email`}
                              value={parent.email}
                              onChange={(e) => handleParentChange(index, 'email', e.target.value)}
                            />
                          </div>
                          {validationErrors[`parent_${index}_email`] && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors[`parent_${index}_email`]}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Password</label>
                          <div className="flex items-center border rounded overflow-hidden">
                            <div className="bg-gray-100 p-2 flex items-center justify-center">
                              <Key size={18} className="text-gray-500" />
                            </div>
                            <input
                              type="password"
                              className={`w-full p-2 focus:outline-none ${validationErrors[`parent_${index}_password`] ? 'border-red-500 bg-red-50' : ''}`}
                              placeholder="Password"
                              value={parent.password}
                              onChange={(e) => handleParentChange(index, 'password', e.target.value)}
                            />
                          </div>
                          {validationErrors[`parent_${index}_password`] && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors[`parent_${index}_password`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {familyData.parents.map((parent, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <User size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{parent.name || `[${parent.role}]`}</p>
                        <p className="text-sm text-gray-500">{parent.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Children Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Children</h3>
                <button 
                  onClick={() => toggleEditSection('children')}
                  className="text-blue-600 text-sm flex items-center hover:underline"
                >
                  {editingSections.children ? (
                    <><Save size={14} className="mr-1" /> Save</>
                  ) : (
                    <><Edit size={14} className="mr-1" /> Edit</>
                  )}
                </button>
              </div>
              
              {editingSections.children ? (
                <div>
                  {familyData.children.map((child, index) => (
                    <div key={index} className="mb-3 p-4 border rounded">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Child {index + 1}</h4>
                        {familyData.children.length > 1 && (
                          <button
                            onClick={() => removeChild(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            className={`w-full p-2 border rounded ${validationErrors[`child_${index}_name`] ? 'border-red-500' : ''}`}
                            placeholder="Child's name"
                            value={child.name}
                            onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                          />
                          {validationErrors[`child_${index}_name`] && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors[`child_${index}_name`]}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Age</label>
                          <input
                            type="number"
                            min="1"
                            max="18"
                            className="w-full p-2 border rounded"
                            placeholder="Age"
                            value={child.age}
                            onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addChild}
                    className="w-full py-2 flex items-center justify-center text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 mt-2"
                  >
                    <UserPlus size={16} className="mr-2" />
                    Add Another Child
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyData.children.length > 0 ? (
                    familyData.children.map((child, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <User size={18} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{child.name || 'Unnamed Child'}</p>
                          {child.age && <p className="text-sm text-gray-500">{child.age} years old</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No children added</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Benefits Section */}
          <div className="bg-black text-white p-5 rounded-lg mb-6">
            <h3 className="font-medium text-lg mb-3 flex items-center">
              <Users className="text-green-400 mr-2" size={20} />
              Why Families Love Allie
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <Check size={16} className="text-green-400 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm">85% of families report reducing workload conflicts within 4 weeks</p>
              </div>
              <div className="flex items-start">
                <Check size={16} className="text-green-400 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm">Parents save an average of 5-7 hours per week with better balance</p>
              </div>
              <div className="flex items-start">
                <Check size={16} className="text-green-400 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm">Children benefit from seeing balanced partnership modeled</p>
              </div>
              <div className="flex items-start">
                <Check size={16} className="text-green-400 mt-1 mr-2 flex-shrink-0" />
                <p className="text-sm">Relationship satisfaction improves by 42% on average</p>
              </div>
            </div>
          </div>
          
          {/* Final Call to Action */}
          <div className="flex flex-col space-y-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-black text-white rounded-md hover:bg-gray-800 font-medium flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Your Family...
                </>
              ) : (
                <>Create Your Allie Family</>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center mt-4"
            >
              <ArrowLeft size={16} className="mr-1" />
              Cancel
            </button>
            
            {Object.keys(validationErrors).length > 0 && (
              <div className="p-3 bg-red-50 text-red-700 rounded flex items-start">
                <AlertCircle size={20} className="mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Please fix the following errors:</p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {validationErrors.familyName && <li>Enter a family name</li>}
                    {Object.keys(validationErrors).some(k => k.includes('parent')) && <li>Complete all required parent information</li>}
                    {Object.keys(validationErrors).some(k => k.includes('child')) && <li>Enter names for all children</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Allie v1.0 | Creating balanced, happier families</p>
        </div>
      </div>

      {/* Profile picture upload modal */}
      {showProfileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Update Profile Picture</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a new photo for {uploadForMember?.name}
            </p>
              
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                <img 
                  src={uploadForMember?.profilePicture || getDefaultProfileImage(uploadForMember)} 
                  alt="Current profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
              
            <div className="flex items-center justify-center mb-4">
              {isUploading ? (
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded border border-gray-300 flex items-center">
                  <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></div>
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <label 
                  htmlFor="image-upload" 
                  className="flex flex-col items-center px-4 py-3 bg-gray-50 text-black rounded cursor-pointer border border-gray-300 hover:bg-gray-100"
                >
                  <User size={20} className="mb-1" />
                  <span className="text-sm">Upload Photo</span>
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
              
            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setShowProfileUpload(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSignupScreen;