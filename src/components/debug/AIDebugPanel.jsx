// src/components/debug/AIDebugPanel.jsx
import React, { useState, useEffect } from 'react';
import AIOrchestrator from '../../services/AIOrchestrator';
import IntentActionService from '../../services/IntentActionService';
import { ActionTypes } from '../../utils/ActionTypes';

const AIDebugPanel = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [selectedAction, setSelectedAction] = useState(ActionTypes.ADD_PROVIDER);
  
  // Get system status on load
  useEffect(() => {
    updateStatus();
    
    // Refresh status every 10 seconds
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const updateStatus = () => {
    const status = AIOrchestrator.getSystemStatus();
    setSystemStatus(status);
  };
  
  const handleReset = async () => {
    await AIOrchestrator.reset();
    updateStatus();
  };
  
  const handleTestMessage = async () => {
    if (!testMessage) return;
    
    try {
      // Use a test family ID and user ID
      const result = await IntentActionService.processUserRequest(
        testMessage,
        'debug-family-id',
        'debug-user-id'
      );
      
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };
  
  const testActions = [
    { id: ActionTypes.ADD_PROVIDER, name: 'Add Provider', example: 'add a piano teacher named John Smith with email john@example.com' },
    { id: ActionTypes.ADD_EVENT, name: 'Add Event', example: 'add a soccer game on Saturday at 3pm' },
    { id: ActionTypes.ADD_TASK, name: 'Add Task', example: 'add a task to clean the kitchen by Thursday, assign it to Kim' },
    { id: ActionTypes.TRACK_GROWTH, name: 'Track Growth', example: 'record Eric\'s height as 4 feet 2 inches and weight as 65 pounds' },
    { id: ActionTypes.QUERY_CALENDAR, name: 'Query Calendar', example: 'what events do I have this week?' },
    { id: ActionTypes.QUERY_TASKS, name: 'Query Tasks', example: 'show me Kim\'s tasks for this week' },
    { id: ActionTypes.QUERY_PROVIDERS, name: 'Query Providers', example: 'show me all the doctors in our provider directory' }
  ];
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4">AI System Debugger</h2>
      
      {/* System Status */}
      {systemStatus && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">System Status</h3>
          <div className="bg-white rounded p-3 border text-sm overflow-auto">
            <div>Initialized: <span className={systemStatus.initialized ? 'text-green-600' : 'text-red-600'}>
              {systemStatus.initialized ? 'Yes' : 'No'}
            </span></div>
            <div>Claude Model: {systemStatus.claudeService.model}</div>
            <div>Calendar Detection: {systemStatus.claudeService.calendarDetection ? 'Enabled' : 'Disabled'}</div>
            <div>Actions Processed: {systemStatus.intentActionService.stats.totalRequests}</div>
            <div>Success Rate: {systemStatus.intentActionService.stats.successRate}</div>
          </div>
          <button 
            onClick={handleReset}
            className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Reset Services
          </button>
        </div>
      )}
      
      {/* Test Message */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Test Intent Processing</h3>
        
        {/* Action Selector */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Select Action Type:</label>
          <select 
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {testActions.map(action => (
              <option key={action.id} value={action.id}>{action.name}</option>
            ))}
          </select>
        </div>
        
        {/* Example */}
        <div className="mb-3 text-sm bg-blue-50 p-2 rounded">
          <strong>Example:</strong> {testActions.find(a => a.id === selectedAction)?.example}
          <button 
            onClick={() => setTestMessage(testActions.find(a => a.id === selectedAction)?.example)}
            className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs"
          >
            Use
          </button>
        </div>
        
        {/* Input */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Test Message:</label>
          <textarea 
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows={3}
            placeholder="Enter a test message like 'add a piano teacher named John Smith'"
          />
        </div>
        
        <button 
          onClick={handleTestMessage}
          disabled={!testMessage}
          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300"
        >
          Process Message
        </button>
      </div>
      
      {/* Test Results */}
      {testResult && (
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Test Results</h3>
          <div className={`p-3 rounded text-sm ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="mb-2">
              <strong>Success:</strong> {testResult.success ? 'Yes' : 'No'}
            </div>
            <div className="mb-2">
              <strong>Message:</strong> {testResult.message}
            </div>
            {testResult.error && (
              <div className="mb-2">
                <strong>Error:</strong> {testResult.error}
              </div>
            )}
            {testResult.data && (
              <div>
                <strong>Data:</strong>
                <pre className="mt-1 bg-gray-800 text-white p-2 rounded overflow-auto text-xs">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDebugPanel;