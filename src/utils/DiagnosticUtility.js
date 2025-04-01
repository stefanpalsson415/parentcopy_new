// src/utils/DiagnosticUtility.js

/**
 * Utility for diagnosing and fixing common issues in the Allie app
 */
const DiagnosticUtility = {
    /**
     * Run a comprehensive diagnostic on the application
     * @returns {Object} - Diagnostic results
     */
    runDiagnostic: async () => {
      const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        browser: navigator.userAgent,
        tests: {},
        recommendations: []
      };
      
      // Test localStorage access
      try {
        localStorage.setItem('allie_test', 'test');
        localStorage.removeItem('allie_test');
        results.tests.localStorage = { status: 'pass' };
      } catch (e) {
        results.tests.localStorage = { 
          status: 'fail', 
          error: e.message,
          fix: 'Enable cookies and local storage in your browser'
        };
        results.recommendations.push('Enable browser storage');
      }
      
      // Test network connectivity
      try {
        const startTime = Date.now();
        const response = await fetch('https://www.google.com', { mode: 'no-cors' });
        const endTime = Date.now();
        results.tests.network = { 
          status: 'pass', 
          latency: endTime - startTime 
        };
      } catch (e) {
        results.tests.network = { 
          status: 'fail', 
          error: e.message,
          fix: 'Check your internet connection'
        };
        results.recommendations.push('Check internet connection');
      }
      
      // Check for Claude proxy availability
      if (window.location.hostname === 'localhost') {
        try {
          const proxyResponse = await fetch('http://localhost:3001/health', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          results.tests.claudeProxy = { 
            status: proxyResponse.ok ? 'pass' : 'fail',
            details: proxyResponse.ok ? 'Proxy server responding' : 'Proxy server not responding'
          };
          
          if (!proxyResponse.ok) {
            results.recommendations.push('Start the Claude proxy server with: node src/simple-proxy.js');
          }
        } catch (e) {
          results.tests.claudeProxy = { 
            status: 'fail', 
            error: e.message,
            fix: 'Start the Claude proxy server'
          };
          results.recommendations.push('Start the Claude proxy server with: node src/simple-proxy.js');
        }
      }
      
      // Check for Google API availability
      try {
        results.tests.googleApi = { 
          status: window.gapi ? 'pass' : 'fail',
          details: window.gapi ? 'Google API loaded' : 'Google API not loaded'
        };
        
        if (!window.gapi) {
          results.recommendations.push('Wait for Google API to load or refresh the page');
        }
      } catch (e) {
        results.tests.googleApi = { 
          status: 'fail', 
          error: e.message
        };
      }
  
      // Check storage for leaked tokens or other issues
      const leakedTokens = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes('Token') || key.includes('token')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              // Check if token is expired
              if (data.expires_at && data.expires_at * 1000 < Date.now()) {
                leakedTokens.push({ key, expired: true });
              } else if (!data.uid && !data.email) {
                leakedTokens.push({ key, malformed: true });
              }
            } catch (e) {
              leakedTokens.push({ key, parseError: true });
            }
          }
        }
        
        results.tests.tokenStore = {
          status: leakedTokens.length > 0 ? 'warning' : 'pass',
          leakedTokens: leakedTokens.length
        };
        
        if (leakedTokens.length > 0) {
          results.recommendations.push('Clean up expired or malformed tokens');
        }
      } catch (e) {
        results.tests.tokenStore = { 
          status: 'error', 
          error: e.message
        };
      }
      
      // Return diagnostic results
      return results;
    },
    
    /**
     * Fix common issues automatically
     * @param {Array} issues - Issues to fix
     * @returns {Object} - Results of fix operations
     */
    fixIssues: async (issues = ['tokens', 'caches']) => {
      const results = {
        fixed: [],
        failed: []
      };
      
      // Clean up expired tokens
      if (issues.includes('tokens')) {
        try {
          let tokensRemoved = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('Token') || key.includes('token')) {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                // Remove expired tokens
                if (data.expires_at && data.expires_at * 1000 < Date.now()) {
                  localStorage.removeItem(key);
                  tokensRemoved++;
                }
              } catch (e) {
                // Remove malformed tokens
                localStorage.removeItem(key);
                tokensRemoved++;
              }
            }
          }
          results.fixed.push({ issue: 'tokens', count: tokensRemoved });
        } catch (e) {
          results.failed.push({ issue: 'tokens', error: e.message });
        }
      }
      
      // Clear caches
      if (issues.includes('caches')) {
        try {
          // Clear application cache
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }
          
          // Clear specific cached data in localStorage
          const cacheKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('cache') || key.includes('Cache')) {
              localStorage.removeItem(key);
              cacheKeys.push(key);
            }
          }
          
          results.fixed.push({ issue: 'caches', count: cacheKeys.length });
        } catch (e) {
          results.failed.push({ issue: 'caches', error: e.message });
        }
      }
      
      // Clean up React state persistence
      if (issues.includes('react-state')) {
        try {
          let stateKeysRemoved = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('allie') || 
                key.includes('State') || 
                key.includes('Progress') ||
                key.includes('selected')) {
              localStorage.removeItem(key);
              stateKeysRemoved++;
            }
          }
          results.fixed.push({ issue: 'react-state', count: stateKeysRemoved });
        } catch (e) {
          results.failed.push({ issue: 'react-state', error: e.message });
        }
      }
      
      return results;
    },
    
    /**
     * Add diagnostic tools to window for debugging from console
     */
    installDebugTools: () => {
      if (process.env.NODE_ENV !== 'production') {
        window.allieDiagnostic = {
          run: DiagnosticUtility.runDiagnostic,
          fix: DiagnosticUtility.fixIssues,
          cleanTokens: () => DiagnosticUtility.fixIssues(['tokens']),
          clearCaches: () => DiagnosticUtility.fixIssues(['caches']),
          resetState: () => DiagnosticUtility.fixIssues(['react-state']),
          resetAll: () => DiagnosticUtility.fixIssues(['tokens', 'caches', 'react-state']),
          
          // Enable/disable debugging features
          toggleDebug: (feature = 'all', enabled = true) => {
            if (feature === 'all' || feature === 'calendar') {
              localStorage.setItem('debug_calendar', enabled ? 'true' : 'false');
            }
            if (feature === 'all' || feature === 'claude') {
              localStorage.setItem('debug_claude', enabled ? 'true' : 'false');
            }
            if (feature === 'all' || feature === 'rendering') {
              localStorage.setItem('debug_rendering', enabled ? 'true' : 'false');
            }
            return {
              calendar: localStorage.getItem('debug_calendar') === 'true',
              claude: localStorage.getItem('debug_claude') === 'true',
              rendering: localStorage.getItem('debug_rendering') === 'true'
            };
          }
        };
        
        console.log('🔧 Allie debug tools installed. Type window.allieDiagnostic.run() to use.');
      }
    }
  };
  
  // Install debug tools automatically in development
  if (process.env.NODE_ENV !== 'production') {
    // Wait for window to be fully available
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', () => {
        DiagnosticUtility.installDebugTools();
      });
    }
  }
  
  export default DiagnosticUtility;