import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function Sidebar({ setCurrentChat }) {
    const { token, username } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [newContact, setNewContact] = useState("");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupMembers, setGroupMembers] = useState(""); // We will use a simple comma-separated string!

    // 1. Fetch all my chats from the secure backend
    const fetchConversations = async () => {
        try {
            const response = await fetch("http://localhost:3000/conversations", {
                headers: { Authorization: token },
            });
            const data = await response.json();

            if (response.status === 200) {
                setConversations(data);
                return data; // <-- NEW: Return the fresh data!
            }
        } catch (error) {
            console.error("Failed to fetch chats", error);
            return [];
        }
    };

    // Run the fetch the moment the component loads
    useEffect(() => {
        if (token) fetchConversations();
    }, [token]);

    // 2. Start (or auto-open) a chat
    // 2. Start (or auto-open) a chat
    const handleStartChat = async () => {
        if (newContact === "") return;
        try {
            console.log("--- STARTING CHAT TRACE ---");

            const response = await fetch("http://localhost:3000/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                },
                body: JSON.stringify({ targetUsername: newContact }),
            });
            const apiData = await response.json();
            console.log("1. API Response Data:", apiData);

            if (response.status === 201 || response.status === 200) {
                setNewContact("");

                // Fetch the fresh list
                const updatedChats = await fetchConversations();
                console.log("2. Fetched Updated Chats:", updatedChats);

                // Find the exact chat
                const openedChat = updatedChats?.find(chat => chat.id === apiData.id);
                console.log("3. Found Match to Open:", openedChat);

                if (openedChat) {
                    setCurrentChat(openedChat);
                    console.log("4. SUCCESS: State updated!");
                } else {
                    console.error("ERROR: Could not find the matching ID in the list.");
                }

            } else {
                alert("Could not start chat: " + apiData.error);
            }
        } catch (error) {
            console.error("CRITICAL ERROR in handleStartChat:", error);
        }
    };

    // 3. Create a Group Chat
    const handleCreateGroup = async () => {
        if (groupName === "" || groupMembers === "") return;

        // Clean up the string: "Parth, Rahul , Neha" -> ["Parth", "Rahul", "Neha"]
        const usernameArray = groupMembers.split(",").map(name => name.trim());

        try {
            const response = await fetch("http://localhost:3000/conversations/group", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                },
                body: JSON.stringify({ name: groupName, usernames: usernameArray }),
            });
            const data = await response.json();

            if (response.status === 201) {
                setIsCreatingGroup(false); // Close the form
                setGroupName("");
                setGroupMembers("");
                fetchConversations(); // Refresh the list to see our new group!
            } else {
                alert("Could not create group: " + data.error);
            }
        } catch (error) {
            console.error("Failed to create group", error);
        }
    };

    // 3. Helper function to figure out the friend's name
    const getChatName = (chat) => {
        if (chat.type === "GROUP") return chat.name;
        // For private chats, find the participant who is NOT me
        if (!chat.participants) return "Loading...";
        const friend = chat.participants.find(p => p.user.username !== username);
        return friend ? friend.user.username : "Unknown User";
    };

    return (
        <div className="sidebar">
            {/* New Contact Input Area */}
            {/* Dynamic Header: Toggles between Private Chat Search and Group Creation */}
            <div className="sidebar-search">
                {!isCreatingGroup ? (
                    <div className="search-row">
                        <input
                            type="text"
                            placeholder="Enter username..."
                            value={newContact}
                            onChange={(e) => setNewContact(e.target.value)}
                        />
                        <button onClick={handleStartChat}>Chat</button>
                        <button className="group-toggle-btn" onClick={() => setIsCreatingGroup(true)} title="Create Group">
                            +
                        </button>
                    </div>
                ) : (
                    <div className="group-form">
                        <h4>Create Group</h4>
                        <input
                            type="text"
                            placeholder="Group Name (e.g., Project Team)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Members (e.g., Parth, Rahul)"
                            value={groupMembers}
                            onChange={(e) => setGroupMembers(e.target.value)}
                        />
                        <div className="group-form-buttons">
                            <button className="confirm-btn" onClick={handleCreateGroup}>Create</button>
                            <button className="cancel-btn" onClick={() => setIsCreatingGroup(false)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>

            <h3>Your Chats</h3>

            {/* Dynamic Chat List */}
            <div className="chat-list">
                {conversations.map((chat) => (
                    <div
                        key={chat.id}
                        className="placeholder-chat"
                        onClick={() => setCurrentChat(chat)} // We are passing the WHOLE object now!
                    >
                        <p><strong>{getChatName(chat)}</strong></p>
                    </div>
                ))}
                {conversations.length === 0 && (
                    <p style={{ padding: '20px', color: '#54656f', fontSize: '14px', textAlign: 'center' }}>
                        No chats yet. Add a friend above!
                    </p>
                )}
            </div>
        </div>
    );
}

export default Sidebar;