import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import io from 'socket.io-client';
import './analytics-dashboard.css';

const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [geography, setGeography] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [errors, setErrors] = useState(null);
  const [pageSpeed, setPageSpeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimeVisits, setRealtimeVisits] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [newExperiment, setNewExperiment] = useState({ name: '', description: '', variants: ['A', 'B'] });
  const socketRef = useRef(null);
  const history = useHistory();

  const API_URL = process.env.REACT_APP_API_URL || 'https://www.finaceverse.io';

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Generate mock trend data (replace with real data from API later)
  const generateMockTrendData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'MMM dd'),
        visits: Math.floor(Math.random() * 100) + 20,
        pageViews: Math.floor(Math.random() * 300) + 50,
      });
    }
    return data;
  };

  useEffect(() => {
    const token = localStorage.getItem('analytics_token');
    if (!token) {
      history.push('/analytics/login');
      return;
    }

    fetchData();
    
    // Initialize WebSocket connection
    const socket = io(API_URL, {
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      socket.emit('subscribe-analytics');
    });
    
    socket.on('analytics-update', (data) => {
      console.log('📊 Real-time update:', data);
      
      if (data.type === 'visit') {
        setRealtimeVisits(prev => [{
          page: data.data.page,
          country: data.data.country,
          timestamp: new Date(data.data.timestamp)
        }, ...prev].slice(0, 10)); // Keep last 10 visits
        
        // Update summary count
        setSummary(prev => prev ? {
          ...prev,
          total_visits: parseInt(prev.total_visits) + 1
        } : null);
      }
      
      if (data.type === 'summary') {
        setSummary(data.data);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });
    
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes (reduced from 1 minute due to WebSocket)
    
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [history, API_URL]);

  const fetchData = async () => {
    const token = localStorage.getItem('analytics_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const [summaryRes, geoRes, perfRes, errorsRes, pageSpeedRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/summary`, { headers }),
        fetch(`${API_URL}/api/analytics/geography`, { headers }),
        fetch(`${API_URL}/api/analytics/performance`, { headers }),
        fetch(`${API_URL}/api/analytics/errors`, { headers }),
        fetch(`${API_URL}/api/analytics/pagespeed`, { headers }),
      ]);

      if (!summaryRes.ok) throw new Error('Unauthorized');

      setSummary(await summaryRes.json());
      setGeography(await geoRes.json());
      setPerformance(await perfRes.json());
      setErrors(await errorsRes.json());
      setPageSpeed(await pageSpeedRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('analytics_token');
        history.push('/analytics/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('analytics_token');
    localStorage.removeItem('analytics_user');
    history.push('/analytics/login');
  };

  const fetchExperiments = async () => {
    const token = localStorage.getItem('analytics_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(`${API_URL}/api/experiments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setExperiments(data);
      }
    } catch (err) {
      console.error('Fetch experiments error:', err);
    }
  };

  const createExperiment = async () => {
    const token = localStorage.getItem('analytics_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(`${API_URL}/api/experiments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newExperiment)
      });

      if (res.ok) {
        setNewExperiment({ name: '', description: '', variants: ['A', 'B'] });
        fetchExperiments();
      }
    } catch (err) {
      console.error('Create experiment error:', err);
    }
  };

  const endExperiment = async (id) => {
    const token = localStorage.getItem('analytics_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(`${API_URL}/api/experiments/${id}/end`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error('End experiment error:', err);
    }
  };

  // Load experiments when A/B Testing tab is active
  useEffect(() => {
    if (activeTab === 'abtesting') {
      fetchExperiments();
    }
  }, [activeTab]);


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
          <div className="header-left">
            <button onClick={() => history.push('/vault-e9232b8eefbaa45e/dashboard')} className="btn-back">
              ← Dashboard
            </button>
            <h1>📊 FinACEverse Analytics</h1>
          </div>
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
          className={activeTab === 'pagespeed' ? 'tab-active' : ''}
          onClick={() => setActiveTab('pagespeed')}
        >
          PageSpeed
        </button>
        <button
          className={activeTab === 'abtesting' ? 'tab-active' : ''}
          onClick={() => setActiveTab('abtesting')}
        >
          A/B Testing
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

            {/* Real-time Visits Feed */}
            {realtimeVisits.length > 0 && (
              <div className="realtime-section">
                <h2>🔴 Real-time Visits</h2>
                <div className="realtime-feed">
                  {realtimeVisits.map((visit, idx) => (
                    <div key={idx} className="realtime-visit">
                      <span className="realtime-pulse">●</span>
                      <span className="realtime-page">{visit.page}</span>
                      <span className="realtime-country">{visit.country || 'Unknown'}</span>
                      <span className="realtime-time">
                        {format(visit.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Visits Trend Line Chart */}
            <div className="chart-container" style={{ marginTop: '30px' }}>
              <h2>Visits Trend (7 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateMockTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke={COLORS[0]} 
                    strokeWidth={2}
                    dot={{ fill: COLORS[0], r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'geography' && (
          <div className="tab-panel">
            <h2>Geographic Distribution</h2>
            
            {/* Country Distribution Pie Chart */}
            {geography?.byCountry && geography.byCountry.length > 0 && (
              <div className="chart-section" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)', marginBottom: 'var(--spacing-xl)'}}>
                <h3>Top 5 Countries by Traffic</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={geography.byCountry.slice(0, 5).map(item => ({
                        name: item.name || 'Unknown',
                        value: item.count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="var(--color-primary)"
                      dataKey="value"
                    >
                      {geography.byCountry.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{background: 'var(--color-surface-elevated)', border: '1px solid rgba(255,255,255,0.2)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="geo-section">
              <h3>Top Countries</h3>
              <div className="geo-table">
                {geography?.byCountry?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="geo-row">
                    <span className="geo-rank">{idx + 1}</span>
                    <span className="geo-name">{item.name || 'Unknown'}</span>
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
                      {item.city}, {item.country}
                    </span>
                    <span className="geo-count">{item.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pagespeed' && (
          <div className="tab-panel">
            <h2>Google PageSpeed Insights</h2>
            
            {pageSpeed?.latest && (
              <div className="pagespeed-section">
                <div className="pagespeed-grid">
                  <div className="pagespeed-card">
                    <h3>📱 Mobile</h3>
                    {pageSpeed.latest.mobile ? (
                      <>
                        <div className="pagespeed-score" style={{color: pageSpeed.latest.mobile.score >= 90 ? '#0CCE6B' : pageSpeed.latest.mobile.score >= 50 ? '#FFA400' : '#FF4E42'}}>
                          {Math.round(pageSpeed.latest.mobile.score)}
                        </div>
                        <div className="pagespeed-metrics">
                          <div className="pagespeed-metric">
                            <span>FCP:</span>
                            <strong>{pageSpeed.latest.mobile.metrics?.fcp ? (pageSpeed.latest.mobile.metrics.fcp / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>LCP:</span>
                            <strong>{pageSpeed.latest.mobile.metrics?.lcp ? (pageSpeed.latest.mobile.metrics.lcp / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>CLS:</span>
                            <strong>{pageSpeed.latest.mobile.metrics?.cls?.toFixed(3) || 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>SI:</span>
                            <strong>{pageSpeed.latest.mobile.metrics?.si ? (pageSpeed.latest.mobile.metrics.si / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                        </div>
                        <div className="pagespeed-time">
                          Last tested: {new Date(pageSpeed.latest.mobile.timestamp).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className="no-data">No mobile data yet</div>
                    )}
                  </div>

                  <div className="pagespeed-card">
                    <h3>🖥️ Desktop</h3>
                    {pageSpeed.latest.desktop ? (
                      <>
                        <div className="pagespeed-score" style={{color: pageSpeed.latest.desktop.score >= 90 ? '#0CCE6B' : pageSpeed.latest.desktop.score >= 50 ? '#FFA400' : '#FF4E42'}}>
                          {Math.round(pageSpeed.latest.desktop.score)}
                        </div>
                        <div className="pagespeed-metrics">
                          <div className="pagespeed-metric">
                            <span>FCP:</span>
                            <strong>{pageSpeed.latest.desktop.metrics?.fcp ? (pageSpeed.latest.desktop.metrics.fcp / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>LCP:</span>
                            <strong>{pageSpeed.latest.desktop.metrics?.lcp ? (pageSpeed.latest.desktop.metrics.lcp / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>CLS:</span>
                            <strong>{pageSpeed.latest.desktop.metrics?.cls?.toFixed(3) || 'N/A'}</strong>
                          </div>
                          <div className="pagespeed-metric">
                            <span>SI:</span>
                            <strong>{pageSpeed.latest.desktop.metrics?.si ? (pageSpeed.latest.desktop.metrics.si / 1000).toFixed(2) + 's' : 'N/A'}</strong>
                          </div>
                        </div>
                        <div className="pagespeed-time">
                          Last tested: {new Date(pageSpeed.latest.desktop.timestamp).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className="no-data">No desktop data yet</div>
                    )}
                  </div>
                </div>

                {pageSpeed.history && pageSpeed.history.length > 0 && (
                  <div className="chart-container" style={{ marginTop: '30px' }}>
                    <h3>Performance Score History (7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={pageSpeed.history.map(item => ({
                        date: format(new Date(item.timestamp), 'MMM dd'),
                        mobile: item.strategy === 'mobile' ? item.score : null,
                        desktop: item.strategy === 'desktop' ? item.score : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="mobile" stroke={COLORS[0]} name="Mobile" />
                        <Line type="monotone" dataKey="desktop" stroke={COLORS[1]} name="Desktop" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
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

            {/* Performance Metrics Bar Chart */}
            <div className="chart-container" style={{ marginTop: '30px', width: '100%' }}>
              <h2>Performance Metrics Comparison</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  {
                    name: 'LCP',
                    current: performance?.summary?.avgLCP ? (performance.summary.avgLCP / 1000) : 0,
                    target: 2.5,
                  },
                  {
                    name: 'FCP',
                    current: performance?.summary?.avgFCP ? (performance.summary.avgFCP / 1000) : 0,
                    target: 1.8,
                  },
                  {
                    name: 'TTFB',
                    current: performance?.summary?.avgTTFB ? (performance.summary.avgTTFB / 1000) : 0,
                    target: 0.8,
                  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill={COLORS[0]} name="Current" />
                  <Bar dataKey="target" fill={COLORS[1]} name="Target" />
                </BarChart>
              </ResponsiveContainer>
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

        {activeTab === 'abtesting' && (
          <div className="tab-panel">
            <h2>🧪 A/B Testing Experiments</h2>
            
            {/* Create New Experiment */}
            <div className="experiment-create">
              <h3>Create New Experiment</h3>
              <div className="experiment-form">
                <input
                  type="text"
                  placeholder="Experiment Name"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({...newExperiment, name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({...newExperiment, description: e.target.value})}
                />
                <div className="variants-input">
                  <label>Variants (comma-separated):</label>
                  <input
                    type="text"
                    placeholder="A,B"
                    value={newExperiment.variants.join(',')}
                    onChange={(e) => setNewExperiment({
                      ...newExperiment, 
                      variants: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                    })}
                  />
                </div>
                <button onClick={createExperiment} className="btn-create-experiment">
                  Create Experiment
                </button>
              </div>
            </div>

            {/* Experiments List */}
            <div className="experiments-list">
              {experiments.length === 0 ? (
                <div className="no-experiments">No experiments yet. Create one to get started!</div>
              ) : (
                experiments.map((exp) => (
                  <div key={exp.id} className={`experiment-card ${exp.status}`}>
                    <div className="experiment-header">
                      <h4>{exp.name}</h4>
                      <span className={`status-badge ${exp.status}`}>{exp.status}</span>
                    </div>
                    <p className="experiment-description">{exp.description}</p>
                    <div className="experiment-variants">
                      <strong>Variants:</strong> {exp.variants.join(', ')}
                    </div>
                    <div className="experiment-meta">
                      <span>Created: {new Date(exp.created_at).toLocaleDateString()}</span>
                      {exp.ended_at && <span>Ended: {new Date(exp.ended_at).toLocaleDateString()}</span>}
                    </div>
                    {exp.status === 'active' && (
                      <button 
                        onClick={() => endExperiment(exp.id)} 
                        className="btn-end-experiment"
                      >
                        End Experiment
                      </button>
                    )}
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
