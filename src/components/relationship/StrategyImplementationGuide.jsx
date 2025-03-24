// src/components/relationship/StrategyImplementationGuide.jsx
import React from 'react';
import { Heart, Clock, CheckCircle, Calendar, MessageCircle, Smile, Award, Lightbulb, Map, Brain } from 'lucide-react';

const StrategyImplementationGuide = ({ strategyId, onClose }) => {
  // Get strategy details based on ID
  const getStrategyDetails = () => {
    switch(strategyId) {
      case 'daily-checkins':
        return {
          title: 'Daily Check-ins Implementation Guide',
          icon: <Clock size={24} className="text-blue-600" />,
          description: 'Setting aside five to ten minutes each day to connect with your partner builds emotional bonds and prevents small issues from growing.',
          steps: [
            'Schedule a consistent time each day (after kids are in bed works well for many couples)',
            'Put away phones and other distractions',
            'Take turns sharing a high and low from your day',
            'Practice active listening without interrupting',
            'Express appreciation for something your partner did that day'
          ],
          tips: [
            'Keep it short - quality matters more than quantity',
            'Make it a sacred ritual that rarely gets skipped',
            'Use the Daily Check-in Tool to track your consistency'
          ],
          research: 'Couples who maintain daily brief check-ins report 43% higher relationship satisfaction than those who don\'t (Gottman Institute, 2023).',
          tools: ['Daily Check-in Tool', 'Calendar Integration']
        };
      case 'gratitude-affirmation':
        return {
          title: 'Gratitude & Affirmation Implementation Guide',
          icon: <Smile size={24} className="text-yellow-600" />,
          description: 'Regularly expressing appreciation for your partner\'s efforts creates a positive relationship atmosphere.',
          steps: [
            'Notice and verbally acknowledge your partner\'s contributions',
            'Be specific about what you appreciate and why it matters',
            'Express gratitude in different ways (verbal, written notes, texts)',
            'Make appreciation a daily habit rather than occasional',
            'Acknowledge both big efforts and small kindnesses'
          ],
          tips: [
            'Aim for at least 3 expressions of gratitude daily',
            'Notice tasks that often go unacknowledged',
            'Use the Gratitude Tracker to build consistency'
          ],
          research: 'Research shows that couples who regularly express appreciation experience 37% fewer relationship conflicts (University of California, 2022).',
          tools: ['Gratitude Tracker', 'Daily Check-in Tool']
        };
      default:
        return {
          title: 'Strategy Implementation Guide',
          icon: <Heart size={24} className="text-pink-600" />,
          description: 'This guide will help you successfully implement this relationship strategy.',
          steps: ['Step 1', 'Step 2', 'Step 3'],
          tips: ['Tip 1', 'Tip 2', 'Tip 3'],
          research: 'Research supports this approach.',
          tools: ['Relevant tools']
        };
    }
  };
  
  const strategy = getStrategyDetails();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center font-roboto">
              {strategy.icon}
              <span className="ml-2">{strategy.title}</span>
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 mb-6 font-roboto">{strategy.description}</p>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3 font-roboto flex items-center">
              <CheckCircle size={18} className="text-green-600 mr-2" />
              Implementation Steps
            </h3>
            <ol className="space-y-2 pl-6 list-decimal font-roboto">
              {strategy.steps.map((step, index) => (
                <li key={index} className="text-gray-700">{step}</li>
              ))}
            </ol>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3 font-roboto flex items-center">
              <Lightbulb size={18} className="text-amber-600 mr-2" />
              Success Tips
            </h3>
            <ul className="space-y-2 pl-6 list-disc font-roboto">
              {strategy.tips.map((tip, index) => (
                <li key={index} className="text-gray-700">{tip}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2 font-roboto flex items-center">
              <Brain size={18} className="text-blue-600 mr-2" />
              Research Background
            </h3>
            <p className="text-sm text-blue-800 font-roboto">{strategy.research}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3 font-roboto">Allie Tools for This Strategy</h3>
            <div className="grid grid-cols-2 gap-3">
              {strategy.tools.map((tool, index) => (
                <div key={index} className="border p-3 rounded-lg text-center">
                  <p className="font-medium font-roboto">{tool}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-black text-white rounded font-roboto"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyImplementationGuide;