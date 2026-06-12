import React, { useState } from "react";
import { Send, Image as ImageIcon } from "lucide-react";

function MessageInput({ onSendMessage }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() === "") return;
    onSendMessage(text);
    setText("");
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-4 bg-slate-900 border-t border-slate-700/50 flex gap-2 items-center"
    >
      <button 
        type="button" 
        className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:text-slate-200"
        title="Attach Image (Coming Soon)"
      >
        <ImageIcon size={20} />
      </button>
      
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="input w-full bg-slate-800/80 border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 rounded-full px-4"
      />
      
      <button 
        type="submit" 
        disabled={!text.trim()}
        className="btn btn-circle bg-emerald-600 hover:bg-emerald-500 border-none text-white disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
      >
        <Send size={18} className={text.trim() ? "translate-x-0.5" : ""} />
      </button>
    </form>
  );
}

export default MessageInput;