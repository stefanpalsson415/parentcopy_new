// src/services/AIQuestionGenerator.js
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import ClaudeService from './ClaudeService';

class AIQuestionGenerator {
  constructor() {
    this.baseQuestionSet = null;
    this.whitepaperContent = knowledgeBase.whitepapers;
  }

  /**
   * Generate an initial diagnostic questionnaire to understand family needs
   * @returns Array of diagnostic questions
   */
  generateDiagnosticQuestions() {
    // Return a small set of high-level questions to understand family needs
    return [
      {
        id: 'diag1',
        text: 'What aspects of family workload create the most tension in your household?',
        type: 'multiselect',
        options: [
          'Household chores (cleaning, cooking, etc.)',
          'Childcare responsibilities',
          'Mental load (planning, organizing, remembering)',
          'Emotional labor (supporting family members emotionally)',
          'Financial management',
          'Scheduling and coordination'
        ],
        category: 'Diagnostic',
        required: true
      },
      {
        id: 'diag2',
        text: 'Which areas would you most like to improve balance in?',
        type: 'ranking',
        options: [
          'Visible Household Tasks (cleaning, cooking, etc.)',
          'Invisible Household Tasks (planning, scheduling, etc.)',
          'Visible Parental Tasks (driving kids, homework help, etc.)',
          'Invisible Parental Tasks (emotional support, anticipating needs, etc.)'
        ],
        category: 'Diagnostic',
        required: true
      },
      {
        id: 'diag3',
        text: 'What are your biggest obstacles to achieving better balance?',
        type: 'multiselect',
        options: [
          'Different standards or expectations',
          'Lack of awareness about what needs to be done',
          'Time constraints due to work/other commitments',
          'Established habits that are hard to change',
          'Communication challenges',
          'Different parenting approaches'
        ],
        category: 'Diagnostic',
        required: true
      },
      {
        id: 'diag4',
        text: 'How would you describe your current communication about household responsibilities?',
        type: 'select',
        options: [
          'Very open and effective',
          'Generally good but with occasional tension',
          'Inconsistent - sometimes good, sometimes difficult',
          'Challenging - often leads to conflict',
          'We avoid discussing it to prevent arguments'
        ],
        category: 'Diagnostic',
        required: true
      },
      {
        id: 'diag5',
        text: 'What would success look like for your family?',
        type: 'multiselect',
        options: [
          'More equitable division of visible tasks',
          'Better recognition of invisible work',
          'Reduced conflict over responsibilities',
          'More quality time together as a family',
          'Improved relationship satisfaction',
          'Less stress and mental burden',
          'Better modeling of equality for children'
        ],
        category: 'Diagnostic',
        required: true
      }
    ];
  }

  /**
   * Generate personalized survey questions based on diagnostic results
   * @param {Object} diagnosticResponses - Responses from diagnostic survey
   * @param {Object} familyData - Basic family structure information
   * @returns Promise resolving to an array of personalized questions
   */
  async generatePersonalizedQuestions(diagnosticResponses, familyData) {
    try {
      // Prepare context from diagnostic responses and family data
      const context = this._prepareContext(diagnosticResponses, familyData);
      
      // Pull relevant content from whitepapers based on priorities
      const relevantResearch = this._getRelevantResearchContent(diagnosticResponses);
      
      // Format system prompt for Claude
      const systemPrompt = `You are an expert in family dynamics and workload balance. 
      Your task is to generate a personalized set of 40-50 survey questions for a family seeking to better balance their responsibilities.
      
      The questions should:
      1. Focus on their specific priorities and pain points
      2. Cover both visible and invisible work
      3. Address the specific family structure
      4. Incorporate research-backed insights
      5. Include a mix of task-specific and meta-level questions about workload distribution
      
      For each question, provide:
      - A unique question ID (q1, q2, etc.)
      - The question text
      - The category (Visible Household Tasks, Invisible Household Tasks, Visible Parental Tasks, Invisible Parental Tasks)
      - A brief explanation of why this question matters for this family
      - A weighting that reflects the question's importance based on this family's priorities
      
      Return the questions as a JSON object with this structure:
      {
        "questions": [
          {
            "id": "q1",
            "text": "Question text here",
            "category": "Category name",
            "explanation": "Why this matters for this family",
            "weightExplanation": "How this impacts workload calculation",
            "baseWeight": 3,
            "frequency": "daily",
            "invisibility": "completely",
            "emotionalLabor": "high",
            "childDevelopment": "high",
            "relationshipImpact": "extreme",
            "totalWeight": 12.5
          }
        ]
      }`;
      
      // User message with the specific context
      const userMessage = `Generate a personalized set of survey questions for this family based on:
      
      Family Structure:
      ${JSON.stringify(familyData, null, 2)}
      
      Their Diagnostic Responses:
      ${JSON.stringify(diagnosticResponses, null, 2)}
      
      Relevant Research:
      ${relevantResearch}
      
      Their priorities are: ${this._extractPriorities(diagnosticResponses).join(', ')}
      Their main pain points are: ${this._extractPainPoints(diagnosticResponses).join(', ')}
      Their obstacles to balance are: ${this._extractObstacles(diagnosticResponses).join(', ')}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(claudeResponse);
      
      // Return generated questions
      return parsedResponse.questions;
    } catch (error) {
      console.error("Error generating personalized questions:", error);
      
      // Fallback to base questions if AI generation fails
      return this._getFallbackQuestions(diagnosticResponses, familyData);
    }
  }

  /**
   * Generate questions for children based on family context
   * @param {Object} familyData - Family structure and diagnostic information
   * @param {Array} parentQuestions - The questions generated for parents
   * @param {Number} childAge - Age of the child
   * @returns Array of age-appropriate questions for the child
   */
  async generateChildQuestions(familyData, parentQuestions, childAge) {
    // For kids, we want age-appropriate versions of the parent questions
    try {
      // This would use Claude to create kid-friendly versions
      const systemPrompt = `You are an expert in creating age-appropriate survey questions for children about family dynamics.
      
      Your task is to adapt adult survey questions about family workload balance into child-friendly versions that are:
      1. Appropriate for a ${childAge}-year-old child
      2. Simple and concrete rather than abstract
      3. Free of complex language or concepts
      4. Focused on observable behaviors rather than invisible work
      5. Engaging and easy to understand
      
      For each question, provide:
      - The original adult question ID
      - The adapted child-friendly question text
      
      Return the questions as a JSON object with this structure:
      {
        "childQuestions": [
          {
            "originalId": "q1",
            "id": "child-q1",
            "childText": "Simplified question for child",
            "category": "Same category as original",
            "ageAppropriate": true
          }
        ]
      }`;
      
      const userMessage = `Adapt these parent questions into child-friendly versions appropriate for a ${childAge}-year-old child:
      
      ${JSON.stringify(parentQuestions.slice(0, 30), null, 2)}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(claudeResponse);
      
      // Return generated child questions
      return parsedResponse.childQuestions;
    } catch (error) {
      console.error("Error generating child questions:", error);
      
      // Fallback to simplified versions of parent questions
      return this._generateFallbackChildQuestions(parentQuestions, childAge);
    }
  }

  /**
   * Generate follow-up questions based on previous responses
   * @param {Object} previousResponses - Responses from earlier survey questions
   * @param {Object} familyData - Family structure information
   * @returns Array of follow-up questions
   */
  async generateFollowUpQuestions(previousResponses, familyData) {
    // Identify areas that need more exploration based on responses
    try {
      // Analyze previous responses to find patterns and imbalances
      const analysisResult = this._analyzeResponses(previousResponses);
      
      // Generate follow-up questions focused on areas with significant imbalance
      // or where responses suggest complexity worth exploring
      const systemPrompt = `You are an expert in family dynamics and workload balance.
      
      Based on a family's previous survey responses, generate 5-10 follow-up questions that:
      1. Explore areas of significant imbalance in more depth
      2. Investigate the "why" behind the current distribution
      3. Uncover opportunities for improvement
      4. Help the family gain more insight into their dynamics
      
      Return the questions as a JSON object with this structure:
      {
        "followUpQuestions": [
          {
            "id": "followup-1",
            "text": "Question text here",
            "category": "Category name",
            "triggerResponse": "The original response that triggered this follow-up",
            "explanation": "Why this follow-up matters"
          }
        ]
      }`;
      
      const userMessage = `Generate follow-up questions based on these survey responses:
      
      ${JSON.stringify(previousResponses, null, 2)}
      
      Analysis of responses:
      ${JSON.stringify(analysisResult, null, 2)}
      
      Family Structure:
      ${JSON.stringify(familyData, null, 2)}`;
      
      // Call Claude API
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      );
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(claudeResponse);
      
      // Return generated follow-up questions
      return parsedResponse.followUpQuestions;
    } catch (error) {
      console.error("Error generating follow-up questions:", error);
      
      // Return empty array if generation fails
      return [];
    }
  }

  /**
   * Prepare context for AI from diagnostic responses and family data
   * @private
   */
  _prepareContext(diagnosticResponses, familyData) {
    // Extract relevant information from diagnostic responses
    const priorities = this._extractPriorities(diagnosticResponses);
    const painPoints = this._extractPainPoints(diagnosticResponses);
    const obstacles = this._extractObstacles(diagnosticResponses);
    
    return {
      familyStructure: familyData,
      priorities,
      painPoints,
      obstacles,
      diagnosticResponses
    };
  }

  /**
   * Extract priorities from diagnostic responses
   * @private
   */
  _extractPriorities(diagnosticResponses) {
    // Extract from diag2 and diag5
    const priorities = [];
    
    if (diagnosticResponses.diag2 && Array.isArray(diagnosticResponses.diag2)) {
      priorities.push(...diagnosticResponses.diag2);
    }
    
    if (diagnosticResponses.diag5 && Array.isArray(diagnosticResponses.diag5)) {
      priorities.push(...diagnosticResponses.diag5);
    }
    
    return priorities;
  }

  /**
   * Extract pain points from diagnostic responses
   * @private
   */
  _extractPainPoints(diagnosticResponses) {
    // Extract from diag1
    return diagnosticResponses.diag1 && Array.isArray(diagnosticResponses.diag1) 
      ? diagnosticResponses.diag1 
      : [];
  }

  /**
   * Extract obstacles from diagnostic responses
   * @private
   */
  _extractObstacles(diagnosticResponses) {
    // Extract from diag3
    return diagnosticResponses.diag3 && Array.isArray(diagnosticResponses.diag3) 
      ? diagnosticResponses.diag3 
      : [];
  }

  /**
   * Get relevant research content from whitepapers based on diagnostic responses
   * @private
   */
  _getRelevantResearchContent(diagnosticResponses) {
    let relevantContent = "";
    
    // Get all priorities and pain points
    const allConcerns = [
      ...(diagnosticResponses.diag1 || []),
      ...(diagnosticResponses.diag2 || []),
      ...(diagnosticResponses.diag5 || [])
    ];
    
    // Extract relevant content from whitepapers
    if (this.whitepaperContent) {
      // Add mental load research if it's a concern
      if (allConcerns.some(concern => 
        concern.toLowerCase().includes('mental') || 
        concern.toLowerCase().includes('invisible')
      )) {
        relevantContent += `Mental Load Research: ${this.whitepaperContent.research.mentalLoad}\n\n`;
      }
      
      // Add relationship impact research if it's a concern
      if (allConcerns.some(concern => 
        concern.toLowerCase().includes('relationship') || 
        concern.toLowerCase().includes('conflict')
      )) {
        relevantContent += `Relationship Impact Research: ${this.whitepaperContent.research.relationshipImpact}\n\n`;
      }
      
      // Add child development research if it's a concern
      if (allConcerns.some(concern => 
        concern.toLowerCase().includes('child') || 
        concern.toLowerCase().includes('model')
      )) {
        relevantContent += `Child Development Research: ${this.whitepaperContent.research.childDevelopment}\n\n`;
      }
      
      // Add parenting strategies if applicable
      if (allConcerns.some(concern => concern.toLowerCase().includes('parent'))) {
        relevantContent += `Parenting Strategies: 
          ${this.whitepaperContent.parentingStrategies.positiveReinforcement.summary}
          ${this.whitepaperContent.parentingStrategies.responsibilityDevelopment.summary}
          ${this.whitepaperContent.parentingStrategies.emotionalSupport.summary}\n\n`;
      }
    }
    
    if (!relevantContent) {
      // Default content if nothing specific matches
      relevantContent = "Research shows the 'mental load' of household management falls disproportionately on women in 83% of families. Studies indicate that imbalanced household responsibilities increase relationship conflict by 67%. Children who witness balanced household responsibilities are 3x more likely to establish equitable relationships as adults.";
    }
    
    return relevantContent;
  }

  /**
   * Analyze survey responses to identify patterns and imbalances
   * @private
   */
  _analyzeResponses(responses) {
    // Count distribution of "Mama" vs "Papa" responses
    let mamaCount = 0;
    let papaCount = 0;
    let totalResponses = 0;
    
    // Category-specific counts
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Process each response
    Object.entries(responses).forEach(([questionId, response]) => {
      if (response === "Mama" || response === "Papa") {
        totalResponses++;
        
        if (response === "Mama") {
          mamaCount++;
        } else {
          papaCount++;
        }
        
        // If we have category information for this question in the metadata
        if (responses[`${questionId}_category`]) {
          const category = responses[`${questionId}_category`];
          if (categories[category]) {
            categories[category].total++;
            if (response === "Mama") {
              categories[category].mama++;
            } else {
              categories[category].papa++;
            }
          }
        }
      }
    });
    
    // Calculate percentages and imbalances
    const overallImbalance = totalResponses > 0 
      ? Math.abs((mamaCount / totalResponses * 100) - (papaCount / totalResponses * 100))
      : 0;
      
    const categoryImbalances = {};
    Object.entries(categories).forEach(([category, counts]) => {
      if (counts.total > 0) {
        const mamaPercent = counts.mama / counts.total * 100;
        const papaPercent = counts.papa / counts.total * 100;
        categoryImbalances[category] = {
          mamaPercent,
          papaPercent,
          imbalance: Math.abs(mamaPercent - papaPercent)
        };
      }
    });
    
    // Find most imbalanced categories
    const sortedImbalances = Object.entries(categoryImbalances)
      .sort(([, a], [, b]) => b.imbalance - a.imbalance);
      
    const mostImbalanced = sortedImbalances.length > 0 ? sortedImbalances[0][0] : null;
    
    return {
      overallDistribution: {
        mama: mamaCount,
        papa: papaCount,
        total: totalResponses,
        mamaPercent: totalResponses > 0 ? (mamaCount / totalResponses * 100) : 0,
        papaPercent: totalResponses > 0 ? (papaCount / totalResponses * 100) : 0,
        overallImbalance
      },
      categoryImbalances,
      mostImbalancedCategory: mostImbalanced,
      sortedImbalances: sortedImbalances.map(([category, data]) => ({ category, ...data }))
    };
  }

  /**
   * Provide fallback questions if AI generation fails
   * @private
   */
  _getFallbackQuestions(diagnosticResponses, familyData) {
    // Return a subset of the base questions, prioritized by the diagnostic responses
    const priorities = this._extractPriorities(diagnosticResponses);
    
    // Create a basic set of questions that would work for any family
    const baseQuestions = [
      {
        id: "q1",
        text: "Who is responsible for cooking meals in your home?",
        category: "Visible Household Tasks",
        explanation: "This question helps us understand who is primarily handling visible household tasks in your family.",
        weightExplanation: "Cooking is a daily task that requires significant time and planning.",
        baseWeight: 4,
        frequency: "daily",
        invisibility: "partially",
        emotionalLabor: "moderate",
        childDevelopment: "high",
        relationshipImpact: "moderate",
        totalWeight: 10.5
      },
      {
        id: "q2",
        text: "Who plans meals for the week?",
        category: "Invisible Household Tasks",
        explanation: "This helps identify who handles the invisible mental work of meal planning.",
        weightExplanation: "Meal planning requires significant mental load and forward thinking.",
        baseWeight: 3,
        frequency: "weekly",
        invisibility: "completely",
        emotionalLabor: "moderate",
        childDevelopment: "moderate",
        relationshipImpact: "moderate",
        totalWeight: 9.0
      },
      // Add 38-48 more base questions here
    ];
    
    // Return the base questions
    return baseQuestions;
  }

  /**
   * Generate simplified versions of parent questions for children
   * @private
   */
  _generateFallbackChildQuestions(parentQuestions, childAge) {
    // Create simplified versions of parent questions appropriate for a child
    return parentQuestions.slice(0, 30).map((question, index) => ({
      originalId: question.id,
      id: `child-${question.id}`,
      childText: this._simplifyQuestionForChild(question.text, childAge),
      category: question.category,
      ageAppropriate: true
    }));
  }

  /**
   * Simplify a question for a child based on age
   * @private
   */
  _simplifyQuestionForChild(adultQuestion, childAge) {
    // Basic transformation for younger children
    if (childAge < 8) {
      // Replace complex terms
      let simplified = adultQuestion
        .replace("responsible for", "does")
        .replace("primarily handles", "does")
        .replace("manages", "does")
        .replace("coordinates", "helps with")
        .replace("anticipates", "thinks about")
        .replace("emotional labor", "feelings");
      
      // Add a friendly prefix
      simplified = `Who usually ${simplified.toLowerCase().replace("who ", "")}`;
      
      return simplified;
    }
    
    // Slightly more advanced for older children
    return adultQuestion;
  }
}

export default new AIQuestionGenerator();