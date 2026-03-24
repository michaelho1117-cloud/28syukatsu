import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Applications from './pages/Applications';
import Emails from './pages/Emails';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Journal from './pages/Journal';
import Accounts from './pages/Accounts';
import CompanyDetail from './pages/CompanyDetail';
import ResearchHub from './pages/ResearchHub';
import Login from './pages/Login';
import EventCapture from './pages/EventCapture';
import Planner from './pages/Planner';
import Events from './pages/Events';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import './index.css';

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={(
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/planner" element={<Planner />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/companies/:id" element={<CompanyDetail />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/emails" element={<Emails />} />
                    <Route path="/capture" element={<EventCapture />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/practice" element={<Practice />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/research-hub" element={<ResearchHub />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
