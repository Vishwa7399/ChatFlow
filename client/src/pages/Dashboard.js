import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import ProfileHeader from "../components/Sidebar/ProfileHeader"; 
import ConversationList from "../components/Sidebar/ConversationList";
import ChatContainer from "../components/ChatArea/ChatContainer"; // <-- NEW IMPORT

function Dashboard() {
  const { logoutAccount } = useContext(AuthContext);
  const [currentChat, setCurrentChat] = useState(null);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* LEFT PANE */}
      <div className="w-80 flex flex-col border-r border-slate-700/50 bg-slate-800/30">
        <ProfileHeader /> 
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ConversationList setCurrentChat={setCurrentChat} />
        </div>
      </div>
      
      {/* RIGHT PANE */}
      <div className="flex-1 flex flex-col bg-slate-900/50">
        <ChatContainer currentChat={currentChat} /> {/* <-- WIRED UP */}
      </div>

    </div>
  );
}

export default Dashboard;