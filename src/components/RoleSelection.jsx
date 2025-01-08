import { Button } from './ui/button';
import PropTypes from 'prop-types';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">Music Bingo</h1>
      <div className="space-y-4 w-full max-w-xs">
        <Button 
          className="w-full py-8 text-lg"
          onClick={() => onSelectRole('master')}
        >
          Game Master
        </Button>
        <Button 
          className="w-full py-8 text-lg"
          variant="outline"
          onClick={() => onSelectRole('player')}
        >
          Jugador
        </Button>
      </div>
    </div>
  );
};

// Añade la validación de props
RoleSelection.propTypes = {
  onSelectRole: PropTypes.func.isRequired
};

export default RoleSelection;