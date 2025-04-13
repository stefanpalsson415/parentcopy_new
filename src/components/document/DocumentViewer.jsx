// src/components/documents/DocumentViewer.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  Tag, 
  Edit, 
  Trash, 
  User, 
  Calendar, 
  Info,
  X,
  Plus
} from 'lucide-react';
import DocumentProcessingService from '../../services/DocumentProcessingService';
import DocumentCategoryService from '../../services/DocumentCategoryService';
import { useFamily } from '../../contexts/FamilyContext';

const DocumentViewer = ({ 
  document, 
  onClose, 
  onDelete, 
  onUpdate,
  showRelated = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState({ ...document });
  const [relatedDocuments, setRelatedDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const { familyId, familyMembers } = useFamily();
  
  // Get category info
  const categoryInfo = DocumentCategoryService.getCategory(document.category);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Load related documents
  useEffect(() => {
    if (document && showRelated) {
      loadRelatedDocuments();
    }
  }, [document, showRelated]);
  
  const loadRelatedDocuments = async () => {
    setIsLoading(true);
    try {
      const related = await DocumentProcessingService.getRelatedDocuments(familyId, document, 3);
      setRelatedDocuments(related);
    } catch (error) {
      console.error("Error loading related documents:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle document update
  const handleUpdateDocument = async () => {
    setIsLoading(true);
    try {
      const result = await DocumentProcessingService.updateDocumentMetadata(
        document.id, 
        {
          title: editedDocument.title,
          description: editedDocument.description,
          tags: editedDocument.tags,
          childId: editedDocument.childId
        }
      );
      
      if (result.success) {
        // Call onUpdate callback with updated document
        if (onUpdate) {
          onUpdate({
            ...document,
            title: editedDocument.title,
            description: editedDocument.description,
            tags: editedDocument.tags,
            childId: editedDocument.childId
          });
        }
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle document download
  const handleDownload = () => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };
  
  // Handle document print
  const handlePrint = () => {
    if (document.fileUrl) {
      const printWindow = window.open(document.fileUrl, '_blank');
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };
  
  // Handle document share
  const handleShare = () => {
    if (navigator.share && document.fileUrl) {
      navigator.share({
        title: document.title,
        text: document.description,
        url: document.fileUrl
      }).catch(err => {
        console.error("Error sharing document:", err);
      });
    } else {
      // Fallback - copy link to clipboard
      navigator.clipboard.writeText(document.fileUrl);
      alert("Document link copied to clipboard");
    }
  };
  
  // Handle adding new tag
  const handleAddTag = () => {
    if (newTag.trim() === '') return;
    
    if (!editedDocument.tags) {
      setEditedDocument({
        ...editedDocument,
        tags: [newTag.trim()]
      });
    } else if (!editedDocument.tags.includes(newTag.trim())) {
      setEditedDocument({
        ...editedDocument,
        tags: [...editedDocument.tags, newTag.trim()]
      });
    }
    
    setNewTag('');
  };
  
  // Handle removing tag
  const handleRemoveTag = (tag) => {
    setEditedDocument({
      ...editedDocument,
      tags: editedDocument.tags.filter(t => t !== tag)
    });
  };
  
  // Get child name
  const getChildName = (childId) => {
    if (!childId) return 'N/A';
    
    const child = familyMembers.find(m => m.id === childId);
    return child ? child.name : 'Unknown';
  };
  
  // Handle child selection
  const handleChildSelection = (e) => {
    const selectedChildId = e.target.value === 'none' ? null : e.target.value;
    
    setEditedDocument({
      ...editedDocument,
      childId: selectedChildId
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-roboto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <FileText size={20} className="text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Edit Document' : 'Document Details'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Document preview */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-gray-100 rounded-lg p-2 h-60 md:h-80 flex items-center justify-center mb-4">
              {document.fileType?.startsWith('image/') ? (
                <img 
                  src={document.fileUrl} 
                  alt={document.title} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <FileText size={64} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">{document.fileName}</p>
                  <p className="text-xs text-gray-400 mt-1">{document.fileType}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 mb-4">
              <button 
                onClick={handleDownload}
                className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center justify-center"
              >
                <Download size={16} className="mr-1" />
                Download
              </button>
              
              <button 
                onClick={handlePrint}
                className="flex-1 py-2 px-3 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center justify-center"
              >
                <Printer size={16} className="mr-1" />
                Print
              </button>
              
              <button 
                onClick={handleShare}
                className="flex-1 py-2 px-3 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center justify-center"
              >
                <Share2 size={16} className="mr-1" />
                Share
              </button>
            </div>
            
            {/* Extracted text preview */}
            {document.extractedText && (
              <div className="border rounded-lg p-3 mt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <Info size={16} className="mr-1 text-blue-500" />
                  Extracted Text
                </h3>
                <div className="max-h-40 overflow-y-auto text-xs bg-gray-50 p-2 rounded">
                  <pre className="whitespace-pre-wrap font-sans">
                    {document.extractedText}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          {/* Document details */}
          <div className="w-full md:w-1/2">
            {isEditing ? (
              // Edit mode
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editedDocument.title}
                    onChange={(e) => setEditedDocument({ ...editedDocument, title: e.target.value })}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editedDocument.description || ''}
                    onChange={(e) => setEditedDocument({ ...editedDocument, description: e.target.value })}
                    className="w-full p-2 border rounded-md text-sm h-24 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editedDocument.tags?.map(tag => (
                      <div 
                        key={tag} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      className="flex-1 p-2 border rounded-l-md text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button
                      onClick={handleAddTag}
                      className="bg-blue-600 text-white px-3 rounded-r-md hover:bg-blue-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Child
                  </label>
                  <select
                    value={editedDocument.childId || 'none'}
                    onChange={handleChildSelection}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="none">None</option>
                    {familyMembers.filter(m => m.role === 'child').map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleUpdateDocument}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditedDocument({ ...document });
                      setIsEditing(false);
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium">{document.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                </div>
                
                <div className="flex items-center text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-blue-600 font-medium">
                      {categoryInfo.icon ? (
                        <span className={`icon-${categoryInfo.icon}`}></span>
                      ) : (
                        document.category.charAt(0).toUpperCase()
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {categoryInfo.name || document.category}
                    </p>
                    <p className="text-xs text-gray-500">Category</p>
                  </div>
                </div>
                
                <div className="flex items-center text-sm">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                    <Calendar size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {formatDate(document.uploadedAt)}
                    </p>
                    <p className="text-xs text-gray-500">Upload Date</p>
                  </div>
                </div>
                
                {document.childId && (
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                      <User size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {getChildName(document.childId)}
                      </p>
                      <p className="text-xs text-gray-500">Associated Child</p>
                    </div>
                  </div>
                )}
                
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center">
                      <Tag size={16} className="mr-1" />
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {document.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {document.entities && Object.keys(document.entities).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Extracted Details</p>
                    <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
                      {Object.entries(document.entities).map(([key, values]) => (
                        values && values.length > 0 && (
                          <div key={key}>
                            <p className="text-xs text-gray-500 capitalize">{key}</p>
                            <p className="text-sm">{values.slice(0, 3).join(', ')}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </button>
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(document.id)}
                      className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 flex items-center"
                    >
                      <Trash size={16} className="mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Related documents */}
            {showRelated && relatedDocuments.length > 0 && !isEditing && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Related Documents</h3>
                <div className="space-y-3">
                  {relatedDocuments.map(relDoc => (
                    <div 
                      key={relDoc.id} 
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-center"
                      onClick={() => window.open(relDoc.fileUrl, '_blank')}
                    >
                      <FileText size={20} className="text-blue-500 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{relDoc.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(relDoc.uploadedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;