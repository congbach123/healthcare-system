// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Optional CSS
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* BrowserRouter and UserProvider are now in App.js, so just render App */}
    <App />
  </React.StrictMode>
);