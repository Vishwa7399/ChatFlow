import React, { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  // 1. We reach up into the "Cloud" to grab our authentication status
  const { isAuthenticated } = useContext(AuthContext);

  // 2. The Traffic Cop logic: If authenticated, show Dashboard. Otherwise, show Login.
  return (
    <div className="App">
      {isAuthenticated ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;