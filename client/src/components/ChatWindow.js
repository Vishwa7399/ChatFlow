import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
// --- 1. IMPORT OUR CRYPTO ENGINE ---
import { encryptMessage, decryptMessage } from "../utils/encryption";

function ChatWindow({ currentChat }) {
  const { username, token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  // --- 🕵️ TECH LEAD DIAGNOSTIC LOGS ---
  console.log("1. RAW CHAT DATA:", currentChat);
  const testPartner = currentChat?.participants?.find(p => p.user.username !== username);
  console.log("2. EXTRACTED PARTNER:", testPartner);
  console.log("3. PARTNER PUBLIC KEY:", testPartner?.user?.publicKey);

  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null); 

  // --- Helper: Find the person we are talking to and grab their Padlock ---
  const partner = currentChat?.participants?.find(p => p.user.username !== username);
  const partnerPublicKey = partner?.user?.publicKey;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
      const response = await fetch(`https://chatflow-backend-bvvt.onrender.com/conversations/${currentChat.id}/messages`, {
          headers: { Authorization: token }, 
        });
        const data = await response.json();

        if (response.status === 200) {
          // --- 2. DECRYPT THE DATABASE HISTORY ---
          const decryptedHistory = data.map((msg) => {
            let displayedText = msg.text;
            
            // If it's a private chat and we have their key, unlock the box!
            if (currentChat.type === "PRIVATE" && partnerPublicKey) {
                displayedText = decryptMessage(msg.text, partnerPublicKey);
            }
            
            return { ...msg, text: displayedText };
          });

          setMessageList(decryptedHistory); 
        }
      } catch (error) {
        console.error("Network error fetching history:", error);
      }
    };

    if (socket && currentChat) {
      socket.emit("join_conversation", currentChat.id);
      setIsTyping(false);
      fetchHistory(); 
    }
  }, [socket, currentChat, token, partnerPublicKey]);

  useEffect(() => {
    if (!socket) return;

    const receiveMessageHandler = (data) => {
      let displayedText = data.text;

      // --- 3. DECRYPT INCOMING LIVE MESSAGES ---
      if (currentChat.type === "PRIVATE" && partnerPublicKey) {
          displayedText = decryptMessage(data.text, partnerPublicKey);
      }

      setMessageList((list) => [...list, { ...data, text: displayedText }]);
      setIsTyping(false); 
    };

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
  }, [socket, currentChat, partnerPublicKey]);

  const handleTyping = (event) => {
    setCurrentMessage(event.target.value);

    if (socket && currentChat) {
      socket.emit("typing", {
        conversationId: currentChat.id,
        username: username,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", currentChat.id);
      }, 2000);
    }
  };

 const sendMessage = () => {
    if (currentMessage !== "" && socket) {
      try {
        console.log("1. ATTEMPTING TO SEND:", currentMessage);
        
        let messageToSend = currentMessage;

        // --- 4. ENCRYPT THE MESSAGE ---
        if (currentChat.type === "PRIVATE" && partnerPublicKey) {
            console.log("2. FOUND PADLOCK, ENCRYPTING...");
            messageToSend = encryptMessage(currentMessage, partnerPublicKey);
            console.log("3. ENCRYPTION SUCCESS! CIPHERTEXT:", messageToSend);
        } else {
            console.warn("🚨 WARNING: Bypassed Encryption! Missing Padlock or not a Private Chat.");
        }

        const messageData = {
          conversationId: currentChat.id,
          token: token,
          message: messageToSend,
        };

        const myMessage = {
          id: Math.random().toString(),
          author: username,
          text: currentMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessageList((list) => [...list, myMessage]);
        socket.emit("send_message", messageData);
        console.log("4. MESSAGE EMITTED TO SERVER!");

        socket.emit("stop_typing", currentChat.id);
        setCurrentMessage("");
        
      } catch (error) {
        console.error("🚨 CRITICAL ENCRYPTION ERROR:", error);
      }
    }
  };

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
            {/* NEW: UI Indicator for E2EE */}
            {currentChat.type === "PRIVATE" && partnerPublicKey && (
               <span style={{ fontSize: "12px", color: "#10b981", marginLeft: "10px" }}>
                 🔒 End-to-End Encrypted
               </span>
            )}
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
              onChange={handleTyping} 
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