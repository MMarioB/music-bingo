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
    return <RoleSelection onSelectRole={handleRoleSelect} />;
  }

  return (
    <div>
      {selectedRole === 'master' ? (
        <GameMaster />
      ) : (
        <MusicBingoGame />
      )}
      
      <button 
        onClick={() => setSelectedRole(null)}
        className="fixed bottom-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
      >
        ↩️
      </button>
    </div>
  );
}

export default App;