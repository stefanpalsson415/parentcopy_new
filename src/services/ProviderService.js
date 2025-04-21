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
      /(?:doctor|dr\.?)\s+([a-z\s\.]+)/i,
      /add\s+(?:doctor|dr\.?)\s+([a-z\s\.]+)/i,
      /add\s+([a-z\s\.]+)\s+to\s+providers/i,
      /add\s+([a-z\s\.]+)\s+to\s+provider/i,
      /add\s+([a-z\s\.]+)\s+as\s+(?:a|our)\s+(?:doctor|dentist|provider)/i,
      /(?:teacher|instructor|provider)\s+([a-z\s\.]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        providerInfo.name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        break;
      }
    }

    // Extract provider type/specialty
    if (message.toLowerCase().includes("teacher")) {
      providerInfo.type = "education";
      
      if (message.toLowerCase().includes("guitar")) {
        providerInfo.specialty = "Guitar Teacher";
      } else if (message.toLowerCase().includes("piano")) {
        providerInfo.specialty = "Piano Teacher";
      } else if (message.toLowerCase().includes("music")) {
        providerInfo.specialty = "Music Teacher";
      } else {
        providerInfo.specialty = "Teacher";
      }
    } else if (message.toLowerCase().includes("coach") || message.toLowerCase().includes("instructor")) {
      providerInfo.type = "activity";
      providerInfo.specialty = "Coach";
    } else {
      // Medical professionals
      const specialtyPatterns = [
        { pattern: /(?:dentist|dental)/i, label: 'Dentist' },
        { pattern: /(?:pediatrician|pediatric)/i, label: 'Pediatrician' },
        { pattern: /(?:therapist|therapy)/i, label: 'Therapist' },
        { pattern: /(?:optometrist|eye\s+doctor)/i, label: 'Optometrist' }
      ];

      for (const { pattern, label } of specialtyPatterns) {
        if (pattern.test(message)) {
          providerInfo.specialty = label;
          break;
        }
      }
    }

    // Extract email if present
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
      providerInfo.email = emailMatch[1];
    }
    
    // Extract phone if present
    const phoneMatch = message.match(/(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) {
      providerInfo.phone = phoneMatch[0];
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

    // If name is still null, try one more time with a broader pattern
    if (!providerInfo.name) {
      const fullNamePattern = /([A-Z][a-z]+(?: [A-Z][a-z]+)*)/;
      const match = message.match(fullNamePattern);
      if (match && match[1]) {
        providerInfo.name = match[1];
      } else {
        providerInfo.name = "Unknown Provider";
      }
    }

    return providerInfo;
  } catch (error) {
    console.error("Error extracting provider info:", error);
    return {
      name: "Unknown Provider",
      type: "medical",
      specialty: "",
      email: "",
      phone: "",
      address: "",
      notes: message // Use original message as notes
    };
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