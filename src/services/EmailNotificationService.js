// src/services/EmailNotificationService.js
import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { sendEmailNotification } from '../utils/EmailUtils';

class EmailNotificationService {
  /**
   * Check for email-related notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of notifications
   */
  async getEmailNotifications(userId) {
    try {
      if (!userId) return [];
      
      // Query notifications collection for email-related entries
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("type", "in", ["email_manual_review", "email_processing_error"]),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Convert to array of notifications
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notifications;
    } catch (error) {
      console.error("Error getting email notifications:", error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async markNotificationAsRead(notificationId) {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  /**
   * Send a test email to verify configuration
   * @param {string} familyId - Family ID
   * @returns {Promise<boolean>} Success status
   */
  async sendTestEmail(familyId) {
    try {
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      
      // Get current user
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No logged in user with email");
      }
      
      // Get family data
      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Family not found");
      }
      
      const familyData = docSnap.data();
      
      // Create test email content
      const subject = "Allie Email Configuration Test";
      const body = `
        <h2>Allie Email Configuration Test</h2>
        <p>Hello ${user.displayName || 'there'}!</p>
        <p>This is a test email to confirm your Allie email-to-calendar feature is working correctly.</p>
        <p>Your family email address is:</p>
        <div style="margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; font-family: monospace;">
          ${familyData.emailAddress || 'Not configured yet'}
        </div>
        <p>To add events to your calendar, simply forward or send emails containing event details to this address.</p>
        <p>Examples of emails that work well:</p>
        <ul>
          <li>Birthday party invitations</li>
          <li>Sports practice schedules</li>
          <li>School event announcements</li>
          <li>Appointment confirmations</li>
        </ul>
        <p>Thanks for using Allie!</p>
      `;
      
      // Send the email
      return await sendEmailNotification(user.email, subject, body);
    } catch (error) {
      console.error("Error sending test email:", error);
      return false;
    }
  }
}

export default new EmailNotificationService();