import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Brain, 
  Heart, BarChart, Sliders, Scale, Clock, Users, PlusCircle, Edit, Trash2, User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import familyPhoto from '../../assets/family-photo.jpg';


const OnboardingFlow = () => {
  const navigate = useNavigate();

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
      challengeAreas: []
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
  
  const [validationErrors, setValidationErrors] = useState({});
  const [headerTitle, setHeaderTitle] = useState("Let's get started with Allie");

  const totalSteps = 10;
  
  // Save progress between steps
  useEffect(() => {
    try {
      localStorage.setItem('onboardingProgress', JSON.stringify({
        step,
        familyData,
        timestamp: new Date().getTime()
      }));
    } catch (e) {
      console.error("Error saving onboarding progress:", e);
    }
  }, [step, familyData]);
  
  // Try to restore progress on initial load
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('onboardingProgress');
      if (savedProgress) {
        const { step: savedStep, familyData: savedData, timestamp } = JSON.parse(savedProgress);
        
        // Only restore if saved within the last 24 hours
        const now = new Date().getTime();
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          setStep(savedStep);
          setFamilyData(savedData);
          if (savedData.familyName) {
            setHeaderTitle(`The ${savedData.familyName} Family`);
          }
        }
      }
    } catch (e) {
      console.error("Error restoring onboarding progress:", e);
    }
  }, []);
  
  // Update header title when family name changes
  useEffect(() => {
    if (familyData.familyName.trim()) {
      setHeaderTitle(`The ${familyData.familyName} Family`);
    } else {
      setHeaderTitle("Let's get started with Allie");
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
    if (familyData.children.length > 1) {
      const updatedChildren = [...familyData.children];
      updatedChildren.splice(index, 1);
      updateFamily('children', updatedChildren);
    }
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
  };

  const updateAIPreference = (field, value) => {
    const updatedPreferences = { ...familyData.aiPreferences, [field]: value };
    updateFamily('aiPreferences', updatedPreferences);
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
      case 2: // Family name
        if (!familyData.familyName.trim()) {
          errors.familyName = 'Please enter your family name';
        }
        break;
      
      case 3: // Parent information
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
        break;
      
      case 4: // Children information
        familyData.children.forEach((child, index) => {
          if (!child.name.trim()) {
            errors[`child_${index}_name`] = 'Name is required';
          }
        });
        break;
        
      case 5: // Family communication style
        if (!familyData.communication.style) {
          errors.communication_style = 'Please select a communication style';
        }
        break;
        
      case 6: // Challenge areas
        if (!familyData.communication.challengeAreas || familyData.communication.challengeAreas.length === 0) {
          errors.communication_challengeAreas = 'Please select at least one challenging area';
        }
        break;
      
      case 8: // Family priorities
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
      
      case 9: // AI preferences
        if (!familyData.aiPreferences.style) {
          errors.aiPreferences_style = 'Please select a communication style';
        }
        if (!familyData.aiPreferences.length) {
          errors.aiPreferences_length = 'Please select a response length preference';
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

  // Complete onboarding and continue
  const completeOnboarding = () => {
    // Store the final data
    localStorage.setItem('pendingFamilyData', JSON.stringify(familyData));
    
    // Navigate to the payment page
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
      case 1: // Welcome
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6 font-roboto">Welcome to Allie</h2>
            <p className="text-lg mb-8 font-roboto">We're excited to help your family find better balance.</p>
            <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-gray-100 flex items-center justify-center">
              <img 
                src={familyPhoto} 
                alt="Family Balance" 
                className="w-48 h-48 object-cover rounded-full"
              />
            </div>
            <p className="text-gray-600 mb-8 font-roboto">
              In the next few minutes, we'll help you set up your family profile and get started on your balance journey.
            </p>
          </div>
        );
        
      case 2: // Family Name
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
        
      case 3: // Parent Setup
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Tell us about the parents</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              We'll use this information to create profiles for each parent in your family.
            </p>
            {familyData.parents.map((parent, index) => (
              <div key={index} className="mb-6 p-4 border rounded bg-white">
                <h3 className="font-medium text-lg mb-3 font-roboto">{parent.role} Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1 font-roboto">
                      Name
                    </label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded font-roboto ${
                        validationErrors[`parent_${index}_name`] ? 'border-red-500' : ''
                      }`}
                      placeholder={`${parent.role}'s name`}
                      value={parent.name}
                      onChange={e => updateParent(index, 'name', e.target.value)}
                    />
                    {validationErrors[`parent_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`parent_${index}_name`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-1 font-roboto">Email Address</label>
                    <input
                      type="email"
                      className={`w-full p-2 border rounded font-roboto ${validationErrors[`parent_${index}_email`] ? 'border-red-500' : ''}`}
                      placeholder={`${parent.role}'s email`}
                      value={parent.email}
                      onChange={e => updateParent(index, 'email', e.target.value)}
                    />
                    {validationErrors[`parent_${index}_email`] && (
                      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`parent_${index}_email`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-1 font-roboto">Password</label>
                    <input
                      type="password"
                      className={`w-full p-2 border rounded font-roboto ${validationErrors[`parent_${index}_password`] ? 'border-red-500' : ''}`}
                      placeholder="Password"
                      value={parent.password}
                      onChange={e => updateParent(index, 'password', e.target.value)}
                    />
                    {validationErrors[`parent_${index}_password`] && (
                      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`parent_${index}_password`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
        
      case 4: // Children Setup
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
                  <div>
                    <label className="block text-sm text-gray-700 mb-1 font-roboto">Name</label>
                    <input
                      type="text"
                      className={`w-full p-2 border rounded font-roboto ${validationErrors[`child_${index}_name`] ? 'border-red-500' : ''}`}
                      placeholder="Child's name"
                      value={child.name}
                      onChange={e => updateChild(index, 'name', e.target.value)}
                    />
                    {validationErrors[`child_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1 font-roboto">{validationErrors[`child_${index}_name`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-1 font-roboto">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      className="w-full p-2 border rounded font-roboto"
                      placeholder="Age"
                      value={child.age}
                      onChange={e => updateChild(index, 'age', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={addChild}
              className="w-full py-2 border border-black text-black rounded hover:bg-gray-50 mt-2 font-roboto flex items-center justify-center"
            >
              <PlusCircle size={16} className="mr-2" />
              Add Another Child
            </button>
          </div>
        );
        
      case 5: // Communication Style
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

      case 6: // Challenge Areas
        return (
          <div>
            <h2 className="text-3xl font-light mb-6 font-roboto">Challenge Areas</h2>
            <p className="text-gray-600 mb-6 font-roboto">
              Which areas are most challenging to discuss in your family? This helps us personalize your experience.
            </p>
            
            <div>
              <p className="text-gray-700 mb-2 font-roboto">Select all that apply:</p>
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
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-roboto">
                <strong>Why we ask:</strong> Understanding your challenge areas helps Allie provide more targeted support. 
                For example, if financial decisions are difficult to discuss, we'll provide structured conversation frameworks 
                to make these discussions easier.
              </p>
            </div>
          </div>
        );
        
      case 7: // Task Categories
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
            
            <div className="mt-6 p-4 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600 font-roboto">
                Research shows that "invisible" work is often under-recognized, creating stress and imbalance. 
                Allie helps identify and redistribute all types of work for better family harmony.
              </p>
            </div>
          </div>
        );
        
      case 8: // Family Priorities
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
              </div>
                  
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
        
      case 9: // AI Preferences
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
                <div className="grid grid-cols-2 gap-2">
                  {['Balance insights', 'Parenting tips', 'Relationship advice', 'Time management', 'Self-care reminders'].map(topic => (
                    <label key={topic} className="flex items-center p-2 border rounded hover:bg-gray-50 font-roboto">
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
                <Brain size={20} className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                <p className="text-sm text-blue-800 font-roboto">
                  Allie will be available to chat anytime through the app, helping you with task management, relationship insights, and family balance guidance based on your preferences.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 10: // Confirmation
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={30} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-light mb-6 font-roboto">You're Ready to Begin!</h2>
            <p className="text-lg mb-8 font-roboto">
              Choose how you'd like to proceed with Allie
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2 font-roboto">Join Allie Premium</h3>
                <p className="text-gray-600 mb-4 font-roboto">Get full access to all features and start your family balance journey</p>
                <button 
                  onClick={() => selectPlan('premium')}
                  className="px-6 py-3 bg-black text-white rounded-md w-full hover:bg-gray-800 font-roboto"
                >
                  Subscribe Now
                </button>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2 font-roboto">Try Our Mini Assessment</h3>
                <p className="text-gray-600 mb-4 font-roboto">Take a quick 20-question survey to see if your family has balance issues</p>
                <button 
                  onClick={() => navigate('/mini-survey', { 
                    state: { 
                      fromOnboarding: true,
                      familyData: familyData 
                    } 
                  })}
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
        />
      </div>
      
      {/* Header with family name */}
      <div className="text-center py-6">
        <h1 className="text-4xl font-light text-black mb-2 font-roboto">
          {headerTitle}
        </h1>
        {step > 2 && familyData.familyName && (
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
                className="px-4 py-2 bg-black text-white rounded-md flex items-center hover:bg-gray-800 font-roboto"
              >
                {step === totalSteps - 1 ? 'Finish' : 'Continue'}
                <ArrowRight size={16} className="ml-1" />
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                className="px-4 py-2 bg-black text-white rounded-md flex items-center hover:bg-gray-800 font-roboto"
              >
                Get Started
                <ArrowRight size={16} className="ml-1" />
              </button>
            )}
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
                strokeDashoffset={step < 5 ? "100" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,80 L240,150" 
                strokeDasharray="70" 
                strokeDashoffset={step < 6 ? "70" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 2 - arms */}
              <path 
                d="M240,100 L210,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 7 ? "50" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,100 L270,130" 
                strokeDasharray="50" 
                strokeDashoffset={step < 8 ? "50" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Parent 2 - legs */}
              <path 
                d="M240,150 L220,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 9 ? "60" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M240,150 L260,200" 
                strokeDasharray="60" 
                strokeDashoffset={step < 10 ? "60" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child - head and body */}
              <path 
                d="M180,120 C185,120 190,115 190,110 C190,102 182,102 180,105 C178,102 170,102 170,110 C170,115 175,120 180,120z" 
                strokeDasharray="50" 
                strokeDashoffset={step < 4 ? "50" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,120 L180,160" 
                strokeDasharray="40" 
                strokeDashoffset={step < 5 ? "40" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child - arms */}
              <path 
                d="M180,130 L165,145" 
                strokeDasharray="25" 
                strokeDashoffset={step < 6 ? "25" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,130 L195,145" 
                strokeDasharray="25" 
                strokeDashoffset={step < 7 ? "25" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Child - legs */}
              <path 
                d="M180,160 L170,190" 
                strokeDasharray="40" 
                strokeDashoffset={step < 8 ? "40" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M180,160 L190,190" 
                strokeDasharray="40" 
                strokeDashoffset={step < 9 ? "40" : "0"}
                className="transition-all duration-700"
              />
              
              {/* Connections between family members - hands */}
              <path 
                d="M150,130 C160,140 170,145 180,145" 
                strokeDasharray="40" 
                strokeDashoffset={step < 9 ? "40" : "0"}
                className="transition-all duration-700"
              />
              <path 
                d="M210,130 C200,140 190,145 180,145" 
                strokeDasharray="40" 
                strokeDashoffset={step < 10 ? "40" : "0"}
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