// src/services/ClaudeService.js
import CalendarService from './CalendarService';
import { auth } from './firebase';

class ClaudeService {
  constructor() {
    this.proxyUrl = 'http://localhost:3001/api/claude';
    this.model = 'claude-3-sonnet-20240229'; // Using a more cost-effective model
    this.mockMode = false; // Explicitly disable mock mode
    
    console.log("Claude service initialized to use local proxy server");
  }
  
  async generateResponse(messages, context) {
    try {
      // Format system prompt with family context
      const systemPrompt = this.formatSystemPrompt(context || {});
      
      // Log for debugging
      console.log("Claude API request via proxy:", { 
        messagesCount: messages.length, 
        systemPromptLength: systemPrompt.length,
        model: this.model,
        mockMode: this.mockMode
      });
      
      // Get the last user message
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      
      // Check if this is a calendar-related request
      const calendarEventData = this.extractCalendarRequest(lastUserMessage);
      if (calendarEventData) {
        // Process the calendar request and return the response
        return this.processCalendarRequest(calendarEventData, context);
      }
      
      // Prepare request payload for Claude API
      const payload = {
        model: this.model,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: lastUserMessage
          }
        ],
        system: systemPrompt
      };
      
      // Add a timeout to the API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Make the API call through our proxy server
      console.log("Attempting to connect to proxy at:", this.proxyUrl);
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn("Claude proxy returned error status:", response.status);
        // Instead of throwing, return a personalized response
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      const result = await response.json();
      
      // Check for valid response
      if (!result || !result.content || !result.content[0]) {
        console.error("Invalid response format from Claude API:", result);
        return this.createPersonalizedResponse(lastUserMessage, context);
      }
      
      return result.content[0].text;
    } catch (error) {
      console.error("Error in Claude API call:", error);
      
      // Fall back to personalized response on failure
      return this.createPersonalizedResponse(
        messages[messages.length - 1]?.content || "", 
        context
      );
    }
  }
  
  // Extract calendar event data from user message
  extractCalendarRequest(message) {
    // Check if this is a calendar-related request
    const calendarKeywords = [
      'add to calendar', 'schedule', 'appointment', 'meeting', 'event', 
      'calendar', 'book', 'plan', 'sync', 'reminder', 'save date'
    ];
    
    const isCalendarRequest = calendarKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (!isCalendarRequest) return null;
    
    // If it's a calendar request, try to extract details
    const eventData = {
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      childName: null
    };
    
    // Simple extraction logic - in a real implementation, use NLP
    // Extract date
    const datePatterns = [
      /on\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?\w+(?:\s+\d{4})?)/i,
      /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        eventData.date = match[1];
        break;
      }
    }
    
    // Extract time
    const timePatterns = [
      /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      /(\d{1,2}(?::\d{2})?)\s*(?:hours|h)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        eventData.time = match[1];
        break;
      }
    }
    
    // Extract location
    const locationPatterns = [
      /in\s+([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)/i,
      /at\s+([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)/i,
      /location(?:\s+is)?\s+([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        eventData.location = match[1];
        break;
      }
    }
    
    // Extract title
    const titlePatterns = [
      /(?:add|create|schedule|book)\s+(?:a|an)\s+([a-z\s]+)(?:appointment|meeting|event)?/i,
      /(?:add|create|schedule|book)\s+(?:a|an)\s+([a-z\s]+)(?:for|on|at)/i,
      /(?:appointment|meeting|event)\s+(?:for|about)\s+([a-z\s]+)(?:on|at)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = message.match(pattern);
      if (match) {
        eventData.title = match[1].trim();
        break;
      }
    }
    
    // Extract child name (if present)
    const childNamePattern = /for\s+(\w+)(?:'s|\s+on|\s+at)/i;
    const childMatch = message.match(childNamePattern);
    if (childMatch) {
      eventData.childName = childMatch[1];
    }
    
    // Clean up and validate extracted data
    if (eventData.title && (eventData.date || eventData.time)) {
      return eventData;
    }
    
    return null;
  }
  
  // Process calendar request and add event to calendar
  async processCalendarRequest(eventData, context) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return "I need you to be logged in to add events to your calendar. Please log in and try again.";
      }
      
      // Parse date and time
      let eventDate;
      if (eventData.date) {
        // Try to parse date string
        eventDate = new Date(eventData.date);
        // If date is invalid, try a more flexible approach
        if (isNaN(eventDate)) {
          const dateStr = eventData.date.replace(/(st|nd|rd|th)/, '');
          eventDate = new Date(dateStr);
        }
      } else {
        // Default to tomorrow if no date provided
        eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);
      }
      
      // Set time if provided
      if (eventData.time) {
        // Parse time string (e.g., "3:00 PM", "14:00", "2pm")
        const timeStr = eventData.time.toLowerCase();
        const hour12Match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
        const hour24Match = timeStr.match(/(\d{1,2})(?::(\d{2}))?/);
        
        if (hour12Match) {
          // 12-hour format
          let hours = parseInt(hour12Match[1]);
          const minutes = hour12Match[2] ? parseInt(hour12Match[2]) : 0;
          const ampm = hour12Match[3];
          
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          
          eventDate.setHours(hours, minutes, 0, 0);
        } else if (hour24Match) {
          // 24-hour format
          const hours = parseInt(hour24Match[1]);
          const minutes = hour24Match[2] ? parseInt(hour24Match[2]) : 0;
          
          eventDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default to noon
          eventDate.setHours(12, 0, 0, 0);
        }
      } else {
        // Default to noon if no time provided
        eventDate.setHours(12, 0, 0, 0);
      }
      
      // Create end time (1 hour after start)
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 1);
      
      // Create calendar event object
      const event = {
        summary: eventData.title || 'New Event',
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: true
        }
      };
      
      // Add event to calendar
      const result = await CalendarService.addEvent(event, currentUser.uid);
      
      // Format response
      if (result && result.success) {
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const formattedTime = eventDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit'
        });
        
        let response = `I've added the following event to your family's shared calendar:\n\n`;
        response += `Event: ${eventData.title || 'New Event'}\n`;
        response += `Date: ${formattedDate}\n`;
        response += `Time: ${formattedTime}\n`;
        
        if (eventData.location) {
          response += `Location: ${eventData.location}\n`;
        }
        
        response += `\nThis has been added to your family's shared calendar. I've marked it as an upcoming task`;
        
        if (eventData.childName) {
          response += ` for ${eventData.childName}`;
        }
        
        response += `. Let me know if you need anything else!`;
        
        return response;
      } else {
        return "I tried to add the event to your calendar, but encountered an issue. Please try again or add it manually through the calendar widget.";
      }
    } catch (error) {
      console.error("Error processing calendar request:", error);
      return "I wasn't able to process your calendar request due to a technical issue. You can try again or add the event directly through the calendar widget.";
    }
  }
  
  // Test Hello World function
  async testHelloWorld() {
    try {
      console.log("Testing Hello World function via proxy...");
      
      // Simple test to check API connectivity through proxy
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: "Say hello world!"
            }
          ],
          system: "You are a helpful assistant that responds with just 'Hello World!'"
        })
      });
      
      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        message: "Claude API connection via proxy successful!",
        content: result.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Detailed error in Hello World test:", error);
      throw error;
    }
  }
  
  // Create personalized response from context
  createPersonalizedResponse(userMessage, context) {
    const userMessageLower = userMessage.toLowerCase();
    
    // Get family name
    const familyName = context.familyName || "your family";
    
    // Try to give responses based on actual data
    if (userMessageLower.includes("survey") || userMessageLower.includes("result")) {
      if (context.surveyData && context.surveyData.mamaPercentage) {
        return `Based on your family's survey data, Mama is currently handling about ${context.surveyData.mamaPercentage.toFixed(1)}% of tasks overall, while Papa is handling ${(100 - context.surveyData.mamaPercentage).toFixed(1)}%. Would you like me to break this down by category?`;
      }
    }
    
    if (userMessageLower.includes("task") || userMessageLower.includes("what") && userMessageLower.includes("do")) {
      if (context.tasks && context.tasks.length > 0) {
        const pendingTasks = context.tasks.filter(t => !t.completed);
        if (pendingTasks.length > 0) {
          return `The ${familyName} family currently has ${pendingTasks.length} pending tasks. The next task due is "${pendingTasks[0].title}" assigned to ${pendingTasks[0].assignedTo}. Would you like more details about this task?`;
        }
      }
    }
    
    if (userMessageLower.includes("balance") || userMessageLower.includes("imbalance")) {
      if (context.balanceScores && context.balanceScores.categoryBalance) {
        const mostImbalanced = Object.entries(context.balanceScores.categoryBalance)
          .sort((a, b) => b[1].imbalance - a[1].imbalance)[0];
        
        if (mostImbalanced) {
          return `The greatest imbalance in the ${familyName} family is in ${mostImbalanced[0]}, with a ${mostImbalanced[1].imbalance.toFixed(1)}% difference. ${mostImbalanced[1].mama > mostImbalanced[1].papa ? "Mama" : "Papa"} is currently handling most of these tasks.`;
        }
      }
    }
    
    // If we can't give a specific response based on data, default to something generic but personalized
    return `I have access to the ${familyName} family's data and can answer specific questions about your survey results, tasks, and balance metrics. What would you like to know?`;
  }
  
  // Format system prompt with family context
 // Update to formatSystemPrompt method in ClaudeService.js

formatSystemPrompt(familyContext) {
  // Log the context data for debugging
  console.log("Formatting system prompt with context:", Object.keys(familyContext));
  
  // Get knowledge base if available
  const kb = familyContext.knowledgeBase || {};
  
  // Current date and time information for Claude
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Create knowledge base section
  let knowledgeBaseContent = '';
  if (kb.whitepapers) {
    knowledgeBaseContent = `
    === ALLIE KNOWLEDGE BASE ===
    
    TASK CATEGORIES:
    - Visible Household: ${kb.whitepapers.taskCategories?.visibleHousehold || ''}
    - Invisible Household: ${kb.whitepapers.taskCategories?.invisibleHousehold || ''}
    - Visible Parental: ${kb.whitepapers.taskCategories?.visibleParental || ''}
    - Invisible Parental: ${kb.whitepapers.taskCategories?.invisibleParental || ''}
    
    RESEARCH FINDINGS:
    - Mental Load: ${kb.whitepapers.research?.mentalLoad || ''}
    - Relationship Impact: ${kb.whitepapers.research?.relationshipImpact || ''}
    - Child Development: ${kb.whitepapers.research?.childDevelopment || ''}
    
    METHODOLOGY:
    - Task Weighting: ${kb.whitepapers.methodology?.taskWeighting || ''}
    - Improvement Framework: ${kb.whitepapers.methodology?.improvementFramework || ''}

    Calendar Integration Knowledge:
Allie supports calendar integration with:
1. Google Calendar - requires sign-in through settings
2. Apple Calendar - available on macOS devices 
3. ICS downloads - works with any calendar system

IMPORTANT: You HAVE a calendar system in this app. When users ask about adding something to their calendar, you should:
1. Extract the event details (title, date, time, location)
2. Offer to add it to their calendar
3. Confirm when it's been added successfully
4. NEVER say you don't have a calendar system or don't know the date

When asked about dates or calendar requests, remember you ARE able to handle calendar functionality through the app's built-in calendar service.
    
    PARENTING STRATEGIES:
    1. Positive Reinforcement: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.research || ''}
    
    2. Responsibility Development: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.research || ''}
    
    3. Emotional Support: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.research || ''}
    
    4. Integrated Approach: ${kb.whitepapers.parentingStrategies?.integratedApproach?.summary || ''}
       Research shows: ${kb.whitepapers.parentingStrategies?.integratedApproach?.research || ''}
    `;
  }
  
  // Create FAQ section if available
  let faqContent = '';
  if (kb.faqs) {
    faqContent = '\n=== FREQUENTLY ASKED QUESTIONS ===\n';
    Object.entries(kb.faqs).forEach(([question, answer]) => {
      faqContent += `Q: ${question}\nA: ${answer}\n\n`;
    });
  }
  
  // Add marketing statements if available
  let marketingContent = '';
  if (kb.marketing) {
    marketingContent = '\n=== KEY BENEFITS ===\n';
    if (kb.marketing.valueProps) {
      kb.marketing.valueProps.forEach(prop => {
        marketingContent += `- ${prop}\n`;
      });
    }
  }
  
  // Create relationship strategies section
  let relationshipContent = '';
  if (familyContext.relationshipData) {
    relationshipContent = `
    === RELATIONSHIP STRATEGIES ===
    
    These 10 key relationship strategies strengthen the parental bond:
    1. Brief Daily Check-ins: 5-10 minutes of connection each day
    2. Divide and Conquer Tasks: Clear role assignment for responsibilities
    3. Regular Date Nights: Dedicated couple time at least monthly
    4. Practice Gratitude & Affirmation: Regular appreciation expressions
    5. Create a Unified Family Calendar: Shared scheduling system
    6. Collaborative Problem-Solving: Structured approach to challenges
    7. Prioritize Self-Care: Ensuring "me time" for each parent
    8. Consider Couples Workshops: Professional guidance when needed
    9. Celebrate Milestones Together: Acknowledging achievements
    10. Shared Future Planning: Joint vision for family direction
    
    Current Implementation Status:
    - Average implementation: ${familyContext.relationshipData.avgImplementation?.toFixed(0) || 0}%
    - Most implemented strategy: ${familyContext.relationshipData.topStrategy || 'None'}
    - Number of well-implemented strategies: ${familyContext.relationshipData.implementedStrategies?.length || 0}
    `;
    
    if (familyContext.coupleData && familyContext.coupleData.satisfaction) {
      relationshipContent += `
    Latest Couple Data:
    - Satisfaction level: ${familyContext.coupleData.satisfaction}/5
    - Communication quality: ${familyContext.coupleData.communication}/5
    `;
    }
  }
  

// Add this to the existing knowledgeBaseContent
const childDevelopmentContent = `
=== CHILD DEVELOPMENT KNOWLEDGE BASE ===

AGE-APPROPRIATE MILESTONES:
Infant (0-12 months):
- Physical: Rolling over (3-6mo), Sitting up (6-9mo), Crawling (7-10mo), First steps (9-15mo)
- Cognitive: Recognizes faces (2-3mo), Object permanence (4-7mo), Responds to name (5-8mo)
- Social: Smiles (1-2mo), Babbling (4-6mo), First words (9-14mo), Separation anxiety (8-14mo)

Toddler (1-3 years):
- Physical: Walking steadily (12-18mo), Climbing (18-24mo), Running (2-3yr), Self-feeding (18-24mo)
- Cognitive: Follows simple instructions (1-2yr), 50+ words (2yr), Simple phrases (2-3yr)
- Social: Parallel play (1-2yr), Beginning of sharing (2-3yr), Simple conversations (2-3yr)

Preschool (3-5 years):
- Physical: Jumps, hops, pedals tricycle (3-4yr), Hand preference established (4-5yr)
- Cognitive: Asks "why" questions (3-4yr), Understands time concepts (4-5yr), Counts to 10 (4-5yr)
- Social: Cooperative play (3-4yr), Dramatic play (3-5yr), Understands rules (4-5yr)

School-Age (6-12 years):
- Physical: Rides bicycle (6-7yr), Improved coordination (7-9yr), Growing endurance (10-12yr)
- Cognitive: Reading & writing (6-7yr), Problem-solving (8-10yr), Abstract thinking (10-12yr)
- Social: Best friends (6-8yr), Team play (8-10yr), Peer influence grows (10-12yr)

Adolescent (13-18 years):
- Physical: Puberty (girls: 8-13yr, boys: 9-14yr), Growth spurts, Increasing strength
- Cognitive: Abstract reasoning, Planning ahead, Understanding consequences
- Social: Identity formation, Peer group importance, Testing boundaries

HEALTH CHECKUPS SCHEDULE:
Infant:
- Newborn checkup: 3-5 days old
- Well-baby visits: 1mo, 2mo, 4mo, 6mo, 9mo, 12mo
- Recommended vaccines: HepB, DTaP, Hib, PCV13, IPV, RV, Influenza (yearly after 6mo)

Toddler:
- Well-child visits: 15mo, 18mo, 24mo, 30mo, 36mo
- Recommended vaccines: MMR, Varicella, HepA, DTaP, IPV boosters
- Dental checkups: First visit by age 1, then every 6 months

Preschool:
- Well-child visits: Annually
- Vision screening: 3-5 years
- Hearing screening: 4-5 years
- Dental checkups: Every 6 months

School-Age:
- Well-child visits: Annually
- Vision & hearing screenings: Every 1-2 years
- Dental checkups: Every 6 months
- Sports physicals: As needed for activities

Adolescent:
- Well-teen visits: Annually
- HPV vaccine: 11-12 years
- Tdap booster: 11-12 years
- MenACWY: 11-12 years, booster at 16
- Mental health screening: Annually

COMMON PARENTING CHALLENGES BY AGE:
Infant:
- Sleep patterns
- Feeding issues
- Crying and colic
- Teething discomfort

Toddler:
- Tantrums and emotional regulation
- Picky eating
- Toilet training
- Separation anxiety

Preschool:
- Sibling rivalry
- Bedtime resistance
- Imaginary friends
- Questions about sensitive topics

School-Age:
- School adjustment
- Friendship challenges
- Screen time management
- Extracurricular balance

Adolescent:
- Privacy boundaries
- Academic pressure
- Social media concerns
- Identity exploration

CLOTHING SIZE GUIDELINES:
- Infants: Sizes based on months (0-3mo, 3-6mo, 6-9mo, 9-12mo)
- Toddlers: Sizes 2T-5T correspond roughly to ages 2-5
- Children: Sizes 4-16 (often matches age between 4-8, then varies)
- Shoe sizes: Typically increase by 0.5-1 size every 6mo for infants/toddlers, every year for older children

EDUCATIONAL DEVELOPMENT:
Infant:
- Sensory stimulation
- Language exposure
- Simple cause-effect toys

Toddler:
- Basic concepts (colors, shapes, body parts)
- Simple counting
- Fine motor skills development

Preschool:
- Letter and number recognition
- Basic writing skills
- Pretend play and storytelling

School-Age:
- Grade K-2: Learning to read
- Grade 3-5: Reading to learn
- Grade 6-8: Critical thinking

EMOTIONAL INTELLIGENCE DEVELOPMENT:
Infant:
- Recognizing emotional responses
- Forming secure attachments

Toddler:
- Identifying basic emotions
- Beginning emotional regulation

Preschool:
- Labeling complex emotions
- Simple conflict resolution

School-Age:
- Empathy development
- Self-regulation strategies
- Understanding others' perspectives

Adolescent:
- Identity and values formation
- Complex emotional management
- Healthy relationship skills

TRACKING TIPS FOR PARENTS:
- Growth Patterns: Record height/weight quarterly for infants, bi-annually for older children
- Developmental Milestones: Note when major skills are achieved
- Medical History: Keep vaccination records, illness patterns, medication responses
- School Progress: Save report cards, teacher feedback, test results
- Emotional Patterns: Track triggers for behavioral challenges, successful coping strategies
- Social Development: Note friendship patterns, extracurricular interests

CHILDREN'S CLOTHING STORAGE TIPS:
- Label storage containers by size, not age
- Note the season on storage containers (e.g., "Size 4T - Summer")
- Keep a digital inventory of stored clothes with photos
- Set calendar reminders to check storage 1-2 months before seasonal changes
- Consider vertical organization systems where you can see all sizes at once
- Keep a "grow-into" box accessible for items that will fit soon
`;

// Add this to the existing knowledgeBaseContent
knowledgeBaseContent += childDevelopmentContent;
  

  // Create a context-rich system prompt
  return `You are Allie, an AI assistant specialized in family workload balance. 
  Your purpose is to help families distribute responsibilities more equitably and improve their dynamics.
  
  Today's date is ${formattedDate}.
  Current time: ${currentDate.toLocaleTimeString()}.
  
  Family Information:
  Family Name: ${familyContext.familyName || 'Unknown'}
  Number of Adults: ${familyContext.adults || 2}
  Number of Children: ${familyContext.children?.length || 0}
  Current Week: ${familyContext.currentWeek || 1}
  Family ID: ${familyContext.familyId || 'Unknown'}
  
  ${familyContext.familyMembers ? `
  Family Members:
  ${familyContext.familyMembers.map(m => `- ${m.name}: ${m.role} (${m.roleType || 'Child'})`).join('\n')}
  ` : ''}
  
  ${familyContext.surveyData ? `
  Survey Data:
  Total Questions: ${familyContext.surveyData.totalQuestions || 0}
  Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
  Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%
  
  Category Breakdown:
  ${Object.entries(familyContext.surveyData.categories || {}).map(([category, data]) => 
    `- ${category}: Mama ${data.mamaPercent?.toFixed(1) || 0}%, Papa ${data.papaPercent?.toFixed(1) || 0}%`
  ).join('\n')}
  ` : ''}
  
  ${familyContext.tasks && familyContext.tasks.length > 0 ? `
  Current Tasks:
  ${familyContext.tasks.map(task => 
    `- "${task.title}" assigned to ${task.assignedTo} (${task.completed ? 'Completed' : 'Pending'}): ${task.description}`
  ).join('\n')}
  ` : ''}
  
  ${familyContext.impactInsights && familyContext.impactInsights.length > 0 ? `
  Family Insights:
  ${familyContext.impactInsights.map(insight => 
    `- ${insight.type || 'Insight'} for ${insight.category || 'Family'}: ${insight.message}`
  ).join('\n')}
  ` : ''}
  
  ${familyContext.balanceScores ? `
  Current Balance Scores:
  - Overall Balance: Mama ${familyContext.balanceScores.overallBalance?.mama?.toFixed(1) || 50}%, Papa ${familyContext.balanceScores.overallBalance?.papa?.toFixed(1) || 50}%
  ${Object.entries(familyContext.balanceScores.categoryBalance || {}).map(([category, scores]) => 
    `- ${category}: Mama ${scores.mama?.toFixed(1) || 0}%, Papa ${scores.papa?.toFixed(1) || 0}%, Imbalance: ${scores.imbalance?.toFixed(1) || 0}%`
  ).join('\n')}
  ` : ''}
  
  ${knowledgeBaseContent}
  
  ${relationshipContent}
  
  ${marketingContent}
  
  ${faqContent}
  
  ${familyContext.surveyData && familyContext.surveyData.responses ? `
  IMPORTANT: You have access to detailed survey responses for this family. When asked about specific tasks or categories, reference this data to provide personalized insights rather than general information.
  ` : ''}
  
  You can help with:
  1. Explaining how to use the Allie app
  2. Providing insights about family survey results
  3. Offering research-backed parenting advice
  4. Suggesting ways to improve family balance
  5. Answering questions about the app's mission and methodology
  6. Giving relationship advice based on the 10 strategies
  7. Connecting workload balance to relationship health
  8. Adding tasks and meetings to calendars
  9. Managing calendar integrations
  10. Analyzing their specific survey data and tasks
  
  Always be supportive, practical, and focused on improving family dynamics through better balance.
  Remember that all data is confidential to this family.
  
  In your responses:
  - Be concise but friendly
  - Provide practical, actionable advice whenever possible
  - Focus on equity and balance rather than "traditional" gender roles
  - Remember that "balance" doesn't always mean a perfect 50/50 split
  - Encourage communication between family members
  - When mentioning research or scientific findings, refer to the studies in the knowledge base
  - Suggest appropriate relationship strategies when workload issues arise`;
}
}

export default new ClaudeService();