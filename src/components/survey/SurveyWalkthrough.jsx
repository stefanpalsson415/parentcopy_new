// src/components/survey/SurveyWalkthrough.jsx
import React, { useState, useEffect } from 'react';
import WalkthroughTooltip from './WalkthroughTooltip';

const SurveyWalkthrough = ({ isVisible, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Define the walkthrough steps
  const steps = [
    {
      target: null, // Center overlay
      title: "Welcome to Your Initial Survey",
      content: "Welcome to your initial survey! This helps Allie understand how tasks are distributed in your family. Your answers will help create a personalized plan to balance workload.",
      position: "center"
    },
    {
      target: ".question-area",
      title: "Understanding the Questions",
      content: "Each question asks who typically handles a specific task in your household. Answer honestly - there are no right or wrong answers.",
      position: "bottom"
    },
    {
      target: ".parent-selection",
      title: "Select Who Does the Task",
      content: "Simply select who most often performs this task - Mama or Papa. You can also use keyboard shortcuts: 'M' for Mama and 'P' for Papa.",
      position: "top"
    },
    {
      target: ".impact-indicator",
      title: "Task Impact",
      content: "This 'Impact' rating shows how much this task affects overall family balance. Tasks with higher impact scores contribute more to workload imbalance.",
      position: "right"
    },
    {
      target: ".weight-customization",
      title: "Personalize Task Weights",
      content: "Click here to customize how Allie weighs different aspects of this task. Adjusting these values helps Allie better understand what matters to your family.",
      position: "bottom"
    },
    {
      target: ".feedback-button",
      title: "Provide Feedback",
      content: "If a question doesn't apply to your family or needs improvement, click 'Question Feedback' to let us know. This helps make future surveys more relevant to your situation.",
      position: "bottom"
    },
    {
      target: null, // Center overlay
      title: "You're Ready to Go!",
      content: "Answer honestly for the most accurate results. There are no right answers - just your family's reality. This data helps Allie provide tailored insights for a more balanced family life.",
      position: "center"
    }
  ];

  // If tutorial is not visible, don't render
  if (!isVisible) return null;

  // Create spotlight effect on the target element
  const createSpotlight = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.target || currentStepData.position === 'center') return null;

    try {
      const targetElement = document.querySelector(currentStepData.target);
      if (!targetElement) return null;

      const rect = targetElement.getBoundingClientRect();
      
      // Add padding around the element
      const padding = 10;
      
      return (
        <div 
          className="absolute"
          style={{
            top: rect.top - padding + 'px',
            left: rect.left - padding + 'px',
            width: rect.width + (padding * 2) + 'px',
            height: rect.height + (padding * 2) + 'px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '4px',
            zIndex: 40
          }}
        />
      );
    } catch (e) {
      console.error('Error creating spotlight:', e);
      return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Spotlight effect */}
      {createSpotlight()}
      
      {/* Tooltip */}
      <WalkthroughTooltip 
        step={steps[currentStep]}
        onNext={() => setCurrentStep(prev => prev + 1)}
        onPrev={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        onSkip={onComplete}
        isLastStep={currentStep === steps.length - 1}
        isFirstStep={currentStep === 0}
      />
    </div>
  );
};

export default SurveyWalkthrough;