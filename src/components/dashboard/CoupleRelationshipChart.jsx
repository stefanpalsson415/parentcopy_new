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
  const [predictionData, setPredictionData] = useState([]);
  const [showPrediction, setShowPrediction] = useState(false);
  const [hasEnoughData, setHasEnoughData] = useState(false);

  useEffect(() => {
    // Get trend data from context
    const data = getRelationshipTrendData();
    
    // Check if we have enough meaningful data
    const hasData = data && data.length >= 2 && 
      data.some(point => typeof point.satisfaction === 'number');
    
    setHasEnoughData(hasData);
    
    // Clean and validate data - ensure numeric values
    const cleanedData = data.map(point => ({
      week: point.week,
      satisfaction: typeof point.satisfaction === 'number' ? point.satisfaction : null,
      communication: typeof point.communication === 'number' ? point.communication : null,
      workloadBalance: typeof point.workloadBalance === 'number' ? point.workloadBalance : null
    }));
    
    // Use default values for null or undefined properties
    const processedData = cleanedData.map(point => ({
      week: point.week,
      satisfaction: point.satisfaction !== null ? point.satisfaction : 3.0,
      communication: point.communication !== null ? point.communication : 3.0,
      workloadBalance: point.workloadBalance !== null ? point.workloadBalance : 50.0
    }));
    
    setTrendData(processedData);
    
    // Generate correlation data
    const correlation = processedData.map(point => ({
      week: point.week,
      correlation: calculateCorrelation(point.workloadBalance, point.satisfaction),
      workloadBalance: point.workloadBalance,
      satisfaction: point.satisfaction
    }));
    setCorrelationData(correlation);
    
    // Generate insights based on data
    setInsights(generateInsights(processedData, relationshipStrategies));
    
    // Generate prediction data
    const predictions = generateSatisfactionPrediction(processedData, relationshipStrategies);
    setPredictionData(predictions);

    setLoading(false);
  }, [getRelationshipTrendData, relationshipStrategies]);
  
  // Helper function to calculate correlation
  const calculateCorrelation = (balance, satisfaction) => {
    // Simplified correlation metric
    if (typeof balance !== 'number' || typeof satisfaction !== 'number') {
      return 0;
    }
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
        description: `Your relationship satisfaction has increased from ${previous.satisfaction.toFixed(1)} to ${latest.satisfaction.toFixed(1)} as workload balance improves.`,
        icon: <TrendingUp size={20} className="text-green-600" />
      });
    } else if (latest.satisfaction < previous.satisfaction) {
      insights.push({
        type: 'warning',
        title: 'Relationship Satisfaction Decreasing',
        description: `Despite efforts, satisfaction has decreased from ${previous.satisfaction.toFixed(1)} to ${latest.satisfaction.toFixed(1)}. Consider focusing more on emotional connection.`,
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
  
  // Generate prediction data
  const generateSatisfactionPrediction = (data, strategies) => {
    if (!data || data.length < 2 || !strategies || strategies.length === 0) {
      return null;
    }
    
    // Get current satisfaction and implementation rates
    const latest = data[data.length - 1];
    const implementedStrategies = strategies.filter(s => s.implementation > 0);
    const avgImplementation = implementedStrategies.length > 0 
      ? implementedStrategies.reduce((sum, s) => sum + s.implementation, 0) / implementedStrategies.length 
      : 0;
    
    // Calculate predicted improvement based on strategy implementation
    // This is a simplified model - in real app would be more sophisticated
    const baseImprovement = 0.02; // Base weekly improvement
    const strategyEffect = avgImplementation / 100 * 0.08; // Effect of strategies
    const predictedImprovement = baseImprovement + strategyEffect;
    
    // Generate prediction for next 8 weeks
    const predictions = [];
    let currentSatisfaction = latest.satisfaction;
    
    for (let week = 1; week <= 8; week++) {
      // Apply diminishing returns as satisfaction approaches 5
      const weeklyImprovement = predictedImprovement * (5 - currentSatisfaction) / 2;
      currentSatisfaction = Math.min(5, currentSatisfaction + weeklyImprovement);
      
      predictions.push({
        week: `Week ${data.length + week}`,
        satisfaction: parseFloat(currentSatisfaction.toFixed(2)),
        predicted: true
      });
    }
    
    return predictions;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium text-sm font-roboto">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-roboto">
              {entry.name}: {entry.value?.toFixed(1) || 'N/A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Empty state when no data
  if (!hasEnoughData && !loading) {
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
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-bold mb-2 font-roboto flex items-center">
          <Heart size={20} className="mr-2 text-pink-600" />
          Relationship & Workload Balance
        </h3>
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Track how workload balance affects your relationship satisfaction over time
        </p>
        
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
          <button 
            className={`px-4 py-2 font-roboto ${chartType === 'prediction' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`} 
            onClick={() => setChartType('prediction')}
          >
            Prediction
          </button>
        </div>
        
        {/* Charts Section */}
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
                  connectNulls={true}
                />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="communication" 
                  stroke="#4ECDC4" 
                  name="Communication Quality (1-5)" 
                  connectNulls={true}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="workloadBalance" 
                  stroke="#1A535C" 
                  name="Workload Balance (0-100)" 
                  connectNulls={true}
                />
              </LineChart>
            ) : chartType === 'prediction' ? (
              <LineChart data={[...trendData, ...(predictionData || [])]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#FF6B6B" 
                  name="Relationship Satisfaction (1-5)"
                  strokeWidth={2}
                  connectNulls={true}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!cx || !cy) return null;
                    if (payload.predicted) {
                      return <circle cx={cx} cy={cy} r={4} fill="white" stroke="#FF6B6B" strokeWidth={2} />;
                    }
                    return <circle cx={cx} cy={cy} r={4} fill="#FF6B6B" />;
                  }}
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
                  connectNulls={true}
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
                  connectNulls={true}
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
        
        {/* Prediction Section */}
        {predictionData && predictionData.length > 0 && chartType === 'prediction' && (
          <div className="mt-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
            <h4 className="font-medium mb-2 font-roboto">Satisfaction Prediction Model</h4>
            <p className="text-sm text-gray-600 font-roboto">
              Based on your current strategy implementation and progress, here's how your relationship satisfaction may evolve:
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-roboto">Current satisfaction:</span>
                <span className="font-medium text-sm font-roboto">{trendData[trendData.length-1]?.satisfaction.toFixed(1)}/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-roboto">Predicted in 4 weeks:</span>
                <span className="font-medium text-sm font-roboto">{predictionData[3]?.satisfaction.toFixed(1)}/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-roboto">Predicted in 8 weeks:</span>
                <span className="font-medium text-sm font-roboto">{predictionData[7]?.satisfaction.toFixed(1)}/5</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white rounded border border-blue-100">
              <p className="text-xs text-blue-700 font-roboto">
                <strong>Success tips:</strong> Regular check-ins and expressing appreciation for your partner could boost your satisfaction more quickly.
              </p>
            </div>
          </div>
        )}

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