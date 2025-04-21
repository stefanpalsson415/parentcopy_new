// src/data/AllieKnowledgeBase.js

// src/data/AllieKnowledgeBase.js

export const knowledgeBase = {
  // Core Allie marketing messages
  marketing: {
    valueProps: [
      "85% of families report reducing workload conflicts within 4 weeks",
      "Parents save an average of 5-7 hours per week with better balance",
      "Relationship satisfaction improves by 42% on average",
      "Children benefit from seeing balanced partnership modeled"
    ],
    keyFeatures: [
      "Initial 80-question survey capturing visible and invisible tasks",
      "Weekly 20-question check-ins to track progress",
      "AI-powered task recommendations",
      "Family meeting facilitation",
      "Data-driven insights"
    ]
  },
  
// Add this new section to the knowledgeBase object in src/data/AllieKnowledgeBase.js
habits: {
  introduction: "Creating new habits is one of the most powerful ways to improve family balance. Habits are automatic behaviors that develop through repetition and are triggered by specific cues.",
  
  habitLoop: {
    cue: "A trigger that initiates the behavior.",
    routine: "The behavior itself.",
    reward: "The benefit or satisfaction received, which reinforces the behavior."
  },
  
  whyHabitsFail: [
    "Lack of clarity: Vague goals lead to inconsistent actions.",
    "Inconsistent triggers: Without reliable cues, habits don't become automatic.",
    "Absence of rewards: If the behavior doesn't feel good or show immediate benefits, motivation wanes.",
    "Overambitious goals: Trying to change too much at once leads to overwhelm.",
    "Emotional resistance: Unresolved fears or doubts sabotage progress.",
    "Environmental friction: When the environment contradicts the habit."
  ],
  
  keystoneHabits: [
    "Exercise: Improves mood, energy, sleep, and self-discipline.",
    "Healthy eating: Enhances focus, reduces inflammation, improves wellness.",
    "Daily planning: Increases productivity, reduces stress, improves time management.",
    "Gratitude journaling: Enhances optimism, resilience, and relationships."
  ],
  
  strategies: {
    cues: "Effective cues are consistent, obvious, and contextual. Types include time-based, location-based, emotional, preceding action, and people.",
    
    attractive: "Make habits attractive through temptation bundling, creating a ritual, using social motivation, and tapping into identity.",
    
    small: "Start small with the 'Two-Minute Rule' - any new habit should take less than two minutes to do at first.",
    
    repetition: "Repetition is the most important factor in forming habits. It can take anywhere from 21 to 254 days to form a habit.",
    
    rewards: "Use immediate rewards, visual progress tracking, social sharing, and emotional reflection to reinforce habits.",
    
    stacking: "Habit stacking links a new habit to an existing one using the formula: 'After [current habit], I will [new habit].'",
    
    identity: "Focus on becoming the kind of person who behaves in a certain way rather than focusing only on outcomes."
  },
  
  overcomingSetbacks: [
    "The 'Never Miss Twice' Rule: One miss is a slip; two is a pattern.",
    "Reflect on triggers: What caused the slip?",
    "Plan for barriers: Have a backup plan.",
    "Use slips as data: Not failure, but feedback.",
    "Self-compassion: Be kind to yourself and keep moving forward."
  ],
  
  familyHabits: {
    shared: "Creating shared family habits strengthens bonds and distributes responsibilities equally.",
    modelling: "Parents who model good habits help children develop their own positive routines.",
    consistency: "Consistent family routines create security and predictability for children.",
    balance: "Balanced habits ensure no one family member carries a disproportionate workload."
  }
},


  // Allie whitepaper content
  whitepapers: {
    taskCategories: {
      visibleHousehold: "Tasks like cleaning, cooking, and home maintenance that are easily observable.",
      invisibleHousehold: "Tasks like planning, scheduling, and anticipating needs that often go unrecognized.",
      visibleParental: "Direct childcare activities like driving kids, helping with homework, and attending events.",
      invisibleParental: "Emotional labor, monitoring development, and coordinating children's needs."
    },
    
    research: {
      mentalLoad: "Research shows the 'mental load' of household management falls disproportionately on women in 83% of families.",
      relationshipImpact: "Studies indicate that imbalanced household responsibilities increase relationship conflict by 67%.",
      childDevelopment: "Children who witness balanced household responsibilities are 3x more likely to establish equitable relationships as adults."
    },
    
    methodology: {
      taskWeighting: "Allie's proprietary task weighting system considers time investment, frequency, emotional labor, mental load, and child development impact.",
      improvementFramework: "Our 4-step process: measure current balance, identify high-impact areas, implement targeted tasks, and track progress over time."
    },
    
    // Child development content
    childDevelopment: {
      milestones: {
        infant: {
          physical: "Rolling over (3-6mo), Sitting up (6-9mo), Crawling (7-10mo), First steps (9-15mo)",
          cognitive: "Recognizes faces (2-3mo), Object permanence (4-7mo), Responds to name (5-8mo)",
          social: "Smiles (1-2mo), Babbling (4-6mo), First words (9-14mo), Separation anxiety (8-14mo)"
        },
        toddler: {
          physical: "Walking steadily (12-18mo), Climbing (18-24mo), Running (2-3yr), Self-feeding (18-24mo)",
          cognitive: "Follows simple instructions (1-2yr), 50+ words (2yr), Simple phrases (2-3yr)",
          social: "Parallel play (1-2yr), Beginning of sharing (2-3yr), Simple conversations (2-3yr)"
        },
        preschool: {
          physical: "Jumps, hops, pedals tricycle (3-4yr), Hand preference established (4-5yr)",
          cognitive: "Asks 'why' questions (3-4yr), Understands time concepts (4-5yr), Counts to 10 (4-5yr)",
          social: "Cooperative play (3-4yr), Dramatic play (3-5yr), Understands rules (4-5yr)"
        },
        schoolAge: {
          physical: "Rides bicycle (6-7yr), Improved coordination (7-9yr), Growing endurance (10-12yr)",
          cognitive: "Reading & writing (6-7yr), Problem-solving (8-10yr), Abstract thinking (10-12yr)",
          social: "Best friends (6-8yr), Team play (8-10yr), Peer influence grows (10-12yr)"
        },
        adolescent: {
          physical: "Puberty (girls: 8-13yr, boys: 9-14yr), Growth spurts, Increasing strength",
          cognitive: "Abstract reasoning, Planning ahead, Understanding consequences",
          social: "Identity formation, Peer group importance, Testing boundaries"
        }
      },
      
      medicalCheckups: {
        infant: {
          schedule: "Newborn (3-5 days), 1mo, 2mo, 4mo, 6mo, 9mo, 12mo",
          vaccines: "HepB, DTaP, Hib, PCV13, IPV, RV, Influenza (yearly after 6mo)",
          screenings: "Vision, hearing, development, weight/height"
        },
        toddler: {
          schedule: "15mo, 18mo, 24mo, 30mo, 36mo",
          vaccines: "MMR, Varicella, HepA, DTaP/IPV boosters",
          screenings: "Vision, hearing, speech, behavior, growth"
        },
        preschool: {
          schedule: "Annually at ages 3, 4, and 5",
          vaccines: "DTaP, IPV, MMR, Varicella (4-6yr)",
          screenings: "Vision, hearing, development, school readiness"
        },
        schoolAge: {
          schedule: "Annually from 6-12 years",
          vaccines: "Influenza annually, Tdap and HPV (11-12yr)",
          screenings: "Vision, hearing, blood pressure, BMI, scoliosis"
        },
        adolescent: {
          schedule: "Annually from 13-18 years",
          vaccines: "Tdap, MenACWY, HPV series completion",
          screenings: "Physical growth, development, mental health, risk behaviors"
        },
        dental: {
          firstVisit: "By first birthday or within 6 months of first tooth",
          frequency: "Every 6 months for checkups and cleanings"
        }
      },
      
      clothingSizes: {
        infant: "Newborn (up to 8lbs), 0-3mo (8-12lbs), 3-6mo (12-16lbs), 6-9mo (16-20lbs), 9-12mo (20-24lbs)",
        toddler: "12-18mo, 18-24mo, 2T (2 yrs), 3T (3 yrs), 4T (4 yrs), 5T (5 yrs)",
        child: "Sizes 4-16 correspond approximately to ages between 4-14",
        shoeGrowth: "Infants and toddlers may need new shoes every 3-4 months, older children every 4-6 months"
      },
      
      emotionalDevelopment: {
        infant: "Forms attachments, shows preferences for parents and caregivers",
        toddler: "Experiences separation anxiety, starts recognizing basic emotions",
        preschool: "Learns to identify emotions in self and others, develops simple empathy",
        schoolAge: "Develops emotional regulation, understands complex emotions",
        adolescent: "Forms identity, experiences intense emotions, develops coping strategies"
      },
      
      commonChallenges: {
        sleep: {
          infant: "Frequent night waking, short naps, establishing sleep routines",
          toddler: "Bedtime resistance, night terrors, transition from crib",
          preschool: "Nightmares, bedtime fears, dropping naps",
          schoolAge: "Difficulty falling asleep, tech use affecting sleep quality"
        },
        nutrition: {
          infant: "Breastfeeding issues, introducing solids, allergies",
          toddler: "Picky eating, food jags, inconsistent appetite",
          preschool: "Food refusal, preference for limited diet",
          schoolAge: "Unhealthy snacking, peer influence on food choices"
        },
        behavior: {
          infant: "Crying, colic, stranger anxiety",
          toddler: "Tantrums, defiance, negativity",
          preschool: "Testing boundaries, power struggles",
          schoolAge: "Sibling conflicts, back talk, peer issues",
          adolescent: "Risk-taking, privacy concerns, identity conflicts"
        }
      },
      
      clothingStorage: {
        organization: "Sort by size and season rather than age",
        inventory: "Keep digital photos of stored clothes for easy reference",
        timing: "Set calendar reminders to check stored clothes 1-2 months before seasonal changes",
        handmeDowns: "Label storage bins clearly with size, season, and contents",
        growth: "Children typically grow up a size every 6-12 months depending on age"
      }
    },

    // Content from the provided whitepaper on parenting strategies
    parentingStrategies: {
      positiveReinforcement: {
        summary: "Positive reinforcement, where desirable behavior is rewarded, is rooted in operant conditioning theory developed by B.F. Skinner. Behaviors followed by positive outcomes are more likely to be repeated.",
        research: "Studies show that children whose parents use positive reinforcement exhibit better behavior and academic performance. A meta-analysis of parenting interventions found that positive reinforcement significantly improves children's compliance and reduces behavioral issues.",
        application: "Balancing family responsibilities with positive recognition creates stronger engagement from all family members and reinforces desired behaviors."
      },
      
      responsibilityDevelopment: {
        summary: "Assigning appropriate responsibilities to family members is a well-documented method for teaching accountability and life skills.",
        research: "Research by White & Brigham (2017) indicates that children who regularly participate in household chores demonstrate higher self-esteem, better time management skills, and a greater sense of responsibility.",
        application: "Allie helps families distribute responsibilities equitably, ensuring all family members develop competence and autonomy through appropriate task assignments."
      },
      
      emotionalSupport: {
        summary: "Compliments and verbal praise are crucial components of emotional support, reinforcing positive behavior and fostering self-esteem.",
        research: "Studies in positive psychology demonstrate that frequent positive feedback can significantly enhance family harmony, self-esteem, and motivation for continued participation in shared responsibilities.",
        application: "Allie encourages recognition of each family member's contributions, creating a positive environment that motivates continued participation."
      },
      
      integratedApproach: {
        summary: "Integrating responsibilities, recognition, and emotional support creates a holistic approach to family management that addresses both practical and emotional needs.",
        research: "Based on Bronfenbrenner's Ecological Systems Theory, a balanced approach incorporating responsibilities and positive support ensures a nurturing and effective family environment.",
        application: "Allie's comprehensive approach addresses the complete family ecosystem, balancing practical task management with emotional well-being."
      }
    }
  },
  
  // Add child tracking FAQs
  childTrackingFaqs: {
    "How do I add a medical appointment for my child?": 
      "You can add a medical appointment by going to the Children Tracking tab, selecting your child, and clicking the '+' button in the Medical Appointments section. You can also ask me to add it for you by saying 'Add a doctor's appointment for [child] on [date]'.",
    
    "How often should my child have a checkup?": 
      "Recommended checkup schedules vary by age. Infants need checkups at 1, 2, 4, 6, 9, and 12 months. Toddlers need them at 15, 18, 24, and 30 months. Preschoolers and older children typically need annual checkups. Dental visits are recommended every 6 months after the first tooth appears.",
    
    "How do I track my child's growth?": 
      "You can record height, weight, shoe size, and clothing size in the Growth & Development section of the Children Tracking tab. It's recommended to measure height and weight quarterly for infants and biannually for older children.",
    
    "When should I size up my child's clothing?": 
      "Most children grow approximately one size every 6-12 months, but growth varies. Signs it's time to size up include: clothes feel tight, sleeves/pants are too short, or there's difficulty putting on or removing clothes. The Growth & Development section will help you track these patterns.",
    
    "How do I manage clothing hand-me-downs between siblings?": 
      "In the Children Tracking tab, record clothing sizes and seasonal information. You can set reminders for when younger siblings will likely need the next size. Label storage containers by size and season, not age, and keep a digital inventory with photos.",
    
    "How do I add an emotional check-in for my child?": 
      "Go to the Emotional Well-being section of the Children Tracking tab and click the '+' button to record your child's mood and any notes. Regular check-ins help identify patterns and support your child's emotional development.",
    
    "What homework information should I track?": 
      "Track assignment details, due dates, subject, priority level, and completion status in the Homework & Academic section. This helps manage academic responsibilities and identify subjects that may need extra support.",
    
    "How do I use voice input to add information about my child?": 
      "Click the microphone button in the chat interface and speak clearly. For example, say 'Add a dental appointment for Emma on Tuesday at 2pm' or 'Record that Jack is feeling sad today'. You can review the information before it's saved.",
    
    "How do I see upcoming events for my children?": 
      "All children's events are synchronized with the Allie Calendar. You can view them in the Calendar widget or by asking me 'What events do my kids have this week?' or 'Show me Emma's upcoming appointments'."
  },
  
  // Common questions and answers
  faqs: {
    "How do I add a task to my calendar?": 
      "You can add any Allie task to your calendar by clicking the 'Add to Calendar' button on the task card. You can also ask me to add specific tasks or meetings to your calendar by saying 'Add [task name] to my calendar' or 'Schedule the family meeting in my calendar'.",

    "Can I sync with Google Calendar?": 
      "Yes! Allie supports integration with Google Calendar, Apple Calendar, and other calendar systems through ICS file downloads. Go to Settings > Calendar to set up your preferred calendar integration.",

    "How do I set up calendar integration?": 
      "To set up calendar integration, go to Settings and select the Calendar tab. You can choose your default calendar system (Google, Apple, or ICS download) and configure specific settings for each type.",

    "How does Allie measure workload balance?": 
      "Allie uses a comprehensive 80-question initial survey that categorizes tasks across four domains, with a sophisticated weighting system that accounts for time investment, frequency, emotional labor, and mental load.",
    
    "Why do we track invisible work?": 
      "Invisible work like mental load, planning, and emotional labor often goes unrecognized but creates significant stress. Our research shows it's the most imbalanced category in 78% of families.",
    
    "How long does it take to see results?": 
      "Most families report noticeable improvements in balance within 2-4 weeks. Major shifts in satisfaction metrics typically occur around 6-8 weeks of consistent use.",
    
    "What makes Allie different from other family apps?": 
      "Allie is the only solution that combines comprehensive task measurement, invisible work tracking, AI-driven insights, and structured improvement tools in one platform. Our proprietary task weighting system is based on extensive family dynamics research.",
    
    "How does Allie support positive parenting?":
      "Allie incorporates scientifically-backed parenting strategies like positive reinforcement, responsibility development, and emotional support. Our approach is based on research showing that a balanced family environment with equitable responsibility sharing creates stronger relationships and better outcomes for children.",
    
    "What psychological principles inform Allie's approach?":
      "Allie's methodology is grounded in multiple psychological frameworks including operant conditioning (positive reinforcement), self-determination theory (autonomy and competence through responsibilities), social learning theory (modeling positive behaviors), and ecological systems theory (addressing the whole family environment)."
  }
};