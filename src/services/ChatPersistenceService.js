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
     * @returns {Promise<Array>} Array of messages
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
        
        // Base query
        let queryConstraints = [
          where("familyId", "==", familyId),
          orderBy("timestamp", "desc"),
          limit(pageSize)
        ];
        
        // Add date filters if provided
        if (startDate) {
          queryConstraints.push(where("timestamp", ">=", startDate));
        }
        
        if (endDate) {
          queryConstraints.push(where("timestamp", "<=", endDate));
        }
        
        // Add pagination if loading more
        if (loadMore && this.lastDocumentSnapshot[familyId]) {
          queryConstraints.push(startAfter(this.lastDocumentSnapshot[familyId]));
        }
        
        const q = query(collection(db, "chatMessages"), ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
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
          
          messages.push({
            id: doc.id,
            ...messageData,
            // Ensure timestamp is serializable
            timestamp: messageData.timestamp?.toDate?.() || new Date(messageData.timestamp)
          });
        });
        
        // Sort messages in ascending order (oldest first)
        messages.sort((a, b) => {
          const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
          const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
          return aTime - bTime;
        });
        
        console.log(`Loaded ${messages.length} messages for family ${familyId}`);
        
        // Return messages with pagination info
        return { 
          messages,
          hasMore: messages.length === pageSize
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
        
        // First try messages that start with the search term (better matches)
        const startsWithQuery = query(
          collection(db, "chatMessages"),
          where("familyId", "==", familyId),
          where("searchText", ">=", searchLower),
          where("searchText", "<=", searchLower + "\uf8ff"),
          limit(10)
        );
        
        const startsWithSnapshot = await getDocs(startsWithQuery);
        const startsWithResults = [];
        
        startsWithSnapshot.forEach(doc => {
          startsWithResults.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // If we have enough results, return them
        if (startsWithResults.length >= 5) {
          return startsWithResults;
        }
        
        // Otherwise, try a broader search (all messages that contain the search term)
        // This requires client-side filtering since Firestore doesn't have contains
        const allMessagesQuery = query(
          collection(db, "chatMessages"),
          where("familyId", "==", familyId),
          orderBy("timestamp", "desc"),
          limit(100)
        );
        
        const allMessagesSnapshot = await getDocs(allMessagesQuery);
        const allResults = [];
        
        allMessagesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.text && data.text.toLowerCase().includes(searchLower)) {
            allResults.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        // Combine and sort results, removing duplicates
        const combinedResults = [...startsWithResults];
        
        // Add items from allResults that aren't already in startsWithResults
        allResults.forEach(result => {
          if (!combinedResults.some(item => item.id === result.id)) {
            combinedResults.push(result);
          }
        });
        
        // Sort by relevance and recency
        combinedResults.sort((a, b) => {
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
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
          
          return bTime - aTime; // Most recent first
        });
        
        return combinedResults.slice(0, 20); // Limit to 20 results
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