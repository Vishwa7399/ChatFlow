import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import MessageInput from "./MessageInput";

function ChatContainer({  currentChat, onlineUsers  }) {
  const { username, token } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList, isTyping]); // Scroll when a message arrives OR someone starts typing

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

    if (currentChat) {
      // DECOUPLED: Fetch history immediately, even if the socket is lagging or dead
      fetchHistory();
      setIsTyping(false); 
    }

    if (socket && currentChat) {
      // Join the socket room independently
      socket.emit("join_conversation", currentChat.id);
    }
  }, [socket, currentChat, token]);

  // 2. Listen for Incoming Events (Messages & Typing)
  useEffect(() => {
    if (!socket) return;
    
    const receiveMessageHandler = (data) => {
      if (data && data.conversationId === currentChat.id) {
        setMessageList((list) => [...list, data]);
        setIsTyping(false); 
      }
    };
    
    const displayTypingHandler = (data) => {
      // STRICT FILTER: Only trigger if the event's ID matches the open window's ID
      if (data && data.conversationId === currentChat.id) {
        setIsTyping(true);
        setTypingUser(data.username);
      }
    };
    
    const clearTypingHandler = (convId) => {
      if (convId === currentChat.id) {
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
  }, [socket, currentChat]); // Added currentChat as dependency

  // 3. Handle Local Typing (Debounce Logic)
  const handleTyping = () => {
    if (socket && currentChat) {
      socket.emit("typing", { conversationId: currentChat.id, username });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", currentChat.id);
      }, 2000);
    }
  };

  // 4. Send Message Logic
  const handleSendMessage = (messageText) => {
    if (!socket) return;
    
    const messageData = { conversationId: currentChat.id, token: token, message: messageText };
    const myMessage = {
      id: Math.random().toString(), author: username, text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessageList((list) => [...list, myMessage]);
    socket.emit("send_message", messageData);
    socket.emit("stop_typing", currentChat.id); // Stop local typing indicator instantly
  };

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

// --- 1. THE CALCULATION LOGIC ---
  const isGroup = currentChat.type === "GROUP";
  const chatPartner = currentChat.participants?.find(p => p.user.username !== username)?.user;
  const chatName = isGroup ? currentChat.name : chatPartner?.username;

  // STRICT TYPE-SAFE FIX: Convert both the Socket array IDs and the Database IDs to strings
  // This guarantees that PostgreSQL Integer '1' successfully matches Socket String '"1"'
  const isOnline = !isGroup && Array.isArray(onlineUsers) && onlineUsers.some(onlineId => {
    const socketIdStr = String(onlineId);
    return socketIdStr === String(chatPartner?.id) || socketIdStr === String(chatPartner?.username);
  });

  // (Optional) Keep this log if you still need it to verify the data types
  // console.log("DEBUG ONLINE STATUS:", { liveArrayFromSocket: onlineUsers, partnerId: chatPartner?.id, isOnline });

  // 🕵️ SENIOR DIAGNOSTIC LOG: This will expose exactly what is misfiring
  console.log("DEBUG ONLINE STATUS:", {
    liveArrayFromSocket: onlineUsers,
    partnerId: chatPartner?.id,
    partnerMongoId: chatPartner?._id,
    calculatedResult: isOnline
  });
  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      
      {/* --- 2. THE DYNAMIC HEADER --- */}
      <div className="flex items-center gap-4 p-4 bg-slate-800/90 border-b border-slate-700/50 backdrop-blur-sm z-10">
        <div className="avatar">
          {/* Dynamic Green Ring */}
          <div className={`w-10 rounded-full bg-slate-700 ${isOnline ? 'ring ring-emerald-500 ring-offset-slate-800 ring-offset-2' : ''}`}>
             <img src={`https://ui-avatars.com/api/?name=${chatName || '?'}&background=${isGroup ? '0D8ABC' : '334155'}&color=fff`} alt="avatar" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">{chatName}</h3>
          {/* Dynamic Green Text */}
          <p className={`text-xs ${isOnline ? "text-emerald-400 font-medium" : "text-slate-400"}`}>
            {isGroup ? "Group Chat" : (isOnline ? "Online" : "Offline")}
          </p>
        </div>
      </div>
      
      {/* MESSAGE THREAD */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messageList.map((msg) => {
          const isMe = msg.author === username;
     return (
            // RAW TAILWIND FIX: Forces items to align left or right without stretching
            <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
              
              <div className="text-xs text-slate-400 mb-1 opacity-70 px-1">
                {!isMe && <span className="mr-1">{msg.author}</span>}
                <time>{msg.time}</time>
              </div>
              
              {/* WhatsApp Style Bubbles: w-fit stops it from stretching, max-w limits width on long texts */}
              <div className={`px-4 py-2 rounded-2xl w-fit max-w-[75%] break-words shadow-sm ${
                isMe 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-slate-700 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>

            </div>
          );
        })}
        
       {/* Modern Tailwind Typing Indicator */}
        {isTyping && typingUser !== username && (
          <div className="chat chat-start">
            <div className="chat-bubble bg-slate-800 text-emerald-400 text-sm italic animate-pulse">
              {isGroup ? `${typingUser} is typing...` : "Typing..."}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
}

export default ChatContainer;