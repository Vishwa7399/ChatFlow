import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, Settings } from 'lucide-react';

function ProfileHeader() {
  const { username, logoutAccount } = useContext(AuthContext);

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700/50">
      
      {/* Left Side: Avatar and User Info */}
      <div className="flex items-center gap-3">
        
        {/* YOUR OWN PROFILE AVATAR (Top Left) */}
        <div className="relative flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shadow-md border-[2px] border-slate-800 bg-gradient-to-br from-emerald-500 to-teal-600">
          {username ? username.substring(0, 2).toUpperCase() : "ME"}
          {/* Custom Online Dot */}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-[1.5px] border-slate-800 shadow-sm"></span>
        </div>
        
        <div>
          <h3 className="font-semibold text-slate-200">{username}</h3>
          <p className="text-xs text-emerald-400 font-medium">Online</p>
        </div>
      </div>

      {/* Right Side: Action Buttons */}
      <div className="flex gap-2">
        <button className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:text-slate-200 transition-colors" title="Settings">
          <Settings size={18} />
        </button>
        
        <button 
          onClick={logoutAccount}
          className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:text-red-400 transition-colors"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>
      </div>

    </div>
  );
}

export default ProfileHeader;