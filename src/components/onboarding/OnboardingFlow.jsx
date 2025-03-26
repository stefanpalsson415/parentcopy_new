
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Star, Award, Brain, 
  Heart, ChevronDown, ChevronUp, Book, BarChart, Scale, 
  Clock, Sliders, AlertTriangle, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; 


const OnboardingFlow = () => {
  const { signInWithGoogle } = useAuth();

  const [step, setStep] = useState(1);
  const [familyData, setFamilyData] = useState({
    familyName: '',
    parents: [
      { name: '', role: 'Mama', email: '', password: '' },
      { name: '', role: 'Papa', email: '', password: '' }
    ],
    children: [{ name: '', age: '' }],
    communication: {
      style: '',
      challengeAreas: [],
      goals: []
    },
    preferences: {
      reminderFrequency: 'weekly',
      meetingDay: 'Sunday'
    },
    priorities: {
      highestPriority: '',
      secondaryPriority: '',
      tertiaryPriority: ''
    },
    aiPreferences: {
      style: '',
      length: '',
      topics: []
    }
  });
  const navigate = useNavigate();
  
  const [validationErrors, setValidationErrors] = useState({});
  const [signingInParent, setSigningInParent] = useState(null); // Track which parent is currently signing in
  const [headerTitle, setHeaderTitle] = useState("We help your family");

  const totalSteps = 19;
  
  // Update header title when family name changes
  useEffect(() => {
    if (familyData.familyName.trim()) {
      setHeaderTitle(`The ${familyData.familyName} Family`);
    } else {
      setHeaderTitle("We help your family");
    }
  }, [familyData.familyName]);

  
  
  // Handle data updates
  const updateFamily = (key, value) => {
    setFamilyData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear validation error when field is updated
    if (validationErrors[key]) {
      const newErrors = {...validationErrors};
      delete newErrors[key];
      setValidationErrors(newErrors);
    }
  };
  
  const updateParent = (index, field, value) => {
    const updatedParents = [...familyData.parents];
    updatedParents[index] = { ...updatedParents[index], [field]: value };
    updateFamily('parents', updatedParents);
    
    // Clear validation error when field is updated
    const errorKey = `parent_${index}_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = {...validationErrors};
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };
  
  const updateChild = (index, field, value) => {
    const updatedChildren = [...familyData.children];
    updatedChildren[index] = { ...updatedChildren[index], [field]: value };
    updateFamily('children', updatedChildren);
    
    // Clear validation error when field is updated
    const errorKey = `child_${index}_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = {...validationErrors};
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };
  
  const addChild = () => {
    updateFamily('children', [...familyData.children, { name: '', age: '' }]);
  };
  
  const removeChild = (index) => {
    const updatedChildren = [...familyData.children];
    updatedChildren.splice(index, 1);
    updateFamily('children', updatedChildren);
  };
  
  const updateCommunication = (field, value) => {
    const updatedCommunication = { ...familyData.communication, [field]: value };
    updateFamily('communication', updatedCommunication);
    
    // Clear validation error when field is updated
    const errorKey = `communication_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = {...validationErrors};
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };
  
  const toggleChallengeArea = (area) => {
    const currentAreas = familyData.communication.challengeAreas || [];
    if (currentAreas.includes(area)) {
      updateCommunication('challengeAreas', currentAreas.filter(a => a !== area));
    } else {
      updateCommunication('challengeAreas', [...currentAreas, area]);
    }
  };
  
  const updatePreference = (field, value) => {
    const updatedPreferences = { ...familyData.preferences, [field]: value };
    updateFamily('preferences', updatedPreferences);
    
    // Clear validation error when field is updated
    const errorKey = `preferences_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = {...validationErrors};
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };

  const updateAIPreference = (field, value) => {
    const updatedPreferences = { ...familyData.aiPreferences, [field]: value };
    updateFamily('aiPreferences', updatedPreferences);
    
    // Clear validation error when field is updated
    const errorKey = `aiPreferences_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = {...validationErrors};
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };

  const toggleAITopic = (topic) => {
    const currentTopics = familyData.aiPreferences.topics || [];
    if (currentTopics.includes(topic)) {
      updateAIPreference('topics', currentTopics.filter(t => t !== topic));
    } else {
      updateAIPreference('topics', [...currentTopics, topic]);
    }
  };
  
  // Validation for each step
  const validateStep = (currentStep) => {
    const errors = {};
    
    switch(currentStep) {
      case 3: // Family name
        if (!familyData.familyName.trim()) {
          errors.familyName = 'Please enter your family name';
        }
        break;
      
        case 5: // Parent information
        familyData.parents.forEach((parent, index) => {
          if (!parent.name.trim()) {
            errors[`parent_${index}_name`] = 'Name is required';
          }
          
          if (!parent.email.trim()) {
            errors[`parent_${index}_email`] = 'Email is required';
          } else if (!/\S+@\S+\.\S+/.test(parent.email)) {
            errors[`parent_${index}_email`] = 'Email is invalid';
          }
          
          // Only validate password if not using Google Auth
          if (!parent.googleAuth) {
            if (!parent.password.trim()) {
              errors[`parent_${index}_password`] = 'Password is required';
            } else if (parent.password.length < 6) {
              errors[`parent_${index}_password`] = 'Password must be at least 6 characters';
            }
          }
        });
        break;
      
      case 6: // Family communication style
        if (!familyData.communication.style) {
          errors.communication_style = 'Please select a communication style';
        }
        if (!familyData.communication.challengeAreas || familyData.communication.challengeAreas.length === 0) {
          errors.communication_challengeAreas = 'Please select at least one challenging area';
        }
        break;
      
      case 7: // Children information
        familyData.children.forEach((child, index) => {
          if (!child.name.trim()) {
            errors[`child_${index}_name`] = 'Name is required';
          }
        });
        break;
      
      case 8: // Relationship insights
        if (!familyData.relationship?.communicationStyle) {
          errors.relationship_communicationStyle = 'Please select a communication style';
        }
        if (!familyData.relationship?.conflictResolution) {
          errors.relationship_conflictResolution = 'Please select a conflict resolution style';
        }
        if (!familyData.relationship?.strengthenArea) {
          errors.relationship_strengthenArea = 'Please select an area to strengthen';
        }
        break;
      
      case 9: // AI assistant customization
        if (!familyData.aiPreferences.style) {
          errors.aiPreferences_style = 'Please select a communication style';
        }
        if (!familyData.aiPreferences.length) {
          errors.aiPreferences_length = 'Please select a response length preference';
        }
        if (!familyData.aiPreferences.topics || familyData.aiPreferences.topics.length === 0) {
          errors.aiPreferences_topics = 'Please select at least one topic of interest';
        }
        break;
      
      case 11: // Family priorities
        if (!familyData.priorities.highestPriority) {
          errors.priorities_highest = 'Please select your highest priority concern';
        }
        if (familyData.priorities.highestPriority && 
            (familyData.priorities.highestPriority === familyData.priorities.secondaryPriority ||
             familyData.priorities.highestPriority === familyData.priorities.tertiaryPriority)) {
          errors.priorities_duplicate = 'Please select different categories for each priority level';
        }
        if (familyData.priorities.secondaryPriority && 
            familyData.priorities.secondaryPriority === familyData.priorities.tertiaryPriority) {
          errors.priorities_duplicate = 'Please select different categories for each priority level';
        }
        break;
      
      case 13: // Current challenge
        if (!familyData.mainChallenge) {
          errors.mainChallenge = 'Please select your current family challenge';
        }
        break;
      
      case 15: // App preferences
        if (!familyData.preferences.reminderFrequency) {
          errors.preferences_reminderFrequency = 'Please select a reminder frequency';
        }
        if (!familyData.preferences.meetingDay) {
          errors.preferences_meetingDay = 'Please select a preferred meeting day';
        }
        break;
      
      case 16: // Family goals
        if (!familyData.goals || familyData.goals.length === 0) {
          errors.goals = 'Please select at least one family goal';
        }
        break;
        
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Move to next step
  const nextStep = () => {
    // Validate the current step
    if (!validateStep(step)) {
      // If validation fails, show error message in app (not alert)
      return;
    }
    
    setStep(step + 1);
  };
  
  // Go back to previous step
  const prevStep = () => {
    setStep(step - 1);
  };
  
  // Function to select a subscription plan
  const selectPlan = (plan) => {
    updateFamily('plan', plan);
    
    // Store data and navigate to payment
    localStorage.setItem('pendingFamilyData', JSON.stringify(familyData));
    navigate('/payment', { 
      state: { 
        fromOnboarding: true,
        familyData: familyData 
      } 
    });
  };
  
  // Render step content
  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6 font-roboto">Welcome to Allie</h2>
            <p className="text-lg mb-8 font-roboto">We're excited to help your family find better balance.</p>
            <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-blue-100 flex items-center justify-center">
              <img 
                src="/assets/family-photo.jpg" 
                alt="Family Balance Research" 
                className="w-48 h-48 object-cover rounded-full"
              />
            </div>
            <p className="text-gray-600 mb-8 font-roboto">
              In the next few minutes, we'll help you set up your family profile and get started on your balance journey.
            </p>
          </div>
        );
        
      case 2:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6 font-roboto">The Invisible Load</h2>
            <p className="text-lg mb-8 font-roboto">
              Did you know? Mental load is the invisible work of managing a household that often goes unnoticed.
            </p>
            <div className="flex justify-center space-x-4 mb-8">
              <div className="bg-purple-100 p-4 rounded-lg">
                <h3 className="font-medium font-roboto">Invisible Tasks</h3>
                <p className="text-sm font-roboto">Planning, organizing, remembering, coordinating</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <h3 className="font-medium font-roboto">Visible Tasks</h3>
                <p className="text-sm font-roboto">Cooking, cleaning, driving, physical childcare</p>
              </div>
            </div>
            <p className="text-gray-600 font-roboto">
              Allie helps measure and balance both visible and invisible work.
            </p>
          </div>
        );
      
      case 3:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">What's your family name?</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              This will help personalize your experience in the app.
            </p>
            <input
              type="text"
              className={`w-full p-3 border rounded mb-4 font-roboto ${validationErrors.familyName ? 'border-red-500' : ''}`}
              placeholder="e.g., Anderson"
              value={familyData.familyName}
              onChange={e => updateFamily('familyName', e.target.value)}
            />
            {validationErrors.familyName && (
              <p className="text-red-500 text-sm mb-4 font-roboto">{validationErrors.familyName}</p>
            )}
            <p className="text-sm text-gray-500 font-roboto">
              This will appear throughout the app and can be changed later.
            </p>
          </div>
        );
        
      case 4:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">The Science Behind Balance</h2>
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <div className="flex items-start mb-4">
                <Brain className="text-blue-600 mr-2 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-medium font-roboto">Research Findings</h3>
                  <p className="text-sm mt-1 font-roboto">In 2021, research from the American Psychological Association found that:</p>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                <li className="font-roboto">85% of mothers report handling most of household planning</li>
                <li className="font-roboto">Families with more balanced workloads report 40% higher satisfaction</li>
                <li className="font-roboto">Children in balanced homes show better emotional development</li>
                <li className="font-roboto">Reduced tension leads to more quality family time</li>
              </ul>
            </div>
            <p className="text-gray-600 font-roboto">
              Allie uses this research to create a data-driven approach to family balance.
            </p>
          </div>
        );

      case 5:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Tell us about the parents</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              We'll use this information to create profiles for each parent in your family.
            </p>
            {familyData.parents.map((parent, index) => (
  <div key={index} className="mb-4 p-4 border rounded bg-white">
    <h3 className="font-medium text-lg mb-3 font-roboto">{parent.role} Information</h3>
    
{/* Google auth info banner */}
{parent.googleAuth && (
  <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
    <p className="text-sm text-green-700 flex items-center font-roboto">
      <CheckCircle size={16} className="mr-1" />
      Google account connected: {parent.googleAuth.email}
    </p>
    <p className="text-xs text-green-600 mt-1 font-roboto">
      Calendar integration and simplified login are enabled
    </p>
  </div>
)}


    {/* Google Sign-in Button */}
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-sm text-blue-700 mb-3 font-roboto">
        <strong>Recommended:</strong> Sign in with Google to enable calendar integration and simplify account management.
      </p>
      <button
  onClick={async () => {
    try {
      // Set loading state
      setSigningInParent(parent.role);
      
      // Call the signInWithGoogle function
      const user = await signInWithGoogle();
      
      if (user) {
        console.log("Successfully signed in with Google:", user.email);
        
        // Update the parent's information with Google data
        const updatedParents = [...familyData.parents];
        updatedParents[index] = {
          ...updatedParents[index],
          email: user.email,
          // Don't change the name if already entered by user
          // If no name is set yet and displayName is available, use that
          // But don't default to the email prefix
          name: updatedParents[index].name || (user.displayName || ''),
          googleAuth: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        };
        
        // Update family data with the new parent info
        setFamilyData({...familyData, parents: updatedParents});
        
        // Clear the signing in state
        setSigningInParent(null);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Reset loading state
      setSigningInParent(null);
    }
  }}
  disabled={signingInParent === parent.role || parent.googleAuth} // Disable if already connected
  className={`w-full flex items-center justify-center rounded-md p-2 font-roboto ${
    parent.googleAuth 
      ? 'bg-green-50 border border-green-300 text-green-700' 
      : 'bg-white border border-gray-300 hover:bg-gray-50'
  }`}
>
  {signingInParent === parent.role ? (
    <span>Connecting...</span>
  ) : parent.googleAuth ? (
    <div className="flex items-center">
      <CheckCircle size={16} className="mr-2" />
      Connected with Google
    </div>
  ) : (
    <>
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
      </svg>
      Sign in with Google as {parent.role}
    </>
  )}
</button>
    </div>
    
    <div className="relative mb-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="px-2 bg-white text-gray-500 text-sm font-roboto">or enter manually</span>
      </div>
    </div>
    
    {/* Email field */}
    <label className="block">
  <span className="text-gray-700 text-sm font-roboto">
    Name
    {parent.googleAuth && !parent.name && (
      <span className="text-amber-600 ml-1 font-medium">
        ← Please add your name
      </span>
    )}
  </span>
  <input
    type="text"
    className={`w-full p-2 border rounded mt-1 font-roboto ${
      validationErrors[`parent_${index}_name`] 
        ? 'border-red-500' 
        : parent.googleAuth && !parent.name 
          ? 'border-amber-500 bg-amber-50' 
          : ''
    }`}
    placeholder={`${parent.role}'s name`}
    value={parent.name}
    onChange={e => updateParent(index, 'name', e.target.value)}
  />
  {validationErrors[`parent_${index}_name`] && (
    <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`parent_${index}_name`]}</p>
  )}
</label>

{/* Only show password field if not using Google Auth */}
{!parent.googleAuth && (
  <label className="block">
    <span className="text-gray-700 text-sm font-roboto">Password</span>
    <input
      type="password"
      className={`w-full p-2 border rounded mt-1 font-roboto ${validationErrors[`parent_${index}_password`] ? 'border-red-500' : ''}`}
      placeholder="Password"
      value={parent.password}
      onChange={e => updateParent(index, 'password', e.target.value)}
    />
    {validationErrors[`parent_${index}_password`] && (
      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`parent_${index}_password`]}</p>
    )}
  </label>
)}
    
    {parent.googleAuth && (
      <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Google account connected. Calendar integration will be available!
        </p>
      </div>
    )}
  </div>
))}
          </div>
        );
        
      case 6:
        // Family Communication Style - with added AI engine explanation
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Family Communication Style</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Understanding how your family communicates helps us personalize the experience.
            </p>
            <div className="space-y-4">
              <label className="block">
                <span className="text-gray-700 font-roboto">How would you describe your family's communication style?</span>
                <select 
                  className={`w-full p-2 border rounded mt-1 font-roboto ${validationErrors.communication_style ? 'border-red-500' : ''}`}
                  value={familyData.communication.style}
                  onChange={e => updateCommunication('style', e.target.value)}
                >
                  <option value="">Select an option</option>
                  <option value="open">Very open - we talk about everything</option>
                  <option value="selective">Selective - we discuss some topics easily</option>
                  <option value="reserved">Reserved - we tend to keep things to ourselves</option>
                  <option value="avoidant">Avoidant - we rarely discuss sensitive topics</option>
                </select>
                {validationErrors.communication_style && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.communication_style}</p>
                )}
              </label>
              
              <div>
                <p className="text-gray-700 mb-2 font-roboto">Which areas are most challenging to discuss? (Select all that apply)</p>
                {validationErrors.communication_challengeAreas && (
                  <p className="text-red-500 text-xs mb-2 font-roboto">{validationErrors.communication_challengeAreas}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Household tasks', 'Parenting approaches', 'Time management', 'Emotional support', 'Financial decisions', 'Personal boundaries'].map(area => (
                    <label key={area} className={`flex items-center p-2 border rounded hover:bg-gray-50 font-roboto ${
                      validationErrors.communication_challengeAreas ? 'border-red-500' : ''
                    }`}>
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        checked={familyData.communication.challengeAreas?.includes(area) || false}
                        onChange={() => toggleChallengeArea(area)}
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800 font-roboto">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1 font-roboto">
                      Our AI engine uses your communication style to tailor how it presents recommendations and tasks. 
                      Families with reserved styles receive more detailed guidance, while those with open styles get more 
                      focused conversation prompts. This helps create meaningful change in a way that works for your 
                      specific family dynamic.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        case 7:
        // Children information
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Your Children</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Tell us about your children so we can include their perspectives in your family balance journey.
            </p>
            
            {familyData.children.map((child, index) => (
              <div key={index} className="mb-4 p-4 border rounded bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium font-roboto">Child {index + 1}</h3>
                  {familyData.children.length > 1 && (
                    <button 
                      className="text-red-500 hover:text-red-700 font-roboto"
                      onClick={() => removeChild(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 text-sm font-roboto">Name</span>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded mt-1 font-roboto ${validationErrors[`child_${index}_name`] ? 'border-red-500' : ''}`}
                      placeholder="Child's name"
                      value={child.name}
                      onChange={e => updateChild(index, 'name', e.target.value)}
                    />
                    {validationErrors[`child_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`child_${index}_name`]}</p>
                    )}
                  </label>
                  
                  <label className="block">
                    <span className="text-gray-700 text-sm font-roboto">Age</span>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      className="w-full p-2 border rounded mt-1 font-roboto"
                      placeholder="Age"
                      value={child.age}
                      onChange={e => updateChild(index, 'age', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
            
            <button
              onClick={addChild}
              className="w-full py-2 border border-black text-black rounded hover:bg-gray-50 mt-2 font-roboto"
            >
              Add Another Child
            </button>
          </div>
        );
        
      case 8:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Relationship Insights</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Understanding your partnership helps us provide more personalized support for your unique relationship dynamics.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">How would you describe your communication style with your partner?</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.relationship_communicationStyle ? 'border-red-500' : ''}`}
                  value={familyData.relationship?.communicationStyle || ''}
                  onChange={(e) => {
                    const updatedRelationship = { ...familyData.relationship, communicationStyle: e.target.value };
                    updateFamily('relationship', updatedRelationship);
                    
                    // Clear validation error when field is updated
                    if (validationErrors.relationship_communicationStyle) {
                      const newErrors = {...validationErrors};
                      delete newErrors.relationship_communicationStyle;
                      setValidationErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select an option</option>
                  <option value="direct">Direct - We're straightforward with each other</option>
                  <option value="collaborative">Collaborative - We work through things together</option>
                  <option value="supportive">Supportive - We focus on empathy and understanding</option>
                  <option value="conflict-avoidant">Conflict-Avoidant - We tend to avoid difficult topics</option>
                </select>
                {validationErrors.relationship_communicationStyle && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.relationship_communicationStyle}</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">How do you typically resolve disagreements?</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.relationship_conflictResolution ? 'border-red-500' : ''}`}
                  value={familyData.relationship?.conflictResolution || ''}
                  onChange={(e) => {
                    const updatedRelationship = { ...familyData.relationship, conflictResolution: e.target.value };
                    updateFamily('relationship', updatedRelationship);
                    
                    // Clear validation error when field is updated
                    if (validationErrors.relationship_conflictResolution) {
                      const newErrors = {...validationErrors};
                      delete newErrors.relationship_conflictResolution;
                      setValidationErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select an option</option>
                  <option value="immediate">We address issues immediately</option>
                  <option value="scheduled">We set aside time for difficult conversations</option>
                  <option value="cool-down">We wait until emotions cool down</option>
                  <option value="third-party">We sometimes need a mediator or counselor</option>
                </select>
                {validationErrors.relationship_conflictResolution && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.relationship_conflictResolution}</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">What area of your relationship would you like to strengthen most?</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.relationship_strengthenArea ? 'border-red-500' : ''}`}
                  value={familyData.relationship?.strengthenArea || ''}
                  onChange={(e) => {
                    const updatedRelationship = { ...familyData.relationship, strengthenArea: e.target.value };
                    updateFamily('relationship', updatedRelationship);
                    
                    // Clear validation error when field is updated
                    if (validationErrors.relationship_strengthenArea) {
                      const newErrors = {...validationErrors};
                      delete newErrors.relationship_strengthenArea;
                      setValidationErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select an option</option>
                  <option value="communication">Communication</option>
                  <option value="quality-time">Quality Time Together</option>
                  <option value="shared-responsibilities">Shared Responsibilities</option>
                  <option value="emotional-support">Emotional Support</option>
                  <option value="parenting-alignment">Parenting Alignment</option>
                </select>
                {validationErrors.relationship_strengthenArea && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.relationship_strengthenArea}</p>
                )}
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start">
                <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-purple-800 font-roboto">Why We Ask This</h4>
                  <p className="text-sm text-purple-700 mt-1 font-roboto">
                    Research shows that relationship dynamics directly impact family balance. Allie uses this information to provide personalized relationship strengthening strategies alongside workload balancing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Customize Your AI Assistant</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Allie is your AI-powered family assistant. Tell us how you'd like Allie to communicate with you.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Preferred communication style:</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.aiPreferences_style ? 'border-red-500' : ''}`}
                  value={familyData.aiPreferences?.style || ''}
                  onChange={(e) => updateAIPreference('style', e.target.value)}
                >
                  <option value="">Select a style</option>
                  <option value="friendly">Friendly and Conversational</option>
                  <option value="direct">Direct and To-the-Point</option>
                  <option value="supportive">Supportive and Encouraging</option>
                  <option value="analytical">Analytical and Detailed</option>
                </select>
                {validationErrors.aiPreferences_style && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.aiPreferences_style}</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Response length preference:</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.aiPreferences_length ? 'border-red-500' : ''}`}
                  value={familyData.aiPreferences?.length || ''}
                  onChange={(e) => updateAIPreference('length', e.target.value)}
                >
                  <option value="">Select a length</option>
                  <option value="concise">Concise - Just the essentials</option>
                  <option value="balanced">Balanced - Some explanation</option>
                  <option value="detailed">Detailed - Full explanations</option>
                </select>
                {validationErrors.aiPreferences_length && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.aiPreferences_length}</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Topics of particular interest:</label>
                {validationErrors.aiPreferences_topics && (
                  <p className="text-red-500 text-xs mb-2 font-roboto">{validationErrors.aiPreferences_topics}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {['Balance insights', 'Parenting tips', 'Relationship advice', 'Time management', 'Self-care reminders'].map(topic => (
                    <label key={topic} className={`flex items-center p-2 border rounded hover:bg-gray-50 font-roboto ${
                      validationErrors.aiPreferences_topics ? 'border-red-500' : ''
                    }`}>
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        checked={familyData.aiPreferences?.topics?.includes(topic) || false}
                        onChange={() => toggleAITopic(topic)}
                      />
                      <span>{topic}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <MessageSquare size={20} className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                <p className="text-sm text-blue-800 font-roboto">
                  Allie will be available to chat anytime through the app, helping you with task management, relationship insights, and family balance guidance based on your preferences.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 10:
        // The Four Categories
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">The Four Categories of Family Tasks</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Allie divides family responsibilities into four categories to help identify imbalances.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-800 mb-1 font-roboto">Visible Household Tasks</h3>
                <p className="text-sm text-blue-700 font-roboto">
                  Physical tasks you can see: cooking, cleaning, laundry, yard work, home repairs
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-purple-50">
                <h3 className="font-medium text-purple-800 mb-1 font-roboto">Invisible Household Tasks</h3>
                <p className="text-sm text-purple-700 font-roboto">
                  Mental work of running a home: planning meals, managing schedules, remembering events, coordinating appointments
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50">
                <h3 className="font-medium text-green-800 mb-1 font-roboto">Visible Parenting Tasks</h3>
                <p className="text-sm text-green-700 font-roboto">
                  Physical childcare: driving kids, helping with homework, bedtime routines, attending events
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-amber-50">
                <h3 className="font-medium text-amber-800 mb-1 font-roboto">Invisible Parenting Tasks</h3>
                <p className="text-sm text-amber-700 font-roboto">
                  Emotional labor: providing emotional support, anticipating needs, coordinating with schools, monitoring development
                </p>
              </div>
            </div>
          </div>
        );
        
      case 11:
        // Your Family's Priorities
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Your Family's Priorities</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              To personalize your experience, tell us which areas are most important for your family to balance.
            </p>
                
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Highest priority concern:</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.priorities_highest || validationErrors.priorities_duplicate ? 'border-red-500' : ''}`}
                  value={familyData.priorities?.highestPriority || ''}
                  onChange={e => {
                    const updatedPriorities = {
                      ...familyData.priorities,
                      highestPriority: e.target.value
                    };
                    updateFamily('priorities', updatedPriorities);
                  }}
                >
                  <option value="">Select a category</option>
                  <option value="Visible Household Tasks">Visible Household Tasks</option>
                  <option value="Invisible Household Tasks">Invisible Household Tasks</option>
                  <option value="Visible Parental Tasks">Visible Parental Tasks</option>
                  <option value="Invisible Parental Tasks">Invisible Parental Tasks</option>
                </select>
                {validationErrors.priorities_highest && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.priorities_highest}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 font-roboto">
                  Tasks related to cooking, cleaning, laundry, and other observable household work
                </p>
              </div>
                  
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Secondary priority concern:</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.priorities_duplicate ? 'border-red-500' : ''}`}
                  value={familyData.priorities?.secondaryPriority || ''}
                  onChange={e => {
                    // Prevent duplicate selection
                    if (e.target.value === familyData.priorities?.highestPriority) {
                      setValidationErrors({
                        ...validationErrors,
                        priorities_duplicate: "This category is already your highest priority. Please select a different category."
                      });
                      return;
                    }
                    
                    const updatedPriorities = {
                      ...familyData.priorities,
                      secondaryPriority: e.target.value
                    };
                    updateFamily('priorities', updatedPriorities);
                    
                    // Clear duplicate error if exists
                    if (validationErrors.priorities_duplicate) {
                      const newErrors = {...validationErrors};
                      delete newErrors.priorities_duplicate;
                      setValidationErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select a category</option>
                  <option value="Visible Household Tasks">Visible Household Tasks</option>
                  <option value="Invisible Household Tasks">Invisible Household Tasks</option>
                  <option value="Visible Parental Tasks">Visible Parental Tasks</option>
                  <option value="Invisible Parental Tasks">Invisible Parental Tasks</option>
                </select>
                <p className="text-xs text-gray-500 mt-1 font-roboto">
                  Tasks related to planning, scheduling, and mental/cognitive household management
                </p>
              </div>
                  
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Tertiary priority concern:</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.priorities_duplicate ? 'border-red-500' : ''}`}
                  value={familyData.priorities?.tertiaryPriority || ''}
                  onChange={e => {
                    // Prevent duplicate selection
                    if (e.target.value === familyData.priorities?.highestPriority || 
                        e.target.value === familyData.priorities?.secondaryPriority) {
                      setValidationErrors({
                        ...validationErrors,
                        priorities_duplicate: "This category is already selected as a priority. Please select a different category."
                      });
                      return;
                    }
                    
                    const updatedPriorities = {
                      ...familyData.priorities,
                      tertiaryPriority: e.target.value
                    };
                    updateFamily('priorities', updatedPriorities);
                    
                    // Clear duplicate error if exists
                    if (validationErrors.priorities_duplicate) {
                      const newErrors = {...validationErrors};
                      delete newErrors.priorities_duplicate;
                      setValidationErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select a category</option>
                  <option value="Visible Household Tasks">Visible Household Tasks</option>
                  <option value="Invisible Household Tasks">Invisible Household Tasks</option>
                  <option value="Visible Parental Tasks">Visible Parental Tasks</option>
                  <option value="Invisible Parental Tasks">Invisible Parental Tasks</option>
                </select>
                {validationErrors.priorities_duplicate && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.priorities_duplicate}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 font-roboto">
                  Tasks related to childcare, homework help, and other visible child-focused work
                </p>
              </div>
                  
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-roboto">
                  <strong>Why this matters:</strong> We'll use these priorities to personalize your experience. Tasks in your priority areas will be weighted more heavily in your family balance calculations, helping identify the most important areas for improvement.
                </p>
              </div>
              
              {/* AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Sliders size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800 font-roboto">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1 font-roboto">
                      Your priorities directly influence our AI weighting system. High-priority tasks receive a multiplier of 1.5x in our calculations, secondary priorities get a 1.3x multiplier, and tertiary priorities get a 1.1x multiplier. This ensures our recommendations focus on the areas that matter most to your family.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 12:
        // Task Weighting System Introduction
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Allie's Intelligent Task Weighting</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Not all tasks are created equal. Allie uses a sophisticated weighting system to accurately measure workload balance.
            </p>
            
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="flex items-start mb-4">
                <BarChart size={24} className="text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg font-roboto">Beyond Simple Task Counting</h3>
                  <p className="text-gray-700 mt-2 font-roboto">
                    Traditional approaches simply count who does which tasks, but this misses crucial factors that contribute to workload. Allie's multi-factor weighting system accounts for:
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <Clock size={20} className="text-indigo-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium font-roboto">Time Investment</h4>
                    <p className="text-sm text-gray-600 font-roboto">Tasks rated from 1-5 based on time required</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <AlertTriangle size={20} className="text-amber-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium font-roboto">Task Frequency</h4>
                    <p className="text-sm text-gray-600 font-roboto">Daily tasks weigh more than monthly ones</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Heart size={20} className="text-red-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium font-roboto">Emotional Labor</h4>
                    <p className="text-sm text-gray-600 font-roboto">Accounts for mental/emotional burden</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium font-roboto">Cognitive Load</h4>
                    <p className="text-sm text-gray-600 font-roboto">Measures mental planning and tracking</p>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 italic text-center font-roboto">
              "The true imbalance isn't just in who does more tasks, but in who carries more of the mental and emotional load."
            </p>
          </div>
        );

      case 13:
        // What's Your Current Challenge?
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">What's Your Current Challenge?</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Understanding your challenges helps us customize your experience.
            </p>
            
            <div className="space-y-3">
              {validationErrors.mainChallenge && (
                <p className="text-red-500 text-sm mb-4 font-roboto">{validationErrors.mainChallenge}</p>
              )}
              
              <label className={`flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.mainChallenge ? 'border-red-500' : ''
              }`}>
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3" 
                  checked={familyData.mainChallenge === 'awareness'}
                  onChange={() => updateFamily('mainChallenge', 'awareness')}
                />
                <div>
                  <p className="font-medium font-roboto">Awareness Gap</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    We disagree about who does more and don't have a clear picture of the workload distribution
                  </p>
                </div>
              </label>
              
              <label className={`flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.mainChallenge ? 'border-red-500' : ''
              }`}>
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3" 
                  checked={familyData.mainChallenge === 'implementation'}
                  onChange={() => updateFamily('mainChallenge', 'implementation')}
                />
                <div>
                  <p className="font-medium font-roboto">Implementation Struggle</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    We know there's an imbalance but can't figure out how to practically fix it
                  </p>
                </div>
              </label>
              
              <label className={`flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.mainChallenge ? 'border-red-500' : ''
              }`}>
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3"
                  checked={familyData.mainChallenge === 'sustainability'}
                  onChange={() => updateFamily('mainChallenge', 'sustainability')}
                />
                <div>
                  <p className="font-medium font-roboto">Sustainability Issues</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    We try to share better but keep falling back into old patterns
                  </p>
                </div>
              </label>
              
              <label className={`flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.mainChallenge ? 'border-red-500' : ''
              }`}>
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3"
                  checked={familyData.mainChallenge === 'communication'}
                  onChange={() => updateFamily('mainChallenge', 'communication')}
                />
                <div>
                  <p className="font-medium font-roboto">Communication Barriers</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Discussions about workload lead to arguments instead of solutions
                  </p>
                </div>
              </label>
              
              {/* AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800 font-roboto">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1 font-roboto">
                      Your primary challenge shapes Allie's AI recommendations. For awareness gaps, we focus on providing clear data visualization. For implementation struggles, we prioritize specific, actionable tasks. For sustainability issues, we emphasize habit-building features. And for communication barriers, we provide structured conversation guides customized to your family's style.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 14:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">The Allie Approach</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              We use a structured, weekly cycle system to help your family achieve lasting balance.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <div className="flex">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center text-blue-600 font-medium mr-3 flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-medium font-roboto">Initial 80-Question Survey</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Comprehensive assessment of visible and invisible tasks across all family members
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                <div className="flex">
                  <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center text-green-600 font-medium mr-3 flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-medium font-roboto">Weekly Task Focus</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      AI generates personalized tasks based on your family's specific imbalances
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                <div className="flex">
                  <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center text-purple-600 font-medium mr-3 flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-medium font-roboto">Couple Relationship Check-in</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Brief assessment of relationship satisfaction and communication quality
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500 shadow-sm">
                <div className="flex">
                  <div className="bg-amber-100 rounded-full w-8 h-8 flex items-center justify-center text-amber-600 font-medium mr-3 flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-medium font-roboto">20-Question Weekly Survey</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Track progress with shorter follow-up surveys focused on key balance areas
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-pink-500 shadow-sm">
                <div className="flex">
                  <div className="bg-pink-100 rounded-full w-8 h-8 flex items-center justify-center text-pink-600 font-medium mr-3 flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-medium font-roboto">Guided Family Meeting</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      AI-generated 30-minute agenda to discuss progress, challenges, and set next week's goals
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                <div className="flex">
                  <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-indigo-600 font-medium mr-3 flex-shrink-0">6</div>
                  <div>
                    <h3 className="font-medium font-roboto">Cycle Completion & Data Archive</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Weekly data is preserved for historical reference and progress tracking
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 15:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">App Preferences</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Let's customize how Allie works for your family.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">How often would you like reminders?</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.preferences_reminderFrequency ? 'border-red-500' : ''}`}
                  value={familyData.preferences.reminderFrequency}
                  onChange={e => updatePreference('reminderFrequency', e.target.value)}
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {validationErrors.preferences_reminderFrequency && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.preferences_reminderFrequency}</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-roboto">Preferred day for family meetings?</label>
                <select 
                  className={`w-full p-2 border rounded font-roboto ${validationErrors.preferences_meetingDay ? 'border-red-500' : ''}`}
                  value={familyData.preferences.meetingDay}
                  onChange={e => updatePreference('meetingDay', e.target.value)}
                >
                  <option value="">Select a day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                {validationErrors.preferences_meetingDay && (
                  <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors.preferences_meetingDay}</p>
                )}
              </div>
              
              <div>
                <label className="flex items-center font-roboto">
                  <input 
                    type="checkbox" 
                    className="mr-2"
                    checked={familyData.preferences.emailUpdates || false}
                    onChange={e => updatePreference('emailUpdates', e.target.checked)}
                  />
                  <span>Send weekly progress updates by email</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center font-roboto">
                  <input 
                    type="checkbox" 
                    className="mr-2"
                    checked={familyData.preferences.kidFriendlyMode || false}
                    onChange={e => updatePreference('kidFriendlyMode', e.target.checked)}
                  />
                  <span>Enable kid-friendly mode for children under 12</span>
                </label>
              </div>
            </div>
          </div>
        );
        
      case 16:
        // Your Family's Goals
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Your Family's Goals</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              What are you hoping to achieve with Allie? Select all that apply.
            </p>
            
            {validationErrors.goals && (
              <p className="text-red-500 text-sm mb-4 font-roboto">{validationErrors.goals}</p>
            )}
            
            <div className="space-y-3">
              <label className={`flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.goals ? 'border-red-500' : ''
              }`}>
                <input 
                  type="checkbox" 
                  className="mr-3" 
                  checked={familyData.goals?.includes('balance') || false}
                  onChange={() => {
                    const goals = familyData.goals || [];
                    if (goals.includes('balance')) {
                      updateFamily('goals', goals.filter(g => g !== 'balance'));
                    } else {
                      updateFamily('goals', [...goals, 'balance']);
                    }
                  }}
                />
                <div>
                  <p className="font-medium font-roboto">More balanced distribution of tasks</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Equalize workload between parents to reduce burden on one person
                  </p>
                </div>
              </label>
              
              <label className={`flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.goals ? 'border-red-500' : ''
              }`}>
                <input 
                  type="checkbox" 
                  className="mr-3"
                  checked={familyData.goals?.includes('time') || false}
                  onChange={() => {
                    const goals = familyData.goals || [];
                    if (goals.includes('time')) {
                      updateFamily('goals', goals.filter(g => g !== 'time'));
                    } else {
                      updateFamily('goals', [...goals, 'time']);
                    }
                  }}
                />
                <div>
                  <p className="font-medium font-roboto">More quality family time</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Create space for meaningful connections and activities together
                  </p>
                </div>
              </label>
              
              <label className={`flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.goals ? 'border-red-500' : ''
              }`}>
                <input 
                  type="checkbox" 
                  className="mr-3"
                  checked={familyData.goals?.includes('conflict') || false}
                  onChange={() => {
                    const goals = familyData.goals || [];
                    if (goals.includes('conflict')) {
                      updateFamily('goals', goals.filter(g => g !== 'conflict'));
                    } else {
                      updateFamily('goals', [...goals, 'conflict']);
                    }
                  }}
                />
                <div>
                  <p className="font-medium font-roboto">Reduced conflict over responsibilities</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Less tension and arguments about who does what
                  </p>
                </div>
              </label>
              
              <label className={`flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.goals ? 'border-red-500' : ''
              }`}>
                <input 
                  type="checkbox" 
                  className="mr-3"
                  checked={familyData.goals?.includes('recognition') || false}
                  onChange={() => {
                    const goals = familyData.goals || [];
                    if (goals.includes('recognition')) {
                      updateFamily('goals', goals.filter(g => g !== 'recognition'));
                    } else {
                      updateFamily('goals', [...goals, 'recognition']);
                    }
                  }}
                />
                <div>
                  <p className="font-medium font-roboto">Recognition of invisible work</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Acknowledge the mental load and planning that often goes unseen
                  </p>
                </div>
              </label>
              
              <label className={`flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer font-roboto ${
                validationErrors.goals ? 'border-red-500' : ''
              }`}>
                <input 
                  type="checkbox" 
                  className="mr-3"
                  checked={familyData.goals?.includes('modeling') || false}
                  onChange={() => {
                    const goals = familyData.goals || [];
                    if (goals.includes('modeling')) {
                      updateFamily('goals', goals.filter(g => g !== 'modeling'));
                    } else {
                      updateFamily('goals', [...goals, 'modeling']);
                    }
                  }}
                />
                <div>
                  <p className="font-medium font-roboto">Better role modeling for children</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    Demonstrate balanced partnerships and equality to the next generation
                  </p>
                </div>
              </label>
              
              {/* AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800 font-roboto">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1 font-roboto">
                      Your goals help our AI engine calibrate your success metrics. If reducing conflict is your priority, we'll measure success through tension reduction rather than just task redistribution. If role modeling is important, we'll prioritize tasks visible to your children. This personalized approach ensures we're measuring what matters most to your family.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 17:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Your Weekly Journey</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Here's what a typical week with Allie looks like:
            </p>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center font-roboto">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">M</div>
                  Monday: Review Weekly Tasks
                </h3>
                <p className="text-sm text-gray-600 pl-8 font-roboto">
                  Both parents review this week's 3 recommended tasks designed to improve balance
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center font-roboto">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">T-F</div>
                  Tuesday-Friday: Implement Changes
                </h3>
                <p className="text-sm text-gray-600 pl-8 font-roboto">
                  Practice new task distribution throughout the week, with gentle reminders
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center font-roboto">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">S</div>
                  Saturday: Quick Check-ins
                </h3>
                <p className="text-sm text-gray-600 pl-8 font-roboto">
                  Each family member completes a 5-minute survey to measure that week's progress
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center font-roboto">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">S</div>
                  Sunday: Family Meeting
                </h3>
                <p className="text-sm text-gray-600 pl-8 font-roboto">
                  30-minute guided discussion about what worked, what didn't, and goals for next week
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 font-roboto">
              Don't worry - all of this is customizable to fit your family's schedule!
            </p>
          </div>
        );
        
      case 18:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Key Features of Allie</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Here are the powerful tools you'll have access to:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <Book className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">Family Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Visual tracking of your family balance journey with progress charts and insights
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <Brain className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">AI Task Engine</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Smart recommendations for tasks to redistribute based on your family's data
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Book className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">Family Meeting Guide</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Structured discussion templates to make communication easy and productive
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <BarChart className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">Weekly Progress Reports</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Detailed analysis of your improvements and areas that need more attention
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-amber-100 p-2 rounded-lg mr-3">
                    <Book className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">Kid-Friendly Interface</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Age-appropriate surveys for children to share their perspectives
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg mr-3">
                    <Book className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium font-roboto">Educational Resources</h3>
                    <p className="text-sm text-gray-600 mt-1 font-roboto">
                      Articles, videos, and research about family balance and relationship health
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 19:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6 font-roboto">You're Ready to Begin!</h2>
            <p className="text-lg mb-8 font-roboto">
              Choose how you'd like to proceed with Allie
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2 font-roboto">Join Allie Premium</h3>
                <p className="text-gray-600 mb-4 font-roboto">Get full access to all features and start your family balance journey</p>
                <button 
                  onClick={() => {
                    // Store family data in localStorage
                    localStorage.setItem('pendingFamilyData', JSON.stringify(familyData));
                    // Navigate to payment
                    navigate('/payment', { 
                      state: { 
                        fromOnboarding: true,
                        familyData: familyData 
                      } 
                    });
                  }}
                  className="px-6 py-3 bg-black text-white rounded-md w-full hover:bg-gray-800 font-roboto"
                >
                  Subscribe Now
                </button>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2 font-roboto">Try Our Mini Assessment</h3>
                <p className="text-gray-600 mb-4 font-roboto">Take a quick 20-question survey to see if your family has balance issues</p>
                <button 
                  onClick={() => {
                    // Store family data in localStorage
                    localStorage.setItem('pendingFamilyData', JSON.stringify(familyData));
                    // Navigate to mini survey
                    navigate('/mini-survey', { 
                      state: { 
                        fromOnboarding: true,
                        familyData: familyData 
                      } 
                    });
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-md w-full hover:bg-purple-700 font-roboto"
                >
                  Start Mini Survey
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-6 font-roboto">
              Your data is secure and will only be used to improve your family experience.
            </p>
          </div>
        );
        
      default:
        return <div className="font-roboto">Step content not found</div>;
    }
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col font-roboto">
      {/* Progress bar at top */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-black h-full transition-all duration-500 ease-in-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>
      
      {/* Header with family name */}
      <div className="text-center py-6">
        <h1 className="text-4xl font-light text-black mb-2 font-roboto">
          {headerTitle}
        </h1>
        {step > 3 && familyData.familyName && (
          <p className="text-gray-600 font-light font-roboto">Personalizing your family balance experience</p>
        )}
      </div>
  
      <div className="flex-1 flex flex-col md:flex-row justify-center px-4 py-6">
        {/* Main content */}
        <div className="w-full max-w-md">
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <button
              onClick={() => step > 1 && prevStep()}
              className={`px-4 py-2 flex items-center font-roboto ${step === 1 ? 'invisible' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            
            {step < totalSteps ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-black text-white rounded flex items-center hover:bg-gray-800 font-roboto"
              >
                {step === totalSteps - 1 ? 'Finish' : 'Continue'}
                <ArrowRight size={16} className="ml-1" />
              </button>
            ) : null}
          </div>
        </div>
        
        {/* Family illustration - only visible on md screens and up */}
        <div className="hidden md:flex md:ml-8 lg:ml-12 mt-8 md:mt-0 w-80">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" className="w-full">
            <g stroke="black" strokeWidth="2.5" fill="none">
              {/* Parent 1 - head and body */}
              <path 
                d="M120,80 C130,80 140,70 140,60 C140,45 125,45 120,50 C115,45 100,45 100,60 C100,70 110,80 120,80z" 
                strokeDasharray="100" 
                strokeDashoffset={step < 3 ? "100" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M120,80 L120,150" 
                strokeDasharray="70" 
                strokeDashoffset={step < 4 ? "70" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 1 - arms */}
              <path 
                d="M120,100 L90,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 5 ? "50" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M120,100 L150,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 6 ? "50" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 1 - legs */}
              <path 
                d="M120,150 L100,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 7 ? "60" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M120,150 L140,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 8 ? "60" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 2 - head and body */}
              <path 
                d="M240,80 C250,80 260,70 260,60 C260,45 245,45 240,50 C235,45 220,45 220,60 C220,70 230,80 240,80z" 
                strokeDasharray="100" 
                strokeDashoffset={step < 9 ? "100" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,80 L240,150" 
                strokeDasharray="70" 
                strokeDashoffset={step < 10 ? "70" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 2 - arms */}
              <path 
                d="M240,100 L210,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 11 ? "50" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,100 L270,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 12 ? "50" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 2 - legs */}
              <path 
                d="M240,150 L220,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 13 ? "60" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,150 L260,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 14 ? "60" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child 1 - head and body */}
              <path 
                d="M180,120 C185,120 190,115 190,110 C190,102 182,102 180,105 C178,102 170,102 170,110 C170,115 175,120 180,120z" 
                strokeDasharray="50" 
                strokeDashoffset={step < 15 ? "50" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,120 L180,160" 
                strokeDasharray="40" 
                strokeDashoffset={step < 16 ? "40" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child 1 - arms */}
              <path 
                d="M180,130 L165,145" 
                strokeDasharray="25" 
                strokeDashoffset={step < 17 ? "25" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,130 L195,145" 
                strokeDasharray="25" 
                strokeDashoffset={step < 18 ? "25" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child 1 - legs */}
              <path 
                d="M180,160 L170,190" 
                strokeDasharray="40" 
                strokeDashoffset={step < 19 ? "40" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,160 L190,190" 
                strokeDasharray="40" 
                strokeDashoffset={step < totalSteps ? "40" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Connections between family members - hands */}
              <path 
                d="M150,130 C160,140 170,145 180,145" 
                strokeDasharray="40" 
                strokeDashoffset={step < totalSteps - 1 ? "40" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M210,130 C200,140 190,145 180,145" 
                strokeDasharray="40" 
                strokeDashoffset={step < totalSteps ? "40" : "0"}
                className="transition-all duration-700"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );  
};

export default OnboardingFlow;