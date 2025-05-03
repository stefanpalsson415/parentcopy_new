// src/components/dashboard/tabs/TaskBoardTab.jsx
import React, { useState, useEffect } from 'react';
import { Clipboard, AlertCircle, Info, Award, Star } from 'lucide-react';
import FamilyKanbanBoard from '../../kanban/FamilyKanbanBoard';
import KidTokenSystem from '../../dashboard/KidTokenSystem';
import { useFamily } from '../../../contexts/FamilyContext';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const TaskBoardTab = () => {
  const { familyId, familyMembers } = useFamily();
  const [showTokens, setShowTokens] = useState(false);
  const [parentTasks, setParentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load parent tasks that could be verified by children
  useEffect(() => {
    if (!familyId) return;
    
    const loadParentTasks = async () => {
      try {
        setLoading(true);
        // Get all parent members
        const parentMembers = familyMembers.filter(m => m.role === 'parent' || m.role === 'guardian');
        const parentIds = parentMembers.map(p => p.id);
        
        if (parentIds.length === 0) {
          setParentTasks([]);
          setLoading(false);
          return;
        }
        
        // Query tasks assigned to parents
        const q = query(
          collection(db, "kanbanTasks"),
          where("familyId", "==", familyId),
          where("assignedTo", "in", parentIds)
        );
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const tasks = [];
            snapshot.forEach((doc) => {
              tasks.push({
                id: doc.id,
                ...doc.data()
              });
            });
            
            setParentTasks(tasks);
            setLoading(false);
          },
          (error) => {
            console.error("Error loading parent tasks:", error);
            setLoading(false);
          }
        );
        
        return unsubscribe;
      } catch (err) {
        console.error("Error in task loading effect:", err);
        setLoading(false);
      }
    };
    
    loadParentTasks();
  }, [familyId, familyMembers]);

  // Handle token verification
  const handleTokenVerified = (taskId) => {
    console.log(`Task ${taskId} verified by child token`);
    // No need to update tasks manually - the Firestore listener will update the UI
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-roboto mb-2">Family Task Board</h2>
        <p className="text-gray-600 font-roboto">
          Manage and track tasks for all family members in one place.
        </p>
      </div>
      
      {/* Information banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 flex items-start">
        <Info size={24} className="text-blue-500 flex-shrink-0 mr-3" />
        <div>
          <h3 className="font-medium text-blue-700 mb-1">About the Task Board</h3>
          <p className="text-sm text-blue-600">
            Drag and drop tasks between columns to update their status. All family members can see and collaborate on tasks.
            When you ask Allie to create a task, it will appear in this board automatically.
          </p>
        </div>
      </div>
      
      {/* Toggle for Kid Tokens section - styled to match screenshot */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowTokens(!showTokens)}
          className="flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 bg-white shadow-sm hover:bg-blue-50"
        >
          <Star size={16} className="mr-2 text-blue-500" />
          Show Kid Tokens
        </button>
      </div>
      
      {/* Kid tokens section - updated to match screenshot */}
      {showTokens && (
        <div className="mb-6 bg-white rounded-lg p-5 border border-yellow-200 shadow-sm">
          <div className="border-l-4 border-yellow-400 pl-4 mb-4">
            <h3 className="text-lg font-bold text-yellow-800 flex items-center">
              <Award className="text-yellow-600 mr-2" size={20} />
              Family Bucks - Kid Token System
            </h3>
          </div>
          <KidTokenSystem 
            parentTasks={parentTasks} 
            onTokenVerified={handleTokenVerified} 
          />
        </div>
      )}
      
      {/* Kanban board */}
      <FamilyKanbanBoard hideHeader={false} />
      
      {/* Allie integration hint */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-2 flex items-center">
          <Clipboard size={18} className="text-gray-700 mr-2" />
          Task Creation with Allie
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          You can ask Allie to create tasks for you. Try saying:
        </p>
        <div className="bg-white rounded-md border border-gray-200 p-3">
          <ul className="text-sm text-gray-700 space-y-2">
            <li>"Allie, create a task to clean the garage this weekend"</li>
            <li>"Allie, add a task for Sarah to take out the trash on Tuesday"</li>
            <li>"Allie, make a shopping task for groceries"</li>
          </ul>
        </div>
      </div>
      
      {/* Kid tokens information - updated to match screenshot */}
      <div className="mt-4 bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Award size={20} className="text-yellow-600" />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2 text-yellow-800">
              Family Bucks - Kid Token System
            </h3>
            <p className="text-sm text-yellow-700 mb-2">
              Kids can help keep you accountable by verifying when you complete tasks. When they verify your task, they earn Family Bucks!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBoardTab;