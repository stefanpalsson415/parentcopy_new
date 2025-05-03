import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../services/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Create context
const EventContext = createContext();

// Context provider component
export function EventProvider({ children }) {
  const { currentUser } = useAuth();
  const { familyId } = useFamily();
  
  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load events when familyId changes
  useEffect(() => {
    if (familyId && currentUser) {
      refreshEvents();
    } else {
      // Reset events when not logged in or no family selected
      setEvents([]);
    }
  }, [familyId, currentUser]);
  
  // Refresh events
  const refreshEvents = async () => {
    if (!familyId || !currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Query for events for this family
      const eventsQuery = query(
        collection(db, 'events'),
        where('familyId', '==', familyId),
        orderBy('startDate', 'asc')
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      
      // Process events
      const eventsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure dates are in string format
        startDate: doc.data().startDate?.toDate?.().toISOString() || doc.data().startDate,
        endDate: doc.data().endDate?.toDate?.().toISOString() || doc.data().endDate,
      }));
      
      setEvents(eventsList);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new event
  const addEvent = async (eventData) => {
    if (!familyId || !currentUser) {
      throw new Error('User must be logged in and family selected');
    }
    
    try {
      // Prepare event data
      const event = {
        ...eventData,
        familyId,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'events'), event);
      
      // Add to local state
      const newEvent = {
        id: docRef.id,
        ...event,
        startDate: event.startDate?.toISOString?.() || event.startDate,
        endDate: event.endDate?.toISOString?.() || event.endDate,
      };
      
      setEvents(prevEvents => [...prevEvents, newEvent]);
      
      return { success: true, eventId: docRef.id };
    } catch (err) {
      console.error('Error adding event:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Update an existing event
  const updateEvent = async (eventId, eventData) => {
    if (!familyId || !currentUser) {
      throw new Error('User must be logged in and family selected');
    }
    
    try {
      // Prepare update data
      const updates = {
        ...eventData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      };
      
      // Update in Firestore
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, updates);
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                ...updates,
                startDate: updates.startDate?.toISOString?.() || updates.startDate,
                endDate: updates.endDate?.toISOString?.() || updates.endDate,
              } 
            : event
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Delete an event
  const deleteEvent = async (eventId) => {
    if (!familyId || !currentUser) {
      throw new Error('User must be logged in and family selected');
    }
    
    try {
      // Delete from Firestore
      const eventRef = doc(db, 'events', eventId);
      await deleteDoc(eventRef);
      
      // Remove from local state
      setEvents(prevEvents => 
        prevEvents.filter(event => event.id !== eventId)
      );
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Provide context value
  const value = {
    events,
    loading,
    error,
    refreshEvents,
    addEvent,
    updateEvent,
    deleteEvent,
  };
  
  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

// Custom hook for using the event context
export function useEvents() {
  return useContext(EventContext);
}