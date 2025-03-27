import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

const PhotoUploader = ({ 
  currentPhoto, 
  onPhotoChange, 
  title = "Update Photo",
  description = "Select a new photo",
  size = "medium", // small, medium, large
  allowCamera = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Calculate size classes
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      await onPhotoChange(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const openCameraCapture = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not available in this browser");
      return;
    }
    
    const videoElement = document.createElement('video');
    const canvasElement = document.createElement('canvas');
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        
        // Create camera UI
        const cameraModal = document.createElement('div');
        cameraModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        
        const cameraContainer = document.createElement('div');
        cameraContainer.className = 'bg-white p-4 rounded-lg max-w-md w-full';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = 'Take a Photo';
        titleEl.className = 'text-lg font-medium mb-4 font-roboto';
        
        const videoContainer = document.createElement('div');
        videoContainer.className = 'relative mb-4';
        videoContainer.appendChild(videoElement);
        videoElement.className = 'w-full rounded';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-between';
        
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Take Photo';
        captureButton.className = 'px-4 py-2 bg-black text-white rounded font-roboto';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'px-4 py-2 border rounded font-roboto';
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(captureButton);
        
        cameraContainer.appendChild(titleEl);
        cameraContainer.appendChild(videoContainer);
        cameraContainer.appendChild(buttonContainer);
        cameraModal.appendChild(cameraContainer);
        
        document.body.appendChild(cameraModal);
        
        // Handle capture
        captureButton.addEventListener('click', () => {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          
          canvasElement.getContext('2d').drawImage(
            videoElement, 0, 0, canvasElement.width, canvasElement.height
          );
          
          canvasElement.toBlob(blob => {
            // Stop camera stream
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            
            // Remove modal
            document.body.removeChild(cameraModal);
            
            // Process the image blob
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            onPhotoChange(file);
          }, 'image/jpeg');
        });
        
        // Handle cancel
        cancelButton.addEventListener('click', () => {
          // Stop camera stream
          videoElement.srcObject.getTracks().forEach(track => track.stop());
          
          // Remove modal
          document.body.removeChild(cameraModal);
        });
      })
      .catch(error => {
        console.error("Error accessing camera:", error);
        setError("Could not access camera. Please check permissions or use file upload instead.");
      });
  };
  
  return (
    <div className="text-center">
      <h3 className="text-lg font-medium mb-2 font-roboto">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 font-roboto">{description}</p>
      
      <div className="flex justify-center mb-4">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200`}>
          <img 
            src={currentPhoto || '/api/placeholder/150/150'} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {isUploading ? (
        <div className="p-3 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm font-roboto">Uploading...</span>
        </div>
      ) : (
        <div className="flex justify-center space-x-3">
          <label className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer transition-colors font-roboto flex items-center">
            <Upload size={16} className="mr-2" />
            Upload
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
          
          {allowCamera && (
            <button
              onClick={openCameraCapture}
              className="px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-roboto flex items-center"
            >
              <Camera size={16} className="mr-2" />
              Camera
            </button>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-red-500 text-sm mt-2 font-roboto">{error}</p>
      )}
    </div>
  );
};

export default PhotoUploader;