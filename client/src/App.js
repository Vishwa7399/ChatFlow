import "./App.css";
import io from "socket.io-client";
import { useState } from "react";
import Chat from "./Chat";

// Keep your existing socket connection
const socket = io.connect("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  
  // NEW: Security & Auth States
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // NEW: The HTTP REST API Call
  const registerAccount = async () => {
    if (username === "" || password === "") {
      alert("Please enter both a username and password.");
      return;
    }

    try {
      // 1. Send the data to our new backend endpoint
      const response = await fetch("http://localhost:3001/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      // 2. Read the backend's response
      const data = await response.json();

      if (response.status === 201) {
        // Success! The database saved the hash.
        alert("Registration Successful! You can now join a room.");
        setIsRegistered(true); // Unlocks the room input
      } else {
        // Failure! (e.g., Username already taken)
        alert("Registration Failed: " + data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Failed to connect to the server.");
    }
  };


  const loginAccount = async () => {
    if (username === "" || password === "") {
      alert("Please enter both a username and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        alert("Login Successful!");
        setIsRegistered(true); // Unlocks the room input!
      } else {
        alert("Login Failed: " + data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Failed to connect to the server.");
    }
  };


  // EXISTING: The Socket.io Call
  const joinRoom = () => {
    // We now ensure they are registered before allowing them to join!
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

          {/* STEP 2: ROOM SELECTION (Hidden until registered) */}
          {isRegistered && (
            <>
              <input
                type="text"
                placeholder="Room ID..."
                onChange={(event) => setRoom(event.target.value)}
              />
              <button onClick={joinRoom}>Join Room</button>
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