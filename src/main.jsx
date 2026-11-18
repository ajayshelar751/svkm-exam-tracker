import React from 'react';
import ReactDOM from 'react-dom/client';
import * as XLSX from 'xlsx';
import App from './App.jsx';
import './index.css';

// Ensure XLSX is globally accessible to all legacy/modal helpers
if (typeof window !== 'undefined') {
  window.XLSX = XLSX;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
