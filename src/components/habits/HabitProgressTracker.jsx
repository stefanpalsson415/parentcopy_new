// src/components/habits/HabitProgressTracker.jsx
import React from 'react';
import { CheckCircle, X, Calendar, Heart, Star, Award } from 'lucide-react';

const HabitProgressTracker = ({ streak, record, goalDays = 21, habit }) => {
  // Calculate completion percentage toward goal
  const completionPercentage = Math.min(100, Math.round((streak / goalDays) * 100));
  
  // Milestone calculations
  const milestones = [
    { days: 1, label: "Day 1!", icon: <Star className="text-amber-500" size={14} /> },
    { days: 3, label: "3 Days", icon: <Heart className="text-pink-500" size={14} /> },
    { days: 7, label: "1 Week!", icon: <Award className="text-blue-500" size={14} /> },
    { days: 14, label: "2 Weeks!", icon: <Award className="text-indigo-500" size={14} /> },
    { days: 21, label: "21 Days!", icon: <Award className="text-purple-500" size={14} /> },
    { days: 30, label: "30 Days!", icon: <Award className="text-green-500" size={14} /> },
    { days: 60, label: "60 Days!", icon: <Award className="text-amber-500" size={14} /> },
    { days: 90, label: "90 Days!", icon: <Award className="text-red-500" size={14} /> }
  ];
  
  // Find the next milestone
  const nextMilestone = milestones.find(m => m.days > streak) || milestones[milestones.length - 1];
  
  // Find achieved milestones
  const achievedMilestones = milestones.filter(m => streak >= m.days);
  
  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Progress toward habit formation</h3>
        <div className="flex items-center text-xs font-medium">
          <span className="text-amber-600">Goal: {goalDays} days</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            completionPercentage >= 100 ? 'bg-green-500' : 'bg-black'
          }`}
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      
      {/* Current stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-100 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500">Current Streak</div>
          <div className="text-lg font-bold">{streak}</div>
          <div className="text-xs">days</div>
        </div>
        
        <div className="bg-gray-100 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500">Record</div>
          <div className="text-lg font-bold">{record}</div>
          <div className="text-xs">days</div>
        </div>
        
        <div className="bg-gray-100 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500">Progress</div>
          <div className="text-lg font-bold">{completionPercentage}%</div>
          <div className="text-xs">complete</div>
        </div>
      </div>
      
      {/* Next milestone */}
      {nextMilestone && streak < goalDays && (
        <div className="mb-3 bg-blue-50 p-2 rounded-lg flex items-center">
          <Calendar size={16} className="text-blue-500 mr-2" />
          <div>
            <div className="text-xs text-blue-700">Next milestone:</div>
            <div className="text-sm font-medium flex items-center">
              {nextMilestone.icon}
              <span className="ml-1">{nextMilestone.label}</span>
              <span className="ml-2 text-xs text-blue-700">
                ({nextMilestone.days - streak} days to go)
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Achieved milestones */}
      {achievedMilestones.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Achieved milestones:</div>
          <div className="flex flex-wrap gap-2">
            {achievedMilestones.map((milestone, idx) => (
              <div key={idx} className="bg-green-50 px-2 py-1 rounded-full text-xs text-green-700 flex items-center">
                {milestone.icon}
                <span className="ml-1">{milestone.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Completion message */}
      {streak >= goalDays && (
        <div className="bg-green-50 p-3 rounded-lg text-green-700 mt-3">
          <div className="flex items-center">
            <CheckCircle size={18} className="mr-2 text-green-500" />
            <div className="font-medium">Habit successfully formed!</div>
          </div>
          <p className="text-sm mt-1">
            Congratulations! You've reached the 21-day milestone for habit formation. 
            Keep going to strengthen this habit even further!
          </p>
        </div>
      )}
    </div>
  );
};

export default HabitProgressTracker;