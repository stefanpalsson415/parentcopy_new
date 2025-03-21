import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Lock, Brain, Zap, Shield, 
  ArrowRight, Calendar, Heart, Star, BarChart, 
  Users, Check, Clock, Search, List, AlertTriangle,
  RefreshCw, Code, BookOpen, Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AIAssistantPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-['Roboto']">
      {/* Header/Nav */}
      <header className="px-6 py-4 border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-light cursor-pointer" onClick={() => navigate('/')}>Allie</h1>
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => navigate('/how-it-works')}
              className="text-gray-800 hover:text-gray-600"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate('/about-us')}
              className="text-gray-800 hover:text-gray-600"
            >
              About Us
            </button>
            <button 
              onClick={() => navigate('/relationship-features')}
              className="text-gray-800 hover:text-gray-600"
            >
              Relationship Features
            </button>
            <button 
              onClick={() => navigate('/ai-assistant')}
              className="text-black font-medium border-b-2 border-black"
            >
              AI Assistant
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-800 hover:text-gray-600"
            >
              Blog
            </button>
            
            {currentUser ? (
              <button 
                onClick={() => navigate('/login', { state: { directAccess: true, fromLanding: true } })}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Jump Back In
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100"
                >
                  Log In
                </button>
                <button 
                  onClick={() => navigate('/onboarding')}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-6">Meet Allie, Your Family AI Assistant</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            The intelligent, always-available helper that learns your family's needs and provides personalized support
          </p>
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Try Allie Now
            </button>
          </div>
        </div>
      </section>
      
      {/* Introduction to Allie */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block p-2 bg-purple-100 rounded-lg mb-4">
                <MessageSquare className="text-purple-600" size={24} />
              </div>
              <h2 className="text-3xl font-light mb-6">Your Always-Available Family Assistant</h2>
              <p className="text-lg mb-4 font-light">
                Allie is more than just a chat interface—it's a comprehensive AI assistant built specifically for families seeking better balance and stronger relationships.
              </p>
              <p className="text-lg mb-4 font-light">
                Available 24/7 in a convenient chat widget, Allie understands your family's unique dynamics and provides personalized support when you need it.
              </p>
              <p className="text-lg font-light">
                Unlike generic AI assistants, Allie has access to your family's survey data, task history, and relationship insights—making every suggestion tailored to your specific situation.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Brain className="text-blue-600 mr-2" size={24} />
                Powered by Claude AI
              </h3>
              <p className="text-gray-600 mb-4">
                Allie is built on Claude, one of the world's most sophisticated and responsible AI systems:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Star className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">State-of-the-Art Intelligence</p>
                    <p className="text-sm text-gray-600">
                      Claude offers human-like understanding and nuanced responses to complex questions
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Shield className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Designed for Safety</p>
                    <p className="text-sm text-gray-600">
                      Built with constitutional AI techniques to ensure helpful, harmless responses
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                    <Zap className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">Enhanced with Family Expertise</p>
                    <p className="text-sm text-gray-600">
                      We've augmented Claude with specialized knowledge in family dynamics, relationships, and workload balance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Privacy and Safety */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-green-100 rounded-lg mb-4">
              <Lock className="text-green-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Privacy & Safety by Design</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Your family's data is sacred. That's why we've built Allie with privacy as our highest priority.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Shield className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Private by Default</h3>
              <p className="text-gray-600 text-sm">
                All conversations with Allie stay within your family account and are never shared with other users.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "Allie keeps your family's data completely private. No data is ever shared outside your family account."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Database className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Secure Data Storage</h3>
              <p className="text-gray-600 text-sm">
                Your family's information is encrypted and stored using enterprise-grade security protocols.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "We use the same level of encryption that banks use to protect sensitive financial information."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <AlertTriangle className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-lg mb-2">Child-Safe Design</h3>
              <p className="text-gray-600 text-sm">
                Parents can control children's access to Allie, and all content is filtered for child-appropriate responses.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                "Allie is designed to be safe for the whole family, with parental controls for children's access."
              </p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <h3 className="text-xl font-medium mb-4 flex items-center">
              <Lock className="text-black mr-2" size={24} />
              Our Privacy Commitment
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">No Data Sharing or Selling</span> — Your family's data is never sold, shared, or used to train public AI models
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Localized Learning</span> — Allie only learns from your family's data to provide personalized support
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Data Minimization</span> — We only collect the information necessary to provide our service
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Transparency</span> — Clear explanations of how your data is used and protected
                </p>
              </div>
              <div className="flex items-start">
                <div className="mt-0.5 mr-3">
                  <Check className="text-green-600" size={20} />
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">Access Control</span> — You decide who in your family can interact with Allie
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* What Allie Can Do */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
              <Zap className="text-blue-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">What You Can Ask Allie</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Allie is designed to support every aspect of family balance and relationship health
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Brain className="text-purple-600 mr-2" size={24} />
                About Your Family's Data
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What does our survey data show about the mental load balance in our family?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What tasks do I need to complete this week and why were they chosen?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"How has our family balance improved since we started using Allie?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What interesting things did my kids say in their surveys that I could connect with them about?"</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Heart className="text-pink-600 mr-2" size={24} />
                Relationship Guidance
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What's one thing I could do today to make my partner feel more appreciated?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"How can we improve our communication about household responsibilities?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What's the research behind the mental load and how it affects relationships?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Can you help me plan a meaningful date night this weekend?"</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <Calendar className="text-blue-600 mr-2" size={24} />
                Calendar & Scheduling Help
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Add our weekly family meeting to my Google Calendar for Sunday at 7pm."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Schedule a reminder for my meal planning task on Thursday afternoon."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Help me create a balanced weekly schedule that includes self-care time."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"How do I connect my Apple Calendar to Allie for automatic task scheduling?"</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-6 flex items-center">
                <BookOpen className="text-green-600 mr-2" size={24} />
                Learning & Using Allie
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"How does Allie's task weighting system work?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What can I do to get the most value from my weekly check-ins?"</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"Explain the 10 relationship strategies Allie helps us implement."</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-600 text-sm italic">"What's the difference between visible and invisible parental tasks?"</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black text-white p-8 rounded-lg">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mr-4 flex-shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">Ask Allie Anything</h3>
                <p className="text-gray-300 mb-4">
                  Allie is constantly learning from your family's unique situation. The more you interact with Allie, the more personalized and helpful its responses become.
                </p>
                <p className="text-white font-medium mb-4">
                  Simply type your question in the chat box at the bottom right of your screen, anytime you're logged in.
                </p>
                <div className="mt-4 bg-white bg-opacity-10 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 italic">
                    "At first, I was skeptical about another AI assistant, but Allie truly understands our family situation. It's like having a family coach in my pocket, and the insights about our survey data are eye-opening." — Lisa, mother of two
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How Allie Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-amber-100 rounded-lg mb-4">
              <Code className="text-amber-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">How Allie Works</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              The technology behind your personalized family AI assistant
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-12">
            <h3 className="text-xl font-medium mb-6">The Technology Stack</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Brain className="text-purple-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Claude AI Core</h4>
                <p className="text-sm text-gray-600">
                  Allie is built on Anthropic's Claude, one of the world's most advanced AI models, providing natural conversation and insightful responses.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Database className="text-blue-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Family Knowledge Base</h4>
                <p className="text-sm text-gray-600">
                  Your family's data—survey responses, task history, relationship metrics—creates a personalized knowledge base for truly tailored insights.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-green-600" size={24} />
                </div>
                <h4 className="font-medium mb-2">Secure Architecture</h4>
                <p className="text-sm text-gray-600">
                  Built with a privacy-first approach, Allie keeps your data secure through encrypted connections and strict access controls.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <RefreshCw className="text-blue-600 mr-2" size={24} />
                The Learning Cycle
              </h3>
              <p className="text-gray-600 mb-4">
                Allie gets smarter with each interaction through our proprietary learning cycle:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">1</div>
                  <div className="text-sm">
                    <span className="font-medium">Data Collection</span>
                    <p className="text-gray-600">As your family completes tasks and check-ins, Allie gathers valuable context</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">2</div>
                  <div className="text-sm">
                    <span className="font-medium">Pattern Recognition</span>
                    <p className="text-gray-600">The AI identifies what works for your specific family situation</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">3</div>
                  <div className="text-sm">
                    <span className="font-medium">Enhanced Recommendations</span>
                    <p className="text-gray-600">Each new cycle delivers more personalized suggestions</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 text-sm font-bold">4</div>
                  <div className="text-sm">
                    <span className="font-medium">Feedback Integration</span>
                    <p className="text-gray-600">Your interactions with Allie help it better understand your preferences</p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <BarChart className="text-purple-600 mr-2" size={24} />
                How Allie Learns from Your Family
              </h3>
              <p className="text-gray-600 mb-4">
                Allie's AI engine improves over time by analyzing:
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Search size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Task Effectiveness</span>
                    <p className="text-gray-600">Which task recommendations lead to the most significant balance improvements</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Heart size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Relationship Impact</span>
                    <p className="text-gray-600">How different balance changes affect relationship satisfaction</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Family Preferences</span>
                    <p className="text-gray-600">Which advice resonates most with your specific family dynamics</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <List size={16} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Question Patterns</span>
                    <p className="text-gray-600">What topics your family finds most helpful or important</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-8 rounded-lg text-white">
            <h3 className="text-xl font-medium mb-4">Continuous Improvement</h3>
            <p className="mb-4">
              Just like your family evolves, so does Allie. Through our unique cycle system, Allie becomes more personalized and helpful with every interaction.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} />
                </div>
                <p className="text-sm text-center">
                  Every completed week adds valuable context about your family dynamics
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Brain size={20} />
                </div>
                <p className="text-sm text-center">
                  Each conversation helps Allie better understand your specific needs
                </p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-white text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Zap size={20} />
                </div>
                <p className="text-sm text-center">
                  Regular updates bring new capabilities and enhanced understanding
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Kids & AI Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block p-2 bg-pink-100 rounded-lg mb-4">
              <Users className="text-pink-600" size={24} />
            </div>
            <h2 className="text-3xl font-light mb-4">Allie for Kids</h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Helping children understand and participate in family balance while learning about AI
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div className="bg-gradient-to-br from-pink-50 to-blue-50 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-4">What is AI? (A Kid-Friendly Explanation)</h3>
              <p className="text-gray-700 mb-4">
                Imagine if a computer could learn things like you do, but much faster. That's what artificial intelligence (AI) is—a computer brain that can learn, understand, and help with things.
              </p>
              <p className="text-gray-700 mb-4">
                Allie is an AI assistant that learns about your family and helps everyone work together better. It's like having a really smart helper who remembers everything about how your family likes to do things.
              </p>
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-600">Things Kids Can Ask Allie:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </div>
                    <span>"Can you help me understand what my family survey showed?"</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </div>
                    <span>"What are some ways I can help my family this week?"</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </div>
                    <span>"Can you explain what 'mental load' means?"</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </div>
                    <span>"How do other families share responsibilities?"</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-4">For Parents: Talking to Kids About AI</h3>
              <p className="text-gray-600 mb-4">
                Allie provides a safe, controlled introduction to AI technology for children. Here's how to make it a positive learning experience:
              </p>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-medium mb-1 text-pink-600">Safety & Boundaries</h4>
                  <p className="text-sm text-gray-600">
                    Allie has built-in safeguards for child-appropriate content. Parents can enable or disable children's access to Allie in the settings.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-medium mb-1 text-pink-600">Teaching Digital Literacy</h4>
                  <p className="text-sm text-gray-600">
                    Use Allie as an opportunity to talk about technology, how AI works, and the importance of balancing screen time with other activities.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-medium mb-1 text-pink-600">Family Participation</h4>
                  <p className="text-sm text-gray-600">
                    Encourage children to use Allie to better understand their role in family workload balance and how they can contribute.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="font-medium mb-1 text-pink-600">Learning Together</h4>
                  <p className="text-sm text-gray-600">
                    Consider using Allie together as a family, asking questions about survey results or exploring topics like emotional labor and mental load in age-appropriate ways.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mr-4">
                <AlertTriangle size={20} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-medium mb-4">A Note on AI and Children</h3>
                <p className="text-gray-600 mb-4">
                  While Allie is designed to be family-friendly, we recommend parents review chat interactions with younger children and use appropriate parental controls.
                </p>
                <p className="text-gray-600 mb-4">
                  Age-appropriate supervision for AI tools helps children develop healthy technology relationships while benefiting from personalized learning opportunities.
                </p>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Parent Control:</strong> You can enable or disable children's access to Allie in the Family Settings screen. All chat history is visible to parents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light mb-4">What Families Say About Allie</h2>
            <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
              Real experiences from families using Allie
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "Allie has become my go-to advisor for all things family related. I love asking about our survey data and getting insights about what my kids shared—it's helped me connect with them in new ways."
              </p>
              <p className="font-medium">Michelle, mother of two</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "I was skeptical about an AI assistant, but Allie really understands the nuances of family dynamics. The calendar integration is seamless—I just ask Allie to schedule everything now."
              </p>
              <p className="font-medium">David, father of three</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="mb-4">
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
                <Star className="text-yellow-400 inline-block" size={20} />
              </div>
              <p className="text-gray-300 mb-4">
                "My kids love asking Allie questions about the family data. It's teaching them about responsibility while introducing them to AI in a safe, controlled environment."
              </p>
              <p className="font-medium">Jennifer, mother of four</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Experience Allie for Yourself</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto font-light">
            Your family's personal AI assistant is ready to help you achieve better balance.
          </p>
          <button 
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
          >
            Get Started with Allie
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h2 className="text-2xl font-light mb-4">Allie</h2>
              <p className="text-gray-600">Balancing family responsibilities together</p>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900">How It Works</button>
                </li>
                <li>
                  <button onClick={() => navigate('/relationship-features')} className="text-gray-600 hover:text-gray-900">Relationship Features</button>
                </li>
                <li>
                  <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900">AI Assistant</button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/about-us')} className="text-gray-600 hover:text-gray-900">About Us</button>
                </li>
                <li>
                  <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900">Blog</button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/faq')} className="text-gray-600 hover:text-gray-900">FAQ</button>
                </li>
                <li>
                  <button onClick={() => navigate('/contact')} className="text-gray-600 hover:text-gray-900">Contact Us</button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-gray-500 text-sm">
            <p>© 2025 Allie. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIAssistantPage;