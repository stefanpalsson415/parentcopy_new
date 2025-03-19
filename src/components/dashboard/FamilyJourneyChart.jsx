import React from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FamilyJourneyChart = () => {
  const { completedWeeks, weekHistory } = useFamily();
  
  // Generate journey data
  const generateJourneyData = () => {
    const journeyData = [];
    
    // Add initial point
    if (weekHistory.initial) {
      journeyData.push({
        point: 'Initial',
        balance: Math.abs(50 - (weekHistory.initial?.balance?.mama || 70)),
        tasks: 0,
        meetings: 0
      });
    }
    
    // Add data for each completed week
    completedWeeks.forEach(week => {
      const weekData = weekHistory[`week${week}`];
      if (weekData) {
        journeyData.push({
          point: `Week ${week}`,
          balance: Math.abs(50 - (weekData?.balance?.mama || 50)),  // Distance from perfect balance
          tasks: (weekData?.tasks?.filter(t => t.completed)?.length || 0),
          meetings: weekData?.meetingNotes ? 1 : 0
        });
      }
    });
    
    return journeyData;
  };
  
  const journeyData = generateJourneyData();
  
  if (journeyData.length < 2) {
    return <div className="text-center p-6 bg-gray-50 rounded">Complete more weekly check-ins to see your family journey!</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">Your Family Balance Journey</h3>
      <p className="text-sm text-gray-600 mb-4">
        This chart shows your progress toward perfect balance (center line) while tracking completed tasks and meetings
      </p>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={journeyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="point" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Imbalance', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Area yAxisId="left" type="monotone" dataKey="balance" stroke="#8884d8" fill="#8884d8" name="Imbalance Score" />
            <Area yAxisId="right" type="monotone" dataKey="tasks" stroke="#82ca9d" fill="#82ca9d" name="Completed Tasks" />
            <Area yAxisId="right" type="monotone" dataKey="meetings" stroke="#ffc658" fill="#ffc658" name="Family Meetings" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
        <strong>Your Progress:</strong> {
          journeyData[0].balance > journeyData[journeyData.length-1].balance
            ? `Your family has improved balance by ${(journeyData[0].balance - journeyData[journeyData.length-1].balance).toFixed(1)}% since starting!`
            : `Your family is still working toward better balance. Keep going!`
        }
      </div>
    </div>
  );
};

export default FamilyJourneyChart;