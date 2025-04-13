// src/components/documents/DocumentUploadZone.jsx
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, File, Image, AlertCircle, Check, Loader, Camera } from 'lucide-react';
import DocumentProcessingService from '../../services/DocumentProcessingService';
import { useFamily } from '../../contexts/FamilyContext';

const DocumentUploadZone = ({ 
  onUploadComplete, 
  onError, 
  childId = null, 
  category = null,
  allowCamera = true,
  maxFiles = 5,
  maxSize = 20 * 1024 * 1024, // 20MB
  acceptedTypes = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [files, setFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const fileInputRef = useRef(null);
  const { familyId, selectedUser } = useFamily();
  
  // Format file size for display
  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Check if file type is allowed
  const isValidFileType = (file) => {
    if (!acceptedTypes) return true;
    
    const acceptedTypesArray = acceptedTypes.split(',');
    
    for (const type of acceptedTypesArray) {
      // Check if wildcard pattern like image/*
      if (type.endsWith('/*')) {
        const mainType = type.split('/')[0];
        if (file.type.startsWith(`${mainType}/`)) return true;
      } 
      // Check exact match
      else if (type === file.type) {
        return true;
      }
    }
    
    return false;
  };
  
  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  }, [dragCounter]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);
  
  // Handle files from input or drop
  const handleFiles = (newFiles) => {
    setErrorMessage(null);
    
    // Check if we're exceeding max files
    if (files.length + newFiles.length > maxFiles) {
      setErrorMessage(`You can only upload up to ${maxFiles} files at a time.`);
      return;
    }
    
    // Process each file
    const validFiles = [];
    
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      
      // Check file size
      if (file.size > maxSize) {
        setErrorMessage(`File "${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}.`);
        continue;
      }
      
      // Check file type
      if (!isValidFileType(file)) {
        setErrorMessage(`File type of "${file.name}" is not supported.`);
        continue;
      }
      
      // Add to valid files
      validFiles.push({
        file,
        id: `file-${Date.now()}-${i}`,
        status: 'pending', // 'pending', 'processing', 'success', 'error'
        progress: 0,
        error: null
      });
    }
    
    if (validFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  // Remove a file from the list
  const handleRemoveFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };
  
  // Open camera for capture
  const handleOpenCamera = () => {
    // Create input element for camera capture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use the environment-facing camera
    
    // Handle file selection
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    };
    
    // Trigger click to open camera
    input.click();
  };
  
  // Process files for upload
  const processFiles = async () => {
    if (files.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    const processed = [];
    
    // Process each file
    for (const fileItem of files) {
      try {
        // Update status to processing
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'processing', progress: 10 } 
              : f
          )
        );
        
        // Process the document
        const result = await DocumentProcessingService.processDocument(
          fileItem.file,
          familyId,
          selectedUser?.id,
          {
            childId,
            category,
            customTitle: fileItem.file.name
          }
        );
        
        // Update progress
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, progress: 50 } 
              : f
          )
        );
        
        if (result.success) {
          // Add to uploaded files
          processed.push(result.documentData);
          
          // Update status to success
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'success', progress: 100 } 
                : f
            )
          );
        } else {
          // Update status to error
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'error', error: result.error, progress: 100 } 
                : f
            )
          );
        }
      } catch (error) {
        console.error("Error processing file:", error);
        
        // Update status to error
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'error', error: error.message, progress: 100 } 
              : f
          )
        );
      }
    }
    
    // Add to uploaded files
    setUploadedFiles(prev => [...prev, ...processed]);
    
    // Call onUploadComplete callback
    if (processed.length > 0 && onUploadComplete) {
      onUploadComplete(processed);
    }
    
    // Reset after a delay
    setTimeout(() => {
      setFiles(prevFiles => prevFiles.filter(f => f.status !== 'success'));
      setIsProcessing(false);
    }, 2000);
  };
  
  // Reset the component
  const resetUploader = () => {
    setFiles([]);
    setErrorMessage(null);
    setIsProcessing(false);
  };
  
  return (
    <div 
      className="w-full h-full border-2 border-dashed rounded-lg p-4 relative font-roboto transition-all"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        backgroundColor: isDragging ? 'rgba(0, 0, 255, 0.05)' : 'white',
        borderColor: isDragging ? '#4a6cf7' : '#e2e8f0'
      }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <Upload size={40} className="mx-auto text-blue-500 mb-2" />
            <p className="text-lg font-medium">Drop files here</p>
            <p className="text-sm text-gray-500">Files will be processed automatically</p>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        {files.length === 0 ? (
          <>
            <Upload size={32} className="text-gray-400 mb-2" />
            <h3 className="text-lg font-medium mb-1">Upload Documents</h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag & drop files here, or click to browse
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleBrowseClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
              >
                <FileText size={16} className="mr-1" />
                Browse Files
              </button>
              
              {allowCamera && (
                <button
                  onClick={handleOpenCamera}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm flex items-center"
                >
                  <Camera size={16} className="mr-1" />
                  Take Photo
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Supported formats: Images, PDF, Word, Text, CSV
              <br />
              Maximum size: {formatFileSize(maxSize)}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium mb-4">Selected Files</h3>
            
            <div className="w-full space-y-3 max-h-60 overflow-y-auto mb-4">
              {files.map((fileItem) => (
                <div 
                  key={fileItem.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    {fileItem.file.type.startsWith('image/') ? (
                      <Image size={20} className="text-blue-500 mr-2" />
                    ) : (
                      <File size={20} className="text-blue-500 mr-2" />
                    )}
                    <div className="ml-2">
                      <p className="text-sm font-medium truncate max-w-xs">{fileItem.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(fileItem.file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {fileItem.status === 'pending' && (
                      <button 
                        onClick={() => handleRemoveFile(fileItem.id)}
                        className="p-1 text-gray-500 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                    
                    {fileItem.status === 'processing' && (
                      <div className="flex items-center">
                        <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${fileItem.progress}%` }}
                          ></div>
                        </div>
                        <Loader size={16} className="text-blue-500 animate-spin" />
                      </div>
                    )}
                    
                    {fileItem.status === 'success' && (
                      <Check size={16} className="text-green-500" />
                    )}
                    
                    {fileItem.status === 'error' && (
                      <div className="flex items-center text-red-500">
                        <AlertCircle size={16} className="mr-1" />
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {errorMessage && (
              <div className="text-red-500 text-sm mb-4 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {errorMessage}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={processFiles}
                disabled={isProcessing || files.every(f => f.status !== 'pending')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm"
              >
                {isProcessing ? 'Processing...' : 'Upload Files'}
              </button>
              
              <button
                onClick={resetUploader}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={acceptedTypes}
        multiple={maxFiles > 1}
        className="hidden"
      />
    </div>
  );
};

export default DocumentUploadZone;