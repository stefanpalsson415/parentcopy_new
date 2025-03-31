// First import Firebase
import { app, db, auth, storage, googleProvider } from './firebase';

// Then import Firebase functions
import { 
  signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, linkWithPopup, signOut
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

  async signInWithGoogle() {
    try {
      console.log("Starting Google sign-in");
      
      // Don't use require within function - use the imported instances
      // from the top of the file instead
      
      // Ensure Firebase is initialized
      if (!this.auth) {
        throw new Error("Firebase auth not initialized - check firebase.js");
      }
      
      // Use the imported googleProvider
      const result = await signInWithPopup(this.auth, googleProvider);
      console.log("Google sign-in successful:", result.user?.email);
      
      return result.user;
    } catch (error) {
      console.error("Google sign-in error details:", error);
      
      // More detailed error handling for different scenarios
      if (error.code === 'auth/cancelled-popup-request') {
        console.log("User cancelled the sign-in popup");
      } else if (error.code === 'auth/popup-blocked') {
        alert("The sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error("The domain is not authorized for OAuth operations");
        alert("Authentication error: This domain is not authorized for sign-in. Please use the deployed app version.");
      } else {
        alert("Google sign-in error: " + error.message);
      }
      
      throw error;
    }
  }
  
  // Add this new function to handle the redirect result
  async handleGoogleRedirectResult() {
    try {
      const { getRedirectResult } = require('firebase/auth');
      
      // Get the result of the redirect operation
      const result = await getRedirectResult(this.auth);
      
      if (result) {
        // User is signed in
        console.log("Redirect result successful:", result.user.email);
        return result.user;
      } else {
        // No redirect result, user might be starting the flow
        console.log("No redirect result yet");
        return null;
      }
    } catch (error) {
      console.error("Error handling Google redirect:", error);
      throw error;
    }
  }
// Add this new function to handle the redirect result
async handleGoogleRedirectResult() {
  try {
    const { auth } = require('./firebase');
    
    // Get the result of the redirect operation
    const result = await getRedirectResult(auth);
    
    if (result) {
      // User is signed in
      console.log("Redirect result successful:", result.user.email);
      return result.user;
    } else {
      // No redirect result, user might be starting the flow
      console.log("No redirect result yet");
      return null;
    }
  } catch (error) {
    console.error("Error handling Google redirect:", error);
    throw error;
  }
}

// Link existing account with Google
async linkAccountWithGoogle(user) {
  try {
    const { googleProvider } = require('./firebase');
    const result = await linkWithPopup(user, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error linking account with Google:", error);
    throw error;
  }
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


// Add Google auth info to family member
// Add Google auth info to family member
async updateMemberWithGoogleAuth(familyId, memberId, userData) {
  try {
    console.log(`Updating Google auth for family ${familyId}, member ${memberId} with user data:`, 
      { email: userData.email, uid: userData.uid });
    
    // Get current family data
    const docRef = doc(this.db, "families", familyId);
    const familyDoc = await getDoc(docRef);
    
    if (!familyDoc.exists()) {
      throw new Error("Family not found");
    }
    
    // Update the correct family member with Google auth info
    const updatedMembers = familyDoc.data().familyMembers.map(member => {
      if (member.id === memberId) {
        console.log(`Found matching member: ${member.name}, updating Google auth information`);
        return {
          ...member,
          googleAuth: {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || member.name,
            photoURL: userData.photoURL || member.profilePicture,
            lastSignIn: new Date().toISOString()
          }
        };
      }
      
      // Important: Don't touch other members' Google auth data
      return member;
    });
    
    // Save updated members back to the database
    await updateDoc(docRef, {
      familyMembers: updatedMembers,
      updatedAt: serverTimestamp()
    });
    
    // Also store this Google auth information in user-specific localStorage
    try {
      localStorage.setItem(`googleToken_${memberId}`, JSON.stringify({
        uid: userData.uid,
        email: userData.email,
        timestamp: Date.now()
      }));
      console.log(`Stored Google token for user ${memberId} in localStorage`);
    } catch (e) {
      console.warn(`Failed to store Google token in localStorage: ${e.message}`);
    }
    
    console.log(`Successfully updated Google auth for member ${memberId}`);
    return true;
  } catch (error) {
    console.error("Error updating member with Google auth:", error);
    throw error;
  }
}

// Add this diagnostic and repair function to the DatabaseService class
async diagnoseAndFixGoogleAuth(familyId) {
  try {
    if (!familyId) {
      throw new Error("Missing family ID for diagnosis");
    }
    
    console.log(`Running Google auth diagnosis for family: ${familyId}`);
    
    // Get current family data
    const docRef = doc(this.db, "families", familyId);
    const familyDoc = await getDoc(docRef);
    
    if (!familyDoc.exists()) {
      throw new Error("Family not found");
    }
    
    const familyData = familyDoc.data();
    const familyMembers = familyData.familyMembers || [];
    
    // Check each family member's Google auth status
    const report = [];
    let needsRepair = false;
    
    for (const member of familyMembers) {
      if (member.role === 'parent') {
        report.push(`Member: ${member.name} (${member.roleType}), Email: ${member.email}`);
        
        if (member.googleAuth) {
          report.push(`  ✓ Has Google auth data: ${member.googleAuth.email}`);
          
          // Check if tokens exist for this user
          const hasUserToken = localStorage.getItem(`googleToken_${member.id}`);
          if (hasUserToken) {
            report.push(`  ✓ Has localStorage token`);
          } else {
            report.push(`  ✗ Missing localStorage token - will create`);
            
            // Create token from member data
            try {
              localStorage.setItem(`googleToken_${member.id}`, JSON.stringify({
                email: member.googleAuth.email,
                uid: member.googleAuth.uid,
                timestamp: Date.now()
              }));
              report.push(`  ✓ Created missing token`);
            } catch (e) {
              report.push(`  ✗ Failed to create token: ${e.message}`);
            }
          }
        } else {
          report.push(`  ✗ NO Google auth data`);
          needsRepair = true;
          
          // Check if we can find a token for this user
          const possibleTokenKeys = [
            `googleToken_${member.id}`,
            `googleToken_${member.roleType.toLowerCase()}`,
            `googleToken_${member.email.replace('@', '_').replace('.', '_')}`
          ];
          
          let foundToken = null;
          for (const key of possibleTokenKeys) {
            const token = localStorage.getItem(key);
            if (token) {
              try {
                const tokenData = JSON.parse(token);
                report.push(`  ✓ Found token with key: ${key}, email: ${tokenData.email}`);
                foundToken = tokenData;
                break;
              } catch (e) {
                report.push(`  ✗ Invalid token found with key ${key}`);
              }
            }
          }
          
          if (foundToken) {
            report.push(`  ➤ Will repair Google auth data for ${member.name}`);
            
            // Update the member with the found token data
            const updatedMembers = familyMembers.map(m => {
              if (m.id === member.id) {
                return {
                  ...m,
                  googleAuth: {
                    uid: foundToken.uid,
                    email: foundToken.email,
                    displayName: foundToken.displayName || member.name,
                    lastSignIn: new Date().toISOString()
                  }
                };
              }
              return m;
            });
            
            // Save the updated members
            await updateDoc(docRef, {
              familyMembers: updatedMembers,
              updatedAt: serverTimestamp()
            });
            
            report.push(`  ✓ Repaired Google auth data for ${member.name}`);
          } else {
            report.push(`  ✗ No token found, cannot repair automatically`);
          }
        }
      }
    }
    
    const reportText = report.join('\n');
    console.log("Google auth diagnosis report:\n" + reportText);
    
    return {
      report: reportText,
      needsRepair,
      success: true
    };
  } catch (error) {
    console.error("Error diagnosing Google auth:", error);
    return {
      report: `Error: ${error.message}`,
      needsRepair: false,
      success: false
    };
  }
}

// Add this after the diagnoseAndFixGoogleAuth function in DatabaseService.js (around line 450-500)

async repairFamilyGoogleAuth(familyId) {
  try {
    console.log("Starting comprehensive Google auth repair for family:", familyId);
    
    // Get current family data
    const docRef = doc(this.db, "families", familyId);
    const familyDoc = await getDoc(docRef);
    
    if (!familyDoc.exists()) {
      throw new Error("Family not found");
    }
    
    const familyData = familyDoc.data();
    const familyMembers = familyData.familyMembers || [];
    
    // Check each localStorage token and create a mapping of tokens
    const tokenMap = {};
    const allKeys = Object.keys(localStorage);
    
    // Find all Google tokens in localStorage
    const tokenKeys = allKeys.filter(key => 
      key.startsWith('googleToken_') || 
      key === 'googleAuthToken'
    );
    
    console.log("Found token keys:", tokenKeys);
    
    // Parse all tokens and categorize by email
    tokenKeys.forEach(key => {
      try {
        const tokenData = JSON.parse(localStorage.getItem(key));
        if (tokenData && tokenData.email) {
          tokenMap[tokenData.email] = {
            ...tokenData,
            key: key
          };
          console.log(`Token for ${tokenData.email} found with key ${key}`);
        }
      } catch (e) {
        console.warn(`Failed to parse token for key ${key}:`, e);
      }
    });
    
    console.log("Token map created:", Object.keys(tokenMap));
    
    // Build a map of parent roles to emails from the family data
    // This helps us determine which token belongs to which parent
    const roleToEmailMap = {};
    const updatedMembers = [];
    
    // First pass: gather role to email mappings from the family data
    familyMembers.forEach(member => {
      if (member.role === 'parent') {
        roleToEmailMap[member.roleType] = member.email;
        console.log(`Role ${member.roleType} mapped to email ${member.email}`);
      }
    });
    
    // Second pass: update Google auth data for each member
    for (const member of familyMembers) {
      let updatedMember = { ...member };
      
      if (member.role === 'parent') {
        const memberEmail = member.email;
        console.log(`Processing member ${member.name} with email ${memberEmail}`);
        
        // Find token by email
        const tokenByEmail = tokenMap[memberEmail];
        
        if (tokenByEmail) {
          console.log(`Found token matching member email ${memberEmail}`);
          
          // Update member's Google auth data
          updatedMember.googleAuth = {
            uid: tokenByEmail.uid,
            email: tokenByEmail.email,
            displayName: member.name,
            photoURL: member.profilePicture,
            lastSignIn: new Date().toISOString()
          };
          
          // Store token specifically for this member's ID
          try {
            localStorage.setItem(`googleToken_${member.id}`, JSON.stringify({
              email: tokenByEmail.email,
              uid: tokenByEmail.uid,
              timestamp: Date.now()
            }));
            console.log(`Stored token for member ID ${member.id}`);
          } catch (e) {
            console.warn(`Failed to store token for member ${member.id}:`, e);
          }
        } else {
          console.log(`No token found for member email ${memberEmail}`);
          
          // Try to find token by role type (fallback)
          const roleKey = `googleToken_${member.roleType.toLowerCase()}`;
          const tokenByRole = Object.values(tokenMap).find(t => 
            t.key === roleKey || 
            (t.role && t.role.toLowerCase() === member.roleType.toLowerCase())
          );
          
          if (tokenByRole) {
            console.log(`Found token by role for ${member.roleType}: ${tokenByRole.email}`);
            
            // Update member's Google auth data
            updatedMember.googleAuth = {
              uid: tokenByRole.uid,
              email: tokenByRole.email,
              displayName: member.name,
              photoURL: member.profilePicture,
              lastSignIn: new Date().toISOString()
            };
            
            // Store token specifically for this member's ID
            try {
              localStorage.setItem(`googleToken_${member.id}`, JSON.stringify({
                email: tokenByRole.email,
                uid: tokenByRole.uid,
                timestamp: Date.now()
              }));
              console.log(`Stored token for member ID ${member.id} by role`);
            } catch (e) {
              console.warn(`Failed to store token for member ${member.id}:`, e);
            }
          } else {
            // Clear any incorrect Google auth data
            console.log(`No token found for member ${member.name}, clearing any incorrect Google auth data`);
            updatedMember.googleAuth = null;
          }
        }
      }
      
      updatedMembers.push(updatedMember);
    }
    
    // Update the family document with the corrected members
    await updateDoc(docRef, {
      familyMembers: updatedMembers,
      updatedAt: serverTimestamp()
    });
    
    console.log("Family members updated with corrected Google auth data:", updatedMembers.length);
    
    return {
      success: true,
      message: `Google auth data repaired for ${updatedMembers.length} family members.`
    };
  } catch (error) {
    console.error("Error repairing family Google auth:", error);
    return {
      success: false,
      error: error.message
    };
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

  // Update member survey completion
  async updateMemberSurveyCompletion(familyId, memberId, surveyType, isCompleted) {
    try {
      const docRef = doc(this.db, "families", familyId);
      const familyData = await getDoc(docRef);
      
      if (familyData.exists()) {
        const updatedMembers = familyData.data().familyMembers.map(member => {
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
        
        await updateDoc(docRef, {
          familyMembers: updatedMembers,
          updatedAt: serverTimestamp()
        });
        
        return true;
      } else {
        throw new Error("Family not found");
      }
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

  // NEW: Update subtask completion with timestamp
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
  // When creating Google-authenticated parents, make sure to preserve the Google auth data
// Around line 715-720 in createFamily method
if (parent.googleAuth) {
  // For Google-authenticated parents, use their existing Google UID
  parentUsers.push({
    uid: parent.googleAuth.uid,
    email: parent.googleAuth.email || parent.email,
    role: parent.role,
    googleAuth: parent.googleAuth // Make sure we're passing the full googleAuth object
  });
  console.log(`Using existing Google account for ${parent.role}:`, parent.googleAuth.uid);
} else if (parent.email && parent.password) {
  // For traditional email/password parents
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
      profilePicture: '/api/placeholder/150/150', // Default placeholder
      // Important: Preserve the Google auth data if it exists
      googleAuth: parent.googleAuth || null
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
            profilePicture: '/api/placeholder/150/150' // Default placeholder
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
        familyPicture: null // Initialize empty family picture
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

// Create a new family
async createFamily(familyData) {
  try {
    const { familyName, parents, children } = familyData;
    
    // Create user accounts for parents
    const parentUsers = [];
    const parentData = Array.isArray(parents) ? parents : [];
    for (const parent of parentData) {
      if (parent.googleAuth) {
        // For Google-authenticated parents, use their existing Google UID
        parentUsers.push({
          uid: parent.googleAuth.uid,
          email: parent.googleAuth.email || parent.email,
          role: parent.role
        });
        console.log(`Using existing Google account for ${parent.role}:`, parent.googleAuth.uid);
      } else if (parent.email && parent.password) {
        // For traditional email/password parents
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
                profilePicture: '/api/placeholder/150/150', // Default placeholder
                // Important: Preserve the Google auth data if it exists
                googleAuth: parent.googleAuth || null
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
                profilePicture: '/api/placeholder/150/150' // Default placeholder
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
            familyPicture: null // Initialize empty family picture
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
      // In a real implementation, this would analyze survey data for "hidden" workload imbalances
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