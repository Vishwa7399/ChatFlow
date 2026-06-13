import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import MessageInput from "./MessageInput";

function ChatContainer({ currentChat, onlineUsers }) {
  const { username, token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- 1. HOOKS: Move these ABOVE any early return ---
  const isGroup = currentChat?.type === "GROUP";
  const chatPartner = currentChat?.participants?.find(p => p.user.username !== username)?.user;
  const chatName = isGroup ? currentChat?.name : chatPartner?.username;
  const headerInitials = chatName?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?";

  const isOnline = React.useMemo(() => {
    if (!currentChat || isGroup || !onlineUsers || !chatPartner) return false;
    const partnerIdStr = String(chatPartner.id);
    const partnerNameStr = String(chatPartner.username);
    return onlineUsers.some(id => String(id) === partnerIdStr || String(id) === partnerNameStr);
  }, [onlineUsers, chatPartner, isGroup, currentChat]);

  // --- 2. EXISTING LOGIC ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList, isTyping]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`https://chatflow-backend-bvvt.onrender.com/conversations/${currentChat.id}/messages`, {
          headers: { Authorization: token },
        });
        const data = await response.json();
        if (response.ok) setMessageList(data);
      } catch (error) { console.error("History fetch error:", error); }
    };

    if (currentChat) {
      fetchHistory();
      setIsTyping(false);
    }

    if (socket && currentChat) {
      socket.emit("join_conversation", currentChat.id);
    }
  }, [socket, currentChat, token]);

  useEffect(() => {
    if (!socket) return;
    const receiveMessageHandler = (data) => {
      if (data && data.conversationId === currentChat?.id) {
        setMessageList((list) => [...list, data]);
        setIsTyping(false);
      }
    };
    const displayTypingHandler = (data) => {
      if (data && data.conversationId === currentChat?.id) {
        setIsTyping(true);
        setTypingUser(data.username);
      }
    };
    const clearTypingHandler = (convId) => {
      if (convId === currentChat?.id) {
        setIsTyping(false);
        setTypingUser("");
      }
    };

    socket.on("receive_message", receiveMessageHandler);
    socket.on("display_typing", displayTypingHandler);
    socket.on("clear_typing", clearTypingHandler);

    return () => {
      socket.off("receive_message", receiveMessageHandler);
      socket.off("display_typing", displayTypingHandler);
      socket.off("clear_typing", clearTypingHandler);
    };
  }, [socket, currentChat]);

  const handleTyping = () => {
    if (socket && currentChat) {
      socket.emit("typing", { conversationId: currentChat.id, username });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", currentChat.id);
      }, 2000);
    }
  };

  const handleSendMessage = (messageText) => {
    if (!socket) return;
    const messageData = { conversationId: currentChat.id, token: token, message: messageText };
    const myMessage = {
      id: Math.random().toString(), author: username, text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessageList((list) => [...list, myMessage]);
    socket.emit("send_message", messageData);
    socket.emit("stop_typing", currentChat.id);
  };

  // --- 3. EARLY RETURN ---
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

return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      
      {/* --- NEW HEADER START --- */}
      <div className="flex items-center gap-4 p-4 bg-slate-800/90 border-b border-slate-700/50 backdrop-blur-sm z-10">
        
        {/* PREMIUM GRADIENT HEADER AVATAR */}
        <div className={`relative flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shadow-md border-[2px] border-slate-800 transition-all ${
          isGroup ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"
        } ${isOnline && !isGroup ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-800' : ''}`}>
          {headerInitials}
        </div>

        <div>
          <h3 className="font-semibold text-slate-200">{chatName}</h3>
          <p className={`text-xs ${isOnline && !isGroup ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
            {isGroup ? "Group Chat" : (isOnline ? "Online" : "Offline")}
          </p>
        </div>
      </div>
      {/* --- NEW HEADER END --- */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messageList.map((msg) => {
          const isMe = msg.author === username;
          return (
            <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-slate-400 mb-1 opacity-70 px-1">
                {!isMe && <span className="mr-1">{msg.author}</span>}
                <time>{msg.time}</time>
              </div>
              <div className={`px-4 py-2 rounded-2xl w-fit max-w-[75%] break-words shadow-sm ${
                isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {isTyping && typingUser !== username && (
          <div className="chat chat-start">
            <div className="chat-bubble bg-slate-800 text-emerald-400 text-sm italic animate-pulse">
              {isGroup ? `${typingUser} is typing...` : "Typing..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
}

export default ChatContainer;