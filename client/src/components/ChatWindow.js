import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";

function ChatWindow({ currentChat }) {
  const { username, token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  // NEW: Typing Indicator State
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null); // The invisible timer!

  // 1. JOIN THE ROOM & CLEAR STATE
  // 1. JOIN THE ROOM & FETCH HISTORY
  useEffect(() => {
    // A helper function to fetch history from our new route
    const fetchHistory = async () => {
      try {
        const response = await fetch(`https://chatflow-backend-bvvt.onrender.com/conversations/${currentChat.id}/messages`, {
          headers: { Authorization: token }, // Showing the VIP wristband!
        });
        const data = await response.json();

        if (response.status === 200) {
          setMessageList(data); // Populate the screen with the database history!
        } else {
          console.error("Failed to load history:", data.error);
        }
      } catch (error) {
        console.error("Network error fetching history:", error);
      }
    };

    // When the chat changes: Join the socket room, reset typing, and fetch history
    if (socket && currentChat) {
      socket.emit("join_conversation", currentChat.id);
      setIsTyping(false);
      fetchHistory(); // <-- The Magic Memory Call
    }
  }, [socket, currentChat, token]);

  // 2. LISTEN FOR INCOMING SOCKET EVENTS
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    const receiveMessageHandler = (data) => {
      setMessageList((list) => [...list, data]);
      setIsTyping(false); // If they send a message, they obviously stopped typing!
    };

    // Handle typing signals
    const displayTypingHandler = (typingUsername) => {
      setIsTyping(true);
      setTypingUser(typingUsername);
    };

    const clearTypingHandler = () => {
      setIsTyping(false);
      setTypingUser("");
    };

    socket.on("receive_message", receiveMessageHandler);
    socket.on("display_typing", displayTypingHandler);
    socket.on("clear_typing", clearTypingHandler);

    return () => {
      socket.off("receive_message", receiveMessageHandler);
      socket.off("display_typing", displayTypingHandler);
      socket.off("clear_typing", clearTypingHandler);
    };
  }, [socket]);

  // 3. HANDLE TYPING INPUT (The Debounce Logic)
  const handleTyping = (event) => {
    setCurrentMessage(event.target.value);

    if (socket && currentChat) {
      // Tell the server we are typing
      socket.emit("typing", {
        conversationId: currentChat.id,
        username: username,
      });

      // Clear the previous 2-second timer if it exists
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Start a brand new 2-second timer
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", currentChat.id);
      }, 2000);
    }
  };

  // 4. SEND A MESSAGE
  const sendMessage = () => {
    if (currentMessage !== "" && socket) {
      const messageData = {
        conversationId: currentChat.id,
        token: token,
        message: currentMessage,
      };

      const myMessage = {
        id: Math.random().toString(),
        author: username,
        text: currentMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessageList((list) => [...list, myMessage]);
      socket.emit("send_message", messageData);

      // Stop our own typing indicator instantly when we hit send
      socket.emit("stop_typing", currentChat.id);
      setCurrentMessage("");
    }
  };

  // --- UI RENDERING ---
  return (
    <div className="chat-window">
      {currentChat ? (
        <>
          <div className="chat-header">
            <h3>
              {currentChat.type === "GROUP"
                ? currentChat.name
                : currentChat.participants?.find(p => p.user.username !== username)?.user.username}
            </h3>
          </div>

          <div className="chat-body">
            {messageList.map((msg) => {
              const isMe = msg.author === username;
              return (
                <div key={msg.id} className={`message-container ${isMe ? "you" : "other"}`}>
                  <div className="message-bubble">
                    <p className="message-text">{msg.text}</p>
                    <div className="message-meta">
                      <span>{msg.time}</span>
                      {!isMe && <span className="author-name"> • {msg.author}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NEW: The Typing Indicator UI */}
            {isTyping && typingUser !== username && (
              <div className="typing-indicator">
                <p><em>{typingUser} is typing...</em></p>
              </div>
            )}
          </div>

          <div className="chat-footer">
            <input
              type="text"
              value={currentMessage}
              placeholder="Type a message..."
              onChange={handleTyping} // NEW: Bound to our new function!
              onKeyPress={(event) => {
                event.key === "Enter" && sendMessage();
              }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      ) : (
        <div className="empty-chat-placeholder">
          <h3>Select a chat to start messaging</h3>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;  