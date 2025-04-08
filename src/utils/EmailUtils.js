// src/utils/EmailUtils.js

/**
 * Utility functions for sending and processing emails
 */

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} body - Email body content (HTML)
 * @param {Object} options - Additional email options
 * @returns {Promise<boolean>} Success status
 */
export const sendEmailNotification = async (to, subject, body, options = {}) => {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV MODE: Email would be sent with:', { to, subject, bodyPreview: body.substring(0, 100) + '...' });
        return true;
      }
      
      // In production, call your email service API
      // This would typically be a call to SendGrid, Mailgun, AWS SES, etc.
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          subject,
          html: body,
          from: options.from || 'Allie <noreply@allie-assistant.com>',
          replyTo: options.replyTo || 'events@allie-assistant.com',
          ...options
        })
      });
      
      if (!response.ok) {
        throw new Error(`Email service responded with status ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Error sending email notification:", error);
      return false;
    }
  };
  
  /**
   * Parse an email address string into components
   * @param {string} emailString - Email address string (possibly with name)
   * @returns {Object} Parsed email components
   */
  export const parseEmailAddress = (emailString) => {
    try {
      if (!emailString) {
        return { name: '', address: '', valid: false };
      }
      
      // Check for format: "Name <email@example.com>"
      const nameMatch = emailString.match(/^([^<]+)<([^>]+)>$/);
      
      if (nameMatch) {
        return {
          name: nameMatch[1].trim(),
          address: nameMatch[2].trim(),
          valid: isValidEmail(nameMatch[2].trim())
        };
      }
      
      // Simple email address with no name
      return {
        name: '',
        address: emailString.trim(),
        valid: isValidEmail(emailString.trim())
      };
    } catch (error) {
      console.error("Error parsing email address:", error);
      return { name: '', address: '', valid: false };
    }
  };
  
  /**
   * Validate an email address
   * @param {string} email - Email address to validate
   * @returns {boolean} Whether email is valid
   */
  export const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  export const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Extract plain text from HTML content
   * @param {string} html - HTML content
   * @returns {string} Plain text content
   */
  export const extractTextFromHtml = (html) => {
    if (!html) return '';
    
    // Replace common HTML elements with text equivalents
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n')
      .replace(/<div\s*\/?>/gi, '\n')
      .replace(/<li\s*\/?>/gi, '\n- ')
      .replace(/<\/li>/gi, '')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/<head>[\s\S]*?<\/head>/gi, '')
      .replace(/<style>[\s\S]*?<\/style>/gi, '')
      .replace(/<script>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();
  };
  
  /**
   * Create a reply email address with thread ID
   * @param {string} baseEmail - Base email address
   * @param {string} threadId - Thread ID to include
   * @returns {string} Reply email address with thread ID
   */
  export const createReplyAddress = (baseEmail, threadId) => {
    if (!baseEmail || !threadId) {
      return baseEmail || '';
    }
    
    // Extract username and domain
    const [username, domain] = baseEmail.split('@');
    
    // Create reply address with thread ID
    return `${username}+thread-${threadId}@${domain}`;
  };
  
  /**
   * Extract thread ID from reply email address
   * @param {string} replyEmail - Reply email address with thread ID
   * @returns {string|null} Thread ID or null if not found
   */
  export const extractThreadId = (replyEmail) => {
    if (!replyEmail) {
      return null;
    }
    
    // Extract username portion before @
    const username = replyEmail.split('@')[0];
    
    // Look for thread ID pattern
    const threadMatch = username.match(/\+thread-([a-zA-Z0-9-]+)/);
    
    return threadMatch ? threadMatch[1] : null;
  };