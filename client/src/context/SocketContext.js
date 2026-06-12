import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { AuthContext } from "./AuthContext"; // We need the auth state!

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, token } = useContext(AuthContext);

  useEffect(() => {
    // 1. Only attempt to connect if the user is fully logged in
    if (isAuthenticated && token) {

      // 2. Open the WebSocket, and pass the VIP Wristband right at the door
      const newSocket = io("http://localhost:3001", {
        auth: { token: token }
      });

      setSocket(newSocket);

      // 3. Cleanup: If they log out or close the app, sever the connection
      return () => newSocket.close();
    }
  }, [isAuthenticated, token]); // Re-run this check if their auth status changes

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};