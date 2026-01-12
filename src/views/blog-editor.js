import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './blog-editor.css';

// Slug generator
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

// Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = React.useRef(null);
  
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };
  
  const insertHeading = (level) => {
    execCommand('formatBlock', `h${level}`);
  };
  
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };
  
  return (
    <div className="rich-editor">
      <div className="editor-toolbar">
        <button type="button" onClick={() => execCommand('bold')} title="Bold"><b>B</b></button>
        <button type="button" onClick={() => execCommand('italic')} title="Italic"><i>I</i></button>
        <button type="button" onClick={() => execCommand('underline')} title="Underline"><u>U</u></button>
        <span className="toolbar-divider">|</span>
        <button type="button" onClick={() => insertHeading(2)} title="Heading 2">H2</button>
        <button type="button" onClick={() => insertHeading(3)} title="Heading 3">H3</button>
        <button type="button" onClick={() => execCommand('formatBlock', 'p')} title="Paragraph">¶</button>
        <span className="toolbar-divider">|</span>
        <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">•</button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} title="Numbered List">1.</button>
        <button type="button" onClick={() => execCommand('blockquote')} title="Quote">"</button>
        <span className="toolbar-divider">|</span>
        <button type="button" onClick={insertLink} title="Insert Link">🔗</button>
        <button type="button" onClick={() => execCommand('removeFormat')} title="Clear Formatting">✕</button>
      </div>
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.target.innerHTML)}
        onPaste={handlePaste}
        placeholder={placeholder}
      />
    </div>
  );
};

// AI Content Modal
const AIContentModal = ({ isOpen, onClose, onApply, postData }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationType, setGenerationType] = useState('content');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch('/api/admin/blog/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt || postData?.title || 'Cognitive finance and AI automation',
          type: generationType
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      
      const data = await res.json();
      setResult(data.generated);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleApply = () => {
    onApply(result, generationType);
    onClose();
    setResult(null);
    setPrompt('');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>✨ AI Content Generator</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div className="generation-type">
            <label>Generate:</label>
            <div className="type-buttons">
              <button 
                className={generationType === 'title' ? 'active' : ''} 
                onClick={() => setGenerationType('title')}
              >
                📝 Titles
              </button>
              <button 
                className={generationType === 'excerpt' ? 'active' : ''} 
                onClick={() => setGenerationType('excerpt')}
              >
                📄 Excerpt
              </button>
              <button 
                className={generationType === 'content' ? 'active' : ''} 
                onClick={() => setGenerationType('content')}
              >
                📰 Full Content
              </button>
              <button 
                className={generationType === 'full' ? 'active' : ''} 
                onClick={() => setGenerationType('full')}
              >
                🚀 Complete Post
              </button>
            </div>
          </div>
          
          <div className="prompt-input">
            <label>Topic or instruction:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., The benefits of AI in tax automation for small accounting firms..."
              rows={3}
            />
          </div>
          
          <button 
            className="generate-btn" 
            onClick={handleGenerate} 
            disabled={generating}
          >
            {generating ? '⏳ Generating...' : '✨ Generate'}
          </button>
          
          {error && <div className="ai-error">❌ {error}</div>}
          
          {result && (
            <div className="ai-result">
              <label>Generated Content:</label>
              <div className="result-preview" dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />
              <button className="apply-btn" onClick={handleApply}>✓ Apply This Content</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Blog Editor Component
const BlogEditor = () => {
  const history = useHistory();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showAIModal, setShowAIModal] = useState(false);
  
  // Editor state
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'Technology',
    author: 'FinACEverse Team',
    image_url: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    status: 'draft',
    featured: false
  });
  
  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      history.push('/vault-e9232b8eefbaa45e');
    }
  }, [history]);
  
  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch('/api/admin/blog/posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch('/api/admin/blog/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [fetchPosts, fetchCategories]);
  
  // Form handlers
  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title
      if (field === 'title' && !editingPost) {
        updated.slug = generateSlug(value);
      }
      // Auto-fill meta fields
      if (field === 'title' && !prev.meta_title) {
        updated.meta_title = value.substring(0, 70);
      }
      if (field === 'excerpt' && !prev.meta_description) {
        updated.meta_description = value.substring(0, 160);
      }
      return updated;
    });
  };
  
  const resetForm = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'Technology',
      author: 'FinACEverse Team',
      image_url: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      status: 'draft',
      featured: false
    });
  };
  
  const editPost = (post) => {
    setEditingPost(post.id);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || 'Technology',
      author: post.author || 'FinACEverse Team',
      image_url: post.image_url || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      meta_keywords: post.meta_keywords || '',
      status: post.status || 'draft',
      featured: post.featured || false
    });
    // Scroll to editor
    document.querySelector('.editor-panel')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const savePost = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const url = editingPost 
        ? `/api/admin/blog/posts/${editingPost}`
        : '/api/admin/blog/posts';
      
      const res = await fetch(url, {
        method: editingPost ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      
      await fetchPosts();
      resetForm();
      alert(editingPost ? 'Post updated!' : 'Post created!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const deletePost = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
      
      await fetchPosts();
      if (editingPost === id) {
        resetForm();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  
  const publishPost = async (id) => {
    try {
      const token = localStorage.getItem('superadmin_token');
      await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'published' })
      });
      await fetchPosts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  
  // AI content handler
  const handleAIApply = (content, type) => {
    if (type === 'title') {
      // Take first line as title
      const titles = content.split('\n').filter(t => t.trim());
      if (titles.length > 0) {
        handleChange('title', titles[0].replace(/^\d+\.\s*/, ''));
      }
    } else if (type === 'excerpt') {
      handleChange('excerpt', content);
    } else if (type === 'content') {
      handleChange('content', content);
    } else if (type === 'full') {
      try {
        const parsed = JSON.parse(content);
        setFormData(prev => ({
          ...prev,
          title: parsed.title || prev.title,
          excerpt: parsed.excerpt || prev.excerpt,
          content: parsed.content || prev.content,
          category: parsed.category || prev.category,
          meta_keywords: parsed.keywords || prev.meta_keywords,
          slug: generateSlug(parsed.title || prev.title)
        }));
      } catch {
        // If not JSON, treat as content
        handleChange('content', content);
      }
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: 'Draft', color: '#6b7280' },
      published: { label: 'Published', color: '#10b981' },
      archived: { label: 'Archived', color: '#f59e0b' }
    };
    const badge = badges[status] || badges.draft;
    return <span className="status-badge" style={{ background: badge.color }}>{badge.label}</span>;
  };
  
  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_refresh');
    history.push('/vault-e9232b8eefbaa45e');
  };

  return (
    <div className="blog-editor-container">
      <Helmet>
        <title>Blog Editor | SuperAdmin | FinACEverse</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <header className="blog-editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => history.push('/vault-e9232b8eefbaa45e/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>📝 Blog Editor</h1>
        </div>
        <div className="header-right">
          <button className="ai-btn" onClick={() => setShowAIModal(true)}>✨ AI Generate</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      
      <div className="blog-editor-layout">
        {/* Posts List */}
        <aside className="posts-panel">
          <div className="panel-header">
            <h2>All Posts ({posts.length})</h2>
            <button className="new-post-btn" onClick={resetForm}>+ New Post</button>
          </div>
          
          {loading ? (
            <div className="loading">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <p>No blog posts yet</p>
              <p>Create your first post!</p>
            </div>
          ) : (
            <ul className="posts-list">
              {posts.map(post => (
                <li 
                  key={post.id} 
                  className={`post-item ${editingPost === post.id ? 'active' : ''}`}
                  onClick={() => editPost(post)}
                >
                  <div className="post-item-header">
                    <span className="post-title">{post.title}</span>
                    {post.featured && <span className="featured-badge">⭐</span>}
                  </div>
                  <div className="post-item-meta">
                    {getStatusBadge(post.status)}
                    <span className="post-category">{post.category}</span>
                  </div>
                  <div className="post-item-actions">
                    {post.status === 'draft' && (
                      <button onClick={(e) => { e.stopPropagation(); publishPost(post.id); }}>
                        Publish
                      </button>
                    )}
                    <button 
                      className="delete-btn" 
                      onClick={(e) => { e.stopPropagation(); deletePost(post.id, post.title); }}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
        
        {/* Editor Panel */}
        <main className="editor-panel">
          <div className="editor-header">
            <h2>{editingPost ? 'Edit Post' : 'Create New Post'}</h2>
            {editingPost && (
              <button className="cancel-btn" onClick={resetForm}>Cancel Edit</button>
            )}
          </div>
          
          <div className="editor-form">
            {/* Title */}
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter post title..."
              />
            </div>
            
            {/* Slug */}
            <div className="form-group">
              <label>URL Slug</label>
              <div className="slug-input">
                <span>/blog/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="post-url-slug"
                />
              </div>
            </div>
            
            {/* Category & Author */}
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.slug || cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  placeholder="Author name"
                />
              </div>
            </div>
            
            {/* Excerpt */}
            <div className="form-group">
              <label>Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                placeholder="Brief description for listings and SEO..."
                rows={3}
              />
              <span className="char-count">{formData.excerpt.length}/160</span>
            </div>
            
            {/* Featured Image */}
            <div className="form-group">
              <label>Featured Image URL</label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <div className="image-preview">
                  <img src={formData.image_url} alt="Preview" />
                </div>
              )}
            </div>
            
            {/* Content Editor */}
            <div className="form-group content-group">
              <label>Content</label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => handleChange('content', html)}
                placeholder="Write your post content here..."
              />
            </div>
            
            {/* SEO Section */}
            <details className="seo-section">
              <summary>SEO Settings</summary>
              <div className="form-group">
                <label>Meta Title (max 70 chars)</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  placeholder="SEO title..."
                  maxLength={70}
                />
                <span className="char-count">{formData.meta_title.length}/70</span>
              </div>
              
              <div className="form-group">
                <label>Meta Description (max 160 chars)</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  placeholder="SEO description..."
                  rows={2}
                  maxLength={160}
                />
                <span className="char-count">{formData.meta_description.length}/160</span>
              </div>
              
              <div className="form-group">
                <label>Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={formData.meta_keywords}
                  onChange={(e) => handleChange('meta_keywords', e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </details>
            
            {/* Status & Options */}
            <div className="form-row options-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => handleChange('featured', e.target.checked)}
                  />
                  Featured Post
                </label>
              </div>
            </div>
            
            {/* Actions */}
            <div className="form-actions">
              <button className="save-draft-btn" onClick={() => { formData.status = 'draft'; savePost(); }}>
                Save Draft
              </button>
              <button className="publish-btn" onClick={() => { formData.status = 'published'; savePost(); }} disabled={saving}>
                {saving ? 'Saving...' : (editingPost ? 'Update & Publish' : 'Publish Post')}
              </button>
            </div>
          </div>
        </main>
      </div>
      
      {/* AI Modal */}
      <AIContentModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApply={handleAIApply}
        postData={formData}
      />
    </div>
  );
};

export default BlogEditor;
