import React from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom'

import './style.css'
import Home from './views/home'
import Modules from './views/modules'
import CompliancePrivacy from './views/compliance-privacy'
import TailoredPilots from './views/tailored-pilots'
import ExpertConsultation from './views/expert-consultation'
import RequestDemo from './views/request-demo'
import Blog from './views/blog'
import Unsubscribe from './views/unsubscribe'
import AnalyticsLogin from './views/analytics-login'
import AnalyticsDashboard from './views/analytics-dashboard'
import NotFound from './views/not-found'
import { initGA, trackPageView } from './utils/analytics'
import { initPerformanceTracking, trackVisit } from './utils/performanceTracker'

// Initialize analytics on app load
initGA();
initPerformanceTracking();
trackVisit();

const App = () => {
  // Track page views on route change
  React.useEffect(() => {
    const handleRouteChange = () => {
      trackPageView(window.location.pathname);
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
        <Route component={Unsubscribe} exact path="/unsubscribe" />
        <Route component={AnalyticsLogin} exact path="/analytics/login" />
        <Route component={AnalyticsDashboard} exact path="/analytics/dashboard" />
        <Route component={NotFound} path="**" />
        <Redirect to="**" />
      </Switch>
    </Router>
  )
}

ReactDOM.render(<App />, document.getElementById('app'))
