import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import './seo-dashboard.css';

const SEODashboard = () => {
  const [activeTab, setActiveTab] = useState('keywords');
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
  const history = useHistory();

  const API_URL = process.env.REACT_APP_API_URL || 'https://www.finaceverse.io';
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const token = localStorage.getItem('analytics_token');
    if (!token) {
      history.push('/analytics/login');
      return;
    }

    fetchAllData();
    const interval = setInterval(fetchAllData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, [history]);

  const fetchAllData = async () => {
    const token = localStorage.getItem('analytics_token');
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
    const token = localStorage.getItem('analytics_token');
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
      }
      
      setTimeout(fetchAllData, 2000);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleAutoFix = async () => {
    const token = localStorage.getItem('analytics_token');
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
        <h2>Page SEO Scores</h2>
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
        <h1>SEO Performance Dashboard</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-button">
            Refresh {activeTab === 'keywords' ? 'Keywords' : activeTab === 'backlinks' ? 'Backlinks' : 'Issues'}
          </button>
        </div>
      </div>

      <div className="tabs-container">
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

      {activeTab === 'keywords' && renderKeywordsTab()}
      {activeTab === 'backlinks' && renderBacklinksTab()}
      {activeTab === 'issues' && renderIssuesTab()}
      {activeTab === 'fixes' && renderFixesTab()}
      {activeTab === 'scores' && renderScoresTab()}
    </div>
  );
};

export default SEODashboard;
