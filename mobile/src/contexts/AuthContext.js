import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../services/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create context
const AuthContext = createContext();

// Context provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Authentication functions
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };
  
  const logout = () => {
    return signOut(auth);
  };
  
  // Save user to AsyncStorage
  const saveUserToStorage = async (user) => {
    try {
      if (user) {
        await AsyncStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }));
      } else {
        await AsyncStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('Error saving user to AsyncStorage:', error);
    }
  };
  
  // Effect to handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      saveUserToStorage(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  // Try to restore user from AsyncStorage on initial load
  useEffect(() => {
    const restoreUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('currentUser');
        if (userJson && !currentUser) {
          const userData = JSON.parse(userJson);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error restoring user from AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    };
    
    restoreUser();
  }, []);
  
  const value = {
    currentUser,
    login,
    logout,
    loading,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export function useAuth() {
  return useContext(AuthContext);
}