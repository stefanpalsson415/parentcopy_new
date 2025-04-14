// src/services/EnhancedInformationService.js
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import FamilyKnowledgeGraph from './FamilyKnowledgeGraph';
import ConversationContext from './ConversationContext';

/**
 * Enhanced Information Service for Allie
 * 
 * Provides advanced information retrieval and research-based advisory capabilities.
 * - Contextual information retrieval from multiple sources
 * - Citation and source tracking
 * - Evidence-based recommendation generation
 * - Domain knowledge integration
 */
class EnhancedInformationService {
  constructor() {
    this.knowledgeBase = knowledgeBase;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.responseCache = {};
  }

  /**
   * Retrieve relevant information based on a query and context
   * @param {string} query - User query
   * @param {string} familyId - Family ID for context
   * @param {string} category - Optional knowledge category
   * @returns {Promise<object>} Retrieved information with sources
   */
  async retrieveInformation(query, familyId, category = null) {
    try {
      // Generate cache key
      const cacheKey = `${query}|${familyId}|${category || 'all'}`;
      
      // Check cache first
      if (this.responseCache[cacheKey] && 
          Date.now() - this.responseCache[cacheKey].timestamp < this.cacheExpiry) {
        return this.responseCache[cacheKey].data;
      }
      
      // Build comprehensive response from multiple sources
      const result = {
        relevantContent: [],
        sources: [],
        confidence: 0
      };
      
      // 1. Retrieve from knowledge base
      const kbResults = this.retrieveFromKnowledgeBase(query, category);
      result.relevantContent.push(...kbResults.content);
      result.sources.push(...kbResults.sources);
      
      // 2. Retrieve from family knowledge graph
      if (familyId) {
        const graphResults = await this.retrieveFromKnowledgeGraph(query, familyId);
        result.relevantContent.push(...graphResults.content);
        result.sources.push(...graphResults.sources);
      }
      
      // 3. Retrieve from conversation history
      if (familyId) {
        const historyResults = await this.retrieveFromConversationHistory(query, familyId);
        result.relevantContent.push(...historyResults.content);
        result.sources.push(...historyResults.sources);
      }
      
      // 4. Retrieve from family-specific data records
      if (familyId) {
        const familyResults = await this.retrieveFromFamilyData(query, familyId);
        result.relevantContent.push(...familyResults.content);
        result.sources.push(...familyResults.sources);
      }
      
      // Calculate overall confidence
      result.confidence = this.calculateRetrievalConfidence(result, query);
      
      // Cache the result
      this.responseCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error("Error retrieving information:", error);
      return {
        relevantContent: [],
        sources: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Retrieve information from static knowledge base
   * @param {string} query - User query
   * @param {string} category - Optional knowledge category 
   * @returns {object} Retrieved content and sources
   */
  retrieveFromKnowledgeBase(query, category) {
    const result = {
      content: [],
      sources: []
    };
    
    // Normalize query
    const normalizedQuery = query.toLowerCase().trim().replace(/[?.,!]/g, '');
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 3);
    
    // Filter which knowledge base sections to search
    const sectionsToSearch = category ? 
      [category] : 
      ['faqs', 'childTrackingFaqs', 'whitepapers', 'marketing'];
    
    // Search in FAQs for direct matches
    if (sectionsToSearch.includes('faqs')) {
      for (const [question, answer] of Object.entries({...this.knowledgeBase.faqs, ...this.knowledgeBase.childTrackingFaqs})) {
        const normalizedQuestion = question.toLowerCase().trim().replace(/[?.,!]/g, '');
        
        // Exact match or high similarity
        if (normalizedQuery === normalizedQuestion || 
            (normalizedQuery.length > 10 && normalizedQuestion.includes(normalizedQuery)) ||
            (normalizedQuestion.length > 10 && normalizedQuery.includes(normalizedQuestion))) {
          result.content.push({
            text: answer,
            relevance: 1.0,
            type: 'direct-answer'
          });
          
          result.sources.push({
            type: 'faq',
            title: question,
            confidence: 0.95
          });
          
          break; // Found exact match, no need to continue
        }
        
        // Word match scoring
        let matchScore = 0;
        queryWords.forEach(word => {
          if (normalizedQuestion.includes(word)) {
            matchScore += 1;
          }
        });
        
        const wordMatchRatio = matchScore / queryWords.length;
        
        if (wordMatchRatio > 0.7) {
          result.content.push({
            text: answer,
            relevance: wordMatchRatio,
            type: 'related-answer'
          });
          
          result.sources.push({
            type: 'faq',
            title: question,
            confidence: wordMatchRatio
          });
        }
      }
    }
    
    // Search in whitepapers and research
    if (sectionsToSearch.includes('whitepapers')) {
      // Search in task categories
      if (normalizedQuery.includes('task') || normalizedQuery.includes('category') || normalizedQuery.includes('household')) {
        for (const [category, description] of Object.entries(this.knowledgeBase.whitepapers.taskCategories)) {
          const normalizedCategory = category.toLowerCase();
          
          if (normalizedQuery.includes(normalizedCategory)) {
            result.content.push({
              text: description,
              relevance: 0.9,
              type: 'category-definition'
            });
            
            result.sources.push({
              type: 'whitepaper',
              section: 'Task Categories',
              title: category,
              confidence: 0.9
            });
          }
        }
      }
      
      // Search in research findings
      if (normalizedQuery.includes('research') || normalizedQuery.includes('study') || normalizedQuery.includes('data')) {
        for (const [topic, finding] of Object.entries(this.knowledgeBase.whitepapers.research)) {
          const normalizedTopic = topic.toLowerCase();
          const findingWords = finding.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          
          let matchScore = 0;
          queryWords.forEach(word => {
            if (normalizedTopic.includes(word) || findingWords.includes(word)) {
              matchScore += 1;
            }
          });
          
          const wordMatchRatio = matchScore / queryWords.length;
          
          if (wordMatchRatio > 0.3) {
            result.content.push({
              text: finding,
              relevance: wordMatchRatio,
              type: 'research-finding'
            });
            
            result.sources.push({
              type: 'research',
              title: topic.replace(/([A-Z])/g, ' $1').trim(),
              confidence: wordMatchRatio
            });
          }
        }
      }
      
      // Search in methodology
      if (normalizedQuery.includes('how') || normalizedQuery.includes('methodology') || 
          normalizedQuery.includes('weighting') || normalizedQuery.includes('system')) {
        for (const [method, description] of Object.entries(this.knowledgeBase.whitepapers.methodology)) {
          const normalizedMethod = method.toLowerCase();
          
          if (normalizedQuery.includes(normalizedMethod)) {
            result.content.push({
              text: description,
              relevance: 0.85,
              type: 'methodology'
            });
            
            result.sources.push({
              type: 'methodology',
              title: method.replace(/([A-Z])/g, ' $1').trim(),
              confidence: 0.85
            });
          }
        }
      }
      
      // Search in parenting strategies
      if (normalizedQuery.includes('parent') || normalizedQuery.includes('child') || 
          normalizedQuery.includes('strategy') || normalizedQuery.includes('approach')) {
        for (const [strategy, details] of Object.entries(this.knowledgeBase.whitepapers.parentingStrategies)) {
          const normalizedStrategy = strategy.toLowerCase();
          
          if (normalizedQuery.includes(normalizedStrategy)) {
            result.content.push({
              text: `${details.summary} ${details.research}`,
              relevance: 0.9,
              type: 'parenting-strategy'
            });
            
            result.sources.push({
              type: 'parenting-strategy',
              title: strategy.replace(/([A-Z])/g, ' $1').trim(),
              confidence: 0.9
            });
          }
        }
      }
      
      // Search in child development if query mentions children
      if (normalizedQuery.includes('child') || normalizedQuery.includes('development') || 
          normalizedQuery.includes('milestone') || normalizedQuery.includes('growth')) {
        
        // Determine if query is about a specific age group
        let ageGroup = null;
        if (normalizedQuery.includes('infant') || normalizedQuery.includes('baby')) {
          ageGroup = 'infant';
        } else if (normalizedQuery.includes('toddler')) {
          ageGroup = 'toddler';
        } else if (normalizedQuery.includes('preschool')) {
          ageGroup = 'preschool';
        } else if (normalizedQuery.includes('school')) {
          ageGroup = 'schoolAge';
        } else if (normalizedQuery.includes('teen') || normalizedQuery.includes('adolescent')) {
          ageGroup = 'adolescent';
        }
        
        // Determine if query is about a specific development area
        let devArea = null;
        if (normalizedQuery.includes('physical') || normalizedQuery.includes('motor')) {
          devArea = 'physical';
        } else if (normalizedQuery.includes('cognitive') || normalizedQuery.includes('brain') || normalizedQuery.includes('thinking')) {
          devArea = 'cognitive';
        } else if (normalizedQuery.includes('social') || normalizedQuery.includes('emotional')) {
          devArea = 'social';
        }
        
        // Get relevant development information
        if (ageGroup && this.knowledgeBase.whitepapers.childDevelopment.milestones[ageGroup]) {
          const milestones = this.knowledgeBase.whitepapers.childDevelopment.milestones[ageGroup];
          
          if (devArea && milestones[devArea]) {
            result.content.push({
              text: milestones[devArea],
              relevance: 0.95,
              type: 'development-milestone'
            });
            
            result.sources.push({
              type: 'child-development',
              title: `${ageGroup} ${devArea} development`,
              confidence: 0.95
            });
          } else {
            // Add all development areas for this age group
            let allMilestones = '';
            for (const [area, milestone] of Object.entries(milestones)) {
              allMilestones += `${area}: ${milestone}\n`;
            }
            
            result.content.push({
              text: allMilestones,
              relevance: 0.9,
              type: 'development-milestone'
            });
            
            result.sources.push({
              type: 'child-development',
              title: `${ageGroup} development milestones`,
              confidence: 0.9
            });
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Retrieve information from the family knowledge graph
   * @param {string} query - User query
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Retrieved content and sources
   */
  async retrieveFromKnowledgeGraph(query, familyId) {
    const result = {
      content: [],
      sources: []
    };
    
    try {
      // Get the knowledge graph
      const graphResults = await FamilyKnowledgeGraph.executeNaturalLanguageQuery(
        familyId,
        query
      );
      
      if (graphResults && graphResults.results) {
        graphResults.results.forEach(item => {
          if (item.entity && item.entity.properties) {
            result.content.push({
              text: this.formatEntityAsText(item.entity),
              relevance: item.confidence || 0.8,
              type: 'entity',
              entityId: item.entity.id,
              entityType: item.entity.type
            });
            
            result.sources.push({
              type: 'knowledge-graph',
              entityType: item.entity.type,
              entityId: item.entity.id,
              title: item.entity.properties.name || `${item.entity.type} entity`,
              confidence: item.confidence || 0.8
            });
          } else if (item.title && item.description) {
            result.content.push({
              text: `${item.title}: ${item.description}`,
              relevance: item.confidence || 0.7,
              type: 'insight'
            });
            
            result.sources.push({
              type: 'knowledge-graph-insight',
              title: item.title,
              confidence: item.confidence || 0.7
            });
          }
        });
      }
    } catch (error) {
      console.error("Error retrieving from knowledge graph:", error);
    }
    
    return result;
  }

  /**
   * Format a knowledge graph entity as readable text
   * @param {object} entity - Entity from knowledge graph
   * @returns {string} Formatted text description
   */
  formatEntityAsText(entity) {
    if (!entity || !entity.properties) return '';
    
    let text = '';
    
    // Add name/title if available
    if (entity.properties.name) {
      text += `${entity.properties.name} (${entity.type}):\n`;
    } else {
      text += `${entity.type}:\n`;
    }
    
    // Add key properties
    for (const [key, value] of Object.entries(entity.properties)) {
      if (key !== 'name' && key !== 'id' && !key.startsWith('_')) {
        if (typeof value === 'object') {
          text += `${key}: ${JSON.stringify(value)}\n`;
        } else {
          text += `${key}: ${value}\n`;
        }
      }
    }
    
    return text;
  }

  /**
   * Retrieve information from conversation history
   * @param {string} query - User query
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Retrieved content and sources
   */
  async retrieveFromConversationHistory(query, familyId) {
    const result = {
      content: [],
      sources: []
    };
    
    try {
      // Get conversation context first
      const context = ConversationContext.getContext(familyId);
      
      // Check if this query is related to previous questions/topics
      if (context.topics && context.topics.length > 0) {
        const queryWords = query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 3);
        
        for (const topic of context.topics) {
          const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          
          // Calculate overlap between query and topic
          const overlap = queryWords.filter(word => topicWords.includes(word)).length;
          const overlapRatio = overlap / Math.max(queryWords.length, 1);
          
          if (overlapRatio > 0.3) {
            // Find related question/answer in history
            if (context.userQuestions) {
              for (const question of context.userQuestions) {
                if (question.question.toLowerCase().includes(topic.toLowerCase()) && 
                    question.answered) {
                  result.content.push({
                    text: `Previous question: "${question.question}"\nYou asked about this in our conversation.`,
                    relevance: overlapRatio,
                    type: 'conversation-history'
                  });
                  
                  result.sources.push({
                    type: 'conversation-history',
                    title: 'Previous discussion',
                    confidence: overlapRatio
                  });
                  
                  break;
                }
              }
            }
          }
        }
      }
      
      // If we have entities in context that relate to the query
      if (context.entities) {
        const queryLower = query.toLowerCase();
        
        for (const [entityType, entities] of Object.entries(context.entities)) {
          for (const entity of entities) {
            if (queryLower.includes(entity.toLowerCase())) {
              result.content.push({
                text: `You previously mentioned ${entity} in our conversation.`,
                relevance: 0.7,
                type: 'referenced-entity'
              });
              
              result.sources.push({
                type: 'conversation-reference',
                title: entity,
                entityType: entityType,
                confidence: 0.7
              });
              
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error retrieving from conversation history:", error);
    }
    
    return result;
  }

  /**
   * Retrieve information from family-specific data
   * @param {string} query - User query
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Retrieved content and sources
   */
  async retrieveFromFamilyData(query, familyId) {
    const result = {
      content: [],
      sources: []
    };
    
    try {
      // Normalize query
      const queryLower = query.toLowerCase();
      
      // Check for task-related queries
      if (queryLower.includes('task') || queryLower.includes('chore')) {
        const taskDocs = await getDocs(
          query(
            collection(db, "tasks"),
            where("familyId", "==", familyId),
            orderBy("createdAt", "desc"),
            limit(5)
          )
        );
        
        if (!taskDocs.empty) {
          let tasksText = "Recent family tasks:\n";
          
          taskDocs.forEach(doc => {
            const task = doc.data();
            tasksText += `- ${task.title} (assigned to ${task.assignedToName})\n`;
          });
          
          result.content.push({
            text: tasksText,
            relevance: 0.8,
            type: 'family-tasks'
          });
          
          result.sources.push({
            type: 'family-data',
            title: 'Task records',
            confidence: 0.8
          });
        }
      }
      
      // Check for provider-related queries
      if (queryLower.includes('provider') || queryLower.includes('doctor') || 
          queryLower.includes('teacher') || queryLower.includes('contact')) {
        const providerDocs = await getDocs(
          query(
            collection(db, "providers"),
            where("familyId", "==", familyId),
            limit(5)
          )
        );
        
        if (!providerDocs.empty) {
          let providersText = "Family providers:\n";
          
          providerDocs.forEach(doc => {
            const provider = doc.data();
            providersText += `- ${provider.name} (${provider.specialty || provider.type})\n`;
          });
          
          result.content.push({
            text: providersText,
            relevance: 0.8,
            type: 'family-providers'
          });
          
          result.sources.push({
            type: 'family-data',
            title: 'Provider records',
            confidence: 0.8
          });
        }
      }
      
      // Check for appointment-related queries
      if (queryLower.includes('appointment') || queryLower.includes('schedule') || 
          queryLower.includes('doctor') || queryLower.includes('visit')) {
        const appointmentDocs = await getDocs(
          query(
            collection(db, "appointments"),
            where("familyId", "==", familyId),
            where("date", ">=", new Date().toISOString().split('T')[0]),
            orderBy("date", "asc"),
            limit(3)
          )
        );
        
        if (!appointmentDocs.empty) {
          let appointmentsText = "Upcoming appointments:\n";
          
          appointmentDocs.forEach(doc => {
            const appointment = doc.data();
            appointmentsText += `- ${appointment.title} on ${appointment.date} at ${appointment.time}\n`;
          });
          
          result.content.push({
            text: appointmentsText,
            relevance: 0.85,
            type: 'family-appointments'
          });
          
          result.sources.push({
            type: 'family-data',
            title: 'Appointment records',
            confidence: 0.85
          });
        }
      }
      
      // Check for child-related queries
      if (queryLower.includes('child') || queryLower.includes('kid') || 
          queryLower.includes('son') || queryLower.includes('daughter')) {
        // Get family document to access child data
        const familyDoc = await getDocs(
          query(
            collection(db, "families"),
            where("__name__", "==", familyId)
          )
        );
        
        if (!familyDoc.empty) {
          const familyData = familyDoc.docs[0].data();
          
          if (familyData.familyMembers) {
            const children = familyData.familyMembers.filter(m => m.role === 'child');
            
            if (children.length > 0) {
              let childrenText = "Children in family:\n";
              
              children.forEach(child => {
                childrenText += `- ${child.name}\n`;
              });
              
              result.content.push({
                text: childrenText,
                relevance: 0.7,
                type: 'family-children'
              });
              
              result.sources.push({
                type: 'family-data',
                title: 'Family members',
                confidence: 0.7
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error retrieving from family data:", error);
    }
    
    return result;
  }

  /**
   * Calculate overall confidence score for retrieved information
   * @param {object} result - Retrieved information
   * @param {string} query - Original query
   * @returns {number} Confidence score (0-1)
   */
  calculateRetrievalConfidence(result, query) {
    // If no content found, return 0
    if (result.relevantContent.length === 0) {
      return 0;
    }
    
    // Sort content by relevance
    const sortedContent = [...result.relevantContent].sort((a, b) => b.relevance - a.relevance);
    
    // Top three items' average relevance
    const topItems = sortedContent.slice(0, Math.min(3, sortedContent.length));
    const avgRelevance = topItems.reduce((sum, item) => sum + item.relevance, 0) / topItems.length;
    
    // Apply additional factors
    let confidence = avgRelevance;
    
    // Boost if we have multiple sources
    if (result.sources.length > 1) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
    
    // Boost if we have a direct match from the knowledge base
    if (result.relevantContent.some(c => c.type === 'direct-answer')) {
      confidence = Math.min(confidence + 0.15, 1.0);
    }
    
    // Penalty if the best match is only moderately relevant
    if (sortedContent[0].relevance < 0.7) {
      confidence = Math.max(confidence - 0.2, 0);
    }
    
    return confidence;
  }

  /**
   * Format retrieved information into a response with citations
   * @param {object} retrievalResult - Result from retrieveInformation
   * @returns {object} Formatted response with citations
   */
  formatResponseWithCitations(retrievalResult) {
    // If no content, return empty response
    if (!retrievalResult.relevantContent || retrievalResult.relevantContent.length === 0) {
      return {
        text: "I couldn't find specific information on that topic.",
        citations: [],
        confidence: 0
      };
    }
    
    // Sort content by relevance
    const sortedContent = [...retrievalResult.relevantContent]
      .sort((a, b) => b.relevance - a.relevance);
    
    // Initialize response
    let responseText = "";
    const citations = [];
    
    // Process top content
    for (let i = 0; i < Math.min(3, sortedContent.length); i++) {
      const content = sortedContent[i];
      
      // Skip low relevance content
      if (content.relevance < 0.4) continue;
      
      // Add citation marker
      const citationIndex = citations.length + 1;
      responseText += `${content.text} [${citationIndex}]\n\n`;
      
      // Find matching source
      const source = retrievalResult.sources.find(s => 
        (s.entityId === content.entityId) || 
        (s.title && content.text.includes(s.title))
      ) || retrievalResult.sources[i];
      
      // Add citation
      citations.push({
        index: citationIndex,
        source: source.type,
        title: source.title,
        confidence: source.confidence
      });
    }
    
    return {
      text: responseText.trim(),
      citations,
      confidence: retrievalResult.confidence
    };
  }

  /**
   * Generate an evidence-based recommendation
   * @param {string} query - User query
   * @param {string} familyId - Family ID
   * @param {object} familyContext - Family context data
   * @returns {Promise<object>} Recommendation with citations
   */
  async generateResearchBasedRecommendation(query, familyId, familyContext) {
    try {
      // First retrieve relevant information
      const retrievalResult = await this.retrieveInformation(query, familyId);
      
      // If no relevant content, return empty recommendation
      if (retrievalResult.relevantContent.length === 0) {
        return {
          recommendation: "I don't have enough information to make a research-based recommendation on this topic.",
          citations: [],
          confidence: 0
        };
      }
      
      // Format a basic response with citations
      const formattedResponse = this.formatResponseWithCitations(retrievalResult);
      
      // For highly confident retrievals, we just return the formatted response
      if (retrievalResult.confidence > 0.85) {
        return {
          recommendation: formattedResponse.text,
          citations: formattedResponse.citations,
          confidence: formattedResponse.confidence
        };
      }
      
      // For less confident retrievals, we need to adapt to the family context
      // Extract key insights from content
      const keyInsights = retrievalResult.relevantContent
        .filter(content => content.relevance > 0.6)
        .map(content => content.text)
        .join("\n\n");
      
      // Build a recommendation that contextualizes the research for this family
      let recommendation = "Based on research findings";
      
      // Add family-specific context 
      if (familyContext) {
        if (familyContext.children && familyContext.children.length > 0) {
          recommendation += ` and considering your ${familyContext.children.length > 1 ? 'children' : 'child'}`;
          
          // Add age context if available
          const childAges = familyContext.children
            .filter(child => child.birthdate)
            .map(child => {
              const birthYear = new Date(child.birthdate).getFullYear();
              const currentYear = new Date().getFullYear();
              return currentYear - birthYear;
            });
          
          if (childAges.length > 0) {
            recommendation += ` (age${childAges.length > 1 ? 's' : ''}: ${childAges.join(', ')})`;
          }
        }
        
        if (familyContext.surveyData && familyContext.surveyData.mamaPercentage) {
          const balanceLevel = Math.abs(familyContext.surveyData.mamaPercentage - 50);
          
          if (balanceLevel > 20) {
            recommendation += `, and your current workload imbalance of ${balanceLevel.toFixed(0)}%`;
          } else if (balanceLevel < 10) {
            recommendation += `, and your relatively balanced workload distribution`;
          }
        }
      }
      
      recommendation += `, I recommend:\n\n${keyInsights}`;
      
      // Add citations
      recommendation += "\n\n";
      formattedResponse.citations.forEach(citation => {
        recommendation += `[${citation.index}] ${citation.title} (${citation.source})\n`;
      });
      
      return {
        recommendation,
        citations: formattedResponse.citations,
        confidence: retrievalResult.confidence
      };
    } catch (error) {
      console.error("Error generating research-based recommendation:", error);
      return {
        recommendation: "I encountered an error while trying to generate a research-based recommendation.",
        citations: [],
        confidence: 0,
        error: error.message
      };
    }
  }
}

export default new EnhancedInformationService();