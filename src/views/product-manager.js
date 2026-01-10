import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './product-manager.css';

const STATUS_OPTIONS = [
  { value: 'launched', label: 'Launched', color: '#10b981' },
  { value: 'launching', label: 'Launching Soon', color: '#f59e0b' },
  { value: 'coming_soon', label: 'Coming Soon', color: '#6366f1' },
  { value: 'planned', label: 'Planned (Vision)', color: '#64748b' }
];

const CELL_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
];

const ProductManager = () => {
  const history = useHistory();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    tagline: '',
    description: '',
    status: 'planned',
    external_url: '',
    display_order: 0,
    cell_tag: '',
    cell_size: 'medium',
    is_hero: false,
    features: []
  });
  const [newFeature, setNewFeature] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      history.push('/vault-e9232b8eefbaa45e');
      return;
    }
    fetchProducts();
  }, [history, fetchProducts]);

  const handleSeedProducts = async () => {
    if (!window.confirm('This will create/update all default products. Continue?')) return;
    
    setSeeding(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch('/api/admin/products/seed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      alert(data.message);
      fetchProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      slug: product.slug || '',
      name: product.name || '',
      tagline: product.tagline || '',
      description: product.description || '',
      status: product.status || 'planned',
      external_url: product.external_url || '',
      display_order: product.display_order || 0,
      cell_tag: product.cell_tag || '',
      cell_size: product.cell_size || 'medium',
      is_hero: product.is_hero || false,
      features: Array.isArray(product.features) ? product.features : []
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      slug: '',
      name: '',
      tagline: '',
      description: '',
      status: 'planned',
      external_url: '',
      display_order: products.length + 1,
      cell_tag: '',
      cell_size: 'medium',
      is_hero: false,
      features: []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.name) {
      alert('Slug and Name are required');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('superadmin_token');
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      fetchProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[3];
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: statusOption.color + '20', color: statusOption.color, border: `1px solid ${statusOption.color}40` }}
      >
        {statusOption.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="product-manager-container">
        <div className="loading-state">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="product-manager-container">
      <Helmet>
        <title>Product Manager | SuperAdmin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="pm-header">
        <div className="pm-header-left">
          <button 
            className="back-btn"
            onClick={() => history.push('/vault-e9232b8eefbaa45e/dashboard')}
          >
            ← Dashboard
          </button>
          <h1>Product Manager</h1>
          <span className="product-count">{products.length} products</span>
        </div>
        <div className="pm-header-right">
          <button 
            className="seed-btn"
            onClick={handleSeedProducts}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : '🌱 Seed Defaults'}
          </button>
          <button className="add-btn" onClick={handleCreate}>
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={fetchProducts}>Retry</button>
        </div>
      )}

      <div className="status-legend">
        {STATUS_OPTIONS.map(status => (
          <div key={status.value} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: status.color }}></span>
            <span>{status.label}</span>
            <span className="legend-count">
              {products.filter(p => p.status === status.value).length}
            </span>
          </div>
        ))}
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-card-header">
              <div className="product-info">
                <h3>{product.name}</h3>
                <span className="product-slug">/{product.slug}</span>
              </div>
              {getStatusBadge(product.status)}
            </div>
            
            <p className="product-tagline">{product.tagline || 'No tagline set'}</p>
            
            <div className="product-meta">
              <span className="meta-item">
                <strong>Order:</strong> {product.display_order}
              </span>
              <span className="meta-item">
                <strong>Size:</strong> {product.cell_size}
              </span>
              {product.is_hero && <span className="hero-badge">Hero</span>}
            </div>
            
            {product.external_url && (
              <a 
                href={product.external_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="external-link"
              >
                {product.external_url} ↗
              </a>
            )}
            
            {product.features && product.features.length > 0 && (
              <div className="product-features">
                {(Array.isArray(product.features) ? product.features : []).slice(0, 3).map((f, i) => (
                  <span key={i} className="feature-tag">{f}</span>
                ))}
                {product.features.length > 3 && (
                  <span className="feature-more">+{product.features.length - 3} more</span>
                )}
              </div>
            )}
            
            <div className="product-actions">
              <button className="edit-btn" onClick={() => handleEdit(product)}>
                Edit
              </button>
              <button className="delete-btn" onClick={() => handleDelete(product)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Products Yet</h3>
            <p>Add your first product or seed the defaults to get started.</p>
            <div className="empty-actions">
              <button className="seed-btn" onClick={handleSeedProducts}>
                🌱 Seed Default Products
              </button>
              <button className="add-btn" onClick={handleCreate}>
                + Add Custom Product
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    placeholder="product-slug"
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Product Name"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData({...formData, tagline: e.target.value})}
                  placeholder="Short, catchy tagline"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Full product description..."
                  rows={4}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                    min={0}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Cell Size</label>
                  <select
                    value={formData.cell_size}
                    onChange={e => setFormData({...formData, cell_size: e.target.value})}
                  >
                    {CELL_SIZES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cell Tag</label>
                  <input
                    type="text"
                    value={formData.cell_tag}
                    onChange={e => setFormData({...formData, cell_tag: e.target.value})}
                    placeholder="e.g., Foundation, Intelligence"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>External URL</label>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={e => setFormData({...formData, external_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_hero}
                    onChange={e => setFormData({...formData, is_hero: e.target.checked})}
                  />
                  Show in Hero Section
                </label>
              </div>
              
              <div className="form-group">
                <label>Features</label>
                <div className="features-input">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Add feature..."
                  />
                  <button type="button" onClick={handleAddFeature}>Add</button>
                </div>
                <div className="features-list">
                  {formData.features.map((feature, idx) => (
                    <span key={idx} className="feature-tag editable">
                      {feature}
                      <button onClick={() => handleRemoveFeature(idx)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
