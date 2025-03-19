// src/components/survey/MiniSurvey.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';




const MiniSurvey = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const navigate = useNavigate();
  
  
  // Sample 20 questions covering the different categories
  const questions = [
    // Visible Household Tasks (5 questions)
    { id: "q1", text: "Who is responsible for cooking meals in your home?", category: "Visible Household Tasks" },
    { id: "q2", text: "Who typically cleans the bathroom?", category: "Visible Household Tasks" },
    { id: "q3", text: "Who does the laundry in your household?", category: "Visible Household Tasks" },
    { id: "q4", text: "Who takes out the trash regularly?", category: "Visible Household Tasks" },
    { id: "q5", text: "Who handles yard work and gardening?", category: "Visible Household Tasks" },
    
    // Invisible Household Tasks (5 questions)
    { id: "q6", text: "Who plans meals for the week?", category: "Invisible Household Tasks" },
    { id: "q7", text: "Who remembers birthdays and special occasions?", category: "Invisible Household Tasks" },
    { id: "q8", text: "Who schedules home maintenance appointments?", category: "Invisible Household Tasks" },
    { id: "q9", text: "Who makes shopping lists?", category: "Invisible Household Tasks" },
    { id: "q10", text: "Who researches products before purchasing?", category: "Invisible Household Tasks" },
    
    // Visible Parental Tasks (5 questions)
    { id: "q11", text: "Who drives kids to school and activities?", category: "Visible Parental Tasks" },
    { id: "q12", text: "Who helps with homework?", category: "Visible Parental Tasks" },
    { id: "q13", text: "Who prepares school lunches?", category: "Visible Parental Tasks" },
    { id: "q14", text: "Who coordinates extracurricular activities?", category: "Visible Parental Tasks" },
    { id: "q15", text: "Who attends parent-teacher conferences?", category: "Visible Parental Tasks" },
    
    // Invisible Parental Tasks (5 questions)
    { id: "q16", text: "Who provides emotional support during tough times?", category: "Invisible Parental Tasks" },
    { id: "q17", text: "Who anticipates children's developmental needs?", category: "Invisible Parental Tasks" },
    { id: "q18", text: "Who mediates conflicts between siblings?", category: "Invisible Parental Tasks" },
    { id: "q19", text: "Who monitors academic progress?", category: "Invisible Parental Tasks" },
    { id: "q20", text: "Who handles cultural and moral education?", category: "Invisible Parental Tasks" }
  ];
 
  const location = useLocation();
  const [pendingFamilyData, setPendingFamilyData] = useState(null);
    
// Add this import at the top if it doesn't exist
// import { useNavigate, useLocation } from 'react-router-dom';

  
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
  
  // Handle parent selection
  const handleSelectParent = (parent) => {
    // Save response
    const updatedResponses = {...responses};
    updatedResponses[questions[currentQuestion].id] = parent;
    setResponses(updatedResponses);
    
    // Move to next question or complete survey
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Save responses and navigate to results
      localStorage.setItem('miniSurveyResponses', JSON.stringify(updatedResponses));
      
      // Pass along the pending family data if it exists
      navigate('/mini-results', pendingFamilyData ? {
        state: {
          fromMiniSurvey: true,
          familyData: pendingFamilyData
        }
      } : undefined);
    }
  };
  
  const currentQ = questions[currentQuestion];
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
  <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold mb-6 text-center font-roboto">Family Balance Mini-Assessment</h1>
        
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
  <div 
    className="h-full bg-black rounded-full transition-all"
    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
  ></div>
</div>
        </div>
        
        {/* Question */}
<div className="mb-8">
  <h2 className="text-xl mb-2 font-roboto">{currentQ.text}</h2>
  <p className="text-sm text-gray-500 font-roboto">{currentQ.category}</p>
  
  {/* Add a simplified AI explanation */}
  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
    <div className="flex items-start">
      <Brain size={16} className="text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-purple-800 font-medium text-sm mb-1">Why This Question Matters:</p>
        <p className="text-purple-800 font-roboto text-sm">
          This question helps identify who handles key {currentQ.category.toLowerCase()} in your family. 
          Balancing these responsibilities leads to healthier family dynamics and relationships.
        </p>
      </div>
    </div>
  </div>
</div>
        
        {/* Answer options */}
<div className="grid grid-cols-2 gap-4 mb-8">
  <button 
    onClick={() => handleSelectParent('Mama')}
    className="p-4 bg-purple-100 hover:bg-purple-200 rounded-lg text-center transition-all"
  >
    <span className="block font-bold text-lg text-purple-800 mb-1 font-roboto">Mama</span>
    <span className="text-sm text-purple-600 font-roboto">Click to select</span>
  </button>
  
  <button 
    onClick={() => handleSelectParent('Papa')}
    className="p-4 bg-blue-100 hover:bg-blue-200 rounded-lg text-center transition-all"
  >
    <span className="block font-bold text-lg text-blue-800 mb-1 font-roboto">Papa</span>
    <span className="text-sm text-blue-600 font-roboto">Click to select</span>
  </button>
</div>
      </div>
    </div>
  );
};

export default MiniSurvey;