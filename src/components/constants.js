import { 
  MicrophoneIcon,
  VinylIcon,
  YearRangeIcon,
  DecadeIcon,
  MusicNoteIcon,
  ExactYearIcon,
  HeadphonesIcon
} from './CustomIcons';

export const WHEEL_COLORS = {
    blue: '#BFDBFE',
    purple: '#E9D5FF',
    pink: '#FBCFE8',
    yellow: '#FEF08A',
    green: '#BBF7D0'
};

const DEFAULT_ICON_PROPS = {
  size: 24,
  className: 'text-gray-700',
  style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
};

export const CATEGORIES_A = [
  {
    name: 'Grupo o solista',
    color: 'bg-green-200',
    wheelColor: WHEEL_COLORS.green,
    icon: MicrophoneIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: '¿Anterior al 2000?',
    color: 'bg-pink-200',
    wheelColor: WHEEL_COLORS.pink,
    icon: VinylIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: '4 años arriba o abajo',
    color: 'bg-yellow-200',
    wheelColor: WHEEL_COLORS.yellow,
    icon: YearRangeIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: 'Década',
    color: 'bg-purple-200',
    wheelColor: WHEEL_COLORS.purple,
    icon: DecadeIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: '2 años arriba o abajo',
    color: 'bg-blue-200',
    wheelColor: WHEEL_COLORS.blue,
    icon: YearRangeIcon,
    iconProps: DEFAULT_ICON_PROPS
  }
];

export const CATEGORIES_B = [
  {
    name: 'Título de la canción',
    color: 'bg-green-200',
    wheelColor: WHEEL_COLORS.green,
    icon: MusicNoteIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: 'Año exacto',
    color: 'bg-pink-200',
    wheelColor: WHEEL_COLORS.pink,
    icon: ExactYearIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: 'Nombre del grupo o solista',
    color: 'bg-yellow-200',
    wheelColor: WHEEL_COLORS.yellow,
    icon: HeadphonesIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: 'Década',
    color: 'bg-purple-200',
    wheelColor: WHEEL_COLORS.purple,
    icon: DecadeIcon,
    iconProps: DEFAULT_ICON_PROPS
  },
  {
    name: '3 años arriba o abajo',
    color: 'bg-blue-200',
    wheelColor: WHEEL_COLORS.blue,
    icon: YearRangeIcon,
    iconProps: DEFAULT_ICON_PROPS
  }
];

export const BOARD_SIZE = 5;
export const MAX_PER_CATEGORY = 2;
export const MIN_DIFFERENT_CATEGORIES = 3;