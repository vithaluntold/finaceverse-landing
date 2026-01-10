import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './superadmin-dashboard.css';

const SuperAdminDashboard = () => {
  const history = useHistory();

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      history.push('/vault-e9232b8eefbaa45e');
    }
  }, [history]);

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_refresh');
    history.push('/vault-e9232b8eefbaa45e');
  };

  return (
    <div className="superadmin-dashboard-container">
      <Helmet>
        <title>SuperAdmin Dashboard | FinACEverse</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="superadmin-header">
        <div className="header-content">
          <div className="header-left">
            <span className="lock-icon">🔐</span>
            <h1>SuperAdmin Control Center</h1>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div 
          className="dashboard-card analytics"
          onClick={() => history.push('/analytics/dashboard')}
        >
          <div className="card-header">
            <div className="card-icon">📊</div>
            <h2>Analytics Dashboard</h2>
          </div>
          <p>Website traffic, performance metrics, user behavior, real-time monitoring</p>
          <div className="card-features">
            <span>• Page Speed</span>
            <span>• Geography</span>
            <span>• Error Tracking</span>
            <span>• A/B Testing</span>
          </div>
          <button className="card-btn">Open Analytics →</button>
        </div>

        <div 
          className="dashboard-card seo"
          onClick={() => history.push('/seo-dashboard')}
        >
          <div className="card-header">
            <div className="card-icon">🚀</div>
            <h2>SEO Dashboard</h2>
          </div>
          <p>Keyword rankings, backlinks, SEO issues, auto-fixes, Google Search Console</p>
          <div className="card-features">
            <span>• 28 Keywords Tracked</span>
            <span>• 3 Backlinks</span>
            <span>• 14 Issues Found</span>
            <span>• Auto-Fixer Ready</span>
          </div>
          <button className="card-btn">Open SEO →</button>
        </div>

        <div 
          className="dashboard-card products"
          onClick={() => history.push('/vault-e9232b8eefbaa45e/products')}
        >
          <div className="card-header">
            <div className="card-icon">📦</div>
            <h2>Product Manager</h2>
          </div>
          <p>Manage modules, control visibility, toggle between current reality and future vision</p>
          <div className="card-features">
            <span>• Add/Edit Products</span>
            <span>• Launch Status</span>
            <span>• Visibility Control</span>
            <span>• Content CMS</span>
          </div>
          <button className="card-btn">Manage Products →</button>
        </div>
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">GOOGLE SEARCH POSITION</span>
          </div>
          <div className="stat-value">32.8</div>
          <div className="stat-meta">Page 4</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL BACKLINKS</span>
          </div>
          <div className="stat-value">3</div>
          <div className="stat-meta">DA 93 avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">SEO SCORE</span>
          </div>
          <div className="stat-value">7/100</div>
          <div className="stat-meta">Needs work</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">ISSUES FOUND</span>
          </div>
          <div className="stat-value">14</div>
          <div className="stat-meta">5 critical</div>
        </div>
      </div>

      <div className="system-info">
        <h3>System Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>GSC Integration</span>
          </div>
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>Backlink Crawler</span>
          </div>
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>SEO Scanner</span>
          </div>
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>Auto-Fixer</span>
          </div>
          <div className="status-item">
            <span className="status-dot warning"></span>
            <span>Daily Automation</span>
          </div>
          <div className="status-item">
            <span className="status-dot inactive"></span>
            <span>Email Alerts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
