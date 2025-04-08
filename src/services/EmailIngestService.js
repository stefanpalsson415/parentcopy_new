// src/services/EmailIngestService.js
import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import EventParserService from './EventParserService';
import CalendarService from './CalendarService';
import EnhancedNLU from './EnhancedNLU';
import { sendEmailNotification } from '../utils/EmailUtils';

/**
 * Service for processing emails sent to Allie and creating events
 */
class EmailIngestService {
  constructor() {
    this.nlu = new EnhancedNLU();
    this.processingQueue = [];
  }

  /**
   * Process an incoming email for a family
   * @param {Object} emailData - Email data from webhook or polling service
   * @returns {Promise<Object>} Processing result
   */
  async processIncomingEmail(emailData) {
    try {
      console.log("Processing incoming email:", {
        from: emailData.from,
        subject: emailData.subject,
        contentPreview: emailData.textContent?.substring(0, 100) + '...'
      });

      // Verify this is from a registered family member
      const familyMember = await this.verifyEmailSender(emailData.from);
      
      if (!familyMember) {
        console.warn("Email received from unregistered address:", emailData.from);
        return { 
          success: false, 
          reason: "unregistered_sender",
          message: "Email not from registered family member" 
        };
      }

      // Get family context for better parsing
      const familyContext = {
        familyId: familyMember.familyId,
        children: await this.getFamilyChildren(familyMember.familyId)
      };
      
      console.log("Found family context:", {
        familyId: familyMember.familyId,
        childrenCount: familyContext.children.length,
        sender: familyMember.name
      });

      // Combine subject and body for better context
      const combinedText = `${emailData.subject}\n\n${emailData.textContent}`;
      
      // Parse the email content
      const eventDetails = await EventParserService.parseEventText(combinedText, familyContext);
      
      // Check if we got valid event details
      if (!eventDetails || (!eventDetails.title && !eventDetails.eventType)) {
        // Add to processing queue for manual review
        await this.addToManualReviewQueue(emailData, familyMember.familyId);
        
        // Send notification about manual review
        await this.sendManualReviewNotification(emailData, familyMember);
        
        return { 
          success: false, 
          reason: "parsing_failed",
          message: "Couldn't extract event details, added to manual review queue" 
        };
      }
      
      // Enhance event with sender info
      eventDetails.createdBy = familyMember.id;
      eventDetails.createdByName = familyMember.name;
      eventDetails.creationSource = 'email';
      eventDetails.originalEmail = {
        from: emailData.from,
        subject: emailData.subject,
        receivedAt: new Date().toISOString()
      };
      
      // Add event to calendar
      const calendarResult = await this.addEventToCalendar(eventDetails, familyMember);
      
      // Send confirmation back to user
      await this.sendConfirmationEmail(
        emailData.from, 
        eventDetails, 
        calendarResult.success
      );
      
      // Save the processed email in Firestore
      await this.saveProcessedEmail(emailData, familyMember.familyId, {
        eventCreated: calendarResult.success,
        eventId: calendarResult.eventId,
        parsedDetails: eventDetails
      });
      
      return {
        success: calendarResult.success,
        eventId: calendarResult.eventId,
        eventDetails: eventDetails
      };
    } catch (error) {
      console.error("Error processing incoming email:", error);
      
      // Try to get sender information even if processing failed
      let senderEmail = emailData.from;
      let familyMember = null;
      
      try {
        familyMember = await this.verifyEmailSender(senderEmail);
      } catch (e) {
        // Unable to verify sender, continue with error handling
      }
      
      // Send error notification if we have a valid sender
      if (familyMember) {
        await this.sendErrorNotification(emailData, familyMember, error);
      }
      
      return { 
        success: false, 
        reason: "processing_error",
        message: error.message || "Unknown error processing email" 
      };
    }
  }

  /**
   * Verify if email sender is a registered family member
   * @param {string} emailAddress - Sender's email address
   * @returns {Promise<Object|null>} Family member data or null if not found
   */
  async verifyEmailSender(emailAddress) {
    try {
      // Query family members collection to find matching email
      const q = query(
        collection(db, "familyMembers"),
        where("email", "==", emailAddress.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Return the first matching family member
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };
    } catch (error) {
      console.error("Error verifying email sender:", error);
      throw error;
    }
  }

  /**
   * Get all children for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<Array>} Array of children
   */
  async getFamilyChildren(familyId) {
    try {
      // Get family document
      const familyDoc = await db.collection("families").doc(familyId).get();
      
      if (!familyDoc.exists) {
        return [];
      }
      
      const familyData = familyDoc.data();
      
      // Filter family members to get only children
      return (familyData.familyMembers || []).filter(m => m.role === 'child');
    } catch (error) {
      console.error("Error getting family children:", error);
      return [];
    }
  }

  /**
   * Add event to calendar
   * @param {Object} eventDetails - Parsed event details
   * @param {Object} familyMember - Family member who sent the email
   * @returns {Promise<Object>} Result of calendar addition
   */
  async addEventToCalendar(eventDetails, familyMember) {
    try {
      // Get current date if not provided
      const eventDate = eventDetails.dateTime 
        ? new Date(eventDetails.dateTime) 
        : new Date();
        
      // Add 1 hour for end time
      const endTime = new Date(eventDate);
      endTime.setHours(endTime.getHours() + 1);
      
      // Prepare event object for calendar
      const calendarEvent = {
        summary: eventDetails.title || `${eventDetails.eventType} Event`,
        title: eventDetails.title || `${eventDetails.eventType} Event`, // Include both for compatibility
        description: `Created from email: ${eventDetails.originalEmail?.subject || 'No subject'}\n\n${eventDetails.extraDetails?.notes || ''}`,
        location: eventDetails.location || '',
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Add metadata
        childId: eventDetails.childId,
        childName: eventDetails.childName,
        familyId: familyMember.familyId,
        createdBy: familyMember.id,
        creationSource: 'email',
        eventType: eventDetails.eventType || 'general',
        extraDetails: eventDetails.extraDetails || {}
      };
      
      // Add to calendar using CalendarService
      const result = await CalendarService.addEvent(calendarEvent, familyMember.id);
      
      return result;
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      throw error;
    }
  }

  /**
   * Save processed email to Firestore
   * @param {Object} emailData - Original email data
   * @param {string} familyId - Family ID
   * @param {Object} processingResult - Result of processing
   * @returns {Promise<void>}
   */
  async saveProcessedEmail(emailData, familyId, processingResult) {
    try {
      await addDoc(collection(db, "processed_emails"), {
        familyId,
        from: emailData.from,
        subject: emailData.subject,
        receivedAt: new Date(),
        processedAt: serverTimestamp(),
        textContent: emailData.textContent,
        htmlContent: emailData.htmlContent || null,
        attachments: emailData.attachments || [],
        processingResult
      });
    } catch (error) {
      console.error("Error saving processed email:", error);
      // Non-critical error, continue processing
    }
  }

  /**
   * Add email to manual review queue
   * @param {Object} emailData - Original email data
   * @param {string} familyId - Family ID
   * @returns {Promise<string>} Queue item ID
   */
  async addToManualReviewQueue(emailData, familyId) {
    try {
      const docRef = await addDoc(collection(db, "email_review_queue"), {
        familyId,
        from: emailData.from,
        subject: emailData.subject,
        receivedAt: new Date(),
        queuedAt: serverTimestamp(),
        textContent: emailData.textContent,
        htmlContent: emailData.htmlContent || null,
        attachments: emailData.attachments || [],
        status: 'pending',
        reviewed: false
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error adding to manual review queue:", error);
      throw error;
    }
  }

  /**
   * Send confirmation email
   * @param {string} toAddress - Recipient email address
   * @param {Object} eventDetails - Parsed event details
   * @param {boolean} success - Whether event creation was successful
   * @returns {Promise<boolean>} Success status
   */
  async sendConfirmationEmail(toAddress, eventDetails, success) {
    try {
      // Format event date for display
      const eventDate = eventDetails.dateTime 
        ? new Date(eventDetails.dateTime).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })
        : 'Unknown date';
        
      // Format event time for display
      const eventTime = eventDetails.dateTime
        ? new Date(eventDetails.dateTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Unknown time';
      
      // Create email subject
      const subject = success
        ? `Event Added: ${eventDetails.title || 'New Event'}`
        : 'Event Creation Needs Review';
      
      // Create email body based on success
      let body = '';
      
      if (success) {
        body = `
          <h2>Event Added to Calendar</h2>
          <p>Hi there! I've successfully added the following event to your family calendar:</p>
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <p><strong>Title:</strong> ${eventDetails.title || 'New Event'}</p>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
            ${eventDetails.location ? `<p><strong>Location:</strong> ${eventDetails.location}</p>` : ''}
            ${eventDetails.childName ? `<p><strong>For:</strong> ${eventDetails.childName}</p>` : ''}
          </div>
          <p>You can view and edit this event in your Allie calendar.</p>
          <p>Thanks for using Allie!</p>
        `;
      } else {
        body = `
          <h2>Event Creation Needs Review</h2>
          <p>Hi there! I received your email about an event, but I couldn't automatically create it.</p>
          <p>Here's what I understood:</p>
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <p><strong>Title:</strong> ${eventDetails.title || 'Undefined'}</p>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
            ${eventDetails.location ? `<p><strong>Location:</strong> ${eventDetails.location}</p>` : ''}
          </div>
          <p>Please log in to Allie and check your notification center or try sending another email with clearer event details.</p>
          <p>Thanks for your patience!</p>
        `;
      }
      
      // Send email
      return await sendEmailNotification(toAddress, subject, body);
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      return false;
    }
  }

  /**
   * Send manual review notification
   * @param {Object} emailData - Original email data
   * @param {Object} familyMember - Family member who sent the email
   * @returns {Promise<boolean>} Success status
   */
  async sendManualReviewNotification(emailData, familyMember) {
    try {
      // Create in-app notification
      await addDoc(collection(db, "notifications"), {
        familyId: familyMember.familyId,
        userId: familyMember.id,
        type: 'email_manual_review',
        title: 'Email Event Needs Review',
        message: `Your email "${emailData.subject}" couldn't be automatically processed. Please check the app to review.`,
        read: false,
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error sending manual review notification:", error);
      return false;
    }
  }

  /**
   * Send error notification
   * @param {Object} emailData - Original email data
   * @param {Object} familyMember - Family member who sent the email
   * @param {Error} error - The error that occurred
   * @returns {Promise<boolean>} Success status
   */
  async sendErrorNotification(emailData, familyMember, error) {
    try {
      // Create in-app notification
      await addDoc(collection(db, "notifications"), {
        familyId: familyMember.familyId,
        userId: familyMember.id,
        type: 'email_processing_error',
        title: 'Email Processing Error',
        message: `There was an error processing your email "${emailData.subject}". Please try again or use the app to create the event.`,
        error: error.message,
        read: false,
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (notificationError) {
      console.error("Error sending error notification:", notificationError);
      return false;
    }
  }

  /**
   * Get personalized email address for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<string>} Personalized email address
   */
  async getPersonalizedEmailAddress(familyId) {
    try {
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      
      // Get family data
      const familyDoc = await db.collection("families").doc(familyId).get();
      
      if (!familyDoc.exists) {
        throw new Error("Family not found");
      }
      
      const familyData = familyDoc.data();
      
      // Create a safe family name (no spaces, lowercase)
      const safeFamilyName = (familyData.familyName || 'family')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      // Generate personalized email with checkallie.com domain
      return `${safeFamilyName}-${familyId.substring(0, 6)}@checkallie.com`;
    } catch (error) {
      console.error("Error getting personalized email address:", error);
      
      // Fallback to generic format with correct domain
      return `family-${familyId.substring(0, 8)}@checkallie.com`;
    }
  }

  /**
   * Update email service settings for a family
   * @param {string} familyId - Family ID
   * @param {Object} settings - Email settings object
   * @returns {Promise<boolean>} Success status
   */
  async updateEmailSettings(familyId, settings) {
    try {
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      
      // Update settings in Firestore
      await updateDoc(doc(db, "families", familyId), {
        emailSettings: {
          ...settings,
          updatedAt: serverTimestamp()
        }
      });
      
      return true;
    } catch (error) {
      console.error("Error updating email settings:", error);
      return false;
    }
  }

  /**
   * Get email service settings for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<Object>} Email settings
   */
  async getEmailSettings(familyId) {
    try {
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      
      // Get family document
      const familyDoc = await db.collection("families").doc(familyId).get();
      
      if (!familyDoc.exists) {
        throw new Error("Family not found");
      }
      
      const familyData = familyDoc.data();
      
      // Get email settings or return defaults
      return familyData.emailSettings || {
        enabled: true,
        sendConfirmations: true,
        allowAutoCreateEvents: true,
        allowedSenders: (familyData.familyMembers || [])
          .filter(m => m.role === 'parent' && m.email)
          .map(m => m.email)
      };
    } catch (error) {
      console.error("Error getting email settings:", error);
      
      // Return default settings
      return {
        enabled: true,
        sendConfirmations: true,
        allowAutoCreateEvents: true,
        allowedSenders: []
      };
    }
  }

  /**
   * Get email processing history for a family
   * @param {string} familyId - Family ID
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array>} Email processing history
   */
  async getEmailHistory(familyId, limit = 10) {
    try {
      if (!familyId) {
        throw new Error("Family ID is required");
      }
      
      // Query processed emails collection
      const q = query(
        collection(db, "processed_emails"),
        where("familyId", "==", familyId),
        orderBy("processedAt", "desc"),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Convert to array of objects
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return history;
    } catch (error) {
      console.error("Error getting email history:", error);
      return [];
    }
  }
}

export default new EmailIngestService();