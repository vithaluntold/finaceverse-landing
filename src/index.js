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
import Blog from './views/blog'
import Unsubscribe from './views/unsubscribe'
import NotFound from './views/not-found'

const App = () => {
  return (
    <Router>
      <Switch>
        <Route component={Home} exact path="/" />
        <Route component={Modules} exact path="/modules" />
        <Route component={CompliancePrivacy} exact path="/compliance-privacy" />
        <Route component={TailoredPilots} exact path="/tailored-pilots" />
        <Route component={ExpertConsultation} exact path="/expert-consultation" />
        <Route component={Blog} exact path="/blog" />
        <Route component={Unsubscribe} exact path="/unsubscribe" />
        <Route component={NotFound} path="**" />
        <Redirect to="**" />
      </Switch>
    </Router>
  )
}

ReactDOM.render(<App />, document.getElementById('app'))
