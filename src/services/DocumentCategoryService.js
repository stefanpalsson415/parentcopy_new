// src/services/DocumentCategoryService.js
/**
 * Service for intelligent document categorization
 */
class DocumentCategoryService {
    constructor() {
      // Initialize category definitions with keywords and patterns
      this.categoryDefinitions = {
        medical: {
          name: 'Medical',
          icon: 'stethoscope',
          color: '#FF5252',
          keywords: [
            'doctor', 'hospital', 'clinic', 'prescription', 'medication',
            'patient', 'diagnosis', 'treatment', 'health', 'medical',
            'physician', 'pediatrician', 'referral', 'appointment',
            'healthcare', 'exam', 'test', 'results', 'lab', 'blood',
            'checkup', 'vaccine', 'immunization', 'surgery', 'specialist'
          ],
          patterns: [
            /\b(?:dr|doctor|md)\.\s+[a-z]+\b/i,
            /\bprescription\b/i,
            /\bmedical\s+record\b/i,
            /\bpatient\s+name\b/i,
            /\bdiagnosis\b/i
          ],
          subcategories: [
            'appointment', 'prescription', 'lab_results', 'medical_records',
            'insurance', 'referral', 'immunization'
          ]
        },
        school: {
          name: 'School',
          icon: 'school',
          color: '#4CAF50',
          keywords: [
            'school', 'teacher', 'classroom', 'homework', 'assignment',
            'grade', 'report card', 'test', 'exam', 'quiz', 'student',
            'education', 'class', 'lesson', 'curriculum', 'syllabus',
            'project', 'schedule', 'tutor', 'learning', 'academic',
            'semester', 'course', 'subject', 'principal', 'enrollment'
          ],
          patterns: [/\bgrade\s+([k]|[0-9]|1[0-2])\b/i, /\breport\s+card\b/i, /\bschool\s+district\b/i, /\bteacher\s*:\s*[a-z]+\b/i, /\bhomework\s+assignment\b/i],

          subcategories: [
            'homework', 'report_card', 'schedule', 'permission_slip',
            'project', 'enrollment', 'extracurricular'
          ]
        },
        financial: {
          name: 'Financial',
          icon: 'dollar-sign',
          color: '#2196F3',
          keywords: [
            'invoice', 'receipt', 'payment', 'bill', 'account',
            'statement', 'balance', 'transaction', 'tax', 'expense',
            'income', 'budget', 'credit', 'debit', 'bank', 'finance',
            'money', 'fund', 'check', 'deposit', 'withdrawal',
            'investment', 'loan', 'mortgage', 'interest', 'salary'
          ],
          patterns: [
            /\$\s*\d+(?:\.\d{2})?/,
            /\btotal\s*:\s*\$?\s*\d+/i,
            /\b(?:invoice|receipt)\s+#\s*\d+\b/i,
            /\bpayment\s+method\b/i,
            /\bdue\s+date\b/i
          ],
          subcategories: [
            'receipt', 'invoice', 'bill', 'tax', 'bank_statement',
            'budget', 'investment', 'insurance'
          ]
        },
        legal: {
          name: 'Legal',
          icon: 'file-text',
          color: '#9C27B0',
          keywords: [
            'contract', 'agreement', 'terms', 'conditions', 'legal',
            'law', 'attorney', 'court', 'document', 'license', 'permit',
            'certificate', 'authorization', 'consent', 'compliance',
            'regulation', 'policy', 'statute', 'ordinance', 'code',
            'right', 'obligation', 'party', 'signature', 'witness'
          ],
          patterns: [
            /\b(?:terms|conditions)\s+of\s+(?:service|use|agreement)\b/i,
            /\bhereby\s+agrees\b/i,
            /\blegal\s+document\b/i,
            /\bsignature\b/i,
            /\bin\s+witness\s+whereof\b/i
          ],
          subcategories: [
            'contract', 'agreement', 'certificate', 'license',
            'permit', 'identification', 'legal_notice'
          ]
        },
        event: {
          name: 'Event',
          icon: 'calendar',
          color: '#FFC107',
          keywords: [
            'invitation', 'event', 'party', 'celebration', 'ceremony',
            'wedding', 'birthday', 'anniversary', 'graduation', 'concert',
            'festival', 'occasion', 'gathering', 'rsvp', 'invitation',
            'guest', 'host', 'venue', 'date', 'time', 'location',
            'reception', 'celebration', 'entertainment', 'ticket'
          ],
          patterns: [
            /\binvit(?:e|ed|ation)\b/i,
            /\brsvp\b/i,
            /\bplease\s+join\s+us\b/i,
            /\bdate\s*:\s*\w+\s+\d+/i,
            /\btime\s*:\s*\d+\s*:\s*\d+\b/i
          ],
          subcategories: [
            'invitation', 'announcement', 'birthday', 'wedding',
            'graduation', 'party', 'ticket', 'schedule'
          ]
        },
        activity: {
          name: 'Activity',
          icon: 'activity',
          color: '#FF9800',
          keywords: [
            'schedule', 'itinerary', 'program', 'activity', 'plan',
            'agenda', 'timetable', 'roster', 'calendar', 'sport',
            'class', 'club', 'team', 'practice', 'game', 'lesson',
            'session', 'meeting', 'workshop', 'training', 'camp',
            'tournament', 'competition', 'performance', 'recital'
          ],
          patterns: [
            /\bschedule\b/i,
            /\bitinerary\b/i,
            /\bprogram\b/i,
            /\bmeeting\s+agenda\b/i,
            /\bday\s+\d+\b/i
          ],
          subcategories: [
            'sports', 'classes', 'schedule', 'program',
            'plan', 'itinerary', 'registration'
          ]
        },
        identification: {
          name: 'Identification',
          icon: 'user',
          color: '#795548',
          keywords: [
            'passport', 'license', 'id', 'identification', 'certificate',
            'card', 'document', 'birth', 'death', 'marriage', 'citizenship',
            'registration', 'social security', 'insurance', 'identity',
            'photo', 'number', 'expiration', 'issue', 'valid'
          ],
          patterns: [
            /\b(?:id|identification)\s+(?:card|number)\b/i,
            /\bdate\s+of\s+birth\b/i,
            /\bexpiration\s+date\b/i,
            /\bsocial\s+security\s+number\b/i,
            /\bissued?\s+(?:by|date)\b/i
          ],
          subcategories: [
            'id_card', 'passport', 'license', 'certificate',
            'social_security', 'insurance_card', 'registration'
          ]
        },
        other: {
          name: 'Other',
          icon: 'file',
          color: '#607D8B',
          keywords: [],
          patterns: [],
          subcategories: ['general', 'miscellaneous', 'unknown']
        }
      };
    }
  
    /**
     * Categorize a document using intelligent analysis
     * @param {Object} document - Document data with text and metadata
     * @returns {Object} Categorization result
     */
    categorizeDocument(document) {
      // Calculate scores for each category
      const scores = {};
      let highestScore = 0;
      let bestCategory = 'other';
      
      // Text to analyze - combine filename, extracted text and metadata
      const textToAnalyze = [
        document.fileName || '',
        document.extractedText || '',
        document.description || ''
      ].join(' ').toLowerCase();
      
      // Score each category based on keywords and patterns
      for (const [category, definition] of Object.entries(this.categoryDefinitions)) {
        if (category === 'other') continue; // Skip "other" for now
        
        let score = 0;
        
        // Check for keywords
        for (const keyword of definition.keywords) {
          if (textToAnalyze.includes(keyword.toLowerCase())) {
            score += 1;
          }
        }
        
        // Check for patterns
        for (const pattern of definition.patterns) {
          if (pattern.test(textToAnalyze)) {
            score += 2; // Patterns have higher weight
          }
        }
        
        // Store the score
        scores[category] = score;
        
        // Update best category if this score is higher
        if (score > highestScore) {
          highestScore = score;
          bestCategory = category;
        }
      }
      
      // If no strong match found, use "other"
      if (highestScore < 2) {
        bestCategory = 'other';
      }
      
      // Determine subcategory
      let subcategory = null;
      if (bestCategory !== 'other') {
        const subcategories = this.categoryDefinitions[bestCategory].subcategories;
        for (const sub of subcategories) {
          if (textToAnalyze.includes(sub.replace('_', ' '))) {
            subcategory = sub;
            break;
          }
        }
      }
      
      // Calculate confidence score (0-1)
      const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
      const confidence = totalScore > 0 ? highestScore / totalScore : 0;
      
      return {
        category: bestCategory,
        subcategory: subcategory,
        confidence: confidence,
        scores: scores,
        definition: this.categoryDefinitions[bestCategory]
      };
    }
  
    /**
     * Get all available categories
     * @returns {Object} Category definitions
     */
    getAllCategories() {
      return this.categoryDefinitions;
    }
  
    /**
     * Get category definition by id
     * @param {string} categoryId - Category ID
     * @returns {Object} Category definition
     */
    getCategory(categoryId) {
      return this.categoryDefinitions[categoryId] || this.categoryDefinitions.other;
    }
  
    /**
     * Suggest tags for a document based on its category and content
     * @param {Object} document - Document data
     * @param {string} category - Document category
     * @returns {Array} Suggested tags
     */
    suggestTags(document, category) {
      const suggestedTags = [category];
      const categoryDef = this.getCategory(category);
      
      // Add subcategory if available
      if (document.subcategory) {
        suggestedTags.push(document.subcategory);
      }
      
      // Add up to 3 most relevant keywords as tags
      if (document.extractedText) {
        const textLower = document.extractedText.toLowerCase();
        
        // Count keyword occurrences
        const keywordCounts = {};
        for (const keyword of categoryDef.keywords) {
          // Count occurrences
          let count = 0;
          let position = textLower.indexOf(keyword);
          while (position !== -1) {
            count++;
            position = textLower.indexOf(keyword, position + 1);
          }
          
          if (count > 0) {
            keywordCounts[keyword] = count;
          }
        }
        
        // Sort keywords by occurrence count
        const sortedKeywords = Object.entries(keywordCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([keyword]) => keyword);
        
        // Add top keywords as tags
        suggestedTags.push(...sortedKeywords.slice(0, 3));
      }
      
      // Add child name as tag if associated with a child
      if (document.childId && document.childName) {
        suggestedTags.push(document.childName);
      }
      
      // Add year if we have a date
      if (document.createdAt) {
        try {
          const date = new Date(document.createdAt);
          suggestedTags.push(date.getFullYear().toString());
        } catch (e) {
          // Ignore date parsing errors
        }
      }
      
      // Remove duplicates
      return [...new Set(suggestedTags)];
    }
  }
  
  export default new DocumentCategoryService();