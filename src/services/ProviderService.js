// src/services/ProviderService.js
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  getDoc,  // Added this import
  doc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

class ProviderService {
  constructor() {
    this.db = db;
  }

  // Debug method to test provider creation directly
async testDirectProviderCreation(familyId) {
  try {
    console.log("🧪 RUNNING DIRECT PROVIDER CREATION TEST");
    
    if (!familyId) {
      console.error("❌ No family ID provided for test");
      return false;
    }
    
    // Create test provider
    const testProvider = {
      name: "Test Provider " + new Date().toISOString().substring(11, 19),
      type: "education",
      specialty: "Test Teacher",
      email: "test@example.com",
      familyId: familyId
    };
    
    console.log("📝 Test provider data:", testProvider);
    
    // Direct Firebase approach
    const providersRef = collection(this.db, "providers");
    console.log("📁 Using collection:", providersRef.path);
    
    const docRef = await addDoc(providersRef, {
      ...testProvider,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("✅ Test provider created with ID:", docRef.id);
    
    // Verify creation
    const docSnapshot = await getDoc(doc(this.db, "providers", docRef.id));
    
    if (docSnapshot.exists()) {
      console.log("✅ Verified provider exists in Firestore");
      // Clean up by deleting the test provider
      await deleteDoc(doc(this.db, "providers", docRef.id));
      console.log("🧹 Test provider cleaned up");
      return true;
    } else {
      console.error("❌ Provider verification failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Test provider creation failed:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
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

 async saveProvider(familyId, providerData) {
  try {
    if (!familyId) {
      console.error("❌ No family ID provided");
      return { success: false, error: "Family ID is required" };
    }
    
    if (!providerData || !providerData.name) {
      console.error("❌ No provider name provided");
      return { success: false, error: "Provider name is required" };
    }
    
    console.log("💾 SIMPLIFIED PROVIDER SAVE STARTING");
    console.log("📝 Input data:", {
      familyId,
      provider: {
        name: providerData.name,
        type: providerData.type || "medical",
        specialty: providerData.specialty || "",
        email: providerData.email || ""
      }
    });
    
    // Prepare provider data with required fields
    const providerToAdd = {
      ...providerData,
      name: providerData.name,
      type: providerData.type || "medical",
      familyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // DIRECT FIRESTORE: Using a single consistent collection name 
    const providersRef = collection(db, "providers");
    
    // Simplest possible approach - add the document to the collection
    const docRef = await addDoc(providersRef, providerToAdd);
    const providerId = docRef.id;
    
    console.log(`✅ Provider added successfully with ID: ${providerId}`);
    
    // Trigger UI updates with a reliable approach
    if (typeof window !== 'undefined') {
      // Single robust event dispatch that all components can listen for
      console.log("🔔 Dispatching provider-added event");
      const event = new CustomEvent('provider-added', {
        detail: {
          providerId,
          providerName: providerData.name,
          isNew: true
        }
      });
      window.dispatchEvent(event);
      
      // Force other refreshes if needed
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
        window.dispatchEvent(new CustomEvent('force-data-refresh'));
      }, 500);
    }
    
    return { 
      success: true, 
      providerId,
      isNew: true,
      provider: providerToAdd
    };
  } catch (error) {
    // Better error logging for debugging
    console.error("❌ CRITICAL ERROR in saveProvider:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code || 'unknown',
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: error.message || "Unknown Firebase error" 
    };
  }
}
  

/**
 * Delete a provider from the database
 * @param {string} familyId - Family ID
 * @param {string} providerId - Provider ID to delete
 * @returns {Promise<Object>} Result with success status
 */
async deleteProvider(familyId, providerId) {
  try {
    if (!familyId || !providerId) {
      console.error("Missing familyId or providerId in deleteProvider");
      return { success: false, error: "Family ID and Provider ID are required" };
    }
    
    console.log(`Deleting provider ${providerId} for family ${familyId}`);
    
    // Delete from Firestore
    await deleteDoc(doc(db, "providers", providerId));
    
    console.log("Provider deleted successfully");
    
    // Dispatch events to update UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('provider-added'));
      window.dispatchEvent(new CustomEvent('force-data-refresh'));
      
      // Add delayed refresh to ensure UI updates
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
      }, 500);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting provider:", error);
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
      // CRITICAL FIX: Use "providers" collection to match where we save data
      const providersRef = collection(this.db, "providers");
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
      
      console.log(`Retrieved ${providers.length} providers for family ${familyId}`);
      return providers;
    } catch (error) {
      console.error("Error getting providers:", error);
      return [];
    }
  }
}

export default new ProviderService();