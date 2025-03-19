// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '../services/firebase';
import DatabaseService from '../services/DatabaseService';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyData, setFamilyData] = useState(null);
  const [availableFamilies, setAvailableFamilies] = useState([]);

  // Sign up function
  async function signup(email, password) {
    return DatabaseService.createUser(email, password);
  }

  // Login function
  async function login(email, password) {
    return DatabaseService.signIn(email, password);
  }

// Added helper function to ensure families are loaded
async function ensureFamiliesLoaded(userId) {
  try {
    console.log("Ensuring families are loaded for user:", userId);
    
    // First load all families
    const families = await loadAllFamilies(userId);
    console.log("Found families:", families.length);
    
    // Then if there are families, load the primary family
    if (families && families.length > 0) {
      await loadFamilyData(userId);
    }
    
    return families;
  } catch (error) {
    console.error("Error ensuring families are loaded:", error);
    throw error;
  }
}



  
  // Logout function
  async function logout() {
    return DatabaseService.signOut();
  }

  // Create a new family
  async function createFamily(familyData) {
    return DatabaseService.createFamily(familyData);
  }

  // Load family data
  async function loadFamilyData(idParam) {
    try {
      console.log("Loading family data for:", idParam);
      let data;
      
      // Check if this is a direct family ID
      if (typeof idParam === 'string' && idParam.length > 0) {
        console.log("Attempting to load family directly");
        
        try {
          // Try to load the family directly from Firestore
          const docRef = doc(db, "families", idParam);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Load survey responses for this family
            const surveyResponsesQuery = query(
              collection(db, "surveyResponses"), 
              where("familyId", "==", idParam)
            );
            const surveyResponsesSnapshot = await getDocs(surveyResponsesQuery);
            
            // Process survey responses
            const surveyResponses = {};
            surveyResponsesSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.responses) {
                // Merge all responses together
                Object.assign(surveyResponses, data.responses);
              }
            });
            
            data = { 
              ...docSnap.data(), 
              familyId: idParam,
              surveyResponses: surveyResponses
            };
            console.log("Successfully loaded family directly:", data);
          } else {
            console.log("No family found with ID:", idParam);
            throw new Error("Family not found");
          }
        } catch (error) {
          console.error("Error loading family by ID:", error);
          throw error;
        }
      } else {
        // Assume it's a user ID
        data = await DatabaseService.loadFamilyByUserId(idParam);
        console.log("Loaded family by user ID:", data);
      }
      
      if (!data || !data.familyId) {
        console.error("Invalid family data:", data);
        throw new Error("Invalid family data");
      }
      
      console.log("Setting family data in state:", data.familyId);
      setFamilyData(data);
      
      // Important: Return the data for chaining
      return data;
    } catch (error) {
      console.error("Error loading family data:", error);
      throw error;
    }
  }  // Load all families for a user
  async function loadAllFamilies(userId) {
    try {
      console.log("Loading all families for user:", userId);
      const families = await DatabaseService.getAllFamiliesByUserId(userId);
      console.log("Found families:", families.length);
      setAvailableFamilies(families);
      return families;
    } catch (error) {
      console.error("Error loading all families:", error);
      throw error;
    }
  }

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      
      if (user) {
        try {
          // Load all families first
          await loadAllFamilies(user.uid);
          
          // Then load the primary family data
          await loadFamilyData(user.uid);
        } catch (error) {
          console.error("Error loading family data on auth change:", error);
        }
      } else {
        // Clear family data on logout
        setFamilyData(null);
        setAvailableFamilies([]);
      }
      
      setLoading(false);
    });
  
    // Add a timeout to prevent hanging indefinitely
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.log("Auth loading timeout - forcing render");
        setLoading(false);
      }
    }, 5000); // 5 seconds timeout
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Context value
  const value = {
    currentUser,
    familyData,
    availableFamilies,
    signup,
    login,
    logout,
    createFamily,
    loadFamilyData,
    loadAllFamilies,
    ensureFamiliesLoaded, // Add the new function here
    reload: () => loadFamilyData(currentUser?.uid)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}