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