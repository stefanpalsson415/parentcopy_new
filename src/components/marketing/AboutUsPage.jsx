import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Brain, Heart, Scale, ArrowRight, BarChart, Clock, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Team member profile images - These should be replaced with actual images in your assets folder
import stefanProfilePic from '../../assets/stefan-palsson.jpg'; // Add this image to your assets
import kimberlyProfilePic from '../../assets/kimberly-palsson.jpg'; // Add this image to your assets
import teamPhoto from '../../assets/team-photo.jpg'; // Add this image to your assets


const AboutUsPage = () => {
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
          <h1 className="text-3xl font-light">Allie</h1>
          <nav className="hidden md:flex space-x-8">
            
            <button 
              onClick={() => navigate('/how-it-works')}
              className="text-gray-800 hover:text-black font-light"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate('/about-us')}
              className="text-black font-medium border-b border-black"
            >
              About Us
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-800 hover:text-black font-light"
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
          <h1 className="text-4xl md:text-5xl font-light mb-6">Our Story</h1>
          <p className="text-xl font-light max-w-2xl mx-auto">
            Creating harmony in families through balanced responsibility sharing
          </p>
        </div>
      </section>
      
      {/* Our Story Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-light mb-6">Why We Built Allie</h2>
              <p className="text-lg mb-4 font-light">
                Allie was born from our own family's struggles with balancing household and parenting responsibilities. As parents of three children, we experienced firsthand the tension that arises when workload isn't shared equitably.
              </p>
              <p className="text-lg mb-4 font-light">
                What began as spreadsheets to track tasks in our own home evolved into a vision for a data-driven approach that could help all families achieve better balance. We combined our professional expertise in operations, data analysis, and people management with our personal experiences to create a tool that addresses both the visible and invisible aspects of family work.
              </p>
              <p className="text-lg font-light">
                Our goal is simple but profound: to help families reduce conflict, increase harmony, and create more time for what truly matters.
              </p>
            </div>
            <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-6 border-b border-gray-200 pb-3">The Moments That Inspired Us</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-4">
                    <Clock className="text-blue-600" size={20} />
                  </div>
                  <p className="text-gray-700 font-light">
                    When we realized we were spending more time arguing about who did what than actually enjoying our time together as a family
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mr-4">
                    <Heart className="text-pink-600" size={20} />
                  </div>
                  <p className="text-gray-700 font-light">
                    Watching our children become more aware of family dynamics and wanting to model healthy relationship patterns
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-4">
                    <BarChart className="text-green-600" size={20} />
                  </div>
                  <p className="text-gray-700 font-light">
                    Discovering how data-driven insights could transform subjective perceptions into objective conversations about balance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Meet the Founders */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-12 text-center">Meet the Founders</h2>
          
          <div className="grid md:grid-cols-2 gap-16">
            {/* Stefan's Profile */}
            <div className="relative">
              <div className="bg-white p-8 rounded-lg shadow-sm relative z-10">
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-2 border-gray-200">
                  <img 
                    src="/api/placeholder/150/150" 
                    alt="Stefan Palsson" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-medium text-center mb-2">Stefan Palsson</h3>
                <p className="text-black text-center text-sm mb-4">Co-Founder & CEO</p>
                
                <p className="text-gray-700 mb-4 font-light">
                  Stefan is a seasoned Chief Operating Officer with over 15 years of experience in data-driven 
                  decision-making and operational leadership at companies including FirstVet, BEGiN Learning, 
                  and Spotify.
                </p>
                <p className="text-gray-700 mb-4 font-light">
                  His expertise in scaling operations, strategic planning, and financial management has been 
                  instrumental in transforming Allie from a family project into a comprehensive solution for 
                  household balance.
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="font-medium mb-2">Areas of Expertise:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Data Analytics</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Operations</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Strategic Planning</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Growth Management</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 w-40 h-40 bg-blue-400 rounded-lg -z-0"></div>
            </div>
            
            {/* Kimberly's Profile */}
            <div className="relative">
              <div className="bg-white p-8 rounded-lg shadow-sm relative z-10">
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-2 border-gray-200">
                  <img 
                    src="/api/placeholder/150/150" 
                    alt="Kimberly Palsson" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-medium text-center mb-2">Kimberly Palsson</h3>
                <p className="text-black text-center text-sm mb-4">Co-Founder & Chief Experience Officer</p>
                
                <p className="text-gray-700 mb-4 font-light">
                  Kimberly is an accomplished business consultant and former Chief People Officer with a strong 
                  legal background and expertise in developing team-building strategies and company cultures.
                </p>
                <p className="text-gray-700 mb-4 font-light">
                  Her experience across AI startups, high-end design, and legal services brings a unique 
                  perspective to Allie's approach to family dynamics and interpersonal relationships.
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="font-medium mb-2">Areas of Expertise:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">People Development</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Organizational Culture</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Legal Strategy</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs rounded-full">Leadership Coaching</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 left-4 w-40 h-40 bg-pink-400 rounded-lg -z-0"></div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-gray-700 italic font-light max-w-2xl mx-auto">
              "Our professional backgrounds in data, operations, and people leadership combined with our personal 
              experiences as parents gave us a unique perspective on solving the challenge of family balance."
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-12 text-center">Our Approach</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <Scale className="text-yellow-600" size={24} />
              </div>
              <h3 className="text-xl font-medium mb-4">Data-Driven</h3>
              <p className="text-gray-700 font-light">
                We believe objective measurement is the foundation of true balance. Allie captures and 
                quantifies all aspects of family workload, from visible tasks to invisible mental labor.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Brain className="text-purple-600" size={24} />
              </div>
              <h3 className="text-xl font-medium mb-4">Science-Backed</h3>
              <p className="text-gray-700 font-light">
                Our methodology is grounded in research on family dynamics, behavioral psychology, and 
                gender roles. We translate complex research into practical, actionable insights.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Users className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-medium mb-4">Family-Centered</h3>
              <p className="text-gray-700 font-light">
                We include perspectives from all family members, especially children. Allie creates a 360° view 
                of your household dynamics that honors everyone's experiences and contributions.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* The Team */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-12 text-center">The Team Behind Allie</h2>
          
          <div className="bg-white bg-opacity-10 p-8 rounded-lg mb-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-light mb-6">Built By Families, For Families</h3>
                <p className="font-light mb-4">
                  Beyond the founders, Allie is supported by a team of passionate professionals who share our 
                  commitment to improving family dynamics through data and technology.
                </p>
                <p className="font-light mb-4">
                  Our team combines expertise in artificial intelligence, family psychology, user experience 
                  design, and software development to create a solution that's both technically sophisticated 
                  and deeply human.
                </p>
                <p className="font-light">
                  Like the families we serve, we value diversity of perspective, collaborative problem-solving, 
                  and continuous improvement.
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1 rounded-lg">
                <div className="bg-black p-6 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                        <Brain className="text-pink-400" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">AI & Data Science</h4>
                        <p className="text-sm text-gray-400">Pattern recognition and personalized insights</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                        <Heart className="text-blue-400" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Family Psychology</h4>
                        <p className="text-sm text-gray-400">Evidence-based approaches to family dynamics</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
                        <Star className="text-yellow-400" size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Product & Design</h4>
                        <p className="text-sm text-gray-400">Creating intuitive, family-friendly experiences</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-lg font-light mb-8 max-w-2xl mx-auto">
              We're united by a common belief: that technology, when thoughtfully applied, can help solve 
              complex human challenges and create more harmonious families.
            </p>
            <button 
              onClick={() => navigate('/blog')}
              className="inline-flex items-center px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Read Our Latest Insights
              <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </section>
      
      {/* The Future */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-12 text-center">Our Vision for the Future</h2>
          
          <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm">
            <p className="text-lg font-light mb-6 text-center">
              Allie is just the beginning of our mission to transform family dynamics through data and technology.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-green-600 font-medium">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Global Impact</h3>
                    <p className="text-gray-700 font-light">
                      Expanding Allie to serve diverse family structures across different cultural contexts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-blue-600 font-medium">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Research Advancement</h3>
                    <p className="text-gray-700 font-light">
                      Contributing to academic understanding of family workload dynamics through anonymized data insights
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-purple-600 font-medium">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Expanded Features</h3>
                    <p className="text-gray-700 font-light">
                      Developing new tools for extended family integration, transitional life events, and deeper AI insights
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-pink-600 font-medium">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Workplace Integration</h3>
                    <p className="text-gray-700 font-light">
                      Creating tools for organizations to better support work-life balance for employees
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-6">Join Our Family Balance Revolution</h2>
          <p className="text-xl font-light mb-8 max-w-2xl mx-auto">
            Experience the benefits of a more harmonious, equitable family life with Allie.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Create Your Family
            </button>
            <button 
              onClick={() => navigate('/mini-survey')}
              className="px-8 py-4 border border-white text-white rounded-md font-light hover:bg-white hover:bg-opacity-10"
            >
              Try Our Mini Assessment
            </button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h2 className="text-2xl font-light mb-4">Allie</h2>
              <p className="text-gray-600 font-light">Balance family responsibilities together</p>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                
                <li>
                  <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900 font-light">How It Works</button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/about-us')} className="text-gray-600 hover:text-gray-900 font-light">About Us</button>
                </li>
                <li>
                  <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900 font-light">Blog</button>
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

export default AboutUsPage;