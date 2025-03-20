import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Info, TrendingUp, AlertCircle, Heart, CheckCircle, Lightbulb } from 'lucide-react';

const CoupleRelationshipChart = () => {
  const { getRelationshipTrendData, relationshipStrategies } = useFamily();
  const [trendData, setTrendData] = useState([]);
  const [correlationData, setCorrelationData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('main'); // 'main', 'correlation', 'satisfaction'
  
  useEffect(() => {
    // Get trend data from context
    const data = getRelationshipTrendData();
    setTrendData(data);
    
    // Generate correlation data
    const correlation = data.map(point => ({
      week: point.week,
      correlation: calculateCorrelation(point.workloadBalance, point.satisfaction),
      workloadBalance: point.workloadBalance,
      satisfaction: point.satisfaction
    }));
    setCorrelationData(correlation);
    
    // Generate insights based on data
    setInsights(generateInsights(data, relationshipStrategies));
    
    setLoading(false);
  }, [getRelationshipTrendData, relationshipStrategies]);
  
  // Helper function to calculate correlation
  const calculateCorrelation = (balance, satisfaction) => {
    // Simplified correlation metric
    return (balance / 100) * satisfaction;
  };
  
  // Generate insights based on data
  const generateInsights = (data, strategies) => {
    if (!data || data.length < 2) {
      return [
        {
          type: 'info',
          title: 'Not Enough Data',
          description: 'Complete more couple check-ins to generate relationship insights.',
          icon: <Info size={20} className="text-blue-600" />
        }
      ];
    }
    
    const insights = [];
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    // Trend insight
    if (latest.satisfaction > previous.satisfaction) {
      insights.push({
        type: 'progress',
        title: 'Relationship Satisfaction Improving',
        description: `Your relationship satisfaction has increased from ${previous.satisfaction} to ${latest.satisfaction} as workload balance improves.`,
        icon: <TrendingUp size={20} className="text-green-600" />
      });
    } else if (latest.satisfaction < previous.satisfaction) {
      insights.push({
        type: 'warning',
        title: 'Relationship Satisfaction Decreasing',
        description: `Despite efforts, satisfaction has decreased from ${previous.satisfaction} to ${latest.satisfaction}. Consider focusing more on emotional connection.`,
        icon: <AlertCircle size={20} className="text-amber-600" />
      });
    }
    
    // Communication insight
    if (latest.communication > 3.5) {
      insights.push({
        type: 'strength',
        title: 'Strong Communication',
        description: 'Your communication quality is scoring high, which is a key factor in relationship health.',
        icon: <CheckCircle size={20} className="text-green-600" />
      });
    } else {
      insights.push({
        type: 'opportunity',
        title: 'Communication Opportunity',
        description: 'Improving communication could significantly boost your relationship satisfaction.',
        icon: <Lightbulb size={20} className="text-blue-600" />
      });
    }
    
    // Balance-relationship correlation insight
    if (latest.workloadBalance > 75 && latest.satisfaction > 4) {
      insights.push({
        type: 'correlation',
        title: 'Balance-Relationship Link Confirmed',
        description: 'Your data shows a strong correlation between better workload balance and relationship satisfaction.',
        icon: <Heart size={20} className="text-red-600" />
      });
    }
    
    // Strategy insight - if relationship strategies data is available
    if (strategies && strategies.length > 0) {
      const implementedStrategies = strategies.filter(s => s.implementation >= 50);
      if (implementedStrategies.length > 0) {
        insights.push({
          type: 'strategy',
          title: 'Effective Strategies Identified',
          description: `You've successfully implemented ${implementedStrategies.length} relationship strategies, which is helping strengthen your bond.`,
          icon: <CheckCircle size={20} className="text-purple-600" />
        });
      }
    }
    
    return insights;
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium text-sm font-roboto">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-roboto">
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (trendData.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <Heart size={40} className="mx-auto mb-2 text-black" />
          <h3 className="text-lg font-bold mb-2 font-roboto">Relationship & Workload Balance</h3>
          <p className="text-gray-600 mb-6 font-roboto">
            Complete at least two couple check-ins to see your relationship trends
          </p>
          <div className="p-6 bg-gray-50 rounded-lg inline-block">
            <p className="text-sm text-gray-600 font-roboto">
              The couple check-in helps track how workload balance affects your relationship.
              Find it at the bottom of the Tasks tab after completing your weekly check-in.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 font-roboto">Relationship & Workload Balance</h3>
        
        {/* Chart Type Selector */}
        <div className="flex mb-4">
          <button 
            className={`px-4 py-2 font-roboto ${chartType === 'main' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`} 
            onClick={() => setChartType('main')}
          >
            Combined View
          </button>
          <button 
            className={`px-4 py-2 font-roboto ${chartType === 'satisfaction' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`} 
            onClick={() => setChartType('satisfaction')}
          >
            Satisfaction Trend
          </button>
          <button 
            className={`px-4 py-2 font-roboto ${chartType === 'correlation' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`} 
            onClick={() => setChartType('correlation')}
          >
            Correlation
          </button>
        </div>
        
        {/* Main Chart */}
        <div className="h-64 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'main' ? (
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
            ) : chartType === 'satisfaction' ? (
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#FF6B6B" 
                  fill="#FF6B6B" 
                  fillOpacity={0.3}
                  name="Relationship Satisfaction (1-5)" 
                />
              </AreaChart>
            ) : (
              <LineChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="correlation" 
                  stroke="#8884d8" 
                  name="Balance-Satisfaction Correlation" 
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Key Insights */}
        <div className="mt-4 space-y-3">
          <h4 className="font-medium mb-2 font-roboto">Relationship Insights</h4>
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg flex items-start border ${
                insight.type === 'progress' ? 'bg-green-50 border-green-200' :
                insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                insight.type === 'strength' ? 'bg-teal-50 border-teal-200' :
                insight.type === 'opportunity' ? 'bg-blue-50 border-blue-200' :
                insight.type === 'correlation' ? 'bg-pink-50 border-pink-200' :
                insight.type === 'strategy' ? 'bg-purple-50 border-purple-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="mt-0.5 mr-3 flex-shrink-0">
                {insight.icon}
              </div>
              <div>
                <h5 className="font-medium text-sm font-roboto">{insight.title}</h5>
                <p className="text-sm mt-1 font-roboto">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium mb-2 font-roboto">Why This Matters</h4>
          <p className="text-sm font-roboto">
            Research consistently shows that a strong, supportive bond between parents benefits both marital 
            satisfaction and directly contributes to healthier family functioning. Balance in household and 
            parental responsibilities helps strengthen this bond.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoupleRelationshipChart;