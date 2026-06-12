import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, Settings } from 'lucide-react';

function ProfileHeader() {
  const { username, logoutAccount } = useContext(AuthContext);

  return (
    // The Container: Glass-morphic dark background with a subtle bottom border
    <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700/50">
      
      {/* Left Side: Avatar and User Info */}
      <div className="flex items-center gap-3">
        
        {/* DaisyUI Avatar Component with an 'online' status dot */}
        <div className="avatar online">
          <div className="w-10 rounded-full bg-slate-600">
            {/* Using a free API to dynamically generate a cool avatar from your username! */}
            <img 
              src={`https://ui-avatars.com/api/?name=${username}&background=0D8ABC&color=fff`} 
              alt="User Avatar" 
            />
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-slate-200">{username}</h3>
          <p className="text-xs text-emerald-400">Online</p>
        </div>
      </div>

      {/* Right Side: Action Buttons */}
      <div className="flex gap-2">
        <button className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:text-slate-200" title="Settings">
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