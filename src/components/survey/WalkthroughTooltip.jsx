// src/components/survey/WalkthroughTooltip.jsx
import React from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

const WalkthroughTooltip = ({ 
  step, 
  onNext, 
  onPrev, 
  onSkip,
  isLastStep,
  isFirstStep
}) => {
  if (!step) return null;

  return (
    <div 
      className="walkthrough-tooltip bg-white rounded-lg shadow-lg p-5 max-w-md z-50 relative"
      style={{
        position: 'absolute',
        ...getPositionStyles(step.position, step.target)
      }}
    >
      <button 
        onClick={onSkip}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        <X size={18} />
      </button>
      
      {step.title && (
        <h3 className="font-bold text-lg mb-2 font-roboto">{step.title}</h3>
      )}
      
      <p className="text-gray-700 font-roboto mb-4">{step.content}</p>
      
      <div className="flex justify-between items-center">
        <div>
          <button 
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 mr-4 font-roboto"
          >
            Skip tutorial
          </button>
        </div>
        <div className="flex items-center">
          {!isFirstStep && (
            <button 
              onClick={onPrev}
              className="mr-3 py-1 px-3 border rounded-md flex items-center font-roboto"
            >
              <ArrowLeft size={14} className="mr-1" />
              Back
            </button>
          )}
          <button 
            onClick={isLastStep ? onSkip : onNext}
            className="bg-black text-white py-1 px-4 rounded-md flex items-center font-roboto"
          >
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ArrowRight size={14} className="ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate position based on target element
const getPositionStyles = (position, targetSelector) => {
  if (!targetSelector || position === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  }

  try {
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = targetElement.getBoundingClientRect();
    
    switch (position) {
      case 'top':
        return {
          bottom: `${window.innerHeight - rect.top + 10}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: `${rect.bottom + 10}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2}px`,
          right: `${window.innerWidth - rect.left + 10}px`,
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 10}px`,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  } catch (e) {
    console.error('Error calculating tooltip position:', e);
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  }
};

export default WalkthroughTooltip;