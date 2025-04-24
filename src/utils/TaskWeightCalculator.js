// src/utils/TaskWeightCalculator.js

// Multiplier values based on memo
const FREQUENCY_MULTIPLIERS = {
  'daily': 1.5,
  'several': 1.3, // several times weekly
  'weekly': 1.2,
  'monthly': 1.0,
  'quarterly': 0.8
};

const INVISIBILITY_MULTIPLIERS = {
  'highly': 1.0, // highly visible
  'partially': 1.2,
  'mostly': 1.35,
  'completely': 1.5
};

const EMOTIONAL_LABOR_MULTIPLIERS = {
  'minimal': 1.0,
  'low': 1.1,
  'moderate': 1.2,
  'high': 1.3,
  'extreme': 1.4
};

const RESEARCH_IMPACT_MULTIPLIERS = {
  'high': 1.3,
  'medium': 1.15,
  'standard': 1.0
};

const CHILD_DEVELOPMENT_MULTIPLIERS = {
  'high': 1.25,
  'moderate': 1.15,
  'limited': 1.0
};

const PRIORITY_MULTIPLIERS = {
  'highest': 1.5,
  'secondary': 1.3,
  'tertiary': 1.1,
  'none': 1.0
};

export const calculateTaskWeight = (question, familyPriorities) => {
  // Get base weight from question
  const baseWeight = question.baseWeight || 3; // Default to middle value if not set
    
  // Get multipliers
  const frequencyMultiplier = FREQUENCY_MULTIPLIERS[question.frequency] || 1.0;
  const invisibilityMultiplier = INVISIBILITY_MULTIPLIERS[question.invisibility] || 1.0;
  const emotionalLaborMultiplier = EMOTIONAL_LABOR_MULTIPLIERS[question.emotionalLabor] || 1.0;
  const researchImpactMultiplier = RESEARCH_IMPACT_MULTIPLIERS[question.researchImpact] || 1.0;
  const childDevelopmentMultiplier = CHILD_DEVELOPMENT_MULTIPLIERS[question.childDevelopment] || 1.0;
    
  // Determine priority multiplier
  let priorityMultiplier = PRIORITY_MULTIPLIERS.none;
  if (familyPriorities) {
    if (familyPriorities.highestPriority === question.category) {
      priorityMultiplier = PRIORITY_MULTIPLIERS.highest;
    } else if (familyPriorities.secondaryPriority === question.category) {
      priorityMultiplier = PRIORITY_MULTIPLIERS.secondary;
    } else if (familyPriorities.tertiaryPriority === question.category) {
      priorityMultiplier = PRIORITY_MULTIPLIERS.tertiary;
    }
  }
    
  // Calculate the total weight
  const totalWeight = baseWeight * 
    frequencyMultiplier * 
    invisibilityMultiplier * 
    emotionalLaborMultiplier * 
    researchImpactMultiplier * 
    childDevelopmentMultiplier * 
    priorityMultiplier;
        
  return totalWeight;
};



// Function to calculate balance scores
export const calculateBalanceScores = (fullQuestionSet, responses, priorities = null) => {
  // Define categories
  const categories = {
    "Visible Household Tasks": { mama: 0, papa: 0, neutral: 0, total: 0, questionCount: 0 },
    "Invisible Household Tasks": { mama: 0, papa: 0, neutral: 0, total: 0, questionCount: 0 },
    "Visible Parental Tasks": { mama: 0, papa: 0, neutral: 0, total: 0, questionCount: 0 },
    "Invisible Parental Tasks": { mama: 0, papa: 0, neutral: 0, total: 0, questionCount: 0 }
  };
  
  // Set up default weights for each category
  const categoryWeights = {
    "Visible Household Tasks": 1.0,
    "Invisible Household Tasks": 1.2,
    "Visible Parental Tasks": 1.1,
    "Invisible Parental Tasks": 1.5
  };
  
  // If priorities provided, adjust category weights
  if (priorities) {
    if (priorities.highestPriority && categories[priorities.highestPriority]) {
      categoryWeights[priorities.highestPriority] = 1.5;
    }
    if (priorities.secondaryPriority && categories[priorities.secondaryPriority]) {
      categoryWeights[priorities.secondaryPriority] = 1.3;
    }
    if (priorities.tertiaryPriority && categories[priorities.tertiaryPriority]) {
      categoryWeights[priorities.tertiaryPriority] = 1.1;
    }
  }
  
  // Track all questions that could have been asked vs. ones actually asked
  const possibleQuestionsByCategory = {};
  for (const category in categories) {
    possibleQuestionsByCategory[category] = fullQuestionSet.filter(q => q.category === category).length;
  }
  
  // Process all responses
  Object.entries(responses).forEach(([key, value]) => {
    // Skip non-relevant responses
    if (!value || (value !== 'Mama' && value !== 'Papa' && value !== 'Neutral' && 
                   value !== 'Both' && value !== 'Neither')) {
      return;
    }
    
    // Extract the question ID
    let questionId = key;
    // Handle prefixed question IDs like "week-1-user-123-q45"
    if (key.includes('-q')) {
      questionId = 'q' + key.split('-q')[1];
    } else if (key.includes('-')) {
      // Try to extract just the question part
      const parts = key.split('-');
      questionId = parts[parts.length - 1];
    }
    
    // Find the question in the full set
    const question = fullQuestionSet.find(q => q.id === questionId);
    
    if (question && question.category && categories[question.category]) {
      const category = question.category;
      const weight = parseFloat(question.totalWeight || 1);
      
      // Track that we've seen a question from this category
      categories[category].questionCount++;
      
      // Add weighted score based on response
      if (value === 'Mama') {
        categories[category].mama += weight;
        categories[category].total += weight;
      } else if (value === 'Papa') {
        categories[category].papa += weight;
        categories[category].total += weight;
      } else if (value === 'Both' || value === 'Neutral' || value === 'Neither') {
        // For neutral responses, split the weight evenly
        categories[category].mama += weight / 2;
        categories[category].papa += weight / 2;
        categories[category].neutral += weight;
        categories[category].total += weight;
      }
    }
  });
  
  // Calculate percentages for each category, normalizing for question count
  const categoryBalance = {};
  
  for (const [category, data] of Object.entries(categories)) {
    // Only include categories with responses
    if (data.total > 0) {
      const mamaPercent = (data.mama / data.total) * 100;
      const papaPercent = (data.papa / data.total) * 100;
      const neutralPercent = (data.neutral / data.total) * 100;
      
      // Calculate normalized imbalance - adjust for question distribution
      const questionCoverage = data.questionCount / possibleQuestionsByCategory[category];
      const normalizedImbalance = Math.abs(mamaPercent - papaPercent) * 
                                 (questionCoverage >= 0.5 ? 1 : 0.5 + questionCoverage);
      
      categoryBalance[category] = {
        mama: mamaPercent,
        papa: papaPercent,
        neutral: neutralPercent,
        imbalance: normalizedImbalance,
        questionCount: data.questionCount,
        possibleQuestions: possibleQuestionsByCategory[category],
        coverage: questionCoverage
      };
    }
  }
  
  // Calculate overall weighted balance across all categories
  let totalWeight = 0;
  let weightedMama = 0;
  let weightedPapa = 0;
  let weightedNeutral = 0;
  
  for (const [category, data] of Object.entries(categoryBalance)) {
    const catWeight = categoryWeights[category] || 1;
    const questionWeight = data.questionCount;
    const combinedWeight = catWeight * questionWeight;
    
    weightedMama += data.mama * combinedWeight;
    weightedPapa += data.papa * combinedWeight;
    weightedNeutral += data.neutral * combinedWeight;
    totalWeight += combinedWeight;
  }
  
  const overallBalance = totalWeight > 0 ? {
    mama: weightedMama / totalWeight,
    papa: weightedPapa / totalWeight,
    neutral: weightedNeutral / totalWeight,
    imbalance: Math.abs((weightedMama - weightedPapa) / totalWeight)
  } : { mama: 50, papa: 50, neutral: 0, imbalance: 0 };
  
  return {
    categoryBalance,
    overallBalance
  };
};