import React from 'react';
import { CheckCircle } from 'lucide-react';

const LoadingScreen = ({ message = "Processing your survey data...", showCheckmark = true }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-roboto">
      <div className="text-center p-6 max-w-md">
        {showCheckmark && (
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600" />
          </div>
        )}
        
        <h2 className="text-2xl font-medium mb-3 font-roboto">
          {message}
        </h2>
        
        <p className="text-gray-600 mb-8">
          We're preparing your personalized family dashboard...
        </p>
        
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 bottom-0 left-0 bg-black w-2/3 animate-pulse"></div>
        </div>
        
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;