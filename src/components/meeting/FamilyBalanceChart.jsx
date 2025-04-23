// src/components/meeting/FamilyBalanceChart.jsx
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Family balance chart component
const FamilyBalanceChart = ({ weekHistory, completedWeeks }) => {
  // Generate chart data from week history
  const generateChartData = () => {
    const data = [];
    
    // Add initial point if available
    if (weekHistory.initial) {
      // Calculate actual balance values from survey responses
      const initialBalance = calculateBalanceFromResponses(weekHistory.initial.surveyResponses || {});
      data.push({
        point: 'Initial',
        mama: initialBalance.mama,
        papa: initialBalance.papa,
        tasks: 0
      });
    }
    
    // Add data for each completed week
    completedWeeks.forEach(week => {
      const weekData = weekHistory[`week${week}`];
      if (weekData) {
        // Calculate actual balance values from this week's survey responses
        const weekBalance = weekData.balance && typeof weekData.balance.mama === 'number' 
          ? weekData.balance 
          : calculateBalanceFromResponses(weekData.surveyResponses || {});
        
        data.push({
          point: `Week ${week}`,
          mama: weekBalance.mama,
          papa: weekBalance.papa,
          tasks: (weekData?.tasks?.filter(t => t.completed)?.length || 0)
        });
      }
    });
    
    return data;
  };

  // Helper function to calculate balance from survey responses
  const calculateBalanceFromResponses = (responses) => {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses).forEach(value => {
      if (value === 'Mama' || value === 'Papa') {
        totalCount++;
        if (value === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    // Calculate percentages with proper default if no data
    const mamaPercent = totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
    
    return {
      mama: mamaPercent,
      papa: 100 - mamaPercent
    };
  };
    
  const data = generateChartData();
  
  if (data.length < 2) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <p className="text-blue-800 font-medium">Not enough data yet for a meaningful chart.</p>
        <p className="text-blue-600 text-sm mt-1">Complete more weekly meetings to see your family journey!</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 h-64">
      <h3 className="text-lg font-bold mb-2 font-roboto">Family Balance Journey</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="point" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="mama" stackId="1" stroke="#8884d8" fill="#8884d8" name="Mama %" />
          <Area type="monotone" dataKey="papa" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Papa %" />
          <Area type="monotone" dataKey="tasks" stroke="#ffc658" fill="#ffc658" name="Completed Tasks" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FamilyBalanceChart;