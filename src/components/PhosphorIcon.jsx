import {
  CubeIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  GameControllerIcon,
  CalculatorIcon,
  ClockIcon,
  GlobeSimpleIcon,
  HeartIcon,
  LightningIcon,
  MusicNoteIcon,
  PaletteIcon,
  ShoppingCartIcon,
  StarIcon,
  SunIcon,
  TerminalIcon,
  UserIcon,
  WrenchIcon,
  CameraIcon,
  BookOpenIcon,
  ChatCircleIcon,
} from '@phosphor-icons/react';

export const ICON_MAP = {
  Cube: CubeIcon,
  RocketLaunch: RocketLaunchIcon,
  ChartBar: ChartBarIcon,
  GameController: GameControllerIcon,
  Calculator: CalculatorIcon,
  Clock: ClockIcon,
  GlobeSimple: GlobeSimpleIcon,
  Heart: HeartIcon,
  Lightning: LightningIcon,
  MusicNote: MusicNoteIcon,
  Palette: PaletteIcon,
  ShoppingCart: ShoppingCartIcon,
  Star: StarIcon,
  Sun: SunIcon,
  Terminal: TerminalIcon,
  User: UserIcon,
  Wrench: WrenchIcon,
  Camera: CameraIcon,
  BookOpen: BookOpenIcon,
  ChatCircle: ChatCircleIcon,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export default function PhosphorIcon({ name, size = 24, weight = 'regular', className = '' }) {
  const IconComponent = ICON_MAP[name] || CubeIcon;
  return <IconComponent size={size} weight={weight} className={className} />;
}
