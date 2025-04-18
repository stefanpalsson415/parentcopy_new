// src/services/DatabaseService.js
// First import Firebase
import { app, db, auth, storage } from './firebase';

// Then import Firebase functions
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';

// src/services/DatabaseService.js
import { 
  collection, doc, setDoc, getDoc, updateDoc, 
  getDocs, addDoc, query, where, serverTimestamp,
  arrayUnion
} from 'firebase/firestore';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

class DatabaseService {
  constructor() {
    this.db = db;
    this.auth = auth;
    this.storage = storage;
  }

  // ---- Authentication Methods ----

  // Create a new user account
  async createUser(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  }

  // Sign out current user
  async signOut() {
    try {
      await signOut(this.auth);
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Development login function - use only for testing
  async signInForDevelopment(email = "test@example.com") {
    try {
      console.log("DEVELOPMENT MODE: Creating test user");
      
      // Create a mock user
      const mockUser = {
        uid: "test-user-" + Date.now(),
        email: email,
        displayName: "Test User",
        photoURL: null
      };
      
      // For testing only - in a real app, this would be handled by Firebase Auth
      localStorage.setItem('devModeUser', JSON.stringify(mockUser));
      
      return mockUser;
    } catch (error) {
      console.error("Error in development login:", error);
      throw error;
    }
  }

  // Upload image to Firebase Storage
  async uploadProfileImage(userId, file) {
    try {
      console.log("DatabaseService: Starting profile image upload for user ID:", userId);
      
      // Add file extension to create a better filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;
      
      // Create a unique path for the file
      const storageRef = ref(this.storage, `profile-pictures/${fileName}`);
      console.log("Storage reference created:", storageRef);
      
      // Upload the file to Firebase Storage with explicit content type
      const metadata = {
        contentType: file.type
      };
      
      console.log("Uploading file to storage...");
      const snapshot = await uploadBytes(storageRef, file, metadata);
      console.log("File uploaded successfully, getting URL...");
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("DatabaseService Error uploading image:", error);
      console.log("Error details:", {
        userId,
        errorCode: error.code,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }


  // Add this method to your DatabaseService class/object
/**
 * Get family meeting notes for a specific week
 * @param {string} familyId - Family ID
 * @param {number} weekNumber - Week number
 * @returns {Promise<object|null>} Meeting notes or null if not found
 */
async getFamilyMeetingNotes(familyId, weekNumber) {
  try {
    if (!familyId) throw new Error("No family ID available");
    
    const notesDoc = await getDoc(doc(db, "families", familyId, "meetingNotes", `week${weekNumber}`));
    if (notesDoc.exists()) {
      return notesDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting family meeting notes:", error);
    return null;
  }
}

  // Load all survey responses for a family
  async loadSurveyResponses(familyId) {
    try {
      console.log("Loading all survey responses for family:", familyId);
      
      // Query all survey response documents for this family
      const surveyResponsesQuery = query(
        collection(this.db, "surveyResponses"), 
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(surveyResponsesQuery);
      
      // Combine all responses
      const allResponses = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.responses) {
          // Handle both simple and enriched response formats
          if (typeof Object.values(data.responses)[0] === 'object') {
            // Enriched format with metadata
            Object.entries(data.responses).forEach(([key, value]) => {
              allResponses[key] = value.answer || value;
            });
          } else {
            // Simple format
            Object.assign(allResponses, data.responses);
          }
        }
      });
      
      console.log(`Found ${Object.keys(allResponses).length} survey responses`);
      return allResponses;
    } catch (error) {
      console.error("Error loading survey responses:", error);
      return {};
    }
  }

  // Upload family picture to Firebase Storage
  async uploadFamilyPicture(familyId, file) {
    try {
      console.log("Starting family picture upload for family ID:", familyId);
      
      // Create a reference to Firebase Storage
      const storageRef = ref(this.storage, `family-pictures/${familyId}_${Date.now()}`);
      
      // Upload the file
      console.log("Uploading file to Firebase Storage...");
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log("Family picture uploaded successfully:", downloadURL);
      
      // Update the family document with just the URL
      await this.saveFamilyData({ familyPicture: downloadURL }, familyId);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading family picture:", error);
      throw error;
    }
  }

  // ---- Family Data Methods ----

  // Save couple check-in data
  async saveCoupleCheckInData(familyId, weekNumber, data) {
    try {
      const docRef = doc(this.db, "coupleCheckIns", `${familyId}-week${weekNumber}`);
      await setDoc(docRef, {
        familyId,
        weekNumber,
        data,
        completedAt: serverTimestamp()
      });
      
      // Also update the family document to indicate this check-in is complete
      const familyDocRef = doc(this.db, "families", familyId);
      await updateDoc(familyDocRef, {
        [`coupleCheckIns.week${weekNumber}`]: {
          completed: true,
          completedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error saving couple check-in data:", error);
      throw error;
    }
  }

  // Load couple check-in data for all weeks
  async loadCoupleCheckInData(familyId) {
    try {
      const checkInData = {};
      
      // Query all documents for this family
      const q = query(
        collection(this.db, "coupleCheckIns"), 
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Extract week number from doc ID (format: familyId-week1)
        const weekMatch = doc.id.match(/-week(\d+)$/);
        if (weekMatch && weekMatch[1]) {
          const weekNumber = parseInt(weekMatch[1]);
          checkInData[weekNumber] = data.data;
        }
      });
      
      return checkInData;
    } catch (error) {
      console.error("Error loading couple check-in data:", error);
      return {};
    }
  }
  
  // Load family data from Firestore
  async loadFamilyData(familyId) {
    try {
      const docRef = doc(this.db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Get survey responses for this family
        const surveyResponsesQuery = query(
          collection(this.db, "surveyResponses"), 
          where("familyId", "==", familyId)
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
        
        return {
          ...docSnap.data(),
          surveyResponses: surveyResponses
        };
      } else {
        console.log("No such family document!");
        return null;
      }
    } catch (error) {
      console.error("Error loading family data:", error);
      throw error;
    }
  }

  // Load family by user ID
  async loadFamilyByUserId(userId) {
    try {
      const q = query(collection(this.db, "families"), where("memberIds", "array-contains", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const familyId = querySnapshot.docs[0].id;
        const familyData = querySnapshot.docs[0].data();
        
        // Get survey responses for this family
        const surveyResponsesQuery = query(
          collection(this.db, "surveyResponses"), 
          where("familyId", "==", familyId)
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
        
        return {
          ...familyData,
          familyId: familyId,
          surveyResponses: surveyResponses
        };
      } else {
        console.log("No family found for this user!");
        return null;
      }
    } catch (error) {
      console.error("Error loading family by user:", error);
      throw error;
    }
  }

  // Add this method to get all families for a user
  async getAllFamiliesByUserId(userId) {
    try {
      const q = query(collection(this.db, "families"), where("memberIds", "array-contains", userId));
      const querySnapshot = await getDocs(q);
      
      const families = [];
      querySnapshot.forEach((doc) => {
        families.push({
          ...doc.data(),
          familyId: doc.id
        });
      });
      
      return families;
    } catch (error) {
      console.error("Error loading all families by user:", error);
      throw error;
    }
  }

  // Save family data to Firestore
  async saveFamilyData(data, familyId) {
    try {
      const docRef = doc(this.db, "families", familyId);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving family data:", error);
      throw error;
    }
  }

  // Store email for weekly updates
  async saveEmailForUpdates(email, familyId) {
    try {
      const docRef = doc(this.db, "emailSubscriptions", familyId);
      await setDoc(docRef, {
        email,
        familyId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving email:", error);
      throw error;
    }
  }

  // Update member survey completion with improved tracking
async updateMemberSurveyCompletion(familyId, memberId, surveyType, isCompleted) {
  try {
    if (!familyId || !memberId) {
      throw new Error("Family ID and Member ID are required");
    }
    
    console.log(`Updating survey completion for member ${memberId} in family ${familyId} - ${surveyType}: ${isCompleted}`);
    
    const docRef = doc(this.db, "families", familyId);
    const familyData = await getDoc(docRef);
    
    if (!familyData.exists()) {
      throw new Error("Family not found");
    }
    
    const familyDoc = familyData.data();
    const updatedMembers = familyDoc.familyMembers.map(member => {
      if (member.id === memberId) {
        if (surveyType === 'initial') {
          return {
            ...member,
            completed: isCompleted,
            completedDate: new Date().toISOString().split('T')[0]
          };
        } else if (surveyType.startsWith('weekly-')) {
          const weekIndex = parseInt(surveyType.replace('weekly-', '')) - 1;
          const updatedWeeklyCompleted = [...(member.weeklyCompleted || [])];
          
          while (updatedWeeklyCompleted.length <= weekIndex) {
            updatedWeeklyCompleted.push({
              id: updatedWeeklyCompleted.length + 1,
              completed: false,
              date: null
            });
          }
          
          updatedWeeklyCompleted[weekIndex] = {
            ...updatedWeeklyCompleted[weekIndex],
            completed: isCompleted,
            date: new Date().toISOString().split('T')[0]
          };
          
          return {
            ...member,
            weeklyCompleted: updatedWeeklyCompleted
          };
        }
      }
      return member;
    });
    
    // Check if this completes all parents' initial surveys
    const allParentsCompleted = updatedMembers
      .filter(m => m.role === 'parent')
      .every(p => p.completed);
    
    // Update family document with member completion status
    const updateData = {
      familyMembers: updatedMembers,
      updatedAt: serverTimestamp()
    };
    
    // If all parents have completed their surveys, mark week 1 as completed
    if (allParentsCompleted && surveyType === 'initial' && isCompleted) {
      console.log("All parents have completed surveys - marking week 1 as complete");
      
      // Add first week to completedWeeks if not already there
      const completedWeeks = familyDoc.completedWeeks || [];
      if (!completedWeeks.includes(1)) {
        updateData.completedWeeks = [...completedWeeks, 1];
      }
      
      // Also make sure currentWeek is at least 2
      if (!familyDoc.currentWeek || familyDoc.currentWeek <= 1) {
        updateData.currentWeek = 2;
      }
    }
    
    await updateDoc(docRef, updateData);
    
    // Also update survey completion status in a separate document for redundancy
    try {
      const completionRef = doc(this.db, "surveyCompletions", familyId);
      await setDoc(completionRef, {
        familyId,
        [surveyType]: {
          [memberId]: {
            completed: isCompleted,
            completedDate: new Date().toISOString()
          }
        },
        allParentsCompleted: allParentsCompleted,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Non-critical error updating survey completion tracker:", err);
      // Continue even if this fails
    }
    
    console.log(`Successfully updated survey completion status for ${memberId}`);
    return true;
  } catch (error) {
    console.error("Error updating member completion:", error);
    throw error;
  }
}

  // Save survey responses
  async saveSurveyResponses(familyId, memberId, surveyType, responses) {
    try {
      const docRef = doc(this.db, "surveyResponses", `${familyId}-${memberId}-${surveyType}`);
      await setDoc(docRef, {
        familyId,
        memberId,
        surveyType,
        responses,
        completedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error saving survey responses:", error);
      throw error;
    }
  }

  // Enhanced survey response storage with metadata
  async saveSurveyResponsesWithMetadata(familyId, memberId, surveyType, responses, questionMetadata) {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const enrichedResponses = {};
        
      // Add metadata to each response
      Object.entries(responses).forEach(([questionId, answer]) => {
        const metadata = questionMetadata[questionId] || {};
          
        enrichedResponses[questionId] = {
          answer,
          category: metadata.category || 'unknown',
          weight: metadata.totalWeight || '1',
          timestamp: new Date().toISOString()
        };
      });
        
      // Save to Firestore
      const docRef = doc(this.db, "surveyResponses", `${familyId}-${memberId}-${surveyType}`);
      await setDoc(docRef, {
        familyId,
        memberId,
        surveyType,
        responses: enrichedResponses,
        completedAt: serverTimestamp()
      });
      
      console.log(`Saved ${Object.keys(enrichedResponses).length} enriched survey responses for ${memberId}`);
      return true;
    } catch (error) {
      console.error("Error saving survey responses with metadata:", error);
      throw error;
    }
  }

  // Load member survey responses
  async loadMemberSurveyResponses(familyId, memberId, surveyType) {
    try {
      const docRef = doc(this.db, "surveyResponses", `${familyId}-${memberId}-${surveyType}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().responses || {};
      } else {
        return {};
      }
    } catch (error) {
      console.error("Error loading member survey responses:", error);
      throw error;
    }
  }

  // Add task comment
  async addTaskComment(familyId, taskId, userId, userName, text) {
    try {
      const docRef = doc(this.db, "families", familyId);
      const familyData = await getDoc(docRef);
      
      if (familyData.exists()) {
        const comment = {
          id: Date.now(),
          userId,
          userName,
          text,
          timestamp: new Date().toLocaleString()
        };
        
        const taskData = familyData.data().tasks || [];
        const updatedTasks = taskData.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              comments: [...(task.comments || []), comment]
            };
          }
          return task;
        });
        
        await updateDoc(docRef, {
          tasks: updatedTasks,
          updatedAt: serverTimestamp()
        });
        
        return comment;
      } else {
        throw new Error("Family not found");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  // Update task completion - now with timestamp
  async updateTaskCompletion(familyId, taskId, isCompleted, completedDate) {
    try {
      console.log(`Updating task ${taskId} completion to: ${isCompleted} with date: ${completedDate}`);
      
      const docRef = doc(this.db, "families", familyId);
      const familyData = await getDoc(docRef);
      
      if (familyData.exists()) {
        const taskData = familyData.data().tasks || [];
        const updatedTasks = taskData.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              completed: isCompleted,
              completedDate: completedDate
            };
          }
          return task;
        });
        
        await updateDoc(docRef, {
          tasks: updatedTasks,
          updatedAt: serverTimestamp()
        });
        
        console.log(`Task ${taskId} completion successfully updated`);
        return true;
      } else {
        throw new Error("Family not found");
      }
    } catch (error) {
      console.error("Error updating task completion:", error);
      throw error;
    }
  }

  // Update subtask completion with timestamp
  async updateSubtaskCompletion(familyId, taskId, subtaskId, isCompleted, completedDate) {
    try {
      console.log(`Updating subtask ${subtaskId} of task ${taskId} completion to: ${isCompleted} with date: ${completedDate}`);
      
      const docRef = doc(this.db, "families", familyId);
      const familyData = await getDoc(docRef);
      
      if (familyData.exists()) {
        const taskData = familyData.data().tasks || [];
        const updatedTasks = taskData.map(task => {
          if (task.id.toString() === taskId.toString()) {
            // Update the specific subtask
            const updatedSubtasks = (task.subTasks || []).map(subtask => {
              if (subtask.id === subtaskId) {
                return {
                  ...subtask,
                  completed: isCompleted,
                  completedDate: completedDate
                };
              }
              return subtask;
            });
            
            // Check if all subtasks are completed
            const allSubtasksComplete = updatedSubtasks.every(st => st.completed);
            
            return {
              ...task,
              subTasks: updatedSubtasks,
              // Update the main task's completion status based on subtasks
              completed: allSubtasksComplete,
              completedDate: allSubtasksComplete ? new Date().toISOString() : null
            };
          }
          return task;
        });
        
        await updateDoc(docRef, {
          tasks: updatedTasks,
          updatedAt: serverTimestamp()
        });
        
        console.log(`Subtask ${subtaskId} of task ${taskId} completion successfully updated`);
        return true;
      } else {
        throw new Error("Family not found");
      }
    } catch (error) {
      console.error("Error updating subtask completion:", error);
      throw error;
    }
  }

// Save document metadata to Firestore
async saveDocument(documentData) {
  try {
    if (!documentData.familyId) {
      throw new Error("No family ID provided for document");
    }
    
    const docRef = await addDoc(collection(this.db, "familyDocuments"), {
      ...documentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("Document saved with ID:", docRef.id);
    return { success: true, documentId: docRef.id };
  } catch (error) {
    console.error("Error saving document:", error);
    throw error;
  }
}


  // Save family meeting notes
  async saveFamilyMeetingNotes(familyId, weekNumber, notes) {
    try {
      const docRef = doc(this.db, "familyMeetings", `${familyId}-week${weekNumber}`);
      await setDoc(docRef, {
        familyId,
        weekNumber,
        notes,
        completedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error saving family meeting notes:", error);
      throw error;
    }
  }

  // Get tasks for the current week
  async getTasksForWeek(familyId, weekNumber) {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      const docRef = doc(this.db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Return the tasks array from the family document
        return docSnap.data().tasks || [];
      } else {
        console.log("No family document found");
        return [];
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      throw error;
    }
  }  

  // Get family meeting notes
  async getFamilyMeetingNotes(familyId, weekNumber) {
    try {
      const docRef = doc(this.db, "familyMeetings", `${familyId}-week${weekNumber}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().notes || {};
      } else {
        console.log("No meeting notes found");
        return {};
      }
    } catch (error) {
      console.error("Error getting family meeting notes:", error);
      return {};
    }
  }

  // Create a new family
  async createFamily(familyData) {
    try {
      const { familyName, parents, children } = familyData;
      
      // Create user accounts for parents
      const parentUsers = [];
      const parentData = Array.isArray(parents) ? parents : [];
      for (const parent of parentData) {
        if (parent.email && parent.password) {
          try {
            const user = await this.createUser(parent.email, parent.password);
            parentUsers.push({
              uid: user.uid,
              email: parent.email,
              role: parent.role
            });
            console.log(`Created user for ${parent.role}:`, user.uid);
          } catch (error) {
            console.error(`Error creating user for ${parent.role}:`, error);
            // Continue with other parents even if one fails
          }
        }
      }

      if (parentUsers.length === 0) {
        throw new Error("No parent users could be created");
      }
        
      // Generate a simple family ID instead of using addDoc
      const familyId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      console.log("Generated familyId:", familyId);
      console.log("Parent users created:", parentUsers);
      console.log("Family data being prepared:", {
        familyName,
        parentData: parentData.map(p => ({...p, password: '****'})),
        childrenData: Array.isArray(children) ? children : []
      });
            
      // Create family members array
      const familyMembers = [
        ...parentData.map((parent, index) => {
          const userId = parentUsers[index]?.uid || `${parent.role.toLowerCase()}-${familyId}`;
          console.log(`Creating family member for ${parent.name} with ID ${userId}`);
          return {
            id: userId,
            name: parent.name,
            role: 'parent',
            roleType: parent.role,
            email: parent.email,
            completed: false,
            completedDate: null,
            weeklyCompleted: [],
            profilePicture: parent.profilePicture || null 
          };
        }),
        ...(Array.isArray(children) ? children : []).map(child => {
          const childId = `${child.name.toLowerCase()}-${familyId}`;
          console.log(`Creating family member for child ${child.name} with ID ${childId}`);
          return {
            id: childId,
            name: child.name,
            role: 'child',
            age: child.age,
            completed: false,
            completedDate: null,
            weeklyCompleted: [],
            profilePicture: child.profilePicture || null
          };
        })
      ];
            
      // Prepare family document data
      const familyDoc = {
        familyId,
        familyName,
        familyMembers,
        tasks: [],
        completedWeeks: [],
        currentWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberIds: parentUsers.map(user => user.uid),
        surveySchedule: {}, // Initialize empty survey schedule
        familyPicture: familyData.familyPicture || null
      };
            
      console.log("Attempting to save family document:", familyId);
            
      // Create the family document directly with a specific ID
      await setDoc(doc(this.db, "families", familyId), familyDoc);
      console.log("Family document created successfully");
            
      // Record family creation analytics
      try {
        await this.recordAnalyticsEvent(familyId, {
          event: 'family_created',
          familyName: familyName,
          memberCount: familyMembers.length,
          parentCount: parentData.length,
          childCount: Array.isArray(children) ? children.length : 0,
          timestamp: new Date().toISOString()
        });
      } catch (analyticsError) {
        console.error("Analytics error during family creation:", analyticsError);
        // Non-critical, don't block family creation
      }
            
      return familyDoc;
    } catch (error) {
      console.error("Error in createFamily:", error);
      throw error;
    }
  }

  // Update family member profile picture
  async updateMemberProfilePicture(familyId, memberId, file) {
    try {
      // Upload the image to Firebase Storage
      const downloadURL = await this.uploadProfileImage(memberId, file);
      
      // Update the family member's profile picture URL in Firestore
      const docRef = doc(this.db, "families", familyId);
      const familyData = await getDoc(docRef);
      
      if (!familyData.exists()) {
        throw new Error("Family not found");
      }
      
      const updatedMembers = familyData.data().familyMembers.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            profilePicture: downloadURL
          };
        }
        return member;
      });
      
      await updateDoc(docRef, {
        familyMembers: updatedMembers,
        updatedAt: serverTimestamp()
      });
      
      return downloadURL;
    } catch (error) {
      console.error("Error updating profile picture:", error);
      throw error;
    }
  }

  // Store AI preferences
  async storeAIPreferences(familyId, preferences) {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Create a properly structured object for AI use
      const aiData = {
        communicationStyle: preferences.communication?.style || 'open',
        challengeAreas: preferences.communication?.challengeAreas || [],
        priorities: {
          highestPriority: preferences.priorities?.highestPriority || null,
          secondaryPriority: preferences.priorities?.secondaryPriority || null,
          tertiaryPriority: preferences.priorities?.tertiaryPriority || null
        },
        aiPreferences: {
          style: preferences.aiPreferences?.style || 'friendly',
          length: preferences.aiPreferences?.length || 'balanced',
          topics: preferences.aiPreferences?.topics || []
        },
        relationship: preferences.relationship || {},
        updatedAt: serverTimestamp()
      };
        
      // Store in a dedicated collection for AI engine
      const docRef = doc(this.db, "familyAIData", familyId);
      await setDoc(docRef, aiData, { merge: true });
        
      // Also store in the main family document for completeness
      await this.saveFamilyData({
        aiPreferences: preferences.aiPreferences || {},
        communication: preferences.communication || {},
        priorities: preferences.priorities || {},
        relationship: preferences.relationship || {}
      }, familyId);
        
      console.log("AI preferences stored successfully:", familyId);
      return true;
    } catch (error) {
      console.error("Error storing AI preferences:", error);
      throw error;
    }
  }

  // Record analytics events
  async recordAnalyticsEvent(familyId, eventData) {
    try {
      if (!familyId) throw new Error("No family ID available");
      
      // Add timestamp if not provided
      const event = {
        ...eventData,
        timestamp: eventData.timestamp || new Date().toISOString(),
        recordedAt: serverTimestamp()
      };
      
      // Create a unique ID for this event
      const eventId = `${event.event}_${Date.now()}`;
      
      // Store in analytics collection
      await setDoc(doc(this.db, "analytics", `${familyId}_${eventId}`), event);
      
      return true;
    } catch (error) {
      console.error("Error recording analytics event:", error);
      // Don't throw the error to avoid disrupting the user experience
      return false;
    }
  }

  // Record user onboarding progress
  async recordOnboardingProgress(userId, familyId, step, data) {
    try {
      if (!userId) throw new Error("No user ID available");
      
      const progressData = {
        userId,
        familyId: familyId || null,
        step,
        data: data || {},
        timestamp: new Date().toISOString(),
        recordedAt: serverTimestamp()
      };
      
      // Store in onboarding progress collection
      await setDoc(
        doc(this.db, "onboardingProgress", `${userId}_step${step}`),
        progressData,
        { merge: true }
      );
      
      // Also record as an analytics event
      if (familyId) {
        await this.recordAnalyticsEvent(familyId, {
          event: 'onboarding_step_completed',
          userId,
          step,
          data
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error recording onboarding progress:", error);
      // Don't throw the error to avoid disrupting the user experience
      return false;
    }
  }
  
  // Track onboarding completion
  async trackOnboardingCompletion(userId, familyId) {
    try {
      if (!userId || !familyId) throw new Error("User ID and Family ID are required");
      
      // Record completion in user document
      await setDoc(doc(this.db, "users", userId), {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        latestFamilyId: familyId
      }, { merge: true });
      
      // Record as analytics event
      await this.recordAnalyticsEvent(familyId, {
        event: 'onboarding_completed',
        userId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error("Error tracking onboarding completion:", error);
      // Don't throw the error to avoid disrupting the user experience
      return false;
    }
  }

  // AI Task Intelligence Engine
  async generateAITaskRecommendations(familyId) {
    try {
      // For a real implementation, this would analyze survey data for "hidden" workload imbalances
      // and generate personalized task recommendations
      
      // For now, we'll mock the AI recommendations
      const hiddenTasks = [
        {
          id: 'ai-1',
          assignedTo: 'Papa',
          assignedToName: 'Stefan',
          title: 'Emotional Check-ins',
          description: 'Our AI detected that Mama is handling 85% of emotional support for the children. Taking time for regular emotional check-ins with each child would help balance this invisible work.',
          isAIGenerated: true,
          hiddenWorkloadType: 'Invisible Parental Tasks',
          insight: 'Through pattern analysis of your family\'s survey responses, we noticed that children consistently report Mama handling emotional support discussions.',
          completed: false,
          completedDate: null,
          comments: []
        },
        {
          id: 'ai-2',
          assignedTo: 'Mama',
          assignedToName: 'Kimberly',
          title: 'Home Maintenance Planning',
          description: 'Papa has been handling most home maintenance decisions. Creating a shared maintenance calendar would help balance this invisible household work.',
          isAIGenerated: true,
          hiddenWorkloadType: 'Invisible Household Tasks',
          insight: 'Survey analysis shows Papa is handling 78% of home maintenance coordination, which creates mental load imbalance.',
          completed: false,
          completedDate: null,
          comments: []
        }
      ];
      
      // In a real implementation, we would save these to the database
      // For now, we'll just return them
      return hiddenTasks;
    } catch (error) {
      console.error("Error generating AI task recommendations:", error);
      throw error;
    }
  }
  
  // Save couple check-in feedback from AI
  async saveCoupleCheckInFeedback(familyId, weekNumber, feedback) {
    try {
      const docRef = doc(this.db, "coupleCheckInFeedback", `${familyId}-week${weekNumber}`);
      await setDoc(docRef, {
        familyId,
        weekNumber,
        feedback,
        generatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error saving couple check-in feedback:", error);
      throw error;
    }
  }
}

export default new DatabaseService();