// src/services/DocumentRetrievalService.js
import { db } from './firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';

/**
 * Service for intelligent document retrieval and searching
 */
class DocumentRetrievalService {
  constructor() {
    this.pageSize = 20; // Default items per page
    this.cachedSearches = {}; // Cache for recent searches
    this.documentIndex = {}; // In-memory index for quick filtering
  }

  /**
   * Search for documents with advanced filtering
   * @param {string} familyId - Family ID
   * @param {Object} filters - Search filters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with pagination info
   */
  async searchDocuments(familyId, filters = {}, options = {}) {
    try {
      // Generate cache key based on search parameters
      const cacheKey = this.generateCacheKey(familyId, filters, options);
      
      // Check cache first
      if (this.cachedSearches[cacheKey] && !options.bypassCache) {
        return this.cachedSearches[cacheKey];
      }
      
      // Base query: documents for this family
      let q = query(collection(db, "familyDocuments"), where("familyId", "==", familyId));
      
      // Apply filters
      if (filters.category && filters.category !== 'all') {
        q = query(q, where("category", "==", filters.category));
      }
      
      if (filters.childId) {
        q = query(q, where("childId", "==", filters.childId));
      }
      
      if (filters.tags && filters.tags.length > 0) {
        q = query(q, where("tags", "array-contains-any", filters.tags));
      }
      
      // Apply sorting
      const sortField = options.sortBy || "uploadedAt";
      const sortDirection = options.sortDirection || "desc";
      q = query(q, orderBy(sortField, sortDirection));
      
      // Apply pagination
      const pageSize = options.pageSize || this.pageSize;
      q = query(q, limit(pageSize));
      
      // Apply pagination cursor if provided
      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Client-side text search filtering
      let filteredDocuments = documents;
      if (filters.searchText && filters.searchText.trim() !== '') {
        const searchTerms = filters.searchText.toLowerCase().split(' ');
        
        filteredDocuments = documents.filter(doc => {
          const searchableText = `
            ${doc.title?.toLowerCase() || ''} 
            ${doc.description?.toLowerCase() || ''} 
            ${doc.extractedText?.toLowerCase() || ''} 
            ${doc.tags?.join(' ')?.toLowerCase() || ''}
          `;
          
          return searchTerms.every(term => searchableText.includes(term));
        });
      }
      
      // Prepare result with pagination info
      const result = {
        documents: filteredDocuments,
        pagination: {
          hasMore: documents.length === pageSize,
          pageSize,
          lastDoc: documents.length > 0 ? documents[documents.length - 1] : null,
          total: filteredDocuments.length // Note: this is just for the current page
        },
        filters: { ...filters },
        options: { ...options }
      };
      
      // Cache the result if it's a full page
      if (documents.length > 0) {
        this.cachedSearches[cacheKey] = result;
        
        // Limit cache size
        const cacheKeys = Object.keys(this.cachedSearches);
        if (cacheKeys.length > 20) {
          delete this.cachedSearches[cacheKeys[0]];
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error searching documents:", error);
      throw error;
    }
  }

  /**
   * Get recent documents
   * @param {string} familyId - Family ID
   * @param {number} count - Number of documents to retrieve
   * @returns {Promise<Array>} Recent documents
   */
  async getRecentDocuments(familyId, count = 5) {
    try {
      const q = query(
        collection(db, "familyDocuments"),
        where("familyId", "==", familyId),
        orderBy("uploadedAt", "desc"),
        limit(count)
      );
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return documents;
    } catch (error) {
      console.error("Error getting recent documents:", error);
      throw error;
    }
  }

  /**
   * Get documents for a specific child
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Child documents
   */
  async getChildDocuments(familyId, childId, options = {}) {
    try {
      let q = query(
        collection(db, "familyDocuments"),
        where("familyId", "==", familyId),
        where("childId", "==", childId)
      );
      
      // Apply category filter if provided
      if (options.category) {
        q = query(q, where("category", "==", options.category));
      }
      
      // Apply sorting
      const sortField = options.sortBy || "uploadedAt";
      const sortDirection = options.sortDirection || "desc";
      q = query(q, orderBy(sortField, sortDirection));
      
      // Apply limit if provided
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return documents;
    } catch (error) {
      console.error("Error getting child documents:", error);
      throw error;
    }
  }

  /**
   * Get documents by category
   * @param {string} familyId - Family ID
   * @param {string} category - Document category
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Categorized documents
   */
  async getDocumentsByCategory(familyId, category, options = {}) {
    try {
      let q = query(
        collection(db, "familyDocuments"),
        where("familyId", "==", familyId),
        where("category", "==", category)
      );
      
      // Apply sorting
      const sortField = options.sortBy || "uploadedAt";
      const sortDirection = options.sortDirection || "desc";
      q = query(q, orderBy(sortField, sortDirection));
      
      // Apply limit if provided
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return documents;
    } catch (error) {
      console.error("Error getting documents by category:", error);
      throw error;
    }
  }

  /**
   * Get related documents based on content, tags, and category
   * @param {string} familyId - Family ID
   * @param {Object} document - The source document
   * @param {number} limit - Maximum number of related documents
   * @returns {Promise<Array>} Related documents
   */
  async getRelatedDocuments(familyId, document, limit = 5) {
    try {
      // Strategy: 
      // 1. First match by category + tags (strongest relation)
      // 2. Then match by just category
      // 3. If needed, match by similar content
      
      // Start with documents in the same category with shared tags
      let relatedDocs = [];
      
      if (document.tags && document.tags.length > 0) {
        // Query for documents with the same category and shared tags
        const q1 = query(
          collection(db, "familyDocuments"),
          where("familyId", "==", familyId),
          where("category", "==", document.category),
          where("tags", "array-contains-any", document.tags)
        );
        
        const snapshot1 = await getDocs(q1);
        snapshot1.forEach((doc) => {
          if (doc.id !== document.id) { // Exclude the source document
            relatedDocs.push({
              id: doc.id,
              ...doc.data(),
              relationStrength: 'strong'
            });
          }
        });
      }
      
      // If we don't have enough documents yet, add more from the same category
      if (relatedDocs.length < limit) {
        const q2 = query(
          collection(db, "familyDocuments"),
          where("familyId", "==", familyId),
          where("category", "==", document.category),
          limit(limit * 2) // Get more than we need to account for filtering
        );
        
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach((doc) => {
          // Only add if not already included and not the source document
          if (doc.id !== document.id && !relatedDocs.some(d => d.id === doc.id)) {
            relatedDocs.push({
              id: doc.id,
              ...doc.data(),
              relationStrength: 'medium'
            });
          }
        });
      }
      
      // If we still don't have enough, we could do content similarity
      // This would require full-text search capabilities
      // For this implementation, we'll use a simple child association
      if (relatedDocs.length < limit && document.childId) {
        const q3 = query(
          collection(db, "familyDocuments"),
          where("familyId", "==", familyId),
          where("childId", "==", document.childId),
          limit(limit)
        );
        
        const snapshot3 = await getDocs(q3);
        snapshot3.forEach((doc) => {
          // Only add if not already included and not the source document
          if (doc.id !== document.id && !relatedDocs.some(d => d.id === doc.id)) {
            relatedDocs.push({
              id: doc.id,
              ...doc.data(),
              relationStrength: 'child-related'
            });
          }
        });
      }
      
      // Return the top documents up to the limit
      return relatedDocs.slice(0, limit);
    } catch (error) {
      console.error("Error getting related documents:", error);
      return [];
    }
  }

  /**
   * Generate a search cache key
   * @param {string} familyId - Family ID
   * @param {Object} filters - Search filters
   * @param {Object} options - Search options
   * @returns {string} Cache key
   */
  generateCacheKey(familyId, filters, options) {
    return `${familyId}:${JSON.stringify(filters)}:${JSON.stringify({
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      pageSize: options.pageSize
    })}`;
  }

  /**
   * Clear the search cache
   * @param {string} familyId - Optional family ID to clear specific cache
   */
  clearCache(familyId = null) {
    if (familyId) {
      // Clear only for the specified family
      Object.keys(this.cachedSearches).forEach(key => {
        if (key.startsWith(`${familyId}:`)) {
          delete this.cachedSearches[key];
        }
      });
    } else {
      // Clear all cache
      this.cachedSearches = {};
    }
  }

  /**
   * Build a document index to speed up client-side search
   * @param {string} familyId - Family ID
   * @returns {Promise<Object>} Document index
   */
  async buildDocumentIndex(familyId) {
    try {
      const q = query(
        collection(db, "familyDocuments"),
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(q);
      const index = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        index[doc.id] = {
          id: doc.id,
          title: data.title,
          category: data.category,
          tags: data.tags || [],
          uploadedAt: data.uploadedAt,
          childId: data.childId || null
        };
      });
      
      this.documentIndex[familyId] = index;
      return index;
    } catch (error) {
      console.error("Error building document index:", error);
      return {};
    }
  }
}

export default new DocumentRetrievalService();