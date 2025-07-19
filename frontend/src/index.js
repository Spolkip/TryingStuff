import React from 'react';
// Corrected import path for ReactDOM
import ReactDOM from 'react-dom/client';
import './index.css'; // Make sure you have this CSS file for Tailwind
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
