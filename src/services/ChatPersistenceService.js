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
  async saveMessage(message) {
    try {
      if (!message.familyId) {
        console.error("Cannot save message without familyId", message);
        return { success: false, error: "Missing familyId" };
      }
      
      // Ensure required fields exist
      const enhancedMessage = {
        ...message,
        text: message.text || "",
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
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, "chatMessages"), enhancedMessage);
      
      // Update family's last message timestamp
      try {
        const familyRef = doc(db, "families", message.familyId);
        await setDoc(familyRef, {
          lastChatActivity: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn("Failed to update family's last chat activity:", e);
        // Non-critical error, don't fail the entire save operation
      }
      
      console.log(`Message saved with ID: ${docRef.id}`);
      return { success: true, messageId: docRef.id };
    } catch (error) {
      console.error("Error saving message:", error);
      return { success: false, error: error.message };
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
      
      // Create a simpler query to avoid index issues
      let messagesQuery;
      
      try {
        // First try with a simplified query to avoid indexing issues
        messagesQuery = query(
          collection(db, "chatMessages"),
          where("familyId", "==", familyId),
          orderBy("createdAt", "desc"), // Use createdAt which is a server timestamp
          limit(pageSize)
        );
        
        // Add pagination if loading more
        if (loadMore && this.lastDocumentSnapshot[familyId]) {
          messagesQuery = query(
            collection(db, "chatMessages"),
            where("familyId", "==", familyId),
            orderBy("createdAt", "desc"),
            startAfter(this.lastDocumentSnapshot[familyId]),
            limit(pageSize)
          );
        }
        
        const querySnapshot = await getDocs(messagesQuery);
        
        // Save last document for pagination
        if (!querySnapshot.empty) {
          this.lastDocumentSnapshot[familyId] = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        
        const messages = [];
        querySnapshot.forEach((doc) => {
          const messageData = doc.data();
          
          // Remove metadata if not requested to reduce payload size
          if (!includeMetadata && messageData.metadata) {
            delete messageData.metadata;
          }
          
          // Ensure timestamp is a valid date
          let timestamp;
          if (messageData.timestamp instanceof Timestamp) {
            timestamp = messageData.timestamp.toDate();
          } else if (messageData.createdAt instanceof Timestamp) {
            timestamp = messageData.createdAt.toDate();
          } else {
            timestamp = new Date(messageData.timestamp || messageData.createdAt || Date.now());
          }
          
          messages.push({
            id: doc.id,
            ...messageData,
            timestamp: timestamp.toISOString()
          });
        });
        
        // Sort messages in ascending order (oldest first)
        messages.sort((a, b) => {
          const aTime = new Date(a.timestamp);
          const bTime = new Date(b.timestamp);
          return aTime - bTime;
        });
        
        console.log(`Loaded ${messages.length} messages for family ${familyId}`);
        
        // Return messages with pagination info
        return { 
          messages,
          hasMore: messages.length === pageSize
        };
      } catch (indexError) {
        console.warn("Error with initial query, trying fallback approach:", indexError);
        
        // Fallback approach: Get all messages and filter/sort client-side
        const fallbackQuery = query(
          collection(db, "chatMessages"),
          where("familyId", "==", familyId)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let allMessages = [];
        
        fallbackSnapshot.forEach(doc => {
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
          
          allMessages.push({
            id: doc.id,
            ...data,
            timestamp: timestamp.toISOString()
          });
        });
        
        // Sort by timestamp
        allMessages.sort((a, b) => {
          const aTime = new Date(a.timestamp);
          const bTime = new Date(b.timestamp);
          return aTime - bTime;
        });
        
        // Handle pagination client-side
        const startIndex = loadMore && this.messageCache[familyId] ? 
          this.messageCache[familyId].length : 0;
        
        const paginatedMessages = allMessages.slice(startIndex, startIndex + pageSize);
        
        // Update cache for next pagination
        if (loadMore) {
          this.messageCache[familyId] = [
            ...(this.messageCache[familyId] || []),
            ...paginatedMessages
          ];
        } else {
          this.messageCache[familyId] = paginatedMessages;
        }
        
        console.log(`Loaded ${paginatedMessages.length} messages using fallback approach`);
        
        return {
          messages: paginatedMessages,
          hasMore: paginatedMessages.length === pageSize
        };
      }
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