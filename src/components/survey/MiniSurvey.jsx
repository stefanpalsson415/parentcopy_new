// src/components/survey/MiniSurvey.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';




const MiniSurvey = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const navigate = useNavigate();
  
  // AI explanations for each question
const questionExplanations = {
  "q1": {
    text: "Cooking requires significant time each day and has a direct impact on family nutrition and wellbeing. This visible task's distribution often reflects deeper patterns in household responsibility allocation.",
    factors: "Time (4.5×) • Frequency (1.5×) • Emotional Labor (1.2×)",
  },
  "q2": {
    text: "Bathroom cleaning is a high-impact visible household task that affects everyone's comfort. Who handles this task often reveals patterns about cleanliness standards and expectations.",
    factors: "Time (3.8×) • Frequency (1.2×) • Emotional Labor (1.0×)",
  },
  "q3": {
    text: "Laundry combines both visible work (washing, folding) and invisible work (monitoring, planning). It's a recurring task that impacts everyone's daily needs.",
    factors: "Time (3.5×) • Frequency (1.4×) • Emotional Labor (1.1×)",
  },
  "q4": {
    text: "While quick to perform, trash removal is a frequent necessity that someone must consistently remember. Its regularity makes it an important indicator of workload distribution.",
    factors: "Time (1.5×) • Frequency (1.4×) • Emotional Labor (1.0×)",
  },
  "q5": {
    text: "Yard work and gardening are seasonal but time-intensive tasks that affect your home's appearance and functionality. They often follow traditional gender divisions.",
    factors: "Time (4.0×) • Frequency (1.0×) • Emotional Labor (1.0×)",
  },
  "q6": {
    text: "Meal planning creates significant mental load through decision-making, nutrition planning, and anticipating everyone's preferences and schedules.",
    factors: "Time (3.0×) • Invisibility (1.5×) • Emotional Labor (1.3×)",
  },
  "q7": {
    text: "Remembering special occasions involves not just dates but also planning gifts, organizing celebrations, and maintaining social connections. This invisible work is easily overlooked.",
    factors: "Time (2.5×) • Invisibility (1.5×) • Emotional Labor (1.4×)",
  },
  "q8": {
    text: "Scheduling home maintenance requires foresight, coordination, and follow-up. This invisible task maintains your home's value and functionality but is rarely acknowledged.",
    factors: "Time (2.0×) • Invisibility (1.5×) • Emotional Labor (1.2×)",
  },
  "q9": {
    text: "Shopping lists involve inventory monitoring, meal planning, and anticipating family needs. This invisible mental task requires ongoing attention to household supplies.",
    factors: "Time (2.0×) • Invisibility (1.5×) • Emotional Labor (1.2×)",
  },
  "q10": {
    text: "Researching products requires time, attention, and decision-making energy. This invisible labor ensures wise spending and appropriate purchases for family needs.",
    factors: "Time (3.0×) • Invisibility (1.5×) • Emotional Labor (1.2×)",
  },
  "q11": {
    text: "Driving children creates both a time commitment and logistical planning. This visible parental task directly impacts children's access to activities and education.",
    factors: "Time (3.5×) • Frequency (1.5×) • Child Impact (1.3×)",
  },
  "q12": {
    text: "Homework help combines educational support with emotional coaching. This parenting task directly impacts academic outcomes and parent-child relationships.",
    factors: "Time (3.0×) • Frequency (1.4×) • Child Impact (1.5×)",
  },
  "q13": {
    text: "Preparing school lunches combines nutrition planning with daily execution. This visible task requires both planning and preparation time.",
    factors: "Time (2.5×) • Frequency (1.5×) • Child Impact (1.2×)",
  },
  "q14": {
    text: "Coordinating extracurricular activities involves scheduling, transportation planning, and communication with instructors. This parental task significantly impacts children's development.",
    factors: "Time (3.0×) • Invisibility (1.3×) • Child Impact (1.4×)",
  },
  "q15": {
    text: "Attending parent-teacher conferences requires time commitment but also information management and follow-up. This parental task is crucial for academic support.",
    factors: "Time (3.5×) • Frequency (1.0×) • Child Impact (1.5×)",
  },
  "q16": {
    text: "Emotional support during challenges is high-impact invisible work that shapes children's resilience and emotional intelligence. This task requires significant emotional energy.",
    factors: "Time (4.0×) • Invisibility (1.5×) • Emotional Labor (1.5×)",
  },
  "q17": {
    text: "Anticipating developmental needs requires research, observation, and proactive planning. This invisible parental task directly impacts children's growth and wellbeing.",
    factors: "Time (3.0×) • Invisibility (1.5×) • Child Impact (1.5×)",
  },
  "q18": {
    text: "Mediating sibling conflicts requires emotional regulation, conflict resolution skills, and patience. This invisible work teaches children relationship skills.",
    factors: "Time (3.0×) • Invisibility (1.4×) • Emotional Labor (1.5×)",
  },
  "q19": {
    text: "Monitoring academic progress involves tracking assignments, communicating with teachers, and providing appropriate support. This invisible task impacts educational outcomes.",
    factors: "Time (2.5×) • Invisibility (1.4×) • Child Impact (1.5×)",
  },
  "q20": {
    text: "Moral and cultural education shapes children's values and identity. This high-impact invisible work requires intentional conversations and modeling.",
    factors: "Time (3.5×) • Invisibility (1.5×) • Child Impact (1.5×)",
  }
};



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
          
          {/* Enhanced AI explanation */}
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
  <div className="flex items-start">
    <Brain size={16} className="text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-purple-800 font-medium text-sm mb-1">Why This Question Matters:</p>
      <p className="text-purple-800 font-roboto text-sm">
        {questionExplanations[currentQ.id]?.text || 
          `This question helps identify who handles key ${currentQ.category.toLowerCase()} in your family. 
          ${currentQ.category.includes("Invisible") ? 
            "Invisible work often goes unrecognized but creates significant mental load." : 
            "Visible tasks take time and energy that should be equitably shared."}`
        }
      </p>
      <div className="mt-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
        <span className="font-medium">Task Weight Factors:</span> {questionExplanations[currentQ.id]?.factors || 
          `${currentQ.category.includes("Household") ? "Time (4.2×) • " : "Time (3.8×) • "}
          ${currentQ.category.includes("Invisible") ? "Invisibility (1.5×) • " : "Invisibility (1.0×) • "}
          ${currentQ.category.includes("Parental") ? "Emotional Labor (1.4×)" : "Emotional Labor (1.1×)"}`
        }
      </div>
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