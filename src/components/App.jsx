import { useState } from "react";
import RoleSelection from "./RoleSelection";
import MusicBingoGame from "./PlayerView/MusicBingoGame";
import GameMaster from "./GameMasterView/GameMaster";

function App() {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  if (!selectedRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <RoleSelection onSelectRole={handleRoleSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {selectedRole === 'master' ? (
            <GameMaster />
          ) : (
            <MusicBingoGame />
          )}
        </div>
      </div>
      
      <button
        onClick={() => setSelectedRole(null)}
        className="fixed bottom-6 right-6 bg-white text-indigo-500 rounded-full p-3 shadow-lg hover:bg-indigo-500 hover:text-white transition-colors duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
    </div>
  );
}

export default App;