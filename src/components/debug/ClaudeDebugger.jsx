import React, { useState } from 'react';
import ClaudeService from '../../services/ClaudeService';

const ClaudeDebugger = () => {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const testClaudeAPI = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      addLog(`Testing Claude API with input: "${inputText}"`);
      
      const result = await ClaudeService.generateResponse(
        [{ role: 'user', content: inputText }],
        { system: 'You are a helpful assistant.' }
      );
      
      addLog(`Received response of length: ${result?.length || 0}`);
      setResponse(result);
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
        <label className="block text-sm font-medium mb-2 font-roboto">Test Message</label>
        <textarea
          className="w-full p-3 border rounded-md font-roboto"
          rows="4"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter a test message for Claude API"
        />
      </div>
      
      <button
        onClick={testClaudeAPI}
        disabled={loading || !inputText.trim()}
        className="px-4 py-2 bg-black text-white rounded-md font-roboto disabled:bg-gray-300"
      >
        {loading ? 'Testing...' : 'Test Claude API'}
      </button>
      
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