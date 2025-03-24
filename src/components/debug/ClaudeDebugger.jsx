import React, { useState } from 'react';
import ClaudeService from '../../services/ClaudeService';

const ClaudeDebugger = () => {
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [useEnvKey, setUseEnvKey] = useState(true);

  const addLog = (message) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const testClaudeAPI = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      addLog(`Testing Claude API with input: "${inputText}"`);
      
      // Temporarily set the API key for testing if not using .env
      if (!useEnvKey && apiKey) {
        ClaudeService.apiKey = apiKey;
        addLog("Using manually entered API key for testing");
      }
      
      const result = await ClaudeService.generateResponse(
        [{ role: 'user', content: inputText }],
        { system: 'You are a helpful assistant.' }
      );
      
      // Reset to env API key after test
      if (!useEnvKey && apiKey) {
        ClaudeService.apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
      }
      
      addLog(`Received response of length: ${result?.length || 0}`);
      setResponse(result);
    } catch (err) {
      addLog(`Error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

// Add this function to ClaudeDebugger.jsx
const testChatMessage = async () => {
  setLoading(true);
  setError(null);
  setResponse(null);
  
  try {
    addLog("Testing chat message formatting...");
    
    const testMessages = [
      { role: 'user', content: "Hello" },
      { role: 'assistant', content: "Hi there!" },
      { role: 'user', content: "Tell me about my family data" }
    ];
    
    // Use the same message format that ChatService uses
    const result = await ClaudeService.generateResponse(
      testMessages,
      { 
        familyName: "Test",
        familyId: "test123",
        adults: 2,
        children: [{ name: "Test Child", age: 5 }],
        currentWeek: 1
      }
    );
    
    addLog(`Received chat message response of length: ${result?.length || 0}`);
    setResponse(result);
  } catch (err) {
    addLog(`Error: ${err.message}`);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Add this button to the UI
<button
  onClick={testChatMessage}
  disabled={loading}
  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md font-roboto disabled:bg-gray-300"
>
  {loading ? 'Testing...' : 'Test Chat Message'}
</button>


  const testHelloWorld = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      addLog("Testing Hello World function...");
      
      const result = await ClaudeService.testHelloWorld();
      
      addLog(`Received Hello World response: ${JSON.stringify(result)}`);
      setResponse(JSON.stringify(result, null, 2));
    } catch (err) {
      addLog(`Error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 font-roboto">Claude API Debugger</h1>
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="useEnvKey"
            checked={useEnvKey}
            onChange={() => setUseEnvKey(!useEnvKey)}
            className="mr-2"
          />
          <label htmlFor="useEnvKey" className="text-sm font-medium font-roboto">
            Use API key from .env file
          </label>
        </div>
        
        {!useEnvKey && (
          <div>
            <label className="block text-sm font-medium mb-2 font-roboto">Claude API Key (for testing only)</label>
            <input
              type="password"
              className="w-full p-3 border rounded-md font-roboto"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Claude API key for testing"
            />
            <p className="text-xs text-red-500 mt-1">
              Warning: Never commit this key to Git or share it publicly
            </p>
          </div>
        )}
      </div>
      
      <div className="flex mb-4">
        <button
          onClick={testClaudeAPI}
          disabled={loading || !inputText.trim()}
          className="px-4 py-2 bg-black text-white rounded-md font-roboto disabled:bg-gray-300"
        >
          {loading ? 'Testing...' : 'Test Claude API'}
        </button>

        <button
          onClick={testHelloWorld}
          disabled={loading}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded-md font-roboto disabled:bg-gray-300"
        >
          {loading ? 'Testing...' : 'Test Hello World'}
        </button>
      </div>
      
      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md font-roboto">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {response && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2 font-roboto">Response:</h2>
          <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap font-roboto">
            {response}
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2 font-roboto">Logs:</h2>
        <div className="p-4 bg-gray-100 rounded-md font-mono text-sm h-60 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-500">No logs yet</div>}
        </div>
      </div>
    </div>
  );
};

export default ClaudeDebugger;