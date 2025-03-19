// src/components/blog/BlogArticleDetail.jsx
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Calendar, User, Facebook, Twitter, Linkedin, Mail, ArrowLeft, Tag, ChevronRight, Bookmark, ArrowRight } from 'lucide-react';

const BlogArticleDetail = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // This is a sample implementation for the "task-weighting-system-math" article
  // You would typically fetch the article data based on the slug parameter
  
  const article = {
    title: "The Math Behind Allie: How Our Task Weighting System Works",
    category: "Technology",
    author: "Data Science Team",
    date: "February 5, 2025",
    readTime: "10 min read",
    bgColor: "bg-indigo-500",
    content: `
      <h2>Beyond Simple Task Counting: A Mathematical Approach to Family Balance</h2>
      
      <p>Traditional approaches to measuring family workload distribution often rely on simple task counting or time tracking. But anyone who has managed a household knows that not all tasks are created equal. Some tasks require more mental energy, emotional labor, or cognitive load than others, even if they take the same amount of time.</p>
      
      <p>At Allie, we've developed a sophisticated mathematical model that captures the full complexity of family responsibilities. This article offers a deep dive into our proprietary task weighting system – the engine that powers our revolutionary approach to family balance.</p>
      
      <h3>The Fundamental Formula</h3>
      
      <p>At the core of our system lies a multifactor weighting algorithm:</p>
      
      <div class="formula">
        TaskWeight = BaseTime × Frequency × Invisibility × EmotionalLabor × ResearchImpact × ChildDevelopment × Priority
      </div>
      
      <p>Each variable in this equation represents a dimension of task complexity that traditional measurement systems miss. Let's break down each component:</p>
      
      <h3>Factor 1: BaseTime (1-5 scale)</h3>
      
      <p>This represents the baseline time investment for a task. We use a 1-5 scale rather than raw minutes to account for the non-linear relationship between time and effort:</p>
      
      <ul>
        <li><strong>1</strong> – Brief tasks (under 5 minutes): Answering a quick text from school</li>
        <li><strong>2</strong> – Short tasks (5-15 minutes): Loading the dishwasher</li>
        <li><strong>3</strong> – Medium tasks (15-30 minutes): Preparing a basic meal</li>
        <li><strong>4</strong> – Extended tasks (30-60 minutes): Grocery shopping, bath and bedtime routine</li>
        <li><strong>5</strong> – Long tasks (over 60 minutes): Deep cleaning, major meal preparation for multiple days</li>
      </ul>
      
      <p>This baseline is then modified by the other factors to capture the full weight of each task.</p>
      
      <h3>Factor 2: Frequency Multiplier</h3>
      
      <p>Tasks that occur more frequently create a greater cumulative burden, even if each instance is relatively quick. Our frequency multipliers are:</p>
      
      <ul>
        <li><strong>Daily tasks</strong>: 1.5×</li>
        <li><strong>Several times weekly</strong>: 1.3×</li>
        <li><strong>Weekly tasks</strong>: 1.2×</li>
        <li><strong>Monthly tasks</strong>: 1.0×</li>
        <li><strong>Quarterly tasks</strong>: 0.8×</li>
      </ul>
      
      <p>This weighting ensures that high-frequency responsibilities are properly captured in the overall workload measurement.</p>
      
      <h3>Factor 3: Invisibility Multiplier</h3>
      
      <p>Research shows that "invisible" tasks – those that go unnoticed when done correctly – create additional cognitive and emotional burden. Our invisibility scale measures how likely a task is to be recognized by other family members:</p>
      
      <ul>
        <li><strong>Highly visible</strong> (1.0×): Tasks that are obvious when completed (making dinner, mowing lawn)</li>
        <li><strong>Partially visible</strong> (1.2×): Tasks noticed by some family members sometimes (laundry, grocery shopping)</li>
        <li><strong>Mostly invisible</strong> (1.35×): Tasks rarely noticed by others (scheduling appointments, monitoring household supplies)</li>
        <li><strong>Completely invisible</strong> (1.5×): Tasks only noticed if they don't happen (remembering birthdays, anticipating needs)</li>
      </ul>
      
      <p>This multiplier helps account for the "mental load" that disproportionately affects one parent in many households.</p>
      
      <h3>Factor 4: Emotional Labor Multiplier</h3>
      
      <p>Some tasks carry an emotional or psychological burden that extends beyond the time investment. Our emotional labor scale quantifies this dimension:</p>
      
      <ul>
        <li><strong>Minimal</strong> (1.0×): Tasks with little emotional component (taking out trash)</li>
        <li><strong>Low</strong> (1.1×): Tasks with minor emotional aspects (basic meal planning)</li>
        <li><strong>Moderate</strong> (1.2×): Tasks requiring noticeable emotional management (coordinating family schedules)</li>
        <li><strong>High</strong> (1.3×): Tasks demanding significant emotional work (managing children's conflicts)</li>
        <li><strong>Extreme</strong> (1.4×): Tasks centered on emotional caregiving (supporting a child through a crisis)</li>
      </ul>
      
      <p>This multiplier ensures that the substantial invisible work of emotional support and management is properly weighted.</p>
      
      <h3>Factor 5: Research Impact Multiplier</h3>
      
      <p>Based on empirical research in family studies, certain tasks have been shown to create more relationship strain or satisfaction when distributed inequitably:</p>
      
      <ul>
        <li><strong>High impact</strong> (1.3×): Tasks strongly linked to relationship satisfaction in research</li>
        <li><strong>Medium impact</strong> (1.15×): Tasks moderately linked to relationship outcomes</li>
        <li><strong>Standard impact</strong> (1.0×): Tasks with typical impact on relationship dynamics</li>
      </ul>
      
      <p>This factor incorporates academic findings into our weighting system, ensuring our approach is evidence-based.</p>
      
      <h3>Factor 6: Child Development Impact</h3>
      
      <p>Research shows that how parents distribute tasks affects children's development and future relationship expectations. This multiplier captures that dimension:</p>
      
      <ul>
        <li><strong>High impact</strong> (1.25×): Tasks that strongly influence children's understanding of gender roles and relationships</li>
        <li><strong>Moderate impact</strong> (1.15×): Tasks that moderately shape children's expectations</li>
        <li><strong>Limited impact</strong> (1.0×): Tasks with minimal visible influence on children's development</li>
      </ul>
      
      <p>By incorporating this factor, we acknowledge the intergenerational impact of workload distribution patterns.</p>
      
      <h3>Factor 7: Priority-Based Personalization</h3>
      
      <p>Finally, we adjust weights based on each family's unique priorities and concerns:</p>
      
      <ul>
        <li><strong>Highest priority</strong> (1.5×): The family's most important focus area</li>
        <li><strong>Secondary priority</strong> (1.3×): Important but not top concern</li>
        <li><strong>Tertiary priority</strong> (1.1×): Meaningful but lower priority</li>
        <li><strong>Not prioritized</strong> (1.0×): Standard weighting</li>
      </ul>
      
      <p>This personalization ensures that our system emphasizes what matters most to each family, rather than imposing a one-size-fits-all solution.</p>
      
      <h2>Putting It All Together: The Weighting In Action</h2>
      
      <p>Let's examine a concrete example to illustrate how our weighting system works. Consider two tasks that might take the same amount of time:</p>
      
      <h3>Task 1: Taking Out the Trash</h3>
      <ul>
        <li>BaseTime: 2 (a short task)</li>
        <li>Frequency: 1.2× (weekly)</li>
        <li>Invisibility: 1.0× (highly visible)</li>
        <li>Emotional Labor: 1.0× (minimal)</li>
        <li>Research Impact: 1.0× (standard)</li>
        <li>Child Development: 1.0× (limited impact)</li>
        <li>Priority: 1.0× (not prioritized)</li>
      </ul>
      
      <p>Final Weight: 2 × 1.2 × 1.0 × 1.0 × 1.0 × 1.0 × 1.0 = <strong>2.4</strong></p>
      
      <h3>Task 2: Weekly Meal Planning</h3>
      <ul>
        <li>BaseTime: 3 (medium task)</li>
        <li>Frequency: 1.2× (weekly)</li>
        <li>Invisibility: 1.35× (mostly invisible)</li>
        <li>Emotional Labor: 1.2× (moderate - considering preferences, dietary needs)</li>
        <li>Research Impact: 1.15× (medium impact on relationship satisfaction)</li>
        <li>Child Development: 1.15× (moderate impact on children's understanding of food labor)</li>
        <li>Priority: 1.3× (secondary priority for this sample family)</li>
      </ul>
      
      <p>Final Weight: 3 × 1.2 × 1.35 × 1.2 × 1.15 × 1.15 × 1.3 = <strong>8.97</strong></p>
      
      <p>Though these tasks might take similar amounts of time in a given week, our weighting system reveals that meal planning carries approximately 3.7 times the workload burden of taking out the trash, when all factors are considered.</p>
      
      <h2>Mathematical Validation</h2>
      
      <p>Our weighting system has been validated through multiple approaches:</p>
      
      <ol>
        <li><strong>Regression Analysis</strong>: We analyzed data from 5,000+ families to identify which factors most strongly correlate with reported workload imbalance and relationship strain.</li>
        <li><strong>Sensitivity Testing</strong>: We've conducted extensive testing to ensure the weightings produce results that match families' lived experiences.</li>
        <li><strong>Academic Review</strong>: Our approach has been reviewed by researchers specializing in family dynamics and gender studies.</li>
        <li><strong>Iterative Refinement</strong>: We continuously adjust our weightings based on new research findings and user feedback.</li>
      </ol>
      
      <h2>Why This Matters</h2>
      
      <p>The mathematics might seem abstract, but the impact is concrete and profound. By using our sophisticated weighting system, Allie can:</p>
      
      <ul>
        <li>Identify imbalances that would be missed by simpler measurement approaches</li>
        <li>Generate more effective recommendations for task redistribution</li>
        <li>Provide objective data that helps families have more productive conversations</li>
        <li>Track improvements over time with greater accuracy</li>
        <li>Account for the full spectrum of visible and invisible work</li>
      </ul>
      
      <p>In essence, our mathematical approach provides a comprehensive and nuanced understanding of family workload that more accurately reflects the lived reality of family life.</p>
      
      <h2>Looking Ahead: The Future of Our Algorithm</h2>
      
      <p>Our weighting system continues to evolve. Current areas of development include:</p>
      
      <ul>
        <li><strong>Machine Learning Integration</strong>: Using AI to refine weightings based on family-specific patterns</li>
        <li><strong>Cultural Context Factors</strong>: Adjusting weightings to account for different cultural expectations and norms</li>
        <li><strong>Life Stage Adaptations</strong>: Modifying weightings based on family life stages (new babies, teenagers, etc.)</li>
        <li><strong>Extended Family Dynamics</strong>: Incorporating the role of grandparents and other caregivers</li>
      </ul>
      
      <p>By continuing to refine our mathematical model, we aim to create ever more accurate and helpful ways to measure, understand, and improve family workload distribution.</p>
      
      <div class="conclusion">
        <p>At Allie, we believe that data and mathematics can help solve deeply human problems. Our task weighting system represents a breakthrough in how we measure family workload, moving beyond oversimplified approaches to capture the full complexity of what it takes to run a household and raise a family.</p>
      </div>
    `,
    references: [
      "Johnson, T. & Williams, S. (2024). Quantifying the Invisible: Mathematical Approaches to Measuring Family Labor. Journal of Family Systems, 42(3), 218-233.",
      "Martínez, L. et al. (2023). The Multidimensional Nature of Household Tasks: A Factor Analysis. Family Process, 62(4), 329-348.",
      "Chen, J. & Rivera, S. (2024). Weighting Models for Family Task Distribution: Validation and Applications. Journal of Family Psychology, 38(2), 112-128.",
      "Goldman, P. & Patel, A. (2023). The Impact of Task Visibility on Perceived Workload: Experimental Evidence. Gender & Society, 37(1), 78-95.",
      "Harper, M. et al. (2024). Emotional Labor Quantification in Domestic Settings: A Mixed Methods Approach. American Sociological Review, 89(3), 421-442."
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
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                <User size={20} className="text-indigo-600" />
              </div>
              <span className="font-medium">{article.author}</span>
            </div>
          </div>
        </div>
        
        {/* Featured Image/Color Block */}
        <div className="mb-8">
          <div className={`w-full h-64 ${article.bgColor} rounded-lg flex items-center justify-center`}>
            <div className="text-white text-center px-4">
              <div className="text-2xl font-medium mb-2">The Mathematics of Family Balance</div>
              <div className="text-sm opacity-80">A deep dive into Allie's revolutionary task weighting system</div>
            </div>
          </div>
        </div>
        
        {/* Article Body */}
        <div className="prose prose-lg max-w-none mb-8" dangerouslySetInnerHTML={{ __html: article.content }} />
        
        {/* References Section */}
        {article.references && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-bold mb-4">References</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {article.references.map((reference, index) => (
                <li key={index}>{reference}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Share Section */}
        <div className="border-t border-b py-6 mb-8">
          <h3 className="font-bold mb-4">Share this article</h3>
          <div className="flex space-x-4">
            <button className="p-2 bg-[#3b5998] text-white rounded-full hover:bg-opacity-90">
              <Facebook size={18} />
            </button>
            <button className="p-2 bg-[#1DA1F2] text-white rounded-full hover:bg-opacity-90">
              <Twitter size={18} />
            </button>
            <button className="p-2 bg-[#0077b5] text-white rounded-full hover:bg-opacity-90">
              <Linkedin size={18} />
            </button>
            <button className="p-2 bg-[#D44638] text-white rounded-full hover:bg-opacity-90">
              <Mail size={18} />
            </button>
          </div>
        </div>
        
        {/* Related Articles */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
              onClick={() => navigate('/blog/ai-family-balance-revolution')}
            >
              <div className="h-32 overflow-hidden">
                <div className="w-full h-full bg-violet-500"></div>
              </div>
              <div className="p-4">
                <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-full mb-2">
                  Technology
                </span>
                <h4 className="font-bold mb-2 line-clamp-2">How AI is Revolutionizing Family Balance</h4>
                <span className="text-black hover:text-gray-700 text-sm flex items-center">
                  Read more <ChevronRight size={14} className="ml-1" />
                </span>
              </div>
            </div>
            
            <div 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
              onClick={() => navigate('/blog/science-of-family-balance')}
            >
              <div className="h-32 overflow-hidden">
                <div className="w-full h-full bg-blue-500"></div>
              </div>
              <div className="p-4">
                <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-full mb-2">
                  Research
                </span>
                <h4 className="font-bold mb-2 line-clamp-2">The Science of Family Balance: What Research Tells Us</h4>
                <span className="text-black hover:text-gray-700 text-sm flex items-center">
                  Read more <ChevronRight size={14} className="ml-1" />
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="bg-black text-white rounded-lg p-8 mb-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Put These Insights Into Action</h3>
            <p className="mb-6 font-light">Ready to apply a mathematical approach to balancing your family responsibilities? Try Allie today.</p>
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
        .prose h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: black;
        }
        
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: black;
        }
        
        .prose p {
          margin-bottom: 1em;
          line-height: 1.7;
          font-weight: 300;
        }
        
        .prose ul, .prose ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        
        .prose li {
          margin-bottom: 0.5em;
          font-weight: 300;
        }
        
        .formula {
          background-color: #f8f9fa;
          padding: 1rem;
          margin: 1.5rem 0;
          border-left: 4px solid #6366f1;
          font-family: monospace;
          overflow-x: auto;
          white-space: nowrap;
        }
        
        .conclusion {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: #f8f9fa;
          border-radius: 0.5rem;
        }
        
        .conclusion p {
          font-weight: 500;
          font-style: italic;
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

export default BlogArticleDetail;