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
export const calculateBalanceScores = (questions, responses, familyPriorities) => {
  let mamaTotal = 0;
  let papaTotal = 0;
    
  // Category totals
  const categoryScores = {
    "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
    "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
    "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
    "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
  };
    
  // Calculate weighted scores for each response
  Object.entries(responses).forEach(([questionId, response]) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
      
    const weight = calculateTaskWeight(question, familyPriorities);
      
    if (response === 'Mama') {
      mamaTotal += weight;
      categoryScores[question.category].mama += weight;
    } else if (response === 'Papa') {
      papaTotal += weight;
      categoryScores[question.category].papa += weight;
    }
      
    categoryScores[question.category].total += weight;
  });
    
  // Calculate percentages
  const totalWeight = mamaTotal + papaTotal;
  const result = {
    overallBalance: {
      mama: totalWeight ? (mamaTotal / totalWeight) * 100 : 50,
      papa: totalWeight ? (papaTotal / totalWeight) * 100 : 50
    },
    categoryBalance: {}
  };
    
  // Calculate category percentages
  Object.entries(categoryScores).forEach(([category, scores]) => {
    result.categoryBalance[category] = {
      mama: scores.total ? (scores.mama / scores.total) * 100 : 50,
      papa: scores.total ? (scores.papa / scores.total) * 100 : 50,
      imbalance: scores.total ? Math.abs(scores.mama - scores.papa) / scores.total * 100 : 0
    };
  });
    
  return result;
};