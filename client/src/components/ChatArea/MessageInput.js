import React, { useState } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';

function MessageInput({ onSendMessage, onTyping }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    // Padding at the bottom lifts it off the edge of the screen
    <div className="p-4 bg-transparent pb-6">
      
      {/* The Floating Pill Design */}
      <form 
        onSubmit={handleSubmit} 
        className="flex items-center gap-3 bg-slate-800 border border-slate-700/80 rounded-full pl-5 pr-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-lg shadow-black/10"
      >
        <button type="button" className="text-slate-400 hover:text-emerald-400 transition-colors">
          <ImageIcon size={20} />
        </button>
        
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping(); }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none py-2 text-[15px]"
        />
        
        <button 
          type="submit" 
          disabled={!text.trim()} 
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700/50 disabled:text-slate-500 text-white rounded-full p-2.5 transition-all flex items-center justify-center cursor-pointer"
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </form>

    </div>
  );
}

export default MessageInput;