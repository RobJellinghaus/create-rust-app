import { RelayEnvironmentProvider } from 'react-relay'
import { useAuth, useAuthCheck } from './hooks/useAuth'
import { useAuthenticatedRelayEnvironment } from './hooks/useAuthenticatedRelayEnvironment'
import { RelayEnvironmentContext } from './hooks/useRelayEnvironmentContext'
import { AccountPage } from './containers/AccountPage'
import { LoginPage } from './containers/LoginPage'
import { OauthLoginResultPage } from './containers/OauthLoginResultPage'
import { ActivationPage } from './containers/ActivationPage'
import { RegistrationPage } from './containers/RegistrationPage'
import { RecoveryPage } from './containers/RecoveryPage'
import { ResetPage } from './containers/ResetPage'
import React, { Suspense } from 'react'
import './App.css'
import { Home } from './containers/Home'
import { Todos } from './containers/Todo'
import { TodoGraphQLRelay } from './containers/TodoGraphQLRelay'
import { SupplierList } from './containers/SupplierList'
import { Files } from './containers/Files'
import { Route, useNavigate, Routes, useLocation } from 'react-router-dom'

const App = () => {
  useAuthCheck()
  const auth = useAuth()
  const location = useLocation()
    
  const navigate = useNavigate()
  /* CRA: app hooks */
  const relayEnvironment = useAuthenticatedRelayEnvironment()
  
  // @ts-ignore
  return (
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <RelayEnvironmentContext.Provider value={relayEnvironment}>
        <div className={`App ${location.pathname === '/suppliers' ? 'full-width-layout' : ''}`}>
        <div className="App-nav-header">
          <div style={{ display: 'flex', flex: 1 }}>
            <a className="NavButton" onClick={() => navigate('/')}>Home</a>
            <a className="NavButton" onClick={() => navigate('/todos')}>Todos (REST)</a>
            <a className="NavButton" onClick={() => navigate('/todos-relay')}>Todos (Relay)</a>
            <a className="NavButton" onClick={() => navigate('/suppliers')}>Suppliers</a>
          <a className="NavButton" onClick={() => navigate('/files')}>Files</a>
            {/* CRA: left-aligned nav buttons */}
            <a className="NavButton" onClick={() => navigate('/account')}>Account</a>
          </div>
          <div style={{ display: 'flex' }}>
            {/* CRA: right-aligned nav buttons */}
              <a className="NavButton" onClick={() => window.location.href = "/swagger-ui/" }>API</a>
            { auth.isAuthenticated && <a className="NavButton" onClick={() => { auth.logout(); }}>Logout</a> }
            { !auth.isAuthenticated && <a className="NavButton" onClick={() => navigate('/login')}>Login/Register</a> }
          </div>
        </div>
        <div style={{ margin: '0 auto', maxWidth: '800px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/todos" element={<Todos />} />
            {/* 
              CRITICAL: Relay components that use useLazyLoadQuery MUST be wrapped in <Suspense>
              
              Failure mode without Suspense:
              - When the Relay component mounts, useLazyLoadQuery immediately suspends to fetch data
              - React throws an error: "A component suspended while responding to synchronous input"
              - The error boundary catches this and replaces the entire component tree with an error state
              - User sees a blank page or error boundary instead of a loading state
              - The GraphQL query may still execute but the UI is broken
              
              With Suspense:
              - The Suspense boundary catches the suspension and shows the fallback UI
              - Once the query completes, React re-renders with the data
              - User sees a proper loading state followed by the actual content
            */}
            <Route path="/todos-relay" element={
              <Suspense fallback={<div>Loading Relay todos...</div>}>
                <TodoGraphQLRelay />
              </Suspense>
            } />
            <Route path="/suppliers" element={
              <Suspense fallback={<div>Loading suppliers...</div>}>
                <SupplierList />
              </Suspense>
            } />
            {/* CRA: routes */}
              <Route path="/files" element={<Files />} />
            <Route path="/login" element={<LoginPage />} />
              <Route path="/oauth/success" element={<OauthLoginResultPage />} />
              <Route path="/oauth/error" element={<OauthLoginResultPage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/reset" element={<ResetPage />} />
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/account" element={<AccountPage />} />
      
          </Routes>
        </div>
      </div>
      </RelayEnvironmentContext.Provider>
    </RelayEnvironmentProvider>
  )
}

export default App
