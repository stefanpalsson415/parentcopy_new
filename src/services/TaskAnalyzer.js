// src/services/TaskAnalyzer.js
import { calculateTaskWeight } from '../utils/TaskWeightCalculator';

class TaskAnalyzer {
  /**
   * Analyzes task patterns for a family over time
   * @param {Array} tasks - Historical tasks
   * @param {Object} surveyResponses - Survey responses
   * @param {Object} familyPriorities - Family priorities
   * @returns {Object} Analysis results
   */
  analyzeTaskPatterns(tasks, surveyResponses, familyPriorities) {
    if (!tasks || tasks.length === 0) {
      return { patterns: [], insights: [] };
    }

    // Calculate completion rates by task type
    const completionRates = this.calculateCompletionRates(tasks);
    
    // Calculate balance impact by task type
    const balanceImpact = this.calculateBalanceImpact(tasks, surveyResponses);
    
    // Identify high-impact task categories
    const highImpactCategories = this.identifyHighImpactCategories(tasks, surveyResponses, familyPriorities);
    
    // Identify task assignment patterns
    const assignmentPatterns = this.analyzeAssignmentPatterns(tasks);
    
    // Generate insights based on patterns
    const insights = this.generateInsights(
      completionRates, 
      balanceImpact, 
      highImpactCategories,
      assignmentPatterns
    );
    
    return {
      completionRates,
      balanceImpact,
      highImpactCategories,
      assignmentPatterns,
      insights
    };
  }

  /**
   * Calculate completion rates by task type
   * @param {Array} tasks - Historical tasks
   * @returns {Object} Completion rates by category
   */
  calculateCompletionRates(tasks) {
    const categories = {};
    
    // Group tasks by category
    tasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      
      if (!categories[category]) {
        categories[category] = {
          total: 0,
          completed: 0,
          completion_rate: 0
        };
      }
      
      categories[category].total += 1;
      if (task.completed) {
        categories[category].completed += 1;
      }
    });
    
    // Calculate completion rates
    Object.keys(categories).forEach(category => {
      const { total, completed } = categories[category];
      categories[category].completion_rate = total > 0 ? (completed / total) * 100 : 0;
    });
    
    return categories;
  }

  /**
   * Calculate balance impact of tasks
   * @param {Array} tasks - Historical tasks
   * @param {Object} surveyResponses - Survey responses
   * @returns {Object} Balance impact by category
   */
  calculateBalanceImpact(tasks, surveyResponses) {
    // Calculate before/after balance for each task type
    const categories = {};
    const assignedTasks = tasks.filter(task => task.assignedTo);
    
    assignedTasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      
      if (!categories[category]) {
        categories[category] = {
          mamaCount: 0,
          papaCount: 0,
          mamaCompletedCount: 0,
          papaCompletedCount: 0,
          balance_impact: 0
        };
      }
      
      // Count assignments by role
      if (task.assignedTo === 'Mama') {
        categories[category].mamaCount += 1;
        if (task.completed) {
          categories[category].mamaCompletedCount += 1;
        }
      } else if (task.assignedTo === 'Papa') {
        categories[category].papaCount += 1;
        if (task.completed) {
          categories[category].papaCompletedCount += 1;
        }
      }
    });
    
    // Calculate balance impact
    Object.keys(categories).forEach(category => {
      const { mamaCount, papaCount, mamaCompletedCount, papaCompletedCount } = categories[category];
      const totalCount = mamaCount + papaCount;
      const totalCompleted = mamaCompletedCount + papaCompletedCount;
      
      if (totalCount > 0) {
        // Compare assignment percentages to completion percentages
        const mamaAssignmentPct = (mamaCount / totalCount) * 100;
        const mamaCompletionPct = totalCompleted > 0 ? (mamaCompletedCount / totalCompleted) * 100 : 0;
        
        // Impact is how much the balance shifted due to task completion
        categories[category].balance_impact = mamaCompletionPct - mamaAssignmentPct;
      }
    });
    
    return categories;
  }

  /**
   * Identify high-impact task categories
   * @param {Array} tasks - Historical tasks
   * @param {Object} surveyResponses - Survey responses
   * @param {Object} familyPriorities - Family priorities
   * @returns {Array} High-impact categories
   */
  identifyHighImpactCategories(tasks, surveyResponses, familyPriorities) {
    // Calculate average weight per category
    const categoryWeights = {};
    
    tasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      
      if (!categoryWeights[category]) {
        categoryWeights[category] = {
          totalWeight: 0,
          count: 0,
          averageWeight: 0
        };
      }
      
      // Calculate task weight if we have enough information
      const weight = task.totalWeight || (task.baseWeight ? 
        calculateTaskWeight(task, familyPriorities) : 3); // Default to middle value
      
      categoryWeights[category].totalWeight += weight;
      categoryWeights[category].count += 1;
    });
    
    // Calculate average weights
    Object.keys(categoryWeights).forEach(category => {
      const { totalWeight, count } = categoryWeights[category];
      categoryWeights[category].averageWeight = count > 0 ? totalWeight / count : 0;
    });
    
    // Sort categories by average weight and return top 3
    return Object.entries(categoryWeights)
      .sort(([, a], [, b]) => b.averageWeight - a.averageWeight)
      .slice(0, 3)
      .map(([category, data]) => ({
        category,
        averageWeight: data.averageWeight,
        impact: data.averageWeight > 9 ? 'high' : data.averageWeight > 6 ? 'medium' : 'low'
      }));
  }

  /**
   * Analyze task assignment patterns
   * @param {Array} tasks - Historical tasks
   * @returns {Object} Assignment patterns
   */
  analyzeAssignmentPatterns(tasks) {
    // Analyze how tasks are distributed by day, category, etc.
    const patterns = {
      dayOfWeek: {},
      repeat: {
        mama: {},
        papa: {}
      },
      consecutive: {
        mama: 0,
        papa: 0
      }
    };
    
    // Count task assignments by day of week
    tasks.forEach(task => {
      if (task.createdAt) {
        const date = new Date(task.createdAt);
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        
        if (!patterns.dayOfWeek[dayOfWeek]) {
          patterns.dayOfWeek[dayOfWeek] = {
            mama: 0,
            papa: 0,
            total: 0
          };
        }
        
        patterns.dayOfWeek[dayOfWeek].total += 1;
        if (task.assignedTo === 'Mama') {
          patterns.dayOfWeek[dayOfWeek].mama += 1;
        } else if (task.assignedTo === 'Papa') {
          patterns.dayOfWeek[dayOfWeek].papa += 1;
        }
      }
      
      // Track repeated task types
      const category = task.category || 'Uncategorized';
      if (task.assignedTo === 'Mama') {
        patterns.repeat.mama[category] = (patterns.repeat.mama[category] || 0) + 1;
      } else if (task.assignedTo === 'Papa') {
        patterns.repeat.papa[category] = (patterns.repeat.papa[category] || 0) + 1;
      }
    });
    
    // Calculate consecutive assignments
    let consecutiveMama = 0;
    let consecutivePapa = 0;
    let lastAssignee = null;
    
    // Sort tasks by creation date
    const sortedTasks = [...tasks].sort((a, b) => {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
    
    sortedTasks.forEach(task => {
      if (task.assignedTo === 'Mama') {
        if (lastAssignee === 'Mama') {
          consecutiveMama += 1;
        } else {
          consecutiveMama = 1;
        }
        lastAssignee = 'Mama';
        patterns.consecutive.mama = Math.max(patterns.consecutive.mama, consecutiveMama);
        consecutivePapa = 0;
      } else if (task.assignedTo === 'Papa') {
        if (lastAssignee === 'Papa') {
          consecutivePapa += 1;
        } else {
          consecutivePapa = 1;
        }
        lastAssignee = 'Papa';
        patterns.consecutive.papa = Math.max(patterns.consecutive.papa, consecutivePapa);
        consecutiveMama = 0;
      }
    });
    
    return patterns;
  }

  /**
   * Generate insights based on analysis
   * @param {Object} completionRates - Completion rates by category
   * @param {Object} balanceImpact - Balance impact by category
   * @param {Array} highImpactCategories - High-impact categories
   * @param {Object} assignmentPatterns - Assignment patterns
   * @returns {Array} Insights
   */
  generateInsights(completionRates, balanceImpact, highImpactCategories, assignmentPatterns) {
    const insights = [];
    
    // Generate insights based on completion rates
    Object.entries(completionRates).forEach(([category, data]) => {
      if (data.completion_rate < 50 && data.total >= 3) {
        insights.push({
          type: 'completion',
          category,
          message: `${category} tasks have a low completion rate (${data.completion_rate.toFixed(1)}%). Consider simplifying these tasks or allowing more time.`,
          severity: 'medium'
        });
      }
    });
    
    // Generate insights based on balance impact
    Object.entries(balanceImpact).forEach(([category, data]) => {
      if (Math.abs(data.balance_impact) > 15) {
        const direction = data.balance_impact > 0 ? 'more' : 'fewer';
        const person = data.balance_impact > 0 ? 'Mama' : 'Papa';
        insights.push({
          type: 'balance',
          category,
          message: `${person} is completing ${direction} ${category} tasks than assigned. Consider adjusting task assignments to better reflect who actually completes them.`,
          severity: 'high'
        });
      }
    });
    
    // Generate insights based on high-impact categories
    highImpactCategories.forEach(({category, impact}) => {
      if (impact === 'high') {
        insights.push({
          type: 'impact',
          category,
          message: `${category} tasks have a high impact on family balance. Pay special attention to how these tasks are distributed.`,
          severity: 'high'
        });
      }
    });
    
    // Generate insights based on assignment patterns
    const mamaMostCommonCategory = Object.entries(assignmentPatterns.repeat.mama)
      .sort(([, a], [, b]) => b - a)[0];
      
    const papaMostCommonCategory = Object.entries(assignmentPatterns.repeat.papa)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mamaMostCommonCategory && mamaMostCommonCategory[1] > 5) {
      insights.push({
        type: 'pattern',
        category: mamaMostCommonCategory[0],
        message: `Mama is frequently assigned ${mamaMostCommonCategory[0]} tasks (${mamaMostCommonCategory[1]} times). Consider alternating who handles these tasks.`,
        severity: 'medium'
      });
    }
    
    if (papaMostCommonCategory && papaMostCommonCategory[1] > 5) {
      insights.push({
        type: 'pattern',
        category: papaMostCommonCategory[0],
        message: `Papa is frequently assigned ${papaMostCommonCategory[0]} tasks (${papaMostCommonCategory[1]} times). Consider alternating who handles these tasks.`,
        severity: 'medium'
      });
    }
    
    if (assignmentPatterns.consecutive.mama > 5) {
      insights.push({
        type: 'pattern',
        category: 'All',
        message: `Mama was assigned ${assignmentPatterns.consecutive.mama} consecutive tasks at one point. Try to alternate task assignments more evenly.`,
        severity: 'high'
      });
    }
    
    if (assignmentPatterns.consecutive.papa > 5) {
      insights.push({
        type: 'pattern',
        category: 'All',
        message: `Papa was assigned ${assignmentPatterns.consecutive.papa} consecutive tasks at one point. Try to alternate task assignments more evenly.`,
        severity: 'high'
      });
    }
    
    return insights.sort((a, b) => {
      const severityOrder = {high: 0, medium: 1, low: 2};
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generate personalized task suggestions
   * @param {Array} tasks - Historical tasks
   * @param {Object} analysis - Task analysis results
   * @param {Object} familyPriorities - Family priorities
   * @returns {Array} Task suggestions
   */
  generateTaskSuggestions(tasks, analysis, familyPriorities) {
    const suggestions = [];
    
    // Find categories that need balance improvement
    const imbalancedCategories = [];
    
    Object.entries(analysis.balanceImpact).forEach(([category, data]) => {
      // Look for categories with significant imbalance
      if (Math.abs(data.balance_impact) > 10) {
        const imbalancedToward = data.balance_impact > 0 ? 'Mama' : 'Papa';
        imbalancedCategories.push({
          category,
          imbalancedToward,
          impact: Math.abs(data.balance_impact)
        });
      }
    });
    
    // Sort by impact (highest first)
    imbalancedCategories.sort((a, b) => b.impact - a.impact);
    
    // Generate suggestions for the top 3 imbalanced categories
    imbalancedCategories.slice(0, 3).forEach(({category, imbalancedToward}) => {
      // Assign to the person who's doing less
      const assignTo = imbalancedToward === 'Mama' ? 'Papa' : 'Mama';
      
      // Find the most recent task in this category
      const categoryTasks = tasks.filter(task => task.category === category);
      categoryTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      if (categoryTasks.length > 0) {
        const mostRecentTask = categoryTasks[0];
        
        // Suggest a similar task
        suggestions.push({
          title: mostRecentTask.title,
          description: mostRecentTask.description,
          category: mostRecentTask.category,
          assignedTo: assignTo,
          priority: 'high',
          reason: `This will help balance the workload in ${category}, which is currently imbalanced toward ${imbalancedToward}.`
        });
      }
    });
    
    // Add suggestions for low completion rate categories
    Object.entries(analysis.completionRates)
      .filter(([, data]) => data.completion_rate < 50 && data.total >= 3)
      .slice(0, 2)
      .forEach(([category]) => {
        suggestions.push({
          title: `Simplify ${category} Tasks`,
          description: `Break down ${category} tasks into smaller, more manageable subtasks.`,
          category: category,
          assignedTo: null, // This is a meta-task for both parents
          priority: 'medium',
          reason: `Tasks in this category have a low completion rate. Breaking them down may make them more achievable.`
        });
      });
    
    // Add suggestions based on high-impact categories
    analysis.highImpactCategories
      .filter(({impact}) => impact === 'high')
      .slice(0, 2)
      .forEach(({category}) => {
        // Find which parent does more in this high-impact category
        const categoryStats = analysis.balanceImpact[category];
        const assignMoreTo = categoryStats && categoryStats.balance_impact > 0 ? 'Papa' : 'Mama';
        
        suggestions.push({
          title: `Balance ${category}`,
          description: `Focus on more equal sharing of ${category} tasks, which have a high impact on overall balance.`,
          category: category,
          assignedTo: assignMoreTo,
          priority: 'high',
          reason: `This category has a high impact on overall family balance, so improving distribution here will make a big difference.`
        });
      });
    
    return suggestions;
  }
}

export default new TaskAnalyzer();