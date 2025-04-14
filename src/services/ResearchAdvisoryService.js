// src/services/ResearchAdvisoryService.js
import EnhancedInformationService from './EnhancedInformationService';
import ClaudeService from './ClaudeService';
import PersonalizationEngine from './PersonalizationEngine';
import ConversationContext from './ConversationContext';
import { knowledgeBase } from '../data/AllieKnowledgeBase';

/**
 * Research Advisory Service for Allie
 * 
 * Provides research-based, personalized advisory capabilities by:
 * - Enriching Claude responses with research findings
 * - Adding citations to sources
 * - Personalizing responses based on user preferences
 * - Adapting tone and content based on context
 */
class ResearchAdvisoryService {
  constructor() {
    this.infoService = EnhancedInformationService;
    this.personalization = PersonalizationEngine;
  }

  /**
   * Generate a comprehensive research-backed response
   * @param {string} query - User query
   * @param {string} familyId - Family ID
   * @param {object} familyContext - Family context data
   * @returns {Promise<object>} Enhanced response with research backing
   */
  async generateEnhancedResponse(query, familyId, familyContext) {
    try {
      // Step 1: Retrieve relevant information
      const retrievalResults = await this.infoService.retrieveInformation(query, familyId);
      
      // Step 2: Generate a personalized system prompt
      const personalizedPrompt = await this.personalization.generatePersonalizedPrompt(
        familyId,
        { text: query },
        familyContext
      );
      
      // Step 3: Enhance the prompt with retrieved information
      const enhancedPrompt = this.enhancePromptWithResearch(personalizedPrompt, retrievalResults, query);
      
      // Step 4: Get Claude response with enhanced prompt
      const claudeResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: query }],
        { system: enhancedPrompt }
      );
      
      // Step 5: Personalize Claude's response
      const personalizedResponse = await this.personalization.personalizeResponse(
        claudeResponse,
        familyId,
        familyContext
      );
      
      // Step 6: Add citations if information was used
      const responseWithCitations = this.addCitationsToResponse(personalizedResponse, retrievalResults);
      
      // Step 7: Update conversation context
      ConversationContext.updateContext(familyId, {
        text: query,
        response: responseWithCitations,
        retrievalConfidence: retrievalResults.confidence,
        hasResearchCitations: retrievalResults.sources.length > 0
      });
      
      return {
        text: responseWithCitations,
        sources: retrievalResults.sources,
        confidence: retrievalResults.confidence
      };
    } catch (error) {
      console.error("Error generating enhanced response:", error);
      
      // Fallback to basic Claude
      try {
        return {
          text: await ClaudeService.generateResponse(
            [{ role: 'user', content: query }],
            familyContext
          ),
          sources: [],
          confidence: 0
        };
      } catch (fallbackError) {
        console.error("Fallback response also failed:", fallbackError);
        return {
          text: "I'm sorry, I'm having trouble generating a response. Please try again.",
          sources: [],
          confidence: 0
        };
      }
    }
  }

  /**
   * Enhance Claude's system prompt with retrieved research information
   * @param {string} basePrompt - Base system prompt
   * @param {object} retrievalResults - Results from information retrieval
   * @param {string} query - Original user query
   * @returns {string} Enhanced system prompt
   */
  enhancePromptWithResearch(basePrompt, retrievalResults, query) {
    // If no relevant content, return base prompt
    if (!retrievalResults.relevantContent || retrievalResults.relevantContent.length === 0) {
      return basePrompt;
    }
    
    // Get top relevant content (up to 3 items)
    const topContent = [...retrievalResults.relevantContent]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
    
    // Filter out low relevance content
    const highQualityContent = topContent.filter(c => c.relevance >= 0.7);
    
    // If no high quality content, return base prompt with minor enhancement
    if (highQualityContent.length === 0) {
      return `${basePrompt}\n\nNote: I couldn't find specific research on "${query}" but will use my general knowledge.`;
    }
    
    // Format content for inclusion in the prompt
    let researchSection = "\n\nRELEVANT RESEARCH INFORMATION FOR THIS QUERY:\n";
    
    highQualityContent.forEach((content, index) => {
      // Find matching source
      const source = retrievalResults.sources.find(s => 
        (s.entityId === content.entityId) || 
        (s.title && content.text.includes(s.title))
      ) || { type: 'unknown', title: 'source' };
      
      researchSection += `[${index + 1}] ${source.type}: ${source.title}\n`;
      researchSection += `${content.text}\n\n`;
    });
    
    researchSection += "INSTRUCTIONS FOR USING THIS RESEARCH:\n";
    researchSection += "- Incorporate this research naturally into your response\n";
    researchSection += "- Do not copy the research text verbatim\n";
    researchSection += "- Use your own words to explain the research findings\n";
    researchSection += "- Only reference research that is directly relevant to the query\n";
    researchSection += "- If the research conflicts with your knowledge, prioritize the research\n";
    
    return basePrompt + researchSection;
  }

  /**
   * Add citation markers to a response if research was used
   * @param {string} response - Text response from Claude
   * @param {object} retrievalResults - Results from information retrieval
   * @returns {string} Response with citation markers
   */
  addCitationsToResponse(response, retrievalResults) {
    // If no sources or low confidence, return response as is
    if (!retrievalResults.sources || 
        retrievalResults.sources.length === 0 || 
        retrievalResults.confidence < 0.4) {
      return response;
    }
    
    // Look for indications that research was used
    let usedResearch = false;
    retrievalResults.sources.some(source => {
      if (source.title && response.includes(source.title)) {
        usedResearch = true;
        return true;
      }
      return false;
    });
    
    // Add citations if research was used
    if (usedResearch) {
      let responseParts = response.split('\n\n');
      
      // Add citations section if response has multiple paragraphs
      if (responseParts.length > 1) {
        // Add sources section
        let sourcesSection = "\n\nSources:";
        retrievalResults.sources.slice(0, 3).forEach((source, index) => {
          sourcesSection += `\n[${index + 1}] ${source.title} (${source.type})`;
        });
        
        return response + sourcesSection;
      }
    }
    
    return response;
  }

  /**
   * Generate domain-specific advice based on category
   * @param {string} query - User query
   * @param {string} domain - Specific domain/category
   * @param {string} familyId - Family ID
   * @param {object} familyContext - Family context data
   * @returns {Promise<object>} Domain-specific advice
   */
  async generateDomainAdvice(query, domain, familyId, familyContext) {
    try {
      // Get domain-specific information
      const domainInfo = await this.infoService.retrieveInformation(query, familyId, domain);
      
      // Generate domain-specific prompt
      let domainPrompt = await this.personalization.generatePersonalizedPrompt(
        familyId, 
        { text: query },
        familyContext
      );
      
      // Add domain-specific guidance
      domainPrompt += `\n\nYou are now acting as a specialist in ${domain}. `;
      
      switch (domain) {
        case 'parenting':
          domainPrompt += `
Provide helpful parenting advice based on child development research.
Focus on age-appropriate strategies and developmental milestones.
Balance authoritative guidance with warmth and understanding.
Consider each child's unique temperament and needs.
Highlight the importance of consistency and positive reinforcement.`;
          break;
          
        case 'relationship':
          domainPrompt += `
Provide research-backed relationship advice for couples.
Focus on communication, conflict resolution, and maintaining connection.
Emphasize workload balance as a factor in relationship health.
Suggest practical strategies that busy parents can implement.
Be sensitive to different relationship styles and preferences.`;
          break;
          
        case 'workload':
          domainPrompt += `
Provide practical workload balance strategies based on research.
Focus on equitable distribution of visible and invisible tasks.
Consider the mental load aspect of household management.
Suggest systems for better coordination and transparency.
Emphasize the benefits of balanced workload for the entire family.`;
          break;
          
        default:
          domainPrompt += `
Provide helpful advice on ${domain} based on available research.
Focus on practical, actionable suggestions.
Connect your advice to family balance and harmony.
Be supportive and non-judgmental in your approach.`;
      }
      
      // Enhance prompt with domain-specific information
      const enhancedPrompt = this.enhancePromptWithResearch(domainPrompt, domainInfo, query);
      
      // Get domain-specific response
      const domainResponse = await ClaudeService.generateResponse(
        [{ role: 'user', content: query }],
        { system: enhancedPrompt }
      );
      
      // Personalize and add citations
      const personalizedResponse = await this.personalization.personalizeResponse(
        domainResponse,
        familyId,
        familyContext
      );
      
      const responseWithCitations = this.addCitationsToResponse(personalizedResponse, domainInfo);
      
      return {
        text: responseWithCitations,
        sources: domainInfo.sources,
        confidence: domainInfo.confidence,
        domain
      };
    } catch (error) {
      console.error(`Error generating ${domain} advice:`, error);
      
      // Fallback to general response
      return this.generateEnhancedResponse(query, familyId, familyContext);
    }
  }

  /**
   * Determine if a query would benefit from research-backed response
   * @param {string} query - User query
   * @returns {object} Analysis of query type
   */
  analyzeQueryForResearch(query) {
    // Normalize query
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check for explicit research requests
    const researchPatterns = [
      /research/i,
      /study/i,
      /studies/i,
      /evidence/i,
      /what does .* show/i,
      /according to/i,
      /best practice/i
    ];
    
    const isExplicitResearch = researchPatterns.some(pattern => pattern.test(normalizedQuery));
    
    // Check for domain-specific queries
    let domain = null;
    
    if (/parent|child|kid|development|milestone|raise/i.test(normalizedQuery)) {
      domain = 'parenting';
    } else if (/relationship|partner|spouse|marriage|couple/i.test(normalizedQuery)) {
      domain = 'relationship';
    } else if (/balance|workload|task|chore|responsibility|division/i.test(normalizedQuery)) {
      domain = 'workload';
    } else if (/mental|emotional|stress|anxiety|burnout/i.test(normalizedQuery)) {
      domain = 'wellbeing';
    } else if (/family|routine|system|household/i.test(normalizedQuery)) {
      domain = 'family-management';
    }
    
    // Check if it's a question
    const isQuestion = normalizedQuery.includes('?') || 
                       /^(?:how|what|why|when|where|who|can|could|would|should)/i.test(normalizedQuery);
    
    // Check if it's advice-seeking
    const isAdviceSeeking = /advice|suggest|recommend|help|idea|tip/i.test(normalizedQuery);
    
    return {
      isExplicitResearch,
      domain,
      isQuestion,
      isAdviceSeeking,
      wouldBenefitFromResearch: isExplicitResearch || 
                               (isQuestion && domain) || 
                               (isAdviceSeeking && domain)
    };
  }

  /**
   * Get domain-specific knowledge from the knowledge base
   * @param {string} domain - Knowledge domain
   * @returns {object} Domain knowledge
   */
  getDomainKnowledge(domain) {
    switch (domain) {
      case 'parenting':
        return {
          content: knowledgeBase.whitepapers.childDevelopment,
          strategies: knowledgeBase.whitepapers.parentingStrategies
        };
        
      case 'relationship':
        return {
          research: knowledgeBase.whitepapers.research.relationshipImpact,
          strategies: {
            communication: "Open and honest communication is the foundation of relationship health.",
            appreciation: "Regular expressions of gratitude strengthen bonds and increase satisfaction.",
            qualityTime: "Dedicated time together, even in small amounts, maintains connection.",
            teamwork: "Approaching household management as equal partners reduces friction."
          }
        };
        
      case 'workload':
        return {
          research: knowledgeBase.whitepapers.research.mentalLoad,
          categories: knowledgeBase.whitepapers.taskCategories,
          methodology: knowledgeBase.whitepapers.methodology.taskWeighting
        };
        
      default:
        return {};
    }
  }
}

export default new ResearchAdvisoryService();   