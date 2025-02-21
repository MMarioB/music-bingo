import { 
  MicrophoneIcon,
  VinylIcon,
  YearRangeIcon,
  DecadeIcon,
  MusicNoteIcon,
  ExactYearIcon,
  HeadphonesIcon
} from './CustomIcons';

// Colores neón para las categorías
export const WHEEL_COLORS = {
  pink: {
    base: '#FF1493',       // DeepPink
    glow: '#FF69B4',       // HotPink
    light: 'rgba(255, 20, 147, 0.2)'
  },
  blue: {
    base: '#00BFFF',       // DeepSkyBlue
    glow: '#87CEFA',       // LightSkyBlue
    light: 'rgba(0, 191, 255, 0.2)'
  },
  green: {
    base: '#00FF7F',       // SpringGreen
    glow: '#98FB98',       // PaleGreen
    light: 'rgba(0, 255, 127, 0.2)'
  },
  purple: {
    base: '#8A2BE2',       // BlueViolet
    glow: '#9370DB',       // MediumPurple
    light: 'rgba(138, 43, 226, 0.2)'
  },
  yellow: {
    base: '#FFD700',       // Gold
    glow: '#FFFF00',       // Yellow
    light: 'rgba(255, 215, 0, 0.2)'
  }
};

// Propiedades de iconos mejoradas para el efecto neón
const DEFAULT_ICON_PROPS = {
  size: 32,
  strokeWidth: 2,
  className: 'text-white',
  style: {
    filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))'
  }
};

export const CATEGORIES_A = [
  {
    name: 'Grupo o solista',
    color: 'bg-green-500/80',          // Color del fondo para el tablero
    wheelColor: WHEEL_COLORS.green.base,// Color base para la ruleta
    neonColor: WHEEL_COLORS.green.glow, // Color del efecto neón
    glowColor: WHEEL_COLORS.green.light,// Color del resplandor
    icon: MicrophoneIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.green.glow
    }
  },
  {
    name: '¿Anterior al 2000?',
    color: 'bg-pink-500/80',
    wheelColor: WHEEL_COLORS.pink.base,
    neonColor: WHEEL_COLORS.pink.glow,
    glowColor: WHEEL_COLORS.pink.light,
    icon: VinylIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.pink.glow
    }
  },
  {
    name: '4 años arriba o abajo',
    color: 'bg-yellow-500/80',
    wheelColor: WHEEL_COLORS.yellow.base,
    neonColor: WHEEL_COLORS.yellow.glow,
    glowColor: WHEEL_COLORS.yellow.light,
    icon: YearRangeIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.yellow.glow
    }
  },
  {
    name: 'Década',
    color: 'bg-purple-500/80',
    wheelColor: WHEEL_COLORS.purple.base,
    neonColor: WHEEL_COLORS.purple.glow,
    glowColor: WHEEL_COLORS.purple.light,
    icon: DecadeIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.purple.glow
    }
  },
  {
    name: '2 años arriba o abajo',
    color: 'bg-blue-500/80',
    wheelColor: WHEEL_COLORS.blue.base,
    neonColor: WHEEL_COLORS.blue.glow,
    glowColor: WHEEL_COLORS.blue.light,
    icon: YearRangeIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.blue.glow
    }
  }
];

export const CATEGORIES_B = [
  {
    name: 'Título de la canción',
    color: 'bg-green-500/80',
    wheelColor: WHEEL_COLORS.green.base,
    neonColor: WHEEL_COLORS.green.glow,
    glowColor: WHEEL_COLORS.green.light,
    icon: MusicNoteIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.green.glow
    }
  },
  {
    name: 'Año exacto',
    color: 'bg-pink-500/80',
    wheelColor: WHEEL_COLORS.pink.base,
    neonColor: WHEEL_COLORS.pink.glow,
    glowColor: WHEEL_COLORS.pink.light,
    icon: ExactYearIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.pink.glow
    }
  },
  {
    name: 'Nombre del grupo o solista',
    color: 'bg-yellow-500/80',
    wheelColor: WHEEL_COLORS.yellow.base,
    neonColor: WHEEL_COLORS.yellow.glow,
    glowColor: WHEEL_COLORS.yellow.light,
    icon: HeadphonesIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.yellow.glow
    }
  },
  {
    name: 'Década',
    color: 'bg-purple-500/80',
    wheelColor: WHEEL_COLORS.purple.base,
    neonColor: WHEEL_COLORS.purple.glow,
    glowColor: WHEEL_COLORS.purple.light,
    icon: DecadeIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.purple.glow
    }
  },
  {
    name: '3 años arriba o abajo',
    color: 'bg-blue-500/80',
    wheelColor: WHEEL_COLORS.blue.base,
    neonColor: WHEEL_COLORS.blue.glow,
    glowColor: WHEEL_COLORS.blue.light,
    icon: YearRangeIcon,
    iconProps: {
      ...DEFAULT_ICON_PROPS,
      color: WHEEL_COLORS.blue.glow
    }
  }
];

export const BOARD_SIZE = 5;
export const MAX_PER_CATEGORY = 2;
export const MIN_DIFFERENT_CATEGORIES = 3;