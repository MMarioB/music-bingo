import { 
    Users,
    Clock,
    Target,
    Calendar,
    Music,
    Mic2
} from 'lucide-react';

import { Number2Icon, Number3Icon, Number4Icon } from './CustomIcons';

export const WHEEL_COLORS = {
    blue: '#BFDBFE',
    purple: '#E9D5FF',
    pink: '#FBCFE8',
    yellow: '#FEF08A',
    green: '#BBF7D0'
};

export const CATEGORIES_A = [
  {
    name: 'Grupo o solista',
    color: `bg-green-200`,
    wheelColor: WHEEL_COLORS.green,
    icon: Users,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '¿Anterior al 2000?',
    color: `bg-pink-200`,
    wheelColor: WHEEL_COLORS.pink,
    icon: Clock,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '4 años arriba o abajo',
    color: `bg-yellow-200`,
    wheelColor: WHEEL_COLORS.yellow,
    icon: Number4Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Década',
    color: `bg-purple-200`,
    wheelColor: WHEEL_COLORS.purple,
    icon: Calendar,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '2 años arriba o abajo',
    color: `bg-blue-200`,
    wheelColor: WHEEL_COLORS.blue,
    icon: Number2Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  }
];

export const CATEGORIES_B = [
  {
    name: 'Título de la canción',
    color: `bg-green-200`,
    wheelColor: WHEEL_COLORS.green,
    icon: Music,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Año exacto',
    color: `bg-pink-200`,
    wheelColor: WHEEL_COLORS.pink,
    icon: Target,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Nombre del grupo o solista',
    color: `bg-yellow-200`,
    wheelColor: WHEEL_COLORS.yellow,
    icon: Mic2,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Década',
    color: `bg-purple-200`,
    wheelColor: WHEEL_COLORS.purple,
    icon: Calendar,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '3 años arriba o abajo',
    color: `bg-blue-200`,
    wheelColor: WHEEL_COLORS.blue,
    icon: Number3Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  }
];

export const BOARD_SIZE = 5;
export const MAX_PER_CATEGORY = 2;
export const MIN_DIFFERENT_CATEGORIES = 3;