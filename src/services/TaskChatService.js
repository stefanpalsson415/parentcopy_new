// src/services/TaskChatService.js
import { db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

class TaskChatService {
  /**
   * Process a task creation request from chat
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @param {object} familyContext - Family context info
   * @returns {Promise<object>} Processing result
   */
  async processTaskRequest(message, entities, familyContext) {
    try {
      const { familyId, familyMembers, currentUser } = familyContext;
      
      // Extract task details
      const taskDetails = this.extractTaskDetails(message, entities);
      
      // Generate a unique task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Determine assigned person
      let assignedTo = null;
      let assignedToName = null;
      
      // Check if assignment was specified
      if (taskDetails.assignTo) {
        // Find person by name or role
        const assignToLower = taskDetails.assignTo.toLowerCase();
        
        // Check for role-based assignments
        if (assignToLower === 'mama' || assignToLower === 'mom' || assignToLower === 'mother') {
          assignedTo = 'Mama';
          const mama = familyMembers.find(m => m.roleType === 'Mama');
          assignedToName = mama?.name || 'Mama';
        } else if (assignToLower === 'papa' || assignToLower === 'dad' || assignToLower === 'father') {
          assignedTo = 'Papa';
          const papa = familyMembers.find(m => m.roleType === 'Papa');
          assignedToName = papa?.name || 'Papa';
        } else {
          // Check for name-based assignment
          const matchedMember = familyMembers.find(m => 
            m.name.toLowerCase() === assignToLower
          );
          
          if (matchedMember) {
            assignedTo = matchedMember.roleType || matchedMember.role;
            assignedToName = matchedMember.name;
          }
        }
      }
      
      // Default to the other parent if no assignment or self-assignment
      if (!assignedTo || assignedTo === currentUser?.roleType) {
        const otherParent = familyMembers.find(m => 
          m.role === 'parent' && m.id !== currentUser?.id
        );
        
        if (otherParent) {
          assignedTo = otherParent.roleType || otherParent.role;
          assignedToName = otherParent.name;
        } else {
          // Default to current user if no other parent found
          assignedTo = currentUser?.roleType || 'Parent';
          assignedToName = currentUser?.name || 'Parent';
        }
      }
      
      // Create task object
      const task = {
        id: taskId,
        title: taskDetails.title,
        description: taskDetails.description || '',
        assignedTo,
        assignedToName,
        dueDate: taskDetails.dueDate,
        priority: taskDetails.priority || 'medium',
        category: taskDetails.category || 'other',
        focusArea: taskDetails.category || 'General Tasks',
        isAIGenerated: false,
        completed: false,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name,
        createdAt: new Date().toISOString(),
        comments: []
      };
      
      // Add subtasks if any
      if (taskDetails.subtasks && taskDetails.subtasks.length > 0) {
        task.subTasks = taskDetails.subtasks.map((subtask, index) => ({
          id: `${taskId}-sub${index + 1}`,
          title: subtask,
          completed: false
        }));
      }
      
      // Save task to database
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Family not found");
      }
      
      // Add task to family's tasks array
      await updateDoc(docRef, {
        tasks: arrayUnion(task),
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        taskId,
        task,
        message: `I've added the task "${task.title}" and assigned it to ${assignedToName}.${task.dueDate ? ` It's due on ${new Date(task.dueDate).toLocaleDateString()}.` : ''}`
      };
    } catch (error) {
      console.error("Error processing task request:", error);
      return {
        success: false,
        error: error.message,
        message: "I had trouble adding this task. Please try again."
      };
    }
  }

  /**
   * Extract task details from message
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @returns {object} Task details
   */
  extractTaskDetails(message, entities) {
    const taskDetails = {
      title: null,
      description: null,
      dueDate: null,
      priority: null,
      category: null,
      assignTo: null,
      subtasks: []
    };
    
    // Extract task title
    const titlePatterns = [
      /(?:add|create|make)\s+(?:a|an)?\s*task\s+(?:to|for)?\s*["'](.+?)["']/i, // Quoted title
      /(?:add|create|make)\s+(?:a|an)?\s*task\s+(?:to|for)?\s*(.+?)(?:\s+by|\s+due|\s+for|\s+with|\s+assign|\s+to\s+\w+|\s*$)/i, // Title up to a keyword
      /(?:remind\s+(?:me|us)\s+to|need\s+to|have\s+to)\s+(.+?)(?:\s+by|\s+due|\s+on|\s+for|\s+assign|\s*$)/i // Extract from "remind me to" pattern
    ];
    
    for (const pattern of titlePatterns) {
      const match = message.match(pattern);
      if (match && match[1].trim()) {
        taskDetails.title = match[1].trim();
        break;
      }
    }
    
    // Default title if none found
    if (!taskDetails.title) {
      taskDetails.title = "New Task";
    }
    
    // Extract due date
    if (entities.date && entities.date.length > 0) {
      // Convert to standardized date
      const dateStr = entities.date[0];
      
      if (dateStr.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        taskDetails.dueDate = tomorrow.toISOString().split('T')[0];
      } else if (dateStr.toLowerCase() === 'today') {
        taskDetails.dueDate = new Date().toISOString().split('T')[0];
      } else {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            taskDetails.dueDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Couldn't parse date
        }
      }
    }
    
    // Extract priority
    const priorityMatch = message.match(/\b(high|medium|low)\s+priority\b/i);
    if (priorityMatch) {
      taskDetails.priority = priorityMatch[1].toLowerCase();
    }
    
    // Extract category
    const categoryPatterns = [
      { pattern: /\b(household|cleaning|cooking|food|grocery|shopping|home)\b/i, category: 'Household Tasks' },
      { pattern: /\b(parenting|child|children|kid|kids|school)\b/i, category: 'Parenting Tasks' },
      { pattern: /\b(planning|organize|organizing|arrangement|schedule)\b/i, category: 'Planning Tasks' },
      { pattern: /\b(errand|purchase|buy|order|pickup|delivery)\b/i, category: 'Errands' },
      { pattern: /\b(repair|fix|maintenance|broken)\b/i, category: 'Maintenance' },
      { pattern: /\b(appointment|meeting|reservation)\b/i, category: 'Appointments' }
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(message)) {
        taskDetails.category = category;
        break;
      }
    }
    
    // Extract assignment
    const assignmentPatterns = [
      /(?:assign|give)\s+(?:to|it\s+to)\s+([A-Za-z]+)/i,
      /for\s+([A-Za-z]+)\s+to\s+(?:do|complete|handle)/i,
      /([A-Za-z]+)(?:'s|\s+should)\s+(?:task|do|handle|take care of)/i
    ];
    
    for (const pattern of assignmentPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        taskDetails.assignTo = match[1].trim();
        break;
      }
    }
    
    // Extract description
    const descriptionPatterns = [
      /(?:description|details)\s*(?::|is|are)\s*["'](.+?)["']/i,
      /(?:description|details)\s*(?::|is|are)\s*(.+?)(?:\s+by|\s+due|\s+for|\s+assign|\s*$)/i
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = message.match(pattern);
      if (match && match[1].trim()) {
        taskDetails.description = match[1].trim();
        break;
      }
    }
    
    // Try to extract subtasks from lists in the message
    const splitByBullet = message.split(/[•\-\*\u2022\u2023\u25E6\u2043\+]/);
    if (splitByBullet.length > 2) {
      // Likely a bulleted list - first item might be the main instruction
      for (let i = 1; i < splitByBullet.length; i++) {
        const subtask = splitByBullet[i].trim();
        if (subtask && !subtask.startsWith('assign') && !subtask.startsWith('due') && !subtask.startsWith('by')) {
          taskDetails.subtasks.push(subtask);
        }
      }
    }
    
    // Check for numbered list format
    const numberedListPattern = /\d+\.\s+(.+?)(?:\s*\d+\.\s+|$)/g;
    let match;
    while ((match = numberedListPattern.exec(message)) !== null) {
      if (match[1].trim()) {
        taskDetails.subtasks.push(match[1].trim());
      }
    }
    
    return taskDetails;
  }

  /**
   * Handle completing a task from chat
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Processing result
   */
  async processTaskCompletion(message, familyId) {
    try {
      // Try to identify which task to complete
      const taskNameMatch = message.match(/(?:completed|finished|done with|mark complete)\s+(?:the\s+)?(?:task|to-?do)?\s*["'](.+?)["']/i);
      
      if (!taskNameMatch || !taskNameMatch[1]) {
        return {
          success: false,
          step: 'identification',
          message: "I'm not sure which task you've completed. Can you specify the task name?"
        };
      }
      
      const taskTitle = taskNameMatch[1].trim();
      
      // Get family document to find task
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Family not found");
      }
      
      const familyData = docSnap.data();
      const tasks = familyData.tasks || [];
      
      // Find task by title (check for partial matches too)
      let matchedTask = null;
      let matchScore = 0;
      
      for (const task of tasks) {
        if (task.title.toLowerCase() === taskTitle.toLowerCase()) {
          // Exact match
          matchedTask = task;
          break;
        } else if (task.title.toLowerCase().includes(taskTitle.toLowerCase())) {
          // Partial match - check if this is a better match than previous
          const score = taskTitle.length / task.title.length;
          if (score > matchScore) {
            matchScore = score;
            matchedTask = task;
          }
        }
      }
      
      if (!matchedTask) {
        return {
          success: false,
          step: 'not-found',
          message: `I couldn't find a task matching "${taskTitle}". Can you try with the exact task name?`
        };
      }
      
      // Check if task is already completed
      if (matchedTask.completed) {
        return {
          success: false,
          step: 'already-completed',
          task: matchedTask,
          message: `The task "${matchedTask.title}" is already marked as completed.`
        };
      }
      
      // Update task to mark as completed
      const updatedTasks = tasks.map(task => {
        if (task.id === matchedTask.id) {
          return {
            ...task,
            completed: true,
            completedDate: new Date().toISOString()
          };
        }
        return task;
      });
      
      // Save updated tasks array
      await updateDoc(docRef, {
        tasks: updatedTasks,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        taskId: matchedTask.id,
        task: matchedTask,
        message: `Great! I've marked the task "${matchedTask.title}" as completed.`
      };
    } catch (error) {
      console.error("Error processing task completion:", error);
      return {
        success: false,
        error: error.message,
        message: "I encountered an issue updating this task. Please try again."
      };
    }
  }

  /**
   * Find pending tasks for a family
   * @param {string} familyId - Family ID
   * @param {string} userId - Optional user ID to filter their tasks
   * @returns {Promise<Array>} Pending tasks
   */
  async findPendingTasks(familyId, userId = null) {
    try {
      // Get family document
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Family not found");
      }
      
      const familyData = docSnap.data();
      const allTasks = familyData.tasks || [];
      
      // Filter pending tasks
      const pendingTasks = allTasks.filter(task => !task.completed);
      
      // Filter by userId if specified
      if (userId) {
        const userMember = familyData.familyMembers.find(m => m.id === userId);
        if (userMember) {
          const userRole = userMember.roleType || userMember.role;
          return pendingTasks.filter(task => task.assignedTo === userRole);
        }
      }
      
      // Sort by due date (earliest first)
      pendingTasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      return pendingTasks;
    } catch (error) {
      console.error("Error finding pending tasks:", error);
      return [];
    }
  }
}

export default new TaskChatService();