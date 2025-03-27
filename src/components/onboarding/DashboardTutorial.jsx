import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle, Brain, Heart, Calendar, MessageCircle, PieChart, Users } from 'lucide-react';

const DashboardTutorial = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Define tutorial steps
  const steps = [
    {
      title: "Welcome to Allie!",
      description: "You've completed the initial survey! Now let's explore how Allie helps balance your family responsibilities.",
      icon: <CheckCircle className="w-10 h-10 text-green-500 mb-2" />,
      position: "center"
    },
    {
      title: "Task System & Cycles",
      description: "Allie works in flexible cycles rather than strict weeks. Each cycle, you'll receive personalized tasks based on your survey data to improve balance.",
      icon: <ArrowRight className="w-10 h-10 text-blue-500 mb-2" />,
      target: "tasks-tab",
      position: "bottom"
    },
    {
      title: "AI Insights",
      description: "Allie uses powerful AI to analyze patterns in your family's workload and provide personalized insights and recommendations.",
      icon: <Brain className="w-10 h-10 text-purple-500 mb-2" />,
      target: "dashboard-tab",
      position: "bottom"
    },
    {
      title: "Family Meetings",
      description: "Regular family meetings help maintain communication and balance. Allie will guide these with AI-generated agendas and discussion points.",
      icon: <Users className="w-10 h-10 text-amber-500 mb-2" />,
      target: "family-meeting-button",
      position: "bottom"
    },
    {
      title: "Relationship Focus",
      description: "A balanced workload leads to a stronger relationship. Track and improve your relationship health with dedicated insights and check-ins.",
      icon: <Heart className="w-10 h-10 text-pink-500 mb-2" />,
      target: "relationship-tab",
      position: "bottom"
    },
    {
      title: "Calendar Integration",
      description: "Allie can sync with your calendar to help manage family responsibilities and meetings. Set it up in your settings.",
      icon: <Calendar className="w-10 h-10 text-indigo-500 mb-2" />,
      target: "settings-button",
      position: "left"
    },
    {
      title: "Ask Allie Anything",
      description: "Use the Allie Chat feature to ask questions, get advice, or learn more about any aspect of family balance.",
      icon: <MessageCircle className="w-10 h-10 text-teal-500 mb-2" />,
      target: "chat-button",
      position: "left"
    },
    {
      title: "You're All Set!",
      description: "You're now ready to start your journey to a more balanced family life. Remember, consistency is key to seeing improvements over time.",
      icon: <CheckCircle className="w-10 h-10 text-green-500 mb-2" />,
      position: "center"
    }
  ];

  // Helper function to position tooltip relative to target
  const getTooltipPosition = (targetId, position) => {
    if (position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement) return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const rect = targetElement.getBoundingClientRect();

    switch (position) {
      case "top":
        return {
          position: "absolute",
          top: `${rect.top - 100}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)"
        };
      case "bottom":
        return {
          position: "absolute",
          top: `${rect.bottom + 10}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)"
        };
      case "left":
        return {
          position: "absolute",
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - 280}px`,
          transform: "translateY(-50%)"
        };
      case "right":
        return {
          position: "absolute",
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 10}px`,
          transform: "translateY(-50%)"
        };
      default:
        return {
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        };
    }
  };

  // Mark tutorial as complete
  const completeTutorial = () => {
    localStorage.setItem('dashboardTutorialCompleted', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  // Skip tutorial
  const skipTutorial = () => {
    localStorage.setItem('dashboardTutorialCompleted', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  // Go to next step
  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeTutorial();
    }
  };

  // Check if tutorial should be shown
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('dashboardTutorialCompleted');
    if (tutorialCompleted === 'true') {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  const currentStep = steps[step];
  const tooltipStyle = getTooltipPosition(currentStep.target, currentStep.position);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-y-auto h-full w-full">
      <div 
        className="bg-white rounded-lg shadow-lg p-6 w-80 max-w-sm"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 font-roboto">
            {step + 1}. {currentStep.title}
          </h3>
          <button 
            onClick={skipTutorial}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex justify-center mb-4">
          {currentStep.icon}
        </div>
        
        <p className="text-gray-600 mb-6 font-roboto">
          {currentStep.description}
        </p>
        
        <div className="flex justify-between">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div 
                key={index} 
                className={`w-2 h-2 rounded-full ${
                  index === step ? 'bg-black' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-roboto"
          >
            {step < steps.length - 1 ? 'Next' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardTutorial;