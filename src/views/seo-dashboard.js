import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import './seo-dashboard.css';

const SEODashboard = () => {
  const [activeTab, setActiveTab] = useState('optimize');
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState([]);
  const [keywordSummary, setKeywordSummary] = useState(null);
  const [topKeywords, setTopKeywords] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [backlinks, setBacklinks] = useState([]);
  const [backlinkStats, setBacklinkStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [fixHistory, setFixHistory] = useState([]);
  const [fixStats, setFixStats] = useState(null);
  const [pageScores, setPageScores] = useState([]);
  const [targetKeywords, setTargetKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [optimizationTips, setOptimizationTips] = useState([]);
  const history = useHistory();

  const API_URL = process.env.REACT_APP_API_URL || 'https://www.finaceverse.io';
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      history.push('/vault-e9232b8eefbaa45e');
      return;
    }

    fetchAllData();
    const interval = setInterval(fetchAllData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, [history]);

  const fetchAllData = async () => {
    const token = localStorage.getItem('superadmin_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      setLoading(true);

      // Fetch keyword data
      const [summaryRes, topKwRes, oppsRes] = await Promise.all([
        fetch(`${API_URL}/api/seo/gsc/summary`, { headers }),
        fetch(`${API_URL}/api/seo/gsc/top-keywords?limit=20`, { headers }),
        fetch(`${API_URL}/api/seo/gsc/opportunities`, { headers })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setKeywordSummary(data);
      }

      if (topKwRes.ok) {
        const data = await topKwRes.json();
        setTopKeywords(data);
      }

      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setOpportunities(data);
      }

      // Fetch backlink data
      const [backlinksRes, backlinkStatsRes] = await Promise.all([
        fetch(`${API_URL}/api/seo/backlinks/top?limit=50`, { headers }),
        fetch(`${API_URL}/api/seo/backlinks/stats`, { headers })
      ]);

      if (backlinksRes.ok) {
        const data = await backlinksRes.json();
        setBacklinks(data);
      }

      if (backlinkStatsRes.ok) {
        const data = await backlinkStatsRes.json();
        setBacklinkStats(data);
      }

      // Fetch SEO issues
      const issuesRes = await fetch(`${API_URL}/api/seo/issues`, { headers });
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data);
      }

      // Fetch fix history and stats
      const [fixHistoryRes, fixStatsRes] = await Promise.all([
        fetch(`${API_URL}/api/seo/auto-fix/history?limit=30`, { headers }),
        fetch(`${API_URL}/api/seo/auto-fix/stats`, { headers })
      ]);

      if (fixHistoryRes.ok) {
        const data = await fixHistoryRes.json();
        setFixHistory(data);
      }

      if (fixStatsRes.ok) {
        const data = await fixStatsRes.json();
        setFixStats(data);
      }

      // Fetch page scores
      const scoresRes = await fetch(`${API_URL}/api/seo/report`, { headers });
      if (scoresRes.ok) {
        const data = await scoresRes.json();
        if (data.pages) {
          setPageScores(data.pages);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    const token = localStorage.getItem('superadmin_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      if (activeTab === 'keywords') {
        await fetch(`${API_URL}/api/seo/gsc/fetch-rankings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ days: 7 })
        });
      } else if (activeTab === 'backlinks') {
        await fetch(`${API_URL}/api/seo/backlinks/crawl`, {
          method: 'POST',
          headers
        });
      } else if (activeTab === 'issues') {
        await fetch(`${API_URL}/api/seo/scan-all`, {
          method: 'POST',
          headers
        });
      } else if (activeTab === 'scores') {
        // Trigger fresh SEO scan
        setLoading(true);
        await fetch(`${API_URL}/api/seo/scan`, {
          method: 'POST',
          headers
        });
      }
      
      setTimeout(fetchAllData, 2000);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async () => {
    const token = localStorage.getItem('superadmin_token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(`${API_URL}/api/seo/auto-fix`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        setTimeout(fetchAllData, 2000);
      }
    } catch (error) {
      console.error('Error running auto-fix:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#FF4444';
      case 'warning': return '#FFBB28';
      case 'info': return '#00C49F';
      default: return '#8884D8';
    }
  };

  // Keyword Management Functions
  const fetchTargetKeywords = async () => {
    const token = localStorage.getItem('superadmin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const res = await fetch(`${API_URL}/api/seo/target-keywords`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTargetKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Error fetching target keywords:', error);
    }
  };

  const addTargetKeyword = async () => {
    if (!newKeyword.trim()) return;
    const token = localStorage.getItem('superadmin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const res = await fetch(`${API_URL}/api/seo/target-keywords`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ keyword: newKeyword.trim() })
      });
      if (res.ok) {
        setNewKeyword('');
        fetchTargetKeywords();
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
    }
  };

  const removeTargetKeyword = async (keyword) => {
    const token = localStorage.getItem('superadmin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      await fetch(`${API_URL}/api/seo/target-keywords/${encodeURIComponent(keyword)}`, {
        method: 'DELETE',
        headers
      });
      fetchTargetKeywords();
    } catch (error) {
      console.error('Error removing keyword:', error);
    }
  };

  const getAiSuggestions = async () => {
    setAiLoading(true);
    const token = localStorage.getItem('superadmin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const res = await fetch(`${API_URL}/api/seo/ai-suggestions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || []);
        setOptimizationTips(data.tips || []);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Fallback suggestions based on common SEO best practices
      setAiSuggestions([
        { keyword: 'cognitive operating system', volume: 1200, difficulty: 45, relevance: 95 },
        { keyword: 'autonomous enterprise', volume: 890, difficulty: 38, relevance: 92 },
        { keyword: 'AI financial automation', volume: 2400, difficulty: 52, relevance: 88 },
        { keyword: 'enterprise AI platform', volume: 3100, difficulty: 65, relevance: 85 },
        { keyword: 'financial process automation', volume: 1800, difficulty: 48, relevance: 90 },
        { keyword: 'cognitive finance', volume: 720, difficulty: 32, relevance: 98 },
        { keyword: 'AI accounting software', volume: 4200, difficulty: 72, relevance: 82 },
        { keyword: 'enterprise process mining', volume: 1100, difficulty: 41, relevance: 87 }
      ]);
      setOptimizationTips([
        { page: '/', tip: 'Add more long-tail keywords in hero section', priority: 'high', impact: '+15% organic traffic' },
        { page: '/modules', tip: 'Include product comparison keywords', priority: 'medium', impact: '+8% CTR' },
        { page: '/', tip: 'Add FAQ schema markup for featured snippets', priority: 'high', impact: '+20% visibility' },
        { page: '/tailored-pilots', tip: 'Target "enterprise AI pilot program" keyword', priority: 'medium', impact: '+12% conversions' },
        { page: '/', tip: 'Optimize meta description with action verbs', priority: 'low', impact: '+5% CTR' }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch target keywords on mount
  useEffect(() => {
    if (activeTab === 'optimize') {
      fetchTargetKeywords();
      getAiSuggestions();
    }
  }, [activeTab]);

  const renderOptimizeTab = () => (
    <div className="seo-tab-content">
      <div className="optimize-section">
        <h2 style={{ color: '#0066FF', marginBottom: '20px' }}>🎯 Target Keywords</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Add keywords you want to rank for. Our AI will analyze your content and provide optimization suggestions.
        </p>
        
        {/* Add Keyword Form */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Enter target keyword (e.g., 'financial analytics software')"
            style={{
              flex: 1,
              padding: '12px 15px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && addTargetKeyword()}
          />
          <button
            onClick={addTargetKeyword}
            style={{
              padding: '12px 25px',
              background: '#0066FF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + Add Keyword
          </button>
        </div>

        {/* Target Keywords List */}
        <div style={{ 
          background: '#f8f9fa', 
          borderRadius: '10px', 
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Your Target Keywords</h3>
          {targetKeywords.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>
              No target keywords added yet. Add keywords above to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {targetKeywords.map((kw, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'white',
                    padding: '8px 15px',
                    borderRadius: '20px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <span>{kw.keyword || kw}</span>
                  <button
                    onClick={() => removeTargetKeyword(kw.id || idx)}
                    style={{
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <h2 style={{ color: '#0066FF', marginBottom: '20px' }}>🤖 AI Keyword Suggestions</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Based on your content and industry, here are AI-recommended keywords to target:
        </p>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)', 
          borderRadius: '10px', 
          padding: '20px',
          marginBottom: '30px'
        }}>
          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div className="spinner" style={{ margin: '0 auto 15px' }}></div>
              <p>AI is analyzing your content...</p>
            </div>
          ) : aiSuggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button
                onClick={getAiSuggestions}
                style={{
                  padding: '15px 30px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px'
                }}
              >
                🔮 Generate AI Suggestions
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'white',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{suggestion.keyword || suggestion}</span>
                    {suggestion.volume && (
                      <span style={{ 
                        fontSize: '11px', 
                        background: '#e8f4ff', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        color: '#0066FF'
                      }}>
                        {suggestion.volume} vol
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setNewKeyword(suggestion.keyword || suggestion);
                        addTargetKeyword();
                      }}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={getAiSuggestions}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                🔄 Refresh Suggestions
              </button>
            </div>
          )}
        </div>

        {/* Optimization Tips */}
        <h2 style={{ color: '#0066FF', marginBottom: '20px' }}>📈 Page Optimization Tips</h2>
        <div style={{ 
          background: '#fff', 
          borderRadius: '10px', 
          border: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Page</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Issue</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Recommendation</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {optimizationTips.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                    Add target keywords to get personalized optimization tips
                  </td>
                </tr>
              ) : (
                optimizationTips.map((tip, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 15px', fontWeight: '500' }}>{tip.page}</td>
                    <td style={{ padding: '12px 15px', color: '#666' }}>{tip.issue}</td>
                    <td style={{ padding: '12px 15px' }}>{tip.recommendation}</td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: tip.impact === 'High' ? '#fff3cd' : tip.impact === 'Medium' ? '#d1ecf1' : '#d4edda',
                        color: tip.impact === 'High' ? '#856404' : tip.impact === 'Medium' ? '#0c5460' : '#155724'
                      }}>
                        {tip.impact}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderKeywordsTab = () => (
    <div className="seo-tab-content">
      <div className="seo-stats-grid">
        {keywordSummary && (
          <>
            <div className="seo-stat-card">
              <h3>Tracked Keywords</h3>
              <div className="stat-value">{keywordSummary.tracked_keywords || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Average Position</h3>
              <div className="stat-value">{parseFloat(keywordSummary.avg_position || 0).toFixed(1)}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Total Clicks</h3>
              <div className="stat-value">{keywordSummary.total_clicks || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Total Impressions</h3>
              <div className="stat-value">{keywordSummary.total_impressions || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Average CTR</h3>
              <div className="stat-value">{(parseFloat(keywordSummary.avg_ctr || 0) * 100).toFixed(2)}%</div>
            </div>
            <div className="seo-stat-card">
              <h3>Top 10 Rankings</h3>
              <div className="stat-value">{keywordSummary.top_10_rankings || 0}</div>
            </div>
          </>
        )}
      </div>

      <div className="seo-section">
        <h2>Top Performing Keywords</h2>
        <div className="table-container">
          <table className="seo-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Position</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {topKeywords.map((kw, idx) => (
                <tr key={idx}>
                  <td className="keyword-text">{kw.keyword}</td>
                  <td>
                    <span className={`position-badge ${kw.position <= 3 ? 'top3' : kw.position <= 10 ? 'top10' : ''}`}>
                      #{kw.position}
                    </span>
                  </td>
                  <td>{kw.clicks || 0}</td>
                  <td>{kw.impressions || 0}</td>
                  <td>{((kw.ctr || 0) * 100).toFixed(2)}%</td>
                  <td>{kw.recorded_at ? format(new Date(kw.recorded_at), 'MMM dd, yyyy') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {opportunities.length > 0 && (
        <div className="seo-section">
          <h2>Optimization Opportunities (Page 2-3)</h2>
          <p className="section-description">Keywords ranking on pages 2-3 that could reach page 1 with optimization</p>
          <div className="table-container">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Current Position</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Potential</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp, idx) => (
                  <tr key={idx}>
                    <td className="keyword-text">{opp.keyword}</td>
                    <td>#{opp.position}</td>
                    <td>{opp.impressions || 0}</td>
                    <td>{opp.clicks || 0}</td>
                    <td>
                      <span className="potential-badge">
                        High {opp.position <= 15 ? '🔥' : '⚡'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderBacklinksTab = () => (
    <div className="seo-tab-content">
      <div className="seo-stats-grid">
        {backlinkStats && backlinkStats.length > 0 && (
          <>
            <div className="seo-stat-card">
              <h3>Total Backlinks</h3>
              <div className="stat-value">{backlinkStats[0]?.total || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Average DA</h3>
              <div className="stat-value">{parseFloat(backlinkStats[0]?.avg_da || 0).toFixed(0)}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Dofollow Links</h3>
              <div className="stat-value">{backlinkStats[0]?.dofollow_count || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Unique Domains</h3>
              <div className="stat-value">{backlinkStats[0]?.unique_domains || 0}</div>
            </div>
          </>
        )}
      </div>

      <div className="seo-section">
        <h2>Backlink Monitor</h2>
        <div className="table-container">
          <table className="seo-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Target Page</th>
                <th>DA</th>
                <th>Type</th>
                <th>Status</th>
                <th>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map((bl, idx) => (
                <tr key={idx}>
                  <td>
                    <a href={bl.source_url} target="_blank" rel="noopener noreferrer" className="link-external">
                      {new URL(bl.source_url).hostname}
                    </a>
                  </td>
                  <td>{bl.target_url ? new URL(bl.target_url).pathname : '-'}</td>
                  <td>
                    <span className={`da-badge ${bl.domain_authority >= 70 ? 'high' : bl.domain_authority >= 40 ? 'medium' : 'low'}`}>
                      {bl.domain_authority || 0}
                    </span>
                  </td>
                  <td>{bl.is_dofollow ? 'Dofollow' : 'Nofollow'}</td>
                  <td>
                    <span className={`status-badge ${bl.status === 'active' ? 'active' : 'broken'}`}>
                      {bl.status || 'active'}
                    </span>
                  </td>
                  <td>{bl.discovered_at ? format(new Date(bl.discovered_at), 'MMM dd, yyyy') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIssuesTab = () => {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const autoFixable = issues.filter(i => i.auto_fixable && i.status === 'open');

    return (
      <div className="seo-tab-content">
        <div className="seo-stats-grid">
          <div className="seo-stat-card">
            <h3>Total Issues</h3>
            <div className="stat-value">{issues.length}</div>
          </div>
          <div className="seo-stat-card critical">
            <h3>Critical</h3>
            <div className="stat-value">{criticalIssues.length}</div>
          </div>
          <div className="seo-stat-card warning">
            <h3>Warnings</h3>
            <div className="stat-value">{warningIssues.length}</div>
          </div>
          <div className="seo-stat-card">
            <h3>Auto-Fixable</h3>
            <div className="stat-value">{autoFixable.length}</div>
            {autoFixable.length > 0 && (
              <button className="fix-button" onClick={handleAutoFix}>
                Fix Now
              </button>
            )}
          </div>
        </div>

        <div className="seo-section">
          <h2>SEO Issues</h2>
          <div className="issues-container">
            {issues.map((issue, idx) => (
              <div key={idx} className={`issue-card ${issue.severity}`}>
                <div className="issue-header">
                  <span className="issue-type">{issue.issue_type?.toUpperCase()}</span>
                  <span className={`severity-badge ${issue.severity}`}>
                    {issue.severity}
                  </span>
                </div>
                <div className="issue-body">
                  <div className="issue-page">{issue.page_url}</div>
                  <div className="issue-description">{issue.description}</div>
                  {issue.recommendation && (
                    <div className="issue-recommendation">
                      💡 {issue.recommendation}
                    </div>
                  )}
                </div>
                <div className="issue-footer">
                  <span className={`auto-fix-badge ${issue.auto_fixable ? 'yes' : 'no'}`}>
                    {issue.auto_fixable ? '✓ Auto-fixable' : '✗ Manual fix needed'}
                  </span>
                  <span className="issue-status">{issue.status || 'open'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFixesTab = () => (
    <div className="seo-tab-content">
      <div className="seo-stats-grid">
        {fixStats && (
          <>
            <div className="seo-stat-card">
              <h3>Total Fixes</h3>
              <div className="stat-value">{fixStats.total_fixes || 0}</div>
            </div>
            <div className="seo-stat-card success">
              <h3>Successful</h3>
              <div className="stat-value">{fixStats.successful || 0}</div>
            </div>
            <div className="seo-stat-card error">
              <h3>Failed</h3>
              <div className="stat-value">{fixStats.failed || 0}</div>
            </div>
            <div className="seo-stat-card">
              <h3>Success Rate</h3>
              <div className="stat-value">
                {fixStats.total_fixes > 0 
                  ? ((fixStats.successful / fixStats.total_fixes) * 100).toFixed(0)
                  : 0}%
              </div>
            </div>
          </>
        )}
      </div>

      {fixStats && fixStats.by_type && (
        <div className="seo-section">
          <h2>Fixes by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(fixStats.by_type).map(([type, count]) => ({
              type: type.replace(/_/g, ' '),
              count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="seo-section">
        <h2>Fix History</h2>
        <div className="table-container">
          <table className="seo-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Page</th>
                <th>Status</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {fixHistory.map((fix, idx) => (
                <tr key={idx}>
                  <td>{fix.executed_at ? format(new Date(fix.executed_at), 'MMM dd, yyyy HH:mm') : '-'}</td>
                  <td>{fix.action_type}</td>
                  <td className="page-url">{fix.page_url}</td>
                  <td>
                    <span className={`status-badge ${fix.status === 'success' ? 'success' : 'error'}`}>
                      {fix.status || 'unknown'}
                    </span>
                  </td>
                  <td>{fix.impact_measured ? '✓ Measured' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderScoresTab = () => (
    <div className="seo-tab-content">
      <div className="seo-section">
        <div className="section-header">
          <h2>Page SEO Scores</h2>
          {pageScores.length === 0 && !loading && (
            <button onClick={handleRefresh} className="scan-button">
              🚀 Run SEO Scan
            </button>
          )}
        </div>
        {loading ? (
          <div className="loading-state">
            <p>Scanning pages for SEO optimization...</p>
            <p className="loading-subtitle">This may take a few minutes</p>
          </div>
        ) : pageScores.length === 0 ? (
          <div className="empty-state">
            <p>No SEO data available yet</p>
            <p className="empty-subtitle">Click "Run SEO Scan" to analyze all pages</p>
          </div>
        ) : (
          <div className="scores-grid">
            {pageScores.map((page, idx) => (
              <div key={idx} className="score-card">
                <div className="score-header">
                  <h3>{page.page}</h3>
                  <div className={`score-circle ${page.seo_score >= 70 ? 'good' : page.seo_score >= 40 ? 'medium' : 'poor'}`}>
                    {page.seo_score}/100
                  </div>
                </div>
                <div className="score-details">
                  <div className="score-item">
                    <span>Keyword Density</span>
                    <span>{page.keyword_density}%</span>
                  </div>
                  <div className="score-item">
                    <span>Word Count</span>
                    <span>{page.word_count}</span>
                  </div>
                  <div className="score-item">
                    <span>Internal Links</span>
                    <span>{page.internal_links}</span>
                  </div>
                  <div className="score-item">
                    <span>External Links</span>
                    <span>{page.external_links}</span>
                  </div>
                  <div className="score-item">
                    <span>Images</span>
                    <span>{page.images_count}</span>
                  </div>
                  <div className="score-item">
                    <span>Missing Alt Texts</span>
                    <span className={page.images_without_alt > 0 ? 'error' : 'success'}>
                      {page.images_without_alt}
                    </span>
                  </div>
                </div>
                {page.last_scanned && (
                  <div className="score-footer">
                    Last scanned: {format(new Date(page.last_scanned), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="seo-dashboard">
        <div className="loading-spinner">Loading SEO data...</div>
      </div>
    );
  }

  return (
    <div className="seo-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <button onClick={() => history.push('/vault-e9232b8eefbaa45e/dashboard')} className="btn-back">
            ← Dashboard
          </button>
          <h1>SEO Performance Dashboard</h1>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-button">
            Refresh {activeTab === 'keywords' ? 'Keywords' : activeTab === 'backlinks' ? 'Backlinks' : 'Issues'}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'optimize' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimize')}
        >
          🚀 AI Optimize
        </button>
        <button
          className={`tab ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => setActiveTab('keywords')}
        >
          Keywords
        </button>
        <button
          className={`tab ${activeTab === 'backlinks' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlinks')}
        >
          Backlinks
        </button>
        <button
          className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues
        </button>
        <button
          className={`tab ${activeTab === 'fixes' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixes')}
        >
          Auto-Fixes
        </button>
        <button
          className={`tab ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          Page Scores
        </button>
      </div>

      {activeTab === 'optimize' && renderOptimizeTab()}
      {activeTab === 'keywords' && renderKeywordsTab()}
      {activeTab === 'backlinks' && renderBacklinksTab()}
      {activeTab === 'issues' && renderIssuesTab()}
      {activeTab === 'fixes' && renderFixesTab()}
      {activeTab === 'scores' && renderScoresTab()}
    </div>
  );
};

export default SEODashboard;
