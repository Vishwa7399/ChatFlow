import "./App.css";
import io from "socket.io-client";
import { useState, useEffect } from "react";
import Chat from "./Chat";


// Keep your existing socket connection
const socket = io.connect("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // 1. UPDATED: Restore BOTH token and username on page load
  useEffect(() => {
    const savedToken = localStorage.getItem("chat_token");
    const savedUsername = localStorage.getItem("chat_username");

    if (savedToken && savedUsername) {
      setUsername(savedUsername); // Restores your name so Join Room works!
      setIsRegistered(true);
    }
  }, []);

  const registerAccount = async () => {
    if (username === "" || password === "") {
      alert("Please enter both a username and password.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3001/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.status === 201) {
        alert("Registration Successful! Please login with your new account.");
      } else {
        alert("Registration Failed: " + data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  // 2. UPDATED: Save username to localStorage on successful login
  const loginAccount = async () => {
    if (username === "" || password === "") {
      alert("Please enter both a username and password.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.status === 200) {
        // Save BOTH the wristband and the name
        localStorage.setItem("chat_token", data.token);
        localStorage.setItem("chat_username", data.username);
        
        setUsername(data.username);
        alert("Login Successful!");
        setIsRegistered(true);
      } else {
        alert("Login Failed: " + data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  // 3. NEW: Logout function to clear the backpack and show login page again
  const logoutAccount = () => {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_username");
    setUsername("");
    setPassword("");
    setRoom("");
    setIsRegistered(false);
  };

  const joinRoom = () => {
    if (username !== "" && room !== "" && isRegistered) {
      socket.emit("join_room", room);
      setShowChat(true);
    }
  };

  return (
    <div className="App">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Join A Chat</h3>

          {/* STEP 1: AUTHENTICATION */}
          <input
            type="text"
            placeholder="Username..."
            onChange={(event) => setUsername(event.target.value)}
            disabled={isRegistered} // Lock input after success
          />
          <input
            type="password"
            placeholder="Password..."
            onChange={(event) => setPassword(event.target.value)}
            disabled={isRegistered} // Lock input after success
          />

          {/* Show Auth buttons ONLY if they haven't logged in yet */}
          {!isRegistered && (
            <div className="auth-button-container">
              <button onClick={loginAccount}>Login</button>
              <button onClick={registerAccount}>Register</button>
            </div>
          )}

          {/* STEP 2: ROOM SELECTION & LOGOUT */}
          {isRegistered && (
            <>
              <p className="welcome-text">Welcome back, <strong>{username}</strong>!</p>
              <input
                type="text"
                placeholder="Room ID..."
                onChange={(event) => setRoom(event.target.value)}
              />
              <button onClick={joinRoom}>Join Room</button>
              <button onClick={logoutAccount} className="logout-btn">Log Out</button>
            </>
          )}

        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;