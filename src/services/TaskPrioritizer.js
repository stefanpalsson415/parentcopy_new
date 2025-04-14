// src/services/TaskPrioritizer.js
class TaskPrioritizer {
    /**
     * Calculates priority scores for tasks
     * @param {Array} tasks - Array of tasks to prioritize
     * @param {Object} balanceAnalysis - Current balance analysis
     * @param {Object} familyPriorities - Family priorities
     * @returns {Array} Prioritized tasks with priority scores
     */
    prioritizeTasks(tasks, balanceAnalysis, familyPriorities) {
      if (!tasks || tasks.length === 0) {
        return [];
      }
      
      // Calculate priority score for each task
      const prioritizedTasks = tasks.map(task => {
        // Skip completed tasks
        if (task.completed) {
          return {
            ...task,
            priorityScore: 0,
            priorityLevel: 'completed',
            priorityReason: 'Task is already completed'
          };
        }
        
        // Calculate base priority score
        const priorityScore = this.calculatePriorityScore(task, balanceAnalysis, familyPriorities);
        
        // Determine priority level
        let priorityLevel, priorityReason;
        if (priorityScore >= 85) {
          priorityLevel = 'critical';
          priorityReason = 'This task is time-sensitive and has high impact on family balance';
        } else if (priorityScore >= 70) {
          priorityLevel = 'high';
          priorityReason = 'This task is important for family balance and should be addressed soon';
        } else if (priorityScore >= 50) {
          priorityLevel = 'medium';
          priorityReason = 'This task has moderate importance for family balance';
        } else {
          priorityLevel = 'low';
          priorityReason = 'This task can be addressed when time permits';
        }
        
        return {
          ...task,
          priorityScore,
          priorityLevel,
          priorityReason
        };
      });
      
      // Sort by priority score (highest first)
      return prioritizedTasks.sort((a, b) => b.priorityScore - a.priorityScore);
    }
  
    /**
     * Calculate priority score for a task
     * @param {Object} task - Task to calculate priority for
     * @param {Object} balanceAnalysis - Current balance analysis
     * @param {Object} familyPriorities - Family priorities
     * @returns {number} Priority score (0-100)
     */
    calculatePriorityScore(task, balanceAnalysis, familyPriorities) {
      // Initialize base score
      let score = 50;
      
      // Factor 1: Due date
      score += this.calculateDueDateScore(task);
      
      // Factor 2: Balance impact
      score += this.calculateBalanceImpactScore(task, balanceAnalysis);
      
      // Factor 3: Family priorities
      score += this.calculatePriorityAlignmentScore(task, familyPriorities);
      
      // Factor 4: Task complexity
      score += this.calculateComplexityScore(task);
      
      // Factor 5: Explicit priority setting
      score += this.calculateExplicitPriorityScore(task);
      
      // Cap score at 0-100
      return Math.max(0, Math.min(100, score));
    }
  
    /**
     * Calculate priority score component based on due date
     * @param {Object} task - Task to analyze
     * @returns {number} Score component (-20 to +40)
     */
    calculateDueDateScore(task) {
      if (!task.dueDate) {
        return 0; // No due date, no impact on score
      }
      
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      
      // Calculate days until due
      const differenceInTime = dueDate.getTime() - now.getTime();
      const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
      
      // Past due tasks get maximum urgency
      if (differenceInDays < 0) {
        return 40;
      }
      
      // Due today
      if (differenceInDays === 0) {
        return 35;
      }
      
      // Due tomorrow
      if (differenceInDays === 1) {
        return 30;
      }
      
      // Due this week (2-7 days)
      if (differenceInDays <= 7) {
        return 25 - (differenceInDays * 2);
      }
      
      // Due next week (8-14 days)
      if (differenceInDays <= 14) {
        return 12 - (differenceInDays - 7);
      }
      
      // Due in more than 2 weeks
      return -10;
    }
  
    /**
     * Calculate priority score component based on balance impact
     * @param {Object} task - Task to analyze
     * @param {Object} balanceAnalysis - Current balance analysis
     * @returns {number} Score component (-10 to +30)
     */
    calculateBalanceImpactScore(task, balanceAnalysis) {
      if (!balanceAnalysis || !task.category) {
        return 0;
      }
      
      // Map task category to standard categories if needed
      const categoryMapping = {
        "Household Tasks": "Visible Household Tasks",
        "Planning Tasks": "Invisible Household Tasks",
        "Parenting Tasks": "Visible Parental Tasks",
        "Emotional Support": "Invisible Parental Tasks"
      };
      
      let category = task.category;
      if (categoryMapping[category]) {
        category = categoryMapping[category];
      }
      
      // Check if this category has a significant imbalance
      const categoryData = balanceAnalysis.combinedAnalysis?.categoryBalance?.[category];
      if (!categoryData) {
        return 0;
      }
      
      // Check if task assignment helps balance (is assigned to underutilized parent)
      const imbalancedToward = categoryData.mama > categoryData.papa ? 'Mama' : 'Papa';
      const assignedTo = task.assignedTo;
      
      // Task helps balance if it's assigned to the parent doing less in this category
      const helpsBalance = (imbalancedToward === 'Mama' && assignedTo === 'Papa') ||
                          (imbalancedToward === 'Papa' && assignedTo === 'Mama');
      
      // Score based on imbalance severity and whether task helps balance
      if (helpsBalance) {
        // Task helps balance - higher score for more imbalanced categories
        if (categoryData.imbalance > 40) {
          return 30; // Critical imbalance
        } else if (categoryData.imbalance > 25) {
          return 20; // Significant imbalance
        } else if (categoryData.imbalance > 10) {
          return 10; // Moderate imbalance
        }
        return 5; // Slight imbalance
      } else {
        // Task doesn't help balance (or may worsen it)
        if (categoryData.imbalance > 40) {
          return -10; // Critical imbalance that task may worsen
        } else if (categoryData.imbalance > 25) {
          return -5; // Significant imbalance that task may worsen
        }
        return 0; // Neutral effect on balance
      }
    }
  
    /**
     * Calculate priority score component based on family priorities
     * @param {Object} task - Task to analyze
     * @param {Object} familyPriorities - Family priorities
     * @returns {number} Score component (0 to +20)
     */
    calculatePriorityAlignmentScore(task, familyPriorities) {
      if (!familyPriorities || !task.category) {
        return 0;
      }
      
      // Map task category to standard categories if needed
      const categoryMapping = {
        "Household Tasks": "Visible Household Tasks",
        "Planning Tasks": "Invisible Household Tasks",
        "Parenting Tasks": "Visible Parental Tasks",
        "Emotional Support": "Invisible Parental Tasks"
      };
      
      let category = task.category;
      if (categoryMapping[category]) {
        category = categoryMapping[category];
      }
      
      // Check if this category is a family priority
      if (familyPriorities.highestPriority === category) {
        return 20; // Highest priority
      } else if (familyPriorities.secondaryPriority === category) {
        return 15; // Secondary priority
      } else if (familyPriorities.tertiaryPriority === category) {
        return 10; // Tertiary priority
      }
      
      return 0; // Not a priority
    }
  
    /**
     * Calculate priority score component based on task complexity
     * @param {Object} task - Task to analyze
     * @returns {number} Score component (-10 to +10)
     */
    calculateComplexityScore(task) {
      // Check for subtasks
      const subtaskCount = task.subTasks?.length || 0;
      
      // Check description length
      const descriptionLength = task.description?.length || 0;
      
      // Calculate complexity score
      let complexityScore = 0;
      
      // Subtask-based complexity
      if (subtaskCount > 5) {
        complexityScore += 10; // Very complex
      } else if (subtaskCount > 3) {
        complexityScore += 5; // Moderately complex
      } else if (subtaskCount > 0) {
        complexityScore += 2; // Slightly complex
      } else if (descriptionLength > 200) {
        complexityScore += 5; // Long description suggests complexity
      } else if (descriptionLength > 100) {
        complexityScore += 2; // Moderate description length
      } else if (descriptionLength < 20) {
        complexityScore -= 5; // Very short description, likely simple
      }
      
      // Check for complexity indicators in title/description
      const taskText = `${task.title} ${task.description}`.toLowerCase();
      if (taskText.includes('complex') || 
          taskText.includes('difficult') || 
          taskText.includes('challenging') || 
          taskText.includes('time-consuming')) {
        complexityScore += 5;
      }
      
      // Cap complexity score
      return Math.max(-10, Math.min(10, complexityScore));
    }
  
    /**
     * Calculate priority score component based on explicit priority setting
     * @param {Object} task - Task to analyze
     * @returns {number} Score component (0 to +20)
     */
    calculateExplicitPriorityScore(task) {
      // Check if priority was explicitly set
      if (task.priority) {
        switch (task.priority.toLowerCase()) {
          case 'critical':
            return 20;
          case 'high':
            return 15;
          case 'medium':
            return 10;
          case 'low':
            return 5;
          default:
            return 0;
        }
      }
      
      return 0; // No explicit priority
    }
  
    /**
     * Generate daily recommendations for balancing workload
     * @param {Array} prioritizedTasks - Array of prioritized tasks
     * @param {Object} balanceAnalysis - Current balance analysis
     * @returns {Object} Daily task recommendations
     */
    generateDailyRecommendations(prioritizedTasks, balanceAnalysis) {
      // Group tasks by assignee
      const mamasTasks = prioritizedTasks.filter(task => 
        !task.completed && task.assignedTo === 'Mama'
      );
      
      const papasTasks = prioritizedTasks.filter(task => 
        !task.completed && task.assignedTo === 'Papa'
      );
      
      // Determine which parent has more high-priority tasks
      const mamasHighPriorityCount = mamasTasks.filter(t => 
        t.priorityLevel === 'critical' || t.priorityLevel === 'high'
      ).length;
      
      const papasHighPriorityCount = papasTasks.filter(t => 
        t.priorityLevel === 'critical' || t.priorityLevel === 'high'
      ).length;
      
      // Create recommendations
      const recommendations = {
        mama: {
          dailyFocus: this.selectDailyFocus(mamasTasks),
          taskSuggestion: null,
          balanceTip: null
        },
        papa: {
          dailyFocus: this.selectDailyFocus(papasTasks),
          taskSuggestion: null,
          balanceTip: null
        }
      };
      
      // Generate balance tips based on workload analysis
      if (balanceAnalysis) {
        const overallImbalance = Math.abs(
          balanceAnalysis.combinedAnalysis.overallBalance.mama - 
          balanceAnalysis.combinedAnalysis.overallBalance.papa
        );
        
        if (overallImbalance > 15) {
          const overworkedParent = balanceAnalysis.combinedAnalysis.overallBalance.mama > 
                                  balanceAnalysis.combinedAnalysis.overallBalance.papa ? 'Mama' : 'Papa';
          
          const otherParent = overworkedParent === 'Mama' ? 'Papa' : 'Mama';
          
          // Add task suggestion for less burdened parent
          if (overworkedParent === 'Mama') {
            // Find a task that could be reassigned to Papa
            const taskToReassign = mamasTasks.find(t => t.priorityLevel !== 'critical');
            
            if (taskToReassign) {
              recommendations.papa.taskSuggestion = {
                taskId: taskToReassign.id,
                title: taskToReassign.title,
                message: `Consider taking on "${taskToReassign.title}" to better balance workload.`
              };
              
              recommendations.mama.balanceTip = `Workload is currently imbalanced. Consider asking Papa to help with some of your tasks.`;
            }
          } else {
            // Find a task that could be reassigned to Mama
            const taskToReassign = papasTasks.find(t => t.priorityLevel !== 'critical');
            
            if (taskToReassign) {
              recommendations.mama.taskSuggestion = {
                taskId: taskToReassign.id,
                title: taskToReassign.title,
                message: `Consider taking on "${taskToReassign.title}" to better balance workload.`
              };
              
              recommendations.papa.balanceTip = `Workload is currently imbalanced. Consider asking Mama to help with some of your tasks.`;
            }
          }
          
          // General balance tip for both
          if (!recommendations[otherParent.toLowerCase()].balanceTip) {
            recommendations[otherParent.toLowerCase()].balanceTip = 
              `${overworkedParent} is currently handling more tasks. Look for opportunities to take on additional responsibilities.`;
          }
        } else {
          // Workload is relatively balanced
          recommendations.mama.balanceTip = "Workload is currently well balanced. Keep up the good work!";
          recommendations.papa.balanceTip = "Workload is currently well balanced. Keep up the good work!";
        }
      }
      
      return recommendations;
    }
  
    /**
     * Select daily focus tasks for a parent
     * @param {Array} tasks - Tasks assigned to the parent
     * @returns {Array} Tasks to focus on today
     */
    selectDailyFocus(tasks) {
      if (!tasks || tasks.length === 0) {
        return [];
      }
      
      // Start with critical tasks
      const criticalTasks = tasks.filter(t => t.priorityLevel === 'critical');
      
      // Add high priority tasks if we have few critical ones
      const highPriorityTasks = tasks.filter(t => t.priorityLevel === 'high');
      
      // Select up to 3 tasks to focus on
      let focusTasks = [];
      
      // First add all critical tasks (up to 3)
      focusTasks = [...criticalTasks.slice(0, 3)];
      
      // If we have less than 3, add high priority tasks
      if (focusTasks.length < 3) {
        focusTasks = [...focusTasks, ...highPriorityTasks.slice(0, 3 - focusTasks.length)];
      }
      
      // If we still have less than 3, add medium priority tasks
      if (focusTasks.length < 3) {
        const mediumPriorityTasks = tasks.filter(t => t.priorityLevel === 'medium');
        focusTasks = [...focusTasks, ...mediumPriorityTasks.slice(0, 3 - focusTasks.length)];
      }
      
      // Return focus tasks with recommendations
      return focusTasks.map(task => ({
        taskId: task.id,
        title: task.title,
        priorityLevel: task.priorityLevel,
        reason: task.priorityReason,
        subtasks: task.subTasks?.slice(0, 3) || []
      }));
    }
  }
  
  export default new TaskPrioritizer();