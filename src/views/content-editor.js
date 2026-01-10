import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import './content-editor.css';

function ContentEditor() {
  const history = useHistory();
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('hero');

  // Get stored credentials
  const masterKey = sessionStorage.getItem('masterKey');
  const password = sessionStorage.getItem('adminPassword');

  useEffect(() => {
    if (!masterKey || !password) {
      history.push('/vault-e9232b8eefbaa45e');
      return;
    }
    fetchContent();
  }, [masterKey, password, history]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/content', {
        headers: {
          'x-master-key': masterKey,
          'x-admin-password': password
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch content');
      
      const data = await response.json();
      
      // Group by page and section
      const grouped = {};
      for (const item of data.content) {
        if (!grouped[item.page]) grouped[item.page] = {};
        if (!grouped[item.page][item.section]) grouped[item.page][item.section] = {};
        grouped[item.page][item.section][item.content_key] = {
          id: item.id,
          value: item.content_value,
          type: item.content_type
        };
      }
      
      setContent(grouped);
    } catch (err) {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedContent = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/admin/content/seed-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-key': masterKey,
          'x-admin-password': password
        }
      });
      
      if (!response.ok) throw new Error('Failed to seed content');
      
      const data = await response.json();
      setSuccess(data.message);
      fetchContent();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to seed content');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (page, section, key, value) => {
    setContent(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [section]: {
          ...prev[page]?.[section],
          [key]: {
            ...prev[page]?.[section]?.[key],
            value
          }
        }
      }
    }));
  };

  const handleSaveSection = async (page, section) => {
    try {
      setSaving(true);
      setError('');
      
      const sectionContent = content[page]?.[section] || {};
      const items = Object.entries(sectionContent).map(([key, data]) => ({
        page,
        section,
        content_key: key,
        content_value: data.value,
        content_type: data.type || 'text'
      }));
      
      const response = await fetch('/api/admin/content/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-key': masterKey,
          'x-admin-password': password
        },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      setSuccess(`${section} section saved!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'hero', name: 'Hero Section', icon: '🏠' },
    { id: 'capabilities', name: 'Capabilities', icon: '⚡' },
    { id: 'integration', name: 'Integration Journey', icon: '🔗' },
    { id: 'timeline', name: 'Timeline Phases', icon: '📅' },
    { id: 'cta', name: 'Call to Action', icon: '📢' }
  ];

  const renderSectionFields = (page, section) => {
    const sectionData = content[page]?.[section] || {};
    
    const fieldConfigs = {
      hero: [
        { key: 'title', label: 'Main Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle Text', type: 'textarea' }
      ],
      capabilities: [
        { key: 'title', label: 'Section Title', type: 'text' },
        { key: 'subtitle', label: 'Section Subtitle', type: 'textarea' }
      ],
      integration: [
        { key: 'title', label: 'Section Title', type: 'text' },
        { key: 'subtitle', label: 'Section Subtitle', type: 'textarea' }
      ],
      timeline: [
        { key: 'phase1_title', label: 'Phase 1 Title', type: 'text' },
        { key: 'phase1_description', label: 'Phase 1 Description', type: 'textarea' },
        { key: 'phase1_time', label: 'Phase 1 Time', type: 'text' },
        { key: 'phase2_title', label: 'Phase 2 Title', type: 'text' },
        { key: 'phase2_description', label: 'Phase 2 Description', type: 'textarea' },
        { key: 'phase2_time', label: 'Phase 2 Time', type: 'text' },
        { key: 'phase3_title', label: 'Phase 3 Title', type: 'text' },
        { key: 'phase3_description', label: 'Phase 3 Description', type: 'textarea' },
        { key: 'phase3_time', label: 'Phase 3 Time', type: 'text' },
        { key: 'phase4_title', label: 'Phase 4 Title', type: 'text' },
        { key: 'phase4_description', label: 'Phase 4 Description', type: 'textarea' },
        { key: 'phase4_time', label: 'Phase 4 Time', type: 'text' }
      ],
      cta: [
        { key: 'title', label: 'CTA Title', type: 'text' },
        { key: 'subtitle', label: 'CTA Description', type: 'textarea' },
        { key: 'bundle1', label: 'Bundle 1 Name', type: 'text' },
        { key: 'bundle2', label: 'Bundle 2 Name', type: 'text' },
        { key: 'bundle3', label: 'Bundle 3 Name', type: 'text' }
      ]
    };

    const fields = fieldConfigs[section] || [];

    return (
      <div className="section-fields">
        {fields.map(field => (
          <div key={field.key} className="field-group">
            <label>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={sectionData[field.key]?.value || ''}
                onChange={(e) => handleContentChange(page, section, field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={sectionData[field.key]?.value || ''}
                onChange={(e) => handleContentChange(page, section, field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
        
        <button 
          className="save-section-btn"
          onClick={() => handleSaveSection(page, section)}
          disabled={saving}
        >
          {saving ? 'Saving...' : `Save ${sections.find(s => s.id === section)?.name || section}`}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="content-editor">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  const hasNoContent = Object.keys(content).length === 0 || 
    !content.modules || Object.keys(content.modules).length === 0;

  return (
    <div className="content-editor">
      <header className="editor-header">
        <button className="back-btn" onClick={() => history.push('/vault-e9232b8eefbaa45e/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>Content Editor</h1>
        <p className="header-subtitle">Manage text content for the Modules page</p>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {hasNoContent && (
        <div className="seed-prompt">
          <div className="seed-icon">📝</div>
          <h3>No Content Found</h3>
          <p>Click the button below to seed default content for the Modules page.</p>
          <button 
            className="seed-btn" 
            onClick={handleSeedContent}
            disabled={saving}
          >
            {saving ? 'Seeding...' : 'Seed Default Content'}
          </button>
        </div>
      )}

      {!hasNoContent && (
        <div className="editor-layout">
          <aside className="sections-sidebar">
            <h3>Sections</h3>
            {sections.map(section => (
              <button
                key={section.id}
                className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="section-icon">{section.icon}</span>
                {section.name}
              </button>
            ))}
            
            <div className="sidebar-divider"></div>
            
            <button 
              className="reseed-btn" 
              onClick={handleSeedContent}
              disabled={saving}
            >
              🔄 Reset to Defaults
            </button>
          </aside>

          <main className="editor-main">
            <div className="section-editor">
              <h2>
                <span>{sections.find(s => s.id === activeSection)?.icon}</span>
                {sections.find(s => s.id === activeSection)?.name}
              </h2>
              {renderSectionFields('modules', activeSection)}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default ContentEditor;
