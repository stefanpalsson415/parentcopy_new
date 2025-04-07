// src/components/admin/ParserLearningDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import ParserFeedbackService from '../../services/ParserFeedbackService';

const ParserLearningDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadInsights();
  }, []);
  
  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ParserFeedbackService.getLearningInsights();
      setInsights(data);
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading parser learning insights:", err);
      setError("Failed to load insights");
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></div>
          <p>Loading parser learning insights...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertTriangle size={20} className="mr-2" />
          <p>{error}</p>
        </div>
        <button
          onClick={loadInsights}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!insights || insights.totalEntries === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No parser feedback data available yet.</p>
          <p className="text-sm text-gray-400">
            Feedback data will appear here as users edit AI-parsed events.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold font-roboto">Parser Learning Insights</h2>
          <button
            onClick={loadInsights}
            className="p-2 hover:bg-gray-100 rounded"
            title="Refresh insights"
          >
            <RefreshCw size={18} />
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Based on {insights.totalEntries} user edit{insights.totalEntries !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Most Frequently Corrected Fields</h3>
        
        {insights.patterns.mostCorrectedFields.length > 0 ? (
          <div className="space-y-4">
            {insights.patterns.mostCorrectedFields.slice(0, 5).map(field => {
              const fieldData = insights.patterns.fieldCorrections[field];
              const examples = fieldData.examples || [];
              
              return (
                <div key={field} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {fieldData.count} correction{fieldData.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {examples.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-2">Examples:</p>
                      <div className="space-y-2">
                        {examples.map((example, i) => (
                          <div key={i} className="bg-gray-50 p-2 rounded text-sm">
                            <p className="text-xs text-gray-500 mb-1">Original input:</p>
                            <p className="mb-2 italic">{example.originalInput.substring(0, 100)}{example.originalInput.length > 100 ? '...' : ''}</p>
                            
                            <div className="flex">
                              <div className="flex-1 border-r pr-2">
                                <p className="text-xs text-gray-500">Initially parsed as:</p>
                                <p className="text-red-500">
                                  {typeof example.initial === 'object' && example.initial instanceof Date 
                                    ? example.initial.toLocaleString()
                                    : String(example.initial)}
                                </p>
                              </div>
                              <div className="flex-1 pl-2">
                                <p className="text-xs text-gray-500">Corrected to:</p>
                                <p className="text-green-600">
                                  {typeof example.corrected === 'object' && example.corrected instanceof Date 
                                    ? example.corrected.toLocaleString()
                                    : String(example.corrected)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">No correction patterns identified yet.</p>
        )}
      </div>
      
      <div className="p-6 border-t">
        <h3 className="text-lg font-medium mb-4">Recent Feedback Entries</h3>
        
        {insights.recentUpdates.length > 0 ? (
          <div className="space-y-3">
            {insights.recentUpdates.map(entry => (
              <div key={entry.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{entry.userEdits?.title || 'Untitled Event'}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleString() : 'Unknown time'}
                    </div>
                  </div>
                  <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {entry.source || 'Unknown source'}
                  </div>
                </div>
                
                <div className="text-sm mt-3">
                  <p className="text-gray-500 mb-1">Original input:</p>
                  <p className="bg-gray-50 p-2 rounded italic">
                    {entry.originalInput?.substring(0, 100)}{entry.originalInput?.length > 100 ? '...' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No recent feedback entries.</p>
        )}
      </div>
    </div>
  );
};

export default ParserLearningDashboard;