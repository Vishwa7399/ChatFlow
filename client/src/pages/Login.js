import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { MessageSquare, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";

function Login() {
  const { loginAccount, registerAccount } = useContext(AuthContext);
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // 1. STATE: Track the confirmation password
  const [confirmPassword, setConfirmPassword] = useState(""); 
  
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    
    // Check for empty fields based on which mode we are in
    if (!username || !password || (!isLogin && !confirmPassword)) {
      return setFeedback({ type: "error", message: "All fields are required." });
    }

    // Prevent registration if passwords mismatch
    if (!isLogin && password !== confirmPassword) {
      return setFeedback({ type: "error", message: "Passwords do not match." });
    }

    setIsLoading(true);
    let result;

    if (isLogin) {
      result = await loginAccount(username, password);
      if (!result.success) setFeedback({ type: "error", message: result.error });
    } else {
      // --- THE CLEANUP ---
      // We no longer generate keys here! We just pass the raw credentials 
      // to the AuthContext, and let the Context handle the AES Vault logic.
      result = await registerAccount(username, password);

      if (result.success) {
        setFeedback({ type: "success", message: "Account created! Please log in." });
        setIsLogin(true);
        setPassword(""); 
        setConfirmPassword(""); 
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 transition-all duration-300">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
            <MessageSquare className="text-emerald-500" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">ChatFlow</h1>
          <p className="text-slate-400 mt-2 text-sm text-center">
            {isLogin ? "Welcome back to the conversation." : "Join the next generation of messaging."}
          </p>
        </div>

        {feedback.message && (
          <div className={`p-3 mb-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            feedback.type === "error" 
              ? "bg-red-500/10 text-red-400 border border-red-500/20" 
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            {feedback.type === "success" && <CheckCircle2 size={16} />}
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* UI: Only renders if 'isLogin' is false */}
          {!isLogin && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-slate-400 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFeedback({ type: "", message: "" });
              setConfirmPassword(""); // Reset confirmation field on toggle
            }}
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            {isLogin ? "Register now" : "Sign in here"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;