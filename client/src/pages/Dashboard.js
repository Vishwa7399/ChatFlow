import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

function Dashboard() {
  const { logoutAccount } = useContext(AuthContext);
  
  // Here is the state you correctly identified!
  const [currentChat, setCurrentChat] = useState(null);

  return (
    <div className="dashboard-container">
      {/* LEFT PANE */}
      <Sidebar setCurrentChat={setCurrentChat} />
      
      {/* RIGHT PANE */}
      <div className="main-content">
        <button onClick={logoutAccount} className="dashboard-logout-btn">Log Out</button>
        <ChatWindow currentChat={currentChat} />
      </div>
    </div>
  );
}

export default Dashboard;