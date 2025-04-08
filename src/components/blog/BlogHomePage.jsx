// src/components/blog/BlogHomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Search, ArrowRight, Clock, Tag, ChevronRight, BookOpen, Users, Brain, Scale, BarChart3, Heart } from 'lucide-react';

const BlogHomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { currentUser } = useAuth();
  
  
  // Sample blog posts
  const blogPosts = [
    {
      id: 1,
      title: "The Science of Family Balance: What Research Tells Us",
      excerpt: "Explore the latest research on how balanced parental responsibilities impact child development and family well-being.",
      category: "Research",
      author: "Allie Research Team",
      date: "March 5, 2025",
      readTime: "8 min read",
      bgColor: "bg-blue-500",
      featured: true,
      slug: "science-of-family-balance",
      audience: "parents"
    },
    {
      id: 2,
      title: "5 Signs Your Family Has an Invisible Workload Imbalance",
      excerpt: "Learn to recognize the subtle signs that mental load and invisible tasks aren't being shared equally in your home.",
      category: "Mental Load",
      author: "Allie Research Team",
      date: "February 28, 2025",
      readTime: "6 min read",
      bgColor: "bg-purple-500",
      featured: true,
      slug: "signs-of-workload-imbalance",
      audience: "parents"
    },
    {
      id: 3,
      title: "How to Talk to Kids About Family Responsibilities",
      excerpt: "Age-appropriate ways to discuss shared household responsibilities with children from toddlers to teens.",
      category: "Kids",
      author: "Child Development Team",
      date: "February 20, 2025",
      readTime: "7 min read",
      bgColor: "bg-green-500",
      slug: "kids-and-family-responsibilities",
      audience: "parents"
    },
    {
      id: 4,
      title: "The Working Parent's Guide to Balance",
      excerpt: "Practical strategies for dual-career households to maintain equitable workload sharing despite busy schedules.",
      category: "Working Parents",
      author: "Career Balance Team",
      date: "February 15, 2025",
      readTime: "9 min read",
      bgColor: "bg-pink-500",
      slug: "working-parents-guide",
      audience: "parents"
    },
    {
      id: 5,
      title: "Beyond 50/50: What True Balance Really Means",
      excerpt: "Why equal division isn't always the goal, and how to find the right balance for your unique family situation.",
      category: "Balance Philosophy",
      author: "Family Systems Team",
      date: "February 10, 2025",
      readTime: "5 min read",
      bgColor: "bg-yellow-500",
      slug: "beyond-5050-balance",
      audience: "parents"
    },
    {
      id: 6,
      title: "The Math Behind Allie: How Our Task Weighting System Works",
      excerpt: "A deep dive into the sophisticated algorithm that powers Allie's revolutionary approach to family balance.",
      category: "Technology",
      author: "Data Science Team",
      date: "February 5, 2025",
      readTime: "10 min read",
      bgColor: "bg-indigo-500",
      slug: "task-weighting-system-math",
      audience: "parents",
      featured: true
    },
    {
      id: 7,
      title: "Creating a Family Meeting Routine That Works",
      excerpt: "A step-by-step guide to implementing effective family meetings that improve communication and task sharing.",
      category: "Communication",
      author: "Family Systems Team",
      date: "January 28, 2025",
      readTime: "7 min read",
      bgColor: "bg-emerald-500",
      slug: "family-meeting-routine",
      audience: "parents"
    },
    {
      id: 8,
      title: "The Hidden Costs of Imbalance: Mental Health and Relationships",
      excerpt: "How uneven family workloads affect stress levels, relationship satisfaction, and long-term well-being.",
      category: "Mental Health",
      author: "Wellbeing Team",
      date: "January 23, 2025",
      readTime: "8 min read",
      bgColor: "bg-red-500",
      slug: "hidden-costs-imbalance",
      audience: "parents"
    },
    {
      id: 9,
      title: "Kid-Friendly: Understanding Why Mom and Dad Share Tasks",
      excerpt: "How to explain workload sharing to children and help them develop healthy attitudes about family responsibilities.",
      category: "Kids",
      author: "Child Development Team",
      date: "January 18, 2025",
      readTime: "5 min read",
      bgColor: "bg-teal-500",
      slug: "kid-friendly-sharing-tasks",
      audience: "kids"
    },
    {
      id: 10,
      title: "Breaking Gender Patterns: Raising Kids Without Task Stereotypes",
      excerpt: "Strategies for parents who want to raise children without rigid gender roles around household responsibilities.",
      category: "Gender & Parenting",
      author: "Equity Team",
      date: "January 15, 2025",
      readTime: "7 min read",
      bgColor: "bg-orange-500",
      slug: "breaking-gender-patterns",
      audience: "parents"
    },
    {
      id: 11,
      title: "How AI is Revolutionizing Family Balance",
      excerpt: "Discover how artificial intelligence is helping families achieve more equitable distribution of responsibilities.",
      category: "Technology",
      author: "AI Research Team",
      date: "January 12, 2025",
      readTime: "8 min read",
      bgColor: "bg-violet-500",
      slug: "ai-family-balance-revolution",
      audience: "parents",
      featured: true
    },
    {
      id: 12,
      title: "From Conflict to Collaboration: Reframing Family Workload Discussions",
      excerpt: "How to shift away from blame and toward productive conversations about sharing responsibilities.",
      category: "Communication",
      author: "Relationship Team",
      date: "January 5, 2025",
      readTime: "7 min read",
      bgColor: "bg-sky-500",
      slug: "conflict-to-collaboration",
      audience: "parents"
    },
    {
      id: 13,
      title: "The Role of Extended Family in Household Balance",
      excerpt: "How grandparents and other family members can help create a more balanced family ecosystem.",
      category: "Extended Family",
      author: "Family Systems Team",
      date: "December 28, 2024",
      readTime: "6 min read",
      bgColor: "bg-amber-500",
      slug: "extended-family-balance",
      audience: "parents"
    },
    {
      id: 14,
      title: "Superhero Families: How Everyone Helps at Home",
      excerpt: "A fun guide for kids to understand why everyone in the family needs to help with chores and responsibilities.",
      category: "Kids",
      author: "Child Development Team",
      date: "December 22, 2024",
      readTime: "4 min read",
      bgColor: "bg-lime-500",
      slug: "superhero-families-kids-guide",
      audience: "kids"
    },
    {
      id: 15,
      title: "The Impact of Balanced Parenting on Children's Future Relationships",
      excerpt: "How witnessing balanced workload sharing shapes children's expectations for their own future partnerships.",
      category: "Research",
      author: "Child Development Team",
      date: "December 15, 2024",
      readTime: "7 min read",
      bgColor: "bg-fuchsia-500",
      slug: "impact-on-childrens-future",
      audience: "parents"
    },
    {
      id: 16,
      title: "The Family Balance Detective: Spot the Hidden Work!",
      excerpt: "An interactive story that helps kids identify and understand the invisible work that happens in their homes.",
      category: "Kids",
      author: "Child Development Team",
      date: "December 10, 2024",
      readTime: "5 min read",
      bgColor: "bg-cyan-500",
      slug: "family-balance-detective-kids",
      audience: "kids"
    }
  ];
  
  const categories = [
    'All',
    'Research',
    'Mental Load',
    'Kids',
    'Working Parents',
    'Communication',
    'Technology',
    'Gender & Parenting',
    'Mental Health',
    'Balance Philosophy',
    'Extended Family'
  ];
  
  const audiences = ['All', 'Parents', 'Kids'];
  const [selectedAudience, setSelectedAudience] = useState('All');
  
  // Filter posts based on search term, category, and audience
  useEffect(() => {
    let results = blogPosts;
    
    if (searchTerm) {
      results = results.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      results = results.filter(post => post.category === selectedCategory);
    }
    
    if (selectedAudience !== 'All') {
      results = results.filter(post => 
        post.audience && post.audience.toLowerCase() === selectedAudience.toLowerCase()
      );
    }
    
    setFilteredPosts(results);
  }, [searchTerm, selectedCategory, selectedAudience]);
  
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
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
  >
    How It Works
  </button>
  <button
    onClick={() => navigate('/about-us')}
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
  >
    About Us
  </button>
  <button 
    onClick={() => navigate('/family-command-center')}
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
  >
    Family Command Center
  </button>
  <button 
    onClick={() => navigate('/ai-assistant')}
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
  >
    AI Assistant
  </button>
  <button 
    onClick={() => navigate('/family-memory')}
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
  >
    Family Memory
  </button>
  <button 
    onClick={() => navigate('/blog')}
    className="text-gray-800 hover:text-blue-600 hover:underline transition-colors"
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
      
      {/* Blog Hero Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-4">The Allie Blog</h1>
          <p className="text-xl md:text-2xl font-light">
            Insights, research, and practical advice on family balance
          </p>
          
          {/* Search Bar */}
          <div className="max-w-lg mx-auto mt-8">
            <div className="flex items-center bg-white rounded-full overflow-hidden shadow-md">
              <div className="pl-4 text-gray-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full py-3 px-4 focus:outline-none text-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Filter Navigation */}
      <section className="py-6 bg-white z-10 border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Category filters */}
            <div className="flex overflow-x-auto pb-2 hide-scrollbar">
              <div className="mr-2 py-2 text-sm font-medium text-gray-600">Categories:</div>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 mr-2 rounded-full whitespace-nowrap text-sm ${
                    selectedCategory === category
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Audience filters */}
            <div className="flex items-center">
              <div className="mr-2 py-2 text-sm font-medium text-gray-600">For:</div>
              {audiences.map((audience) => (
                <button
                  key={audience}
                  onClick={() => setSelectedAudience(audience)}
                  className={`px-3 py-1 mr-2 rounded-full whitespace-nowrap text-sm ${
                    selectedAudience === audience
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Articles */}
      {selectedCategory === 'All' && selectedAudience === 'All' && !searchTerm && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {blogPosts.filter(post => post.featured).map((post) => (
                <div 
                  key={post.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <div className={`w-full h-full ${post.bgColor}`}></div>
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center mb-2 text-sm text-gray-500">
                      <span>{post.date}</span>
                      <span className="mx-2">•</span>
                      <span className="flex items-center"><Clock size={14} className="mr-1" />{post.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                    <p className="text-gray-600 mb-4 font-light">{post.excerpt}</p>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center text-sm px-3 py-1 bg-gray-100 rounded-full">
                        <Tag size={14} className="mr-1" />
                        {post.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/blog/${post.slug}`);
                        }}
                        className="text-black hover:text-gray-700 font-medium flex items-center"
                      >
                        Read more <ArrowRight size={16} className="ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* For Parents Section */}
      {(selectedAudience === 'All' || selectedAudience === 'Parents') && !searchTerm && selectedCategory === 'All' && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center mb-8">
              <Users size={24} className="text-black mr-3" />
              <h2 className="text-2xl font-bold">For Parents</h2>
            </div>
            
            <div className="mb-10">
              <p className="text-lg text-gray-700 mb-6 font-light">
                Discover research-backed strategies, practical tips, and expert insights to help you create a more balanced family life. Our articles for parents focus on addressing the challenges of workload distribution and fostering healthier family dynamics.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <Brain className="text-purple-500 mb-3" size={24} />
                  <h3 className="font-bold mb-2">The Science of Balance</h3>
                  <p className="text-gray-600 text-sm font-light">
                    Our research-backed articles explain the psychology and sociology behind family workload distribution.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <Scale className="text-blue-500 mb-3" size={24} />
                  <h3 className="font-bold mb-2">Practical Strategies</h3>
                  <p className="text-gray-600 text-sm font-light">
                    Step-by-step guides and actionable advice for creating more balanced routines in your home.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <Heart className="text-red-500 mb-3" size={24} />
                  <h3 className="font-bold mb-2">Relationship Insights</h3>
                  <p className="text-gray-600 text-sm font-light">
                    How to communicate effectively about workload and strengthen your partnership through balance.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {blogPosts
                .filter(post => post.audience === 'parents')
                .slice(0, 6)
                .map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    <div className="h-32 overflow-hidden">
                      <div className={`w-full h-full ${post.bgColor}`}></div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center mb-2 text-xs text-gray-500">
                        <span>{post.date}</span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center"><Clock size={12} className="mr-1" />{post.readTime}</span>
                      </div>
                      <h3 className="font-bold mb-2 text-base">{post.title}</h3>
                      <p className="text-gray-600 mb-3 text-sm font-light line-clamp-2">{post.excerpt}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                          {post.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/blog/${post.slug}`);
                          }}
                          className="text-black hover:text-gray-700 text-sm font-medium flex items-center"
                        >
                          Read <ChevronRight size={14} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setSelectedAudience('Parents');
                  window.scrollTo(0, 0);
                }}
                className="px-5 py-2 border border-black text-black rounded-md hover:bg-gray-100 inline-flex items-center"
              >
                View All Parent Articles
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* For Kids Section */}
      {(selectedAudience === 'All' || selectedAudience === 'Kids') && !searchTerm && selectedCategory === 'All' && (
        <section className="py-12 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center mb-8">
              <BookOpen size={24} className="text-black mr-3" />
              <h2 className="text-2xl font-bold">For Kids</h2>
            </div>
            
            <div className="mb-10">
              <p className="text-lg text-gray-700 mb-6 font-light">
                Fun stories, activities, and kid-friendly explanations to help children understand family teamwork and why everyone's contribution matters. Our kids' content makes family balance engaging and accessible.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-lime-100 p-6 rounded-lg">
                  <h3 className="font-bold mb-3 text-xl">Interactive Stories</h3>
                  <p className="text-gray-700 mb-4 font-light">
                    Engaging tales that help kids understand family responsibilities through adventure and fun characters.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="mr-2">Perfect for ages 5-8</span>
                    <div className="h-1 w-1 bg-gray-500 rounded-full"></div>
                    <span className="ml-2">Fun to read together</span>
                  </div>
                </div>
                
                <div className="bg-cyan-100 p-6 rounded-lg">
                  <h3 className="font-bold mb-3 text-xl">Balance Detectives</h3>
                  <p className="text-gray-700 mb-4 font-light">
                    Activities that encourage kids to spot and understand the different kinds of work that happen in a family.
                  </p>
                  <div className="flex items-center text-sm">
                    <span className="mr-2">Perfect for ages 8-12</span>
                    <div className="h-1 w-1 bg-gray-500 rounded-full"></div>
                    <span className="ml-2">Builds awareness</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {blogPosts
                .filter(post => post.audience === 'kids')
                .map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border-2 border-gray-100"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    <div className="h-32 overflow-hidden">
                      <div className={`w-full h-full ${post.bgColor}`}></div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2 text-lg">{post.title}</h3>
                      <p className="text-gray-600 mb-4 text-sm font-light">{post.excerpt}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                          {post.readTime}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/blog/${post.slug}`);
                          }}
                          className="text-black hover:text-gray-700 text-sm font-medium flex items-center"
                        >
                          Read the story <ChevronRight size={14} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Featured Article: Task Weighting System */}
      {(selectedAudience === 'All' || selectedAudience === 'Parents') && !searchTerm && (selectedCategory === 'All' || selectedCategory === 'Technology') && (
        <section className="py-12 bg-black text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-light mb-6">The Math Behind Family Balance</h2>
                <p className="text-lg mb-4 font-light">
                  Our revolutionary task weighting system goes beyond simple time tracking to capture the full complexity of family workload.
                </p>
                <p className="text-lg mb-6 font-light">
                  Dive into the mathematical models, algorithms, and research that power Allie's unique approach to measuring family balance.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <BarChart3 size={20} className="text-purple-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Multifactor Analysis</h4>
                      <p className="text-sm text-gray-300 font-light">
                        Our algorithm weighs tasks based on time investment, frequency, emotional labor, and more.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Brain size={20} className="text-blue-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Invisible Work Quantification</h4>
                      <p className="text-sm text-gray-300 font-light">
                        Learn how we mathematically capture the cognitive and emotional labor that often goes unmeasured.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/blog/task-weighting-system-math')}
                  className="px-6 py-3 bg-white text-black rounded-md hover:bg-gray-100 inline-flex items-center font-medium"
                >
                  Read the Full Analysis
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
              <div className="hidden md:block">
                <div className="bg-gradient-to-br from-indigo-800 to-purple-700 p-8 rounded-lg h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-mono text-sm mb-4 bg-black bg-opacity-30 p-3 rounded text-left overflow-x-auto">
                      <pre>
{`TaskWeight = BaseTime × Frequency × Invisibility
         × EmotionalLabor × ResearchImpact 
         × ChildDevelopment × Priority`}
                      </pre>
                    </div>
                    <div className="text-xl font-medium">Our Proprietary Algorithm</div>
                    <p className="text-sm mt-2 text-gray-200 font-light">
                      Based on research from family psychology, gender studies, and behavioral economics
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Featured Article: AI Revolution */}
      {(selectedAudience === 'All' || selectedAudience === 'Parents') && !searchTerm && (selectedCategory === 'All' || selectedCategory === 'Technology') && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-8 rounded-lg h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <Brain size={64} className="mx-auto mb-4" />
                    <div className="text-xl font-medium">AI-Powered Family Balance</div>
                    <p className="text-sm mt-2 text-gray-100 font-light">
                      How machine learning is transforming the way families share responsibilities
                    </p>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl font-light mb-6">How AI is Revolutionizing Family Balance</h2>
                <p className="text-lg mb-4 font-light">
                  Artificial intelligence is changing how families understand and distribute household and parenting responsibilities.
                </p>
                <p className="text-lg mb-6 font-light">
                  Discover how Allie uses cutting-edge AI to identify patterns, predict imbalances, and generate personalized recommendations for your family.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <Brain size={20} className="text-violet-500 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Pattern Recognition</h4>
                      <p className="text-sm text-gray-600 font-light">
                        How our AI identifies hidden workload patterns that humans often miss.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Users size={20} className="text-pink-500 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Personalized Recommendations</h4>
                      <p className="text-sm text-gray-600 font-light">
                        AI-generated task redistribution suggestions tailored to your family's unique dynamics.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/blog/ai-family-balance-revolution')}
                  className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center font-medium"
                >
                  Explore the AI Revolution
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* All Articles */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">
            {searchTerm 
              ? `Search Results for "${searchTerm}"`
              : selectedCategory !== 'All' && selectedAudience !== 'All'
                ? `${selectedCategory} Articles for ${selectedAudience}`
                : selectedCategory !== 'All'
                  ? `${selectedCategory} Articles`
                  : selectedAudience !== 'All'
                    ? `Articles for ${selectedAudience}`
                    : 'All Articles'
            }
          </h2>
          
          {filteredPosts.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">No articles found matching your criteria.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedAudience('All');
                }}
                className="px-4 py-2 bg-black text-white rounded-md"
              >
                Reset Filters
              </button>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <div className="h-40 overflow-hidden">
                  <div className={`w-full h-full ${post.bgColor}`}></div>
                </div>
                <div className="p-5">
                  <div className="flex items-center mb-2 text-xs text-gray-500">
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <span className="flex items-center"><Clock size={12} className="mr-1" />{post.readTime}</span>
                  </div>
                  <h3 className="font-bold mb-2 text-lg line-clamp-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm font-light line-clamp-3">{post.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {post.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/blog/${post.slug}`);
                      }}
                      className="text-black hover:text-gray-700 text-sm font-medium flex items-center"
                    >
                      Read more <ChevronRight size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Subscribe to Blog Updates */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Never Miss an Insight</h2>
          <p className="text-lg text-gray-600 mb-8 font-light max-w-2xl mx-auto">
            Subscribe to our newsletter for the latest research, tips, and strategies for creating a more balanced family life
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 p-3 border border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-r-md font-medium">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-light">
              We'll never share your email. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Ready to Transform Your Family's Balance?</h2>
          <p className="text-xl mb-8 font-light">Move from reading about balance to experiencing it firsthand with Allie.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-black rounded-md text-lg font-medium hover:bg-gray-100"
          >
            Get Started Free
          </button>
        </div>
      </section>
      
      {/* Footer */}
<footer className="px-6 py-12 bg-white border-t">
  <div className="max-w-6xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h2 className="text-2xl font-light mb-4">Allie</h2>
        <p className="text-gray-600 font-light">Balancing family responsibilities together</p>
      </div>
      
      <div>
        <h3 className="text-gray-800 font-medium mb-4">Product</h3>
        <ul className="space-y-2">
          <li>
            <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900 font-light">How It Works</button>
          </li>
          <li>
            <button onClick={() => navigate('/relationship-features')} className="text-gray-600 hover:text-gray-900 font-light">Relationship Features</button>
          </li>
          <li>
            <button onClick={() => navigate('/ai-assistant')} className="text-gray-600 hover:text-gray-900 font-light">AI Assistant</button>
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
      
      {/* Custom Styles */}
      <style jsx="true">{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default BlogHomePage;