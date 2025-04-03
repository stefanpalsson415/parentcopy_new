// src/components/relationship/EnhancedRelationshipCycleHistory.jsx
import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, ChevronLeft, ChevronRight, Calendar, CheckCircle, 
         Clipboard, Award, Lightbulb, Heart, Users, ArrowRight, X, 
         ChevronDown, ChevronUp, Download, Star, RefreshCw } from 'lucide-react';
import { doc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  });
};

const EnhancedRelationshipCycleHistory = ({ onSelectCycle, compact = false }) => {
  const { familyId, getWeekHistoryData } = useFamily();
  const { currentUser } = useAuth();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    meeting: true,
    questionnaire: true,
    metrics: true
  });
  
  const itemsPerPage = compact ? 3 : 5;

  // Load cycle history
  useEffect(() => {
    const loadCycleHistory = async () => {
      if (!familyId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Array to store all cycle data
        const cycleHistory = [];
        
        // 1. First load data from coupleCheckIns collection
        const coupleCheckInsRef = collection(db, "coupleCheckIns");
        const q = query(coupleCheckInsRef, where("familyId", "==", familyId));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          // Extract cycle number from document ID (format: familyId-weekX)
          const cycleMatch = doc.id.match(/-week(\d+)$/);
          if (cycleMatch && cycleMatch[1]) {
            const cycleNum = parseInt(cycleMatch[1]);
            const data = doc.data();
            
            cycleHistory.push({
              cycle: cycleNum,
              date: data.completedAt || data.createdAt || new Date().toISOString(),
              data: data,
              source: 'coupleCheckIns'
            });
          }
        });
        
        // 2. Also load data from weekHistory in family context
        const familyDocRef = doc(db, "families", familyId);
        const familyDoc = await getDoc(familyDocRef);
        
        if (familyDoc.exists()) {
          const weekHistoryData = familyDoc.data().weekHistory;
          
          if (weekHistoryData) {
            Object.keys(weekHistoryData)
              .filter(key => key.startsWith('week'))
              .forEach(weekKey => {
                const weekData = weekHistoryData[weekKey];
                const weekNum = parseInt(weekKey.replace('week', ''));
                
                // If this cycle has couple check-in data and isn't already in our list
                if (weekData && weekData.coupleCheckIn && !cycleHistory.some(h => h.cycle === weekNum)) {
                  cycleHistory.push({
                    cycle: weekNum,
                    date: weekData.completionDate || weekData.createdAt || new Date().toISOString(),
                    data: {
                      ...weekData.coupleCheckIn,
                      familyId
                    },
                    source: 'weekHistory'
                  });
                }
              });
          }
        }
        
        // 3. Sort by cycle number (newest first)
        cycleHistory.sort((a, b) => b.cycle - a.cycle);
        
        // 4. Set state
        setHistory(cycleHistory);
        setLoading(false);
      } catch (err) {
        console.error("Error loading relationship cycle history:", err);
        setError("Failed to load cycle history. Please try again.");
        setLoading(false);
      }
    };
    
    loadCycleHistory();
  }, [familyId, getWeekHistoryData]);

  // Handle cycle selection
  const handleSelectCycle = (cycle) => {
    if (onSelectCycle) {
      onSelectCycle(cycle);
    } else {
      setSelectedCycle(cycle);
      setShowDetails(true);
    }
  };

  // Get color for metric value
  const getMetricColor = (value) => {
    if (!value) return 'text-gray-500';
    if (value >= 4.5) return 'text-green-700';
    if (value >= 4) return 'text-green-600';
    if (value >= 3.5) return 'text-blue-600';
    if (value >= 3) return 'text-yellow-600';
    if (value >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  // Helper to render metric indicator
  const renderMetricIndicator = (value, prevValue) => {
    if (!prevValue) return null;
    
    const change = value - prevValue;
    const isImproved = change > 0;
    
    return (
      <span className={`text-xs ${isImproved ? 'text-green-600' : 'text-red-600'}`}>
        {isImproved ? '↑' : '↓'} {Math.abs(change).toFixed(1)}
      </span>
    );
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Paginate history
  const paginatedHistory = history.slice(
    currentPage * itemsPerPage, 
    (currentPage * itemsPerPage) + itemsPerPage
  );

  const totalPages = Math.ceil(history.length / itemsPerPage);

  // Render selected cycle details modal
  const renderCycleDetails = () => {
    if (!selectedCycle) return null;
    
    const cycleData = history.find(h => h.cycle === selectedCycle);
    if (!cycleData) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="text-lg font-bold font-roboto">Cycle {cycleData.cycle} Details</h3>
            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedCycle(null);
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium font-roboto">Completed on {formatDate(cycleData.date)}</h4>
              
              <div className="flex space-x-2">
                {cycleData.data?.metrics && (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                    <Award size={12} className="mr-1" />
                    {cycleData.data.metrics.overall?.toFixed(1) || "N/A"}/5 Overall
                  </span>
                )}
                
                <button
                  onClick={() => {
                    // Generate and download a PDF report (mock)
                    alert("Download feature will be implemented in a future update");
                  }}
                  className="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full font-roboto"
                >
                  <Download size={12} className="mr-1" />
                  Export
                </button>
              </div>
            </div>
            
            {/* Metrics Section */}
            <div>
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('metrics')}
              >
                <h4 className="font-medium mb-2 font-roboto flex items-center">
                  <Award size={16} className="mr-2 text-yellow-600" />
                  Relationship Metrics
                </h4>
                <button className="p-1 hover:bg-gray-100 rounded">
                  {expandedSections.metrics ? 
                    <ChevronUp size={18} className="text-gray-400" /> : 
                    <ChevronDown size={18} className="text-gray-400" />
                  }
                </button>
              </div>
              
              {expandedSections.metrics && cycleData.data?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getMetricColor(cycleData.data.metrics.satisfaction)}`}>
                      {cycleData.data.metrics.satisfaction?.toFixed(1) || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getMetricColor(cycleData.data.metrics.communication)}`}>
                      {cycleData.data.metrics.communication?.toFixed(1) || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">Communication</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getMetricColor(cycleData.data.metrics.connection)}`}>
                      {cycleData.data.metrics.connection?.toFixed(1) || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">Connection</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getMetricColor(cycleData.data.metrics.workload)}`}>
                      {cycleData.data.metrics.workload?.toFixed(1) || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">Workload</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Questionnaire Responses */}
            <div>
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('questionnaire')}
              >
                <h4 className="font-medium mb-2 font-roboto flex items-center">
                  <Clipboard size={16} className="mr-2 text-blue-600" />
                  Questionnaire Responses
                </h4>
                <button className="p-1 hover:bg-gray-100 rounded">
                  {expandedSections.questionnaire ? 
                    <ChevronUp size={18} className="text-gray-400" /> : 
                    <ChevronDown size={18} className="text-gray-400" />
                  }
                </button>
              </div>
              
              {expandedSections.questionnaire && (
                <div>
                  {cycleData.data?.questionnaireResponses ? (
                    <div className="space-y-3">
                      {Object.entries(cycleData.data.questionnaireResponses).map(([questionId, response]) => {
                        // Extract question text from questionId if possible
                        let questionText = "Question";
                        
                        if (questionId.includes('satisfaction')) {
                          questionText = "Relationship Satisfaction";
                        } else if (questionId.includes('communication')) {
                          questionText = "Communication Quality";
                        } else if (questionId.includes('connection')) {
                          questionText = "Emotional Connection";
                        } else if (questionId.includes('workload')) {
                          questionText = "Workload Balance";
                        }
                        
                        return (
                          <div key={questionId} className="p-3 border rounded-lg">
                            <h5 className="text-sm font-medium mb-1 font-roboto">{questionText}</h5>
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-100 h-2 rounded-full">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${(parseInt(response) / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium">{response}/5</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No questionnaire responses available.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Meeting Notes */}
            <div>
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('meeting')}
              >
                <h4 className="font-medium mb-2 font-roboto flex items-center">
                  <Users size={16} className="mr-2 text-purple-600" />
                  Meeting Notes
                </h4>
                <button className="p-1 hover:bg-gray-100 rounded">
                  {expandedSections.meeting ? 
                    <ChevronUp size={18} className="text-gray-400" /> : 
                    <ChevronDown size={18} className="text-gray-400" />
                  }
                </button>
              </div>
              
              {expandedSections.meeting && (
                <div>
                  {cycleData.data?.meeting ? (
                    <div className="space-y-4">
                      {/* Topic Responses */}
                      {cycleData.data.meeting.topicResponses && Object.keys(cycleData.data.meeting.topicResponses).length > 0 && (
                        <div className="space-y-3">
                          {Object.entries(cycleData.data.meeting.topicResponses).map(([topic, response], index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <h5 className="text-sm font-medium mb-1 font-roboto">{topic}</h5>
                              <p className="text-sm text-gray-600 font-roboto whitespace-pre-wrap">{response}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Selected Strategies */}
                      {cycleData.data.meeting.selectedStrategies && cycleData.data.meeting.selectedStrategies.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2 font-roboto">Selected Strategies</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cycleData.data.meeting.selectedStrategies.map((strategy, index) => (
                              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center">
                                  <Lightbulb size={16} className="text-yellow-600 mr-2" />
                                  <p className="text-sm font-medium font-roboto">{strategy}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* General Notes */}
                      {cycleData.data.meeting.notes && (
                        <div>
                          <h5 className="text-sm font-medium mb-2 font-roboto">General Notes</h5>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-roboto whitespace-pre-wrap">{cycleData.data.meeting.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 font-roboto">No meeting notes available.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-black rounded-full"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-medium font-roboto">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <Heart size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 font-roboto mb-2">No relationship cycles completed yet</p>
          <p className="text-sm text-gray-500 font-roboto">
            Complete your first relationship cycle to start tracking progress
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-medium font-roboto flex items-center">
          <Bell size={20} className="mr-2 text-indigo-600" />
          Relationship Cycle History
        </h4>
        
        {!compact && totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className={`p-1 rounded ${currentPage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-roboto">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className={`p-1 rounded ${currentPage === totalPages - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {paginatedHistory.map((cycle, index) => {
          const prevCycle = index < paginatedHistory.length - 1 ? paginatedHistory[index + 1] : null;
          
          return (
            <div key={cycle.cycle} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
                onClick={() => handleSelectCycle(cycle.cycle)}>
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium font-roboto">Cycle {cycle.cycle}</h5>
                <span className="text-sm text-gray-500 font-roboto">
                  {formatDate(cycle.date)}
                </span>
              </div>
              
              {cycle.data?.metrics && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.satisfaction)}`}>
                        {cycle.data.metrics.satisfaction?.toFixed(1) || "N/A"}
                      </div>
                      {prevCycle && prevCycle.data?.metrics && (
                        <div className="ml-1">
                          {renderMetricIndicator(
                            cycle.data.metrics.satisfaction, 
                            prevCycle.data.metrics.satisfaction
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.communication)}`}>
                        {cycle.data.metrics.communication?.toFixed(1) || "N/A"}
                      </div>
                      {prevCycle && prevCycle.data?.metrics && (
                        <div className="ml-1">
                          {renderMetricIndicator(
                            cycle.data.metrics.communication, 
                            prevCycle.data.metrics.communication
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">Communication</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.connection)}`}>
                        {cycle.data.metrics.connection?.toFixed(1) || "N/A"}
                      </div>
                      {prevCycle && prevCycle.data?.metrics && (
                        <div className="ml-1">
                          {renderMetricIndicator(
                            cycle.data.metrics.connection, 
                            prevCycle.data.metrics.connection
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">Connection</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <div className={`text-lg font-bold ${getMetricColor(cycle.data.metrics.workload)}`}>
                        {cycle.data.metrics.workload?.toFixed(1) || "N/A"}
                      </div>
                      {prevCycle && prevCycle.data?.metrics && (
                        <div className="ml-1">
                          {renderMetricIndicator(
                            cycle.data.metrics.workload, 
                            prevCycle.data.metrics.workload
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">Workload</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  {cycle.data?.meeting?.completedAt && (
                    <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-roboto mr-2">
                      <CheckCircle size={12} className="mr-1" />
                      Meeting Completed
                    </span>
                  )}
                  
                  {cycle.data?.questionnaireCompleted && (
                    <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-roboto">
                      <Clipboard size={12} className="mr-1" />
                      Questionnaire Completed
                    </span>
                  )}
                </div>
                
                <button className="text-blue-600 text-sm flex items-center hover:underline font-roboto">
                  View Details <ArrowRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {totalPages > 1 && !compact && (
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${
                  currentPage === i 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Cycle details modal */}
      {showDetails && renderCycleDetails()}
    </div>
  );
};

export default EnhancedRelationshipCycleHistory;