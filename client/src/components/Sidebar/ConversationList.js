import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import { Search, Users, UserPlus } from "lucide-react";

function ConversationList({ setCurrentChat }) {
  const { token, username } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [conversations, setConversations] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  
  const [typingChats, setTypingChats] = useState({});

  const fetchConversations = async () => {
    try {
      const response = await fetch("http://localhost:3001/conversations", {
        headers: { Authorization: token },
      });
      const data = await response.json();
      if (response.status === 200) setConversations(data);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (socket && conversations.length > 0) {
      conversations.forEach(chat => socket.emit("join_conversation", chat.id));
    }
  }, [socket, conversations]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data) => {
      if (data && data.conversationId && data.username !== username) {
        setTypingChats(prev => ({ ...prev, [data.conversationId]: data.username }));
      }
    };

    const handleStopTyping = (convId) => {
      if (convId) {
        setTypingChats(prev => {
          const updated = { ...prev };
          delete updated[convId];
          return updated;
        });
      }
    };

    socket.on("display_typing", handleTyping);
    socket.on("clear_typing", handleStopTyping);

    return () => {
      socket.off("display_typing", handleTyping);
      socket.off("clear_typing", handleStopTyping);
    };
  }, [socket, username]);

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!newContact) return;
    try {
      const response = await fetch("http://localhost:3001/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ targetUsername: newContact }),
      });
      const data = await response.json();
      if (response.ok || response.status === 201) {
        setNewContact("");
        fetchConversations();
        setCurrentChat(data); 
      }
    } catch (error) { console.error(error); }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName || !groupMembers) return;
    const usernameArray = groupMembers.split(",").map(name => name.trim());
    try {
      const response = await fetch("http://localhost:3001/conversations/group", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ name: groupName, usernames: usernameArray }),
      });
      if (response.ok || response.status === 201) {
        setIsCreatingGroup(false);
        setGroupName("");
        setGroupMembers("");
        fetchConversations();
      }
    } catch (error) { console.error(error); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40">
    {/* HEADER: Dynamic Search / Group Toggle Bar */}
      <div className="p-4 border-b border-slate-700/50">
        {!isCreatingGroup ? (
          <form onSubmit={handleStartChat} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search username..."
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                // RAW TAILWIND: Rounded-full makes it a sleek pill shape, bypassing DaisyUI boxes
                className="w-full bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-full py-2 pl-11 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>
            {/* MATCHING GROUP BUTTON: Perfectly circular to match the inputs */}
            <button type="button" onClick={() => setIsCreatingGroup(true)} className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-emerald-400 transition-all shadow-sm">
              <Users size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Group</span>
              <button type="button" onClick={() => setIsCreatingGroup(false)} className="text-slate-400 hover:text-red-400 text-xs font-medium transition-colors">Cancel</button>
            </div>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-full py-2 px-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <input
              type="text"
              placeholder="Members (e.g. Parth, Rahul)"
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-full py-2 px-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 border-none text-white rounded-full py-2 font-medium flex items-center justify-center gap-2 shadow-md transition-all">
              <UserPlus size={18} /> Create Group
            </button>
          </form>
        )}
      </div>

      {/* LIST: Conversation Map */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.map((chat) => {
          const isGroup = chat.type === "GROUP";
          const chatName = isGroup ? chat.name : chat.participants?.find(p => p.user.username !== username)?.user.username;
          const headerInitials = chatName?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?";
          
          // Helper to extract 1 or 2 initials from the name (e.g. "Testing Team" -> "TT")
          const initials = chatName?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?";
          
          const typingUser = typingChats[chat.id];

          return (
            <div
              key={chat.id}
              onClick={() => setCurrentChat(chat)}
              // Added "group" class here to trigger hover animations on children
              className="group flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/60 border-b border-slate-800/30 transition-all duration-200"
            >
              
              {/* --- NEW PREMIUM AVATAR --- */}
              <div className={`relative flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-md border-[2px] border-slate-900 transition-transform duration-200 group-hover:scale-105 ${
                isGroup 
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600" 
                  : "bg-gradient-to-br from-emerald-500 to-teal-600"
              }`}>
                <span className="tracking-wide">
                  {initials}
                </span>
              </div>
              {/* --- END PREMIUM AVATAR --- */}

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-200 truncate">{chatName}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {typingUser ? (
                    <span className="text-emerald-400 italic">
                      {isGroup ? `${typingUser} is typing...` : "Typing..."}
                    </span>
                  ) : (
                    isGroup ? "Group Chat" : "Direct Message"
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConversationList;