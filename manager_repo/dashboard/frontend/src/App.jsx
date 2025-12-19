import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import Repository from './pages/Repository';
import Trends from './pages/Trends';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="container">
            <h1>
              <span className="icon">📊</span> Compliance Dashboard
            </h1>
            <nav>
              <Link to="/">Overview</Link>
              <Link to="/repositories">Repositories</Link>
              <Link to="/trends">Trends</Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/repositories" element={<Repositories />} />
              <Route path="/repositories/:name" element={<Repository />} />
              <Route path="/trends" element={<Trends />} />
            </Routes>
          </div>
        </main>

        <footer className="app-footer">
          <div className="container">
            <p>
              Powered by OpenSSF Scorecard + GitHub Custom Properties
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

