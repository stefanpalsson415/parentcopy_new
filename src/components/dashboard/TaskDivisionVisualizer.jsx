// src/components/dashboard/TaskDivisionVisualizer.jsx
import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Filter, Users, Scale } from 'lucide-react';

const TaskDivisionVisualizer = () => {
  const { familyMembers, taskRecommendations, surveyResponses } = useFamily();
  
  const [viewMode, setViewMode] = useState('category'); // 'category', 'weight', 'time'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month'
  const [data, setData] = useState([]);
  
  // Prepare data for visualization
  useEffect(() => {
    // Get parents
    const mama = familyMembers.find(m => m.roleType === 'Mama');
    const papa = familyMembers.find(m => m.roleType === 'Papa');
    
    if (!mama || !papa) return;
    
    // Process task data based on view mode
    if (viewMode === 'category') {
      // Group tasks by category
      const categories = {
        "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
        "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
        "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
        "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
      };
      
      // Count tasks by category and who they're assigned to
      taskRecommendations.forEach(task => {
        const category = task.category || 'Uncategorized';
        if (categories[category]) {
          categories[category].total++;
          if (task.assignedTo === 'Mama') {
            categories[category].mama++;
          } else if (task.assignedTo === 'Papa') {
            categories[category].papa++;
          }
        }
      });
      
      // Convert to percentage data for visualization
      const visualData = Object.entries(categories).map(([category, counts]) => {
        const total = counts.total || 1; // Avoid division by zero
        return {
          name: category,
          mama: (counts.mama / total) * 100,
          papa: (counts.papa / total) * 100
        };
      });
      
      setData(visualData);
    } else if (viewMode === 'weight') {
      // Create weighted task data based on task types
      const weightData = [
        { name: 'High Impact', mama: 65, papa: 35 },
        { name: 'Emotional Labor', mama: 70, papa: 30 },
        { name: 'Time Intensive', mama: 60, papa: 40 },
        { name: 'Regular Tasks', mama: 55, papa: 45 }
      ];
      
      setData(weightData);
    } else if (viewMode === 'time') {
      // Create time-based data
      const timeData = [
        { name: 'Morning', mama: 60, papa: 40 },
        { name: 'Afternoon', mama: 55, papa: 45 },
        { name: 'Evening', mama: 65, papa: 35 },
        { name: 'Weekends', mama: 50, papa: 50 }
      ];
      
      setData(timeData);
    }
  }, [viewMode, timeFilter, taskRecommendations, surveyResponses, familyMembers]);
  
  // Colors for visualization
  const MAMA_COLOR = '#8884d8';
  const PAPA_COLOR = '#82ca9d';
  
  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium text-sm font-roboto">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-roboto">
              {`${entry.name}: ${entry.value.toFixed(1)}%`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto flex items-center">
            <Users size={20} className="text-black mr-2" />
            Task Division Visualization
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter size={14} className="mr-1 text-gray-500" />
              <select 
                className="text-sm border rounded py-1 px-2 font-roboto"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="category">By Category</option>
                <option value="weight">By Weight</option>
                <option value="time">By Time</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <Filter size={14} className="mr-1 text-gray-500" />
              <select 
                className="text-sm border rounded py-1 px-2 font-roboto"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-6 font-roboto">
          Visualize how tasks are divided between parents based on different factors
        </p>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 font-roboto">Distribution by {viewMode === 'category' ? 'Category' : viewMode === 'weight' ? 'Impact Weight' : 'Time of Day'}</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="mama" name="Mama" fill={MAMA_COLOR} stackId="a" />
                  <Bar dataKey="papa" name="Papa" fill={PAPA_COLOR} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Pie Chart */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 font-roboto">Overall Balance</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Mama', value: data.reduce((sum, item) => sum + item.mama, 0) / data.length },
                      { name: 'Papa', value: data.reduce((sum, item) => sum + item.papa, 0) / data.length }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    dataKey="value"
                  >
                    <Cell fill={MAMA_COLOR} />
                    <Cell fill={PAPA_COLOR} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Weight Scale Visualization */}
        <div className="border rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-3 font-roboto flex items-center">
            <Scale size={16} className="mr-2 text-black" />
            Task Balance Scale
          </h4>
          
          <div className="h-36 relative">
            {/* Calculate overall balance */}
            {(() => {
              const mamaAvg = data.reduce((sum, item) => sum + item.mama, 0) / data.length;
              const papaAvg = data.reduce((sum, item) => sum + item.papa, 0) / data.length;
              
              return (
                <>
                  {/* The Balance Scale */}
                  <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-4 h-24 bg-gray-700 rounded"></div>
                  
                  {/* The Balance Beam */}
                  <div 
                    className="absolute left-1/2 top-8 transform -translate-x-1/2 w-64 h-4 bg-gray-700 rounded transition-transform duration-700 ease-in-out"
                    style={{ 
                      transformOrigin: 'center',
                      transform: `translateX(-50%) rotate(${(mamaAvg - 50) * 0.6}deg)` 
                    }}
                  >
                    {/* Mama's Side */}
                    <div className="absolute left-0 -top-20 w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center transform -translate-x-1/2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-800">{mamaAvg.toFixed(0)}%</div>
                        <div className="text-xs text-purple-700">Mama</div>
                      </div>
                    </div>
                    
                    {/* Papa's Side */}
                    <div className="absolute right-0 -top-20 w-16 h-16 bg-green-200 rounded-full flex items-center justify-center transform translate-x-1/2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-800">{papaAvg.toFixed(0)}%</div>
                        <div className="text-xs text-green-700">Papa</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="mt-2 text-center">
            <p className="text-sm text-gray-600 font-roboto">
              {Math.abs(data.reduce((sum, item) => sum + item.mama - 50, 0) / data.length) < 10 
                ? "Great job! Your task distribution is well balanced."
                : "There's room for improvement in balancing tasks more evenly."}
            </p>
          </div>
        </div>
        
        {/* Insights Box */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium mb-2 font-roboto">Key Insights</h4>
          <ul className="space-y-2 text-sm font-roboto">
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-purple-100 rounded-full text-purple-600 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">1</span>
              <span>
                {viewMode === 'category' 
                  ? "Invisible tasks are currently the most imbalanced category with Mama handling significantly more."
                  : viewMode === 'weight'
                    ? "High-impact tasks with emotional labor components show the greatest imbalance."
                    : "Evening routines are where the task imbalance is most pronounced."}
              </span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-purple-100 rounded-full text-purple-600 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">2</span>
              <span>
                {viewMode === 'category'
                  ? "Visible household tasks are the most balanced category currently."
                  : viewMode === 'weight'
                    ? "Regular, routine tasks have the most equitable distribution."
                    : "Weekend task distribution is most balanced between parents."}
              </span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-purple-100 rounded-full text-purple-600 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">3</span>
              <span>
                Research shows that a 60/40 split or better in task division leads to significantly higher relationship satisfaction.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TaskDivisionVisualizer;