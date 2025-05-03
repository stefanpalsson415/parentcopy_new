// src/services/FirebasePermissionTest.js
import { auth, db } from './firebase';
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp,
  getDocs, query, where, limit 
} from 'firebase/firestore';

/**
 * Comprehensive Firebase permission testing utility
 * Verifies read and write access to critical collections
 */
class FirebasePermissionTest {
  /**
   * Test writing to Firebase with full error details
   * @param {Object} authContext Authentication context (optional)
   * @returns {Promise<Object>} Results of permission tests
   */
  static async testPermissions(authContext = null) {
    // Collect all test results
    const results = {
      success: false,
      testResults: {},
      authState: {},
      errors: []
    };
    
    try {
      // 1. Check authentication state
      const currentUser = auth.currentUser;
      const userId = authContext?.userId || currentUser?.uid;
      const familyId = authContext?.familyId || 
                     (typeof window !== 'undefined' ? 
                      localStorage.getItem('selectedFamilyId') || 
                      localStorage.getItem('currentFamilyId') : null);
      
      // Store auth state in results
      results.authState = {
        hasCurrentUser: !!currentUser,
        hasUserId: !!userId,
        hasFamilyId: !!familyId,
        userId: userId ? `${userId.substring(0, 6)}...` : null,
        familyId: familyId,
        provider: currentUser?.providerData?.[0]?.providerId
      };
      
      // Fail fast if no user ID
      if (!userId) {
        results.errors.push("No user ID available for Firebase tests");
        return results;
      }
      
      // 2. Test writing to system_tests collection
      try {
        const testDoc = {
          userId: userId,
          familyId: familyId,
          timestamp: new Date().toISOString(),
          text: "Firebase write test",
          createdAt: serverTimestamp()
        };
        
        const systemTestRef = await addDoc(collection(db, "system_tests"), testDoc);
        results.testResults.systemTests = {
          write: true,
          docId: systemTestRef.id
        };
        
        // Test update permission
        await updateDoc(doc(db, "system_tests", systemTestRef.id), {
          updated: true,
          updateTimestamp: serverTimestamp()
        });
        results.testResults.systemTests.update = true;
        
        // Clean up test document
        await deleteDoc(doc(db, "system_tests", systemTestRef.id));
        results.testResults.systemTests.delete = true;
      } catch (error) {
        results.testResults.systemTests = {
          write: false,
          error: error.message
        };
        results.errors.push(`System test write failed: ${error.message}`);
      }
      
      // 3. Test providers collection specifically
      try {
        const providerTest = {
          name: "Test Provider",
          type: "test",
          familyId: familyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId
        };
        
        const providerRef = await addDoc(collection(db, "providers"), providerTest);
        results.testResults.providers = {
          write: true,
          docId: providerRef.id
        };
        
        // Test update permission
        await updateDoc(doc(db, "providers", providerRef.id), {
          updated: true,
          updatedAt: serverTimestamp()
        });
        results.testResults.providers.update = true;
        
        // Clean up test document
        await deleteDoc(doc(db, "providers", providerRef.id));
        results.testResults.providers.delete = true;
      } catch (error) {
        results.testResults.providers = {
          write: false,
          error: error.message
        };
        results.errors.push(`Providers test write failed: ${error.message}`);
      }
      
      // 4. Test tasks collection
      try {
        const taskTest = {
          title: "Test Task",
          description: "Firebase permission test",
          completed: false,
          familyId: familyId,
          createdBy: userId,
          createdAt: serverTimestamp()
        };
        
        const taskRef = await addDoc(collection(db, "tasks"), taskTest);
        results.testResults.tasks = {
          write: true,
          docId: taskRef.id
        };
        
        // Test update permission
        await updateDoc(doc(db, "tasks", taskRef.id), {
          updated: true,
          updatedAt: serverTimestamp()
        });
        results.testResults.tasks.update = true;
        
        // Clean up test document
        await deleteDoc(doc(db, "tasks", taskRef.id));
        results.testResults.tasks.delete = true;
      } catch (error) {
        results.testResults.tasks = {
          write: false,
          error: error.message
        };
        results.errors.push(`Tasks test write failed: ${error.message}`);
      }
      
      // Set overall success status
      results.success = Object.values(results.testResults).every(test => test.write === true);
      
    } catch (error) {
      results.success = false;
      results.errors.push(`Permission test failed: ${error.message}`);
    }
    
    return results;
  }
  
  /**
   * Test authentication status and context validity
   * @param {Object} authContext Current auth context to test
   * @returns {Object} Authentication status details
   */
  static getAuthStatus(authContext = null) {
    // Current user from Firebase Auth
    const currentUser = auth.currentUser;
    
    // Check localStorage
    let storedUserId = null;
    let storedFamilyId = null;
    
    if (typeof window !== 'undefined') {
      try {
        storedUserId = localStorage.getItem('userId');
        storedFamilyId = localStorage.getItem('selectedFamilyId') || 
                         localStorage.getItem('currentFamilyId');
      } catch (e) {
        console.warn("LocalStorage access failed:", e);
      }
    }
    
    return {
      authenticated: !!currentUser,
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        provider: currentUser.providerData?.[0]?.providerId
      } : null,
      authContext: authContext ? {
        userId: authContext.userId,
        familyId: authContext.familyId,
        timestamp: authContext.timestamp,
        age: authContext.timestamp ? Math.floor((Date.now() - authContext.timestamp) / 1000) + 's' : null
      } : null,
      localStorage: {
        hasUserId: !!storedUserId,
        hasFamilyId: !!storedFamilyId,
        userId: storedUserId ? `${storedUserId.substring(0, 6)}...` : null,
        familyId: storedFamilyId
      },
      consistency: {
        userIdMatch: currentUser?.uid === authContext?.userId,
        userIdInStorage: currentUser?.uid === storedUserId,
        contextInStorage: authContext?.userId === storedUserId && 
                         authContext?.familyId === storedFamilyId
      }
    };
  }
}

export default FirebasePermissionTest;