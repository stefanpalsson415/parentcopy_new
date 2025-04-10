import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { Heart, Plus, MessageSquare, Edit, Trash2, Send, Star, Check, X } from 'lucide-react';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc,orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

const UpdatedGratitudeTracker = () => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Add this line
  const [deliveryMethod, setDeliveryMethod] = useState('app');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  
  // src/components/dashboard/GratitudeTracker.jsx - Fix for the useEffect syntax error
useEffect(() => {
  const loadGratitudeData = async () => {
    if (!familyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Array to store all gratitude data
      const loadedGratitudes = [];
      
      // Query Firebase for saved gratitudes
      const gratitudesRef = collection(db, "gratitudes");
      const q = query(gratitudesRef, where("familyId", "==", familyId));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        loadedGratitudes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by date (newest first)
      loadedGratitudes.sort((a, b) => new Date(b.date) - new Date(a.date));
      setGratitudes(loadedGratitudes);
      
      // Calculate stats on real data
      calculateStats(loadedGratitudes);
      setLoading(false);
    } catch (error) {
      console.error("Error loading gratitude data:", error);
      setGratitudes([]);
      calculateStats([]);
      setLoading(false);
    }
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
  const addGratitude = async () => {
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
      category: newGratitude.category,
      familyId: familyId // Important for Firebase queries
    };
    
    try {
      // Save to Firebase
      const gratitudeRef = collection(db, "gratitudes");
      const docRef = await addDoc(gratitudeRef, {
        ...gratitude,
        createdAt: serverTimestamp()
      });
      
      // Add document ID to the gratitude object
      gratitude.id = docRef.id;
      
      // Update state
      const updatedGratitudes = editIndex !== null 
        ? gratitudes.map((g, i) => i === editIndex ? gratitude : g)
        : [gratitude, ...gratitudes];
      
      setGratitudes(updatedGratitudes);
      calculateStats(updatedGratitudes);
      
      // If delivery method is selected, send notification
      if (deliveryMethod === 'app' || deliveryMethod === 'email') {
        await sendNotification(gratitude, recipient, deliveryMethod);
      }
      
      // Reset form
      setNewGratitude({
        text: '',
        recipientId: '',
        category: 'appreciation'
      });
      setShowAddModal(false);
      setEditIndex(null);
      setNotificationSent(false);
      setDeliveryMethod('app');
      
      return true;
    } catch (error) {
      console.error("Error saving gratitude:", error);
      return false;
    }
  };
  
  // Send notification
  const sendNotification = async (gratitude, recipient, method) => {
    setSendingNotification(true);
    
    try {
      if (method === 'app') {
        // Create in-app notification
        await addDoc(collection(db, "notifications"), {
          userId: recipient.id,
          type: 'gratitude',
          title: `${gratitude.fromName} sent you ${gratitude.category}`,
          message: gratitude.text,
          read: false,
          date: serverTimestamp(),
          gratitudeId: gratitude.id
        });
      } else if (method === 'email') {
        // In a real app, this would send an email
        // For now, we'll just simulate it
        console.log(`Email notification sent to ${recipient.name}:`, gratitude);
      }
      
      // Update the gratitude to mark as delivered
      await setDoc(doc(db, "gratitudes", gratitude.id), {
        delivered: true,
        deliveryMethod: method,
        deliveredAt: serverTimestamp()
      }, { merge: true });
      
      setNotificationSent(true);
    } catch (error) {
      console.error("Error sending notification:", error);
    } finally {
      setSendingNotification(false);
    }
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
  const deleteGratitude = async (index) => {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;
    
    try {
      const gratitudeToDelete = gratitudes[index];
      
      // Delete from Firebase
      await deleteDoc(doc(db, "gratitudes", gratitudeToDelete.id));
      
      // Update state
      const updatedGratitudes = gratitudes.filter((_, i) => i !== index);
      setGratitudes(updatedGratitudes);
      calculateStats(updatedGratitudes);
      
      return true;
    } catch (error) {
      console.error("Error deleting gratitude:", error);
      return false;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Send a gratitude directly
  const handleDirectSend = async (gratitude) => {
    if (!gratitude.toId) return;
    
    const recipient = familyMembers.find(m => m.id === gratitude.toId);
    
    if (recipient) {
      await sendNotification(gratitude, recipient, 'app');
    }
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
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
      </div>
    );
  }
  
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
              setNotificationSent(false);
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
                        
                        <div className="flex space-x-1">
                          {/* Show send button if from current user and not already delivered */}
                          {gratitude.fromId === selectedUser.id && !gratitude.delivered && (
                            <button 
                              onClick={() => handleDirectSend(gratitude)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Send via App"
                            >
                              <Send size={14} />
                            </button>
                          )}

                          {gratitude.fromId === selectedUser.id && (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-roboto">
                        {gratitude.text}
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-roboto ${
                          gratitude.category === 'appreciation' ? 'bg-blue-100 text-blue-700' :
                          gratitude.category === 'affirmation' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {gratitude.category.charAt(0).toUpperCase() + gratitude.category.slice(1)}
                        </span>
                        
                        {gratitude.delivered && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Check size={12} className="mr-1" />
                            Delivered via {gratitude.deliveryMethod || 'app'}
                          </span>
                        )}
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
                {editIndex !== null ? 'Edit Expression' : 'Express Appreciation'}
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
              
              {/* Delivery method */}
              <div>
                <label className="block text-sm font-medium mb-1 font-roboto">Delivery method:</label>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-roboto">
                    <input 
                      type="radio" 
                      name="deliveryMethod" 
                      value="app" 
                      checked={deliveryMethod === 'app'}
                      onChange={() => setDeliveryMethod('app')}
                      className="mr-2"
                    />
                    App notification
                  </label>
                  <label className="flex items-center text-sm font-roboto">
                    <input 
                      type="radio" 
                      name="deliveryMethod" 
                      value="email" 
                      checked={deliveryMethod === 'email'}
                      onChange={() => setDeliveryMethod('email')}
                      className="mr-2"
                    />
                    Email
                  </label>
                  <label className="flex items-center text-sm font-roboto">
                    <input 
                      type="radio" 
                      name="deliveryMethod" 
                      value="none" 
                      checked={deliveryMethod === 'none'}
                      onChange={() => setDeliveryMethod('none')}
                      className="mr-2"
                    />
                    Don't send (just save)
                  </label>
                </div>
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
              
              {/* Notification status */}
              {notificationSent && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-roboto flex items-center">
                  <Check size={16} className="mr-2" />
                  Notification sent successfully!
                </div>
              )}
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
                disabled={!newGratitude.text || !newGratitude.recipientId || sendingNotification}
                className={`px-4 py-2 rounded font-roboto flex items-center ${
                  !newGratitude.text || !newGratitude.recipientId || sendingNotification
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-black text-white'
                }`}
              >
                {sendingNotification ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {editIndex !== null ? 'Update' : 'Send'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatedGratitudeTracker;