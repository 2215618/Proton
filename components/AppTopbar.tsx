'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TopbarVariant = 'default' | 'compact';

type AppTopbarProps = {
  /** Main title on the left (e.g. "Dashboard", "Reportes") */
  title: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Material icon name for the left badge */
  icon?: string;

  /** Visual variant (same layout, slightly tighter spacing) */
  variant?: TopbarVariant;

  /** Show an inline search box (UI only unless you wire value/onChange) */
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  /** Show notification button (UI only) */
  showNotifications?: boolean;
  onNotificationsClick?: () => void;

  /** Primary actions */
  showRefresh?: boolean;
  onRefresh?: () => void;
  refreshLabel?: string;

  showNew?: boolean;
  onNew?: () => void;
  newLabel?: string;

  /** Optional slot on the right (e.g. extra buttons/filters) */
  rightSlot?: React.ReactNode;

  /** Optional slot under header (e.g. chips/filters). Keeps layout stable. */
  belowSlot?: React.ReactNode;

  /** Stick to top */
  sticky?: boolean;
  className?: string;
};

export default function AppTopbar({
  title,
  subtitle,
  icon = 'dashboard',
  variant = 'default',

  showSearch = true,
  searchPlaceholder = 'Buscar cliente, propiedad…',
  searchValue,
  onSearchChange,

  showNotifications = true,
  onNotificationsClick,

  showRefresh = true,
  onRefresh,
  refreshLabel = 'Actualizar',

  showNew = true,
  onNew,
  newLabel = 'Nuevo',

  rightSlot,
  belowSlot,

  sticky = true,
  className,
}: AppTopbarProps) {
  const h = variant === 'compact' ? 'h-14' : 'h-16';

  return (
    <header
      className={cn(
        h,
        'flex flex-col justify-center shrink-0 z-10',
        sticky && 'sticky top-0',
        'bg-white/70 dark:bg-surface-dark/55 backdrop-blur-md',
        'border-b border-white/55 dark:border-slate-700/60',
        className
      )}
    >
      <div className="flex items-center justify-between px-6">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-2xl text-white bg-gradient-to-tr from-primary via-blue-500 to-indigo-500 shadow-elev-1 ring-1 ring-white/30">
            <span className="material-icons">{icon}</span>
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight truncate">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 backdrop-blur-md px-3 h-10 shadow-elev-1">
              <span className="material-icons text-slate-400 text-[18px]">search</span>
              <input
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="bg-transparent outline-none text-sm w-64 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
                placeholder={searchPlaceholder}
              />
            </div>
          ) : null}

          {showNotifications ? (
            <button
              className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 backdrop-blur-md shadow-elev-1 hover:bg-white/70 dark:hover:bg-slate-900/30 transition-colors"
              aria-label="Notificaciones"
              type="button"
              onClick={onNotificationsClick}
            >
              <span className="material-icons text-slate-600 dark:text-slate-300 text-[20px]">
                notifications_none
              </span>
            </button>
          ) : null}

          {rightSlot}

          {showRefresh ? (
            <Button variant="outline" className="h-10" onClick={onRefresh}>
              <span className="material-icons text-[18px]">refresh</span>
              {refreshLabel}
            </Button>
          ) : null}

          {showNew ? (
            <Button className="h-10" onClick={onNew}>
              <span className="material-icons text-[18px]">add</span>
              {newLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {belowSlot ? (
        <div className="px-6 pb-3 -mt-1">
          <div className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/45 dark:bg-slate-900/15 backdrop-blur-md px-3 py-2 shadow-sm">
            {belowSlot}
          </div>
        </div>
      ) : null}
    </header>
  );
}
