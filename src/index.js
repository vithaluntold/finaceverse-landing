import React from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom'

import './polyfills'
import './style.css'
import './responsive.css'
import Home from './views/home'
import Modules from './views/modules'
import CompliancePrivacy from './views/compliance-privacy'
import TailoredPilots from './views/tailored-pilots'
import ExpertConsultation from './views/expert-consultation'
import RequestDemo from './views/request-demo'
import Blog from './views/blog'
import BlogArticle from './views/blog-article'
import Unsubscribe from './views/unsubscribe'
import AnalyticsDashboard from './views/analytics-dashboard'
import SEODashboard from './views/seo-dashboard'
import SuperAdminLogin from './views/superadmin-login'
import SuperAdminDashboard from './views/superadmin-dashboard'
import ProductManager from './views/product-manager'
import NotFound from './views/not-found'
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

const App = () => {
  // Track page views and prefetch on route change
  React.useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      trackPageView(currentPath);
      trackNavigation(currentPath);
      
      // Prefetch likely next routes (only on good connections)
      if (shouldPrefetch()) {
        setTimeout(() => prefetchLikelyRoutes(currentPath), 2000);
      }
    };
    handleRouteChange(); // Track initial page
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <Router>
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
        <Route component={NotFound} path="**" />
        <Redirect to="**" />
      </Switch>
    </Router>
  )
}

ReactDOM.render(<App />, document.getElementById('app'))
