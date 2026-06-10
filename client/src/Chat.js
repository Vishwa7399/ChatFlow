import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    
    // Set to true so it immediately shows the spinner when the component loads
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const sendMessage = async () => {
        if (currentMessage !== "") {
            const messageData = {
                room: room,
                author: username,
                message: currentMessage,
                time:
                    new Date(Date.now()).getHours() +
                    ":" +
                    new Date(Date.now()).getMinutes(),
            };
            await socket.emit("send_message", messageData);
            setMessageList((list) => [...list, messageData]);
            setCurrentMessage("");
        }
    };

    useEffect(() => {
        const receiveHandler = (data) => {
            setMessageList((list) => [...list, data]);
        };

        socket.on("receive_message", receiveHandler);
        socket.on("receive_history", (formattedHistory) => {
            setMessageList(formattedHistory);
            setIsLoadingHistory(false); // Turn off the spinner!
        });

        return () => {
            socket.off("receive_message", receiveHandler);
        };
    }, [socket]);

    return (
        <div className="chat-window">
            <div className="chat-header">
                <p>Live Chat</p>
            </div>
            <div className="chat-body">
                {/* Conditional Rendering: Show spinner OR show the messages */}
                {isLoadingHistory ? (
                    <div className="loading-spinner-container">
                        <div className="spinner"></div>
                        <p>Fetching history...</p>
                    </div>
                ) : (
                    <ScrollToBottom className="message-container">
                        {messageList.map((messageContent, index) => {
                            return (
                                <div
                                    key={index}
                                    className="message"
                                    id={username === messageContent.author ? "you" : "other"}
                                >
                                    <div>
                                        <div className="message-content">
                                            <p>{messageContent.message}</p>
                                        </div>
                                        <div className="message-meta">
                                            <p id="time">{messageContent.time}</p>
                                            <p id="author">{messageContent.author}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </ScrollToBottom>
                )}
            </div>
            <div className="chat-footer">
                <input
                    type="text"
                    value={currentMessage}
                    placeholder="Message"
                    onChange={(event) => {
                        setCurrentMessage(event.target.value);
                    }}
                    onKeyPress={(event) => {
                        event.key === "Enter" && sendMessage();
                    }}
                />
                <button onClick={sendMessage}>&#9658;</button>
            </div>
        </div>
    );
}

export default Chat;