// src/contexts/SurveyContext.js
import React, { createContext, useContext, useState } from 'react';
import { calculateTaskWeight } from '../utils/TaskWeightCalculator';
import QuestionFeedbackService from '../services/QuestionFeedbackService';


// Create the survey context
const SurveyContext = createContext();

// Custom hook to use the survey context
export function useSurvey() {
  return useContext(SurveyContext);
}

// Provider component
export function SurveyProvider({ children }) {
  // Generate full set of questions (all possible questions) with weight attributes
  const generateFullQuestionSet = () => {
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks",
      "Relationship Health" // For relationship-specific questions
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
      ],
      "Relationship Health": [
        "How would you rate your overall relationship satisfaction?",
        "How has workload sharing affected your relationship?",
        "How often do you currently have quality time together?",
        "How would you rate your communication as a couple?",
        "Which relationship area would you most like to improve?",
        "How effectively do you and your partner resolve conflicts?",
        "How valued do you feel by your partner?",
        "How comfortable are you discussing difficult topics with your partner?",
        "How fairly do you feel household responsibilities are distributed?",
        "How connected do you feel to your partner emotionally?",
        "How supported do you feel by your partner during stressful times?",
        "How well does your partner listen when you express concerns?",
        "How satisfied are you with the amount of appreciation expressed in your relationship?",
        "How aligned are you and your partner on parenting approaches?",
        "How well do you and your partner balance individual needs with relationship needs?",
        "How often do you have constructive conversations about your relationship?",
        "How well do you and your partner handle disagreements?",
        "How satisfied are you with the physical affection in your relationship?",
        "How much do you and your partner prioritize your relationship?",
        "How much time do you spend on relationship maintenance?",
        "How well do you and your partner support each other's personal goals?",
        "How effectively do you and your partner communicate about finances?",
        "How well do you and your partner divide childcare responsibilities?",
        "How satisfied are you with the amount of fun and play in your relationship?",
        "How much does balance affect your relationship satisfaction?"
      ]
    };
    
    // Add category balance questions
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
    const weightAttributes = {
      "Visible Household Tasks": {
        baseWeight: 2,
        frequency: "weekly",
        invisibility: "highly",
        emotionalLabor: "minimal",
        researchImpact: "medium",
        childDevelopment: "high",
        relationshipImpact: "moderate"
      },
      "Invisible Household Tasks": {
        baseWeight: 4,
        frequency: "daily",
        invisibility: "completely",
        emotionalLabor: "high",
        researchImpact: "high",
        childDevelopment: "moderate",
        relationshipImpact: "high"
      },
      "Visible Parental Tasks": {
        baseWeight: 3,
        frequency: "daily",
        invisibility: "partially",
        emotionalLabor: "moderate",
        researchImpact: "high",
        childDevelopment: "high",
        relationshipImpact: "moderate"
      },
      "Invisible Parental Tasks": {
        baseWeight: 5,
        frequency: "daily",
        invisibility: "completely",
        emotionalLabor: "extreme",
        researchImpact: "high",
        childDevelopment: "high",
        relationshipImpact: "extreme"
      },
      "Relationship Health": {
        baseWeight: 4,
        frequency: "daily",
        invisibility: "mostly",
        emotionalLabor: "extreme",
        researchImpact: "high",
        childDevelopment: "high",
        relationshipImpact: "extreme"
      }
    };
    
    // AI-generated weight variations within categories for specific questions
    const generateQuestionWeights = (text, category) => {
      // Base weights from category
      const weights = { ...weightAttributes[category] };
      
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
      
      // Relationship impact
      if (weightData.relationshipImpact === "extreme") {
        explanation += "Imbalance in this task can significantly impact relationship satisfaction.";
      } else if (weightData.relationshipImpact === "high") {
        explanation += "This task often contributes to relationship tension when imbalanced.";
      }
      
      return explanation;
    };
      
    let questionId = 1;
    categories.forEach(category => {
      // Add the main questions for this category
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
          relationshipImpact: weightData.relationshipImpact
        });
        questionId++;
      });
      
      // Add the balance questions for this category
      if (balanceQuestions[category]) {
        balanceQuestions[category].forEach(text => {
          // Balance questions have higher weights for relationship impact
          const weightData = {
            ...weightAttributes[category],
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
      }
    });
      
    return questions;
  };

  // Add this updated function in SurveyContext.js to replace the existing one
  const selectPersonalizedInitialQuestions = (fullQuestionSet, familyData, targetCount = 72) => {
    console.log("Selecting personalized questions with target count:", targetCount);
    
    // If no family data is provided, return a balanced default set
    if (!familyData) {
      console.log("No family data provided, using default selection");
      return selectDefaultInitialQuestions(fullQuestionSet, targetCount);
    }
    
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Questions per category (evenly distributed by default)
    const questionsPerCategory = Math.floor(targetCount / categories.length);
    console.log("Initial questions per category:", questionsPerCategory);
    
    // Create an array to hold our selected questions
    const selectedQuestions = [];
    
    // Process family data for personalization
    const { 
      children = [],
      communication = {},
      priorities = {},
      aiPreferences = {}
    } = familyData;
    
    // Adjust distribution based on priorities
    const priorityOrder = [
      priorities.highestPriority,
      priorities.secondaryPriority,
      priorities.tertiaryPriority
    ].filter(Boolean); // Remove any undefined values
    
    // Calculate adjusted distribution
    let categoryDistribution = {};
    if (priorityOrder.length > 0) {
      // Default even distribution
      categories.forEach(cat => {
        categoryDistribution[cat] = questionsPerCategory;
      });
      
      // Boost highest priority by 50%
      if (priorityOrder[0]) {
        const boost = Math.min(6, Math.floor(questionsPerCategory * 0.5));
        categoryDistribution[priorityOrder[0]] += boost;
        
        // Take from lowest priority if available
        const lowestPriority = categories.find(cat => !priorityOrder.includes(cat));
        if (lowestPriority) {
          categoryDistribution[lowestPriority] = Math.max(
            Math.floor(questionsPerCategory * 0.5), 
            categoryDistribution[lowestPriority] - boost
          );
        }
      }
      
      console.log("Adjusted distribution based on priorities:", categoryDistribution);
    } else {
      // Even distribution
      categories.forEach(cat => {
        categoryDistribution[cat] = questionsPerCategory;
      });
    }
    
    // Now select questions for each category based on the adjusted distribution
    categories.forEach(category => {
      // Get all questions for this category
      const categoryQuestions = fullQuestionSet.filter(q => q.category === category);
      
      // Skip if no questions in this category
      if (categoryQuestions.length === 0) return;
      
      // Score each question for relevance
      const scoredQuestions = categoryQuestions.map(question => {
        let relevanceScore = 0;
        
        // Child-related scoring boost for families with children
        if (children && children.length > 0) {
          if (question.childDevelopment === "high") {
            relevanceScore += 5;
          }
          if (question.text.toLowerCase().includes("child") || 
              question.text.toLowerCase().includes("kid") ||
              question.text.toLowerCase().includes("school")) {
            relevanceScore += 3;
          }
        }
        
        // Communication style relevance
        if (communication.style) {
          if ((communication.style === "reserved" || communication.style === "avoidant") &&
              (question.invisibility === "completely" || question.invisibility === "mostly")) {
            relevanceScore += 6;
          }
        }
        
        // Weight importance - prioritize high impact
        const weight = parseFloat(question.totalWeight || 0);
        if (weight >= 12) relevanceScore += 10;
        else if (weight >= 9) relevanceScore += 8;
        else if (weight >= 6) relevanceScore += 5;
        
        return {
          ...question,
          relevanceScore
        };
      });
      
      // Sort by relevance and take the required number for this category
      const sortedQuestions = [...scoredQuestions].sort((a, b) => 
        b.relevanceScore - a.relevanceScore
      );
      
      // Take the number of questions based on our distribution
      const numToTake = categoryDistribution[category] || questionsPerCategory;
      const selectedForCategory = sortedQuestions.slice(0, numToTake);
      
      console.log(`Selected ${selectedForCategory.length} questions for ${category}`);
      
      // Add to selected questions
      selectedQuestions.push(...selectedForCategory);
    });
    
    // If we don't have enough questions, add more from any category
    if (selectedQuestions.length < targetCount) {
      console.log(`Only selected ${selectedQuestions.length}/${targetCount} questions, adding more...`);
      
      // Get all questions not already selected
      const remainingQuestions = fullQuestionSet.filter(q => 
        !selectedQuestions.some(selected => selected.id === q.id) &&
        categories.includes(q.category)
      );
      
      // Sort by weight (highest first)
      const sortedRemaining = [...remainingQuestions].sort((a, b) => 
        parseFloat(b.totalWeight || 0) - parseFloat(a.totalWeight || 0)
      );
      
      // Add enough to reach target count
      selectedQuestions.push(...sortedRemaining.slice(0, targetCount - selectedQuestions.length));
      
      console.log(`After filling, have ${selectedQuestions.length} questions`);
    }
    
    // Sort the final selection by category and ID for a logical order
    return selectedQuestions.sort((a, b) => {
      // First sort by category
      if (a.category !== b.category) {
        return categories.indexOf(a.category) - categories.indexOf(b.category);
      }
      // Then by ID
      return parseInt(a.id.replace('q', '')) - parseInt(b.id.replace('q', ''));
    });
  };

  // Default selection of initial survey questions without family data
  const selectDefaultInitialQuestions = (fullQuestionSet, targetCount = 72) => {
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    // Questions per category (evenly distributed)
    const questionsPerCategory = Math.floor(targetCount / categories.length);
    
    const selectedQuestions = [];
    
    categories.forEach(category => {
      // Get all questions for this category
      const categoryQuestions = fullQuestionSet.filter(q => q.category === category);
      
      // Sort by total weight (highest impact first)
      const sortedQuestions = [...categoryQuestions].sort((a, b) => 
        parseFloat(b.totalWeight) - parseFloat(a.totalWeight)
      );
      
      // Take top questions for this category
      const topQuestions = sortedQuestions.slice(0, questionsPerCategory);
      
      // Add to selected questions
      selectedQuestions.push(...topQuestions);
    });
    
    return selectedQuestions;
  };

  // Generate weekly check-in questions - IMPROVED ADAPTIVE ALGORITHM WITH CHILD PERSONALIZATION
  const generateWeeklyQuestions = (weekNumber, isChild = false, familyData = null, previousResponses = {}, taskCompletionData = [], childId = null) => {
    // Set standard question count for all family members
    const targetQuestionCount = 20;
    
    // Get categories
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    console.log(`Generating questions for week ${weekNumber}${childId ? `, child ID: ${childId}` : ''}`);
    
    // If this is for a specific child, filter previous responses to just that child
    let childSpecificResponses = previousResponses;
    if (isChild && childId) {
      // Create a filtered set of responses that only includes this child's responses
      childSpecificResponses = Object.fromEntries(
        Object.entries(previousResponses).filter(([key, _]) => {
          // Check if this response is from this specific child
          // Either by looking for childId in the key or checking response metadata
          return key.includes(`child-${childId}`) || 
                 key.includes(`user-${childId}`) ||
                 (key.includes(`week-${weekNumber}`) && key.includes(childId));
        })
      );
      
      console.log(`Found ${Object.keys(childSpecificResponses).length} specific responses for child ${childId}`);
    }
    
    // Helper to get child-specific age if available
    const getChildAge = () => {
      if (!isChild || !childId || !familyData || !familyData.children) return 10; // Default
      
      const childData = familyData.children.find(c => c.id === childId);
      return childData?.age ? parseInt(childData.age) : 10;
    };
    
    // Get this specific child's age
    const childAge = getChildAge();
    
    // Get seed value based on childId to ensure different random selections
    const getChildSeed = () => {
      if (!childId) return 0;
      
      // Generate a numeric seed from the childId string
      return childId.split('').reduce((sum, char, i) => 
        sum + char.charCodeAt(0) * (i + 1), 0) % 997; // Use prime number for better distribution
    };
    
    // The seed affects random selections based on childId
    const childSeed = getChildSeed();
    
    // Inside the getQuestionsFromCategory and other selection functions, add this:
    // Use childSeed to vary selection for different children
    const getChildSpecificQuestions = (questions, count) => {
      if (!isChild || !childId) return questions.slice(0, count);
      
      // Shuffle array with a deterministic approach based on childId and week
      const shuffled = [...questions];
      const shuffleSeed = childSeed + (weekNumber * 31);
      
      // Fisher-Yates shuffle with deterministic randomness
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Use consistent "random" index based on child and position
        const j = (shuffleSeed + i * 13) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      return shuffled.slice(0, count);
    };
    
    // Helper to analyze imbalances by category based on previous responses
    const analyzeImbalancesByCategory = () => {
      // Use child-specific responses if available
      const responsesToAnalyze = isChild && childId ? childSpecificResponses : previousResponses;
      
      // Prepare category imbalance tracking
      const imbalanceData = {};
      categories.forEach(category => {
        imbalanceData[category] = { 
          mama: 0, 
          papa: 0, 
          total: 0, 
          imbalance: 0 
        };
      });
      
      // Count responses by category
      Object.entries(responsesToAnalyze || {}).forEach(([key, value]) => {
        // Skip non-response entries
        if (value !== "Mama" && value !== "Papa") return;
        
        // Find the question category
        const questionId = key.split('-').pop();
        const question = fullQuestionSet.find(q => q.id === questionId);
        
        if (question && question.category) {
          imbalanceData[question.category].total++;
          
          if (value === "Mama") {
            imbalanceData[question.category].mama++;
          } else {
            imbalanceData[question.category].papa++;
          }
        }
      });
      
      // Calculate imbalance percentages
      categories.forEach(category => {
        const data = imbalanceData[category];
        if (data.total > 0) {
          const mamaPercent = (data.mama / data.total) * 100;
          const papaPercent = (data.papa / data.total) * 100;
          data.imbalance = Math.abs(mamaPercent - papaPercent);
          data.dominantParent = mamaPercent > papaPercent ? "Mama" : "Papa";
          data.mamaPercent = mamaPercent;
          data.papaPercent = papaPercent;
        }
      });
      
      // Sort categories by imbalance (highest first)
      return Object.entries(imbalanceData)
        .sort((a, b) => b[1].imbalance - a[1].imbalance)
        .map(([category, data]) => ({ category, ...data }));
    };
    
    // Helper to identify tasks with best completion and impact
    const analyzeTaskEffectiveness = (taskData = []) => {
      // Group tasks by category
      const tasksByCategory = {};
      categories.forEach(category => {
        tasksByCategory[category] = { completed: 0, total: 0, effectiveness: 0 };
      });
      
      // Count completed tasks per category
      taskData.forEach(task => {
        if (!task.category || !categories.includes(task.category)) return;
        
        tasksByCategory[task.category].total++;
        if (task.completed) {
          tasksByCategory[task.category].completed++;
        }
      });
      
      // Calculate effectiveness scores
      categories.forEach(category => {
        const data = tasksByCategory[category];
        if (data.total > 0) {
          data.effectiveness = data.completed / data.total;
        }
      });
      
      // Sort by effectiveness (highest first)
      return Object.entries(tasksByCategory)
        .sort((a, b) => b[1].effectiveness - a[1].effectiveness)
        .map(([category, data]) => ({ category, ...data }));
    };
    
    // Helper to identify balanced categories (low imbalance)
    const identifyBalancedCategories = () => {
      const imbalances = analyzeImbalancesByCategory();
      // Consider categories with less than 20% imbalance as "balanced"
      return imbalances.filter(data => data.imbalance < 20);
    };
    
    // Helper to find questions not previously asked
    const getNewQuestions = (questionSet) => {
      // Get all question IDs that have been answered
      const answeredQuestionIds = Object.keys(previousResponses || {})
        .map(key => key.split('-').pop())
        .filter(id => id.startsWith('q'));
      
      // Find questions that haven't been asked yet
      return questionSet.filter(q => !answeredQuestionIds.includes(q.id));
    };
    
    // Helper to get questions from a specific category, prioritizing by weight
    const getQuestionsFromCategory = (category, count, excludeIds = []) => {
      // Get all questions for this category that haven't been excluded
      const categoryQuestions = fullQuestionSet.filter(q => 
        q.category === category && !excludeIds.includes(q.id)
      );
      
      // Sort by total weight (highest impact first)
      const sortedQuestions = [...categoryQuestions].sort((a, b) => 
        parseFloat(b.totalWeight) - parseFloat(a.totalWeight)
      );
      
      // Take top questions, or as many as available
      return sortedQuestions.slice(0, count);
    };
    
    // Get imbalance analysis
    const imbalancedCategories = analyzeImbalancesByCategory();
    
    // Get task effectiveness data
    const effectiveCategories = analyzeTaskEffectiveness(taskCompletionData);
    
    // Get balanced categories (to check for backsliding)
    const balancedCategories = identifyBalancedCategories();
    
    // Create our question distribution plan - ADAPTIVE ALGORITHM
    let questionAllocation = {};
    
    // 1. PRIORITIZE HIGHEST IMBALANCE
    // Allocate more questions to categories with greatest imbalance
    if (imbalancedCategories.length > 0) {
      // Calculate how many questions to allocate based on imbalance severity
      let totalImbalance = imbalancedCategories.reduce((sum, cat) => sum + cat.imbalance, 0);
      
      imbalancedCategories.forEach(catData => {
        // Calculate proportion of total imbalance
        const proportion = totalImbalance > 0 ? catData.imbalance / totalImbalance : 0.25;
        
        // Allocate questions based on proportion (minimum 2 if any imbalance exists)
        const allocation = Math.max(2, Math.round(proportion * 10));
        
        questionAllocation[catData.category] = allocation;
      });
    }
    
    // 2. MAINTAIN SURVEILLANCE ON BALANCED AREAS
    // Allocate some questions to previously balanced categories to detect backsliding
    balancedCategories.forEach(catData => {
      // If already allocated, don't duplicate
      if (questionAllocation[catData.category]) return;
      
      // Allocate a small number of questions to monitor
      questionAllocation[catData.category] = 2;
    });
    
    // 3. ADD QUESTIONS ABOUT IMPROVEMENT AREAS
    // Include questions from categories showing promising progress
    effectiveCategories.slice(0, 2).forEach(catData => {
      // If already allocated, add some more
      if (questionAllocation[catData.category]) {
        questionAllocation[catData.category] += 1;
      } else {
        questionAllocation[catData.category] = 2;
      }
    });
    
    // 4. ENSURE ALL CATEGORIES HAVE SOME REPRESENTATION
    categories.forEach(category => {
      if (!questionAllocation[category]) {
        questionAllocation[category] = 1;
      }
    });
    
    // 5. ADJUST TO MATCH TARGET COUNT
    // Check total allocated
    const totalAllocated = Object.values(questionAllocation).reduce((sum, count) => sum + count, 0);
    
    // Adjust if necessary
    if (totalAllocated > targetQuestionCount) {
      // Need to reduce - start with most balanced categories
      const adjustOrder = [...categories].sort((a, b) => {
        const aImbalance = imbalancedCategories.find(c => c.category === a)?.imbalance || 0;
        const bImbalance = imbalancedCategories.find(c => c.category === b)?.imbalance || 0;
        return aImbalance - bImbalance; // Sort by imbalance (ascending)
      });
      
      let excess = totalAllocated - targetQuestionCount;
      let index = 0;
      
      while (excess > 0 && index < adjustOrder.length) {
        const category = adjustOrder[index];
        if (questionAllocation[category] > 1) {
          questionAllocation[category]--;
          excess--;
        }
        index = (index + 1) % adjustOrder.length; // Loop through categories as needed
      }
    } else if (totalAllocated < targetQuestionCount) {
      // Need to increase - prioritize most imbalanced categories
      const adjustOrder = [...categories].sort((a, b) => {
        const aImbalance = imbalancedCategories.find(c => c.category === a)?.imbalance || 0;
        const bImbalance = imbalancedCategories.find(c => c.category === b)?.imbalance || 0;
        return bImbalance - aImbalance; // Sort by imbalance (descending)
      });
      
      let deficit = targetQuestionCount - totalAllocated;
      let index = 0;
      
      while (deficit > 0 && index < adjustOrder.length) {
        const category = adjustOrder[index];
        questionAllocation[category]++;
        deficit--;
        index = (index + 1) % adjustOrder.length; // Loop through categories as needed
      }
    }
    
    // 6. SELECT ACTUAL QUESTIONS BASED ON ALLOCATION
    const selectedQuestions = [];
    const selectedIds = [];
    
    // For each category, select the appropriate number of questions
    Object.entries(questionAllocation).forEach(([category, count]) => {
      // Get top questions for this category
      const categoryQuestions = getQuestionsFromCategory(category, count, selectedIds);
      
      // Add to our selections
      selectedQuestions.push(...categoryQuestions);
      selectedIds.push(...categoryQuestions.map(q => q.id));
    });
    
    // 7. ENHANCE WITH EXPLANATIONS BASED ON FAMILY CONTEXT
    const finalQuestions = selectedQuestions.map(question => {
      // Find this category's imbalance data
      const categoryImbalance = imbalancedCategories.find(c => c.category === question.category);
      
      // Create a customized weekly explanation
      let weeklyExplanation = "";
      
      if (categoryImbalance && categoryImbalance.imbalance > 30) {
        // High imbalance explanation
        weeklyExplanation = `This question is from an area with a significant imbalance (${categoryImbalance.imbalance.toFixed(0)}% difference). ${categoryImbalance.dominantParent} is currently handling ${categoryImbalance.dominantParent === 'Mama' ? categoryImbalance.mamaPercent.toFixed(0) : categoryImbalance.papaPercent.toFixed(0)}% of these tasks.`;
      } else if (categoryImbalance && categoryImbalance.imbalance > 15) {
        // Moderate imbalance explanation
        weeklyExplanation = `This question helps track progress in an area with a ${categoryImbalance.imbalance.toFixed(0)}% workload imbalance. Regular check-ins help measure improvement over time.`;
      } else if (balancedCategories.some(c => c.category === question.category)) {
        // Balanced category explanation
        weeklyExplanation = `This question is from a relatively balanced category. We include it to help ensure you maintain the good balance you've achieved here.`;
      } else {
        // Default explanation
        weeklyExplanation = `This question helps us track changes in your family's distribution of responsibilities over time.`;
      }
      
      // Format based on child's age if applicable
      if (isChild) {
        // Get the user's age if available
        let childAge = 10; // Default if not available
        if (familyData && familyData.children) {
          // Find the selected user's age
          // (In a real implementation, we'd match this to the specific child)
          childAge = familyData.children[0]?.age ? parseInt(familyData.children[0].age) : 10;
        }
        
        // Add age-appropriate context
        if (childAge < 8) {
          weeklyExplanation = "This question helps us understand who does what in your family.";
        } else if (childAge < 13) {
          weeklyExplanation = "Your answers help your family share responsibilities more fairly.";
        }
      }
      
      return {
        ...question,
        weeklyExplanation
      };
    });
    
    return finalQuestions;
  };
  
  // Initial questions
  const fullQuestionSet = generateFullQuestionSet();
  
  // State for temporary survey progress
  const [currentSurveyResponsesState, setCurrentSurveyResponsesState] = useState({});
  const [cachedChildQuestions, setCachedChildQuestions] = useState({});
  const [completedQuestions, setCompletedQuestions] = useState([]);
  // Track user-modified weights
  const [userModifiedWeights, setUserModifiedWeights] = useState({});
  // Store the family data for personalization
  const [familyDataState, setFamilyDataState] = useState(null);

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
    // Add 1 to current index to show true progress (since we're on question currentIndex + 1)
    // This ensures the progress bar accurately reflects where we are in the survey
    return Math.min(((completedQuestions.length + 1) / totalQuestions) * 100, 100);
  };
  
  // Set survey responses from outside (like when loading saved responses)
  const setCurrentSurveyResponses = (responses) => {
    setCurrentSurveyResponsesState(responses);
    
    // Update completedQuestions state based on the responses
    const questionIds = Object.keys(responses);
    setCompletedQuestions(questionIds);
  };
  
  // Set family data for personalization
  const setFamilyData = (data) => {
    setFamilyDataState(data);
  };
  
  // Get personalized initial survey questions
  const getPersonalizedInitialQuestions = () => {
    return selectPersonalizedInitialQuestions(fullQuestionSet, familyDataState, 72);
  };
  
  // Update weight attributes for a question
  const updateQuestionWeight = (questionId, attributeName, newValue) => {
    // Find the question in the fullQuestionSet
    const questionIndex = fullQuestionSet.findIndex(q => q.id === questionId);
    
    if (questionIndex !== -1) {
      // Create a deep copy of the question set
      const updatedQuestionSet = [...fullQuestionSet];
      
      // Update the specified weight attribute
      updatedQuestionSet[questionIndex] = {
        ...updatedQuestionSet[questionIndex],
        [attributeName]: newValue
      };
      
      // Recalculate the total weight
      const updatedWeight = calculateTaskWeight(updatedQuestionSet[questionIndex], {
        highestPriority: "Invisible Parental Tasks",
        secondaryPriority: "Visible Parental Tasks",
        tertiaryPriority: "Invisible Household Tasks"
      });
      
      updatedQuestionSet[questionIndex].totalWeight = updatedWeight.toFixed(2);
      
      // Store the modified weight in user preferences
      setUserModifiedWeights(prev => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || {}),
          [attributeName]: newValue,
          totalWeight: updatedWeight.toFixed(2)
        }
      }));
      
      // Apply to similar questions in the same category
      const currentQuestion = updatedQuestionSet[questionIndex];
      const category = currentQuestion.category;
      
      // Find similar questions by keyword matching
      const questionText = currentQuestion.text.toLowerCase();
      const keywords = questionText.split(' ')
        .filter(word => word.length > 4)  // Only consider meaningful words
        .filter(word => !['what', 'when', 'where', 'which', 'their', 'about', 'would', 'could'].includes(word));
      
      // Update similar questions
      updatedQuestionSet.forEach((q, idx) => {
        // Skip the current question and questions from different categories
        if (idx === questionIndex || q.category !== category) return;
        
        // Check if this question has similar keywords
        const qText = q.text.toLowerCase();
        const hasSimilarKeywords = keywords.some(keyword => qText.includes(keyword));
        
        if (hasSimilarKeywords) {
          // Update the attribute for similar questions
          updatedQuestionSet[idx] = {
            ...updatedQuestionSet[idx],
            [attributeName]: newValue
          };
          
          // Recalculate weight
          const similarQuestionWeight = calculateTaskWeight(updatedQuestionSet[idx], {
            highestPriority: "Invisible Parental Tasks",
            secondaryPriority: "Visible Parental Tasks",
            tertiaryPriority: "Invisible Household Tasks"
          });
          
          updatedQuestionSet[idx].totalWeight = similarQuestionWeight.toFixed(2);
          
          // Store this modification too
          setUserModifiedWeights(prev => ({
            ...prev,
            [q.id]: {
              ...(prev[q.id] || {}),
              [attributeName]: newValue,
              totalWeight: similarQuestionWeight.toFixed(2)
            }
          }));
        }
      });
      
      // Return the updated question set and the updated question
      return {
        questionSet: updatedQuestionSet,
        updatedQuestion: updatedQuestionSet[questionIndex]
      };
    }
    
    return null;
  };
  
  // Modify generateWeeklyQuestions to use and update the cache:
  const generateWeeklyQuestionsWithCache = (weekNumber, isChild = false, familyData = null, previousResponses = {}, taskCompletionData = [], childId = null) => {
    // Create a cache key
    const cacheKey = `${weekNumber}-${childId || 'adult'}`;
    
    // Check if we have a cached version
    if (isChild && childId && cachedChildQuestions[cacheKey]) {
      console.log(`Using cached questions for child ${childId} in week ${weekNumber}`);
      return cachedChildQuestions[cacheKey];
    }
    
    // Generate questions as usual
    const questions = generateWeeklyQuestions(weekNumber, isChild, familyData, previousResponses, taskCompletionData, childId);
    
    // If this is for a child, cache the result
    if (isChild && childId) {
      setCachedChildQuestions(prev => ({
        ...prev,
        [cacheKey]: questions
      }));
    }
    
    return questions;
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
  
  // NEW: Get filtered questions for specific child (excluding questions marked as not applicable)
  const getFilteredQuestionsForChild = async (childId, familyId, baseQuestions) => {
    try {
      // Get questions to exclude based on previous feedback
      const questionIdsToExclude = await QuestionFeedbackService.getQuestionsToExclude(familyId, childId);
      
      // Filter out questions that were marked as not applicable
      return baseQuestions.filter(question => !questionIdsToExclude.includes(question.id));
    } catch (error) {
      console.error("Error filtering questions for child:", error);
      return baseQuestions; // Return original questions on error
    }
  };

  const getFilteredQuestionsForAdult = async (familyId, baseQuestions) => {
    try {
      // Get questions to exclude based on previous feedback
      const questionIdsToExclude = await QuestionFeedbackService.getQuestionsToExclude(familyId);
      
      // Filter out questions that were marked as not applicable
      return baseQuestions.filter(question => !questionIdsToExclude.includes(question.id));
    } catch (error) {
      console.error("Error filtering questions for adult:", error);
      return baseQuestions; // Return original questions on error
    }
  };

  // Update the context value
  const value = {
    // Filter out relationship questions for regular survey
    fullQuestionSet: fullQuestionSet
      .filter(q => q.category !== "Relationship Health"),
    generateWeeklyQuestions,
    currentSurveyResponses: currentSurveyResponsesState,
    completedQuestions,
    updateSurveyResponse,
    resetSurvey,
    getSurveyProgress,
    generateWeeklyQuestions: generateWeeklyQuestionsWithCache,

    setCurrentSurveyResponses,
    // New property for relationship questions
    relationshipQuestions: fullQuestionSet.filter(q => q.category === "Relationship Health"),
    // NEW: Add the user-modified weights state and update function
    userModifiedWeights,
    updateQuestionWeight,
    // NEW: Add family data and personalization functions
    setFamilyData,
    getPersonalizedInitialQuestions, // Make sure this is exposed
    selectPersonalizedInitialQuestions, // NEW: Also expose the direct function
    // Getter functions
    getQuestionsByCategory,
    getHighImpactQuestions,
    getRelationshipImpactQuestions,
    getInvisibleWorkQuestions,
    getEmotionalLaborQuestions,
    getChildDevelopmentQuestions,
    getBalanceQuestions,
    getFilteredQuestionsForAdult,

    // NEW: Add function to get filtered questions for children
    getFilteredQuestionsForChild,
    // Share family priorities with other components
    familyPriorities: {
      highestPriority: "Invisible Parental Tasks",
      secondaryPriority: "Visible Parental Tasks",
      tertiaryPriority: "Invisible Household Tasks"
    }
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}