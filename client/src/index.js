import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketContextProvider } from './context/SocketContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SocketContextProvider> {/* <-- NEW: Wrap inside the AuthProvider */}
        <App />
      </SocketContextProvider>
    </AuthProvider>
  </React.StrictMode>
);