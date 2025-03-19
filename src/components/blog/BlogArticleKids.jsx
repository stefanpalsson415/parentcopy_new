// src/components/blog/BlogArticleKids.jsx
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Calendar, User, ArrowLeft, Tag, ChevronRight, Star, Heart, Home, ShoppingBag, Brain, ArrowRight } from 'lucide-react';

const BlogArticleKids = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // This is a sample implementation for the "family-balance-detective-kids" article
  // You would typically fetch the article data based on the slug parameter
  
  const article = {
    title: "The Family Balance Detective: Spot the Hidden Work!",
    category: "Kids",
    author: "Child Development Team",
    date: "December 10, 2024",
    readTime: "5 min read",
    bgColor: "bg-cyan-500",
    content: `
      <div class="intro">
        <p>Hey there, Super Detective! Did you know that in every family, there's a TON of work happening that you might not even notice? 🕵️‍♀️ Some of this work is easy to see (like washing dishes or driving you to school), but some of it is almost INVISIBLE!</p>
        
        <p>Today, you're going to become a Family Balance Detective and learn how to spot all kinds of work that happens in your home. Ready to start your mission? Let's go!</p>
      </div>
      
      <h2>Mystery #1: The Case of the Visible vs. Invisible Work</h2>
      
      <p>In every family, there are two kinds of work:</p>
      
      <div class="work-types">
        <div class="visible-work">
          <h3>Visible Work 👀</h3>
          <p>This is work you can easily see happening. Like:</p>
          <ul>
            <li>Cooking dinner</li>
            <li>Washing clothes</li>
            <li>Driving the car</li>
            <li>Taking out the trash</li>
            <li>Fixing things that break</li>
          </ul>
        </div>
        
        <div class="invisible-work">
          <h3>Invisible Work 🔍</h3>
          <p>This is work that happens "behind the scenes" that you might not notice. Like:</p>
          <ul>
            <li>Remembering doctor appointments</li>
            <li>Planning what food to buy</li>
            <li>Making sure there's always toilet paper</li>
            <li>Knowing when you need new shoes</li>
            <li>Remembering everyone's birthdays</li>
          </ul>
        </div>
      </div>
      
      <div class="detective-challenge">
        <h3>Detective Challenge #1</h3>
        <p>For one day, try to spot examples of both visible AND invisible work in your home. Can you find at least 3 examples of each? 🔎</p>
      </div>
      
      <h2>Mystery #2: The Case of the Brain Work</h2>
      
      <p>Some family work happens mostly in someone's brain! We call this "mental load" or "brain work." It's when someone has to:</p>
      
      <ul>
        <li>Remember important things</li>
        <li>Plan ahead for the future</li>
        <li>Solve problems</li>
        <li>Keep track of what everyone needs</li>
      </ul>
      
      <p>Brain work can make someone feel tired even if they haven't moved around much! It's like when your brain feels "full" after a big test at school.</p>
      
      <div class="brain-work-example">
        <h3>Example: The Birthday Party Planning Mystery</h3>
        
        <p>When someone plans a birthday party, there's LOTS of brain work happening:</p>
        
        <ul>
          <li>Remembering which friends to invite</li>
          <li>Deciding what food everyone will like</li>
          <li>Making sure there are enough plates and napkins</li>
          <li>Planning fun activities</li>
          <li>Sending out invitations on time</li>
          <li>Checking who can come and who can't</li>
        </ul>
        
        <p>Whew! That's a LOT of thinking! And you might only see the party itself, not all the brain work that made it happen.</p>
      </div>
      
      <div class="detective-challenge">
        <h3>Detective Challenge #2</h3>
        <p>Ask your parents about some "brain work" they do for the family that you might not usually notice. You might be surprised how much they keep track of! 🧠</p>
      </div>
      
      <h2>Mystery #3: The Case of the Heart Work</h2>
      
      <p>Some family work involves taking care of people's feelings and emotions. We can call this "heart work." It includes:</p>
      
      <ul>
        <li>Comforting someone when they're sad</li>
        <li>Helping solve arguments</li>
        <li>Listening to problems</li>
        <li>Noticing when someone needs extra love</li>
        <li>Teaching about feelings</li>
      </ul>
      
      <p>Heart work is super important for keeping families happy, but it can be really hard to see!</p>
      
      <div class="heart-work-example">
        <h3>Example: The Bedtime Comfort Case</h3>
        
        <p>When someone helps you at bedtime, they might be doing more heart work than you realize:</p>
        
        <ul>
          <li>Noticing if you seem worried about something</li>
          <li>Creating a peaceful routine to help you feel safe</li>
          <li>Making time to talk about your day</li>
          <li>Finding the right words to help with nighttime worries</li>
          <li>Being patient when you ask for "just one more story"</li>
        </ul>
      </div>
      
      <div class="detective-challenge">
        <h3>Detective Challenge #3</h3>
        <p>Next time someone in your family helps you feel better when you're upset, try to notice all the "heart work" they're doing! ❤️</p>
      </div>
      
      <h2>Mystery #4: The Case of Balance</h2>
      
      <p>In the happiest families, all this work (visible, invisible, brain work, and heart work) gets shared in a way that feels fair to everyone. We call this "balance."</p>
      
      <p>When one person has to do TOO MUCH of the family work, they might feel:</p>
      
      <ul>
        <li>Really tired all the time</li>
        <li>Cranky or frustrated</li>
        <li>Like no one notices how hard they're working</li>
        <li>Too busy to do fun things</li>
      </ul>
      
      <p>But when the work is more balanced, everyone has:</p>
      
      <ul>
        <li>More energy</li>
        <li>More time for fun</li>
        <li>Happier feelings</li>
        <li>A chance to learn different skills</li>
      </ul>
      
      <div class="detective-challenge">
        <h3>Detective Challenge #4</h3>
        <p>Think about how your family shares work. Is there anything you could help with to make things more balanced? Even small helpers make a big difference! ⚖️</p>
      </div>
      
      <h2>Your Super Detective Toolkit</h2>
      
      <p>Now that you know about different kinds of family work, here are some super detective tools you can use:</p>
      
      <div class="detective-tools">
        <div class="tool">
          <h3>The Thank You Tool 🙏</h3>
          <p>When you notice someone doing work for your family (even invisible work), say "thank you!" This makes people feel their work is seen and appreciated.</p>
        </div>
        
        <div class="tool">
          <h3>The Helper Tool 🦸</h3>
          <p>Ask if you can help with some family work. Even kids can do lots of important jobs!</p>
        </div>
        
        <div class="tool">
          <h3>The Notice Tool 👁️</h3>
          <p>Pay attention to work that happens at home that you never noticed before. You might be surprised how much you discover!</p>
        </div>
        
        <div class="tool">
          <h3>The Question Tool ❓</h3>
          <p>Ask grown-ups about work they do that might be invisible. They'll be impressed by your detective skills!</p>
        </div>
      </div>
      
      <div class="conclusion">
        <h2>Congratulations, Detective!</h2>
        <p>You've completed your training on spotting all kinds of family work! Now you have special detective eyes that can see both visible AND invisible work happening in your home.</p>
        
        <p>Remember: When everyone in a family notices and helps with all kinds of work, families are happier, have more fun together, and everyone learns important skills!</p>
        
        <p>What will you detect first with your new super-powers? 🕵️‍♀️🔎</p>
      </div>
      
      <div class="activities">
        <h3>Bonus Detective Activities!</h3>
        
        <div class="activity">
          <h4>Family Work Scavenger Hunt</h4>
          <p>Make a list of 10 different kinds of family work (include some invisible ones!). Then see how many you can spot happening in one day.</p>
        </div>
        
        <div class="activity">
          <h4>Thank You Notes</h4>
          <p>Make small thank-you notes and leave them for family members when you notice them doing important work.</p>
        </div>
        
        <div class="activity">
          <h4>Job Swap Day</h4>
          <p>Ask if your family can try a "job swap day" where everyone tries doing different jobs than usual. What new things will you learn?</p>
        </div>
      </div>
    `,
    relatedArticles: [
      {
        title: "Superhero Families: How Everyone Helps at Home",
        slug: "superhero-families-kids-guide",
        bgColor: "bg-lime-500"
      },
      {
        title: "Kid-Friendly: Understanding Why Mom and Dad Share Tasks",
        slug: "kid-friendly-sharing-tasks",
        bgColor: "bg-teal-500"
      }
    ]
  };
  
  return (
    <div className="min-h-screen bg-white font-['Roboto']">
      {/* Header/Nav */}
      <header className="px-6 py-4 border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-light cursor-pointer" onClick={() => navigate('/')}>Allie</h1>
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => navigate('/how-it-works')}
              className="text-gray-800 hover:text-black transition-colors font-light"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate('/about-us')}
              className="text-gray-800 hover:text-black transition-colors font-light"
            >
              About Us
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-black font-medium border-b border-black"
            >
              Blog
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100 font-light"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-light"
            >
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-8"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to all articles
        </button>
        
        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <span className="flex items-center">
              <Tag size={14} className="mr-1" />
              {article.category}
            </span>
            <span className="mx-2">•</span>
            <span className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {article.date}
            </span>
            <span className="mx-2">•</span>
            <span className="flex items-center">
              <Clock size={14} className="mr-1" />
              {article.readTime}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center mr-3">
                <User size={20} className="text-cyan-600" />
              </div>
              <span className="font-medium">{article.author}</span>
            </div>
          </div>
        </div>
        
        {/* Featured Image/Color Block */}
        <div className="mb-8">
          <div className={`w-full h-64 ${article.bgColor} rounded-lg flex items-center justify-center`}>
            <div className="text-white text-center px-4">
              <Star size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-medium mb-2">Detective Training!</div>
              <div className="text-sm opacity-80">Learn to spot all the work that happens in your family 🔎</div>
            </div>
          </div>
        </div>
        
        {/* Article Body */}
        <div className="prose prose-lg max-w-none mb-8 kids-content" dangerouslySetInnerHTML={{ __html: article.content }} />
        
        {/* Related Articles */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">More Stories for Kids</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {article.relatedArticles.map((related, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                onClick={() => navigate(`/blog/${related.slug}`)}
              >
                <div className="h-32 overflow-hidden">
                  <div className={`w-full h-full ${related.bgColor}`}></div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-full mb-2">
                    Kids
                  </span>
                  <h4 className="font-bold mb-2 line-clamp-2">{related.title}</h4>
                  <span className="text-black hover:text-gray-700 text-sm flex items-center">
                    Read the story <ChevronRight size={14} className="ml-1" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg p-8 mb-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Ready for Some Family Fun?</h3>
            <p className="mb-6 font-light">Let Allie help your whole family be happier by sharing responsibilities together!</p>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-100"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t">
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
                  <button onClick={() => navigate('/mini-survey')} className="text-gray-600 hover:text-gray-900 font-light">Mini Assessment</button>
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
            
            <div>
              <h3 className="text-gray-800 font-medium mb-4">Account</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900 font-light">Log In</button>
                </li>
                <li>
                  <button onClick={() => navigate('/signup')} className="text-gray-600 hover:text-gray-900 font-light">Sign Up</button>
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
        .kids-content {
          font-size: 1.1rem;
        }
        
        .kids-content h2 {
          font-size: 1.8rem;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: black;
        }
        
        .kids-content h3 {
          font-size: 1.4rem;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: black;
        }
        
        .kids-content h4 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
          color: black;
        }
        
        .kids-content p {
          margin-bottom: 1em;
          line-height: 1.7;
          font-weight: 300;
        }
        
        .kids-content ul {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        
        .kids-content li {
          margin-bottom: 0.5em;
          font-weight: 300;
        }
        
        .intro {
          font-size: 1.2rem;
          background-color: #f0f9ff;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }
        
        .work-types {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1.5rem 0;
        }
        
        @media (max-width: 640px) {
          .work-types {
            grid-template-columns: 1fr;
          }
        }
        
        .visible-work {
          background-color: #ecfdf5;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        
        .invisible-work {
          background-color: #fef3f2;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        
        .detective-challenge {
          background-color: #f5f3ff;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          border-left: 4px solid #8b5cf6;
        }
        
        .brain-work-example, .heart-work-example {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        
        .detective-tools {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1.5rem 0;
        }
        
        @media (max-width: 640px) {
          .detective-tools {
            grid-template-columns: 1fr;
          }
        }
        
        .tool {
          background-color: #fffbeb;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        
        .conclusion {
          background-color: #f0f9ff;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin: 2rem 0;
        }
        
        .activities {
          background-color: #f8fafc;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin: 2rem 0;
        }
        
        .activity {
          background-color: white;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          border: 1px solid #e5e7eb;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default BlogArticleKids;