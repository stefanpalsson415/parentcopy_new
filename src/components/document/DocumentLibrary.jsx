// src/components/document/DocumentLibrary.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Image, FileIcon, Paperclip, Search, Filter, Upload, 
  Download, Trash2, Eye, FolderPlus, Folder, X, Calendar, User,
  Check, Plus
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../services/firebase';
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, doc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import UserAvatar from '../common/UserAvatar';

const DocumentLibrary = ({ 
  initialChildId = null, 
  initialCategory = null, 
  onClose,
  selectMode = false,
  onSelectDocument = null 
}) => {
  const { familyMembers, familyId } = useFamily();
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    child: initialChildId || 'all',
    category: initialCategory || 'all',
    type: 'all'
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: initialCategory || 'medical',
    childId: initialChildId || '',
    files: []
  });
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  
  const fileInputRef = useRef(null);
  const children = familyMembers.filter(m => m.role === 'child');
  
  // Document categories
  const categories = [
    { id: 'medical', label: 'Medical', icon: <FileIcon size={18} className="text-red-500" /> },
    { id: 'school', label: 'School', icon: <FileIcon size={18} className="text-blue-500" /> },
    { id: 'activity', label: 'Activities', icon: <FileIcon size={18} className="text-green-500" /> },
    { id: 'growth', label: 'Growth', icon: <FileIcon size={18} className="text-purple-500" /> },
    { id: 'other', label: 'Other', icon: <FileIcon size={18} className="text-gray-500" /> }
  ];
  
  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        if (!familyId) return;
        
        setLoading(true);
        
        // Build query based on filters
        let documentsQuery = query(
          collection(db, "familyDocuments"),
          where("familyId", "==", familyId)
        );
        
        // Apply child filter if selected
        if (filter.child !== 'all') {
          documentsQuery = query(
            documentsQuery,
            where("childId", "==", filter.child)
          );
        }
        
        // Apply category filter if selected
        if (filter.category !== 'all') {
          documentsQuery = query(
            documentsQuery,
            where("category", "==", filter.category)
          );
        }
        
        const querySnapshot = await getDocs(documentsQuery);
        
        const loadedDocuments = [];
        querySnapshot.forEach((doc) => {
          loadedDocuments.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Apply search filter client-side
        let filteredDocuments = loadedDocuments;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredDocuments = loadedDocuments.filter(doc => 
            doc.title?.toLowerCase().includes(query) ||
            doc.description?.toLowerCase().includes(query)
          );
        }
        
        // Apply file type filter client-side
        if (filter.type !== 'all') {
          filteredDocuments = filteredDocuments.filter(doc => {
            if (filter.type === 'image' && doc.fileType?.startsWith('image/')) return true;
            if (filter.type === 'pdf' && doc.fileType === 'application/pdf') return true;
            if (filter.type === 'document' && (
              doc.fileType === 'application/msword' ||
              doc.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              doc.fileType === 'application/vnd.oasis.opendocument.text'
            )) return true;
            return false;
          });
        }
        
        // Apply folder filter
        if (currentFolder) {
          filteredDocuments = filteredDocuments.filter(doc => doc.folderId === currentFolder);
        } else {
          // Show only top-level documents when no folder is selected
          filteredDocuments = filteredDocuments.filter(doc => !doc.folderId);
        }
        
        // Sort by upload date (newest first)
        filteredDocuments.sort((a, b) => {
          const dateA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
          const dateB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
          return dateB - dateA;
        });
        
        setDocuments(filteredDocuments);
        
        // Load folders
        const foldersQuery = query(
          collection(db, "documentFolders"),
          where("familyId", "==", familyId)
        );
        const foldersSnapshot = await getDocs(foldersQuery);
        
        const loadedFolders = [];
        foldersSnapshot.forEach((doc) => {
          loadedFolders.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setFolders(loadedFolders);
        setLoading(false);
      } catch (error) {
        console.error("Error loading documents:", error);
        setError("Failed to load documents. Please try again.");
        setLoading(false);
      }
    };
    
    loadDocuments();
  }, [familyId, filter, searchQuery, currentFolder]);
  
  // Handle file selection
  const handleFileSelection = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setUploadData(prev => ({
      ...prev,
      files: [...prev.files, ...selectedFiles]
    }));
  };
  
  // Remove selected file
  const removeSelectedFile = (index) => {
    setUploadData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };
  
  // Handle upload
  const handleUpload = async () => {
    try {
      if (!uploadData.files.length) {
        setError("Please select at least one file to upload");
        return;
      }
      
      if (!uploadData.title) {
        setError("Please provide a title for the document");
        return;
      }
      
      if (!uploadData.childId) {
        setError("Please select a child for this document");
        return;
      }
      
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Process each file
      const uploadPromises = uploadData.files.map(async (file, index) => {
        // Create a storage reference
        const storagePath = `family-documents/${familyId}/${uploadData.childId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload the file
        await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update progress
        setUploadProgress(Math.floor(((index + 1) / uploadData.files.length) * 100));
        
        // Create the document metadata
        const documentData = {
          title: uploadData.files.length > 1 
            ? `${uploadData.title} (${index + 1})` 
            : uploadData.title,
          description: uploadData.description,
          category: uploadData.category,
          childId: uploadData.childId,
          familyId,
          fileName: file.name,
          filePath: storagePath,
          fileUrl: downloadURL,
          fileType: file.type,
          fileSize: file.size,
          folderId: currentFolder,
          uploadedBy: currentUser.uid,
          uploadedAt: serverTimestamp(),
          tags: []
        };
        
        // Add document to Firestore
        const docRef = await addDoc(collection(db, "familyDocuments"), documentData);
        
        return { id: docRef.id, ...documentData };
      });
      
      // Wait for all uploads to complete
      const uploadedDocuments = await Promise.all(uploadPromises);
      
      // Add new documents to state
      setDocuments(prev => [...uploadedDocuments, ...prev]);
      
      // Reset upload data
      setUploadData({
        title: '',
        description: '',
        category: uploadData.category,
        childId: uploadData.childId,
        files: []
      });
      
      setShowUploadModal(false);
      setUploading(false);
      
    } catch (error) {
      console.error("Error uploading document:", error);
      setError("Failed to upload document. Please try again.");
      setUploading(false);
    }
  };
  
  // Create new folder
  const createFolder = async (folderName) => {
    try {
      if (!folderName) return;
      
      const folderData = {
        name: folderName,
        familyId,
        parentFolderId: currentFolder,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "documentFolders"), folderData);
      
      setFolders(prev => [...prev, { id: docRef.id, ...folderData }]);
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating folder:", error);
      setError("Failed to create folder. Please try again.");
    }
  };
  
  // Navigate to folder
  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
  };
  
  // Navigate up one level
  const navigateUp = () => {
    if (!currentFolder) return;
    
    const folder = folders.find(f => f.id === currentFolder);
    setCurrentFolder(folder?.parentFolderId || null);
  };
  
  // Delete document
  const deleteDocument = async (documentId) => {
    try {
      const documentToDelete = documents.find(doc => doc.id === documentId);
      if (!documentToDelete) return;
      
      // Delete file from storage if path exists
      if (documentToDelete.filePath) {
        const storageRef = ref(storage, documentToDelete.filePath);
        await deleteObject(storageRef);
      }
      
      // Delete document from Firestore
      await deleteDoc(doc(db, "familyDocuments", documentId));
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Close preview if this document was selected
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setError("Failed to delete document. Please try again.");
    }
  };
  
  // View document
  const viewDocument = (document) => {
    setSelectedDocument(document);
  };
  
  // Handle document selection
  const handleDocumentSelection = (document) => {
    if (selectMode && onSelectDocument) {
      onSelectDocument(document);
    } else {
      // Toggle document selection for multi-select
      const isSelected = selectedDocuments.some(doc => doc.id === document.id);
      if (isSelected) {
        setSelectedDocuments(selectedDocuments.filter(doc => doc.id !== document.id));
      } else {
        setSelectedDocuments([...selectedDocuments, document]);
      }
    }
  };
  
  // Check if a document is selected
  const isDocumentSelected = (documentId) => {
    return selectedDocuments.some(doc => doc.id === documentId);
  };
  
  // Get child name
  const getChildName = (childId) => {
    const child = children.find(c => c.id === childId);
    return child ? child.name : 'Unknown';
  };
  
  // Get file icon
  const getFileIcon = (fileType) => {
    if (!fileType) return <FileIcon size={40} className="text-gray-400" />;
    
    if (fileType.startsWith('image/')) {
      return <Image size={40} className="text-blue-400" />;
    }
    
    if (fileType === 'application/pdf') {
      return <FileText size={40} className="text-red-400" />;
    }
    
    if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText size={40} className="text-blue-400" />;
    }
    
    return <FileIcon size={40} className="text-gray-400" />;
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get breadcrumb path
  const getBreadcrumbPath = () => {
    if (!currentFolder) return [{ id: null, name: 'All Documents' }];
    
    const path = [{ id: null, name: 'All Documents' }];
    
    let current = folders.find(f => f.id === currentFolder);
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = folders.find(f => f.id === current.parentFolderId);
    }
    
    return path;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md font-roboto">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">
            {selectMode ? 'Select Document' : 'Document Library'}
            {selectMode && selectedDocuments.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({selectedDocuments.length} selected)
              </span>
            )}
          </h2>
          <div className="flex space-x-2">
            {selectMode && selectedDocuments.length > 0 && (
              <button
                onClick={() => {
                  if (onSelectDocument && selectedDocuments.length === 1) {
                    onSelectDocument(selectedDocuments[0]);
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm flex items-center hover:bg-green-700"
                disabled={selectedDocuments.length !== 1}
              >
                <Check size={14} className="mr-1" />
                Attach Selected
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100"
              title="Close"
            >
              <X size={18} />
            </button>
            {!selectMode && (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3 py-1 bg-black text-white rounded-md text-sm flex items-center hover:bg-gray-800"
                >
                  <Upload size={14} className="mr-1" />
                  Upload
                </button>
                <button
                  onClick={() => createFolder(prompt('Enter folder name:'))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center hover:bg-gray-50"
                >
                  <FolderPlus size={14} className="mr-1" />
                  New Folder
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center mt-2 text-sm">
          {getBreadcrumbPath().map((item, index, arr) => (
            <React.Fragment key={index}>
              <button
                onClick={() => navigateToFolder(item.id)}
                className={`hover:underline ${
                  index === arr.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}
              >
                {item.name}
              </button>
              {index < arr.length - 1 && (
                <span className="mx-1 text-gray-400">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Search documents..."
            />
          </div>
          
          {/* Child Filter */}
          <select
            value={filter.child}
            onChange={(e) => setFilter(prev => ({ ...prev, child: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Children</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          
          {/* Category Filter */}
          <select
            value={filter.category}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          
          {/* Type Filter */}
          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="document">Documents</option>
          </select>
          
          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? (
              <Filter size={16} className="text-gray-500" />
            ) : (
              <Calendar size={16} className="text-gray-500" />
            )}
          </button>
        </div>
      </div>
      
      {/* Document List */}
      <div className="p-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-gray-900 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length > 0 || folders.filter(f => f.parentFolderId === currentFolder).length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-2"
          }>
            {/* Folders */}
            {folders
              .filter(folder => folder.parentFolderId === currentFolder)
              .map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.id)}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${
                    viewMode === 'grid' ? "" : "flex items-center"
                  }`}
                >
                  <div className={viewMode === 'grid' ? "text-center" : "flex items-center"}>
                    <Folder 
                      size={viewMode === 'grid' ? 40 : 24} 
                      className="text-yellow-500 mx-auto"
                    />
                    <div className={viewMode === 'grid' ? "mt-2" : "ml-3"}>
                      <p className="font-medium text-sm">{folder.name}</p>
                      <p className="text-xs text-gray-500">Folder</p>
                    </div>
                  </div>
                </div>
              ))}
              
            {/* Documents */}
            {documents.map(document => (
              <div 
                key={document.id}
                className={`border rounded-lg p-3 hover:bg-gray-50 ${
                  viewMode === 'grid' ? "" : "flex items-center justify-between"
                } ${isDocumentSelected(document.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
                onClick={selectMode ? () => handleDocumentSelection(document) : undefined}
              >
                {viewMode === 'grid' ? (
                  <div className="relative">
                    {selectMode && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isDocumentSelected(document.id) 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-200 text-gray-600"
                        }`}>
                          {isDocumentSelected(document.id) ? (
                            <Check size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center mb-2">
                      {getFileIcon(document.fileType)}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm truncate" title={document.title}>
                        {document.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {document.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(document.uploadedAt)} • {formatFileSize(document.fileSize)}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-center space-x-3">
                      {!selectMode && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDocument(document);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={document.fileUrl}
                            download={document.fileName}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(document.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectDocument) {
                              onSelectDocument(document);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs flex items-center hover:bg-blue-700"
                        >
                          <Check size={12} className="mr-1" />
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center">
                      {selectMode && (
                        <div className={`mr-3 w-6 h-6 rounded-full flex items-center justify-center ${
                          isDocumentSelected(document.id) 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-200 text-gray-600"
                        }`}>
                          {isDocumentSelected(document.id) ? (
                            <Check size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </div>
                      )}
                      {getFileIcon(document.fileType)}
                      <div className="ml-3">
                        <p className="font-medium text-sm">{document.title}</p>
                        <p className="text-xs text-gray-500">
                          {getChildName(document.childId)} • {formatDate(document.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!selectMode && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDocument(document);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={document.fileUrl}
                            download={document.fileName}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(document.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectDocument) {
                              onSelectDocument(document);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs flex items-center hover:bg-blue-700"
                        >
                          <Check size={12} className="mr-1" />
                          Select
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No documents found</p>
            <p className="text-sm text-gray-400">
              {filter.child !== 'all' || filter.category !== 'all' || filter.type !== 'all' || searchQuery
                ? 'Try changing your filters or search term'
                : 'Upload documents to get started'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm inline-flex items-center hover:bg-gray-800"
            >
              <Upload size={14} className="mr-1" />
              Upload First Document
            </button>
          </div>
        )}
      </div>
      
      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="absolute inset-0 bg-white flex flex-col rounded-lg shadow-lg overflow-hidden z-30">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
            <h3 className="font-medium truncate">{selectedDocument.title}</h3>
            <button
              onClick={() => setSelectedDocument(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {selectedDocument.fileType?.startsWith('image/') ? (
              <img 
                src={selectedDocument.fileUrl} 
                alt={selectedDocument.title}
                className="max-w-full max-h-[70vh] mx-auto"
              />
            ) : selectedDocument.fileType === 'application/pdf' ? (
              <iframe
                src={`${selectedDocument.fileUrl}#toolbar=0`}
                title={selectedDocument.title}
                className="w-full h-[70vh]"
              />
            ) : (
              <div className="p-8 text-center">
                <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="mb-2">Cannot preview this file type</p>
                <a
                  href={selectedDocument.fileUrl}
                  download={selectedDocument.fileName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md inline-flex items-center hover:bg-blue-700"
                >
                  <Download size={16} className="mr-2" />
                  Download File
                </a>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-gray-50 sticky bottom-0">
            {/* Same content as before */}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500">File Name</p>
                <p className="text-sm">{selectedDocument.fileName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Size</p>
                <p className="text-sm">{formatFileSize(selectedDocument.fileSize)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Uploaded</p>
                <p className="text-sm">{formatDate(selectedDocument.uploadedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm capitalize">{selectedDocument.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Child</p>
                <p className="text-sm">{getChildName(selectedDocument.childId)}</p>
              </div>
            </div>
            
            {selectedDocument.description && (
              <div className="mt-3">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm">{selectedDocument.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="absolute inset-0 bg-white flex flex-col rounded-lg shadow-lg overflow-hidden z-30">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
            <h3 className="font-medium">Upload Document</h3>
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadData({
                  title: '',
                  description: '',
                  category: initialCategory || 'medical',
                  childId: initialChildId || '',
                  files: []
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title*</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border rounded-md p-2 text-sm"
                  placeholder="e.g., Medical Report, School Certificate"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-md p-2 text-sm"
                  rows="3"
                  placeholder="Add any details about this document"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">For Child*</label>
                <select
                  value={uploadData.childId}
                  onChange={(e) => setUploadData(prev => ({ ...prev, childId: e.target.value }))}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="">-- Select Child --</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Files*</label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelection}
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
                  >
                    <Paperclip size={14} className="inline mr-1" />
                    Select Files
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    or drag and drop files here
                  </p>
                </div>
                
                {/* Selected Files */}
                {uploadData.files.length > 0 && (
                  <div className="border rounded-md p-3 mt-2">
                    <p className="text-sm font-medium mb-2">Selected Files ({uploadData.files.length})</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadData.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            {file.type.startsWith('image/') ? (
                              <Image size={16} className="mr-2 text-blue-500" />
                            ) : file.type === 'application/pdf' ? (
                              <FileText size={16} className="mr-2 text-red-500" />
                            ) : (
                              <FileIcon size={16} className="mr-2 text-gray-500" />
                            )}
                            <span className="truncate max-w-xs">{file.name}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelectedFile(index);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md mt-2">
                    {error}
                  </div>
                )}
                
                {/* Upload Progress */}
                {uploading && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t flex justify-end">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadData({
                  title: '',
                  description: '',
                  category: initialCategory || 'medical',
                  childId: initialChildId || '',
                  files: []
                });
              }}
              className="px-4 py-2 border rounded-md text-sm mr-3"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || uploadData.files.length === 0}
              className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;