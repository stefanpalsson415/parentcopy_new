// src/components/onboarding/OnboardingFlow.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import familyPhoto from '../../assets/family-photo.jpg';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Star, Award, Brain, 
  Heart, ChevronDown, ChevronUp, Book, BarChart, Scale, 
  Clock, Sliders, AlertTriangle
} from 'lucide-react';

const OnboardingFlow = () => {
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
    }
  });
  const navigate = useNavigate();
  
  const totalSteps = 20; // Keeping total steps the same, even with reordering
  
  // Handle data updates
  const updateFamily = (key, value) => {
    setFamilyData(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const updateParent = (index, field, value) => {
    const updatedParents = [...familyData.parents];
    updatedParents[index] = { ...updatedParents[index], [field]: value };
    updateFamily('parents', updatedParents);
  };
  
  const updateChild = (index, field, value) => {
    const updatedChildren = [...familyData.children];
    updatedChildren[index] = { ...updatedChildren[index], [field]: value };
    updateFamily('children', updatedChildren);
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
  
  // Move to next step
  const nextStep = () => {
    // Validation for each step
    switch(step) {
      case 3: // Family name
        if (!familyData.familyName.trim()) {
          alert('Please enter your family name');
          return;
        }
        break;
      case 5: // Parent information
        for (const parent of familyData.parents) {
          if (!parent.name || !parent.email || !parent.password) {
            alert('Please complete all parent information');
            return;
          }
          if (!parent.email.includes('@')) {
            alert('Please enter a valid email address');
            return;
          }
          if (parent.password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
          }
        }
        break;
      case 9: // Family priorities (for weighting system) - MOVED from 7 to 9
        if (!familyData.priorities?.highestPriority) {
          alert('Please select your highest priority concern');
          return;
        }
        
        // Validation to ensure no duplicate selections
        if (familyData.priorities.highestPriority && 
            (familyData.priorities.highestPriority === familyData.priorities.secondaryPriority ||
             familyData.priorities.highestPriority === familyData.priorities.tertiaryPriority)) {
          alert('Please select different categories for each priority level');
          return;
        }
        
        if (familyData.priorities.secondaryPriority && 
            familyData.priorities.secondaryPriority === familyData.priorities.tertiaryPriority) {
          alert('Please select different categories for each priority level');
          return;
        }
        break;
      case 7: // Children information - MOVED from 8 to 7
        if (familyData.children.length > 0) {
          for (const child of familyData.children) {
            if (!child.name) {
              alert('Please enter a name for each child');
              return;
            }
          }
        }
        break;
      case 12: // Current challenge
        if (!familyData.mainChallenge) {
          alert('Please select your current family challenge');
          return;
        }
        break;
      case 13: // App preferences
        if (!familyData.preferences.reminderFrequency || !familyData.preferences.meetingDay) {
          alert('Please complete your app preferences');
          return;
        }
        break;
      case 15: // Family goals
        if (!familyData.goals || familyData.goals.length === 0) {
          alert('Please select at least one family goal');
          return;
        }
        break;
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
            <h2 className="text-3xl font-light mb-6">Welcome to Allie</h2>
            <p className="text-lg mb-8">We're excited to help your family find better balance.</p>
            <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-blue-100 flex items-center justify-center">
              <img 
                src={familyPhoto} 
                alt="Family Balance Research" 
                className="w-48 h-48 object-cover rounded-full"
              />
            </div>
            <p className="text-gray-600 mb-8">
              In the next few minutes, we'll help you set up your family profile and get started on your balance journey.
            </p>
          </div>
        );
        
      case 2:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6">The Invisible Load</h2>
            <p className="text-lg mb-8">
              Did you know? Mental load is the invisible work of managing a household that often goes unnoticed.
            </p>
            <div className="flex justify-center space-x-4 mb-8">
              <div className="bg-purple-100 p-4 rounded-lg">
                <h3 className="font-medium">Invisible Tasks</h3>
                <p className="text-sm">Planning, organizing, remembering, coordinating</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <h3 className="font-medium">Visible Tasks</h3>
                <p className="text-sm">Cooking, cleaning, driving, physical childcare</p>
              </div>
            </div>
            <p className="text-gray-600">
              Allie helps measure and balance both visible and invisible work.
            </p>
          </div>
        );
      
      case 3:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">What's your family name?</h2>
            <p className="text-gray-600 mb-6">
              This will help personalize your experience in the app.
            </p>
            <input
              type="text"
              className="w-full p-3 border rounded mb-4"
              placeholder="e.g., Anderson"
              value={familyData.familyName}
              onChange={e => updateFamily('familyName', e.target.value)}
            />
            <p className="text-sm text-gray-500">
              This will appear throughout the app and can be changed later.
            </p>
          </div>
        );
        
      case 4:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">The Science Behind Balance</h2>
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <div className="flex items-start mb-4">
                <Brain className="text-blue-600 mr-2 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-medium">Research Findings</h3>
                  <p className="text-sm mt-1">In 2021, research from the American Psychological Association found that:</p>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                <li>85% of mothers report handling most of household planning</li>
                <li>Families with more balanced workloads report 40% higher satisfaction</li>
                <li>Children in balanced homes show better emotional development</li>
                <li>Reduced tension leads to more quality family time</li>
              </ul>
            </div>
            <p className="text-gray-600">
              Allie uses this research to create a data-driven approach to family balance.
            </p>
          </div>
        );

      case 5:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Tell us about the parents</h2>
            <p className="text-gray-600 mb-6">
              We'll use this information to create profiles for each parent in your family.
            </p>
            {familyData.parents.map((parent, index) => (
              <div key={index} className="mb-6 p-4 border rounded bg-white">
                <h3 className="font-medium text-lg mb-3">{parent.role} Information</h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-gray-700 text-sm">Name</span>
                    <input
                      type="text"
                      className="w-full p-2 border rounded mt-1"
                      placeholder={`${parent.role}'s name`}
                      value={parent.name}
                      onChange={e => updateParent(index, 'name', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 text-sm">Email</span>
                    <input
                      type="email"
                      className="w-full p-2 border rounded mt-1"
                      placeholder={`${parent.role}'s email`}
                      value={parent.email}
                      onChange={e => updateParent(index, 'email', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 text-sm">Password</span>
                    <input
                      type="password"
                      className="w-full p-2 border rounded mt-1"
                      placeholder="Create a password"
                      value={parent.password}
                      onChange={e => updateParent(index, 'password', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        );
        
      case 6:
        // Family Communication Style - with added AI engine explanation
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Family Communication Style</h2>
            <p className="text-gray-600 mb-6">
              Understanding how your family communicates helps us personalize the experience.
            </p>
            <div className="space-y-4">
              <label className="block">
                <span className="text-gray-700">How would you describe your family's communication style?</span>
                <select 
                  className="w-full p-2 border rounded mt-1"
                  value={familyData.communication.style}
                  onChange={e => updateCommunication('style', e.target.value)}
                >
                  <option value="">Select an option</option>
                  <option value="open">Very open - we talk about everything</option>
                  <option value="selective">Selective - we discuss some topics easily</option>
                  <option value="reserved">Reserved - we tend to keep things to ourselves</option>
                  <option value="avoidant">Avoidant - we rarely discuss sensitive topics</option>
                </select>
              </label>
              
              <div>
                <p className="text-gray-700 mb-2">Which areas are most challenging to discuss? (Select all that apply)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Household tasks', 'Parenting approaches', 'Time management', 'Emotional support', 'Financial decisions', 'Personal boundaries'].map(area => (
                    <label key={area} className="flex items-center p-2 border rounded hover:bg-gray-50">
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
              
              {/* New AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1">
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
        // Your Children - moved from position 8 to 7
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Your Children</h2>
            <p className="text-gray-600 mb-6">
              Tell us about your children so we can include their perspectives in your family balance journey.
            </p>
            
            {familyData.children.map((child, index) => (
              <div key={index} className="mb-4 p-4 border rounded bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Child {index + 1}</h3>
                  {familyData.children.length > 1 && (
                    <button 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeChild(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 text-sm">Name</span>
                    <input
                      type="text"
                      className="w-full p-2 border rounded mt-1"
                      placeholder="Child's name"
                      value={child.name}
                      onChange={e => updateChild(index, 'name', e.target.value)}
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-gray-700 text-sm">Age</span>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      className="w-full p-2 border rounded mt-1"
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
              className="w-full py-2 border border-black text-black rounded hover:bg-gray-50 mt-2"
            >
              Add Another Child
            </button>
          </div>
        );
        
      case 8:
        // The Four Categories - moved from position 9 to 8 (before priorities)
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">The Four Categories of Family Tasks</h2>
            <p className="text-gray-600 mb-6">
              Allie divides family responsibilities into four categories to help identify imbalances.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-800 mb-1">Visible Household Tasks</h3>
                <p className="text-sm text-blue-700">
                  Physical tasks you can see: cooking, cleaning, laundry, yard work, home repairs
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-purple-50">
                <h3 className="font-medium text-purple-800 mb-1">Invisible Household Tasks</h3>
                <p className="text-sm text-purple-700">
                  Mental work of running a home: planning meals, managing schedules, remembering events, coordinating appointments
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50">
                <h3 className="font-medium text-green-800 mb-1">Visible Parenting Tasks</h3>
                <p className="text-sm text-green-700">
                  Physical childcare: driving kids, helping with homework, bedtime routines, attending events
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-amber-50">
                <h3 className="font-medium text-amber-800 mb-1">Invisible Parenting Tasks</h3>
                <p className="text-sm text-amber-700">
                  Emotional labor: providing emotional support, anticipating needs, coordinating with schools, monitoring development
                </p>
              </div>
            </div>
          </div>
        );
        
      case 9:
        // Your Family's Priorities - moved from position 7 to 9 (after categories explanation)
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Your Family's Priorities</h2>
            <p className="text-gray-600 mb-6">
              To personalize your experience, tell us which areas are most important for your family to balance.
            </p>
                
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Highest priority concern:</label>
                <select 
                  className="w-full p-2 border rounded"
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
                <p className="text-xs text-gray-500 mt-1">
                  Tasks related to cooking, cleaning, laundry, and other observable household work
                </p>
              </div>
                  
              <div>
                <label className="block text-gray-700 mb-2">Secondary priority concern:</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={familyData.priorities?.secondaryPriority || ''}
                  onChange={e => {
                    // Prevent duplicate selection
                    if (e.target.value === familyData.priorities?.highestPriority) {
                      alert("This category is already your highest priority. Please select a different category.");
                      return;
                    }
                    
                    const updatedPriorities = {
                      ...familyData.priorities,
                      secondaryPriority: e.target.value
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
                <p className="text-xs text-gray-500 mt-1">
                  Tasks related to planning, scheduling, and mental/cognitive household management
                </p>
              </div>
                  
              <div>
                <label className="block text-gray-700 mb-2">Tertiary priority concern:</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={familyData.priorities?.tertiaryPriority || ''}
                  onChange={e => {
                    // Prevent duplicate selection
                    if (e.target.value === familyData.priorities?.highestPriority || 
                        e.target.value === familyData.priorities?.secondaryPriority) {
                      alert("This category is already selected as a priority. Please select a different category.");
                      return;
                    }
                    
                    const updatedPriorities = {
                      ...familyData.priorities,
                      tertiaryPriority: e.target.value
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
                <p className="text-xs text-gray-500 mt-1">
                  Tasks related to childcare, homework help, and other visible child-focused work
                </p>
              </div>
                  
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Why this matters:</strong> We'll use these priorities to personalize your experience. Tasks in your priority areas will be weighted more heavily in your family balance calculations, helping identify the most important areas for improvement.
                </p>
              </div>
              
              {/* New AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Sliders size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Your priorities directly influence our AI weighting system. High-priority tasks receive a multiplier of 1.5x in our calculations, secondary priorities get a 1.3x multiplier, and tertiary priorities get a 1.1x multiplier. This ensures our recommendations focus on the areas that matter most to your family.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        // NEW SLIDE: Task Weighting System Introduction
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Allie's Intelligent Task Weighting</h2>
            <p className="text-gray-600 mb-6">
              Not all tasks are created equal. Allie uses a sophisticated weighting system to accurately measure workload balance.
            </p>
            
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="flex items-start mb-4">
                <BarChart size={24} className="text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Beyond Simple Task Counting</h3>
                  <p className="text-gray-700 mt-2">
                    Traditional approaches simply count who does which tasks, but this misses crucial factors that contribute to workload. Allie's multi-factor weighting system accounts for:
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <Clock size={20} className="text-indigo-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium">Time Investment</h4>
                    <p className="text-sm text-gray-600">Tasks rated from 1-5 based on time required</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <AlertTriangle size={20} className="text-amber-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium">Task Frequency</h4>
                    <p className="text-sm text-gray-600">Daily tasks weigh more than monthly ones</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Heart size={20} className="text-red-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium">Emotional Labor</h4>
                    <p className="text-sm text-gray-600">Accounts for mental/emotional burden</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium">Cognitive Load</h4>
                    <p className="text-sm text-gray-600">Measures mental planning and tracking</p>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 italic text-center">
              "The true imbalance isn't just in who does more tasks, but in who carries more of the mental and emotional load."
            </p>
          </div>
        );
      
      case 11:
        // NEW SLIDE: Task Weighting System Details
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">How Task Weighting Works</h2>
            <p className="text-gray-600 mb-6">
              Allie's proprietary algorithm assigns weights to each task based on multiple factors.
            </p>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
              <h3 className="font-medium mb-4 text-center">Sample Task Weight Calculation</h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-32 font-medium text-right pr-3">Task:</div>
                  <div className="flex-1 bg-gray-100 py-1 px-2 rounded">Meal planning for the week</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-32 font-medium text-right pr-3">Base Weight:</div>
                  <div className="flex-1 bg-blue-50 py-1 px-2 rounded text-blue-800">4 (Substantial time/cognitive organization)</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-32 font-medium text-right pr-3">Multipliers:</div>
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-purple-50 py-1 px-2 rounded text-purple-800">Frequency: 1.2x (Weekly)</div>
                      <div className="bg-purple-50 py-1 px-2 rounded text-purple-800">Invisibility: 1.35x (Mostly invisible)</div>
                      <div className="bg-purple-50 py-1 px-2 rounded text-purple-800">Emotional Labor: 1.2x (Moderate)</div>
                      <div className="bg-purple-50 py-1 px-2 rounded text-purple-800">Child Impact: 1.15x (Moderate)</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-32 font-medium text-right pr-3">Your Priority:</div>
                  <div className="flex-1 bg-green-50 py-1 px-2 rounded text-green-800">1.3x (Secondary priority)</div>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center">
                    <div className="w-32 font-medium text-right pr-3">Final Weight:</div>
                    <div className="flex-1 bg-black text-white py-1 px-2 rounded">13.42 (compared to 1.5 for taking out trash)</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Our weighting system is based on research in family dynamics, psychology, and gender studies. By accurately measuring the true effort of each task, Allie provides a much more accurate picture of workload distribution than simple task counting.
              </p>
            </div>
          </div>
        );

      case 12:
        // What's Your Current Challenge? - with added AI engine explanation
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">What's Your Current Challenge?</h2>
            <p className="text-gray-600 mb-6">
              Understanding your challenges helps us customize your experience.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3" 
                  checked={familyData.mainChallenge === 'awareness'}
                  onChange={() => updateFamily('mainChallenge', 'awareness')}
                />
                <div>
                  <p className="font-medium">Awareness Gap</p>
                  <p className="text-sm text-gray-600">
                    We disagree about who does more and don't have a clear picture of the workload distribution
                  </p>
                </div>
              </label>
              
              <label className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3" 
                  checked={familyData.mainChallenge === 'implementation'}
                  onChange={() => updateFamily('mainChallenge', 'implementation')}
                />
                <div>
                  <p className="font-medium">Implementation Struggle</p>
                  <p className="text-sm text-gray-600">
                    We know there's an imbalance but can't figure out how to practically fix it
                  </p>
                </div>
              </label>
              
              <label className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3"
                  checked={familyData.mainChallenge === 'sustainability'}
                  onChange={() => updateFamily('mainChallenge', 'sustainability')}
                />
                <div>
                  <p className="font-medium">Sustainability Issues</p>
                  <p className="text-sm text-gray-600">
                    We try to share better but keep falling back into old patterns
                  </p>
                </div>
              </label>
              
              <label className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="radio" 
                  name="challenge" 
                  className="mt-1 mr-3"
                  checked={familyData.mainChallenge === 'communication'}
                  onChange={() => updateFamily('mainChallenge', 'communication')}
                />
                <div>
                  <p className="font-medium">Communication Barriers</p>
                  <p className="text-sm text-gray-600">
                    Discussions about workload lead to arguments instead of solutions
                  </p>
                </div>
              </label>
              
              {/* New AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Your primary challenge shapes Allie's AI recommendations. For awareness gaps, we focus on providing clear data visualization. For implementation struggles, we prioritize specific, actionable tasks. For sustainability issues, we emphasize habit-building features. And for communication barriers, we provide structured conversation guides customized to your family's style.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 13:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">The Allie Approach</h2>
            <p className="text-gray-600 mb-6">
              We use a structured, weekly process to help your family achieve lasting balance.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                <div className="flex">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center text-blue-600 font-medium mr-3 flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-medium">Measure Current State</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      A comprehensive 80-question assessment for all family members establishes your baseline
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                <div className="flex">
                  <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center text-green-600 font-medium mr-3 flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-medium">Weekly Task Adjustment</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      AI-powered recommendations for specific tasks to redistribute each week
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                <div className="flex">
                  <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center text-purple-600 font-medium mr-3 flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-medium">Brief Weekly Check-ins</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      20-question surveys track progress and adjust recommendations in real-time
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500 shadow-sm">
                <div className="flex">
                  <div className="bg-amber-100 rounded-full w-8 h-8 flex items-center justify-center text-amber-600 font-medium mr-3 flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-medium">Guided Family Meetings</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      30-minute structured discussions to assess progress and set new goals
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
            <h2 className="text-3xl font-light mb-6">App Preferences</h2>
            <p className="text-gray-600 mb-6">
              Let's customize how Allie works for your family.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 mb-2">How often would you like reminders?</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={familyData.preferences.reminderFrequency}
                  onChange={e => updatePreference('reminderFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Preferred day for family meetings?</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={familyData.preferences.meetingDay}
                  onChange={e => updatePreference('meetingDay', e.target.value)}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center">
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
                <label className="flex items-center">
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
        
      case 15:
        // Your Family's Goals - with added AI engine explanation
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Your Family's Goals</h2>
            <p className="text-gray-600 mb-6">
              What are you hoping to achieve with Allie? Select all that apply.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
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
                  <p className="font-medium">More balanced distribution of tasks</p>
                  <p className="text-sm text-gray-600">
                    Equalize workload between parents to reduce burden on one person
                  </p>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
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
                  <p className="font-medium">More quality family time</p>
                  <p className="text-sm text-gray-600">
                    Create space for meaningful connections and activities together
                  </p>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
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
                  <p className="font-medium">Reduced conflict over responsibilities</p>
                  <p className="text-sm text-gray-600">
                    Less tension and arguments about who does what
                  </p>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
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
                  <p className="font-medium">Recognition of invisible work</p>
                  <p className="text-sm text-gray-600">
                    Acknowledge the mental load and planning that often goes unseen
                  </p>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
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
                  <p className="font-medium">Better role modeling for children</p>
                  <p className="text-sm text-gray-600">
                    Demonstrate balanced partnerships and equality to the next generation
                  </p>
                </div>
              </label>
              
              {/* New AI engine explanation */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start">
                  <Brain size={20} className="text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800">How Allie Uses This Information</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Your goals help our AI engine calibrate your success metrics. If reducing conflict is your priority, we'll measure success through tension reduction rather than just task redistribution. If role modeling is important, we'll prioritize tasks visible to your children. This personalized approach ensures we're measuring what matters most to your family.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 16:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Your Weekly Journey</h2>
            <p className="text-gray-600 mb-6">
              Here's what a typical week with Allie looks like:
            </p>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">M</div>
                  Monday: Review Weekly Tasks
                </h3>
                <p className="text-sm text-gray-600 pl-8">
                  Both parents review this week's 3 recommended tasks designed to improve balance
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">T-F</div>
                  Tuesday-Friday: Implement Changes
                </h3>
                <p className="text-sm text-gray-600 pl-8">
                  Practice new task distribution throughout the week, with gentle reminders
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">S</div>
                  Saturday: Quick Check-ins
                </h3>
                <p className="text-sm text-gray-600 pl-8">
                  Each family member completes a 5-minute survey to measure that week's progress
                </p>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mr-2 text-sm">S</div>
                  Sunday: Family Meeting
                </h3>
                <p className="text-sm text-gray-600 pl-8">
                  30-minute guided discussion about what worked, what didn't, and goals for next week
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Don't worry - all of this is customizable to fit your family's schedule!
            </p>
          </div>
        );
        
      case 17:
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Key Features of Allie</h2>
            <p className="text-gray-600 mb-6">
              Here are the powerful tools you'll have access to:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <Book className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium">Family Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1">
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
                    <h3 className="font-medium">AI Task Engine</h3>
                    <p className="text-sm text-gray-600 mt-1">
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
                    <h3 className="font-medium">Family Meeting Guide</h3>
                    <p className="text-sm text-gray-600 mt-1">
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
                    <h3 className="font-medium">Weekly Progress Reports</h3>
                    <p className="text-sm text-gray-600 mt-1">
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
                    <h3 className="font-medium">Kid-Friendly Interface</h3>
                    <p className="text-sm text-gray-600 mt-1">
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
                    <h3 className="font-medium">Educational Resources</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Articles, videos, and research about family balance and relationship health
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      // Success Stories slide removed (case 18 in original)
        
      case 18:
        // Family Balance FAQ (originally case 14)
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Family Balance FAQ</h2>
            <p className="text-gray-600 mb-6">
              Answers to common questions about the Allie approach.
            </p>
            
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <button 
                  className="w-full flex justify-between items-center p-4 text-left"
                  onClick={() => updateFamily('expandedFaq', familyData.expandedFaq === 1 ? null : 1)}
                >
                  <span className="font-medium">How long does it take to see results?</span>
                  {familyData.expandedFaq === 1 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {familyData.expandedFaq === 1 && (
                  <div className="p-4 bg-gray-50 border-t">
                    <p className="text-gray-700 text-sm">
                      Most families report noticeable improvements within 3-4 weeks of consistent use. More significant changes in balance and family dynamics typically emerge after 2-3 months, as new habits become established.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <button 
                  className="w-full flex justify-between items-center p-4 text-left"
                  onClick={() => updateFamily('expandedFaq', familyData.expandedFaq === 2 ? null : 2)}
                >
                  <span className="font-medium">What if my partner isn't enthusiastic?</span>
                  {familyData.expandedFaq === 2 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {familyData.expandedFaq === 2 && (
                  <div className="p-4 bg-gray-50 border-t">
                    <p className="text-gray-700 text-sm">
                      This is common! One approach is to focus on the data-driven aspect of Allie. Many skeptical partners become more engaged when they see objective measurements rather than feeling "accused." Start with simple, specific task changes rather than attempting a complete overhaul at once.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <button 
                  className="w-full flex justify-between items-center p-4 text-left"
                  onClick={() => updateFamily('expandedFaq', familyData.expandedFaq === 3 ? null : 3)}
                >
                  <span className="font-medium">How much time does it take each week?</span>
                  {familyData.expandedFaq === 3 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {familyData.expandedFaq === 3 && (
                  <div className="p-4 bg-gray-50 border-t">
                    <p className="text-gray-700 text-sm">
                      Weekly check-ins take about 5 minutes per person. The guided family meeting is designed to be 30 minutes once a week. In total, the Allie process requires about 45 minutes per week, but saves families hours in reduced conflicts and more efficient task management.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <button 
                  className="w-full flex justify-between items-center p-4 text-left"
                  onClick={() => updateFamily('expandedFaq', familyData.expandedFaq === 4 ? null : 4)}
                >
                  <span className="font-medium">Is 50/50 always the goal?</span>
                  {familyData.expandedFaq === 4 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {familyData.expandedFaq === 4 && (
                  <div className="p-4 bg-gray-50 border-t">
                    <p className="text-gray-700 text-sm">
                      Not necessarily! Allie isn't about forcing a rigid 50/50 split. It's about finding a balance that works for your unique family situation and feels fair to all involved. Some families might have a 60/40 split that feels perfectly balanced based on work schedules, preferences, and other factors.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 19:
        // Modified Plan Options slide with functional buttons
        return (
          <div>
            <h2 className="text-3xl font-light mb-6">Get Started with Allie</h2>
            <p className="text-gray-600 mb-6">
              Choose the best option for your family:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">Monthly Plan</h3>
                  <div className="text-3xl font-bold mt-2">$20<span className="text-lg font-normal text-gray-500">/month</span></div>
                  <p className="text-sm text-gray-500 mt-1">Billed monthly</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Full access to all features</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Unlimited family members</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Weekly AI recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Email progress reports</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Cancel anytime</span>
                  </li>
                </ul>
                
                <button 
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => selectPlan('monthly')}
                >
                  Select Monthly Plan
                </button>
              </div>
              
              <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow relative">
                <div className="absolute top-0 right-0 bg-green-500 text-white py-1 px-3 text-xs transform translate-y-0 -translate-x-6 rounded-b-md">
                  BEST VALUE
                </div>
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">Annual Plan</h3>
                  <div className="text-3xl font-bold mt-2">$180<span className="text-lg font-normal text-gray-500">/year</span></div>
                  <p className="text-sm text-gray-500 mt-1">$15/month, billed annually</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Everything in monthly plan</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Save 25% ($60/year)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Premium support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Advanced progress analytics</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">30-day money back guarantee</span>
                  </li>
                </ul>
                
                <button 
                  className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  onClick={() => selectPlan('annual')}
                >
                  Select Annual Plan
                </button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <div className="mt-1 mr-3 flex-shrink-0">
                  <Award size={20} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">The True Value of Balance</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    The average family spends 19 hours per week arguing about household responsibilities. Allie users report saving 7+ hours per week while improving relationship satisfaction by 40%. What would your family do with that extra time and energy?
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 20:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6">You're Ready to Begin!</h2>
            <p className="text-lg mb-8">
              Choose how you'd like to proceed with Allie
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2">Join Allie Premium</h3>
                <p className="text-gray-600 mb-4">Get full access to all features and start your family balance journey</p>
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
                  className="px-6 py-3 bg-black text-white rounded-md w-full hover:bg-gray-800"
                >
                  Subscribe Now
                </button>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
                <h3 className="font-bold text-xl mb-2">Try Our Mini Assessment</h3>
                <p className="text-gray-600 mb-4">Take a quick 20-question survey to see if your family has balance issues</p>
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
                  className="px-6 py-3 bg-purple-600 text-white rounded-md w-full hover:bg-purple-700"
                >
                  Start Mini Survey
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              Your data is secure and will only be used to improve your family experience.
            </p>
          </div>
        );
        
      default:
        return <div>Step content not found</div>;
    }
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col font-['Roboto']">
      {/* Progress indicator */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-black transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <button
              onClick={() => step > 1 && prevStep()}
              className={`px-4 py-2 flex items-center ${step === 1 ? 'invisible' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            
            {step < totalSteps ? (
              <button
                onClick={() => nextStep()}
                className="px-4 py-2 bg-black text-white rounded flex items-center hover:bg-gray-800"
              >
                Continue
                <ArrowRight size={16} className="ml-1" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Step counter */}
      <div className="p-4 text-center text-sm text-gray-500">
        Step {step} of {totalSteps}
      </div>
    </div>
  );
};

export default OnboardingFlow;