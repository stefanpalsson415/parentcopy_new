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
            // Instead of throwing an error, return null
            return null;
          }
        } catch (error) {
          console.error("Error loading family by ID:", error);
          // Don't throw, just return null
          return null;
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
  }

  // Load all families for a user
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

  // Set selected family member
  async function setSelectedFamilyMember(memberId) {
    try {
      console.log("Explicitly setting selected family member:", memberId);
      
      if (!familyData || !familyData.familyMembers) {
        console.error("No family data available to select member");
        return false;
      }
      
      // Find the member in the family data
      const member = familyData.familyMembers.find(m => m.id === memberId);
      if (!member) {
        console.error("Member not found in family:", memberId);
        return false;
      }
      
      // Store the selection in localStorage
      localStorage.setItem('selectedUserId', memberId);
      console.log("Selected user ID stored:", memberId);
      
      // Return the member data
      return member;
    } catch (error) {
      console.error("Error setting selected family member:", error);
      return false;
    }
  }

  // NEW CODE
useEffect(() => {
  let isMounted = true;
  
  // First set loading to true
  setLoading(true);
  
  // Set a flag to track if auth state has been checked
  let authStateChecked = false;
  
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!isMounted) return;
    
    // Mark that auth state has been checked
    authStateChecked = true;
    
    console.log("Auth state changed:", user ? `User logged in: ${user.uid}` : "No user");
    setCurrentUser(user);
    
    if (user) {
      try {
        console.log("Loading family data for user:", user.uid);
        
        // Load all families first
        const families = await loadAllFamilies(user.uid);
        console.log(`Loaded ${families.length} families for user`);
        
        // Then load the primary family data
        if (families && families.length > 0) {
          await loadFamilyData(user.uid);
        }
      } catch (error) {
        console.error("Error loading family data on auth change:", error);
      }
    } else {
      // Clear family data on logout
      setFamilyData(null);
      setAvailableFamilies([]);
    }
    
    if (isMounted) {
      setLoading(false);
    }
  });

  // Add a timeout to prevent hanging indefinitely - increased to 30 seconds
  const timeout = setTimeout(() => {
    if (isMounted) {
      console.log("Auth loading timeout - forcing render");
      
      // If auth state hasn't been checked yet, this is a real timeout
      if (!authStateChecked) {
        console.warn("Auth state was never checked - possible Firebase issue");
      }
      
      setLoading(false);
    }
  }, 30000); // Increased to 30 seconds for slower connections
  
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
    ensureFamiliesLoaded,
    setSelectedFamilyMember,
    reload: () => loadFamilyData(currentUser?.uid)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}