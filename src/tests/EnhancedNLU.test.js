// src/tests/EnhancedNLU.test.js
import EnhancedNLU from '../services/EnhancedNLU';

// Create instance
const nlu = new EnhancedNLU();

// Test intent detection
console.log("==== TESTING INTENT DETECTION ====");
const intentTests = [
  "Add a dentist appointment to my calendar on Wednesday at 2pm",
  "Schedule a date night with my partner on Friday evening",
  "I need to track my child's height and weight",
  "Can you show me all the tasks assigned to Papa?",
  "How is the workload balance in our family?",
  "I'm feeling overwhelmed with all my responsibilities"
];

intentTests.forEach(text => {
  const intent = nlu.detectIntent(text);
  console.log(`Text: "${text}"\nDetected Intent: ${intent}\n`);
});

// Test entity extraction
console.log("\n==== TESTING ENTITY EXTRACTION ====");
const entityTests = [
  "Schedule a meeting with Dr. Smith at Northwest Medical Center on May 15th at 3:30pm",
  "Add a parent-teacher conference for Emma on next Thursday at 4pm",
  "I want to record that Jack is feeling sad today",
  "Plan a dinner date at Olive Garden with my wife on Saturday at 7pm"
];

entityTests.forEach(text => {
  const entities = nlu.extractEntities(text);
  console.log(`Text: "${text}"\nExtracted Entities:`, JSON.stringify(entities, null, 2), "\n");
});

// Test event details extraction
console.log("\n==== TESTING EVENT DETAILS EXTRACTION ====");
const eventTests = [
  "Add a dentist appointment for Emma on Tuesday at 2pm",
  "Schedule a team meeting next Monday at 10am at the office",
  "Create a reminder for soccer practice tomorrow at 4pm",
  "Plan a date night with my wife on Friday at 7pm at The Cheesecake Factory"
];

const familyMembers = [
  { name: "Emma", role: "child", age: 7 },
  { name: "Jack", role: "child", age: 5 },
  { name: "Kate", role: "parent", roleType: "Mama" },
  { name: "Mike", role: "parent", roleType: "Papa" }
];

eventTests.forEach(text => {
  const eventDetails = nlu.extractEventDetails(text, familyMembers);
  console.log(`Text: "${text}"\nExtracted Event Details:`, JSON.stringify(eventDetails, null, 2), "\n");
});

// Test child tracking details extraction
console.log("\n==== TESTING CHILD TRACKING DETAILS EXTRACTION ====");
const childTrackingTests = [
  "Track Emma's height as 4 feet 2 inches",
  "Add a dental checkup for Jack on June 15th at 1pm",
  "Record that Emma is feeling happy today after her school performance",
  "Add Jack's math homework due on Friday"
];

childTrackingTests.forEach(text => {
  const trackingDetails = nlu.extractChildTrackingDetails(text, familyMembers);
  console.log(`Text: "${text}"\nExtracted Child Tracking Details:`, JSON.stringify(trackingDetails, null, 2), "\n");
});

// Test task details extraction
console.log("\n==== TESTING TASK DETAILS EXTRACTION ====");
const taskTests = [
  "Add a task to clean the kitchen assigned to Papa",
  "Mark the 'pick up kids from school' task as complete",
  "Reassign the grocery shopping task to Mama",
  "What tasks are due this week?"
];

const familyContext = {
  tasks: [
    { id: "task1", title: "Pick up kids from school", assignedTo: "Mama", completed: false },
    { id: "task2", title: "Grocery shopping", assignedTo: "Papa", completed: false },
    { id: "task3", title: "Prepare dinner", assignedTo: "Mama", completed: true }
  ]
};

taskTests.forEach(text => {
  const taskDetails = nlu.extractTaskDetails(text, familyContext);
  console.log(`Text: "${text}"\nExtracted Task Details:`, JSON.stringify(taskDetails, null, 2), "\n");
});

// Test survey question extraction
console.log("\n==== TESTING SURVEY QUESTION EXTRACTION ====");
const surveyTests = [
  "What's the overall workload balance in our family?",
  "How is the division of Invisible Household Tasks?",
  "Who handles the cooking in our family?",
  "What's the comparison between visible and invisible work?"
];

surveyTests.forEach(text => {
  const surveyQuestion = nlu.extractSurveyQuestion(text);
  console.log(`Text: "${text}"\nExtracted Survey Question:`, JSON.stringify(surveyQuestion, null, 2), "\n");
});

// Test relationship event extraction
console.log("\n==== TESTING RELATIONSHIP EVENT EXTRACTION ====");
const relationshipTests = [
  "Schedule a date night on Friday at 7pm",
  "Add a couple check-in for tomorrow evening",
  "Plan a relationship meeting for Saturday afternoon",
  "Book a dinner reservation with my husband on Thursday at 8pm"
];

relationshipTests.forEach(text => {
  const relationshipEvent = nlu.extractRelationshipEventDetails(text);
  console.log(`Text: "${text}"\nExtracted Relationship Event:`, JSON.stringify(relationshipEvent, null, 2), "\n");
});

console.log("EnhancedNLU tests completed!");