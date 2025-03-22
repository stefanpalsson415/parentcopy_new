// src/components/survey/MiniResultsScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Award, Clock, Heart, Users } from 'lucide-react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ResponsiveContainer 
} from 'recharts';

const MiniResultsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [surveyData, setSurveyData] = useState({});
  const [pendingFamilyData, setPendingFamilyData] = useState(null);
  
  // Effect to load pending family data
  useEffect(() => {
    // Check for data passed in location state
    if (location?.state?.familyData) {
      setPendingFamilyData(location.state.familyData);
    } 
    // Check for data in localStorage
    else {
      const storedData = localStorage.getItem('pendingFamilyData');
      if (storedData) {
        try {
          setPendingFamilyData(JSON.parse(storedData));
        } catch (e) {
          console.error("Error parsing stored family data:", e);
        }
      }
    }
  }, [location]);
  
  useEffect(() => {
    // Load survey responses
    const responses = JSON.parse(localStorage.getItem('miniSurveyResponses') || '{}');
    setSurveyData(responses);
  }, []);
  
  // Calculate percentages for each category based on responses
  const calculateCategoryData = () => {
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Determine which questions belong to which categories
    const questionCategories = {
      "q1": "Visible Household Tasks",
      "q2": "Visible Household Tasks",
      "q3": "Visible Household Tasks",
      "q4": "Visible Household Tasks",
      "q5": "Visible Household Tasks",
      "q6": "Invisible Household Tasks",
      "q7": "Invisible Household Tasks",
      "q8": "Invisible Household Tasks",
      "q9": "Invisible Household Tasks",
      "q10": "Invisible Household Tasks",
      "q11": "Visible Parental Tasks",
      "q12": "Visible Parental Tasks",
      "q13": "Visible Parental Tasks",
      "q14": "Visible Parental Tasks",
      "q15": "Visible Parental Tasks",
      "q16": "Invisible Parental Tasks",
      "q17": "Invisible Parental Tasks",
      "q18": "Invisible Parental Tasks",
      "q19": "Invisible Parental Tasks",
      "q20": "Invisible Parental Tasks"
    };
    
    // Count responses by category
    Object.entries(surveyData).forEach(([questionId, answer]) => {
      const category = questionCategories[questionId];
      if (category) {
        categories[category].total++;
        if (answer === 'Mama') {
          categories[category].mama++;
        } else if (answer === 'Papa') {
          categories[category].papa++;
        }
      }
    });
    
    // Convert to percentages for radar chart
    return Object.entries(categories).map(([category, counts]) => {
      if (counts.total === 0) return { category, mama: 0, papa: 0 };
      
      return {
        category,
        mama: Math.round((counts.mama / counts.total) * 100),
        papa: Math.round((counts.papa / counts.total) * 100)
      };
    });
  };
  
  const radarData = calculateCategoryData();
  
  // Calculate overall balance
  const calculateOverallBalance = () => {
    let mamaCount = 0;
    let papaCount = 0;
    
    Object.values(surveyData).forEach(value => {
      if (value === 'Mama') mamaCount++;
      else if (value === 'Papa') papaCount++;
    });
    
    const total = mamaCount + papaCount;
    if (total === 0) return { mama: 0, papa: 0 };
    
    return {
      mama: Math.round((mamaCount / total) * 100),
      papa: Math.round((papaCount / total) * 100)
    };
  };
  
  const overallBalance = calculateOverallBalance();
  
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {pendingFamilyData?.familyName ? `${pendingFamilyData.familyName} Family Balance Assessment` : "Your Family Balance Assessment"}
          </h1>
          <p className="opacity-90">
            Based on your responses, here's how tasks are currently distributed in your family
          </p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-4">
        {/* Family Balance Overview */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-4">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Your Family's Balance</h2>
                <p className="text-gray-600 mb-6">
                  Based on your responses, here's how tasks are currently distributed:
                </p>
                
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius="75%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      
                      <Radar
                        name="Mama's Tasks"
                        dataKey="mama"
                        stroke={MAMA_COLOR}
                        fill={MAMA_COLOR}
                        fillOpacity={0.5}
                      />
                      
                      <Radar
                        name="Papa's Tasks"
                        dataKey="papa"
                        stroke={PAPA_COLOR}
                        fill={PAPA_COLOR}
                        fillOpacity={0.5}
                      />
                      
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <Award className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <p className="text-blue-800 text-sm">
                      {Math.abs(overallBalance.mama - 50) > 15 
                        ? `Your family has a significant imbalance with Mama handling ${overallBalance.mama}% of tasks.` 
                        : `Your family has a relatively balanced workload with some room for improvement.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Family Balance Scale - Special Feature */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Family Balance Scale</h2>
            <p className="text-gray-600 mb-4">
              When work is shared fairly, the scale stays balanced. This shows who's doing more right now!
            </p>
            
            <div className="h-36 relative mb-4">
              {/* The Balance Scale */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-4 h-24 bg-gray-700 rounded"></div>
              
              {/* The Balance Beam - rotated based on current balance */}
              <div 
                className="absolute left-1/2 top-8 transform -translate-x-1/2 w-64 h-4 bg-gray-700 rounded-full transition-all duration-700 ease-in-out"
                style={{ 
                  transformOrigin: 'center',
                  transform: `translateX(-50%) rotate(${(overallBalance.mama - 50) * 0.8}deg)` 
                }}
              >
                {/* Mama's Side */}
                <div className="absolute left-0 -top-20 w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center transform -translate-x-1/2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-800">{overallBalance.mama}%</div>
                    <div className="text-xs text-purple-700">Mama</div>
                  </div>
                </div>
                
                {/* Papa's Side */}
                <div className="absolute right-0 -top-20 w-16 h-16 bg-green-200 rounded-full flex items-center justify-center transform translate-x-1/2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-800">{overallBalance.papa}%</div>
                    <div className="text-xs text-green-700">Papa</div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-center text-blue-700">
              {overallBalance.mama > 60 
                ? "The scale is tipping toward Mama! Papa can help balance it by taking on more tasks."
                : overallBalance.mama < 40
                  ? "The scale is tipping toward Papa! Mama can help balance it by taking on more tasks."
                  : "Great job! Your family's workload is well balanced."}
            </p>
          </div>
        </div>
        
        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Key Insights</h2>
            
            <div className="space-y-4">
              {radarData.map(category => {
                const imbalance = Math.abs(category.mama - category.papa);
                if (imbalance >= 20) {
                  return (
                    <div key={category.category} className="bg-amber-50 p-4 rounded-lg">
                      <h3 className="font-medium">{category.category} Imbalance</h3>
                      <p className="text-sm mt-1">
                        {category.mama > category.papa 
                          ? `Mama is handling ${category.mama}% of ${category.category.toLowerCase()}.` 
                          : `Papa is handling ${category.papa}% of ${category.category.toLowerCase()}.`}
                        This is a {imbalance}% imbalance.
                      </p>
                    </div>
                  );
                }
                return null;
              }).filter(Boolean)}
              
              {/* Show general insight if no major imbalances */}
              {!radarData.some(cat => Math.abs(cat.mama - cat.papa) >= 20) && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium">Good Balance Overall</h3>
                  <p className="text-sm mt-1">
                    Your family has a relatively balanced distribution of tasks. Keep up the good work!
                  </p>
                </div>
              )}
              
              {/* Additional insights based on specific categories */}
              {radarData.find(cat => cat.category === "Invisible Household Tasks" && cat.mama > 65) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium">Mental Load Imbalance</h3>
                  <p className="text-sm mt-1">
                    Mama is carrying a significant mental load with invisible household tasks.
                    This often includes planning, organizing, and remembering important details.
                  </p>
                </div>
              )}
              
              {radarData.find(cat => cat.category === "Invisible Parental Tasks" && cat.mama > 65) && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium">Emotional Labor Imbalance</h3>
                  <p className="text-sm mt-1">
                    Mama is providing most of the emotional support and parental guidance.
                    This invisible work takes significant energy but often goes unrecognized.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Personalized Insights Based on Family Data */}
        {pendingFamilyData && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mr-4">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Personalized for the {pendingFamilyData.familyName} Family</h2>
                  <p className="text-gray-600 mb-6">
                    Based on your family structure and survey responses, we've identified specific areas where Allie can help your family:
                  </p>
                  
                  <div className="space-y-4">
                    {pendingFamilyData.children && pendingFamilyData.children.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h3 className="font-medium">
                          {pendingFamilyData.children.length > 1 ? 
                            `Support for Multiple Children (${pendingFamilyData.children.map(c => c.name).join(', ')})` : 
                            `Support for ${pendingFamilyData.children[0].name}`}
                        </h3>
                        <p className="text-sm mt-1">
                          Allie helps parents with multiple children balance attention and responsibilities more effectively, reducing parental stress by up to 40%.
                        </p>
                      </div>
                    )}
                    
                    {pendingFamilyData.priorities?.highestPriority && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium">
                          {pendingFamilyData.priorities.highestPriority} Priority
                        </h3>
                        <p className="text-sm mt-1">
                          Your family identified {pendingFamilyData.priorities.highestPriority.toLowerCase()} as a key concern. Our full assessment will provide detailed insights and targeted solutions in this area.
                        </p>
                      </div>
                    )}
                    
                    {pendingFamilyData.mainChallenge && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-medium">
                          {pendingFamilyData.mainChallenge === 'awareness' ? 'Awareness Gap Solutions' : 
                           pendingFamilyData.mainChallenge === 'implementation' ? 'Implementation Strategy' :
                           pendingFamilyData.mainChallenge === 'sustainability' ? 'Sustainability Framework' :
                           'Communication Enhancement'}
                        </h3>
                        <p className="text-sm mt-1">
                          Allie's full program includes specialized tools to address your specific {pendingFamilyData.mainChallenge} challenge.
                        </p>
                      </div>
                    )}
                    
                    {pendingFamilyData.communication?.style && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-medium">
                          Communication Style Support
                        </h3>
                        <p className="text-sm mt-1">
                          Based on your {pendingFamilyData.communication.style} communication style, Allie will tailor recommendations to improve family discussions and reduce conflict.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-sm overflow-hidden text-white">
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-3">Want a Complete Family Balance Solution?</h2>
            <p className="opacity-90 mb-6">
              Allie offers in-depth analysis, AI-driven task recommendations, weekly check-ins, and guided family meetings to help you achieve better balance.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => {
                  // Pass along family data if it exists
                  navigate('/payment', pendingFamilyData ? {
                    state: {
                      fromMiniResults: true,
                      familyData: pendingFamilyData
                    }
                  } : undefined);
                }}
                className="px-6 py-3 bg-white text-indigo-600 rounded-md font-medium hover:bg-indigo-50 flex-1 text-center"
              >
                Get Full Access
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-transparent text-white border border-white rounded-md font-medium hover:bg-white hover:bg-opacity-10 flex-1 text-center"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniResultsScreen;