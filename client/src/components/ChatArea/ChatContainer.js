import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import MessageInput from "./MessageInput";

function ChatContainer({ currentChat }) {
  const { username, token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [messageList, setMessageList] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  // 1. Fetch History & Join Socket Room
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:3001/conversations/${currentChat.id}/messages`, {
          headers: { Authorization: token },
        });
        const data = await response.json();
        if (response.ok) setMessageList(data);
      } catch (error) { console.error("History fetch error:", error); }
    };

    if (socket && currentChat) {
      socket.emit("join_conversation", currentChat.id);
      fetchHistory();
    }
  }, [socket, currentChat, token]);

  // 2. Listen for Incoming Messages
  useEffect(() => {
    if (!socket) return;
    const receiveMessageHandler = (data) => {
      setMessageList((list) => [...list, data]);
    };
    socket.on("receive_message", receiveMessageHandler);
    return () => socket.off("receive_message", receiveMessageHandler);
  }, [socket]);

  // 3. Send Message Logic
  const handleSendMessage = (messageText) => {
    if (!socket) return;
    
    const messageData = {
      conversationId: currentChat.id,
      token: token,
      message: messageText,
    };

    // Optimistic UI update
    const myMessage = {
      id: Math.random().toString(),
      author: username,
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessageList((list) => [...list, myMessage]);
    socket.emit("send_message", messageData);
  };

  // If no chat is selected, show a placeholder
  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
          <span className="text-2xl">👋</span>
        </div>
        <h3 className="text-xl font-semibold text-slate-200">Welcome to ChatFlow</h3>
        <p className="text-slate-400 mt-2">Select a conversation to start messaging</p>
      </div>
    );
  }

  // Calculate header name
  const isGroup = currentChat.type === "GROUP";
  const chatName = isGroup ? currentChat.name : currentChat.participants?.find(p => p.user.username !== username)?.user.username;

  return (
    <div className="flex flex-col h-full bg-[#0b141a]"> {/* Slightly darker background specifically for chat area like WhatsApp */}
      
      {/* HEADER */}
      <div className="flex items-center gap-4 p-4 bg-slate-800/90 border-b border-slate-700/50 backdrop-blur-sm z-10">
        <div className="avatar">
          <div className="w-10 rounded-full bg-slate-700">
             <img src={`https://ui-avatars.com/api/?name=${chatName || '?'}&background=${isGroup ? '0D8ABC' : '334155'}&color=fff`} alt="avatar" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">{chatName}</h3>
          <p className="text-xs text-slate-400">{isGroup ? "Group Chat" : "Offline"}</p> {/* We will make "Offline" dynamic later */}
        </div>
      </div>

      {/* MESSAGE THREAD */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messageList.map((msg) => {
          const isMe = msg.author === username;
          return (
            <div key={msg.id} className={`chat ${isMe ? 'chat-end' : 'chat-start'}`}>
              <div className="chat-header text-xs text-slate-400 mb-1 opacity-70">
                {!isMe && <span className="mr-1">{msg.author}</span>}
                <time>{msg.time}</time>
              </div>
              <div className={`chat-bubble ${isMe ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} /> {/* Invisible div for auto-scrolling */}
      </div>

      {/* INPUT BAR */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatContainer;