// src/contexts/SurveyContext.js
import React, { createContext, useContext, useState } from 'react';
import { calculateTaskWeight } from '../utils/TaskWeightCalculator';

// Create the survey context
const SurveyContext = createContext();

// Custom hook to use the survey context
export function useSurvey() {
  return useContext(SurveyContext);
}

// Provider component
export function SurveyProvider({ children }) {
  // Generate full set of 100 questions (25 per category) with weight attributes
  const generateFullQuestionSet = () => {
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
      
    const questions = [];
    const questionTexts = {
      "Visible Household Tasks": [
        "Who is responsible for cleaning floors in your home?",
        "Who usually washes the dishes after meals?",
        "Who typically cooks meals for the family?",
        "Who does the laundry in your household?",
        "Who does the grocery shopping?",
        "Who takes out the trash regularly?",
        "Who handles yard work like mowing and gardening?",
        "Who cleans the bathrooms?",
        "Who dusts surfaces around the house?",
        "Who makes the beds each day?",
        "Who irons clothes when needed?",
        "Who changes bed linens regularly?",
        "Who feeds the pets?",
        "Who walks the dog?",
        "Who handles small home repairs?",
        "Who washes the windows?",
        "Who sets the table for meals?",
        "Who shovels snow in winter?",
        "Who cleans the refrigerator?",
        "Who sets up new technology devices (TVs, computers, smart home devices) in your home?",
        "Who handles troubleshooting when household technology or appliances malfunction?",
        "Who installs software updates on family computers and devices?",
        "Who manages the home's internet network (router setup, addressing connectivity issues)?",
        "Who organizes and maintains digital equipment and accessories (cables, chargers, etc.)?",
        "Who organizes closets and storage spaces?"
      ],
      "Invisible Household Tasks": [
        "Who plans meals for the week?",
        "Who schedules family appointments?",
        "Who manages the family calendar?",
        "Who remembers birthdays and special occasions?",
        "Who makes shopping lists?",
        "Who handles paying bills on time?",
        "Who coordinates childcare arrangements?",
        "Who plans family vacations and trips?",
        "Who oversees children's educational needs?",
        "Who keeps track of household supplies?",
        "Who provides emotional support during tough times?",
        "Who maintains social relationships and family connections?",
        "Who anticipates family needs like seasonal clothing?",
        "Who decides on home organization systems?",
        "Who researches products before purchasing?",
        "Who maintains important documents?",
        "Who plans for holidays and special events?",
        "Who tracks maintenance schedules for appliances?",
        "Who manages family health needs?",
        "Who guides family values and addresses behavioral issues?",
        "Who researches and makes decisions about technology purchases for the home?",
        "Who manages digital subscriptions and accounts (Netflix, Spotify, utilities, etc.)?",
        "Who keeps track of digital passwords and login information for household accounts?",
        "Who monitors and manages the family's digital security (updates, antivirus, backups)?",
        "Who researches solutions when family members have technology questions or problems?"
      ],
      "Visible Parental Tasks": [
        "Who drives kids to school and activities?",
        "Who helps with homework?",
        "Who attends parent-teacher conferences?",
        "Who prepares school lunches?",
        "Who coordinates extracurricular activities?",
        "Who attends children's performances and games?",
        "Who organizes playdates?",
        "Who supervises bath time?",
        "Who manages bedtime routines?",
        "Who shops for school supplies and clothing?",
        "Who schedules children's medical appointments?",
        "Who prepares children for school each morning?",
        "Who volunteers at school functions?",
        "Who communicates with teachers and school staff?",
        "Who plans and hosts birthday parties?",
        "Who monitors screen time?",
        "Who teaches life skills?",
        "Who disciplines and sets behavioral expectations?",
        "Who assists with college or career preparation?",
        "Who helps children with technology homework or school digital platforms?",
        "Who supervises children's screen time and enforces technology boundaries?",
        "Who teaches children how to use new apps, devices, or digital tools?",
        "Who participates in virtual parent-teacher conferences or online school communications?",
        "Who helps children navigate social media or their online presence?",
        "Who engages in recreational activities with kids?"
      ],
      "Invisible Parental Tasks": [
        "Who coordinates children's schedules to prevent conflicts?",
        "Who provides emotional labor for the family?",
        "Who anticipates developmental needs?",
        "Who networks with other parents?",
        "Who monitors academic progress?",
        "Who develops strategies for behavioral issues?",
        "Who watches for signs of illness or stress?",
        "Who plans for future educational expenses?",
        "Who maintains family traditions?",
        "Who handles cultural and moral education?",
        "Who mediates conflicts between siblings?",
        "Who customizes parenting approaches for each child?",
        "Who coordinates with teachers and coaches?",
        "Who stays informed on child safety best practices?",
        "Who keeps track of details like clothing sizes and allergies?",
        "Who manages their own emotions to provide stability?",
        "Who encourages children's personal interests?",
        "Who decides on appropriate screen time rules?",
        "Who helps children navigate social relationships?",
        "Who supports the co-parent emotionally and practically?",
        "Who anticipates children's emotional needs before they're explicitly expressed?",
        "Who researches strategies for supporting children through emotional challenges?",
        "Who notices subtle changes in children's emotional wellbeing and follows up?",
        "Who coordinates the 'emotional climate' of the family during stressful periods?",
        "Who keeps mental track of each child's emotional triggers and coping mechanisms?"
      ]
    };
    
    // Add category balance questions - new in updated version
    const balanceQuestions = {
      "Visible Household Tasks": [
        "Who takes responsibility for ensuring household cleanliness overall?",
        "Who notices when visible household tasks need to be done?",
        "Who initiates conversations about sharing visible household work?",
        "Who feels more stressed when visible household tasks pile up?",
        "Who receives more recognition for completing visible household tasks?"
      ],
      "Invisible Household Tasks": [
        "Who takes responsibility for the overall household planning?",
        "Who notices when invisible household tasks need attention?",
        "Who initiates conversations about sharing mental load?",
        "Who feels more stressed about household organization?",
        "Who receives recognition for household management?"
      ],
      "Visible Parental Tasks": [
        "Who takes primary responsibility for children's day-to-day needs?",
        "Who notices when children need active parental involvement?",
        "Who initiates conversations about sharing childcare duties?",
        "Who feels more stressed about direct childcare responsibilities?",
        "Who receives more recognition for parenting efforts?"
      ],
      "Invisible Parental Tasks": [
        "Who takes responsibility for children's emotional wellbeing?",
        "Who notices subtle changes in children's needs or development?",
        "Who initiates conversations about parenting approaches?",
        "Who feels more stressed about children's future?",
        "Who carries more of the emotional labor of parenting?"
      ]
    };
    
    // Define weight attributes for each question category
    const categoryWeights = {
      "Visible Household Tasks": {
        baseWeight: 2,
        frequency: "weekly",
        invisibility: "highly",
        emotionalLabor: "minimal",
        researchImpact: "medium",
        childDevelopment: "high",
        relationshipImpact: "moderate" // New factor
      },
      "Invisible Household Tasks": {
        baseWeight: 4,
        frequency: "daily",
        invisibility: "completely",
        emotionalLabor: "high",
        researchImpact: "high",
        childDevelopment: "moderate",
        relationshipImpact: "high" // New factor
      },
      "Visible Parental Tasks": {
        baseWeight: 3,
        frequency: "daily",
        invisibility: "partially",
        emotionalLabor: "moderate",
        researchImpact: "high",
        childDevelopment: "high",
        relationshipImpact: "moderate" // New factor
      },
      "Invisible Parental Tasks": {
        baseWeight: 5,
        frequency: "daily",
        invisibility: "completely",
        emotionalLabor: "extreme",
        researchImpact: "high",
        childDevelopment: "high",
        relationshipImpact: "extreme" // New factor
      }
    };
    
    // AI-generated weight variations within categories for specific questions
    const generateQuestionWeights = (text, category) => {
      // Base weights from category
      const weights = { ...categoryWeights[category] };
      
      // Use text analysis to determine specific question attributes
      if (text.includes("meal") || text.includes("cook")) {
        weights.frequency = "daily";
        weights.childDevelopment = "high";
      }
      
      if (text.includes("emotional") || text.includes("support") || text.includes("needs")) {
        weights.emotionalLabor = "extreme";
        weights.invisibility = "completely";
        weights.relationshipImpact = "extreme";
      }
      
      if (text.includes("plan") || text.includes("research") || text.includes("anticipate")) {
        weights.invisibility = "completely";
        weights.emotionalLabor = "high";
        weights.relationshipImpact = "high";
      }
      
      if (text.includes("track") || text.includes("schedule") || text.includes("coordinate")) {
        weights.invisibility = "mostly";
        weights.emotionalLabor = "moderate";
        weights.relationshipImpact = "high";
      }
      
      if (text.includes("children") || text.includes("kids") || text.includes("family")) {
        weights.childDevelopment = "high";
      }
      
      // Specific task impacts based on keyword matching - enhanced
      if (text.includes("emotion") || text.includes("stress") || text.includes("feeling")) {
        weights.relationshipImpact = "extreme";
        weights.emotionalLabor = "extreme";
        weights.baseWeight = 5;
      }
      
      if (text.includes("conflict") || text.includes("mediate") || text.includes("argument")) {
        weights.relationshipImpact = "extreme";
        weights.emotionalLabor = "extreme";
        weights.baseWeight = 5; 
      }
      
      if (text.includes("tradition") || text.includes("value") || text.includes("culture")) {
        weights.childDevelopment = "extreme";
        weights.relationshipImpact = "high";
      }
      
      if (text.includes("future") || text.includes("college") || text.includes("career")) {
        weights.baseWeight = 4;
        weights.emotionalLabor = "high";
      }
      
      if (text.includes("notice") || text.includes("anticipate") || text.includes("track")) {
        weights.invisibility = "completely";
        weights.relationshipImpact = "high";
      }
      
      // Calculate task complexity based on verb count
      const verbCount = (text.match(/\b(manage|coordinate|research|plan|organize|prepare|arrange|monitor|maintain|develop)\b/gi) || []).length;
      if (verbCount >= 2) {
        weights.baseWeight = Math.min(5, weights.baseWeight + 1);
      }
      
      return weights;
    };
    
    // Helper function to generate weight explanation text
    const getWeightExplanation = (text, weightData) => {
      let explanation = "This task is ";
      
      // Base weight description
      if (weightData.baseWeight >= 4) {
        explanation += "extremely time-intensive ";
      } else if (weightData.baseWeight >= 3) {
        explanation += "moderately time-consuming ";
      } else {
        explanation += "relatively quick ";
      }
      
      // Frequency
      if (weightData.frequency === "daily") {
        explanation += "and needs to be done every day. ";
      } else if (weightData.frequency === "several") {
        explanation += "and needs to be done several times a week. ";
      } else if (weightData.frequency === "weekly") {
        explanation += "and needs to be done weekly. ";
      } else {
        explanation += "but doesn't need to be done as frequently. ";
      }
      
      // Invisibility
      if (weightData.invisibility === "completely" || weightData.invisibility === "mostly") {
        explanation += "It's largely invisible work that often goes unnoticed but creates mental load. ";
      }
      
      // Emotional labor
      if (weightData.emotionalLabor === "extreme" || weightData.emotionalLabor === "high") {
        explanation += "This task requires significant emotional energy. ";
      }
      
      // Child development
      if (weightData.childDevelopment === "high") {
        explanation += "How this task is distributed teaches children important lessons about gender roles. ";
      }
      
      // Relationship impact - new
      if (weightData.relationshipImpact === "extreme") {
        explanation += "Imbalance in this task can significantly impact relationship satisfaction.";
      } else if (weightData.relationshipImpact === "high") {
        explanation += "This task often contributes to relationship tension when imbalanced.";
      }
      
      return explanation;
    };
      
    let questionId = 1;
    categories.forEach(category => {
      // Add the 25 main questions for this category
      questionTexts[category].forEach(text => {
        // Generate AI-based weights for this specific question
        const weightData = generateQuestionWeights(text, category);
        
        // Generate weight explanation
        const weightExplanation = getWeightExplanation(text, weightData);
        
        // Calculate the total weight
        const totalWeight = calculateTaskWeight({
          ...weightData,
          category
        }, null);
        
        questions.push({
          id: `q${questionId}`,
          text: text,
          category: category,
          explanation: `This question helps us understand who is primarily handling ${category.toLowerCase()} in your family and allows us to track changes over time.`,
          weightExplanation: weightExplanation,
          totalWeight: totalWeight.toFixed(2),
          // Weight attributes
          baseWeight: weightData.baseWeight,
          frequency: weightData.frequency,
          invisibility: weightData.invisibility,
          emotionalLabor: weightData.emotionalLabor,
          researchImpact: weightData.researchImpact,
          childDevelopment: weightData.childDevelopment,
          relationshipImpact: weightData.relationshipImpact // New attribute
        });
        questionId++;
      });
      
      // Add the 5 balance questions for this category
      balanceQuestions[category].forEach(text => {
        // Balance questions have higher weights for relationship impact
        const weightData = {
          ...categoryWeights[category],
          relationshipImpact: "extreme",
          emotionalLabor: "high",
          baseWeight: 4
        };
        
        // Generate weight explanation
        const weightExplanation = getWeightExplanation(text, weightData);
        
        // Calculate the total weight
        const totalWeight = calculateTaskWeight({
          ...weightData,
          category
        }, null);
        
        questions.push({
          id: `q${questionId}`,
          text: text,
          category: category,
          explanation: `This question helps us assess the meta-level balance of responsibility for ${category.toLowerCase()} tasks in your family.`,
          weightExplanation: weightExplanation,
          totalWeight: totalWeight.toFixed(2),
          // Weight attributes
          baseWeight: weightData.baseWeight,
          frequency: weightData.frequency,
          invisibility: weightData.invisibility,
          emotionalLabor: weightData.emotionalLabor,
          researchImpact: weightData.researchImpact,
          childDevelopment: weightData.childDevelopment,
          relationshipImpact: weightData.relationshipImpact,
          isBalanceQuestion: true // Mark this as a balance-focused question
        });
        questionId++;
      });
    });
      
    return questions;
  };

  // Generate weekly check-in questions (20 selected questions)
  const generateWeeklyQuestions = (weekNumber) => {
    // Select 5 questions from each category, based on week number for variety
    const weeklyQuestions = [];
    
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Focus areas based on week number
    const weeklyFocus = [
      null, // Week 0 (unused)
      "high-impact", // Week 1: Focus on high-impact tasks
      "relationship", // Week 2: Focus on relationship impact
      "invisible", // Week 3: Focus on invisible work
      "emotional", // Week 4: Focus on emotional labor
      "child-development", // Week 5: Focus on child development
      "balancing", // Week 6: Focus on balance management
      "progress", // Week 7: Focus on progress areas
      "challenge" // Week 8: Focus on challenge areas
    ][weekNumber % 9] || "high-impact"; // Default to high-impact for other weeks
    
    console.log(`Week ${weekNumber} focus: ${weeklyFocus}`);
    
    // Helper function to select questions based on weekly focus
    const selectFocusQuestions = (categoryQuestions) => {
      let filteredQuestions = [...categoryQuestions];
      
      // Pre-filter based on focus area
      switch(weeklyFocus) {
        case "high-impact":
          // Sort by total weight and take top questions
          filteredQuestions.sort((a, b) => parseFloat(b.totalWeight) - parseFloat(a.totalWeight));
          break;
        case "relationship":
          // Prioritize relationship impact questions
          filteredQuestions.sort((a, b) => {
            const impactValues = { "extreme": 3, "high": 2, "moderate": 1, "minimal": 0 };
            return impactValues[b.relationshipImpact] - impactValues[a.relationshipImpact];
          });
          break;
        case "invisible":
          // Prioritize invisibility questions
          filteredQuestions.sort((a, b) => {
            const invisValues = { "completely": 3, "mostly": 2, "partially": 1, "highly": 0 };
            return invisValues[b.invisibility] - invisValues[a.invisibility];
          });
          break;
        case "emotional":
          // Prioritize emotional labor questions
          filteredQuestions.sort((a, b) => {
            const emotionalValues = { "extreme": 3, "high": 2, "moderate": 1, "minimal": 0 };
            return emotionalValues[b.emotionalLabor] - emotionalValues[a.emotionalLabor];
          });
          break;
        case "child-development":
          // Prioritize child development questions
          filteredQuestions.sort((a, b) => {
            const devValues = { "high": 2, "moderate": 1, "limited": 0 };
            return devValues[b.childDevelopment] - devValues[a.childDevelopment];
          });
          break;
        case "balancing":
          // Prioritize balance questions
          filteredQuestions = filteredQuestions.filter(q => q.isBalanceQuestion === true);
          if (filteredQuestions.length < 5) {
            // If not enough balance questions, add some high-impact ones
            const additionalQuestions = categoryQuestions
              .filter(q => !q.isBalanceQuestion)
              .sort((a, b) => parseFloat(b.totalWeight) - parseFloat(a.totalWeight))
              .slice(0, 5 - filteredQuestions.length);
            
            filteredQuestions = [...filteredQuestions, ...additionalQuestions];
          }
          break;
        case "progress":
        case "challenge":
          // These would use historical data in a real implementation
          // For now, just use high-impact questions
          filteredQuestions.sort((a, b) => parseFloat(b.totalWeight) - parseFloat(a.totalWeight));
          break;
      }
      
      // Take top 3 based on focus
      const primaryQuestions = filteredQuestions.slice(0, 3);
      
      // Add 2 random other questions for variety
      const remainingQuestions = filteredQuestions
        .filter(q => !primaryQuestions.includes(q))
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
      
      // Mix and return questions
      return [...primaryQuestions, ...remainingQuestions].sort(() => 0.5 - Math.random());
    };
    
    categories.forEach(category => {
      const categoryQuestions = fullQuestionSet.filter(q => q.category === category);
      
      // Select questions based on weekly focus
      const selectedQuestions = selectFocusQuestions(categoryQuestions);
      
      // Add weekly explanations
      selectedQuestions.forEach(question => {
        let weeklyExplanation = `We're asking about this again to track changes over time and see if our recommendations are helping create more balance in your family. This is a ${parseFloat(question.totalWeight) > 10 ? 'high-impact' : 'standard'} task.`;
        
        // Add focus-specific explanation
        switch(weeklyFocus) {
          case "high-impact":
            weeklyExplanation += ` This week we're focusing on high-impact tasks that significantly affect your family balance.`;
            break;
          case "relationship":
            weeklyExplanation += ` This week we're focusing on tasks that impact your relationship satisfaction.`;
            break;
          case "invisible":
            weeklyExplanation += ` This week we're focusing on invisible work that often goes unrecognized.`;
            break;
          case "emotional":
            weeklyExplanation += ` This week we're focusing on emotional labor that can be draining when imbalanced.`;
            break;
          case "child-development":
            weeklyExplanation += ` This week we're focusing on tasks that affect how your children perceive gender roles.`;
            break;
          case "balancing":
            weeklyExplanation += ` This week we're focusing on how responsibility is distributed at a meta level.`;
            break;
          case "progress":
            weeklyExplanation += ` This week we're focusing on areas where you've made progress to maintain momentum.`;
            break;
          case "challenge":
            weeklyExplanation += ` This week we're focusing on challenging areas that need more attention.`;
            break;
        }
        
        weeklyQuestions.push({
          ...question,
          weeklyExplanation
        });
      });
    });
    
    return weeklyQuestions;
  };
  
  // Initial questions
  const fullQuestionSet = generateFullQuestionSet();
  
  // State for temporary survey progress
  const [currentSurveyResponsesState, setCurrentSurveyResponsesState] = useState({});
  const [completedQuestions, setCompletedQuestions] = useState([]);

  // Add or update a survey response
  const updateSurveyResponse = (questionId, answer) => {
    setCurrentSurveyResponsesState(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    if (!completedQuestions.includes(questionId)) {
      setCompletedQuestions(prev => [...prev, questionId]);
    }
  };

  // Reset survey progress
  const resetSurvey = () => {
    setCurrentSurveyResponsesState({});
    setCompletedQuestions([]);
  };

  // Get survey progress percentage
  const getSurveyProgress = (totalQuestions) => {
    return (completedQuestions.length / totalQuestions) * 100;
  };
  
  // Set survey responses from outside (like when loading saved responses)
  const setCurrentSurveyResponses = (responses) => {
    setCurrentSurveyResponsesState(responses);
    
    // Update completedQuestions state based on the responses
    const questionIds = Object.keys(responses);
    setCompletedQuestions(questionIds);
  };
  
  // Get questions for a specific category
  const getQuestionsByCategory = (category) => {
    return fullQuestionSet.filter(q => q.category === category);
  };
  
  // Get high-impact questions across all categories
  const getHighImpactQuestions = (threshold = 10) => {
    return fullQuestionSet.filter(q => parseFloat(q.totalWeight) > threshold);
  };
  
  // Get questions with high relationship impact
  const getRelationshipImpactQuestions = () => {
    return fullQuestionSet.filter(q => 
      q.relationshipImpact === "extreme" || q.relationshipImpact === "high"
    );
  };
  
  // Get invisible work questions
  const getInvisibleWorkQuestions = () => {
    return fullQuestionSet.filter(q => 
      q.invisibility === "completely" || q.invisibility === "mostly"
    );
  };
  
  // Get emotional labor questions
  const getEmotionalLaborQuestions = () => {
    return fullQuestionSet.filter(q => 
      q.emotionalLabor === "extreme" || q.emotionalLabor === "high"
    );
  };
  
  // Get child development impact questions
  const getChildDevelopmentQuestions = () => {
    return fullQuestionSet.filter(q => q.childDevelopment === "high");
  };
  
  // Get balance-focused questions
  const getBalanceQuestions = () => {
    return fullQuestionSet.filter(q => q.isBalanceQuestion === true);
  };

  // Context value
  const value = {
    fullQuestionSet,
    generateWeeklyQuestions,
    currentSurveyResponses: currentSurveyResponsesState,
    completedQuestions,
    updateSurveyResponse,
    resetSurvey,
    getSurveyProgress,
    setCurrentSurveyResponses,
    // New getter functions
    getQuestionsByCategory,
    getHighImpactQuestions,
    getRelationshipImpactQuestions,
    getInvisibleWorkQuestions,
    getEmotionalLaborQuestions,
    getChildDevelopmentQuestions,
    getBalanceQuestions
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}