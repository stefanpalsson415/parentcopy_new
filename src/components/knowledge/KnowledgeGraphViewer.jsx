// src/components/knowledge/KnowledgeGraphViewer.jsx
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Search, 
  Database, 
  Zap, 
  Users, 
  Link, 
  Calendar,
  User, 
  FileText, 
  Activity,
  Lightbulb
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import FamilyKnowledgeGraph from '../../services/FamilyKnowledgeGraph';

const KnowledgeGraphViewer = () => {
  const { familyId } = useFamily();
  const [loading, setLoading] = useState(true);
  const [graphStats, setGraphStats] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [connections, setConnections] = useState([]);
  const [insights, setInsights] = useState([]);
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [activeTab, setActiveTab] = useState('entities');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  
  // Icons for entity types
  const entityIcons = {
    family: <Users size={16} />,
    person: <User size={16} />,
    task: <FileText size={16} />,
    event: <Calendar size={16} />,
    provider: <User size={16} />,
    appointment: <Calendar size={16} />,
    document: <FileText size={16} />,
    insight: <Lightbulb size={16} />,
    milestone: <Activity size={16} />,
    preference: <Zap size={16} />
  };
  
  // Load graph data
  useEffect(() => {
    if (!familyId) return;
    
    const loadGraphData = async () => {
      setLoading(true);
      try {
        // Initialize graph
        const graph = await FamilyKnowledgeGraph.getGraph(familyId);
        
        // Load family data if graph is empty
        if (Object.keys(graph.entities).length <= 1) {
          await FamilyKnowledgeGraph.loadFamilyData(familyId);
        }
        
        // Get updated graph
        const updatedGraph = await FamilyKnowledgeGraph.getGraph(familyId);
        
        // Set entities
        setEntities(Object.values(updatedGraph.entities));
        
        // Set graph stats
        setGraphStats({
          entityCount: updatedGraph.stats.entityCount,
          relationshipCount: updatedGraph.stats.relationshipCount,
          lastQuery: updatedGraph.stats.lastQuery
        });
        
        // Generate insights
        const graphInsights = await FamilyKnowledgeGraph.generateInsights(familyId);
        setInsights(graphInsights);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading knowledge graph:", error);
        setLoading(false);
      }
    };
    
    loadGraphData();
  }, [familyId]);
  
  // Handle entity selection
  const handleEntityClick = async (entity) => {
    setSelectedEntity(entity);
    
    try {
      // Get connections
      const entityConnections = await FamilyKnowledgeGraph.findConnectedEntities(
        familyId,
        entity.id
      );
      
      setConnections(entityConnections);
    } catch (error) {
      console.error("Error getting connections:", error);
      setConnections([]);
    }
  };
  
  // Handle query submission
  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    
    if (!queryInput.trim()) return;
    
    setLoadingQuery(true);
    try {
      const result = await FamilyKnowledgeGraph.executeNaturalLanguageQuery(
        familyId,
        queryInput
      );
      
      setQueryResult(result);
      setQueryInput('');
    } catch (error) {
      console.error("Error executing query:", error);
      setQueryResult({
        message: "An error occurred while processing your query. Please try again."
      });
    } finally {
      setLoadingQuery(false);
    }
  };
  
  // Get filtered entities
  const getFilteredEntities = () => {
    if (entityTypeFilter === 'all') {
      return entities.filter(e => e.type !== 'family'); // Exclude family entity from list
    }
    return entities.filter(e => e.type === entityTypeFilter);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mx-auto font-roboto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
          <div className="bg-gray-100 p-4 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow max-w-6xl mx-auto font-roboto">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 bg-indigo-100 p-3 rounded-full">
              <Database size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Family Knowledge Graph</h1>
              <p className="text-gray-500">
                Explore connections and insights from your family data
              </p>
            </div>
          </div>
          
          {graphStats && (
            <div className="flex space-x-4 text-sm">
              <div className="bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-semibold">{graphStats.entityCount}</span> Entities
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-semibold">{graphStats.relationshipCount}</span> Connections
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-semibold">{insights.length}</span> Insights
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Query Section */}
      <div className="bg-indigo-50 p-4 border-b">
        <form onSubmit={handleQuerySubmit} className="flex">
          <div className="flex-1">
            <label htmlFor="query" className="font-medium text-indigo-700 mb-1 block">
              Ask a question about your family data
            </label>
            <div className="flex">
              <input
                id="query"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="E.g., 'Show all children' or 'What insights do we have?'"
                className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loadingQuery}
              />
              <button
                type="submit"
                disabled={loadingQuery || !queryInput.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {loadingQuery ? 'Processing...' : 'Ask'}
              </button>
            </div>
          </div>
        </form>
        
        {/* Suggested Queries */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-indigo-700">Try asking:</span>
          <button
            onClick={() => setQueryInput("Show all children")}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Show all children
          </button>
          <button
            onClick={() => setQueryInput("What tasks are assigned to each person?")}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Task assignments
          </button>
          <button
            onClick={() => setQueryInput("What insights do we have?")}
            className="px-2 py-1 bg-white border border-indigo-200 rounded-md text-xs hover:bg-indigo-100"
          >
            Show insights
          </button>
        </div>
      </div>
      
      {/* Query Results */}
      {queryResult && (
        <div className="p-4 border-b">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-full mr-3 flex-shrink-0">
                <Search size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="mb-3">{queryResult.message}</p>
                
                {queryResult.results && queryResult.results.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-medium mb-2">Results</h3>
                    <ul className="space-y-2">
                      {queryResult.results.map((result, index) => (
                        <li 
                          key={index} 
                          className="p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            if (result.entity) {
                              handleEntityClick(result.entity);
                              setActiveTab('entities');
                            } else if (result.id) {
                              // For insight results
                              const insightEntity = entities.find(e => e.id === result.id);
                              if (insightEntity) {
                                handleEntityClick(insightEntity);
                                setActiveTab('entities');
                              }
                            }
                          }}
                        >
                          {result.entity ? (
                            <div className="flex items-center">
                              <span className="mr-2 text-indigo-600">
                                {entityIcons[result.entity.type] || <Database size={16} />}
                              </span>
                              <span>
                                {result.entity.properties.name || result.entity.id}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({result.entity.type})
                                </span>
                              </span>
                            </div>
                          ) : result.title ? (
                            <div>
                              <div className="font-medium">{result.title}</div>
                              <div className="text-sm text-gray-600">{result.description}</div>
                            </div>
                          ) : (
                            <div>
                              {result.id || 'Result item'}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b px-6">
        <div className="flex overflow-x-auto">
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'entities' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('entities')}
          >
            Entities
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'insights' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'connections' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('connections')}
          >
            Connections
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'entities' && (
          <>
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold">Entities</h2>
              
              {/* Entity type filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Filter by type:</label>
                <select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  className="border rounded p-1 text-sm"
                >
                  <option value="all">All Types</option>
                  {Array.from(new Set(entities.map(e => e.type))).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredEntities().map(entity => (
                <div
                  key={entity.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedEntity?.id === entity.id ? 'border-indigo-500 bg-indigo-50' : ''
                  }`}
                  onClick={() => handleEntityClick(entity)}
                >
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-indigo-600">
                      {entityIcons[entity.type] || <Database size={16} />}
                    </span>
                    <span className="font-medium">
                      {entity.properties.name || entity.id}
                    </span>
                    <span className="text-xs bg-gray-100 rounded px-2 py-0.5 ml-2">
                      {entity.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {Object.entries(entity.properties)
                      .filter(([key]) => !['name', 'createdAt', 'updatedAt'].includes(key))
                      .slice(0, 3)
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500">{key}:</span>
                          <span>
                            {typeof value === 'object' 
                              ? JSON.stringify(value).substring(0, 20) + '...'
                              : String(value).substring(0, 20)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selected Entity Details */}
            {selectedEntity && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">
                  {selectedEntity.properties.name || selectedEntity.id}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Properties</h4>
                      <div className="space-y-1">
                        {Object.entries(selectedEntity.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500">{key}:</span>
                            <span>
                              {typeof value === 'object' 
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Connections ({connections.length})</h4>
                      {connections.length > 0 ? (
                        <div className="space-y-2">
                          {connections.slice(0, 5).map((conn, index) => (
                            <div 
                              key={index} 
                              className="p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleEntityClick(conn.entity)}
                            >
                              <div className="flex items-center">
                                <span className="mr-2 text-indigo-600">
                                  {entityIcons[conn.entity.type] || <Database size={16} />}
                                </span>
                                <span>
                                  {conn.entity.properties.name || conn.entity.id}
                                </span>
                                <span className="mx-2 text-gray-400">
                                  <Link size={12} />
                                </span>
                                <span className="text-xs bg-indigo-100 text-indigo-800 rounded px-2 py-0.5">
                                  {conn.relationship.type}
                                </span>
                              </div>
                            </div>
                          ))}
                          {connections.length > 5 && (
                            <div className="text-sm text-center text-gray-500">
                              + {connections.length - 5} more connections
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">
                          No connections found for this entity.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'insights' && (
          <>
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold">Insights</h2>
              <button
                onClick={async () => {
                  try {
                    const newInsights = await FamilyKnowledgeGraph.generateInsights(familyId);
                    setInsights(newInsights);
                  } catch (error) {
                    console.error("Error generating insights:", error);
                  }
                }}
                className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              >
                Refresh Insights
              </button>
            </div>
            
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${
                        insight.severity === 'high' ? 'bg-red-100' :
                        insight.severity === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        <Lightbulb size={16} className={`${
                          insight.severity === 'high' ? 'text-red-600' :
                          insight.severity === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{insight.title}</h3>
                        <p className="text-gray-700 mb-2">{insight.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {insight.entities && insight.entities.map((entity, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                              {entity}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {insight.type}
                          </span>
                        </div>
                        <div className={`p-2 rounded text-sm ${
                          insight.severity === 'high' ? 'bg-red-50 text-red-700' :
                          insight.severity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {insight.actionItem}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Lightbulb size={40} className="mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-500 mb-1">No Insights Yet</h3>
                <p className="text-gray-500 mb-4">
                  Add more data to your family knowledge graph to generate insights.
                </p>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'connections' && (
          <>
            <h2 className="text-lg font-semibold mb-3">Family Connections</h2>
            
            {/* Simple graph visualization */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="mb-4 text-gray-600">
                This view shows the relationships between entities in your family knowledge graph.
              </p>
              
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* Parents Row */}
                  <div className="flex justify-center space-x-8 mb-8">
                    {entities
                      .filter(e => e.type === 'person' && e.properties.role === 'parent')
                      .map(parent => (
                        <div 
                          key={parent.id} 
                          className="p-3 bg-blue-100 rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-500"
                          onClick={() => handleEntityClick(parent)}
                        >
                          <div className="font-medium text-center">{parent.properties.name}</div>
                          <div className="text-xs text-center text-gray-600">{parent.properties.roleType}</div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Connection Lines */}
                  <div className="flex justify-center mb-1">
                    <div className="w-16 h-8 border-l-2 border-r-2 border-t-2 border-gray-400"></div>
                  </div>
                  
                  {/* Family Entity */}
                  <div className="flex justify-center mb-1">
                    <div 
                      className="p-2 bg-indigo-100 rounded-lg cursor-pointer border-2 border-transparent hover:border-indigo-500"
                      onClick={() => handleEntityClick(entities.find(e => e.type === 'family'))}
                    >
                      <div className="font-medium text-center">
                        {entities.find(e => e.type === 'family')?.properties.name || 'Family'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connection Lines */}
                  <div className="flex justify-center mb-1">
                    <div className="w-32 h-8 border-l-2 border-r-2 border-t-2 border-gray-400"></div>
                  </div>
                  
                  {/* Children Row */}
                  <div className="flex justify-center space-x-8">
                    {entities
                      .filter(e => e.type === 'person' && e.properties.role === 'child')
                      .map(child => (
                        <div 
                          key={child.id} 
                          className="p-3 bg-green-100 rounded-lg cursor-pointer border-2 border-transparent hover:border-green-500"
                          onClick={() => handleEntityClick(child)}
                        >
                          <div className="font-medium text-center">{child.properties.name}</div>
                          <div className="text-xs text-center text-gray-600">Child</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-sm text-gray-500 italic text-center">
                Click on any entity to view details and connections.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphViewer;