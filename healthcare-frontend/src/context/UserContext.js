// src/context/UserContext.js
import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { message } from 'antd';

// Create the Context
const UserContext = createContext(null);

// Create a Provider component
export const UserProvider = ({ children }) => {
  // State to hold the logged-in user data
  const [user, setUser] = useState(() => {
    // Check if there's user data in localStorage on initial load
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Login function with persistence
  const login = (userData) => {
    // Store user data in state
    setUser(userData);
    // Persist user data in localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    message.success(`Welcome, ${userData.first_name || userData.username}!`);
  };

  // Logout function with cleanup
  const logout = () => {
    // Clear user data from state
    setUser(null);
    // Remove persisted data
    localStorage.removeItem('currentUser');
    message.info('You have been logged out');
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
  }), [user]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to easily access the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};