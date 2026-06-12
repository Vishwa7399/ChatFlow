import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext"; // <-- NEW
import { Search, Users, UserPlus } from "lucide-react";

function ConversationList({ setCurrentChat }) {
  const { token, username } = useContext(AuthContext);
  const { socket } = useContext(SocketContext); // <-- NEW
  
  const [conversations, setConversations] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  
  // NEW: Dictionary to track who is typing in which chat { conversationId: "username" }
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

  // NEW: Join all chat rooms immediately so we hear global typing events
  useEffect(() => {
    if (socket && conversations.length > 0) {
      conversations.forEach(chat => socket.emit("join_conversation", chat.id));
    }
  }, [socket, conversations]);

  // NEW: Listen for global typing events
  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data) => {
      // STRICT FILTER: Ensure we have a valid ID before tracking it in the dictionary
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
          <form onSubmit={handleStartChat} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search username..."
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="input input-sm w-full pl-9 bg-slate-800/80 border-slate-700/50 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button type="button" onClick={() => setIsCreatingGroup(true)} className="btn btn-sm btn-square bg-slate-700/50 hover:bg-slate-600 border-none text-slate-300 transition-colors">
              <Users size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Group</span>
              <button type="button" onClick={() => setIsCreatingGroup(false)} className="text-slate-400 hover:text-red-400 text-xs font-medium transition-colors">Cancel</button>
            </div>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-sm w-full bg-slate-800/80 border-slate-700/50 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Members (e.g. Parth, Rahul)"
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
              className="input input-sm w-full bg-slate-800/80 border-slate-700/50 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="btn btn-sm bg-emerald-600 hover:bg-emerald-500 border-none text-white w-full flex items-center gap-2">
              <UserPlus size={16} /> Create Group
            </button>
          </form>
        )}
      </div>

      {/* LIST: Conversation Map */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.map((chat) => {
          const isGroup = chat.type === "GROUP";
          const chatName = isGroup ? chat.name : chat.participants?.find(p => p.user.username !== username)?.user.username;
          
          // Check if someone is currently typing in this specific chat
          const typingUser = typingChats[chat.id];

          return (
            <div
              key={chat.id}
              onClick={() => setCurrentChat(chat)}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/60 border-b border-slate-800/30 transition-all duration-200"
            >
              <div className="avatar">
                <div className="w-11 rounded-full ring-1 ring-slate-700 ring-offset-base-100 ring-offset-2">
                   <img src={`https://ui-avatars.com/api/?name=${chatName || '?'}&background=${isGroup ? '0D8ABC' : '334155'}&color=fff`} alt="avatar" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-200 truncate">{chatName}</h4>
                
                {/* NEW: Display Typing... or the default chat type */}
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