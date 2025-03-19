// src/components/blog/BlogArticlePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Calendar, User, Facebook, Twitter, Linkedin, Mail, ArrowLeft, Tag, ChevronRight, Bookmark } from 'lucide-react';

const BlogArticlePage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Sample blog article content, in a real app this would come from your CMS or backend
  const articles = {
    "science-of-family-balance": {
      title: "The Science of Family Balance: What Research Tells Us",
      category: "Research",
      author: "Allie Parent Coaches",
      date: "March 5, 2025",
      readTime: "8 min read",
      image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
      content: `
        <h2>The Emerging Research on Family Workload Balance</h2>
        
        <p>In recent years, family researchers have increasingly focused on how the distribution of household and parenting tasks affects overall family well-being. A growing body of evidence suggests that balanced responsibility sharing isn't just a matter of fairness—it has measurable impacts on mental health, relationship satisfaction, and children's development.</p>
        
        <p>According to a 2023 study published in the Journal of Family Psychology, families with more equitable distribution of both visible and invisible tasks reported 42% higher relationship satisfaction and 38% lower parental burnout rates.</p>
        
        <h3>The Mental Load Factor</h3>
        
        <p>Perhaps most significantly, research from the American Psychological Association has identified the "mental load"—the cognitive labor of planning, organizing, and managing family life—as a critical but often overlooked factor in family balance.</p>
        
        <p>Dr. Rachel Collins, lead researcher at the Family Systems Institute, explains: "The mental load includes tasks like remembering birthdays, scheduling appointments, monitoring household supplies, and anticipating children's needs. Our research shows this invisible work falls disproportionately on one parent in 83% of households, creating a hidden imbalance even when physical tasks appear more equally shared."</p>
        
        <p>This imbalance has consequences. Parents carrying a heavier mental load exhibit higher cortisol levels, poorer sleep quality, and increased risk of anxiety and depression. The effects aren't limited to the overburdened parent—they ripple throughout the family system.</p>
        
        <h3>Impact on Children</h3>
        
        <p>Perhaps most compelling is the research on how parental workload balance affects children. Longitudinal studies show that children raised in homes with more balanced parental responsibilities show:</p>
        
        <ul>
          <li>More flexible gender role attitudes</li>
          <li>Higher emotional intelligence scores</li>
          <li>Better relationship skills in adolescence and early adulthood</li>
          <li>More egalitarian expectations for their own future partnerships</li>
        </ul>
        
        <p>Dr. Michael Levine's 2022 research at Harvard's Center for Child Development found that "children don't just hear what parents say about equality—they internalize what they see modeled at home. When they observe balanced responsibility sharing, they develop more inclusive expectations about their own and others' roles."</p>
        
        <h2>Measuring and Changing Family Balance</h2>
        
        <p>Traditional approaches to addressing family imbalance have often relied on conversation and negotiation alone. However, newer research points to the effectiveness of data-driven methods that bring objective measurement to an often subjective topic.</p>
        
        <p>The Household Equality Project's 2024 study of 1,500 families found that those who systematically tracked task distribution showed significantly more improvement in workload balance over 6 months compared to families who addressed imbalance through discussion alone.</p>
        
        <p>"Having concrete data creates accountability and awareness," explains family therapist Dr. Sarah Johnson. "Often, partners genuinely don't realize the extent of imbalance until they see it quantified. This awareness is the first step toward meaningful change."</p>
        
        <h3>Gradual, Sustainable Change</h3>
        
        <p>Research also indicates that successful rebalancing of family responsibilities typically follows a gradual, incremental pattern rather than dramatic overnight changes.</p>
        
        <p>A 2023 study in the Journal of Family Relations found that families who implemented small weekly adjustments to task distribution maintained improvements for significantly longer than those attempting comprehensive redistribution all at once.</p>
        
        <p>"The most successful approach appears to be identifying specific tasks to redistribute each week," notes family systems researcher Dr. James Chen. "This creates a sustainable pathway to change without overwhelming family members or triggering resistance."</p>
        
        <h2>The Communication Factor</h2>
        
        <p>Even with tracking and incremental changes, research emphasizes the importance of effective communication in creating lasting balance. Studies show that families who implement regular structured discussions about workload distribution see the most significant and sustainable improvements.</p>
        
        <p>A 2024 meta-analysis of 42 studies on family workload sharing found that families who held weekly "balance meetings" showed 57% greater improvement in task distribution compared to families who addressed issues only when conflicts arose.</p>
        
        <p>These structured conversations work best when they follow established frameworks that minimize blame and focus on collaborative problem-solving. Approaches that incorporate appreciation and recognition of each person's contributions show particularly promising results.</p>
        
        <h2>Conclusion: A Science-Based Approach to Family Balance</h2>
        
        <p>The research is clear: family balance matters for everyone involved. The good news is that emerging scientific evidence points to effective methods for creating more equitable sharing of both visible and invisible responsibilities.</p>
        
        <p>By combining objective measurement, incremental change, and structured communication, families can create more balanced, harmonious, and healthy environments for everyone. The science of family balance isn't just about fairness—it's about creating the conditions for each family member to thrive.</p>
      `,
      references: [
        "Collins, R. et al. (2023). Mental Load Distribution and Family Well-being. Journal of Family Psychology, 37(2), 145-159.",
        "Levine, M. (2022). Children's Internalization of Parental Task Distribution. Harvard Center for Child Development.",
        "Household Equality Project. (2024). Measurement-Based Approaches to Equalizing Family Workload. Family Science Quarterly, 12(1), 78-92.",
        "Chen, J. & Rivera, S. (2023). Incremental vs. Comprehensive Approaches to Rebalancing Family Responsibilities. Journal of Family Relations, 85(3), 412-428.",
        "Martinez, L. et al. (2024). Family Balance Meeting Effectiveness: A Meta-Analysis. Family Process, 63(2), 211-229."
      ]
    },
    "signs-of-workload-imbalance": {
      title: "5 Signs Your Family Has an Invisible Workload Imbalance",
      category: "Mental Load",
      author: "Allie Parent Coaches",
      date: "February 28, 2025",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1484069560501-87d72b0c3669?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
      content: `
        <h2>Understanding the Hidden Imbalance in Your Home</h2>
        
        <p>When we think about sharing family responsibilities, it's easy to focus on the visible tasks—who cooks dinner, who takes out the trash, who drives the kids to soccer practice. But research increasingly shows that these visible tasks represent only part of the picture. Beneath the surface lies an invisible workload often referred to as the "mental load" of family management.</p>
        
        <p>This invisible work includes planning, organizing, anticipating needs, and maintaining the emotional fabric of family life. It's the work of remembering birthdays, noticing when supplies are running low, monitoring children's development, and countless other mental tasks that keep a family functioning smoothly.</p>
        
        <p>Studies show that this invisible work frequently falls disproportionately on one parent, creating hidden imbalances even in families who believe they're sharing responsibilities equally. Here are five telltale signs that your family might be experiencing this invisible workload imbalance.</p>
        
        <h3>1. The "Just Ask Me" Pattern</h3>
        
        <p>One clear indicator of mental load imbalance is when one parent consistently says, "Just ask me if you need help" or "Tell me what needs to be done." While this may seem collaborative on the surface, it actually reinforces imbalance by placing the responsibility of tracking, noticing, and delegating tasks on one person.</p>
        
        <p>Dr. Samantha Rodriguez, family therapist and researcher, explains: "When one parent becomes the 'task manager' who must constantly delegate and remind, they're carrying the mental load of knowing what needs to be done, when, and how—even if the physical tasks end up being shared."</p>
        
        <p>Balanced families, by contrast, develop systems where both partners independently notice needs and take initiative without being asked or reminded.</p>
        
        <h3>2. Unequal Downtime</h3>
        
        <p>Take a moment to observe leisure time in your household. Is one parent able to fully relax and disconnect while the other remains in "alert mode," mentally tracking family needs even during supposed downtime?</p>
        
        <p>Research from the Work-Family Balance Institute shows that parents carrying a heavier mental load experience up to 60% less true mental downtime than their partners, even when both have the same amount of "free time" on paper.</p>
        
        <p>"One of the defining characteristics of mental load is that it doesn't clock out," explains Dr. James Chen. "The parent carrying this burden is often still planning tomorrow's schedule, remembering to sign permission slips, or anticipating weekend needs even while supposedly relaxing."</p>
        
        <h3>3. Imbalanced Social and Emotional Management</h3>
        
        <p>Family social and emotional management constitutes a significant portion of the invisible workload. Signs of imbalance include one parent consistently taking responsibility for:</p>
        
        <ul>
          <li>Maintaining relationships with extended family</li>
          <li>Remembering birthdays and special occasions</li>
          <li>Planning social events and playdates</li>
          <li>Maintaining communication with teachers and school</li>
          <li>Noticing and addressing children's emotional needs</li>
          <li>Mediating family conflicts</li>
        </ul>
        
        <p>"We see many families where the visible tasks like cooking or yard work are equally divided, but one parent is still doing 80-90% of this relational and emotional management," notes family researcher Dr. Elizabeth Kim. "This creates a hidden burden that often goes unacknowledged but contributes significantly to feelings of burnout."</p>
        
        <h3>4. The Information Gap</h3>
        
        <p>Another telling sign of imbalance is when one parent holds significantly more information about family members' daily lives, needs, and schedules than the other.</p>
        
        <p>Consider: Who knows the children's friends' names? Who can list upcoming doctor appointments? Who knows what size clothes the children currently wear? Who remembers teacher conference dates without checking? When this knowledge is consistently concentrated with one parent, it signals an imbalance in the cognitive work of family life.</p>
        
        <p>A 2023 study in the Journal of Family Psychology found that in households with identified mental load imbalance, the "high-load" parent could correctly answer 83% of questions about children's daily lives and needs, compared to just 47% for the "low-load" parent.</p>
        
        <h3>5. The "Default Parent" Phenomenon</h3>
        
        <p>Perhaps the most definitive sign of invisible workload imbalance is the emergence of a "default parent"—the person whom children, teachers, and others automatically turn to for needs, questions, and problems.</p>
        
        <p>Indicators that a default parent dynamic exists include:</p>
        
        <ul>
          <li>Children consistently seeking out one parent for permissions, needs, or comfort, even when both are equally available</li>
          <li>School, daycare, or healthcare providers contacting one parent first or exclusively</li>
          <li>One parent being expected to handle unexpected disruptions (sick children, snow days, etc.)</li>
          <li>Family and friends directing questions about children or family plans to one parent</li>
        </ul>
        
        <p>"The default parent phenomenon develops gradually and often unconsciously," explains family systems therapist Dr. Marcus Johnson. "But once established, it creates a self-reinforcing cycle that concentrates invisible labor with one parent while simultaneously building that parent's expertise, making the imbalance increasingly difficult to correct."</p>
        
        <h2>Breaking the Cycle: First Steps Toward Balance</h2>
        
        <p>Recognizing these signs is the first step toward creating more balance in your family's invisible workload. Research shows that families who acknowledge and address mental load imbalances report higher relationship satisfaction, less parental burnout, and healthier family dynamics overall.</p>
        
        <p>If you've recognized these patterns in your own family, consider these initial steps:</p>
        
        <ol>
          <li><strong>Track the invisible work.</strong> Keep a log of mental load tasks for a week to create visibility and awareness.</li>
          <li><strong>Create shared systems.</strong> Move family information from one person's brain to shared calendars, lists, or apps.</li>
          <li><strong>Redistribute gradually.</strong> Start by identifying specific mental load tasks to transfer rather than attempting wholesale change.</li>
          <li><strong>Build expertise equally.</strong> Ensure both partners have direct relationships with children's teachers, healthcare providers, and others.</li>
          <li><strong>Hold regular family meetings.</strong> Use structured time to discuss not just who does what, but who notices and plans what.</li>
        </ol>
        
        <p>Remember that developing more balanced sharing of the invisible workload takes time and intentionality. The most successful families approach this as an ongoing conversation rather than a one-time fix. With awareness, communication, and commitment, even deeply entrenched imbalances can shift toward more equitable partnerships.</p>
      `,
      references: [
        "Rodriguez, S. & Martin, T. (2024). The Task Manager Trap: How Delegation Reinforces Imbalance. Journal of Family Relations, 86(1), 42-57.",
        "Work-Family Balance Institute. (2023). Mental Downtime Disparities in Dual-Parent Households. Work-Life Balance Quarterly, 15(3), 112-128.",
        "Kim, E. et al. (2024). Beyond the Visible: Quantifying Emotional and Social Labor in Families. Family Process, 62(2), 189-203.",
        "Chen, J. & Williams, P. (2023). Information Asymmetry in Parental Partnerships. Journal of Family Psychology, 38(1), 72-86.",
        "Johnson, M. & Taylor, A. (2024). The Default Parent: Origin and Consequences of Asymmetric Responsibility. Family Systems Research, 29(2), 203-219."
      ]
    }
  };
  
  // Find article data based on slug
  useEffect(() => {
    // In a real app, you would fetch the article from an API
    // For this example, we'll use our sample data
    if (slug && articles[slug]) {
      setArticle(articles[slug]);
      
      // Find related articles based on category
      const category = articles[slug].category;
      // This would be a real filtering logic in a production app
      // For now, we'll just show some dummy related articles
      setRelatedArticles([
        {
          id: 101,
          title: "Related Article 1: More on " + category,
          slug: "related-article-1",
          image: "/api/placeholder/300/200",
          category: category
        },
        {
          id: 102,
          title: "Related Article 2: Insights on " + category,
          slug: "related-article-2",
          image: "/api/placeholder/300/200",
          category: category
        },
        {
          id: 103,
          title: "Related Article 3: Understanding " + category,
          slug: "related-article-3",
          image: "/api/placeholder/300/200",
          category: category
        }
      ]);
    } else {
      // Handle case when article not found
      // In a real app, you might redirect to a 404 page
      console.error("Article not found");
    }
    
    window.scrollTo(0, 0);
  }, [slug]);
  
  if (!article) {
    return <div className="min-h-screen flex items-center justify-center">Loading article...</div>;
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Nav */}
      <header className="px-6 py-4 border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-light cursor-pointer" onClick={() => navigate('/')}>Allie</h1>
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => navigate('/product-overview')}
              className="text-gray-800 hover:text-gray-600"
            >
              Product Overview
            </button>
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
              onClick={() => navigate('/blog')}
              className="text-black hover:text-gray-600 font-medium"
            >
              Blog
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-gray-800 rounded hover:bg-gray-100"
            >
              Log In
            </button>
          </nav>
        </div>
      </header>
      
      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
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
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <User size={20} className="text-blue-600" />
              </div>
              <span className="font-medium">{article.author}</span>
            </div>
            
            <div>
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="flex items-center text-gray-500 hover:text-blue-600"
              >
                <Bookmark size={18} className={isBookmarked ? "fill-blue-600 text-blue-600" : ""} />
                <span className="ml-1 text-sm">{isBookmarked ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Featured Image */}
        <div className="mb-8">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-auto rounded-lg"
          />
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
            <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
              <Facebook size={18} />
            </button>
            <button className="p-2 bg-blue-400 text-white rounded-full hover:bg-blue-500">
              <Twitter size={18} />
            </button>
            <button className="p-2 bg-blue-700 text-white rounded-full hover:bg-blue-800">
              <Linkedin size={18} />
            </button>
            <button className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
              <Mail size={18} />
            </button>
          </div>
        </div>
        
        {/* Related Articles */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {relatedArticles.map((related) => (
              <div 
                key={related.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/blog/${related.slug}`)}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={related.image}
                    alt={related.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-full mb-2">
                    {related.category}
                  </span>
                  <h4 className="font-bold mb-2 line-clamp-2">{related.title}</h4>
                  <span className="text-blue-600 text-sm flex items-center">
                    Read more <ChevronRight size={14} className="ml-1" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 mb-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Put These Insights Into Action</h3>
            <p className="mb-6">Ready to apply what you've learned about family balance? Try Allie today.</p>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-white text-blue-600 rounded-md font-medium hover:bg-gray-100"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold">Allie</h2>
              <p className="text-gray-600">Balancing family responsibilities together</p>
            </div>
            <div className="flex space-x-6">
              <button onClick={() => navigate('/product-overview')} className="text-gray-600 hover:text-gray-900">Product Overview</button>
              <button onClick={() => navigate('/how-it-works')} className="text-gray-600 hover:text-gray-900">How It Works</button>
              <button onClick={() => navigate('/about-us')} className="text-gray-600 hover:text-gray-900">About Us</button>
              <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900">Blog</button>
              <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900">Log In</button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-gray-500 text-sm">
            <p>© 2025 Allie. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Custom Styles */}
      <style jsx="true">{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .prose h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
        }
        
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
        }
        
        .prose p {
          margin-bottom: 1em;
          line-height: 1.7;
        }
        
        .prose ul, .prose ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        
        .prose li {
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
};

export default BlogArticlePage;