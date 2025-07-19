import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Create a root for React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component within strict mode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
