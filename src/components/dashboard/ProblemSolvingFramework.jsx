import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Lightbulb, PlusCircle, CheckCircle, Edit, Trash2, X, Save } from 'lucide-react';

const ProblemSolvingFramework = () => {
  const { familyId, saveFamilyData } = useFamily();
  
  const [problems, setProblems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentProblem, setCurrentProblem] = useState({
    title: '',
    description: '',
    solutions: [],
    selectedSolution: null,
    progress: 'identified', // 'identified', 'analyzing', 'implementing', 'resolved'
    dateCreated: null,
    dateResolved: null
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editingSolution, setEditingSolution] = useState(null);
  const [solutionText, setSolutionText] = useState('');
  
  // Load problems from database
  useEffect(() => {
    const loadProblems = async () => {
      if (!familyId) return;
      
      try {
        // In a real implementation, this would load from database
        // For now, using mock data
        const mockProblems = [
          {
            id: '1',
            title: 'Morning Routine Conflict',
            description: 'We're both trying to get ready and help the kids at the same time, creating stress',
            solutions: [
              'Create a staggered schedule where one parent handles kids while the other gets ready',
              'Prepare more items the night before',
              'Adjust wake-up times to reduce overlap'
            ],
            selectedSolution: 'Create a staggered schedule where one parent handles kids while the other gets ready',
            progress: 'implementing',
            dateCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            dateResolved: null
          },
          {
            id: '2',
            title: 'Disagreement on Screen Time Rules',
            description: 'Different approaches to kids' screen time is causing inconsistency',
            solutions: [
              'Research age-appropriate guidelines together',
              'Create a shared written policy',
              'Use screen time management app for consistency'
            ],
            selectedSolution: 'Create a shared written policy',
            progress: 'resolved',
            dateCreated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            dateResolved: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        setProblems(mockProblems);
      } catch (error) {
        console.error("Error loading problems:", error);
      }
    };
    
    loadProblems();
  }, [familyId]);
  
  // Save a problem
  const saveProblem = async (problem) => {
    setIsSaving(true);
    
    try {
      const isNew = !problem.id;
      const problemToSave = {
        ...problem,
        id: problem.id || Date.now().toString(),
        dateCreated: problem.dateCreated || new Date().toISOString()
      };
      
      // Update the problems array
      if (isNew) {
        setProblems([...problems, problemToSave]);
      } else {
        setProblems(problems.map(p => p.id === problemToSave.id ? problemToSave : p));
      }
      
      // In a real implementation, save to database
      // await saveFamilyData({ problems: [...problems, problemToSave] }, familyId);
      
      // Close the modal and reset current problem
      setShowAddModal(false);
      setCurrentProblem({
        title: '',
        description: '',
        solutions: [],
        selectedSolution: null,
        progress: 'identified',
        dateCreated: null,
        dateResolved: null
      });
      
      return true;
    } catch (error) {
      console.error("Error saving problem:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Update problem progress
  const updateProblemProgress = async (id, progress) => {
    try {
      const updatedProblems = problems.map(problem => {
        if (problem.id === id) {
          const updatedProblem = { 
            ...problem, 
            progress,
            dateResolved: progress === 'resolved' ? new Date().toISOString() : problem.dateResolved
          };
          return updatedProblem;
        }
        return problem;
      });
      
      setProblems(updatedProblems);
      
      // In a real implementation, save to database
      // await saveFamilyData({ problems: updatedProblems }, familyId);
      
      return true;
    } catch (error) {
      console.error("Error updating problem progress:", error);
      return false;
    }
  };
  
  // Add a solution to current problem
  const addSolution = () => {
    if (!solutionText.trim()) return;
    
    const updatedProblem = {
      ...currentProblem,
      solutions: [...currentProblem.solutions, solutionText]
    };
    
    setCurrentProblem(updatedProblem);
    setSolutionText('');
    setEditingSolution(null);
  };
  
  // Edit a solution
  const updateSolution = (index, newText) => {
    const updatedSolutions = [...currentProblem.solutions];
    updatedSolutions[index] = newText;
    
    setCurrentProblem({
      ...currentProblem,
      solutions: updatedSolutions
    });
    
    setSolutionText('');
    setEditingSolution(null);
  };
  
  // Remove a solution
  const removeSolution = (index) => {
    const updatedSolutions = currentProblem.solutions.filter((_, i) => i !== index);
    
    setCurrentProblem({
      ...currentProblem,
      solutions: updatedSolutions,
      selectedSolution: currentProblem.selectedSolution === currentProblem.solutions[index] 
        ? null 
        : currentProblem.selectedSolution
    });
  };
  
  // Select a solution
  const selectSolution = (solution) => {
    setCurrentProblem({
      ...currentProblem,
      selectedSolution: solution,
      progress: currentProblem.progress === 'identified' ? 'analyzing' : currentProblem.progress
    });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Problem-Solving Framework</h3>
          
          <button 
            onClick={() => {
              setCurrentProblem({
                title: '',
                description: '',
                solutions: [],
                selectedSolution: null,
                progress: 'identified',
                dateCreated: null,
                dateResolved: null
              });
              setShowAddModal(true);
            }}
            className="px-3 py-1 bg-black text-white rounded-full flex items-center text-sm font-roboto"
          >
            <PlusCircle size={16} className="mr-1" />
            Add New Problem
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Use this framework to address recurring family challenges with a structured, collaborative approach.
        </p>
        
        {/* Problems List */}
        <div className="space-y-4">
          {problems.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded">
              <Lightbulb size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 font-roboto">No problems have been added yet</p>
              <p className="text-sm text-gray-400 mt-1 font-roboto">
                Click "Add New Problem" to start using the framework
              </p>
            </div>
          ) : (
            problems.map(problem => (
              <div 
                key={problem.id} 
                className={`border rounded-lg p-4 ${
                  problem.progress === 'resolved' ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium mb-1 font-roboto">{problem.title}</h4>
                    <p className="text-sm text-gray-600 font-roboto">{problem.description}</p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded-full text-xs mb-2 ${
                      problem.progress === 'identified' ? 'bg-blue-100 text-blue-800' :
                      problem.progress === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                      problem.progress === 'implementing' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    } font-roboto`}>
                      {problem.progress === 'identified' ? 'Identified' :
                       problem.progress === 'analyzing' ? 'Analyzing' :
                       problem.progress === 'implementing' ? 'Implementing' :
                       'Resolved'}
                    </span>
                    
                    <span className="text-xs text-gray-500 font-roboto">
                      Created: {formatDate(problem.dateCreated)}
                    </span>
                    
                    {problem.dateResolved && (
                      <span className="text-xs text-gray-500 font-roboto">
                        Resolved: {formatDate(problem.dateResolved)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Solutions */}
                <div className="mt-3">
                  <h5 className="text-sm font-medium mb-2 font-roboto">Solutions:</h5>
                  <div className="space-y-2">
                    {problem.solutions.map((solution, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded text-sm flex items-start ${
                          solution === problem.selectedSolution 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex-1 font-roboto">
                          {solution}
                        </div>
                        
                        {solution === problem.selectedSolution && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs ml-2 whitespace-nowrap font-roboto">
                            Selected
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-4 flex justify-between">
                  <button 
                    onClick={() => {
                      setCurrentProblem(problem);
                      setShowAddModal(true);
                    }}
                    className="text-sm text-blue-600 flex items-center font-roboto"
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </button>
                  
                  <div className="space-x-2">
                    {problem.progress !== 'resolved' && (
                      <>
                        {problem.progress === 'identified' && (
                          <button 
                            onClick={() => updateProblemProgress(problem.id, 'analyzing')}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-roboto"
                          >
                            Move to Analyzing
                          </button>
                        )}
                        
                        {problem.progress === 'analyzing' && (
                          <button 
                            onClick={() => updateProblemProgress(problem.id, 'implementing')}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-xs font-roboto"
                            disabled={!problem.selectedSolution}
                          >
                            Move to Implementing
                          </button>
                        )}
                        
                        {problem.progress === 'implementing' && (
                          <button 
                            onClick={() => updateProblemProgress(problem.id, 'resolved')}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-roboto"
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Add/Edit Problem Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-roboto">
                {currentProblem.id ? 'Edit Problem' : 'Add New Problem'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              {/* Problem Title */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Problem Title:</label>
                <input
                  type="text"
                  value={currentProblem.title}
                  onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                  placeholder="Briefly describe the problem"
                />
              </div>
              
              {/* Problem Description */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Description:</label>
                <textarea
                  value={currentProblem.description}
                  onChange={(e) => setCurrentProblem({...currentProblem, description: e.target.value})}
                  className="w-full border rounded p-2 text-sm h-20 font-roboto"
                  placeholder="Provide context and details about this issue"
                ></textarea>
              </div>
              
              {/* Solutions Section */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Potential Solutions:</label>
                
                {/* Existing Solutions */}
                <div className="space-y-2 mb-3">
                  {currentProblem.solutions.map((solution, index) => (
                    <div key={index} className="flex items-start">
                      <div 
                        className={`flex-1 p-2 rounded text-sm ${
                          solution === currentProblem.selectedSolution 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 border'
                        } mr-2 font-roboto`}
                      >
                        {editingSolution === index ? (
                          <input
                            type="text"
                            value={solutionText}
                            onChange={(e) => setSolutionText(e.target.value)}
                            className="w-full p-1 border"
                            autoFocus
                          />
                        ) : (
                          <div className="flex justify-between items-start">
                            <span>{solution}</span>
                            
                            {solution === currentProblem.selectedSolution && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs whitespace-nowrap font-roboto">
                                Selected
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-1">
                        {editingSolution === index ? (
                          <button
                            onClick={() => updateSolution(index, solutionText)}
                            className="p-1 rounded bg-blue-100 text-blue-800"
                          >
                            <Save size={14} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSolutionText(solution);
                                setEditingSolution(index);
                              }}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <Edit size={14} className="text-gray-500" />
                            </button>
                            
                            <button
                              onClick={() => removeSolution(index)}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <Trash2 size={14} className="text-gray-500" />
                            </button>
                            
                            {solution !== currentProblem.selectedSolution && (
                              <button
                                onClick={() => selectSolution(solution)}
                                className="p-1 rounded hover:bg-blue-100"
                                title="Select as primary solution"
                              >
                                <CheckCircle size={14} className="text-blue-500" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Add New Solution */}
                {editingSolution === null && (
                  <div className="flex">
                    <input
                      type="text"
                      value={solutionText}
                      onChange={(e) => setSolutionText(e.target.value)}
                      className="flex-1 border rounded-l p-2 text-sm font-roboto"
                      placeholder="Add a potential solution"
                    />
                    <button
                      onClick={addSolution}
                      disabled={!solutionText.trim()}
                      className="px-3 py-2 bg-black text-white rounded-r font-roboto disabled:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              
              {/* Progress Stage */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Current Stage:</label>
                <select
                  value={currentProblem.progress}
                  onChange={(e) => setCurrentProblem({...currentProblem, progress: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                >
                  <option value="identified">Identified</option>
                  <option value="analyzing">Analyzing</option>
                  <option value="implementing">Implementing</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded mr-2 font-roboto"
              >
                Cancel
              </button>
              
              <button
                onClick={() => saveProblem(currentProblem)}
                disabled={!currentProblem.title || currentProblem.solutions.length === 0 || isSaving}
                className="px-4 py-2 bg-black text-white rounded font-roboto disabled:bg-gray-300"
              >
                {isSaving ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span> Saving...
                  </>
                ) : currentProblem.id ? 'Update Problem' : 'Save Problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemSolvingFramework;