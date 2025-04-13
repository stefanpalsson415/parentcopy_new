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
 // Add or update this method in src/services/ProviderService.js

// Replace in src/services/ProviderService.js
// Replace the existing saveProvider method (starting around line 110)

async saveProvider(familyId, providerData) {
    try {
      if (!familyId) {
        console.error("No family ID provided for saving provider");
        return { success: false, error: "Family ID is required" };
      }
      
      console.log("Saving provider for family:", familyId, providerData);
      
      // First check if this provider already exists (by name and type)
      const providersRef = collection(db, "healthcareProviders");
      const q = query(
        providersRef,
        where("familyId", "==", familyId),
        where("name", "==", providerData.name),
        where("type", "==", providerData.type || "medical")
      );
      
      const querySnapshot = await getDocs(q);
      let providerId;
      let isNew = true;
      
      if (!querySnapshot.empty) {
        // Update existing provider
        providerId = querySnapshot.docs[0].id;
        isNew = false;
        
        await updateDoc(doc(db, "healthcareProviders", providerId), {
          ...providerData,
          updatedAt: serverTimestamp()
        });
        
        console.log("Updated existing provider:", providerId);
      } else {
        // Create new provider
        const newProviderRef = await addDoc(providersRef, {
          ...providerData,
          familyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        providerId = newProviderRef.id;
        console.log("Created new provider:", providerId);
      }
      
      return { 
        success: true, 
        providerId,
        isNew
      };
    } catch (error) {
      console.error("Error saving provider:", error);
      return { success: false, error: error.message };
    }
  }
  
  // Extract provider information from text
  extractProviderInfo(text) {
    // Basic extraction of provider information from text
    const type = text.toLowerCase().includes("teacher") ? "education" :
                 text.toLowerCase().includes("dentist") ? "medical" :
                 text.toLowerCase().includes("coach") || text.toLowerCase().includes("instructor") ? "activity" :
                 "medical";
    
    const nameMatches = text.match(/(?:doctor|dr\.?|teacher|instructor|provider)\s+([a-z\s\.]+)/i);
    const name = nameMatches ? nameMatches[1] : "Unknown Provider";
    
    const specialty = text.toLowerCase().includes("pediatrician") ? "Pediatrician" : 
                     text.toLowerCase().includes("dentist") ? "Dentist" :
                     text.toLowerCase().includes("guitar") ? "Guitar Teacher" :
                     text.toLowerCase().includes("piano") ? "Piano Teacher" :
                     text.toLowerCase().includes("music") ? "Music Teacher" :
                     "";
    
    // Extract email if present
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const email = emailMatch ? emailMatch[1] : "";
    
    // Extract phone if present
    const phoneMatch = text.match(/(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : "";
    
    return {
      name,
      type,
      specialty,
      email,
      phone,
      address: "",
      notes: ""
    };
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