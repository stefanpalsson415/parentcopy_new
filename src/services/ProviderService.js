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
    
    // Create a unique key for this specific save operation
    const saveKey = `provider_save_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Check if any save operation is in progress, but only block for 5 seconds max
    if (window._providerSaveInProgress && 
        window._providerSaveTimestamp && 
        Date.now() - window._providerSaveTimestamp < 5000) {
      console.log("Provider save already in progress, deferring request");
      return { 
        success: false, 
        error: "Another save operation is in progress",
        deferred: true
      };
    }
    
    // Set new save timestamp and flag
    window._providerSaveInProgress = true;
    window._providerSaveTimestamp = Date.now();
    window._currentSaveKey = saveKey;
    
    console.log(`🔄 Starting provider save operation (${saveKey}) for family:`, familyId);
    
    try {
      // CRITICAL FIX: ALWAYS use "providers" collection for consistency
      const collectionName = "providers";
      
      // Log detailed provider info
      console.log("Provider details:", {
        name: providerData.name || "Unnamed Provider",
        type: providerData.type || "medical",
        specialty: providerData.specialty || "Unknown",
        email: providerData.email || "none",
        saveKey: saveKey
      });
      
      // First check if this provider already exists (by name and type)
      const providersRef = collection(db, collectionName);
      
      // IMPROVEMENT: More robust query to handle null/undefined values
      const queryParams = [where("familyId", "==", familyId)];
      
      if (providerData.name) {
        queryParams.push(where("name", "==", providerData.name));
      }
      
      if (providerData.type) {
        queryParams.push(where("type", "==", providerData.type));
      }
      
      const q = query(providersRef, ...queryParams);
      
      // Add timeout to prevent hanging
      const queryPromise = getDocs(q);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timed out")), 7000)
      );
      
      // Race the query against the timeout
      const querySnapshot = await Promise.race([queryPromise, timeoutPromise]);
      
      let providerId;
      let isNew = true;
      
      if (!querySnapshot.empty) {
        // Update existing provider
        providerId = querySnapshot.docs[0].id;
        isNew = false;
        
        console.log(`Updating existing provider ${providerId} in collection ${collectionName}`);
        
        // IMPROVEMENT: Add retry logic for update
        let updateSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!updateSuccess && attempts < maxAttempts) {
          try {
            attempts++;
            await updateDoc(doc(db, collectionName, providerId), {
              ...providerData,
              updatedAt: serverTimestamp()
            });
            updateSuccess = true;
            console.log(`Updated existing provider (attempt ${attempts}):`, providerId);
          } catch (updateError) {
            console.warn(`Update attempt ${attempts} failed:`, updateError);
            // Wait between retries
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 500 * attempts));
            } else {
              throw updateError; // Rethrow if all attempts fail
            }
          }
        }
      } else {
        // Create new provider
        console.log(`Creating new provider in collection ${collectionName}`);
        
        // IMPORTANT: Make sure we have required fields
        const providerToAdd = {
          ...providerData,
          name: providerData.name || "Unnamed Provider",
          type: providerData.type || "medical",
          familyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // IMPROVEMENT: Add retry logic for creation
        let createSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!createSuccess && attempts < maxAttempts) {
          try {
            attempts++;
            const newProviderRef = await addDoc(providersRef, providerToAdd);
            providerId = newProviderRef.id;
            createSuccess = true;
            console.log(`Created new provider with ID (attempt ${attempts}):`, providerId);
          } catch (createError) {
            console.warn(`Create attempt ${attempts} failed:`, createError);
            // Wait between retries
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 500 * attempts));
            } else {
              throw createError; // Rethrow if all attempts fail
            }
          }
        }
      }
      
      console.log(`Provider operation completed successfully (${saveKey})`);
      
      // IMPROVEMENT: Use setTimeout to ensure Firebase operation completes
      // before dispatching events
      setTimeout(() => {
        // Dispatch events to update UI components - but only once
        if (typeof window !== 'undefined') {
          console.log(`Dispatching provider events after successful save (${saveKey})`);
          
          // Use a unified event with all the information
          const providerEvent = new CustomEvent('provider-added', {
            detail: {
              providerId,
              isNew,
              provider: providerData
            }
          });
          window.dispatchEvent(providerEvent);
          
          // Also dispatch directory-refresh-needed 
          window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
          
          // Add another delayed refresh for any components that might load later
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-data-refresh'));
          }, 1500);
        }
      }, 500); // Give Firebase time to fully commit the changes
      
      return { 
        success: true, 
        providerId,
        isNew
      };
    } finally {
      // Ensure we clear the flag even if there's an error, but only if this is the current operation
      if (window._currentSaveKey === saveKey) {
        console.log(`Clearing provider save lock (${saveKey})`);
        window._providerSaveInProgress = false;
        window._currentSaveKey = null;
      } else {
        console.log(`Not clearing provider save lock - different operation in progress (${saveKey} vs ${window._currentSaveKey})`);
      }
    }
  } catch (error) {
    console.error("Error saving provider:", error);
    // Log more details about the error
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      familyId: familyId,
      providerName: providerData?.name || "Unknown"
    });
    
    // Auto-clear any stuck locks after 10 seconds
    setTimeout(() => {
      if (window._providerSaveInProgress) {
        console.log("Automatically clearing stuck provider save lock");
        window._providerSaveInProgress = false;
        window._currentSaveKey = null;
      }
    }, 10000);
    
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