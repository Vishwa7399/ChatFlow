import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext"; // <-- NEW IMPORT
import ProfileHeader from "../components/Sidebar/ProfileHeader"; 
import ConversationList from "../components/Sidebar/ConversationList";
import ChatContainer from "../components/ChatArea/ChatContainer";

function Dashboard() {
  const { logoutAccount } = useContext(AuthContext);
  const { socket } = useContext(SocketContext); // <-- NEW: Grab the socket
  
  const [currentChat, setCurrentChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]); // <-- NEW: Global online tracking

  // NEW: Listen to the backend's broadcast of online users
  useEffect(() => {
    if (!socket) return;

    // Note: Verify that "getOnlineUsers" exactly matches the event name your backend emits!
    socket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => socket.off("getOnlineUsers");
  }, [socket]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* LEFT PANE */}
      <div className="w-80 flex flex-col border-r border-slate-700/50 bg-slate-800/30">
        <ProfileHeader /> 
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ConversationList setCurrentChat={setCurrentChat} onlineUsers={onlineUsers} />
        </div>
      </div>
      
      {/* RIGHT PANE */}
      <div className="flex-1 flex flex-col bg-slate-900/50">
        {/* Pass the array down to the chat container */}
        <ChatContainer currentChat={currentChat} onlineUsers={onlineUsers} /> 
      </div>

    </div>
  );
}

export default Dashboard;