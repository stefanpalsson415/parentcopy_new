// src/contexts/FamilyContext.js
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import DatabaseService from '../services/DatabaseService';
import { calculateBalanceScores } from '../utils/TaskWeightCalculator';
import { useSurvey } from './SurveyContext';
import { db } from '../services/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import AllieAIEngineService from '../services/AllieAIEngineService';



// Create the family context
const FamilyContext = createContext();

// Custom hook to use the family context
export function useFamily() {
  return useContext(FamilyContext);
}

// Provider component
export function FamilyProvider({ children }) {
  const { currentUser, familyData: initialFamilyData } = useAuth();
  
  // Reference to store survey data passed from SurveyContext via the bridge component
  const surveyDataRef = useRef({
    fullQuestionSet: [],
    familyPriorities: {
      highestPriority: "Invisible Parental Tasks",
      secondaryPriority: "Visible Parental Tasks",
      tertiaryPriority: "Invisible Household Tasks"
    }
  });
  
  // Callback to update survey data
  const setSurveyData = useCallback((data) => {
    surveyDataRef.current = {
      ...surveyDataRef.current,
      ...data
    };
  }, []);
  
  const [familyId, setFamilyId] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [familyPicture, setFamilyPicture] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [completedWeeks, setCompletedWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surveySchedule, setSurveySchedule] = useState({});
  const [weekHistory, setWeekHistory] = useState({});
  const [weekStatus, setWeekStatus] = useState({});
  const [lastCompletedFullWeek, setLastCompletedFullWeek] = useState(0);
  const [taskRecommendations, setTaskRecommendations] = useState([]);
  const [taskEffectivenessData, setTaskEffectivenessData] = useState([]);
  const [impactInsights, setImpactInsights] = useState([]);
  const [kidTasksData, setKidTasksData] = useState({});
  const [coupleCheckInData, setCoupleCheckInData] = useState({});
  const [weightedScores, setWeightedScores] = useState(null);
  const [relationshipStrategies, setRelationshipStrategies] = useState([]);
  
  // Set family priorities for weighting system
  const [familyPriorities, setFamilyPriorities] = useState({
    highestPriority: "Invisible Parental Tasks",
    secondaryPriority: "Visible Parental Tasks",
    tertiaryPriority: "Invisible Household Tasks"
  });

  // Initialize family data from auth context
  useEffect(() => {
    if (initialFamilyData) {
      setFamilyId(initialFamilyData.familyId);
      setFamilyName(initialFamilyData.familyName || '');
      setFamilyPicture(initialFamilyData.familyPicture || null);
      setFamilyMembers(initialFamilyData.familyMembers || []);
      setCompletedWeeks(initialFamilyData.completedWeeks || []);
      setCurrentWeek(initialFamilyData.currentWeek || 1);
      setSurveySchedule(initialFamilyData.surveySchedule || {});
      setSurveyResponses(initialFamilyData.surveyResponses || {});
      setWeekHistory(initialFamilyData.weekHistory || {});
      setWeekStatus(initialFamilyData.weekStatus || {});
      setLastCompletedFullWeek(initialFamilyData.lastCompletedFullWeek || 0);
      setTaskRecommendations(initialFamilyData.tasks || []);
      setTaskEffectivenessData(initialFamilyData.taskEffectiveness || []);
      setImpactInsights(initialFamilyData.impactInsights || []);
      setKidTasksData(initialFamilyData.kidTasks || {});
      
      // Set document title with family name
      if (initialFamilyData.familyName) {
        document.title = `${initialFamilyData.familyName} Family AI Balancer`;
      }
      
      // Set favicon if family picture exists
      if (initialFamilyData.familyPicture) {
        updateFavicon(initialFamilyData.familyPicture);
      }
      
      // Try to set the selected user to the current authenticated user
      if (currentUser) {
        const userMember = initialFamilyData.familyMembers?.find(
          member => member.id === currentUser.uid
        );
        if (userMember) {
          setSelectedUser(userMember);
        }
      }
      
      setLoading(false);
    } else if (!currentUser) {
      // Reset state if no user is logged in
      resetFamilyState();
      setLoading(false);
    }
  }, [initialFamilyData, currentUser]);



  // Update favicon helper function
  const updateFavicon = (imageUrl) => {
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = imageUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  // Get default favicon based on role
const getDefaultFavicon = () => {
  // If family has a picture, use it
  if (familyPicture) {
    return familyPicture;
  }
  // Otherwise return default favicon
  return '/favicon.svg';
};

// Add this call to useEffect where favicon is set (around line 82)
// Update favicon with family picture or default
updateFavicon(familyPicture || getDefaultFavicon());

  // Reset all family state
  const resetFamilyState = () => {
    setFamilyId(null);
    setFamilyName('');
    setFamilyPicture(null);
    setFamilyMembers([]);
    setSelectedUser(null);
    setSurveyResponses({});
    setCompletedWeeks([]);
    setCurrentWeek(1);
    setSurveySchedule({});
    setWeekHistory({});
    setWeekStatus({});
    setLastCompletedFullWeek(0);
    setTaskRecommendations([]);
    setTaskEffectivenessData([]);
    setImpactInsights([]);
    setKidTasksData({});
    setWeightedScores(null); // Added this line to ensure weightedScores gets reset
    setError(null);
    
    // Reset document title
    document.title = 'Allie';
    
    // Reset favicon
    let link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = '/favicon.ico';
    }
  };

  // Select a family member
  const selectFamilyMember = (member) => {
    setSelectedUser(member);
    return member;
  };

  // Update member profile
  const updateMemberProfile = async (memberId, data) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const updatedMembers = familyMembers.map(member => 
        member.id === memberId ? { ...member, ...data } : member
      );
      
      setFamilyMembers(updatedMembers);
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({ familyMembers: updatedMembers }, familyId);
      
      // Update selected user if that's the one being modified
      if (selectedUser && selectedUser.id === memberId) {
        setSelectedUser({ ...selectedUser, ...data });
      }
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update family name
  const updateFamilyName = async (newName) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      setFamilyName(newName);
      
      // Update document title
      document.title = `${newName} Family AI Balancer`;
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({ familyName: newName }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update family picture (favicon)
  const updateFamilyPicture = async (imageUrl) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      setFamilyPicture(imageUrl);
      
      // Update favicon
      updateFavicon(imageUrl);
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({ familyPicture: imageUrl }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Save couple check-in data
  // Save couple check-in data with AI feedback
// Save couple check-in data with AI feedback
const saveCoupleCheckInData = async (familyId, weekNumber, data) => {
  try {
    if (!familyId) throw new Error("No family ID available");
    
    // Save the check-in data to Firestore
    await DatabaseService.saveCoupleCheckInData(familyId, weekNumber, data);
    
    // Get AI insights based on the check-in data
    try {
      const aiInsights = await AllieAIEngineService.generateCoupleCheckInFeedback(
        familyId,
        weekNumber,
        data
      );
      
      // Save the AI insights along with the check-in data
      if (aiInsights) {
        await DatabaseService.saveCoupleCheckInFeedback(familyId, weekNumber, aiInsights);
      }
      
      // Update local state
      setCoupleCheckInData(prev => ({
        ...prev,
        [weekNumber]: {
          ...data,
          aiInsights
        }
      }));
    } catch (insightError) {
      console.error("Error generating AI feedback:", insightError);
      // Don't block completion if AI insights fail
    }
    
    return true;
  } catch (error) {
    console.error("Error saving couple check-in data:", error);
    throw error;
  }
};

  // Get couple check-in data for a specific week
  const getCoupleCheckInData = (weekNumber) => {
    return coupleCheckInData[weekNumber] || null;
  };

  // Get relationship satisfaction trend data
  // Get relationship satisfaction trend data
const getRelationshipTrendData = () => {
  const trendData = [];
    
  // Add code for trend data here...
    
  return trendData;
};

// Get relationship strategies (MOVED OUTSIDE getRelationshipTrendData)
const getRelationshipStrategies = async () => {
  try {
    if (!familyId) throw new Error("No family ID available");
    
    // Try to get strategies from Firebase
    const docRef = doc(db, "relationshipStrategies", familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().strategies || [];
    }
    
    return null; // No strategies found
  } catch (error) {
    console.error("Error getting relationship strategies:", error);
    return null;
  }
};

// Update a relationship strategy (MOVED OUTSIDE getRelationshipTrendData)
const updateRelationshipStrategy = async (strategyId, updateData) => {
  try {
    if (!familyId) throw new Error("No family ID available");
    
    // Get current strategies
    const docRef = doc(db, "relationshipStrategies", familyId);
    const docSnap = await getDoc(docRef);
    
    let currentStrategies = [];
    
    if (docSnap.exists()) {
      currentStrategies = docSnap.data().strategies || [];
    }
    
    // Update the specific strategy
    const updatedStrategies = currentStrategies.map(strategy => 
      strategy.id === strategyId ? { ...strategy, ...updateData } : strategy
    );
    
    // Save back to Firebase
    await setDoc(docRef, {
      strategies: updatedStrategies,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Update local state
    setRelationshipStrategies(updatedStrategies);
    
    return true;
  } catch (error) {
    console.error("Error updating relationship strategy:", error);
    throw error;
  }
};

  // Update survey schedule
  const updateSurveySchedule = async (weekNumber, dueDate) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const updatedSchedule = { ...surveySchedule, [weekNumber]: dueDate.toISOString() };
      setSurveySchedule(updatedSchedule);
      
      // Also update any other related state like weekStatus
      const updatedStatus = {...weekStatus};
      if (updatedStatus[weekNumber]) {
        updatedStatus[weekNumber].scheduledDate = dueDate.toISOString();
      } else {
        updatedStatus[weekNumber] = {
          scheduledDate: dueDate.toISOString(),
          surveysCompleted: false,
          meetingNotesCompleted: false,
          completed: false
        };
      }
      setWeekStatus(updatedStatus);
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({ 
        surveySchedule: updatedSchedule,
        weekStatus: updatedStatus
      }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Complete initial survey
  const completeInitialSurvey = async (memberId, responses) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Update local state
      const updatedMembers = familyMembers.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            completed: true,
            completedDate: new Date().toISOString().split('T')[0]
          };
        }
        return member;
      });
      
      setFamilyMembers(updatedMembers);
      setSurveyResponses({ ...surveyResponses, ...responses });
      
      // Update Firebase
      await DatabaseService.updateMemberSurveyCompletion(familyId, memberId, 'initial', true);
      await DatabaseService.saveSurveyResponses(familyId, memberId, 'initial', responses);
      
      // Update selected user if that's the one completing the survey
      if (selectedUser && selectedUser.id === memberId) {
        setSelectedUser({
          ...selectedUser,
          completed: true,
          completedDate: new Date().toISOString().split('T')[0]
        });
      }
      

    

      // Store initial survey data in week history
      const allComplete = updatedMembers.every(member => member.completed);
      if (allComplete) {
        // Create initial survey snapshot using current responses
        const initialSurveyData = {
          responses: responses, // Use the responses that were just submitted
          completionDate: new Date().toISOString(),
          familyMembers: updatedMembers.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            completedDate: m.completedDate
          }))
        };
        
        // Update week history
        const updatedHistory = {
          ...weekHistory,
          initial: initialSurveyData
        };
        
        setWeekHistory(updatedHistory);
        
        // Save to Firebase
        await DatabaseService.saveFamilyData({ 
          weekHistory: updatedHistory
        }, familyId);
      }
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Save survey progress without marking as completed
  const saveSurveyProgress = async (memberId, responses) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      console.log("Saving survey progress for member:", memberId);
      console.log("Number of responses:", Object.keys(responses).length);
      
      // Update local survey responses state
      setSurveyResponses({
        ...surveyResponses,
        ...responses
      });
      
      // Save to Firebase without marking as completed
      await DatabaseService.saveSurveyResponses(familyId, memberId, 'initial', responses);
      
      console.log("Survey progress saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving survey progress:", error);
      setError(error.message);
      throw error;
    }
  };

  // Complete weekly check-in
  const completeWeeklyCheckIn = async (memberId, weekNum, responses) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Create a prefix for the responses to identify the week
      const prefixedResponses = {};
      Object.entries(responses).forEach(([key, value]) => {
        prefixedResponses[`week-${weekNum}-${key}`] = value;
      });
      
      // Update local state
      setSurveyResponses({
        ...surveyResponses,
        ...prefixedResponses
      });
      
      // Update member completion status
      const updatedMembers = familyMembers.map(member => {
        if (member.id === memberId) {
          const weeklyCompleted = [...(member.weeklyCompleted || [])];
          
          // Make sure there's an entry for each week up to the current one
          while (weeklyCompleted.length < weekNum) {
            weeklyCompleted.push({
              completed: false,
              date: null
            });
          }
          
          // Update the current week's status
          weeklyCompleted[weekNum - 1] = {
            completed: true,
            date: new Date().toISOString().split('T')[0]
          };
          
// Send relationship data to AI engine for learning
if (responses && Object.keys(responses).some(key => key.startsWith('rel-'))) {
  try {
    // Extract just the relationship responses
    const relationshipResponses = {};
    Object.entries(responses).forEach(([key, value]) => {
      if (key.startsWith('rel-')) {
        relationshipResponses[key] = value;
      }
    });
    
    // Don't await this to avoid blocking completion
    AllieAIEngineService.processRelationshipFeedback(
      familyId,
      weekNum,
      memberId,
      relationshipResponses
    ).catch(err => console.error("Error processing relationship feedback:", err));
    
    console.log("Sent relationship data to AI engine for learning");
  } catch (error) {
    console.error("Error handling relationship responses:", error);
    // Don't block completion if this fails
  }
}


          return {
            ...member,
            weeklyCompleted
          };
        }
        return member;
      });
      
      setFamilyMembers(updatedMembers);
      
      // Update Firebase
      await DatabaseService.updateMemberSurveyCompletion(familyId, memberId, `weekly-${weekNum}`, true);
      await DatabaseService.saveSurveyResponses(familyId, memberId, `weekly-${weekNum}`, responses);
      await DatabaseService.saveFamilyData({ familyMembers: updatedMembers }, familyId);
      
      // Update selected user if that's the one completing the check-in
      if (selectedUser && selectedUser.id === memberId) {
        const weeklyCompleted = [...(selectedUser.weeklyCompleted || [])];
        
        while (weeklyCompleted.length < weekNum) {
          weeklyCompleted.push({
            completed: false,
            date: null
          });
        }
        
        weeklyCompleted[weekNum - 1] = {
          completed: true,
          date: new Date().toISOString().split('T')[0]
        };
        
        setSelectedUser({
          ...selectedUser,
          weeklyCompleted
        });
      }
      
      // Check if all members have completed this week's check-in
      const allCompleted = updatedMembers.every(member => 
        member.weeklyCompleted && 
        member.weeklyCompleted[weekNum - 1] && 
        member.weeklyCompleted[weekNum - 1].completed
      );
      
      if (allCompleted) {
        // Update week status
        const updatedStatus = {
          ...weekStatus,
          [weekNum]: {
            ...weekStatus[weekNum],
            surveysCompleted: true,
            surveyCompletedDate: new Date().toISOString()
          }
        };
        
        setWeekStatus(updatedStatus);
        
        // Save to Firebase
        await DatabaseService.saveFamilyData({
          weekStatus: updatedStatus
        }, familyId);
      }
      
      return {
        success: true,
        allCompleted
      };
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };



  // Helper function to analyze survey responses and identify imbalances
  const analyzeImbalancesByCategory = (responses) => {
    // Get fullQuestionSet from the bridge
    const fullQuestionSet = surveyDataRef.current.fullQuestionSet || [];
    
    // Categories we track
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Count responses by category
    Object.entries(responses || {}).forEach(([key, value]) => {
      // Extract the question ID 
      let questionId = null;
      
      if (key.includes('q')) {
        questionId = key.includes('-') ? key.split('-').pop() : key;
        
        // Find the question in fullQuestionSet
        const question = fullQuestionSet.find(q => q.id === questionId);
        
        // If we have the question, add to the appropriate category
        if (question && question.category) {
          categories[question.category].total++;
          if (value === 'Mama') categories[question.category].mama++;
          else if (value === 'Papa') categories[question.category].papa++;
        } else {
          // Simple categorization based on question ID ranges if question not found
          // Questions 1-20 are Visible Household Tasks
          // Questions 21-40 are Invisible Household Tasks
          // Questions 41-60 are Visible Parental Tasks
          // Questions 61-80 are Invisible Parental Tasks
          
          const qNum = parseInt(questionId.replace('q', ''));
          
          let category = null;
          if (qNum >= 1 && qNum <= 20) {
            category = "Visible Household Tasks";
          } else if (qNum >= 21 && qNum <= 40) {
            category = "Invisible Household Tasks";
          } else if (qNum >= 41 && qNum <= 60) {
            category = "Visible Parental Tasks";
          } else if (qNum >= 61 && qNum <= 80) {
            category = "Invisible Parental Tasks";
          }
          
          // Update counts if we found a valid category
          if (category) {
            categories[category].total++;
            if (value === 'Mama') categories[category].mama++;
            else if (value === 'Papa') categories[category].papa++;
          }
        }
      }
    });
    
    // Calculate imbalance scores and percentages
    const imbalances = [];
    
    Object.entries(categories).forEach(([category, counts]) => {
      if (counts.total > 0) {
        const mamaPercent = Math.round((counts.mama / counts.total) * 100);
        const papaPercent = Math.round((counts.papa / counts.total) * 100);
        const imbalanceScore = Math.abs(mamaPercent - papaPercent);
        
        imbalances.push({
          category,
          mamaPercent,
          papaPercent,
          imbalanceScore,
          // Determine who should take on more in this category
          assignTo: mamaPercent > papaPercent ? "Papa" : "Mama"
        });
      }
    });
    
    // If we don't have enough data, provide some default imbalances
    if (imbalances.length === 0 || imbalances.every(i => i.imbalanceScore === 0)) {
      return [
        { 
          category: "Invisible Household Tasks", 
          mamaPercent: 75, 
          papaPercent: 25, 
          imbalanceScore: 50, 
          assignTo: "Papa" 
        },
        { 
          category: "Invisible Parental Tasks", 
          mamaPercent: 70, 
          papaPercent: 30, 
          imbalanceScore: 40, 
          assignTo: "Papa" 
        },
        { 
          category: "Visible Household Tasks", 
          mamaPercent: 60, 
          papaPercent: 40, 
          imbalanceScore: 20, 
          assignTo: "Papa" 
        },
        { 
          category: "Visible Parental Tasks", 
          mamaPercent: 55, 
          papaPercent: 45, 
          imbalanceScore: 10, 
          assignTo: "Papa" 
        }
      ];
    }
    
    // Sort by imbalance score (highest first)
    return imbalances.sort((a, b) => b.imbalanceScore - a.imbalanceScore);
  };

  // NEW: Analyze task effectiveness
  const analyzeTaskEffectiveness = (completedTasks, weekHistoryData) => {
    console.log("Analyzing task effectiveness based on historical data");
    
    // Group tasks by type/focus area
    const tasksByType = {};
    completedTasks.forEach(task => {
      const type = task.focusArea || task.taskType || task.category || 'other';
      if (!tasksByType[type]) tasksByType[type] = [];
      tasksByType[type].push(task);
    });
    
    // For each type, check if balance improved in the following week
    const effectiveness = [];
    Object.entries(tasksByType).forEach(([type, tasks]) => {
      // Find the weeks these tasks were completed in
      const weekNumbers = [...new Set(tasks.map(t => {
        // Extract week number from task ID or other properties
        const match = t.id?.toString().match(/^(\d+)-/);
        return match ? parseInt(match[1]) : null;
      }))].filter(Boolean);
      
      // Check balance before and after
      const improvementCount = weekNumbers.filter(weekNum => {
        const beforeWeekData = weekHistoryData[`week${weekNum}`];
        const afterWeekData = weekHistoryData[`week${weekNum+1}`];
        
        if (!beforeWeekData || !afterWeekData) return false;
        
        // Calculate if balance improved - extract the balance data
        const beforeBalance = { 
          mama: 0, 
          papa: 0 
        };
        
        // Try to extract mama percentage from different possible data structures
        if (beforeWeekData.balance?.mama) {
          beforeBalance.mama = beforeWeekData.balance.mama;
        } else if (beforeWeekData.surveyResponses) {
          // Count responses where value is "Mama"
          let mamaCount = 0;
          let totalCount = 0;
          
          Object.values(beforeWeekData.surveyResponses).forEach(value => {
            if (value === "Mama" || value === "Papa") {
              totalCount++;
              if (value === "Mama") mamaCount++;
            }
          });
          
          if (totalCount > 0) {
            beforeBalance.mama = (mamaCount / totalCount) * 100;
          }
        }
        
        beforeBalance.papa = 100 - beforeBalance.mama;
        
        // Same for after week
        const afterBalance = { 
          mama: 0, 
          papa: 0 
        };
        
        if (afterWeekData.balance?.mama) {
          afterBalance.mama = afterWeekData.balance.mama;
        } else if (afterWeekData.surveyResponses) {
          // Count responses where value is "Mama"
          let mamaCount = 0;
          let totalCount = 0;
          
          Object.values(afterWeekData.surveyResponses).forEach(value => {
            if (value === "Mama" || value === "Papa") {
              totalCount++;
              if (value === "Mama") mamaCount++;
            }
          });
          
          if (totalCount > 0) {
            afterBalance.mama = (mamaCount / totalCount) * 100;
          }
        }
        
        afterBalance.papa = 100 - afterBalance.mama;
        
        // Measure distance from perfect balance (50/50)
        const beforeImbalance = Math.abs(beforeBalance.mama - 50);
        const afterImbalance = Math.abs(afterBalance.mama - 50);
        
        // Return true if balance got better (imbalance decreased)
        return afterImbalance < beforeImbalance;
      }).length;
      
      // Calculate effectiveness ratio
      const effectivenessScore = weekNumbers.length > 0 
        ? improvementCount / weekNumbers.length 
        : 0.5; // Default if no data
      
      effectiveness.push({
        taskType: type,
        effectiveness: effectivenessScore,
        sampleSize: weekNumbers.length,
        tasksCompleted: tasks.length
      });
    });
    
    return effectiveness;
  };

  // NEW: Analyze task impact
  const analyzeTaskImpact = (currentWeekData, previousWeekData) => {
    console.log("Analyzing task impact between weeks");
    
    const impactInsights = [];
    
    if (!currentWeekData || !previousWeekData) {
      return impactInsights; // Return empty array if data is missing
    }
    
    // Helper to extract balance data from week data
    const extractBalance = (weekData, category) => {
      // First try category-specific balance
      if (weekData.categoryBalance && weekData.categoryBalance[category]) {
        return weekData.categoryBalance[category];
      }
      
      // If that's not available, extract from survey responses
      if (weekData.surveyResponses) {
        const categoryResponses = Object.entries(weekData.surveyResponses)
          .filter(([key, _]) => key.includes(category) || 
                              (key.includes('q') && 
                              (category === "Visible Household Tasks" && key.match(/q([1-9]|1[0-9]|20)/)) ||
                              (category === "Invisible Household Tasks" && key.match(/q(2[1-9]|3[0-9]|40)/)) ||
                              (category === "Visible Parental Tasks" && key.match(/q(4[1-9]|5[0-9]|60)/)) ||
                              (category === "Invisible Parental Tasks" && key.match(/q(6[1-9]|7[0-9]|80)/))
                              ));
        
        const mamaCount = categoryResponses.filter(([_, value]) => value === "Mama").length;
        const totalCount = categoryResponses.length;
        
        if (totalCount > 0) {
          return {
            mamaPercent: (mamaCount / totalCount) * 100,
            papaPercent: 100 - (mamaCount / totalCount) * 100
          };
        }
      }
      
      // If we can't determine from the data, return a balanced default
      return { mamaPercent: 50, papaPercent: 50 };
    };
    
    // Compare data between weeks for each category
    const categories = [
      "Visible Household Tasks",
      "Invisible Household Tasks",
      "Visible Parental Tasks",
      "Invisible Parental Tasks"
    ];
    
    categories.forEach(category => {
      const previousBalance = extractBalance(previousWeekData, category);
      const currentBalance = extractBalance(currentWeekData, category);
      
      // Calculate improvement (how much closer to 50/50 balance we got)
      const previousImbalance = Math.abs(previousBalance.mamaPercent - 50);
      const currentImbalance = Math.abs(currentBalance.mamaPercent - 50);
      const improvement = previousImbalance - currentImbalance;
      
      // Find tasks related to this category
      const relatedTasks = (currentWeekData.tasks || []).filter(task => 
        task.category === category || 
        task.hiddenWorkloadType === category || 
        task.focusArea === category);
      
      const completedTasks = relatedTasks.filter(task => task.completed);
      
      if (improvement > 3 && completedTasks.length > 0) {
        // Significant improvement with completed tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          effectiveTasks: completedTasks.map(t => t.title || t.description),
          message: `Your work on ${completedTasks.length} tasks has improved balance in ${category} by ${improvement.toFixed(1)}%!`,
          type: 'success'
        });
      } 
      else if (improvement <= 0 && completedTasks.length > 0) {
        // No improvement despite completed tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          ineffectiveTasks: completedTasks.map(t => t.title || t.description),
          message: `Despite completing tasks in ${category}, we haven't seen improvement yet. Let's try a different approach next week.`,
          type: 'warning'
        });
      }
      else if (improvement > 0 && completedTasks.length === 0) {
        // Improvement without specific tasks
        impactInsights.push({
          category,
          improvement: improvement.toFixed(1),
          message: `${category} balance improved by ${improvement.toFixed(1)}% even without specific tasks!`,
          type: 'info'
        });
      }
    });
    
    return impactInsights;
  };

  // Helper function to determine priority areas based on imbalances and previous focus
  const determinePriorityAreas = (imbalances, previousFocusAreas) => {
    // First, break down into specific task areas for each category
    const taskAreas = [];
    
    imbalances.forEach(imbalance => {
      if (imbalance.category === "Visible Household Tasks") {
        taskAreas.push(
          { 
            ...imbalance, 
            focusArea: "Meal Planning",
            description: "Take charge of planning family meals for the week",
            insight: `Survey data shows ${imbalance.assignTo === "Papa" ? "Mama is handling" : "Papa is handling"} ${imbalance.assignTo === "Papa" ? imbalance.mamaPercent : imbalance.papaPercent}% of meal planning tasks.`
          },
          { 
            ...imbalance, 
            focusArea: "Cleaning Coordination",
            description: "Manage household cleaning responsibilities",
            insight: `Your family's data indicates an imbalance in household maintenance tasks.`
          },
          { 
            ...imbalance, 
            focusArea: "Home Maintenance",
            description: "Handle household repairs and upkeep",
            insight: `Survey results show that visible household tasks like repairs need better balance.`
          }
        );
      }
      else if (imbalance.category === "Invisible Household Tasks") {
        taskAreas.push(
          { 
            ...imbalance, 
            focusArea: "Family Calendar",
            description: "Manage the family's schedule and appointments",
            insight: `Data shows ${imbalance.assignTo === "Papa" ? "Mama is handling" : "Papa is handling"} ${imbalance.assignTo === "Papa" ? imbalance.mamaPercent : imbalance.papaPercent}% of calendar management.`
          },
          { 
            ...imbalance, 
            focusArea: "Financial Planning",
            description: "Take the lead on family budget and financial decisions",
            insight: `Your surveys indicate an imbalance in who handles financial planning.`
          },
          { 
            ...imbalance, 
            focusArea: "Household Supplies",
            description: "Monitor and restock household necessities",
            insight: `Data indicates one parent is handling most of the invisible household management.`
          }
        );
      }
      else if (imbalance.category === "Visible Parental Tasks") {
        taskAreas.push(
          { 
            ...imbalance, 
            focusArea: "Homework Support",
            description: "Take a more active role in children's schoolwork",
            insight: `Survey results show a ${imbalance.imbalanceScore}% imbalance in who helps with children's educational needs.`
          },
          { 
            ...imbalance, 
            focusArea: "Morning Routines",
            description: "Help children prepare for school in the mornings",
            insight: `Data indicates morning routines are managed predominantly by one parent.`
          },
          { 
            ...imbalance, 
            focusArea: "Bedtime Routines",
            description: "Take the lead on nighttime rituals and sleep schedules",
            insight: `Surveys show an imbalance in who manages children's bedtime routines.`
          }
        );
      }
      else if (imbalance.category === "Invisible Parental Tasks") {
        taskAreas.push(
          { 
            ...imbalance, 
            focusArea: "Emotional Support",
            description: "Provide more emotional guidance for the children",
            insight: `Family data shows ${imbalance.assignTo === "Papa" ? "Mama is handling" : "Papa is handling"} ${imbalance.assignTo === "Papa" ? imbalance.mamaPercent : imbalance.papaPercent}% of emotional support tasks.`
          },
          { 
            ...imbalance, 
            focusArea: "School Communication",
            description: "Manage interactions with teachers and school staff",
            insight: `Survey results indicate an imbalance in communication with schools.`
          },
          { 
            ...imbalance, 
            focusArea: "Social Planning",
            description: "Arrange playdates and social activities",
            insight: `Data shows social planning is primarily handled by one parent.`
          }
        );
      }
    });
    
    // Prioritization algorithm:
    // 1. Sort by imbalance score
    // 2. Boost areas not previously addressed
    // 3. Ensure both parents get assigned tasks
    
    // First, sort by imbalance score
    taskAreas.sort((a, b) => b.imbalanceScore - a.imbalanceScore);
    
    // Boost score for areas not recently addressed
    taskAreas.forEach(area => {
      // If this focus area hasn't been addressed in previous weeks, increase its priority
      if (!previousFocusAreas.includes(area.focusArea)) {
        area.priorityBoost = 20;
      } else {
        area.priorityBoost = 0;
      }
    });
    
    // Create final priority list based on imbalance + priority boost
    return taskAreas
      .sort((a, b) => (b.imbalanceScore + (b.priorityBoost || 0)) - (a.imbalanceScore + (a.priorityBoost || 0)))
      // Make sure we have tasks for both parents
      .filter((area, index, self) => {
        // Keep this area if:
        // 1. It's one of the first 4 highest priority areas, OR
        // 2. We need more tasks for this parent (ensure at least 2 for each)
        const papaTasks = self.filter(a => a.assignTo === "Papa" && self.indexOf(a) < index);
        const mamaTasks = self.filter(a => a.assignTo === "Mama" && self.indexOf(a) < index);
        
        return (
          index < 4 || 
          (area.assignTo === "Papa" && papaTasks.length < 2) || 
          (area.assignTo === "Mama" && mamaTasks.length < 2)
        );
      });
  };

  // Generate a normal task for a specific focus area
  const generateTaskForArea = (taskId, assignedTo, areaData, weekNumber) => {
    // Create subtasks specific to this focus area
    const subTasks = [];
    
    if (areaData.focusArea === "Meal Planning") {
      subTasks.push(
        { title: "Create weekly menu", description: "Plan meals for each day of the week" },
        { title: "Make shopping list", description: "List all ingredients needed for the menu" },
        { title: "Coordinate with family", description: "Get input on meal preferences" }
      );
    } 
    else if (areaData.focusArea === "Family Calendar") {
      subTasks.push(
        { title: "Review upcoming events", description: "Look at the family's schedule for the next two weeks" },
        { title: "Update shared calendar", description: "Make sure all events are properly recorded" },
        { title: "Communicate schedule", description: "Make sure everyone knows what's happening" }
      );
    }
    else if (areaData.focusArea === "Emotional Support") {
      subTasks.push(
        { title: "Have one-on-one talks", description: "Check in with each child individually" },
        { title: "Notice emotional needs", description: "Pay attention to cues that children need support" },
        { title: "Validate feelings", description: "Acknowledge emotions without dismissing them" }
      );
    }
    else if (areaData.focusArea === "Homework Support") {
      subTasks.push(
        { title: "Create study space", description: "Set up a quiet area for homework" },
        { title: "Review assignments", description: "Know what homework is due and when" },
        { title: "Provide assistance", description: "Be available to help with questions" }
      );
    }
    else if (areaData.focusArea === "School Communication") {
      subTasks.push(
        { title: "Check school messages", description: "Review emails and notices from school" },
        { title: "Respond to teachers", description: "Reply to any communications from staff" },
        { title: "Share info with family", description: "Keep everyone informed about school news" }
      );
    }
    else {
      // Generic subtasks for any other focus area
      subTasks.push(
        { title: "Assess current situation", description: `Evaluate how ${areaData.focusArea} is currently handled` },
        { title: "Make an action plan", description: "Develop a strategy for taking more responsibility" },
        { title: "Implement changes", description: "Put your plan into action consistently" }
      );
    }
    
    // Map subtasks to the correct format with IDs
    const formattedSubTasks = subTasks.map((subTask, index) => ({
      id: `${taskId}-${index+1}`,
      title: subTask.title,
      description: subTask.description,
      completed: false,
      completedDate: null
    }));
    
    // Create the task with AI-driven insight
    // Get the actual parent name from family members
const getParentName = (role) => {
  const parent = familyMembers.find(m => m.role === 'parent' && m.roleType === role);
  return parent ? parent.name : role; // Fall back to role if name not found
};

return {
  id: taskId,
  title: `${weekNumber > 1 ? `Week ${weekNumber}: ` : ""}${areaData.focusArea}`,
  description: areaData.description,
  assignedTo: assignedTo,
  assignedToName: getParentName(assignedTo),
  focusArea: areaData.focusArea, 
  category: areaData.category,
  completed: false,
  completedDate: null,
  comments: [],
  aiInsight: areaData.insight,
  subTasks: formattedSubTasks
};
  };

  // Generate special AI insight task
  const generateAIInsightTask = (taskId, assignedTo, taskPriorityAreas, weekNumber) => {
    // Find relevant insights for this parent
    const parentAreas = taskPriorityAreas.filter(area => area.assignTo === assignedTo);
    const otherParent = assignedTo === "Mama" ? "Papa" : "Mama";
    
    // Create insights based on the parent's highest priority areas
    let insight = `Our AI analysis shows that `;
    let title, description, taskType;
    
    if (parentAreas.length > 0) {
      const topArea = parentAreas[0];
      
      if (topArea.category.includes("Invisible")) {
        taskType = "invisible";
        insight += `there's a significant imbalance in ${topArea.category}. ${assignedTo} could take on more responsibility in this area to create better balance.`;
        title = `${assignedTo}'s Invisible Work Challenge`;
        description = `Address the imbalance in ${topArea.category.toLowerCase()} based on family survey data`;
      } else {
        taskType = "visible";
        insight += `${otherParent} is handling ${assignedTo === "Mama" ? topArea.papaPercent : topArea.mamaPercent}% of tasks in ${topArea.category}, creating an opportunity for more balanced sharing.`;
        title = `${assignedTo}'s Balance Challenge`;
        description = `Create better balance in ${topArea.category.toLowerCase()} with your partner`;
      }
    } else {
      // Fallback if no specific areas for this parent
      taskType = "general";
      insight += `maintaining open communication about workload is key to a balanced family life.`;
      title = `${assignedTo}'s Family Check-in`;
      description = `Have a conversation about how responsibilities are currently shared`;
    }
    
    // Create subtasks based on task type
    let subTasks = [];
    
    if (taskType === "invisible") {
      subTasks = [
        { title: "Identify invisible work", description: "Notice tasks that often go unrecognized or unappreciated" },
        { title: "Take initiative", description: "Proactively handle a task that's usually done by your partner" },
        { title: "Create a system", description: "Develop a way to ensure this task remains balanced" }
      ];
    } else if (taskType === "visible") {
      subTasks = [
        { title: "Observe current patterns", description: "Notice how visible tasks are currently divided" },
        { title: "Schedule shared work", description: "Plan time to work alongside your partner on tasks" },
        { title: "Trade responsibilities", description: "Switch who does which tasks occasionally" }
      ];
    } else {
      subTasks = [
        { title: "Schedule a discussion", description: "Set aside time to talk about family balance" },
        { title: "Express appreciation", description: "Acknowledge the work your partner does" },
        { title: "Plan adjustments", description: "Identify ways to improve balance going forward" }
      ];
    }
    
    // Format subtasks with IDs
    const formattedSubTasks = subTasks.map((subTask, index) => ({
      id: `${taskId}-${index+1}`,
      title: subTask.title,
      description: subTask.description,
      completed: false,
      completedDate: null
    }));
    
    // Create the AI insight task
    return {
      id: taskId,
      title: `Week ${weekNumber}: ${title}`,
      description: description,
      assignedTo: assignedTo,
      assignedToName: assignedTo,
      isAIGenerated: true,
      hiddenWorkloadType: parentAreas.length > 0 ? parentAreas[0].category : "Family Balance",
      completed: false,
      completedDate: null,
      comments: [],
      insight: insight,
      subTasks: formattedSubTasks,
      taskType: "ai" // Add this to explicitly mark as AI-generated task
    };
  };

  // Complete a week (after family meeting)
  const completeWeek = async (weekNumber) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      console.log(`Starting completion process for week ${weekNumber}`);
      
      // Create a backup of the current tasks
      const currentTasks = [...taskRecommendations];
      console.log("Current tasks for backup:", currentTasks.length);
      
      // 1. Get meeting notes if available
      let meetingNotes = {};
      try {
        meetingNotes = await DatabaseService.getFamilyMeetingNotes(familyId, weekNumber) || {};
        console.log("Meeting notes retrieved");
      } catch (notesError) {
        console.warn("Could not retrieve meeting notes, using empty object instead:", notesError);
      }
      
      // Extract balance data for the week
      const extractWeekBalance = () => {
        const weekResponses = Object.entries(surveyResponses)
          .filter(([key, _]) => key.includes(`week-${weekNumber}`) || 
                                key.includes(`weekly-${weekNumber}`) || 
                                (weekNumber === 1 && (key.includes('weekly') || key.includes('week1'))));
        
        let mamaCount = 0;
        let totalCount = 0;
        
        weekResponses.forEach(([_, value]) => {
          if (value === "Mama" || value === "Papa") {
            totalCount++;
            if (value === "Mama") mamaCount++;
          }
        });
        
        const mamaPercent = totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
        return {
          mama: mamaPercent,
          papa: 100 - mamaPercent
        };
      };
      
      // Calculate category-specific balance data
      const calculateCategoryBalance = () => {
        const categories = [
          "Visible Household Tasks",
          "Invisible Household Tasks",
          "Visible Parental Tasks",
          "Invisible Parental Tasks"
        ];
        
        const categoryBalance = {};
        
        categories.forEach(category => {
          // Filter responses for this category
          const categoryResponses = Object.entries(surveyResponses)
            .filter(([key, _]) => {
              // Include responses for this week that match this category
              if (key.includes(`week-${weekNumber}`) || 
                  (weekNumber === 1 && (key.includes('weekly') || key.includes('week1')))) {
                // Check if it's in this category
                const questionId = key.split('-').pop();
                
                // Try to find the question in fullQuestionSet from the bridge
                const fullQuestionSet = surveyDataRef.current.fullQuestionSet || [];
                const question = fullQuestionSet.find(q => q.id === questionId);
                
                return question && question.category === category;
              }
              return false;
            });
          
          let mamaCount = 0;
          let totalCount = 0;
          
          categoryResponses.forEach(([_, value]) => {
            if (value === "Mama" || value === "Papa") {
              totalCount++;
              if (value === "Mama") mamaCount++;
            }
          });
          
          const mamaPercent = totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
          categoryBalance[category] = {
            mamaPercent,
            papaPercent: 100 - mamaPercent
          };
        });
        
        return categoryBalance;
      };
    
      const weekData = {
        weekNumber,
        familyMembers: familyMembers.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          completedDate: m.weeklyCompleted?.[weekNumber-1]?.date
        })),
        meetingNotes: meetingNotes,
        tasks: currentTasks,
        completionDate: new Date().toISOString(),
        balance: extractWeekBalance(),
        categoryBalance: calculateCategoryBalance(),
        surveyResponses: {}
      };

      // Collect ALL survey responses for this week
      console.log(`Collecting survey responses for Week ${weekNumber}`);
      console.log("Available responses:", Object.keys(surveyResponses).length);

      // First, add all general survey responses (without week prefix)
      Object.keys(surveyResponses).forEach(key => {
        // Include all question responses (both with and without week prefix)
        if (key.startsWith('q') || key.includes(`q`)) {
          weekData.surveyResponses[key] = surveyResponses[key];
        }
      });

      // Then add specific week-prefixed responses
      Object.keys(surveyResponses).forEach(key => {
        if (key.includes(`week-${weekNumber}`) || 
            key.includes(`weekly-${weekNumber}`) || 
            (key.includes(`week${weekNumber}`) || 
            (weekNumber === 1 && (key.includes('weekly') || key.includes('week1'))))) {
          weekData.surveyResponses[key] = surveyResponses[key];
        }
      });

      console.log(`Collected ${Object.keys(weekData.surveyResponses).length} responses for Week ${weekNumber}`);
      
      console.log("Week data prepared:", weekData);
      
      // NEW: Generate task impact insights by comparing with previous week
      let previousWeekData = null;
      if (weekNumber > 1) {
        previousWeekData = weekHistory[`week${weekNumber-1}`];
      } else {
        previousWeekData = weekHistory.initial;
      }
      
      const newImpactInsights = analyzeTaskImpact(weekData, previousWeekData);
      console.log("Generated impact insights:", newImpactInsights);
      
      // Update impact insights state
      const updatedImpactInsights = [...impactInsights, ...newImpactInsights];
      setImpactInsights(updatedImpactInsights);
      
      // Calculate task effectiveness from historical data
      const effectivenessData = analyzeTaskEffectiveness(
        currentTasks.filter(t => t.completed), 
        weekHistory
      );
      console.log("Task effectiveness analysis:", effectivenessData);
      
      // Update task effectiveness state
      const updatedEffectivenessData = [...taskEffectivenessData, ...effectivenessData];
      setTaskEffectivenessData(updatedEffectivenessData);
      
      // 3. Update week history
      const updatedHistory = {
        ...weekHistory,
        [`week${weekNumber}`]: weekData
      };
      
      // 4. Update week status
      const updatedStatus = {
        ...weekStatus,
        [weekNumber]: {
          ...weekStatus[weekNumber],
          completed: true,
          completionDate: new Date().toISOString()
        }
      };
      
      // 5. Update completed weeks (if not already included)
      let updatedCompletedWeeks = [...completedWeeks];
      if (!updatedCompletedWeeks.includes(weekNumber)) {
        updatedCompletedWeeks.push(weekNumber);
      }
      
      // 6. Update last completed full week
      const newLastCompletedWeek = Math.max(lastCompletedFullWeek, weekNumber);
      
      // 7. Calculate the next week number
      const nextWeek = weekNumber + 1;

      const nextWeekDueDate = new Date();
      nextWeekDueDate.setDate(nextWeekDueDate.getDate() + 7);

      // Update survey schedule with the new date for the next week
      const updatedSurveySchedule = {
        ...surveySchedule,
        [nextWeek]: nextWeekDueDate.toISOString()
      };
      
      // 8. Generate new tasks for the next week - ENHANCED WITH EFFECTIVENESS DATA
      const newTasks = generateNewWeekTasks(
        nextWeek, 
        currentTasks, 
        weekData.surveyResponses, 
        updatedEffectivenessData
      );

      console.log("Saving updates to Firebase...", {
        completedWeeks: updatedCompletedWeeks,
        currentWeek: nextWeek,
        lastCompletedFullWeek: newLastCompletedWeek,
        tasks: newTasks
      });

      // Reset weekly completion status for the new week
      const updatedMembers = familyMembers.map(member => {
        // Ensure the weeklyCompleted array exists and has an entry for the next week
        let weeklyCompleted = [...(member.weeklyCompleted || [])];
        
        // Add entries for any missing weeks including the new one
        while (weeklyCompleted.length < nextWeek) {
          weeklyCompleted.push({
            completed: false,
            date: null
          });
        }
        
        return {
          ...member,
          weeklyCompleted
        };
      });

      // 9. Save everything to Firebase
      await DatabaseService.saveFamilyData({
        weekHistory: updatedHistory,
        weekStatus: updatedStatus,
        lastCompletedFullWeek: newLastCompletedWeek,
        currentWeek: nextWeek,
        completedWeeks: updatedCompletedWeeks,
        familyMembers: updatedMembers, 
        tasks: newTasks,
        surveySchedule: updatedSurveySchedule,
        taskEffectiveness: updatedEffectivenessData,
        impactInsights: updatedImpactInsights,
        updatedAt: new Date().toISOString()
      }, familyId);

      // 10. Update all state variables
      setWeekHistory(updatedHistory);
      setWeekStatus(updatedStatus);
      setLastCompletedFullWeek(newLastCompletedWeek);
      setCurrentWeek(nextWeek);
      setCompletedWeeks(updatedCompletedWeeks);
      setFamilyMembers(updatedMembers);
      setTaskRecommendations(newTasks);
      setSurveySchedule(updatedSurveySchedule);
      
      console.log(`Week ${weekNumber} completed successfully, moving to week ${nextWeek}`);
      
      return true;
    } catch (error) {
      console.error("Error completing week:", error);
      setError(error.message);
      throw error;
    }
  };

  // ENHANCED: Helper function to generate new tasks for the next week with effectiveness data
  const generateNewWeekTasks = (weekNumber, previousTasks, previousResponses, effectivenessData = []) => {
    console.log(`Generating AI-driven tasks for Week ${weekNumber} based on family data and effectiveness`);
    
    // Calculate weighted imbalances using the TaskWeightCalculator
    // Now uses the bridged data from surveyDataRef
    const scores = calculateBalanceScores(
      surveyDataRef.current.fullQuestionSet || [], 
      previousResponses, 
      surveyDataRef.current.familyPriorities || familyPriorities
    );
    console.log("Weighted balance scores:", scores);
    
    // Update weightedScores state with the calculated scores
    setWeightedScores(scores);
    
    // Find the most imbalanced categories based on weighted scores
    const imbalancedCategories = Object.entries(scores.categoryBalance || {})
      .map(([category, scores]) => ({
        category,
        imbalance: scores.imbalance,
        assignTo: scores.mama > scores.papa ? "Papa" : "Mama"
      }))
      .sort((a, b) => b.imbalance - a.imbalance);
    
    console.log("Imbalanced categories by weight:", imbalancedCategories);
    
    // First, analyze the survey responses to find imbalances and patterns
    const categoryImbalances = analyzeImbalancesByCategory(previousResponses);
    console.log("Category imbalances detected:", categoryImbalances);
    
    // Track which areas have been addressed in previous weeks
    const previousFocusAreas = previousTasks
      .filter(task => task.isAIGenerated)
      .map(task => task.focusArea);
    
    // Get most and least effective task types from effectiveness data
    const mostEffectiveTypes = effectivenessData
      .filter(t => t.effectiveness > 0.7)
      .map(t => t.taskType);
      
    const leastEffectiveTypes = effectivenessData
      .filter(t => t.effectiveness < 0.3)
      .map(t => t.taskType);
    
    console.log("Most effective task types:", mostEffectiveTypes);
    console.log("Least effective task types:", leastEffectiveTypes);
    
    // Get meeting notes from previous week to incorporate action items and goals
    const prevWeekNum = weekNumber - 1;
    let meetingActionItems = [];
    let meetingGoals = [];
    
    // Attempt to get meeting notes for the previous week
    try {
      const meetingNotes = weekHistory[`week${prevWeekNum}`]?.meetingNotes || {};
      
      // Extract action items and goals
      if (meetingNotes.actionItems) {
        meetingActionItems = meetingNotes.actionItems
          .split('\n')
          .filter(item => item.trim().length > 0);
      }
      
      if (meetingNotes.nextWeekGoals) {
        meetingGoals = meetingNotes.nextWeekGoals
          .split('\n')
          .filter(goal => goal.trim().length > 0);
      }
      
      console.log("Extracted meeting action items:", meetingActionItems);
      console.log("Extracted meeting goals:", meetingGoals);
    } catch (error) {
      console.error("Error getting meeting notes:", error);
    }
    
    // Use these weighted imbalances to determine priority areas
    const taskPriorityAreas = determinePriorityAreas(imbalancedCategories, previousFocusAreas);

    // Apply effectiveness insights to priority areas
    taskPriorityAreas.forEach(area => {
      // Check if this area has proven effective in the past
      if (mostEffectiveTypes.includes(area.focusArea) || 
          mostEffectiveTypes.includes(area.category)) {
        area.priorityBoost += 15;
        console.log(`Boosting priority for ${area.focusArea} - proven effective`);
      }
      
      // Check if this area has proven ineffective in the past
      if (leastEffectiveTypes.includes(area.focusArea) || 
          leastEffectiveTypes.includes(area.category)) {
        area.priorityBoost -= 10;
        console.log(`Reducing priority for ${area.focusArea} - proven ineffective`);
      }
    });
    
    console.log("Priority areas for this week (after effectiveness adjustment):", taskPriorityAreas);
    
    // Generate tasks based on the family's specific needs
    const tasks = [];
    
    // 1. Convert meeting action items to tasks
    meetingActionItems.forEach((item, index) => {
      // Determine who should be assigned the task
      // Simple heuristic: assign to Papa if contains "Papa", Mama if contains "Mama", alternate otherwise
      const itemLower = item.toLowerCase();
const assignTo = itemLower.includes("papa") ? "Papa" : 
                itemLower.includes("mama") ? "Mama" : 
                index % 2 === 0 ? "Papa" : "Mama";
      
      tasks.push({
        id: `${weekNumber}-meeting-${index + 1}`,
        title: `Week ${weekNumber}: Meeting Action Item`,
        description: item,
        assignedTo: assignTo,
        assignedToName: assignTo,
        taskType: "meeting",
        focusArea: "Family Meeting Decision",
        completed: false,
        completedDate: null,
        comments: [],
        subTasks: [
          {
            id: `${weekNumber}-meeting-${index + 1}-1`,
            title: "Make a plan",
            description: "Plan how to accomplish this action item",
            completed: false,
            completedDate: null
          },
          {
            id: `${weekNumber}-meeting-${index + 1}-2`,
            title: "Execute the plan",
            description: "Carry out the action item as discussed",
            completed: false,
            completedDate: null
          },
          {
            id: `${weekNumber}-meeting-${index + 1}-3`,
            title: "Report back to family",
            description: "Share your progress with the family",
            completed: false,
            completedDate: null
          }
        ]
      });
    });
    
    // Only add AI and survey tasks if we need more to reach 4 total tasks
    const tasksNeeded = Math.max(0, 4 - tasks.length);
    
    if (tasksNeeded > 0) {
      // 2. Survey-based task for Papa (from highest priority area)
      const papaFocusAreas = taskPriorityAreas.filter(area => area.assignTo === "Papa");
      if (papaFocusAreas.length > 0) {
        const surveyTask = generateTaskForArea(`${weekNumber}-1`, "Papa", papaFocusAreas[0], weekNumber);
        surveyTask.taskType = "survey-based";
        surveyTask.description = `${surveyTask.description} (Based on your family's survey data)`;
        tasks.push(surveyTask);
      }
      
      // 3. AI-based task for Papa
      if (tasksNeeded > 1) {
        const papaInsightTask = generateAIInsightTask(`${weekNumber}-ai-1`, "Papa", taskPriorityAreas, weekNumber);
        tasks.push(papaInsightTask);
      }
      
      // 4. Survey-based task for Mama (from highest priority area)
      if (tasksNeeded > 2) {
        const mamaFocusAreas = taskPriorityAreas.filter(area => area.assignTo === "Mama");
        if (mamaFocusAreas.length > 0) {
          const surveyTask = generateTaskForArea(`${weekNumber}-2`, "Mama", mamaFocusAreas[0], weekNumber);
          surveyTask.taskType = "survey-based";
          surveyTask.description = `${surveyTask.description} (Based on your family's survey data)`;
          tasks.push(surveyTask);
        }
      }
      
      // 5. AI-based task for Mama
      if (tasksNeeded > 3) {
        const mamaInsightTask = generateAIInsightTask(`${weekNumber}-ai-2`, "Mama", taskPriorityAreas, weekNumber);
        tasks.push(mamaInsightTask);
      }
    }
    
    // Set task priorities based on family goals
    if (meetingGoals.length > 0) {
      // Add a goal-tracking task if we have family goals
      tasks.push({
        id: `${weekNumber}-goal-1`,
        title: `Week ${weekNumber}: Family Goals`,
        description: `Track progress toward this week's family goals: ${meetingGoals.join('; ')}`,
        assignedTo: "Mama", // Alternate this between parents
        assignedToName: "Mama",
        taskType: "goal",
        focusArea: "Family Goals",
        completed: false,
        completedDate: null,
        comments: [],
        subTasks: meetingGoals.map((goal, index) => ({
          id: `${weekNumber}-goal-1-${index + 1}`,
          title: `Goal ${index + 1}`,
          description: goal,
          completed: false,
          completedDate: null
        }))
      });
    }
    
    return tasks;
  };

  // Add comment to task
  const addTaskComment = async (taskId, text) => {
    try {
      if (!familyId || !selectedUser) throw new Error("No family ID or user selected");
      
      const comment = await DatabaseService.addTaskComment(
        familyId,
        taskId,
        selectedUser.id,
        selectedUser.name,
        text
      );
      
      return comment;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update task completion
  const updateTaskCompletion = async (taskId, isCompleted) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      console.log(`Updating task ${taskId} completion to: ${isCompleted}`);
      
      const completedDate = isCompleted ? new Date().toISOString() : null;
      
      // Update the task in the database
      await DatabaseService.updateTaskCompletion(familyId, taskId, isCompleted, completedDate);
      
      // Also update local state so it persists between tab switches
      const updatedTasks = taskRecommendations.map(task => {
        if (task.id.toString() === taskId.toString()) {
          return {
            ...task,
            completed: isCompleted,
            completedDate: completedDate
          };
        }
        return task;
      });
      
      setTaskRecommendations(updatedTasks);
      
      // Save updated tasks to Firebase to ensure they persist
      await DatabaseService.saveFamilyData({
        tasks: updatedTasks,
        updatedAt: new Date().toISOString()
      }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update subtask completion
  const updateSubtaskCompletion = async (taskId, subtaskId, isCompleted) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const completedDate = isCompleted ? new Date().toISOString() : null;
      
      // Update subtask in database
      await DatabaseService.updateSubtaskCompletion(familyId, taskId, subtaskId, isCompleted, completedDate);
      
      // Create a deep copy of the task array to ensure state updates properly
      const updatedTasks = JSON.parse(JSON.stringify(taskRecommendations));
      
      // Find and update the specific task and subtask
      const taskIndex = updatedTasks.findIndex(t => t.id.toString() === taskId.toString());
      if (taskIndex !== -1) {
        const task = updatedTasks[taskIndex];
        const subtaskIndex = task.subTasks.findIndex(st => st.id === subtaskId);
        
        if (subtaskIndex !== -1) {
          // Update the subtask
          task.subTasks[subtaskIndex].completed = isCompleted;
          task.subTasks[subtaskIndex].completedDate = completedDate;
          
          // Check if all subtasks are completed
          const allComplete = task.subTasks.every(st => st.completed);
          
          // Update main task status
          task.completed = allComplete;
          task.completedDate = allComplete ? new Date().toISOString() : null;
        }
      }
      
      // Update state with the modified copy
      setTaskRecommendations(updatedTasks);
      
      // Save updated tasks to Firebase
      await DatabaseService.saveFamilyData({
        tasks: updatedTasks,
        updatedAt: new Date().toISOString()
      }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Save family meeting notes
  const saveFamilyMeetingNotes = async (weekNumber, notes) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      await DatabaseService.saveFamilyMeetingNotes(familyId, weekNumber, notes);
      
      // Update week status to show meeting notes are saved
      const updatedStatus = {
        ...weekStatus,
        [weekNumber]: {
          ...weekStatus[weekNumber],
          meetingNotesCompleted: true,
          meetingNotesDate: new Date().toISOString()
        }
      };
      
      setWeekStatus(updatedStatus);
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({
        weekStatus: updatedStatus
      }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Get individual's survey responses
  const getMemberSurveyResponses = async (memberId, surveyType) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const responses = await DatabaseService.loadMemberSurveyResponses(familyId, memberId, surveyType);
      return responses;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Load tasks for the current week
  const loadCurrentWeekTasks = async () => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      console.log(`Loading tasks for Week ${currentWeek} from Firebase...`);
      const tasks = await DatabaseService.getTasksForWeek(familyId, currentWeek);
      console.log(`Received ${tasks?.length || 0} tasks from Firebase:`, tasks);
      
      if (tasks && tasks.length > 0) {
        console.log("Updating task recommendations with fresh data");
        setTaskRecommendations(tasks);
      }
      return tasks;
    } catch (error) {
      console.error("Error loading current week tasks:", error);
      setError(error.message);
      return null;
    }
  };

  // Get historical data for a specific week
  const getWeekHistoryData = (weekNumber) => {
    if (weekNumber === 0) {
      return weekHistory.initial || null;
    } else {
      return weekHistory[`week${weekNumber}`] || null;
    }
  };

  // Get week status
  const getWeekStatus = (weekNumber) => {
    return weekStatus[weekNumber] || { 
      surveysCompleted: false,
      meetingNotesCompleted: false,
      completed: false
    };
  };

  // Save kid task data
  const saveKidTaskData = async (taskId, kidId, data) => {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Update local state
      const updatedKidTasksData = {
        ...kidTasksData,
        [taskId]: {
          ...data,
          updatedAt: new Date().toISOString()
        }
      };
      
      setKidTasksData(updatedKidTasksData);
      
      // Save to Firebase
      await DatabaseService.saveFamilyData({
        kidTasks: updatedKidTasksData
      }, familyId);
      
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Get task impact insights
  const getTaskImpactInsights = (category = null) => {
    if (!category) {
      return impactInsights;
    }
    return impactInsights.filter(insight => insight.category === category);
  };

  // Context value
  const value = {
    familyId,
    familyName,
    familyPicture,
    familyMembers,
    selectedUser,
    surveyResponses,
    completedWeeks,
    currentWeek,
    surveySchedule,
    weekHistory,
    weekStatus,
    lastCompletedFullWeek,
    taskRecommendations,
    taskEffectivenessData,
    impactInsights,
    kidTasksData,
    familyPriorities,
    weightedScores, // Added weightedScores to the context value
    loading,
    error,
    selectFamilyMember,
    updateMemberProfile,
    updateFamilyName,
    updateFamilyPicture,
    updateSurveySchedule,
    completeInitialSurvey,
    completeWeeklyCheckIn,
    saveSurveyProgress,
    addTaskComment,
    updateTaskCompletion,
    updateSubtaskCompletion,
    saveFamilyMeetingNotes,
    completeWeek,
    getMemberSurveyResponses,
    getWeekHistoryData,
    getWeekStatus,
    loadCurrentWeekTasks,
    resetFamilyState,
    saveKidTaskData,
    getTaskImpactInsights,
    analyzeTaskImpact,
    analyzeTaskEffectiveness,
    coupleCheckInData,
    saveCoupleCheckInData,
    getCoupleCheckInData,
    getRelationshipTrendData,
    relationshipStrategies,
    getRelationshipStrategies,
    updateRelationshipStrategy,
    setWeightedScores, // Added setWeightedScores to the context value
    setSurveyData // Add the bridge function to the context value
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

// Create the bridge component to connect SurveyContext to FamilyContext
export function SurveyBridge() {
  const { fullQuestionSet, familyPriorities } = useSurvey();
  const { setSurveyData } = useFamily();
  
  // Bridge the data whenever it changes
  useEffect(() => {
    setSurveyData({ 
      fullQuestionSet,
      familyPriorities
    });
  }, [fullQuestionSet, familyPriorities, setSurveyData]);
  
  return null; // This component doesn't render anything
}