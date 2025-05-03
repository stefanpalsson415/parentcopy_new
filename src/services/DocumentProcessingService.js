// src/services/DocumentProcessingService.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, storage } from './firebase';

class DocumentProcessingService {
  constructor() {
    this.supportedDocumentTypes = {
      'application/pdf': 'pdf',
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/heic': 'image',
      'application/msword': 'document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
      'application/vnd.ms-excel': 'spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
      'text/plain': 'text',
      'text/csv': 'csv',
      'application/json': 'json'
    };
    
    this.categoryKeywords = {
      'medical': ['doctor', 'hospital', 'clinic', 'prescription', 'medication', 'treatment', 'diagnosis', 'patient', 'healthcare', 'medical', 'appointment', 'physician', 'pediatrician', 'dentist', 'therapy'],
      'school': ['school', 'classroom', 'teacher', 'student', 'homework', 'assignment', 'grade', 'report card', 'education', 'project', 'syllabus', 'curriculum', 'class', 'course', 'academic'],
      'financial': ['invoice', 'receipt', 'payment', 'bill', 'tax', 'finance', 'account', 'statement', 'expense', 'income', 'budget', 'credit', 'debit', 'transaction', 'money'],
      'legal': ['contract', 'agreement', 'legal', 'law', 'attorney', 'court', 'document', 'terms', 'conditions', 'policy', 'consent', 'license', 'certificate', 'permit', 'authorization'],
      'event': ['invitation', 'event', 'party', 'celebration', 'ceremony', 'wedding', 'birthday', 'anniversary', 'graduation', 'concert', 'festival', 'occasion', 'gathering', 'rsvp'],
      'identification': ['passport', 'license', 'id', 'identification', 'certificate', 'card', 'social security', 'birth', 'insurance', 'identity'],
      'activity': ['schedule', 'itinerary', 'program', 'activity', 'plan', 'calendar', 'agenda', 'timetable', 'roster', 'schedule', 'sport', 'club', 'team', 'class', 'lesson']
    };
  }

  /**
   * Main entry point for processing documents
   * @param {File} file - The document file
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Processing result with metadata
   */
  async processDocument(file, familyId, userId, options = {}) {
    try {
      console.log(`Processing document: ${file.name} (${file.type}) for family ${familyId}`);
      
      // Step 1: Validate the document
      const validationResult = this.validateDocument(file);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }
      
      // Step 2: Preprocess the document
      const preprocessed = await this.preprocessDocument(file);
      
      // Step 3: Extract content via OCR if needed
      let textContent = null;
      let metadata = {};
      
      if (this.needsOCR(file)) {
        const ocrResult = await this.extractTextFromDocument(preprocessed.file);
        textContent = ocrResult.text;
        metadata = { ...metadata, ...ocrResult.metadata };
      }
      
      // Step 4: Categorize the document
      const category = await this.categorizeDocument(file, textContent);
      
      // Step 5: Extract entities
      const entities = await this.extractEntities(file, textContent, category);
      
      // Step 6: Store the document
      const storagePath = `family-documents/${familyId}/${category}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload the original file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Step 7: Save metadata to Firestore
      const documentData = {
        title: options.customTitle || file.name,
        description: options.description || this.generateDescription(category, entities),
        category,
        childId: options.childId || null,
        familyId,
        fileName: file.name,
        filePath: storagePath,
        fileUrl: downloadURL,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        extractedText: textContent,
        entities,
        tags: this.generateTags(category, entities),
        metadata: {
          ...metadata,
          processingVersion: '1.0',
          processingTimestamp: new Date().toISOString()
        }
      };
      
      const docRef = await addDoc(collection(db, "familyDocuments"), documentData);
      
      // Add document ID to the result
      documentData.id = docRef.id;
      
      // Return the processed document data
      return {
        success: true,
        documentId: docRef.id,
        documentData
      };
    } catch (error) {
      console.error("Error processing document:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate the document type and size
   * @param {File} file - The document file
   * @returns {Object} Validation result
   */
  validateDocument(file) {
    // Check file size (20MB max)
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is 20MB.`
      };
    }
    
    // Check file type
    if (!this.supportedDocumentTypes[file.type]) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Preprocess the document (resize, compress, etc.)
   * @param {File} file - The document file
   * @returns {Promise<Object>} Preprocessed document
   */
  async preprocessDocument(file) {
    // For image files, we might want to resize or compress them
    if (file.type.startsWith('image/')) {
      try {
        // Try to compress/resize the image if it's large
        if (file.size > 2000000) { // 2MB
          console.log("Image is large, applying compression");
          
          // Read file as data URL
          const fileReader = new FileReader();
          const imageDataPromise = new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
            fileReader.readAsDataURL(file);
          });
          
          const imageData = await imageDataPromise;
          
          // Create an image element to load the image
          const img = new Image();
          const loadPromise = new Promise((resolve) => {
            img.onload = () => resolve();
            img.src = imageData;
          });
          
          await loadPromise;
          
          // Create a canvas to resize/compress
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 1600px on longest side)
          const maxDimension = 1600;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image on canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob with reduced quality
          const canvasDataPromise = new Promise((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob);
            }, file.type, 0.7); // Use 70% quality
          });
          
          const compressedBlob = await canvasDataPromise;
          
          // Create a new file from the blob
          const compressedFile = new File([compressedBlob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });
          
          return {
            file: compressedFile,
            processed: true,
            reason: "Image compressed and resized",
            originalSize: file.size,
            newSize: compressedFile.size
          };
        }
      } catch (error) {
        console.error("Error preprocessing image:", error);
        // Fall through to default return if compression fails
      }
      
      // If no compression needed or compression failed, return original
      return {
        file,
        processed: false,
        reason: "No processing needed or compression failed"
      };
    }
    
    // For other file types, return as is
    return {
      file,
      processed: false,
      reason: "No processing needed for this file type"
    };
  }

  /**
   * Determine if a file needs OCR processing
   * @param {File} file - The document file
   * @returns {boolean} Whether OCR is needed
   */
  needsOCR(file) {
    // Images and PDFs typically need OCR
    return file.type.startsWith('image/') || file.type === 'application/pdf';
  }

  /**
   * Extract text content from a document using OCR
   * @param {File} file - The document file
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractTextFromDocument(file) {
    try {
      // Use DocumentOCRService to extract text
      const { default: DocumentOCRService } = await import('./DocumentOCRService');
      console.log("Extracting text from document:", file.name);
      
      // Extract text from the document using OCR service
      const ocrResult = await DocumentOCRService.processDocument(file);
      
      return {
        text: ocrResult.text,
        metadata: {
          ocrEngine: ocrResult.engine || 'Cloud OCR',
          confidence: ocrResult.confidence || 0.9,
          processingTime: ocrResult.processingTime || 500
        }
      };
    } catch (error) {
      console.error("Error in extractTextFromDocument:", error);
      
      // Fallback if DocumentOCRService fails
      return {
        text: `Document content for ${file.name}. Unfortunately, OCR extraction encountered an error.`,
        metadata: {
          ocrEngine: 'Fallback extractor',
          confidence: 0.5,
          processingTime: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Categorize a document based on its content and metadata
   * @param {File} file - The document file
   * @param {string} textContent - Extracted text content
   * @returns {Promise<string>} Document category
   */
  async categorizeDocument(file, textContent) {
    // First, try to categorize based on filename
    const filename = file.name.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      for (const keyword of keywords) {
        if (filename.includes(keyword)) {
          return category;
        }
      }
    }
    
    // Next, try to categorize based on text content
    if (textContent) {
      const textLower = textContent.toLowerCase();
      
      for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
        for (const keyword of keywords) {
          if (textLower.includes(keyword)) {
            return category;
          }
        }
      }
    }
    
    // Default category based on file type
    if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.type.includes('pdf')) {
      return 'document';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      return 'spreadsheet';
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return 'document';
    }
    
    // Fallback category
    return 'other';
  }

  /**
   * Extract entities from document content
   * @param {File} file - The document file
   * @param {string} textContent - Extracted text content
   * @param {string} category - Document category
   * @returns {Promise<Object>} Extracted entities
   */
  async extractEntities(file, textContent, category) {
    // This would ideally use a more sophisticated entity extraction service
    // For now, we'll use basic regex patterns for common entities
    
    const entities = {};
    
    if (!textContent) {
      return entities;
    }
    
    // Extract dates
    const datePatterns = [
      /\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, // MM/DD/YYYY, DD.MM.YYYY, etc.
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/g // January 1, 2022, etc.
    ];
    
    entities.dates = [];
    for (const pattern of datePatterns) {
      const matches = textContent.match(pattern);
      if (matches) {
        entities.dates.push(...matches);
      }
    }
    
    // Extract names
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g; // Simple pattern for "First Last"
    entities.names = textContent.match(namePattern) || [];
    
    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    entities.emails = textContent.match(emailPattern) || [];
    
    // Extract phone numbers
    const phonePattern = /\b\(?(?:\d{3})\)?[-.\s]?(?:\d{3})[-.\s]?(?:\d{4})\b/g;
    entities.phones = textContent.match(phonePattern) || [];
    
    // Extract addresses (simplified)
    const addressPattern = /\b\d+ [A-Za-z]+ (?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane)\b.+/g;
    entities.addresses = textContent.match(addressPattern) || [];
    
    // Category-specific entities
    if (category === 'medical') {
      // Extract medical terms (simplified)
      const medicalPattern = /\b(?:diagnosis|treatment|prescription|medication|dose|mg|ml|appointment|referral|doctor|physician|patient)\b/g;
      entities.medicalTerms = textContent.match(medicalPattern) || [];
    } else if (category === 'school') {
      // Extract education terms
      const educationPattern = /\b(?:grade|class|teacher|student|assignment|homework|project|exam|test|quiz|report card|course)\b/g;
      entities.educationTerms = textContent.match(educationPattern) || [];
    } else if (category === 'event') {
      // Extract event details
      const eventPattern = /\b(?:event|party|celebration|ceremony|wedding|birthday|anniversary|graduation|invitation|rsvp)\b/g;
      entities.eventTerms = textContent.match(eventPattern) || [];
    }
    
    return entities;
  }

  /**
   * Generate a description based on category and entities
   * @param {string} category - Document category
   * @param {Object} entities - Extracted entities
   * @returns {string} Generated description
   */
  generateDescription(category, entities) {
    let description = `${category.charAt(0).toUpperCase() + category.slice(1)} document`;
    
    if (entities.dates && entities.dates.length > 0) {
      description += ` from ${entities.dates[0]}`;
    }
    
    if (entities.names && entities.names.length > 0) {
      description += ` involving ${entities.names[0]}`;
    }
    
    if (category === 'medical' && entities.medicalTerms && entities.medicalTerms.length > 0) {
      description += ` related to ${entities.medicalTerms[0]}`;
    } else if (category === 'school' && entities.educationTerms && entities.educationTerms.length > 0) {
      description += ` related to ${entities.educationTerms[0]}`;
    } else if (category === 'event' && entities.eventTerms && entities.eventTerms.length > 0) {
      description += ` for ${entities.eventTerms[0]}`;
    }
    
    return description;
  }

  /**
   * Generate tags based on category and entities
   * @param {string} category - Document category
   * @param {Object} entities - Extracted entities
   * @returns {Array} Generated tags
   */
  generateTags(category, entities) {
    const tags = [category];
    
    // Add tags based on entities
    if (entities.dates && entities.dates.length > 0) {
      try {
        const date = new Date(entities.dates[0]);
        tags.push(`${date.getFullYear()}`);
        tags.push(`${date.toLocaleString('default', { month: 'long' })}`);
      } catch (e) {
        // If we can't parse the date, just use it as is
        tags.push(entities.dates[0]);
      }
    }
    
    // Add category-specific tags
    if (category === 'medical') {
      tags.push('health');
      if (entities.medicalTerms) {
        entities.medicalTerms.slice(0, 3).forEach(term => tags.push(term));
      }
    } else if (category === 'school') {
      tags.push('education');
      if (entities.educationTerms) {
        entities.educationTerms.slice(0, 3).forEach(term => tags.push(term));
      }
    } else if (category === 'event') {
      tags.push('social');
      if (entities.eventTerms) {
        entities.eventTerms.slice(0, 3).forEach(term => tags.push(term));
      }
    }
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }

  /**
   * Search for documents matching criteria
   * @param {string} familyId - Family ID
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching documents
   */
  async searchDocuments(familyId, filters = {}) {
    try {
      let q = query(collection(db, "familyDocuments"), where("familyId", "==", familyId));
      
      // Apply additional filters
      if (filters.category) {
        q = query(q, where("category", "==", filters.category));
      }
      
      if (filters.childId) {
        q = query(q, where("childId", "==", filters.childId));
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
      
      // Apply text search if specified (client-side filtering)
      if (filters.searchText && filters.searchText.trim() !== '') {
        const searchTerms = filters.searchText.toLowerCase().split(' ');
        
        return documents.filter(doc => {
          const searchableText = `
            ${doc.title?.toLowerCase() || ''} 
            ${doc.description?.toLowerCase() || ''} 
            ${doc.extractedText?.toLowerCase() || ''} 
            ${doc.tags?.join(' ')?.toLowerCase() || ''}
          `;
          
          return searchTerms.every(term => searchableText.includes(term));
        });
      }
      
      return documents;
    } catch (error) {
      console.error("Error searching documents:", error);
      throw error;
    }
  }

  /**
   * Get recent documents for a family
   * @param {string} familyId - Family ID
   * @param {number} limit - Maximum number of documents to return
   * @returns {Promise<Array>} Recent documents
   */
  async getRecentDocuments(familyId, limit = 10) {
    try {
      const q = query(
        collection(db, "familyDocuments"), 
        where("familyId", "==", familyId),
        orderBy("uploadedAt", "desc"),
        limit(limit)
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
   * Update document metadata
   * @param {string} documentId - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateDocumentMetadata(documentId, updates) {
    try {
      const docRef = doc(db, "familyDocuments", documentId);
      
      // Prepare updates with timestamp
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      
      return { success: true, documentId };
    } catch (error) {
      console.error("Error updating document metadata:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Associate document with a child
   * @param {string} documentId - Document ID
   * @param {string} childId - Child ID
   * @returns {Promise<Object>} Result
   */
  async associateDocumentWithChild(documentId, childId) {
    return this.updateDocumentMetadata(documentId, { childId });
  }

  /**
   * Get all documents associated with a child
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @returns {Promise<Array>} Child's documents
   */
  async getChildDocuments(familyId, childId) {
    try {
      const q = query(
        collection(db, "familyDocuments"),
        where("familyId", "==", familyId),
        where("childId", "==", childId)
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
      console.error("Error getting child documents:", error);
      throw error;
    }
  }
}

export default new DocumentProcessingService();