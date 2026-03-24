import React from 'react';
import Sidebar from './Sidebar';
import './MainLayout.css';

function MainLayout({ children }) {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="layout-main">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
