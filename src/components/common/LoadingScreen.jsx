import React from 'react';
import { CheckCircle } from 'lucide-react';

const LoadingScreen = ({ message = "Processing your survey data...", showCheckmark = true }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 font-roboto">
      <div className="text-center p-8 max-w-md bg-white rounded-xl shadow-lg">
        {showCheckmark && (
          <div className="w-20 h-20 mx-auto mb-6 bg-black rounded-full flex items-center justify-center">
            <CheckCircle size={40} className="text-white" />
          </div>
        )}
        
        <h2 className="text-3xl font-bold mb-4 font-roboto">
          {message}
        </h2>
        
        <p className="text-gray-600 mb-8 font-roboto">
          We're preparing your personalized family dashboard with AI-powered insights...
        </p>
        
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="absolute top-0 bottom-0 left-0 bg-black w-full animate-pulse" 
               style={{animation: "progressAnimation 2s infinite"}}>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        </div>
        
        <p className="text-sm text-gray-500 mt-8 font-roboto">
          This will only take a few seconds...
        </p>
      </div>
      
      <style jsx="true">{`
        @keyframes progressAnimation {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;