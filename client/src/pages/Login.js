import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Login() {
  const [localUsername, setLocalUsername] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  
  // Grab the global functions from our Context "Cloud"
  const { loginAccount, registerAccount } = useContext(AuthContext);

  const handleLogin = async () => {
    const result = await loginAccount(localUsername, localPassword);
    if (!result.success) alert(result.error);
  };

  const handleRegister = async () => {
    const result = await registerAccount(localUsername, localPassword);
    if (result.success) {
      alert("Registration Successful! Please login.");
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="joinChatContainer">
      <h3>Welcome to ChatFlow</h3>
      <input
        type="text"
        placeholder="Username..."
        onChange={(e) => setLocalUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password..."
        onChange={(e) => setLocalPassword(e.target.value)}
      />
      <div className="auth-button-container">
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleRegister}>Register</button>
      </div>
    </div>
  );
}

export default Login;