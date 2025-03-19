import React from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CoupleRelationshipChart = () => {
  const { getRelationshipTrendData } = useFamily();
  
  // Get trend data
  const trendData = getRelationshipTrendData();
  
  if (trendData.length < 2) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded">
        Complete more couple check-ins to see your relationship trends.
      </div>
    );
  }
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">Relationship & Workload Balance</h3>
      <p className="text-sm text-gray-600 mb-4">
        This chart shows the relationship between your workload balance and relationship metrics
      </p>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis domain={[0, 5]} yAxisId="left" />
            <YAxis domain={[0, 100]} yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="satisfaction" 
              stroke="#FF6B6B" 
              name="Relationship Satisfaction (1-5)" 
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="communication" 
              stroke="#4ECDC4" 
              name="Communication Quality (1-5)" 
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="workloadBalance" 
              stroke="#1A535C" 
              name="Workload Balance (0-100)" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 bg-pink-50 p-3 rounded text-sm text-pink-800">
        <p>
          <strong>Insight:</strong> {
            trendData[trendData.length-1].satisfaction > trendData[0].satisfaction
              ? `Your relationship satisfaction is improving as workload balance improves!`
              : `Your relationship satisfaction may be affected by workload imbalance - this week's focus on balance could help.`
          }
        </p>
      </div>
    </div>
  );
};

export default CoupleRelationshipChart;