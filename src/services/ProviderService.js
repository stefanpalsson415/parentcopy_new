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

// NEW CODE for src/services/ProviderService.js
async saveProvider(familyId, providerData) {
  try {
    if (!familyId) {
      console.error("❌ No family ID provided for saving provider");
      return { success: false, error: "Family ID is required" };
    }
    
    // DIAGNOSTIC: Log all inputs clearly
    console.log("🔍 Provider save called with:", {
      familyId,
      providerData: {
        name: providerData?.name || "(missing)",
        type: providerData?.type || "(missing)",
        specialty: providerData?.specialty || "(none)",
        email: providerData?.email || "(none)",
        phone: providerData?.phone || "(none)",
      }
    });
    
    // SIMPLIFY: Remove the complex locking mechanism that might be causing issues
    // Instead just log that we're starting a save
    console.log(`✅ Starting direct provider save for family: ${familyId}`);
    
    // ALWAYS use "providers" collection
    const collectionName = "providers";
    const providersRef = collection(db, collectionName);
    
    // DIAGNOSTIC: Log the Firebase reference we're using
    console.log(`📁 Using Firestore collection: ${collectionName}`);
    
    // Prepare provider data with required fields
    const providerToAdd = {
      ...providerData,
      name: providerData.name || "Unnamed Provider",
      type: providerData.type || "medical",
      familyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // DIAGNOSTIC: Log the final data being sent to Firebase
    console.log("📤 Data being sent to Firebase:", providerToAdd);
    
    // Simple direct approach - create a new provider
    let providerId;
    try {
      const newProviderRef = await addDoc(providersRef, providerToAdd);
      providerId = newProviderRef.id;
      console.log(`✅ Created new provider with ID: ${providerId}`);
    } catch (createError) {
      // Full error logging
      console.error("❌ Firebase addDoc operation failed:", createError);
      console.error("Error details:", {
        code: createError.code,
        message: createError.message,
        stack: createError.stack,
      });
      throw createError;
    }
    
    // Explicit delay to ensure Firebase has time to process
    console.log(`⏱️ Waiting 500ms for Firebase to complete...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the provider was created by reading it back
    try {
      const providerDoc = await getDoc(doc(db, collectionName, providerId));
      if (providerDoc.exists()) {
        console.log(`✅ Verified provider exists in Firestore: ${providerId}`);
      } else {
        console.error(`❌ Provider verification failed - document not found after creation: ${providerId}`);
      }
    } catch (verifyError) {
      console.warn(`⚠️ Could not verify provider creation (but may still have worked):`, verifyError);
    }
    
    // Dispatch events to update UI components
    console.log(`🔔 Dispatching provider-added event for ID: ${providerId}`);
    window.dispatchEvent(new CustomEvent('provider-added', {
      detail: {
        providerId,
        isNew: true,
        provider: providerToAdd
      }
    }));
    
    console.log(`🔔 Dispatching directory-refresh-needed event`);
    window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
    
    // Second refresh with delay for components that might load later
    setTimeout(() => {
      console.log(`🔔 Dispatching delayed force-data-refresh event`);
      window.dispatchEvent(new CustomEvent('force-data-refresh'));
    }, 1000);
    
    return { 
      success: true, 
      providerId,
      isNew: true
    };
  } catch (error) {
    console.error("❌ CRITICAL ERROR saving provider:", error);
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      familyId: familyId,
      providerName: providerData?.name || "Unknown"
    });
    
    return { success: false, error: error.message };
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