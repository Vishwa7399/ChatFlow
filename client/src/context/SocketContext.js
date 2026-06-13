import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  
  // Grab BOTH the token and the username from AuthContext
  const { token, username } = useContext(AuthContext);

  useEffect(() => {
    // Only connect if the user is fully authenticated
    if (token && username) {
      
      // We pass the explicit USERNAME to the backend instead of the Database ID
      const newSocket = io("https://chatflow-backend-bvvt.onrender.com", {
        query: { userId: username } 
      });

      setSocket(newSocket);
      return () => newSocket.close();
      
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, username]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};