// src/services/ChatPersistenceService.js
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  getDoc,
  setDoc, 
  doc,
  deleteDoc,
  limit, 
  startAfter,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

class ChatPersistenceService {
  constructor() {
    this.messageCache = {};
    this.lastDocumentSnapshot = {};
  }
  
  /**
 * Save a chat message with enhanced metadata
 * @param {object} message - The message to save
 * @returns {Promise<object>} Result with success status and message ID
 */
 // NEW CODE
// Current code in ChatPersistenceService.js (around line 15-120)
// REPLACE WITH:

async saveMessage(message) {
  try {
    // Better message validation
    if (!message) {
      console.error("Cannot save null/undefined message");
      return { success: false, error: "Invalid message object" };
    }
    
    // CRITICAL: Explicit validation for message text
    if (!message.text) {
      console.error("Attempted to save message with undefined text");
      
      // If this is an AI response (sender is 'allie'), use a proper fallback
      if (message.sender === 'allie') {
        message.text = "I'm sorry, I couldn't generate a response right now. Please try again in a moment.";
        console.warn("Using fallback text for empty AI response");
      } else {
        // For user messages, we should reject saving if text is empty
        return { success: false, error: "Cannot save message with empty text" };
      }
    } else if (message.text.trim() === '') {
      // Explicit handling for empty strings
      console.error("Attempted to save message with empty text string");
      
      if (message.sender === 'allie') {
        message.text = "I'm sorry, I couldn't generate a response right now. Please try again in a moment.";
        console.warn("Using fallback text for empty AI response");
      } else {
        return { success: false, error: "Cannot save message with empty text" };
      }
    }
    
    // Improved logging that won't show "undefined..."
    console.log("ChatPersistenceService.saveMessage called with:", {
      text: message.text ? `${message.text.substring(0, 50)}...` : "[No text content]",
      sender: message.sender || "unknown",
      familyId: message.familyId,
      timestamp: message.timestamp || new Date().toISOString()
    });
    
    if (!message.familyId) {
      console.error("Cannot save message without familyId", message);
      return { success: false, error: "Missing familyId" };
    }
    
    // Ensure required fields exist with better fallbacks
    const enhancedMessage = {
      ...message,
      text: message.text, // We've already validated this above
      sender: message.sender || "unknown",
      createdAt: serverTimestamp(),
      timestamp: message.timestamp || new Date().toISOString(),
      // Add a searchable field for full-text search
      searchText: (message.text || "").toLowerCase(),
      // Add message version for future format compatibility
      messageVersion: 2,
      // Add message hash for deduplication if needed
      messageHash: this.generateMessageHash(message)
    };
    
    // Save to Firestore with retry logic
    let docRef = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !docRef) {
      try {
        docRef = await addDoc(collection(db, "chatMessages"), enhancedMessage);
      } catch (saveError) {
        retryCount++;
        console.warn(`Chat message save attempt ${retryCount} failed:`, saveError);
        if (retryCount >= maxRetries) throw saveError;
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, retryCount)));
      }
    }
    
    // Update family's last message timestamp
    try {
      const familyRef = doc(db, "families", message.familyId);
      await setDoc(familyRef, {
        lastChatActivity: serverTimestamp(),
        lastMessage: {
          text: message.text?.substring(0, 100) || "",
          sender: message.sender,
          timestamp: serverTimestamp()
        }
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to update family's last chat activity:", e);
      // Non-critical error, don't fail the entire save operation
    }
    
    console.log(`Message successfully saved with ID: ${docRef.id}`);
    
    // Update cache immediately for fast local access
    this.addToMessageCache(message.familyId, {
      id: docRef.id,
      ...enhancedMessage
    });
    
    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, error: error.message };
  }
}

  // In ChatPersistenceService.js after saveMessage
async deleteMessage(messageId, familyId) {
  try {
    if (!messageId) {
      return { success: false, error: "Message ID is required" };
    }
    
    console.log(`Deleting message ${messageId} from family ${familyId}`);
    
    // Delete from Firestore
    await deleteDoc(doc(db, "chatMessages", messageId));
    
    // Remove from cache if exists
    if (this.messageCache[familyId]) {
      this.messageCache[familyId] = this.messageCache[familyId].filter(
        msg => msg.id !== messageId
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: error.message };
  }
}
  
  /**
   * Helper method to add message to local cache
   * @param {string} familyId - Family ID
   * @param {Object} message - Message to add to cache
   * @private
   */
  addToMessageCache(familyId, message) {
    if (!this.messageCache[familyId]) {
      this.messageCache[familyId] = [];
    }
    
    // Add to cache if not already present
    const messageExists = this.messageCache[familyId].some(m => 
      m.id === message.id || m.messageHash === message.messageHash
    );
    
    if (!messageExists) {
      this.messageCache[familyId].push(message);
      // Sort by timestamp
      this.messageCache[familyId].sort((a, b) => {
        const timeA = new Date(a.timestamp);
        const timeB = new Date(b.timestamp);
        return timeA - timeB;
      });
    }
  }
  
  /**
   * Create a hash of the message for deduplication purposes
   * @param {object} message - The message
   * @returns {string} Hash representing the message
   */
  generateMessageHash(message) {
    // Simple hash function for messages
    try {
      const content = `${message.familyId}-${message.sender}-${message.text}-${message.timestamp}`;
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    } catch (e) {
      console.warn("Error generating message hash:", e);
      return Date.now().toString(16);
    }
  }

/**
 * Helper method to add message to local cache
 * @param {string} familyId - Family ID
 * @param {Object} message - Message to add to cache
 * @private
 */
addToMessageCache(familyId, message) {
  if (!this.messageCache[familyId]) {
    this.messageCache[familyId] = [];
  }
  
  // Add to cache if not already present
  const messageExists = this.messageCache[familyId].some(m => 
    m.id === message.id || m.messageHash === message.messageHash
  );
  
  if (!messageExists) {
    this.messageCache[familyId].push(message);
    // Sort by timestamp
    this.messageCache[familyId].sort((a, b) => {
      const timeA = new Date(a.timestamp);
      const timeB = new Date(b.timestamp);
      return timeA - timeB;
    });
  }
}
  
  /**
   * Load messages with pagination support
   * @param {string} familyId - Family ID
   * @param {object} options - Loading options
   * @returns {Promise<object>} Object with messages array and pagination info
   */
  async loadMessages(familyId, options = {}) {
    try {
      if (!familyId) {
        console.warn("No familyId provided to loadMessages");
        return { messages: [], hasMore: false };
      }
      
      const { 
        pageSize = 25,
        loadMore = false,
        includeMetadata = false,
        startDate = null,
        endDate = null
      } = options;
      
      console.log(`Loading up to ${pageSize} messages for family ${familyId}${loadMore ? ' (loading more)' : ''}`);
      
      // Use a simpler query that doesn't require complex indexes
      // This is more reliable across browser refreshes
      const messagesQuery = query(
        collection(db, "chatMessages"),
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      let allMessages = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        let timestamp;
        
        // Handle various timestamp formats
        if (data.timestamp instanceof Timestamp) {
          timestamp = data.timestamp.toDate();
        } else if (data.createdAt instanceof Timestamp) {
          timestamp = data.createdAt.toDate();
        } else {
          timestamp = new Date(data.timestamp || data.createdAt || Date.now());
        }
        
        // Remove metadata if not requested
        if (!includeMetadata && data.metadata) {
          delete data.metadata;
        }
        
        allMessages.push({
          id: doc.id,
          ...data,
          timestamp: timestamp.toISOString()
        });
      });
      
      // Sort by timestamp (newest first for pagination logic)
      allMessages.sort((a, b) => {
        const aTime = new Date(a.timestamp);
        const bTime = new Date(b.timestamp);
        return bTime - aTime; // Descending for pagination
      });
      
      // Handle pagination
      let paginatedMessages = [];
      
      if (loadMore && this.messageCache[familyId]) {
        // Find the oldest message we already have
        const oldestMessage = this.messageCache[familyId][0];
        const oldestTimestamp = new Date(oldestMessage.timestamp);
        
        // Get messages older than our oldest message
        const olderMessages = allMessages.filter(msg => 
          new Date(msg.timestamp) < oldestTimestamp
        );
        
        // Take the next page of older messages
        paginatedMessages = olderMessages.slice(0, pageSize);
        
        // Update cache - prepend older messages
        this.messageCache[familyId] = [...paginatedMessages, ...this.messageCache[familyId]];
      } else {
        // Initial load - take the newest messages
        paginatedMessages = allMessages.slice(0, pageSize);
        this.messageCache[familyId] = paginatedMessages;
      }
      
      // For display: sort in ascending order (oldest first)
      const displayMessages = [...paginatedMessages].sort((a, b) => {
        const aTime = new Date(a.timestamp);
        const bTime = new Date(b.timestamp);
        return aTime - bTime; // Ascending for display
      });
      
      console.log(`Loaded ${displayMessages.length} messages for family ${familyId}`);
      
      return {
        messages: displayMessages,
        hasMore: allMessages.length > this.messageCache[familyId].length
      };
    } catch (error) {
      console.error("Error loading messages:", error);
      return { messages: [], hasMore: false, error: error.message };
    }
  }
  
  /**
   * Search for messages containing specific text
   * @param {string} familyId - Family ID
   * @param {string} searchText - Text to search for
   * @returns {Promise<Array>} Array of matching messages
   */
  async searchMessages(familyId, searchText) {
    try {
      if (!familyId || !searchText) {
        return [];
      }
      
      // Since Firestore doesn't support full-text search natively,
      // we'll do a simple contains search on the searchText field
      const searchLower = searchText.toLowerCase();
      
      // Get all messages for the family
      const messagesQuery = query(
        collection(db, "chatMessages"),
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      const results = [];
      
      // Filter client-side
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.text && data.text.toLowerCase().includes(searchLower)) {
          let timestamp;
          if (data.timestamp instanceof Timestamp) {
            timestamp = data.timestamp.toDate();
          } else {
            timestamp = new Date(data.timestamp || data.createdAt || Date.now());
          }
          
          results.push({
            id: doc.id,
            ...data,
            timestamp: timestamp.toISOString()
          });
        }
      });
      
      // Sort by relevance and recency
      results.sort((a, b) => {
        // First prioritize exact matches
        const aExact = a.text.toLowerCase() === searchLower;
        const bExact = b.text.toLowerCase() === searchLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize starts with
        const aStartsWith = a.text.toLowerCase().startsWith(searchLower);
        const bStartsWith = b.text.toLowerCase().startsWith(searchLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Finally sort by recency
        const aTime = new Date(a.timestamp);
        const bTime = new Date(b.timestamp);
        
        return bTime - aTime; // Most recent first
      });
      
      return results.slice(0, 20); // Limit to 20 results
    } catch (error) {
      console.error("Error searching messages:", error);
      return [];
    }
  }
  
  /**
   * Formats chat messages for Claude API
   * @param {Array} messages - Chat messages
   * @returns {Array} Claude-formatted messages
   */
  formatMessagesForClaude(messages) {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    // Convert our message format to Claude's format
    return messages.map(msg => ({
      role: msg.sender === 'allie' ? 'assistant' : 'user',
      content: msg.text
    }));
  }
  
  /**
   * Create a hash of the message for deduplication purposes
   * @param {object} message - The message
   * @returns {string} Hash representing the message
   */
  generateMessageHash(message) {
    // Simple hash function for messages
    try {
      const content = `${message.familyId}-${message.sender}-${message.text}-${message.timestamp}`;
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    } catch (e) {
      console.warn("Error generating message hash:", e);
      return Date.now().toString(16);
    }
  }
}

export default new ChatPersistenceService();