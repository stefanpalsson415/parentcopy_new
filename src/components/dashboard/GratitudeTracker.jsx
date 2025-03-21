import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Heart, Plus, MessageSquare, User, Calendar, X, Edit, Trash2 } from 'lucide-react';

const GratitudeTracker = () => {
  const { familyId, familyMembers, selectedUser } = useFamily();
  
  const [gratitudes, setGratitudes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGratitude, setNewGratitude] = useState({
    text: '',
    recipientId: '',
    category: 'appreciation'
  });
  const [editIndex, setEditIndex] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    categories: {}
  });
  
  // Load gratitude data
  useEffect(() => {
    const loadGratitudeData = async () => {
      if (!familyId) return;
      
      // In a real implementation, this would load from database
      // For now, using mock data
      const mockGratitudes = [
        { 
          id: '1', 
          text: 'Thank you for handling the school pickup yesterday when I was stuck in a meeting.',
          fromId: familyMembers.find(m => m.roleType === 'Mama')?.id,
          fromName: familyMembers.find(m => m.roleType === 'Mama')?.name,
          toId: familyMembers.find(m => m.roleType === 'Papa')?.id,
          toName: familyMembers.find(m => m.roleType === 'Papa')?.name,
          date: new Date(Date.now() - 86400000).toISOString(),
          category: 'appreciation'
        },
        { 
          id: '2', 
          text: 'I appreciate how you always make time to listen to me even when you\'re busy.',
          fromId: familyMembers.find(m => m.roleType === 'Papa')?.id,
          fromName: familyMembers.find(m => m.roleType === 'Papa')?.name,
          toId: familyMembers.find(m => m.roleType === 'Mama')?.id,
          toName: familyMembers.find(m => m.roleType === 'Mama')?.name,
          date: new Date(Date.now() - 172800000).toISOString(),
          category: 'affirmation'
        }
      ];
      
      setGratitudes(mockGratitudes);
      
      // Calculate stats
      calculateStats(mockGratitudes);
    };
    
    loadGratitudeData();
  }, [familyId, familyMembers]);
  
  // Calculate statistics
  const calculateStats = (gratitudesList) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    let thisWeekCount = 0;
    const categories = {};
    
    gratitudesList.forEach(gratitude => {
      // Count this week's gratitudes
      const gratDate = new Date(gratitude.date);
      if (gratDate >= startOfWeek) {
        thisWeekCount++;
      }
      
      // Count by category
      if (!categories[gratitude.category]) {
        categories[gratitude.category] = 0;
      }
      categories[gratitude.category]++;
    });
    
    setStats({
      total: gratitudesList.length,
      thisWeek: thisWeekCount,
      categories
    });
  };
  
  // Add new gratitude
  const addGratitude = () => {
    if (!newGratitude.text || !newGratitude.recipientId) return;
    
    const recipient = familyMembers.find(m => m.id === newGratitude.recipientId);
    
    const gratitude = {
      id: Date.now().toString(),
      text: newGratitude.text,
      fromId: selectedUser.id,
      fromName: selectedUser.name,
      toId: recipient.id,
      toName: recipient.name,
      date: new Date().toISOString(),
      category: newGratitude.category
    };
    
    const updatedGratitudes = editIndex !== null 
      ? gratitudes.map((g, i) => i === editIndex ? gratitude : g)
      : [gratitude, ...gratitudes];
    
    setGratitudes(updatedGratitudes);
    calculateStats(updatedGratitudes);
    
    // Reset form
    setNewGratitude({
      text: '',
      recipientId: '',
      category: 'appreciation'
    });
    setShowAddModal(false);
    setEditIndex(null);
    
    // In a real implementation, save to database
    // await saveFamilyData({ gratitudes: updatedGratitudes }, familyId);
  };
  
  // Edit gratitude
  const editGratitude = (index) => {
    const gratitude = gratitudes[index];
    
    setNewGratitude({
      text: gratitude.text,
      recipientId: gratitude.toId,
      category: gratitude.category
    });
    
    setEditIndex(index);
    setShowAddModal(true);
  };
  
  // Delete gratitude
  const deleteGratitude = (index) => {
    const confirmed = window.confirm("Are you sure you want to delete this appreciation?");
    if (!confirmed) return;
    
    const updatedGratitudes = gratitudes.filter((_, i) => i !== index);
    setGratitudes(updatedGratitudes);
    calculateStats(updatedGratitudes);
    
    // In a real implementation, save to database
    // await saveFamilyData({ gratitudes: updatedGratitudes }, familyId);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Get suggestion for gratitude expression
  const getSuggestions = () => [
    "I appreciate how you took care of the kids when I needed time for myself.",
    "Thank you for handling the grocery shopping this week.",
    "I value your patience and understanding when I was stressed.",
    "I'm grateful for how you always remember important family events.",
    "Thank you for making dinner last night. It was delicious!",
    "I appreciate your support with handling the household tasks.",
    "Thank you for listening to me when I needed to talk."
  ];
  
  // Get suggestion based on category
  const getCategorySuggestion = (category) => {
    if (category === 'appreciation') {
      return "Thank you for...";
    } else if (category === 'affirmation') {
      return "I admire how you...";
    } else if (category === 'gratitude') {
      return "I'm grateful for...";
    }
    return "";
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-roboto">Gratitude & Affirmation</h3>
          
          <button 
            onClick={() => {
              setNewGratitude({
                text: '',
                recipientId: '',
                category: 'appreciation'
              });
              setEditIndex(null);
              setShowAddModal(true);
            }}
            className="px-3 py-1 bg-black text-white rounded-full flex items-center text-sm font-roboto"
          >
            <Plus size={16} className="mr-1" />
            Express Appreciation
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 font-roboto">
          Regular expressions of gratitude and affirmation strengthen your relationship and improve emotional connection.
        </p>
        
        {/* Stats Display */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-pink-50 p-3 rounded-lg text-center border border-pink-100">
            <div className="text-2xl font-bold text-pink-700 font-roboto">{stats.total}</div>
            <div className="text-xs text-pink-700 font-roboto">Total Expressions</div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-700 font-roboto">{stats.thisWeek}</div>
            <div className="text-xs text-blue-700 font-roboto">This Week</div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-700 font-roboto">
              {stats.categories.affirmation || 0}
            </div>
            <div className="text-xs text-purple-700 font-roboto">Affirmations</div>
          </div>
        </div>
        
        {/* Recent Gratitudes */}
        <div>
          <h4 className="font-medium mb-3 font-roboto">Recent Expressions</h4>
          
          {gratitudes.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded">
              <Heart size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 font-roboto">No expressions of appreciation yet</p>
              <p className="text-sm text-gray-400 mt-1 font-roboto">
                Start by expressing gratitude or affirmation to your partner
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {gratitudes.map((gratitude, index) => (
                <div key={gratitude.id} className="border rounded-lg p-3 relative">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                        <Heart size={16} />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm flex items-center font-roboto">
                            <span className="font-medium">{gratitude.fromName}</span>
                            <span className="mx-1 text-gray-500">→</span>
                            <span>{gratitude.toName}</span>
                          </div>
                          <div className="text-xs text-gray-500 font-roboto">{formatDate(gratitude.date)}</div>
                        </div>
                        
                        {gratitude.fromId === selectedUser.id && (
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => editGratitude(index)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => deleteGratitude(index)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                        {gratitude.text}
                      </div>
                      
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-roboto ${
                          gratitude.category === 'appreciation' ? 'bg-blue-100 text-blue-700' :
                          gratitude.category === 'affirmation' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {gratitude.category.charAt(0).toUpperCase() + gratitude.category.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-roboto">
                {editIndex !== null ? 'Edit Appreciation' : 'Express Appreciation'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              {/* Recipient selection */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">To:</label>
                <select
                  value={newGratitude.recipientId}
                  onChange={(e) => setNewGratitude({...newGratitude, recipientId: e.target.value})}
                  className="w-full border rounded p-2 text-sm font-roboto"
                >
                  <option value="">Select recipient</option>
                  {familyMembers.filter(m => m.id !== selectedUser.id).map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Type:</label>
                <div className="flex space-x-2">
                  <button
                    className={`flex-1 px-2 py-1 rounded text-sm font-roboto ${
                      newGratitude.category === 'appreciation' 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setNewGratitude({...newGratitude, category: 'appreciation'})}
                  >
                    Appreciation
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 rounded text-sm font-roboto ${
                      newGratitude.category === 'affirmation' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setNewGratitude({...newGratitude, category: 'affirmation'})}
                  >
                    Affirmation
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 rounded text-sm font-roboto ${
                      newGratitude.category === 'gratitude' 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setNewGratitude({...newGratitude, category: 'gratitude'})}
                  >
                    Gratitude
                  </button>
                </div>
              </div>
              
              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Message:</label>
                <textarea
                  value={newGratitude.text}
                  onChange={(e) => setNewGratitude({...newGratitude, text: e.target.value})}
                  className="w-full border rounded p-2 text-sm min-h-[100px] font-roboto"
                  placeholder={getCategorySuggestion(newGratitude.category)}
                ></textarea>
              </div>
              
              {/* Suggestions */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Need inspiration?</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getSuggestions().map((suggestion, i) => (
                    <div 
                      key={i}
                      className="p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100 font-roboto"
                      onClick={() => setNewGratitude({...newGratitude, text: suggestion})}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded font-roboto"
              >
                Cancel
              </button>
              <button
                onClick={addGratitude}
                disabled={!newGratitude.text || !newGratitude.recipientId}
                className={`px-4 py-2 rounded font-roboto ${
                  newGratitude.text && newGratitude.recipientId 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {editIndex !== null ? 'Update' : 'Express'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GratitudeTracker;