import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './blog.css'

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Blog posts with actual content
  const blogPosts = [
    {
      id: 1,
      title: 'Why Cognitive Operating Systems Are the Future of Finance',
      excerpt: 'Traditional accounting software was built for record-keeping. The future demands intelligent systems that think, learn, and act.',
      category: 'Industry Insights',
      date: 'January 5, 2026',
      author: 'Vithal Deshmukh',
      image: 'https://images.pexels.com/photos/30547577/pexels-photo-30547577.jpeg?auto=compress&cs=tinysrgb&w=1500',
      slug: 'why-cognitive-operating-systems-are-future'
    },
    {
      id: 2,
      title: 'The AI Workforce Multiplier: What It Is and Why It Matters',
      excerpt: 'Understanding how AI can make one accountant as productive as ten—without replacing a single human.',
      category: 'Technology',
      date: 'January 3, 2026',
      author: 'FinACEverse Team',
      image: 'https://images.pexels.com/photos/30547598/pexels-photo-30547598.jpeg?auto=compress&cs=tinysrgb&w=1500',
      slug: 'ai-workforce-multiplier-explained'
    },
    {
      id: 3,
      title: 'Pilot Program Results: 2.5x Capacity Uplift Without New Hires',
      excerpt: 'Early adopters share their experience implementing FinACEverse and the results they\'ve achieved.',
      category: 'Case Studies',
      date: 'December 28, 2025',
      author: 'FinACEverse Research',
      image: 'https://images.pexels.com/photos/30547606/pexels-photo-30547606.jpeg?auto=compress&cs=tinysrgb&w=1500',
      slug: 'pilot-program-results-2-5x-capacity'
    },
    {
      id: 4,
      title: 'Process Mining for Accounting Firms: Finding Hidden Inefficiencies',
      excerpt: 'How EPI-Q reveals the actual workflows in your firm—and why they\'re probably different from what you think.',
      category: 'Technology',
      date: 'December 20, 2025',
      author: 'FinACEverse Team',
      image: 'https://images.pexels.com/photos/30547577/pexels-photo-30547577.jpeg?auto=compress&cs=tinysrgb&w=1500',
      slug: 'process-mining-accounting-firms'
    }
  ]
  
  const categories = ['all', 'Technology', 'Industry Insights', 'Case Studies', 'Compliance']
  
  const filteredPosts = selectedCategory === 'all' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory)
  
  return (
    <div className="blog-container">
      <Helmet>
        <title>FinACEverse Blog - Insights on Cognitive Finance & AI Automation</title>
        <meta name="description" content="Stay updated with the latest insights on cognitive finance, AI-powered accounting, tax automation, and financial intelligence from FinACEverse experts." />
        <meta name="keywords" content="finance blog, AI accounting insights, tax automation news, financial intelligence, FinTech trends" />
        <meta property="og:title" content="FinACEverse Blog - Cognitive Finance Insights" />
        <meta property="og:description" content="Expert insights on transforming financial operations with AI and cognitive technology." />
        <meta property="og:url" content="https://finaceverse.io/blog" />
        <link rel="canonical" href="https://finaceverse.io/blog" />
      </Helmet>
      
      <Navigation />
      
      <section className="blog-hero">
        <div className="container-wrapper">
          <div className="blog-hero-content">
            <h1 className="hero-title">
              Cognitive <span className="text-gradient">Insights</span>
            </h1>
            <p className="hero-subtitle">
              Explore the future of financial operations, cognitive AI, and the evolution of the accounting profession.
            </p>
          </div>
        </div>
      </section>
      
      <section className="blog-main">
        <div className="container-wrapper">
          <div className="blog-filters">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              >
                {category === 'all' ? 'All Posts' : category}
              </button>
            ))}
          </div>
          
          <div className="blog-grid">
            {filteredPosts.map(post => (
              <article key={post.id} className="blog-card">
                <div className="blog-card-image">
                  <img src={post.image} alt={post.title} />
                  <span className="blog-category-badge">{post.category}</span>
                </div>
                <div className="blog-card-content">
                  <div className="blog-meta">
                    <span className="blog-date">{post.date}</span>
                    <span className="blog-author">By {post.author}</span>
                  </div>
                  <h3 className="blog-card-title">{post.title}</h3>
                  <p className="blog-excerpt">{post.excerpt}</p>
                  <a href={`/blog/${post.slug}`} className="blog-read-more">
                    Read Article
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7-7l7 7l-7 7"/>
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
          
          {filteredPosts.length === 0 && (
            <div className="blog-empty-state">
              <p>No posts found in this category yet. Check back soon!</p>
            </div>
          )}
          
          <div className="blog-newsletter-cta">
            <div className="newsletter-cta-content">
              <h2 className="section-title">Never Miss an Insight</h2>
              <p className="section-subtitle">
                Subscribe to receive our latest articles on cognitive finance and operational intelligence.
              </p>
              <form 
                className="newsletter-cta-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const email = e.target.elements.email.value;
                  
                  try {
                    const response = await fetch('/api/mailgun', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'subscribe', email })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                      alert('Successfully subscribed to our newsletter!');
                      e.target.reset();
                    } else {
                      alert(result.message || 'Subscription failed. Please try again.');
                    }
                  } catch (error) {
                    console.error('Subscription error:', error);
                    alert('An error occurred. Please try again later.');
                  }
                }}
              >
                <input 
                  type="email" 
                  name="email"
                  placeholder="Your professional email" 
                  required 
                  className="newsletter-input"
                />
                <button type="submit" className="btn btn-primary">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  )
}

export default Blog
