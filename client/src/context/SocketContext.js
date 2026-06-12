  import React, { createContext, useContext, useEffect, useState } from "react";
  import { io } from "socket.io-client";
  import { AuthContext } from "./AuthContext";

  export const SocketContext = createContext();

  export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    
    // We only need the token!
    const { token } = useContext(AuthContext);

    useEffect(() => {
      if (token) {
        try {
          // Native JS to crack open the JWT and grab the database ID securely
          const payload = JSON.parse(atob(token.split('.')[1]));
          const extractedUserId = payload.id;

          if (extractedUserId) {
            const newSocket = io("http://localhost:3001", {
              query: { userId: extractedUserId }
            });

            setSocket(newSocket);
            return () => newSocket.close();
          }
        } catch (error) {
          console.error("Failed to decode token for socket:", error);
        }
      } else {
        if (socket) {
          socket.close();
          setSocket(null);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
      <SocketContext.Provider value={{ socket }}>
        {children}
      </SocketContext.Provider>
    );
  };