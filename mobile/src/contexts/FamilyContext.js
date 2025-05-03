import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../services/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Create context
const FamilyContext = createContext();

// Context provider component
export function FamilyProvider({ children }) {
  const { currentUser } = useAuth();
  
  // State
  const [familyId, setFamilyId] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [completedWeeks, setCompletedWeeks] = useState([]);
  const [weekHistory, setWeekHistory] = useState({});
  const [surveyResponses, setSurveyResponses] = useState({});
  const [taskRecommendations, setTaskRecommendations] = useState([]);
  
  // Effect to load family data when user changes
  useEffect(() => {
    if (currentUser) {
      loadUserFamilies();
    } else {
      resetFamilyData();
      setLoading(false);
    }
  }, [currentUser]);
  
  // Effect to load detailed family data when familyId changes
  useEffect(() => {
    if (familyId) {
      loadFamilyDetails();
      saveFamilyIdToStorage(familyId);
    }
  }, [familyId]);
  
  // Load user's families
  const loadUserFamilies = async () => {
    try {
      setLoading(true);
      
      // Try to get familyId from AsyncStorage first
      const storedFamilyId = await AsyncStorage.getItem('selectedFamilyId');
      
      if (storedFamilyId) {
        setFamilyId(storedFamilyId);
      } else {
        // Query for families where user is a member
        const familiesQuery = query(
          collection(db, 'families'),
          where('memberIds', 'array-contains', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(familiesQuery);
        
        if (!querySnapshot.empty) {
          // Use the first family found
          const firstFamily = querySnapshot.docs[0];
          setFamilyId(firstFamily.id);
        } else {
          console.log('No families found for user');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error loading user families:', error);
      setLoading(false);
    }
  };
  
  // Load detailed family data
  const loadFamilyDetails = async () => {
    try {
      setLoading(true);
      
      // Get family document
      const familyRef = doc(db, 'families', familyId);
      const familySnapshot = await getDoc(familyRef);
      
      if (familySnapshot.exists()) {
        const data = familySnapshot.data();
        setFamilyData(data);
        setFamilyMembers(data.familyMembers || []);
        setCurrentWeek(data.currentWeek || 1);
        setCompletedWeeks(data.completedWeeks || []);
        setWeekHistory(data.weekHistory || {});
        
        // Set current user's data
        const currentMember = data.familyMembers?.find(
          member => member.userId === currentUser.uid
        );
        setSelectedUser(currentMember);
        
        // Load additional data
        await loadSurveyResponses();
        await loadTaskRecommendations();
      } else {
        console.log('Family document not found');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading family details:', error);
      setLoading(false);
    }
  };
  
  // Load survey responses
  const loadSurveyResponses = async () => {
    try {
      const surveyQuery = query(
        collection(db, 'surveyResponses'),
        where('familyId', '==', familyId)
      );
      
      const querySnapshot = await getDocs(surveyQuery);
      
      let allResponses = {};
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.responses) {
          allResponses = { ...allResponses, ...data.responses };
        }
      });
      
      setSurveyResponses(allResponses);
    } catch (error) {
      console.error('Error loading survey responses:', error);
    }
  };
  
  // Load task recommendations
  const loadTaskRecommendations = async () => {
    try {
      const tasksRef = doc(db, 'tasks', familyId);
      const tasksSnapshot = await getDoc(tasksRef);
      
      if (tasksSnapshot.exists()) {
        const data = tasksSnapshot.data();
        setTaskRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading task recommendations:', error);
    }
  };
  
  // Reset family data (used on logout)
  const resetFamilyData = () => {
    setFamilyId(null);
    setFamilyData(null);
    setFamilyMembers([]);
    setSelectedUser(null);
    setCurrentWeek(1);
    setCompletedWeeks([]);
    setWeekHistory({});
    setSurveyResponses({});
    setTaskRecommendations([]);
  };
  
  // Save familyId to AsyncStorage
  const saveFamilyIdToStorage = async (id) => {
    try {
      await AsyncStorage.setItem('selectedFamilyId', id);
    } catch (error) {
      console.error('Error saving familyId to AsyncStorage:', error);
    }
  };
  
  // Provide context value
  const value = {
    familyId,
    familyData,
    familyMembers,
    selectedUser,
    currentWeek,
    completedWeeks,
    weekHistory,
    surveyResponses,
    taskRecommendations,
    loading,
    setFamilyId,
    loadFamilyDetails,
  };
  
  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

// Custom hook for using the family context
export function useFamily() {
  return useContext(FamilyContext);
}