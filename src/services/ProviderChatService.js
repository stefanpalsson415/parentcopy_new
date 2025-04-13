// src/services/ProviderChatService.js
import ProviderService from './ProviderService';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

class ProviderChatService {
  constructor() {
    this.providerTypes = {
      'doctor': 'medical',
      'pediatrician': 'medical',
      'dentist': 'medical',
      'specialist': 'medical',
      'therapist': 'medical',
      'psychiatrist': 'medical',
      'psychologist': 'medical',
      
      'teacher': 'education',
      'tutor': 'education',
      'instructor': 'education',
      'coach': 'education',
      
      'babysitter': 'childcare',
      'nanny': 'childcare',
      'daycare': 'childcare',
      
      'plumber': 'services',
      'electrician': 'services',
      'cleaner': 'services',
      'gardener': 'services'
    };
  }

  /**
   * Process a provider creation request from chat
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Processing result
   */
  async processProviderRequest(message, entities, familyId) {
    try {
      // Extract provider details from entities and message
      const providerDetails = this.extractProviderDetails(message, entities);
      
      if (!providerDetails.name) {
        return { 
          success: false, 
          step: 'extraction',
          missingInfo: ['name'],
          message: "I couldn't determine the provider's name. Can you please provide their name?"
        };
      }
      
      // Save provider to database
      const result = await ProviderService.saveProvider(familyId, providerDetails);
      
      if (result.success) {
        // Trigger provider directory refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('provider-added'));
        }
        
        // Format success message based on provider type
        let successMessage = '';
        if (providerDetails.type === 'medical') {
          successMessage = `I've added Dr. ${providerDetails.name} to your healthcare providers.`;
        } else if (providerDetails.type === 'education') {
          successMessage = `I've added ${providerDetails.name} to your education providers.`;
        } else {
          successMessage = `I've added ${providerDetails.name} to your ${providerDetails.type} providers.`;
        }
        
        // Add suggestions for next steps
        if (!providerDetails.phone && !providerDetails.email) {
          successMessage += " Would you like to add contact information for them?";
        } else if (!providerDetails.address) {
          successMessage += " Would you like to add their address or any other details?";
        }
        
        return { 
          success: true, 
          providerId: result.providerId,
          providerDetails,
          isNew: result.isNew,
          message: successMessage
        };
      } else {
        throw new Error(result.error || "Failed to create provider");
      }
    } catch (error) {
      console.error("Error processing provider request:", error);
      return { 
        success: false, 
        error: error.message,
        message: "I encountered an issue adding this provider. Could you please try again with more details?"
      };
    }
  }

  /**
   * Extract provider details from message and entities
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @returns {object} Provider details
   */
  extractProviderDetails(message, entities) {
    const providerDetails = {
      name: null,
      type: 'medical', // Default type
      specialty: '',
      phone: '',
      email: '',
      address: '',
      notes: message // Keep original message as notes
    };
    
    // Extract provider name
    if (entities.providerName && entities.providerName.length > 0) {
      providerDetails.name = entities.providerName[0];
    } else {
      // Try to extract name using common patterns
      const namePatterns = [
        /(?:name is|named|called)\s+([A-Za-z]+(?: [A-Za-z]+){0,2})/i,
        /([A-Za-z]+(?: [A-Za-z]+){0,2})\s+is\s+(?:a|my|our)\s+(?:doctor|pediatrician|dentist|therapist|teacher)/i,
        /(?:doctor|pediatrician|dentist|therapist|teacher)\s+([A-Za-z]+(?: [A-Za-z]+){0,2})/i
      ];
      
      for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          providerDetails.name = match[1].trim();
          break;
        }
      }
    }
    
    // Extract provider type based on keywords
    if (entities.providerSpecialty && entities.providerSpecialty.length > 0) {
      const specialty = entities.providerSpecialty[0].toLowerCase();
      
      // Set specialty
      providerDetails.specialty = entities.providerSpecialty[0];
      
      // Set provider type based on specialty
      for (const [keyword, type] of Object.entries(this.providerTypes)) {
        if (specialty.includes(keyword)) {
          providerDetails.type = type;
          break;
        }
      }
    }
    
    // Extract email if present
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch && emailMatch[1]) {
      providerDetails.email = emailMatch[1].trim();
    }
    
    // Extract phone if present
    const phoneMatch = message.match(/(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\d{10})/);
    if (phoneMatch && phoneMatch[1]) {
      providerDetails.phone = phoneMatch[1].trim();
    }
    
    // Extract address if present
    if (entities.location && entities.location.length > 0) {
      providerDetails.address = entities.location[0];
    }
    
    return providerDetails;
  }

  /**
   * Find providers matching criteria
   * @param {string} familyId - Family ID
   * @param {object} criteria - Search criteria
   * @returns {Promise<Array>} Matching providers
   */
  async findProviders(familyId, criteria = {}) {
    try {
      let providersQuery = query(
        collection(db, "providers"),
        where("familyId", "==", familyId)
      );
      
      // Add type filter if specified
      if (criteria.type) {
        providersQuery = query(
          providersQuery, 
          where("type", "==", criteria.type)
        );
      }
      
      const querySnapshot = await getDocs(providersQuery);
      const providers = [];
      
      querySnapshot.forEach((doc) => {
        providers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Apply name/specialty filter if specified
      if (criteria.searchTerm) {
        const searchTerm = criteria.searchTerm.toLowerCase();
        return providers.filter(provider => 
          provider.name?.toLowerCase().includes(searchTerm) ||
          provider.specialty?.toLowerCase().includes(searchTerm)
        );
      }
      
      return providers;
    } catch (error) {
      console.error("Error finding providers:", error);
      throw error;
    }
  }
}

export default new ProviderChatService();