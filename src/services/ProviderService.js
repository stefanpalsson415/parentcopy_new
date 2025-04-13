// src/services/ProviderService.js
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

class ProviderService {
  constructor() {
    this.db = db;
  }

  /**
   * Extract provider details from a chat message
   * @param {string} message - The user's message
   * @returns {Object} Extracted provider information
   */
  extractProviderInfo(message) {
    // Initialize provider info object with default values
    const providerInfo = {
      name: null,
      type: 'medical',
      specialty: null,
      phone: null,
      email: null,
      address: null,
      notes: null
    };

    try {
      // Extract provider name - looking for patterns like "doctor [name]" or "add [name] to providers"
      const namePatterns = [
        /(?:doctor|dr\.?)\s+([a-z]+)/i,
        /add\s+(?:doctor|dr\.?)\s+([a-z]+)/i,
        /add\s+([a-z]+)\s+to\s+providers/i,
        /add\s+([a-z]+)\s+to\s+provider/i,
        /add\s+([a-z]+)\s+as\s+(?:a|our)\s+(?:doctor|dentist|provider)/i
      ];

      for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          providerInfo.name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          break;
        }
      }

      // Extract provider type/specialty
      const specialtyPatterns = [
        /(?:dentist|dental)/i,
        /(?:pediatrician|pediatric)/i,
        /(?:therapist|therapy)/i,
        /(?:optometrist|eye\s+doctor)/i,
        /(?:coach|coaching)/i,
        /(?:teacher|tutor)/i
      ];

      const specialtyLabels = [
        'Dentist', 'Pediatrician', 'Therapist', 'Optometrist', 'Coach', 'Teacher'
      ];

      for (let i = 0; i < specialtyPatterns.length; i++) {
        if (specialtyPatterns[i].test(message)) {
          providerInfo.specialty = specialtyLabels[i];
          
          // Also set type for non-medical providers
          if (i >= 4) {
            // Coach or Teacher
            providerInfo.type = i === 4 ? 'activity' : 'education';
          }
          break;
        }
      }

      // Extract location information using a variety of patterns
      const locationPatterns = [
        /in\s+([a-z\s]+)(?:,|\.|$)/i,
        /at\s+([a-z\s]+)(?:,|\.|$)/i,
        /from\s+([a-z\s]+)(?:,|\.|$)/i,
      ];

      for (const pattern of locationPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          providerInfo.address = match[1].trim();
          break;
        }
      }

      // Extract notes (often come after "who" or appears after provider description)
      const notesPatterns = [
        /who\s+(.+)$/i,
        /(?:dentist|doctor|provider|teacher|coach)\s+(?:who|that)\s+(.+)$/i
      ];

      for (const pattern of notesPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          providerInfo.notes = match[1].trim();
          break;
        }
      }

      return providerInfo;
    } catch (error) {
      console.error("Error extracting provider info:", error);
      return providerInfo;
    }
  }

  /**
   * Add or update a provider in the database
   * @param {string} familyId - Family ID
   * @param {Object} providerData - Provider information
   * @returns {Promise<Object>} Result with provider ID
   */
  async saveProvider(familyId, providerData) {
    try {
      // Add validation for required fields
      if (!providerData.name) {
        throw new Error("Provider name is required");
      }

      // Check if provider already exists (by name)
      const providersRef = collection(this.db, "healthcareProviders");
      const q = query(
        providersRef, 
        where("familyId", "==", familyId),
        where("name", "==", providerData.name)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing provider
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...providerData,
          updatedAt: serverTimestamp()
        });
        
        return {
          success: true,
          providerId: querySnapshot.docs[0].id,
          isNew: false
        };
      }
      
      // Add new provider
      const newProviderData = {
        ...providerData,
        familyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(providersRef, newProviderData);
      
      return {
        success: true,
        providerId: docRef.id,
        isNew: true
      };
    } catch (error) {
      console.error("Error saving provider:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all providers for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<Array>} Array of providers
   */
  async getProviders(familyId) {
    try {
      const providersRef = collection(this.db, "healthcareProviders");
      const q = query(
        providersRef, 
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(q);
      const providers = [];
      
      querySnapshot.forEach((doc) => {
        providers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return providers;
    } catch (error) {
      console.error("Error getting providers:", error);
      return [];
    }
  }
}

export default new ProviderService();