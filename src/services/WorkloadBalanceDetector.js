// src/services/WorkloadBalanceDetector.js
import { calculateBalanceScores } from '../utils/TaskWeightCalculator';

class WorkloadBalanceDetector {
  /**
   * Detects workload imbalance in a family
   * @param {Array} tasks - Current tasks
   * @param {Object} surveyResponses - Survey responses
   * @param {Object} familyPriorities - Family priorities
   * @param {Array} familyMembers - Family members data
   * @returns {Object} Balance analysis
   */
  detectImbalance(tasks, surveyResponses, familyPriorities, familyMembers) {
    // Start with survey-based balance scores
    const surveyBalanceScores = calculateBalanceScores([], surveyResponses, familyPriorities);
    
    // Calculate task-based balance scores
    const taskBalanceScores = this.calculateTaskBalanceScores(tasks);
    
    // Combine both analyses for a holistic view
    const combinedAnalysis = this.combineBalanceAnalyses(surveyBalanceScores, taskBalanceScores);
    
    // Get time-based analysis
    const timeAnalysis = this.analyzeTimeDistribution(tasks);
    
    // Get invisibility analysis
    const invisibilityAnalysis = this.analyzeInvisibleWork(tasks, surveyResponses);
    
    // Generate alerts for significant imbalances
    const alerts = this.generateBalanceAlerts(combinedAnalysis, timeAnalysis, invisibilityAnalysis);
    
    return {
      surveyBasedBalance: surveyBalanceScores,
      taskBasedBalance: taskBalanceScores,
      combinedAnalysis,
      timeAnalysis,
      invisibilityAnalysis,
      alerts,
      imbalanceScore: this.calculateImbalanceScore(combinedAnalysis)
    };
  }

  /**
   * Calculate balance scores based on task assignments
   * @param {Array} tasks - Current tasks
   * @returns {Object} Task-based balance scores
   */
  calculateTaskBalanceScores(tasks) {
    // Initialize category scores
    const categoryScores = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    let mamaTotal = 0;
    let papaTotal = 0;
    
    // Map task categories to standard categories if needed
    const categoryMapping = {
      "Household Tasks": "Visible Household Tasks",
      "Planning Tasks": "Invisible Household Tasks",
      "Parenting Tasks": "Visible Parental Tasks",
      "Emotional Support": "Invisible Parental Tasks"
    };
    
    // Calculate weights by categories
    tasks.forEach(task => {
      // Skip completed tasks
      if (task.completed) return;
      
      // Determine task weight (use totalWeight if available, or baseWeight, or default)
      const weight = task.totalWeight || task.baseWeight || 3;
      
      // Map category if needed
      let category = task.category;
      if (categoryMapping[category]) {
        category = categoryMapping[category];
      }
      
      // Default to Visible Household Tasks if unknown
      if (!categoryScores[category]) {
        category = "Visible Household Tasks";
      }
      
      categoryScores[category].total += weight;
      
      if (task.assignedTo === 'Mama') {
        categoryScores[category].mama += weight;
        mamaTotal += weight;
      } else if (task.assignedTo === 'Papa') {
        categoryScores[category].papa += weight;
        papaTotal += weight;
      }
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
  }

  /**
   * Combine survey-based and task-based balance analyses
   * @param {Object} surveyBalance - Survey-based balance scores
   * @param {Object} taskBalance - Task-based balance scores
   * @returns {Object} Combined balance analysis
   */
  combineBalanceAnalyses(surveyBalance, taskBalance) {
    const combined = {
      overallBalance: {},
      categoryBalance: {}
    };
    
    // Combine overall balance (70% survey, 30% task)
    const mamaOverall = (
      (surveyBalance.overallBalance?.mama || 50) * 0.7 + 
      (taskBalance.overallBalance?.mama || 50) * 0.3
    );
    
    combined.overallBalance = {
      mama: mamaOverall,
      papa: 100 - mamaOverall
    };
    
    // Combine category balances
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    categories.forEach(category => {
      const surveyMama = surveyBalance.categoryBalance?.[category]?.mama || 50;
      const taskMama = taskBalance.categoryBalance?.[category]?.mama || 50;
      
      // Weight survey data more heavily
      const mamaCombined = surveyMama * 0.7 + taskMama * 0.3;
      
      combined.categoryBalance[category] = {
        mama: mamaCombined,
        papa: 100 - mamaCombined,
        imbalance: Math.abs(mamaCombined - (100 - mamaCombined))
      };
    });
    
    return combined;
  }

  /**
   * Analyze time distribution of tasks
   * @param {Array} tasks - Current tasks
   * @returns {Object} Time distribution analysis
   */
  analyzeTimeDistribution(tasks) {
    const timeDistribution = {
      morning: { mama: 0, papa: 0, total: 0 },
      afternoon: { mama: 0, papa: 0, total: 0 },
      evening: { mama: 0, papa: 0, total: 0 },
      weekend: { mama: 0, papa: 0, total: 0 }
    };
    
    // Estimate time distribution based on task creation and due dates
    tasks.forEach(task => {
      // Skip completed tasks
      if (task.completed) return;
      
      // Determine weight
      const weight = task.totalWeight || task.baseWeight || 3;
      
      // Check for time indicators in title or description
      const taskText = `${task.title} ${task.description}`.toLowerCase();
      
      let timeAssigned = false;
      
      // Morning tasks
      if (taskText.includes('morning') || 
          taskText.includes('breakfast') || 
          taskText.includes('wake') || 
          taskText.includes('school prep')) {
        timeDistribution.morning.total += weight;
        timeAssigned = true;
        
        if (task.assignedTo === 'Mama') {
          timeDistribution.morning.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          timeDistribution.morning.papa += weight;
        }
      }
      
      // Afternoon tasks
      if (taskText.includes('afternoon') || 
          taskText.includes('lunch') || 
          taskText.includes('school pickup')) {
        timeDistribution.afternoon.total += weight;
        timeAssigned = true;
        
        if (task.assignedTo === 'Mama') {
          timeDistribution.afternoon.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          timeDistribution.afternoon.papa += weight;
        }
      }
      
      // Evening tasks
      if (taskText.includes('evening') || 
          taskText.includes('dinner') || 
          taskText.includes('bedtime') || 
          taskText.includes('night')) {
        timeDistribution.evening.total += weight;
        timeAssigned = true;
        
        if (task.assignedTo === 'Mama') {
          timeDistribution.evening.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          timeDistribution.evening.papa += weight;
        }
      }
      
      // Weekend tasks
      if (taskText.includes('weekend') || 
          taskText.includes('saturday') || 
          taskText.includes('sunday')) {
        timeDistribution.weekend.total += weight;
        timeAssigned = true;
        
        if (task.assignedTo === 'Mama') {
          timeDistribution.weekend.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          timeDistribution.weekend.papa += weight;
        }
      }
      
      // If no specific time indicators, check due date
      if (!timeAssigned && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const dayOfWeek = dueDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Weekend task
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          timeDistribution.weekend.total += weight;
          
          if (task.assignedTo === 'Mama') {
            timeDistribution.weekend.mama += weight;
          } else if (task.assignedTo === 'Papa') {
            timeDistribution.weekend.papa += weight;
          }
        }
      }
    });
    
    // Calculate percentages for each time slot
    Object.keys(timeDistribution).forEach(timeSlot => {
      const { mama, papa, total } = timeDistribution[timeSlot];
      if (total > 0) {
        timeDistribution[timeSlot].mamaPercent = (mama / total) * 100;
        timeDistribution[timeSlot].papaPercent = (papa / total) * 100;
        timeDistribution[timeSlot].imbalance = Math.abs(mama - papa) / total * 100;
      } else {
        timeDistribution[timeSlot].mamaPercent = 50;
        timeDistribution[timeSlot].papaPercent = 50;
        timeDistribution[timeSlot].imbalance = 0;
      }
    });
    
    return timeDistribution;
  }

  /**
   * Analyze invisible work distribution
   * @param {Array} tasks - Current tasks
   * @param {Object} surveyResponses - Survey responses
   * @returns {Object} Invisible work analysis
   */
  analyzeInvisibleWork(tasks, surveyResponses) {
    // Categories of invisible work
    const invisibleCategories = {
      "mental_load": { mama: 0, papa: 0, total: 0 },
      "emotional_labor": { mama: 0, papa: 0, total: 0 },
      "planning": { mama: 0, papa: 0, total: 0 },
      "household_management": { mama: 0, papa: 0, total: 0 }
    };
    
    // Analyze tasks for invisible work markers
    tasks.forEach(task => {
      // Skip completed tasks
      if (task.completed) return;
      
      const taskText = `${task.title} ${task.description}`.toLowerCase();
      const weight = task.totalWeight || task.baseWeight || 3;
      
      // Mental load
      if (taskText.includes('remember') || 
          taskText.includes('track') || 
          taskText.includes('monitor') || 
          taskText.includes('manage')) {
        invisibleCategories.mental_load.total += weight;
        
        if (task.assignedTo === 'Mama') {
          invisibleCategories.mental_load.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          invisibleCategories.mental_load.papa += weight;
        }
      }
      
      // Emotional labor
      if (taskText.includes('support') || 
          taskText.includes('comfort') || 
          taskText.includes('listen') || 
          taskText.includes('talk') || 
          taskText.includes('discuss feelings')) {
        invisibleCategories.emotional_labor.total += weight;
        
        if (task.assignedTo === 'Mama') {
          invisibleCategories.emotional_labor.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          invisibleCategories.emotional_labor.papa += weight;
        }
      }
      
      // Planning
      if (taskText.includes('plan') || 
          taskText.includes('schedule') || 
          taskText.includes('organize') || 
          taskText.includes('arrange')) {
        invisibleCategories.planning.total += weight;
        
        if (task.assignedTo === 'Mama') {
          invisibleCategories.planning.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          invisibleCategories.planning.papa += weight;
        }
      }
      
      // Household management
      if (taskText.includes('manage') || 
          taskText.includes('coordinate') || 
          taskText.includes('handle') || 
          taskText.includes('oversee')) {
        invisibleCategories.household_management.total += weight;
        
        if (task.assignedTo === 'Mama') {
          invisibleCategories.household_management.mama += weight;
        } else if (task.assignedTo === 'Papa') {
          invisibleCategories.household_management.papa += weight;
        }
      }
    });
    
    // Calculate percentages for each invisible work category
    Object.keys(invisibleCategories).forEach(category => {
      const { mama, papa, total } = invisibleCategories[category];
      if (total > 0) {
        invisibleCategories[category].mamaPercent = (mama / total) * 100;
        invisibleCategories[category].papaPercent = (papa / total) * 100;
        invisibleCategories[category].imbalance = Math.abs(mama - papa) / total * 100;
      } else {
        invisibleCategories[category].mamaPercent = 50;
        invisibleCategories[category].papaPercent = 50;
        invisibleCategories[category].imbalance = 0;
      }
    });
    
    // Add survey-based invisible work analysis
    const surveyInvisibleWork = this.extractInvisibleWorkFromSurvey(surveyResponses);
    
    return {
      taskBased: invisibleCategories,
      surveyBased: surveyInvisibleWork,
      // Combined score (70% survey, 30% task-based)
      overallInvisibleImbalance: (
        this.calculateAverageImbalance(surveyInvisibleWork) * 0.7 +
        this.calculateAverageImbalance(invisibleCategories) * 0.3
      )
    };
  }

  /**
   * Extract invisible work data from survey responses
   * @param {Object} surveyResponses - Survey responses
   * @returns {Object} Survey-based invisible work analysis
   */
  extractInvisibleWorkFromSurvey(surveyResponses) {
    const invisibleWork = {
      "mental_load": { mama: 0, papa: 0, total: 0 },
      "emotional_labor": { mama: 0, papa: 0, total: 0 },
      "planning": { mama: 0, papa: 0, total: 0 },
      "household_management": { mama: 0, papa: 0, total: 0 }
    };
    
    // Keywords to categorize survey questions
    const keywords = {
      "mental_load": ['remember', 'track', 'monitor', 'keep track', 'forget'],
      "emotional_labor": ['emotional', 'support', 'comfort', 'feelings', 'talk'],
      "planning": ['plan', 'schedule', 'organize', 'prepare', 'arrange'],
      "household_management": ['manage', 'coordinate', 'handle', 'oversee', 'decide']
    };
    
    // Analyze survey responses
    Object.entries(surveyResponses).forEach(([questionId, response]) => {
      // Skip non-mama/papa responses
      if (response !== 'Mama' && response !== 'Papa') return;
      
      // Find the question text if available
      const questionText = questionId.toLowerCase();
      
      // Check for each invisible work category
      Object.entries(keywords).forEach(([category, terms]) => {
        const matches = terms.some(term => questionText.includes(term));
        if (matches) {
          invisibleWork[category].total += 1;
          
          if (response === 'Mama') {
            invisibleWork[category].mama += 1;
          } else if (response === 'Papa') {
            invisibleWork[category].papa += 1;
          }
        }
      });
    });
    
    // Calculate percentages for each invisible work category
    Object.keys(invisibleWork).forEach(category => {
      const { mama, papa, total } = invisibleWork[category];
      if (total > 0) {
        invisibleWork[category].mamaPercent = (mama / total) * 100;
        invisibleWork[category].papaPercent = (papa / total) * 100;
        invisibleWork[category].imbalance = Math.abs(mama - papa) / total * 100;
      } else {
        invisibleWork[category].mamaPercent = 50;
        invisibleWork[category].papaPercent = 50;
        invisibleWork[category].imbalance = 0;
      }
    });
    
    return invisibleWork;
  }

  /**
   * Calculate average imbalance across categories
   * @param {Object} categorizedData - Data categorized by type
   * @returns {number} Average imbalance
   */
  calculateAverageImbalance(categorizedData) {
    let totalImbalance = 0;
    let categoryCount = 0;
    
    Object.values(categorizedData).forEach(category => {
      if (category.total > 0) {
        totalImbalance += category.imbalance || Math.abs(category.mamaPercent - category.papaPercent);
        categoryCount++;
      }
    });
    
    return categoryCount > 0 ? totalImbalance / categoryCount : 0;
  }

  /**
   * Calculate overall imbalance score
   * @param {Object} combinedAnalysis - Combined balance analysis
   * @returns {number} Imbalance score (0-100)
   */
  calculateImbalanceScore(combinedAnalysis) {
    // Start with overall imbalance
    const overallImbalance = Math.abs(
      combinedAnalysis.overallBalance.mama - combinedAnalysis.overallBalance.papa
    );
    
    // Add category imbalances (weighted less)
    let categoryImbalanceSum = 0;
    let categoryCount = 0;
    
    Object.values(combinedAnalysis.categoryBalance).forEach(category => {
      categoryImbalanceSum += category.imbalance;
      categoryCount++;
    });
    
    const avgCategoryImbalance = categoryCount > 0 ? categoryImbalanceSum / categoryCount : 0;
    
    // Combine overall (70%) and category-specific (30%) imbalances
    const combinedImbalance = (overallImbalance * 0.7) + (avgCategoryImbalance * 0.3);
    
    // Scale to 0-100, where 0 is perfect balance and 100 is complete imbalance
    return Math.min(100, combinedImbalance);
  }

  /**
   * Generate alerts for significant imbalances
   * @param {Object} combinedAnalysis - Combined balance analysis
   * @param {Object} timeAnalysis - Time distribution analysis
   * @param {Object} invisibilityAnalysis - Invisible work analysis
   * @returns {Array} Balance alerts
   */
  generateBalanceAlerts(combinedAnalysis, timeAnalysis, invisibilityAnalysis) {
    const alerts = [];
    
    // Check overall balance
    const overallImbalance = Math.abs(
      combinedAnalysis.overallBalance.mama - combinedAnalysis.overallBalance.papa
    );
    
    if (overallImbalance > 30) {
      const imbalancedToward = combinedAnalysis.overallBalance.mama > combinedAnalysis.overallBalance.papa ? 'Mama' : 'Papa';
      alerts.push({
        type: 'critical',
        category: 'Overall Balance',
        message: `There's a significant imbalance in family workload, with ${imbalancedToward} handling ${Math.round(Math.max(combinedAnalysis.overallBalance.mama, combinedAnalysis.overallBalance.papa))}% of tasks.`,
        action: 'Review the task distribution and reassign tasks more evenly.'
      });
    } else if (overallImbalance > 20) {
      const imbalancedToward = combinedAnalysis.overallBalance.mama > combinedAnalysis.overallBalance.papa ? 'Mama' : 'Papa';
      alerts.push({
        type: 'warning',
        category: 'Overall Balance',
        message: `There's a moderate imbalance in family workload, with ${imbalancedToward} handling ${Math.round(Math.max(combinedAnalysis.overallBalance.mama, combinedAnalysis.overallBalance.papa))}% of tasks.`,
        action: 'Look for opportunities to redistribute some tasks more evenly.'
      });
    }
    
    // Check category imbalances
    Object.entries(combinedAnalysis.categoryBalance).forEach(([category, data]) => {
      if (data.imbalance > 40) {
        const imbalancedToward = data.mama > data.papa ? 'Mama' : 'Papa';
        alerts.push({
          type: 'critical',
          category,
          message: `${category} shows a severe imbalance, with ${imbalancedToward} handling ${Math.round(Math.max(data.mama, data.papa))}% of these tasks.`,
          action: `Reassign some ${category} to ${imbalancedToward === 'Mama' ? 'Papa' : 'Mama'}.`
        });
      } else if (data.imbalance > 25) {
        const imbalancedToward = data.mama > data.papa ? 'Mama' : 'Papa';
        alerts.push({
          type: 'warning',
          category,
          message: `${category} shows a notable imbalance, with ${imbalancedToward} handling ${Math.round(Math.max(data.mama, data.papa))}% of these tasks.`,
          action: `Look for opportunities to reassign some ${category} to ${imbalancedToward === 'Mama' ? 'Papa' : 'Mama'}.`
        });
      }
    });
    
    // Check time distribution imbalances
    Object.entries(timeAnalysis).forEach(([timeSlot, data]) => {
      if (data.imbalance > 40) {
        const imbalancedToward = data.mamaPercent > data.papaPercent ? 'Mama' : 'Papa';
        alerts.push({
          type: 'critical',
          category: `${timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1)} Tasks`,
          message: `${timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1)} tasks show a severe time imbalance, with ${imbalancedToward} handling ${Math.round(Math.max(data.mamaPercent, data.papaPercent))}% of tasks during this time.`,
          action: `Reassign some ${timeSlot} tasks to ${imbalancedToward === 'Mama' ? 'Papa' : 'Mama'}.`
        });
      } else if (data.imbalance > 25) {
        const imbalancedToward = data.mamaPercent > data.papaPercent ? 'Mama' : 'Papa';
        alerts.push({
          type: 'warning',
          category: `${timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1)} Tasks`,
          message: `${timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1)} tasks show a notable time imbalance, with ${imbalancedToward} handling ${Math.round(Math.max(data.mamaPercent, data.papaPercent))}% of tasks during this time.`,
          action: `Consider redistributing some ${timeSlot} tasks more evenly.`
        });
      }
    });
    
    // Check invisible work imbalance
    if (invisibilityAnalysis.overallInvisibleImbalance > 35) {
      alerts.push({
        type: 'critical',
        category: 'Invisible Work',
        message: `There's a significant imbalance in invisible work (mental load, planning, emotional labor).`,
        action: 'Focus on explicitly redistributing invisible work, which can be easily overlooked.'
      });
    } else if (invisibilityAnalysis.overallInvisibleImbalance > 20) {
      alerts.push({
        type: 'warning',
        category: 'Invisible Work',
        message: `There's a moderate imbalance in invisible work (mental load, planning, emotional labor).`,
        action: 'Pay attention to invisible work distribution and make adjustments as needed.'
      });
    }
    
    return alerts.sort((a, b) => {
      const typeOrder = { critical: 0, warning: 1 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }
}

export default new WorkloadBalanceDetector();