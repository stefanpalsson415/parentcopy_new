import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, 
         Clipboard, Award, Heart, Users, ArrowRight, X, 
         ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { doc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
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
              date: data.completedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date().toISOString(),
              data: data.data || data,
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
    if (!value || isNaN(value)) return 'text-gray-500';
    if (value >= 4.5) return 'text-green-700';
    if (value >= 4) return 'text-green-600';
    if (value >= 3.5) return 'text-blue-600';
    if (value >= 3) return 'text-yellow-600';
    if (value >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  // Helper to render metric indicator
  const renderMetricIndicator = (value, prevValue) => {
    if (!value || !prevValue || isNaN(value) || isNaN(prevValue)) return null;
    
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
                {(cycleData.data?.metrics || cycleData.data?.satisfaction) && (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-roboto">
                    <Award size={12} className="mr-1" />
                    {cycleData.data.metrics?.overall?.toFixed(1) || 
                     cycleData.data.satisfaction?.toFixed(1) || "3.0"}/5
                  </span>
                )}
              </div>
            </div>
            
            {/* Metrics Section */}
            {(cycleData.data?.metrics || cycleData.data?.satisfaction) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMetricColor(
                    cycleData.data.metrics?.satisfaction || 
                    cycleData.data.satisfaction || 3.0
                  )}`}>
                    {(cycleData.data.metrics?.satisfaction || 
                      cycleData.data.satisfaction || 3.0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMetricColor(
                    cycleData.data.metrics?.communication || 
                    cycleData.data.communication || 3.0
                  )}`}>
                    {(cycleData.data.metrics?.communication || 
                      cycleData.data.communication || 3.0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Communication</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMetricColor(
                    cycleData.data.metrics?.connection || 
                    cycleData.data.connection || 3.0
                  )}`}>
                    {(cycleData.data.metrics?.connection || 
                      cycleData.data.connection || 3.0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Connection</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMetricColor(
                    cycleData.data.metrics?.workload || 
                    cycleData.data.workload || 3.0
                  )}`}>
                    {(cycleData.data.metrics?.workload || 
                      cycleData.data.workload || 3.0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Workload</div>
                </div>
              </div>
            )}
            
            {/* Meeting Notes */}
            {cycleData.data?.meeting && (
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
                    {cycleData.data.meeting.topicResponses && Object.keys(cycleData.data.meeting.topicResponses).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(cycleData.data.meeting.topicResponses).map(([topic, response], index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <h5 className="text-sm font-medium mb-1 font-roboto">{topic}</h5>
                            <p className="text-sm text-gray-600 font-roboto whitespace-pre-wrap">{response}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 font-roboto">No detailed meeting notes available.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Questionnaire Responses */}
            {cycleData.data?.questionnaireResponses && Object.keys(cycleData.data.questionnaireResponses).length > 0 && (
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
                    <div className="space-y-3">
                      {Object.entries(cycleData.data.questionnaireResponses)
                        .slice(0, 5) // Show only the first 5 for brevity
                        .map(([questionId, response], index) => {
                          // Handle either numeric or string responses
                          const isNumeric = !isNaN(parseFloat(response)) && isFinite(response);
                          
                          return (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium font-roboto">
                                    {questionId.includes('satisfaction') ? 'Relationship Satisfaction' :
                                    questionId.includes('communication') ? 'Communication Quality' :
                                    questionId.includes('connection') ? 'Emotional Connection' :
                                    questionId.includes('workload') ? 'Workload Balance' :
                                    `Question ${index + 1}`}
                                  </h5>
                                </div>
                                {isNumeric ? (
                                  <div className="ml-2">
                                    <div className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                                      <span className="text-sm font-medium">{parseFloat(response).toFixed(1)}/5</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="ml-2 text-sm text-gray-600 font-roboto">
                                    {response.substring(0, 20)}{response.length > 20 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      
                      {Object.keys(cycleData.data.questionnaireResponses).length > 5 && (
                        <p className="text-sm text-center text-gray-500 font-roboto">
                          + {Object.keys(cycleData.data.questionnaireResponses).length - 5} more responses
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
          <Calendar size={20} className="mr-2 text-indigo-600" />
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
      
      <p className="text-sm text-gray-600 mb-4 font-roboto">
        View your past relationship cycles to track how your relationship has evolved over time
      </p>
      
      <div className="space-y-4">
        {paginatedHistory.map((cycle, index) => {
          const prevCycle = index < paginatedHistory.length - 1 ? paginatedHistory[index + 1] : null;
          
          // Get metrics data from various possible locations in the data structure
          const metrics = {
            satisfaction: cycle.data?.metrics?.satisfaction || 
                          cycle.data?.satisfaction || 3.0,
            communication: cycle.data?.metrics?.communication || 
                           cycle.data?.communication || 3.0,
            connection: cycle.data?.metrics?.connection || 
                        cycle.data?.connection || 3.0,
            workload: cycle.data?.metrics?.workload || 
                      cycle.data?.workload || 3.0
          };
          
          // Previous metrics for comparison
          const prevMetrics = prevCycle ? {
            satisfaction: prevCycle.data?.metrics?.satisfaction || 
                          prevCycle.data?.satisfaction || 3.0,
            communication: prevCycle.data?.metrics?.communication || 
                           prevCycle.data?.communication || 3.0,
            connection: prevCycle.data?.metrics?.connection || 
                        prevCycle.data?.connection || 3.0,
            workload: prevCycle.data?.metrics?.workload || 
                      prevCycle.data?.workload || 3.0
          } : null;
          
          return (
            <div key={cycle.cycle} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
                onClick={() => handleSelectCycle(cycle.cycle)}>
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium font-roboto">Cycle {cycle.cycle}</h5>
                <span className="text-sm text-gray-500 font-roboto">
                  {formatDate(cycle.date)}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <div className={`text-lg font-bold ${getMetricColor(metrics.satisfaction)}`}>
                      {metrics.satisfaction.toFixed(1)}
                    </div>
                    {prevMetrics && (
                      <div className="ml-1">
                        {renderMetricIndicator(
                          metrics.satisfaction, 
                          prevMetrics.satisfaction
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <div className={`text-lg font-bold ${getMetricColor(metrics.communication)}`}>
                      {metrics.communication.toFixed(1)}
                    </div>
                    {prevMetrics && (
                      <div className="ml-1">
                        {renderMetricIndicator(
                          metrics.communication, 
                          prevMetrics.communication
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">Communication</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <div className={`text-lg font-bold ${getMetricColor(metrics.connection)}`}>
                      {metrics.connection.toFixed(1)}
                    </div>
                    {prevMetrics && (
                      <div className="ml-1">
                        {renderMetricIndicator(
                          metrics.connection, 
                          prevMetrics.connection
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">Connection</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <div className={`text-lg font-bold ${getMetricColor(metrics.workload)}`}>
                      {metrics.workload.toFixed(1)}
                    </div>
                    {prevMetrics && (
                      <div className="ml-1">
                        {renderMetricIndicator(
                          metrics.workload, 
                          prevMetrics.workload
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">Workload</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  {(cycle.data?.meeting || cycle.data?.meeting?.completedAt) && (
                    <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-roboto mr-2">
                      <CheckCircle size={12} className="mr-1" />
                      Meeting Completed
                    </span>
                  )}
                  
                  {(cycle.data?.questionnaireCompleted || 
                    cycle.data?.questionnaireResponses && 
                    Object.keys(cycle.data.questionnaireResponses).length > 0) && (
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