import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  useLocation,
} from 'react-router-dom'

import './polyfills'
import './style.css'
import './responsive.css'

// Eagerly load critical above-the-fold components
import Home from './views/home'

// Lazy load all other routes for code splitting
const Modules = lazy(() => import('./views/modules'))
const CompliancePrivacy = lazy(() => import('./views/compliance-privacy'))
const TailoredPilots = lazy(() => import('./views/tailored-pilots'))
const ExpertConsultation = lazy(() => import('./views/expert-consultation'))
const RequestDemo = lazy(() => import('./views/request-demo'))
const Blog = lazy(() => import('./views/blog'))
const BlogArticle = lazy(() => import('./views/blog-article'))
const Unsubscribe = lazy(() => import('./views/unsubscribe'))
const AnalyticsDashboard = lazy(() => import('./views/analytics-dashboard'))
const SEODashboard = lazy(() => import('./views/seo-dashboard'))
const SuperAdminLogin = lazy(() => import('./views/superadmin-login'))
const SuperAdminDashboard = lazy(() => import('./views/superadmin-dashboard'))
const ProductManager = lazy(() => import('./views/product-manager'))
const ContentEditor = lazy(() => import('./views/content-editor'))
const BlogEditor = lazy(() => import('./views/blog-editor'))
const NotFound = lazy(() => import('./views/not-found'))

import { initGA, trackPageView } from './utils/analytics'
import { initPerformanceTracking, trackVisit } from './utils/performanceTracker'
import { prefetchLikelyRoutes, trackNavigation, shouldPrefetch, initSmartImageLoading } from './utils/aiPrefetch'

// Initialize analytics on app load
initGA();
initPerformanceTracking();
trackVisit();

// Initialize AI-powered features if conditions are met
if (shouldPrefetch()) {
  initSmartImageLoading();
}

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
  }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '3px solid rgba(255,255,255,0.1)', 
      borderTop: '3px solid #00d4ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Component to track page views on route change
const PageTracker = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    trackPageView(location.pathname);
    trackNavigation(location.pathname);
    
    // Prefetch likely next routes (only on good connections)
    if (shouldPrefetch()) {
      setTimeout(() => prefetchLikelyRoutes(location.pathname), 2000);
    }
  }, [location]);
  
  return null;
};

const App = () => {
  return (
    <Router>
      <PageTracker />
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route component={Home} exact path="/" />
          <Route component={Modules} exact path="/modules" />
          <Route component={CompliancePrivacy} exact path="/compliance-privacy" />
          <Route component={TailoredPilots} exact path="/tailored-pilots" />
          <Route component={ExpertConsultation} exact path="/expert-consultation" />
          <Route component={RequestDemo} exact path="/request-demo" />
          <Route component={Blog} exact path="/blog" />
          <Route component={BlogArticle} path="/blog/:slug" />
          <Route component={Unsubscribe} exact path="/unsubscribe" />
          <Route component={AnalyticsDashboard} exact path="/analytics/dashboard" />
          <Route component={SEODashboard} exact path="/seo-dashboard" />
          <Route component={SuperAdminLogin} exact path="/vault-e9232b8eefbaa45e" />
          <Route component={SuperAdminDashboard} exact path="/vault-e9232b8eefbaa45e/dashboard" />
          <Route component={ProductManager} exact path="/vault-e9232b8eefbaa45e/products" />
          <Route component={ContentEditor} exact path="/vault-e9232b8eefbaa45e/content" />
          <Route component={BlogEditor} exact path="/vault-e9232b8eefbaa45e/blog" />
          <Route component={NotFound} path="**" />
          <Redirect to="**" />
        </Switch>
      </Suspense>
    </Router>
  )
}

ReactDOM.render(<App />, document.getElementById('app'))
// Build trigger Sat Jan 10 23:45:06 IST 2026
