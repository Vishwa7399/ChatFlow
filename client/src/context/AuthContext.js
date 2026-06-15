import React, { createContext, useState, useEffect } from "react";

// 1. Create the empty "Cloud"
export const AuthContext = createContext();

// 2. Create the Provider component that will wrap our App
export const AuthProvider = ({ children }) => {
  // Global State
  const [username, setUsername] = useState("");
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize from Local Storage on load
  useEffect(() => {
    const savedToken = localStorage.getItem("chat_token");
    const savedUsername = localStorage.getItem("chat_username");

    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
      setIsAuthenticated(true);
    }
  }, []);

  // Global Login Function
  const loginAccount = async (inputUsername, inputPassword) => {
    try {
      const response = await fetch("https://chatflow-backend-bvvt.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inputUsername, password: inputPassword }),
      });
      const data = await response.json();

      if (response.status === 200) {
        localStorage.setItem("chat_token", data.token);
        localStorage.setItem("chat_username", data.username);

        setToken(data.token);
        setUsername(data.username);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Network error:", error);
      return { success: false, error: "Failed to connect to the server." };
    }
  };

  // Global Register Function
  const registerAccount = async (inputUsername, inputPassword, publicKey) => {
    try {
      const response = await fetch("https://chatflow-backend-bvvt.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inputUsername, password: inputPassword ,publicKey: publicKey}),
      });
      const data = await response.json();

      if (response.status === 201) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Network error:", error);
      return { success: false, error: "Failed to connect to the server." };
    }
  };

  // Global Logout Function
  const logoutAccount = () => {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_username");
    setToken(null);
    setUsername("");
    setIsAuthenticated(false);
  };

  // 3. Return the Provider, passing all our state and functions into the "value" prop
  return (
    <AuthContext.Provider
      value={{
        username,
        token,
        isAuthenticated,
        loginAccount,
        registerAccount,
        logoutAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};