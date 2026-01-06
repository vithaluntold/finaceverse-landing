import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './analytics-dashboard.css';

const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [geography, setGeography] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const token = localStorage.getItem('analytics_token');
    if (!token) {
      navigate('/analytics/login');
      return;
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchData = async () => {
    const token = localStorage.getItem('analytics_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const [summaryRes, geoRes, perfRes, errorsRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/summary`, { headers }),
        fetch(`${API_URL}/api/analytics/geography`, { headers }),
        fetch(`${API_URL}/api/analytics/performance`, { headers }),
        fetch(`${API_URL}/api/analytics/errors`, { headers }),
      ]);

      if (!summaryRes.ok) throw new Error('Unauthorized');

      setSummary(await summaryRes.json());
      setGeography(await geoRes.json());
      setPerformance(await perfRes.json());
      setErrors(await errorsRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('analytics_token');
        navigate('/analytics/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('analytics_token');
    localStorage.removeItem('analytics_user');
    navigate('/analytics/login');
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-spinner">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <header className="analytics-header">
        <div className="analytics-header-content">
          <h1>📊 FinACEverse Analytics</h1>
          <div className="analytics-header-actions">
            <span className="analytics-user">
              {localStorage.getItem('analytics_user')}
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="analytics-tabs">
        <button
          className={activeTab === 'overview' ? 'tab-active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'geography' ? 'tab-active' : ''}
          onClick={() => setActiveTab('geography')}
        >
          Geography
        </button>
        <button
          className={activeTab === 'performance' ? 'tab-active' : ''}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={activeTab === 'errors' ? 'tab-active' : ''}
          onClick={() => setActiveTab('errors')}
        >
          Errors ({errors?.count || 0})
        </button>
      </div>

      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="tab-panel">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-label">Total Visits</div>
                  <div className="stat-value">{summary?.totalVisits?.toLocaleString() || 0}</div>
                  <div className="stat-sub">Last 24h: {summary?.visits24h || 0}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🌍</div>
                <div className="stat-info">
                  <div className="stat-label">Countries</div>
                  <div className="stat-value">{summary?.uniqueCountries || 0}</div>
                  <div className="stat-sub">Global reach</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <div className="stat-label">Avg LCP</div>
                  <div className="stat-value">
                    {performance?.summary?.avgLCP ? (performance.summary.avgLCP / 1000).toFixed(2) + 's' : 'N/A'}
                  </div>
                  <div className="stat-sub">Target: &lt;2.5s</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-label">Events</div>
                  <div className="stat-value">{summary?.totalEvents?.toLocaleString() || 0}</div>
                  <div className="stat-sub">User interactions</div>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h2>Recent Activity (Last 7 Days)</h2>
              <div className="activity-metric">
                <span>Visits:</span>
                <strong>{summary?.visits7d?.toLocaleString() || 0}</strong>
              </div>
              <div className="activity-metric">
                <span>Errors:</span>
                <strong className={summary?.totalErrors > 0 ? 'error-text' : ''}>
                  {summary?.totalErrors || 0}
                </strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'geography' && (
          <div className="tab-panel">
            <h2>Geographic Distribution</h2>
            
            <div className="geo-section">
              <h3>Top Countries</h3>
              <div className="geo-table">
                {geography?.byCountry?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="geo-row">
                    <span className="geo-rank">{idx + 1}</span>
                    <span className="geo-name">{item._id || 'Unknown'}</span>
                    <span className="geo-count">{item.count} visits</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="geo-section">
              <h3>Top Cities</h3>
              <div className="geo-table">
                {geography?.byCity?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="geo-row">
                    <span className="geo-rank">{idx + 1}</span>
                    <span className="geo-name">
                      {item._id.city}, {item._id.country}
                    </span>
                    <span className="geo-count">{item.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="tab-panel">
            <h2>Core Web Vitals</h2>
            <div className="performance-metrics">
              <div className="metric-card">
                <div className="metric-name">LCP (Largest Contentful Paint)</div>
                <div className="metric-value">
                  {performance?.summary?.avgLCP 
                    ? (performance.summary.avgLCP / 1000).toFixed(2) + 's'
                    : 'N/A'}
                </div>
                <div className="metric-target">Target: &lt;2.5s</div>
              </div>
              
              <div className="metric-card">
                <div className="metric-name">FCP (First Contentful Paint)</div>
                <div className="metric-value">
                  {performance?.summary?.avgFCP 
                    ? (performance.summary.avgFCP / 1000).toFixed(2) + 's'
                    : 'N/A'}
                </div>
                <div className="metric-target">Target: &lt;1.8s</div>
              </div>
              
              <div className="metric-card">
                <div className="metric-name">CLS (Cumulative Layout Shift)</div>
                <div className="metric-value">
                  {performance?.summary?.avgCLS 
                    ? performance.summary.avgCLS.toFixed(3)
                    : 'N/A'}
                </div>
                <div className="metric-target">Target: &lt;0.1</div>
              </div>
              
              <div className="metric-card">
                <div className="metric-name">TTFB (Time to First Byte)</div>
                <div className="metric-value">
                  {performance?.summary?.avgTTFB 
                    ? (performance.summary.avgTTFB / 1000).toFixed(2) + 's'
                    : 'N/A'}
                </div>
                <div className="metric-target">Target: &lt;0.6s</div>
              </div>
            </div>
            
            <div className="performance-samples">
              <p>Total samples: {performance?.summary?.totalSamples || 0}</p>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="tab-panel">
            <h2>JavaScript Errors</h2>
            <div className="errors-list">
              {errors?.data?.length === 0 ? (
                <div className="no-errors">✅ No errors detected</div>
              ) : (
                errors?.data?.map((error, idx) => (
                  <div key={idx} className="error-item">
                    <div className="error-header">
                      <span className="error-message">{error.message}</span>
                      <span className="error-time">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="error-details">
                      <div>Page: {error.page}</div>
                      {error.source && <div>Source: {error.source}:{error.line}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
