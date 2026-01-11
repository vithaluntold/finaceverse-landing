import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import './content-editor.css';

// AI Generation Modal Component
const AIGeneratorModal = ({ isOpen, onClose, onGenerate, fieldName, sectionType, currentValue, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  
  if (!isOpen) return null;
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const result = await onGenerate(prompt);
    if (result) {
      setGeneratedContent(result);
    }
  };
  
  const handleApply = () => {
    onClose(generatedContent);
    setPrompt('');
    setGeneratedContent('');
  };
  
  const handleCancel = () => {
    onClose(null);
    setPrompt('');
    setGeneratedContent('');
  };
  
  return (
    <div className="ai-modal-overlay" onClick={handleCancel}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>✨ AI Content Generator</h3>
          <button className="ai-modal-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div className="ai-field-info">
            <span className="ai-field-label">Generating for:</span>
            <span className="ai-field-name">{fieldName}</span>
            <span className="ai-section-type">({sectionType.replace('_', ' ')})</span>
          </div>
          
          {currentValue && (
            <div className="ai-current-value">
              <label>Current value:</label>
              <div className="ai-current-preview">{currentValue.substring(0, 100)}{currentValue.length > 100 ? '...' : ''}</div>
            </div>
          )}
          
          <div className="ai-prompt-section">
            <label>Describe what you want:</label>
            <textarea
              className="ai-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`E.g., "Write a compelling description for an AI-powered tax automation tool that saves 60% time"`}
              rows={3}
            />
            
            <div className="ai-prompt-actions">
              <span className="ai-provider-badge">Azure OpenAI</span>
              
              <button 
                className="ai-generate-btn"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate'}
              </button>
            </div>
          </div>
          
          {generatedContent && (
            <div className="ai-result-section">
              <label>Generated Content:</label>
              <div className="ai-result-preview">
                <div dangerouslySetInnerHTML={{ __html: generatedContent.replace(/\n/g, '<br/>') }} />
              </div>
              <div className="ai-result-actions">
                <button className="ai-regenerate-btn" onClick={handleGenerate} disabled={isGenerating}>
                  🔄 Regenerate
                </button>
                <button className="ai-apply-btn" onClick={handleApply}>
                  ✓ Apply Content
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="ai-modal-footer">
          <div className="ai-quick-prompts">
            <span>Quick prompts:</span>
            <button onClick={() => setPrompt('Make it more compelling and action-oriented')}>More compelling</button>
            <button onClick={() => setPrompt('Make it shorter and punchier')}>Shorter</button>
            <button onClick={() => setPrompt('Add specific statistics and benefits')}>Add stats</button>
            <button onClick={() => setPrompt('Make it sound more professional')}>Professional</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Generate Complete Item Modal
const AIGenerateItemModal = ({ isOpen, onClose, onGenerate, sectionType, existingItems, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedItem, setGeneratedItem] = useState(null);
  
  if (!isOpen) return null;
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const result = await onGenerate(prompt, existingItems);
    if (result) {
      setGeneratedItem(result);
    }
  };
  
  const handleApply = () => {
    onClose(generatedItem);
    setPrompt('');
    setGeneratedItem(null);
  };
  
  const handleCancel = () => {
    onClose(null);
    setPrompt('');
    setGeneratedItem(null);
  };
  
  return (
    <div className="ai-modal-overlay" onClick={handleCancel}>
      <div className="ai-modal ai-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>✨ AI Generate Complete {sectionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
          <button className="ai-modal-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div className="ai-prompt-section">
            <label>Describe the {sectionType.replace('_', ' ')} you want to create:</label>
            <textarea
              className="ai-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`E.g., "Create a new product module for AI-powered invoice processing that integrates with QuickBooks"`}
              rows={4}
            />
            
            <div className="ai-prompt-actions">
              <span className="ai-provider-badge">Azure OpenAI</span>
              
              <button 
                className="ai-generate-btn"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate Complete Item'}
              </button>
            </div>
          </div>
          
          {generatedItem && (
            <div className="ai-result-section">
              <label>Generated Item Preview:</label>
              <div className="ai-item-preview">
                {Object.entries(generatedItem).map(([key, value]) => (
                  <div key={key} className="ai-item-field">
                    <span className="ai-item-key">{key}:</span>
                    <span className="ai-item-value" dangerouslySetInnerHTML={{ __html: String(value) }} />
                  </div>
                ))}
              </div>
              <div className="ai-result-actions">
                <button className="ai-regenerate-btn" onClick={handleGenerate} disabled={isGenerating}>
                  🔄 Regenerate
                </button>
                <button className="ai-apply-btn" onClick={handleApply}>
                  ✓ Add This Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// CONTENT SCHEMA - Defines ALL editable sections and their fields
// This allows dynamic addition of module cards, crisis cards, personas, etc.
const CONTENT_SCHEMA = {
  // ============ HOMEPAGE SECTIONS ============
  hero: {
    label: 'Hero Section',
    icon: '🏠',
    type: 'single',
    page: 'home',
    fields: {
      badge_text: { type: 'text', label: 'Badge Text', default: "The World's First Cognitive OS for Finance" },
      title_line1: { type: 'text', label: 'Title Line 1', default: 'Unifying the Finance' },
      title_highlight: { type: 'text', label: 'Title Highlight Word', default: 'Multiverse' },
      subtitle: { type: 'textarea', label: 'Subtitle/Description', default: '' },
      cta_primary_text: { type: 'text', label: 'Primary Button Text', default: 'Request Demo' },
      cta_primary_link: { type: 'text', label: 'Primary Button Link', default: '/request-demo' },
      cta_secondary_text: { type: 'text', label: 'Secondary Button Text', default: 'Join Pilot Program' },
      cta_secondary_link: { type: 'text', label: 'Secondary Button Link', default: '/tailored-pilots' },
      video_url: { type: 'text', label: 'Background Video URL', default: '' },
      video_poster: { type: 'image', label: 'Video Poster Image', default: '' }
    }
  },
  
  fragmentation_crisis: {
    label: 'Fragmentation Crisis',
    icon: '⚠️',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'Section Title', default: 'The Fragmentation' },
      title_highlight: { type: 'text', label: 'Highlight Word', default: 'Crisis' },
      subtitle: { type: 'textarea', label: 'Section Subtitle', default: '' }
    }
  },
  
  crisis_cards: {
    label: 'Crisis Problem Cards',
    icon: '🃏',
    type: 'array',
    page: 'home',
    itemLabel: 'Problem Card',
    fields: {
      title: { type: 'text', label: 'Card Title', default: '' },
      description: { type: 'textarea', label: 'Description', default: '' },
      icon_svg: { type: 'textarea', label: 'Icon SVG Code', default: '' },
      stat_value: { type: 'text', label: 'Stat Value (e.g., 85%)', default: '' },
      stat_label: { type: 'text', label: 'Stat Label', default: '' },
      image_url: { type: 'image', label: 'Background Image', default: '' },
      card_size: { type: 'select', label: 'Card Size', options: ['narrow', 'wide', 'full'], default: 'narrow' },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  who_its_for: {
    label: 'Who It\'s For Header',
    icon: '👥',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'Section Title', default: 'Who' },
      title_highlight: { type: 'text', label: 'Highlight', default: "It's Built For" },
      subtitle: { type: 'textarea', label: 'Subtitle', default: '' }
    }
  },
  
  persona_cards: {
    label: 'Target Persona Cards',
    icon: '🎯',
    type: 'array',
    page: 'home',
    itemLabel: 'Persona',
    fields: {
      title: { type: 'text', label: 'Persona Title', default: '' },
      subtitle: { type: 'text', label: 'Subtitle', default: '' },
      icon_svg: { type: 'textarea', label: 'Icon SVG', default: '' },
      pain_point: { type: 'textarea', label: 'Pain Point (Problem)', default: '' },
      solution: { type: 'textarea', label: 'Solution (How we help)', default: '' },
      roi_text: { type: 'text', label: 'ROI Highlight', default: '' },
      card_size: { type: 'select', label: 'Card Size', options: ['narrow', 'wide', 'full'], default: 'narrow' },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  architecture_header: {
    label: 'Architecture Section Header',
    icon: '🏗️',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'Section Title', default: 'Cognitive OS' },
      title_highlight: { type: 'text', label: 'Highlight', default: 'Architecture' },
      subtitle: { type: 'textarea', label: 'Subtitle', default: '' }
    }
  },
  
  architecture_steps: {
    label: 'Architecture Timeline Steps',
    icon: '📍',
    type: 'array',
    page: 'home',
    itemLabel: 'Step',
    fields: {
      step_number: { type: 'text', label: 'Step Number', default: '01' },
      title: { type: 'text', label: 'Step Title', default: '' },
      description: { type: 'textarea', label: 'Description', default: '' },
      position: { type: 'select', label: 'Timeline Position', options: ['left', 'right'], default: 'left' },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  // ============ MODULES SECTION ============
  modules_header: {
    label: 'Modules Section Header',
    icon: '📦',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'Section Title', default: 'The Integrated' },
      title_highlight: { type: 'text', label: 'Highlight', default: 'Modules' },
      subtitle_phase1: { type: 'text', label: 'Phase 1 Subtitle', default: 'Phase 1: Five powerful modules launching now.' },
      subtitle_phase2: { type: 'text', label: 'Phase 2 Subtitle', default: 'Nine specialized engines working in harmony.' }
    }
  },
  
  module_cards: {
    label: '⭐ Product Module Cards',
    icon: '🧩',
    type: 'array',
    page: 'both',
    itemLabel: 'Module',
    description: 'Add, edit, or remove product modules displayed on the website',
    fields: {
      name: { type: 'text', label: 'Module Name', default: '', required: true },
      slug: { type: 'text', label: 'URL Slug (lowercase, no spaces)', default: '' },
      tagline: { type: 'text', label: 'Short Tagline', default: '' },
      short_description: { type: 'text', label: 'Short Description (for cards)', default: '' },
      description: { type: 'textarea', label: 'Full Description (supports HTML like <strong>text</strong>)', default: '' },
      tag: { type: 'text', label: 'Module Tag/Category', default: '' },
      tag_label: { type: 'text', label: 'Badge Label (e.g., "The Brain")', default: '' },
      icon_svg: { type: 'textarea', label: 'Icon SVG Code', default: '' },
      image_url: { type: 'image', label: 'Module Image/Logo', default: '' },
      website_url: { type: 'text', label: 'External Website URL (e.g., https://accute.io)', default: '' },
      external_url: { type: 'text', label: 'Internal Link (legacy)', default: '' },
      phase: { type: 'select', label: 'Launch Phase', options: ['1', '2', '3'], default: '1' },
      status: { type: 'select', label: 'Status', options: ['launched', 'launching', 'coming_soon', 'planned'], default: 'planned' },
      is_featured: { type: 'checkbox', label: 'Show on Homepage', default: true },
      card_size: { type: 'select', label: 'Card Size', options: ['small', 'medium', 'large'], default: 'medium' },
      features: { type: 'tags', label: 'Key Features (comma-separated)', default: '' },
      benefit_highlight: { type: 'text', label: 'Key Benefit Highlight', default: '' },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  // ============ COGNITIVE ARCHITECTURE SECTION ============
  cognitive_section: {
    label: 'Cognitive Architecture Details',
    icon: '🧠',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'Title', default: 'The' },
      title_highlight: { type: 'text', label: 'Highlight', default: 'Cognitive OS Architecture' },
      description: { type: 'textarea', label: 'Description', default: '' }
    }
  },
  
  // ============ TESTIMONIALS ============
  testimonials: {
    label: 'Customer Testimonials',
    icon: '💬',
    type: 'array',
    page: 'home',
    itemLabel: 'Testimonial',
    fields: {
      quote: { type: 'textarea', label: 'Quote Text', default: '' },
      author_name: { type: 'text', label: 'Author Name', default: '' },
      author_title: { type: 'text', label: 'Author Title/Role', default: '' },
      author_company: { type: 'text', label: 'Company Name', default: '' },
      author_image: { type: 'image', label: 'Author Photo', default: '' },
      rating: { type: 'number', label: 'Rating (1-5)', default: 5 },
      is_featured: { type: 'checkbox', label: 'Featured', default: false },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  // ============ CTA SECTION ============
  cta_section: {
    label: 'Call to Action Section',
    icon: '📢',
    type: 'single',
    page: 'home',
    fields: {
      title: { type: 'text', label: 'CTA Title', default: '' },
      subtitle: { type: 'textarea', label: 'CTA Subtitle', default: '' },
      primary_btn_text: { type: 'text', label: 'Primary Button', default: 'Get Started' },
      primary_btn_link: { type: 'text', label: 'Primary Button Link', default: '/request-demo' },
      secondary_btn_text: { type: 'text', label: 'Secondary Button', default: 'Learn More' },
      secondary_btn_link: { type: 'text', label: 'Secondary Button Link', default: '/modules' },
      background_image: { type: 'image', label: 'Background Image', default: '' }
    }
  },
  
  // ============ FOOTER ============
  footer: {
    label: 'Footer Content',
    icon: '📋',
    type: 'single',
    page: 'global',
    fields: {
      company_description: { type: 'textarea', label: 'Company Description', default: '' },
      copyright_text: { type: 'text', label: 'Copyright Text', default: '© 2026 FinACEverse. All rights reserved.' },
      contact_email: { type: 'text', label: 'Contact Email', default: 'hello@finaceverse.io' },
      contact_phone: { type: 'text', label: 'Contact Phone', default: '' },
      address: { type: 'textarea', label: 'Address', default: '' }
    }
  },
  
  footer_links: {
    label: 'Footer Navigation Links',
    icon: '🔗',
    type: 'array',
    page: 'global',
    itemLabel: 'Link',
    fields: {
      text: { type: 'text', label: 'Link Text', default: '' },
      url: { type: 'text', label: 'URL', default: '' },
      section: { type: 'select', label: 'Footer Section', options: ['products', 'company', 'resources', 'legal'], default: 'company' },
      open_new_tab: { type: 'checkbox', label: 'Open in New Tab', default: false },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  },
  
  social_links: {
    label: 'Social Media Links',
    icon: '📱',
    type: 'array',
    page: 'global',
    itemLabel: 'Social Link',
    fields: {
      platform: { type: 'select', label: 'Platform', options: ['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'github'], default: 'linkedin' },
      url: { type: 'text', label: 'Profile URL', default: '' },
      icon_svg: { type: 'textarea', label: 'Custom Icon SVG (optional)', default: '' },
      display_order: { type: 'number', label: 'Display Order', default: 0 }
    }
  }
};

function ContentEditor() {
  const history = useHistory();
  const [content, setContent] = useState({});
  const [originalContent, setOriginalContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('module_cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  
  // AI Generation State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiItemModalOpen, setAiItemModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFieldTarget, setAiFieldTarget] = useState({ sectionKey: '', fieldKey: '', index: null, currentValue: '' });
  const [aiStatus, setAiStatus] = useState({ configured: false, providers: {} });

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      history.push('/vault-e9232b8eefbaa45e');
      return;
    }
    fetchContent();
    fetchAIStatus();
  }, [history]);
  
  // Fetch AI configuration status
  const fetchAIStatus = async () => {
    try {
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/ai/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.log('AI not configured');
    }
  };

  // Generate content for a single field
  const generateFieldContent = async (userPrompt) => {
    try {
      setAiGenerating(true);
      const token = localStorage.getItem('superadmin_token');
      
      const response = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sectionType: aiFieldTarget.sectionKey,
          fieldName: aiFieldTarget.fieldKey,
          userPrompt,
          context: aiFieldTarget.index !== null 
            ? content[aiFieldTarget.sectionKey]?.[aiFieldTarget.index]
            : content[aiFieldTarget.sectionKey]
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Generation failed');
      }
      
      const data = await response.json();
      return data.content;
    } catch (err) {
      setError(`AI Error: ${err.message}`);
      setTimeout(() => setError(''), 5000);
      return null;
    } finally {
      setAiGenerating(false);
    }
  };
  
  // Generate complete item
  const generateCompleteItem = async (userPrompt, existingItems) => {
    try {
      setAiGenerating(true);
      const token = localStorage.getItem('superadmin_token');
      
      const response = await fetch('/api/admin/ai/generate-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sectionType: activeSection,
          userPrompt,
          existingItems
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Generation failed');
      }
      
      const data = await response.json();
      return data.item;
    } catch (err) {
      setError(`AI Error: ${err.message}`);
      setTimeout(() => setError(''), 5000);
      return null;
    } finally {
      setAiGenerating(false);
    }
  };
  
  // Open AI modal for field
  const openAIForField = (sectionKey, fieldKey, currentValue, index = null) => {
    setAiFieldTarget({ sectionKey, fieldKey, index, currentValue });
    setAiModalOpen(true);
  };
  
  // Handle AI modal close
  const handleAIModalClose = (generatedContent) => {
    if (generatedContent) {
      handleFieldChange(
        aiFieldTarget.sectionKey,
        aiFieldTarget.fieldKey,
        generatedContent,
        aiFieldTarget.index
      );
      setSuccess('AI content applied!');
      setTimeout(() => setSuccess(''), 2000);
    }
    setAiModalOpen(false);
  };
  
  // Handle AI item modal close
  const handleAIItemModalClose = (generatedItem) => {
    if (generatedItem) {
      const schema = CONTENT_SCHEMA[activeSection];
      const currentItems = content[activeSection] || [];
      
      // Merge with schema defaults
      const newItem = {};
      Object.entries(schema.fields).forEach(([key, field]) => {
        newItem[key] = generatedItem[key] || field.default;
      });
      newItem.display_order = currentItems.length;
      
      setContent(prev => ({
        ...prev,
        [activeSection]: [...(prev[activeSection] || []), newItem]
      }));
      
      setSuccess('AI-generated item added!');
      setTimeout(() => setSuccess(''), 2000);
    }
    setAiItemModalOpen(false);
  };

  // Track unsaved changes
  useEffect(() => {
    const changed = JSON.stringify(content) !== JSON.stringify(originalContent);
    setHasUnsavedChanges(changed);
  }, [content, originalContent]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/content/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setContent(data.content || {});
      setOriginalContent(data.content || {});
    } catch (err) {
      setError('Failed to load content. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const saveAllContent = async () => {
    try {
      setSaving(true);
      setError('');
      
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/content/all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      setOriginalContent(content);
      setSuccess('All changes saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (sectionKey, fieldKey, value, index = null) => {
    setContent(prev => {
      const newContent = { ...prev };
      
      if (index !== null) {
        // Array item update
        if (!newContent[sectionKey]) newContent[sectionKey] = [];
        const items = [...newContent[sectionKey]];
        if (!items[index]) items[index] = {};
        items[index] = { ...items[index], [fieldKey]: value };
        newContent[sectionKey] = items;
      } else {
        // Single section update
        if (!newContent[sectionKey]) newContent[sectionKey] = {};
        newContent[sectionKey] = { ...newContent[sectionKey], [fieldKey]: value };
      }
      
      return newContent;
    });
  };

  const addArrayItem = (sectionKey) => {
    const schema = CONTENT_SCHEMA[sectionKey];
    const newItem = {};
    
    // Initialize with defaults
    Object.entries(schema.fields).forEach(([key, field]) => {
      newItem[key] = field.default;
    });
    
    // Set display order
    const currentItems = content[sectionKey] || [];
    newItem.display_order = currentItems.length;
    
    setContent(prev => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), newItem]
    }));
    
    // Auto-expand new item
    setExpandedItems(prev => ({
      ...prev,
      [`${sectionKey}-${currentItems.length}`]: true
    }));
    
    setSuccess(`New ${schema.itemLabel} added!`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const removeArrayItem = (sectionKey, index) => {
    const schema = CONTENT_SCHEMA[sectionKey];
    const item = content[sectionKey]?.[index];
    const itemName = item?.name || item?.title || `${schema.itemLabel} #${index + 1}`;
    
    if (window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      setContent(prev => ({
        ...prev,
        [sectionKey]: prev[sectionKey].filter((_, i) => i !== index)
      }));
      setSuccess(`${schema.itemLabel} deleted`);
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const moveArrayItem = (sectionKey, index, direction) => {
    setContent(prev => {
      const items = [...(prev[sectionKey] || [])];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= items.length) return prev;
      
      // Swap items
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      
      // Update display_order
      items.forEach((item, i) => {
        item.display_order = i;
      });
      
      return { ...prev, [sectionKey]: items };
    });
  };

  const duplicateArrayItem = (sectionKey, index) => {
    const schema = CONTENT_SCHEMA[sectionKey];
    setContent(prev => {
      const items = [...(prev[sectionKey] || [])];
      const duplicate = { ...items[index], display_order: items.length };
      if (duplicate.name) duplicate.name = `${duplicate.name} (Copy)`;
      if (duplicate.title) duplicate.title = `${duplicate.title} (Copy)`;
      items.push(duplicate);
      return { ...prev, [sectionKey]: items };
    });
    setSuccess(`${schema.itemLabel} duplicated!`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const toggleItemExpanded = (sectionKey, index) => {
    const key = `${sectionKey}-${index}`;
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImageUpload = async (sectionKey, fieldKey, file, index = null) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('section', sectionKey);
      
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        handleFieldChange(sectionKey, fieldKey, data.url, index);
        setSuccess('Image uploaded!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setError('Failed to upload image');
      setTimeout(() => setError(''), 3000);
    }
  };

  const revertChanges = () => {
    if (window.confirm('Revert all unsaved changes?')) {
      setContent(originalContent);
      setSuccess('Changes reverted');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const exportContent = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finaceverse-content-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Content exported!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const importContent = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (window.confirm('This will replace all current content. Continue?')) {
            setContent(imported);
            setSuccess('Content imported!');
            setTimeout(() => setSuccess(''), 2000);
          }
        } catch (err) {
          setError('Invalid JSON file');
          setTimeout(() => setError(''), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  // Check if field type supports AI generation
  const isAICompatibleField = (fieldType) => {
    return ['text', 'textarea'].includes(fieldType);
  };

  // Render individual field based on type
  const renderField = (sectionKey, fieldKey, field, value, index = null) => {
    const id = `field-${sectionKey}-${fieldKey}${index !== null ? `-${index}` : ''}`;
    const showAIButton = isAICompatibleField(field.type) && aiStatus.configured;
    
    const fieldInput = (() => {
      switch (field.type) {
        case 'text':
          return (
            <input
              type="text"
              id={id}
              className="ce-input"
              value={value || ''}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value, index)}
              placeholder={field.default || `Enter ${field.label.toLowerCase()}...`}
            />
          );
        
        case 'number':
          return (
            <input
              type="number"
              id={id}
              className="ce-input ce-input-number"
              value={value ?? field.default ?? 0}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, parseInt(e.target.value) || 0, index)}
            />
          );
        
        case 'textarea':
          return (
            <textarea
              id={id}
              className="ce-textarea"
              value={value || ''}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value, index)}
              placeholder={field.default || `Enter ${field.label.toLowerCase()}...`}
              rows={fieldKey.includes('svg') ? 6 : 3}
            />
          );
        
        case 'select':
          return (
            <select
              id={id}
              className="ce-select"
              value={value || field.default}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value, index)}
            >
              {field.options.map(opt => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          );
        
        case 'checkbox':
          return (
            <label className="ce-checkbox">
              <input
                type="checkbox"
              checked={value ?? field.default ?? false}
              onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.checked, index)}
            />
            <span className="ce-checkbox-label">Enabled</span>
          </label>
        );
      
      case 'image':
        return (
          <div className="ce-image-field">
            {value && (
              <div className="ce-image-preview">
                <img src={value} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                <button 
                  type="button"
                  className="ce-btn-remove"
                  onClick={() => handleFieldChange(sectionKey, fieldKey, '', index)}
                  title="Remove image"
                >×</button>
              </div>
            )}
            <div className="ce-image-input-row">
              <input
                type="text"
                className="ce-input"
                value={value || ''}
                onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value, index)}
                placeholder="Image URL or upload →"
              />
              <label className="ce-btn-upload" title="Upload image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleImageUpload(sectionKey, fieldKey, e.target.files[0], index);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                📁
              </label>
            </div>
          </div>
        );
      
      case 'tags':
        const tagValue = Array.isArray(value) ? value.join(', ') : (value || '');
        return (
          <input
            type="text"
            id={id}
            className="ce-input"
            value={tagValue}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
              handleFieldChange(sectionKey, fieldKey, tags, index);
            }}
            placeholder="Feature 1, Feature 2, Feature 3..."
          />
        );
      
      default:
        return (
          <input
            type="text"
            id={id}
            className="ce-input"
            value={value || ''}
            onChange={(e) => handleFieldChange(sectionKey, fieldKey, e.target.value, index)}
          />
        );
    }
    })();
    
    // Wrap with AI button if applicable
    if (showAIButton) {
      return (
        <div className="ce-field-with-ai">
          {fieldInput}
          <button
            type="button"
            className="ce-ai-btn"
            onClick={() => openAIForField(sectionKey, fieldKey, value || '', index)}
            title="Generate with AI"
          >
            ✨ AI
          </button>
        </div>
      );
    }
    
    return fieldInput;
  };

  // Render the section editor panel
  const renderSectionEditor = () => {
    const schema = CONTENT_SCHEMA[activeSection];
    if (!schema) return <div className="ce-empty">Select a section from the sidebar</div>;

    const sectionContent = content[activeSection];

    // Single section (not array)
    if (schema.type === 'single') {
      return (
        <div className="ce-section-editor">
          <div className="ce-section-header">
            <h2><span>{schema.icon}</span> {schema.label}</h2>
          </div>
          <div className="ce-fields">
            {Object.entries(schema.fields).map(([fieldKey, field]) => (
              <div key={fieldKey} className={`ce-field ${field.type === 'textarea' ? 'ce-field-wide' : ''}`}>
                <label className="ce-field-label" htmlFor={`field-${activeSection}-${fieldKey}`}>
                  {field.label}
                  {field.required && <span className="ce-required">*</span>}
                </label>
                {renderField(activeSection, fieldKey, field, sectionContent?.[fieldKey])}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Array section (multiple items)
    if (schema.type === 'array') {
      const items = Array.isArray(sectionContent) ? sectionContent : [];
      const hasAITemplate = aiStatus.availableTemplates?.includes(activeSection);
      
      return (
        <div className="ce-section-editor">
          <div className="ce-section-header">
            <div className="ce-section-title-row">
              <h2><span>{schema.icon}</span> {schema.label}</h2>
              <span className="ce-item-count">{items.length} items</span>
            </div>
            {schema.description && <p className="ce-section-desc">{schema.description}</p>}
            <div className="ce-section-actions">
              <button className="ce-btn-add" onClick={() => addArrayItem(activeSection)}>
                + Add New {schema.itemLabel}
              </button>
              {hasAITemplate && aiStatus.configured && (
                <button 
                  className="ce-btn-ai-generate"
                  onClick={() => setAiItemModalOpen(true)}
                >
                  ✨ AI Generate {schema.itemLabel}
                </button>
              )}
            </div>
          </div>
          
          {items.length === 0 ? (
            <div className="ce-empty-items">
              <p>No {schema.itemLabel.toLowerCase()}s yet.</p>
              <p>Click <strong>"+ Add New {schema.itemLabel}"</strong> to create one manually, or use <strong>"✨ AI Generate"</strong> to create with AI.</p>
            </div>
          ) : (
            <div className="ce-items-list">
              {items.map((item, index) => {
                const isExpanded = expandedItems[`${activeSection}-${index}`];
                const itemTitle = item.name || item.title || item.quote?.substring(0, 40) || `${schema.itemLabel} #${index + 1}`;
                
                return (
                  <div key={index} className={`ce-item ${isExpanded ? 'expanded' : ''}`}>
                    <div className="ce-item-header" onClick={() => toggleItemExpanded(activeSection, index)}>
                      <div className="ce-item-info">
                        <span className="ce-item-number">#{index + 1}</span>
                        <span className="ce-item-title">{itemTitle}</span>
                        {item.status && (
                          <span className={`ce-item-status ce-status-${item.status}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        )}
                        {item.phase && <span className="ce-item-phase">Phase {item.phase}</span>}
                      </div>
                      <div className="ce-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="ce-btn-icon" 
                          onClick={() => moveArrayItem(activeSection, index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                        >↑</button>
                        <button 
                          className="ce-btn-icon" 
                          onClick={() => moveArrayItem(activeSection, index, 'down')}
                          disabled={index === items.length - 1}
                          title="Move Down"
                        >↓</button>
                        <button 
                          className="ce-btn-icon" 
                          onClick={() => duplicateArrayItem(activeSection, index)}
                          title="Duplicate"
                        >📋</button>
                        <button 
                          className="ce-btn-icon ce-btn-danger" 
                          onClick={() => removeArrayItem(activeSection, index)}
                          title="Delete"
                        >🗑️</button>
                        <span className="ce-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="ce-item-fields">
                        {Object.entries(schema.fields).map(([fieldKey, field]) => (
                          <div key={fieldKey} className={`ce-field ${field.type === 'textarea' ? 'ce-field-wide' : ''}`}>
                            <label className="ce-field-label">
                              {field.label}
                              {field.required && <span className="ce-required">*</span>}
                            </label>
                            {renderField(activeSection, fieldKey, field, item[fieldKey], index)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Filter sections by search
  const filteredSections = Object.entries(CONTENT_SCHEMA).filter(([key, schema]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return schema.label.toLowerCase().includes(q) || key.toLowerCase().includes(q);
  });

  // Group sections by category
  const sectionGroups = {
    'Homepage': ['hero', 'fragmentation_crisis', 'crisis_cards', 'who_its_for', 'persona_cards', 'architecture_header', 'architecture_steps'],
    'Modules': ['modules_header', 'module_cards', 'cognitive_section'],
    'Social Proof': ['testimonials'],
    'Global': ['cta_section', 'footer', 'footer_links', 'social_links']
  };

  if (loading) {
    return (
      <div className="content-editor loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading content editor...</p>
      </div>
    );
  }

  return (
    <div className="content-editor">
      {/* Header */}
      <header className="ce-header">
        <div className="ce-header-left">
          <button className="ce-back-btn" onClick={() => {
            if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leave anyway?')) return;
            history.push('/vault-e9232b8eefbaa45e/dashboard');
          }}>
            ← Dashboard
          </button>
          <h1>Content Editor</h1>
          {hasUnsavedChanges && <span className="ce-unsaved-badge">Unsaved Changes</span>}
        </div>
        <div className="ce-header-right">
          <label className="ce-btn-secondary ce-import-btn">
            <input type="file" accept=".json" onChange={importContent} style={{ display: 'none' }} />
            Import
          </label>
          <button className="ce-btn-secondary" onClick={exportContent}>Export</button>
          <button 
            className="ce-btn-secondary" 
            onClick={revertChanges}
            disabled={!hasUnsavedChanges}
          >Revert</button>
          <button 
            className="ce-btn-primary" 
            onClick={saveAllContent}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && <div className="ce-notification ce-error">{error}</div>}
      {success && <div className="ce-notification ce-success">{success}</div>}

      {/* Main Layout */}
      <div className="ce-layout">
        {/* Sidebar */}
        <aside className="ce-sidebar">
          <div className="ce-search">
            <input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* AI Status Indicator */}
          {aiStatus.configured && (
            <div className="ce-ai-status">
              <span className="ce-ai-indicator">✨ AI Enabled</span>
              <span className="ce-ai-providers">Azure OpenAI</span>
            </div>
          )}
          
          <nav className="ce-nav">
            {Object.entries(sectionGroups).map(([groupName, sectionKeys]) => {
              const groupSections = filteredSections.filter(([key]) => sectionKeys.includes(key));
              if (groupSections.length === 0) return null;
              
              return (
                <div key={groupName} className="ce-nav-group">
                  <span className="ce-nav-group-title">{groupName}</span>
                  {groupSections.map(([key, schema]) => {
                    const itemCount = schema.type === 'array' ? (content[key]?.length || 0) : null;
                    const hasAITemplate = aiStatus.availableTemplates?.includes(key);
                    return (
                      <button
                        key={key}
                        className={`ce-nav-item ${activeSection === key ? 'active' : ''}`}
                        onClick={() => setActiveSection(key)}
                      >
                        <span className="ce-nav-icon">{schema.icon}</span>
                        <span className="ce-nav-label">{schema.label}</span>
                        {hasAITemplate && <span className="ce-nav-ai-badge">✨</span>}
                        {itemCount !== null && <span className="ce-nav-count">{itemCount}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ce-main">
          {renderSectionEditor()}
        </main>
      </div>
      
      {/* AI Generation Modals */}
      <AIGeneratorModal
        isOpen={aiModalOpen}
        onClose={handleAIModalClose}
        onGenerate={generateFieldContent}
        fieldName={aiFieldTarget.fieldKey}
        sectionType={aiFieldTarget.sectionKey}
        currentValue={aiFieldTarget.currentValue}
        isGenerating={aiGenerating}
      />
      
      <AIGenerateItemModal
        isOpen={aiItemModalOpen}
        onClose={handleAIItemModalClose}
        onGenerate={generateCompleteItem}
        sectionType={activeSection}
        existingItems={content[activeSection] || []}
        isGenerating={aiGenerating}
      />
    </div>
  );
}

export default ContentEditor;
