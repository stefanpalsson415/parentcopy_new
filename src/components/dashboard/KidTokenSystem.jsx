// src/components/dashboard/KidTokenSystem.jsx
import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Star, Award, Zap, Gift, Check, Camera, Calendar, Clock, 
  CheckCircle, Sparkles, BookOpen, RotateCcw, ArrowRight
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  increment,
  arrayUnion,
  setDoc
} from 'firebase/firestore';
import confetti from 'canvas-confetti';

const KidTokenSystem = ({ parentTasks = [], onTokenVerified }) => {
  const { familyId, familyName, familyMembers, selectedUser } = useFamily();
  const { currentUser } = useAuth();
  
  // State
  const [childrenTokens, setChildrenTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenAnimation, setTokenAnimation] = useState(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  
  // Icons options based on family themes
  const tokenIcons = {
    default: <Star className="text-yellow-500 h-10 w-10" />,
    star: <Star className="text-yellow-500 h-10 w-10" />,
    award: <Award className="text-yellow-500 h-10 w-10" />,
    zap: <Zap className="text-yellow-500 h-10 w-10" />,
    gift: <Gift className="text-purple-500 h-10 w-10" />,
    sparkles: <Sparkles className="text-blue-500 h-10 w-10" />
  };
  
  // Load tokens for children
  useEffect(() => {
    if (!familyId) return;
    
    const loadChildTokens = async () => {
      try {
        setLoading(true);
        
        // Get all tokens from Firestore
        const q = query(
          collection(db, "kidTokens"),
          where("familyId", "==", familyId),
          where("status", "in", ["active", "pending"]) // Exclude claimed tokens
        );
        
        const tokensSnapshot = await getDocs(q);
        const tokens = [];
        
        tokensSnapshot.forEach((doc) => {
          tokens.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Group tokens by child
        const tokensByChild = {};
        const childMembers = familyMembers.filter(m => m.role === 'child');
        
        childMembers.forEach(child => {
          tokensByChild[child.id] = {
            childInfo: child,
            tokens: tokens.filter(t => t.childId === child.id)
          };
        });
        
        setChildrenTokens(tokensByChild);
        setLoading(false);
      } catch (err) {
        console.error("Error loading kid tokens:", err);
        setError("Failed to load tokens. Please try again.");
        setLoading(false);
      }
    };
    
    loadChildTokens();
  }, [familyId, familyMembers]);
  
  // Check for tasks with hasKidToken set to true but no token created yet
  useEffect(() => {
    if (!familyId || !currentUser || parentTasks.length === 0) return;
    
    const createMissingTokens = async () => {
      try {
        // Get all existing tokens for this family
        const q = query(
          collection(db, "kidTokens"),
          where("familyId", "==", familyId)
        );
        
        const existingTokensSnapshot = await getDocs(q);
        const existingTokens = [];
        
        existingTokensSnapshot.forEach((doc) => {
          existingTokens.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Find tasks that have hasKidToken but no token created
        const tasksNeedingTokens = parentTasks.filter(task => 
          task.hasKidToken && 
          task.kidTokenChildId && 
          !existingTokens.some(token => token.taskId === task.id)
        );
        
        // Create tokens for each task
        for (const task of tasksNeedingTokens) {
          await createToken(task.kidTokenChildId, task.id);
        }
        
      } catch (err) {
        console.error("Error checking for missing tokens:", err);
      }
    };
    
    createMissingTokens();
  }, [familyId, currentUser, parentTasks]);
  
  // Create a new token for a child
  const createToken = async (childId, taskId) => {
    try {
      if (!familyId || !currentUser || !childId || !taskId) return;
      
      // Get task details
      const taskRef = doc(db, "kanbanTasks", taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        setError("Task not found");
        return;
      }
      
      const task = taskDoc.data();
      const child = familyMembers.find(m => m.id === childId);
      const assigned = familyMembers.find(m => m.id === task.assignedTo);
      
      if (!child || !assigned) {
        setError("Child or assigned person not found");
        return;
      }
      
      // Generate mission based on task
      const missionText = generateMission(task, assigned.name, child.age);
      
      // Create new token
      const token = {
        familyId,
        childId,
        taskId,
        parentId: task.assignedTo,
        parentName: assigned.name,
        taskTitle: task.title,
        mission: missionText,
        status: "active", // Changed from "pending" to "active" so it shows immediately
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(), // Expires at end of day
        icon: "star", // Default icon
        rewardPrompt: `Great job helping ${assigned.name} complete their task!`,
        verifiedAt: null,
        notes: "",
        denominationType: `${familyName || 'Family'} Bucks` // "Palsson Bucks", etc.
      };
      
      // Add to Firestore
      await addDoc(collection(db, "kidTokens"), token);
      
      // Update task with token info
      await updateDoc(taskRef, {
        hasKidToken: true,
        kidTokenChildId: childId,
        lastUpdated: serverTimestamp()
      });
      
      // Reload tokens
      const q = query(
        collection(db, "kidTokens"),
        where("familyId", "==", familyId),
        where("status", "in", ["active", "pending"])
      );
      
      const tokensSnapshot = await getDocs(q);
      const tokens = [];
      
      tokensSnapshot.forEach((doc) => {
        tokens.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Update state
      const tokensByChild = { ...childrenTokens };
      const childMembers = familyMembers.filter(m => m.role === 'child');
      
      childMembers.forEach(child => {
        tokensByChild[child.id] = {
          childInfo: child,
          tokens: tokens.filter(t => t.childId === child.id)
        };
      });
      
      setChildrenTokens(tokensByChild);
      
      return true;
    } catch (err) {
      console.error("Error creating token:", err);
      setError("Failed to create token. Please try again.");
      return false;
    }
  };
  
  // Verify a token as complete
  const verifyToken = async (tokenId) => {
    try {
      if (!familyId || !currentUser) return;
      
      // Get token
      const tokenRef = doc(db, "kidTokens", tokenId);
      const tokenDoc = await getDoc(tokenRef);
      
      if (!tokenDoc.exists()) {
        setError("Token not found");
        return;
      }
      
      const token = tokenDoc.data();
      
      // Update token
      await updateDoc(tokenRef, {
        status: "claimed",
        verifiedAt: serverTimestamp(),
        verifiedBy: currentUser.uid
      });
      
      // Update task if exists
      if (token.taskId) {
        const taskRef = doc(db, "kanbanTasks", token.taskId);
        await updateDoc(taskRef, {
          kidTokenVerified: true,
          childVerified: true,
          lastUpdated: serverTimestamp()
        });
      }
      
      // Award child with points
      const childRef = doc(db, "childProfiles", token.childId);
      const childDoc = await getDoc(childRef);
      
      if (childDoc.exists()) {
        await updateDoc(childRef, {
          tokenPoints: increment(1),
          tokensEarned: increment(1),
          tokensHistory: arrayUnion({
            date: new Date().toISOString(),
            tokenId,
            taskTitle: token.taskTitle,
            parentName: token.parentName
          })
        });
      } else {
        // Create child profile if it doesn't exist
        await setDoc(childRef, {
          childId: token.childId,
          familyId,
          tokenPoints: 1,
          tokensEarned: 1,
          tokensHistory: [{
            date: new Date().toISOString(),
            tokenId,
            taskTitle: token.taskTitle,
            parentName: token.parentName
          }]
        });
      }
      
      // Show confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Trigger token verification callback
      if (onTokenVerified) {
        onTokenVerified(token.taskId);
      }
      
      // Update UI
      setTokenAnimation(tokenId);
      setTimeout(() => {
        setTokenAnimation(null);
      }, 2000);
      
      // Show reward modal
      setSelectedToken(token);
      setShowRewardModal(true);
      
      // Update state
      const updatedTokens = { ...childrenTokens };
      
      Object.keys(updatedTokens).forEach(childId => {
        if (updatedTokens[childId].tokens.some(t => t.id === tokenId)) {
          updatedTokens[childId].tokens = updatedTokens[childId].tokens.filter(t => t.id !== tokenId);
        }
      });
      
      setChildrenTokens(updatedTokens);
      
      return true;
    } catch (err) {
      console.error("Error verifying token:", err);
      setError("Failed to verify token. Please try again.");
      return false;
    }
  };
  
  // Generate mission text based on task and age
  const generateMission = (task, parentName, childAge = 10) => {
    // Simple templates based on age
    const templates = {
      young: [
        `Give this star to ${parentName} when they finish ${task.title}.`,
        `Watch ${parentName} do ${task.title}. Tap the check mark when done!`,
        `Help ${parentName} with ${task.title} and give them this token.`
      ],
      mid: [
        `Give this token to ${parentName} when they finish ${task.title} today.`,
        `Start a timer and see if ${parentName} can finish ${task.title} before it ends!`,
        `Your mission: Make sure ${parentName} completes ${task.title} today.`
      ],
      teen: [
        `Verify that ${parentName} completes ${task.title} today.`,
        `Your job: Make sure ${parentName} finishes ${task.title} on time.`,
        `Keep ${parentName} accountable for ${task.title} today.`
      ]
    };
    
    // Select template based on age
    const ageGroup = childAge <= 7 ? 'young' : childAge <= 12 ? 'mid' : 'teen';
    const templateList = templates[ageGroup];
    
    // Return random template
    const index = Math.floor(Math.random() * templateList.length);
    return templateList[index];
  };
  
  // Render token card for a single token - updated styling to match screenshot
  const renderTokenCard = (token, childInfo) => {
    const isActive = token.status === 'active';
    const icon = tokenIcons[token.icon] || tokenIcons.default;
    const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
    
    // Check if token is expired
    const isExpired = expiresAt && new Date() > expiresAt;
    
    return (
      <div 
        key={token.id}
        className={`bg-white rounded-lg shadow-sm p-4 mb-3 border ${
          isExpired ? 'border-gray-300 opacity-50' : 'border-yellow-300'
        } ${tokenAnimation === token.id ? 'animate-bounce' : ''}`}
      >
        <div className="flex items-start">
          <div className="mr-3 bg-yellow-100 p-2 rounded-full">
            {icon}
          </div>
          
          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-yellow-700">
                  {(familyName || 'Family')} Buck
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  For: {childInfo.name}
                </p>
              </div>
              
              {expiresAt && (
                <div className="text-xs text-gray-500 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {isExpired ? 'Expired' : 'Expires today'}
                </div>
              )}
            </div>
            
            <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
              <h4 className="text-sm font-medium text-yellow-700 mb-1">Your Mission:</h4>
              <p className="text-sm">{token.mission}</p>
            </div>
            
            {isActive && !isExpired && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => verifyToken(token.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Check size={18} className="mr-2" />
                  Mark Complete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render child section with tokens - updated styling to match screenshot
  const renderChildSection = (childId, childData) => {
    const { childInfo, tokens } = childData;
    const activeTokens = tokens.filter(t => !t.expiresAt || new Date() <= new Date(t.expiresAt));
    
    if (activeTokens.length === 0) return null;
    
    return (
      <div key={childId} className="mb-6">
        <div className="flex items-center mb-3 bg-yellow-50 rounded-lg p-2 border border-yellow-200">
          <UserAvatar user={childInfo} size={32} className="mr-2" />
          <h3 className="text-lg font-bold text-yellow-800">{childInfo.name}'s Tokens</h3>
        </div>
        
        {activeTokens.map(token => renderTokenCard(token, childInfo))}
      </div>
    );
  };
  
  // Reward modal component - updated styling to match yellow theme
  const RewardModal = ({ token, onClose }) => {
    if (!token) return null;
    
    const handleCelebrate = () => {
      // Show confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      // Close after delay
      setTimeout(onClose, 1000);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
          <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Award size={32} className="text-yellow-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-center text-yellow-700 mb-2">Great Job!</h2>
          
          <p className="text-center mb-6 text-gray-700">
            You've earned a {(familyName || 'Family')} Buck for helping your family!
          </p>
          
          <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              {token.rewardPrompt || "Thank you for being a great helper!"}
            </p>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleCelebrate}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg px-6 py-2 flex items-center"
            >
              <Sparkles size={18} className="mr-2" />
              Celebrate!
            </button>
            
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // No tokens message - updated styling to match screenshot
  const NoTokensMessage = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <Award size={40} className="mx-auto mb-3 text-yellow-400" />
      <h3 className="text-lg font-medium text-yellow-700 mb-2">No Active Tokens</h3>
      <p className="text-gray-600 mb-4">
        Children don't have any active tokens right now. Create tokens for tasks to get them involved!
      </p>
    </div>
  );
  
  // Main component render
  return (
    <div className="kid-token-system">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="underline text-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div>
          <p className="text-gray-700 mb-4">
            Kids can help keep you accountable by verifying when you complete tasks. When they verify your task, they earn {familyName || 'Family'} Bucks!
          </p>
          
          {/* Token list by child */}
          {Object.keys(childrenTokens).length > 0 ? (
            <div>
              {Object.entries(childrenTokens).map(([childId, data]) => 
                renderChildSection(childId, data)
              )}
              
              {/* Show no tokens message if all children have no tokens */}
              {Object.values(childrenTokens).every(data => data.tokens.length === 0) && (
                <NoTokensMessage />
              )}
            </div>
          ) : (
            <NoTokensMessage />
          )}
        </div>
      )}
      
      {/* Reward modal */}
      {showRewardModal && (
        <RewardModal 
          token={selectedToken} 
          onClose={() => {
            setShowRewardModal(false);
            setSelectedToken(null);
          }}
        />
      )}
    </div>
  );
};

export default KidTokenSystem;