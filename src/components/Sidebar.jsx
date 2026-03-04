import { useState } from 'react';
import {
  PaintBrushIcon,
  AppWindowIcon,
  GearIcon,
  SidebarIcon,
  SidebarSimpleIcon,
} from '@phosphor-icons/react';
import logo from '../assets/app-icon.svg';

const NAV_ITEMS = [
  { id: 'canvas', label: 'Canvas', Icon: PaintBrushIcon },
  { id: 'myapps', label: 'My Apps', Icon: AppWindowIcon },
  { id: 'settings', label: 'Settings', Icon: GearIcon },
];

export default function Sidebar({ currentPage, onNavigate }) {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isExpanded = isPinnedOpen;

  return (
    <aside
      className={`h-full bg-bg-secondary border-r border-border flex flex-col items-start flex-shrink-0 transition-all duration-200 overflow-hidden ${
        isExpanded ? 'w-[200px]' : 'w-16'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 w-full">
        <img
          src={logo}
          alt="Cyborg"
          width={28}
          height={28}
          className="brightness-0 invert flex-shrink-0"
        />
        {isExpanded && (
          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
            Cyborg
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col w-full gap-1 px-2 pt-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-3 w-full rounded-sm transition-colors ${
                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-bg-tertiary text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
            >
              <Icon
                size={22}
                weight={isActive ? 'fill' : 'regular'}
                className="flex-shrink-0"
              />
              {isExpanded && (
                <span className="text-sm whitespace-nowrap">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle: expand / collapse */}
      <div className="mt-auto w-full px-2 py-2">
        <button
          type="button"
          onClick={() => setIsPinnedOpen((prev) => !prev)}
          className={`flex items-center gap-3 w-full rounded-sm transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 ${
            isExpanded ? 'px-3 py-2.5 justify-end' : 'px-0 py-2.5 justify-center'
          }`}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <SidebarSimpleIcon size={22} className="flex-shrink-0" />
          ) : (
            <SidebarIcon size={22} className="flex-shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
