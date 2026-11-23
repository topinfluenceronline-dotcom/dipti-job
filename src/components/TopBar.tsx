import { RefreshCw } from 'lucide-react';

export type ActiveTab = 'feed' | 'alerts' | 'sources' | 'rules' | 'profile';

interface TopBarProps {
  activeTab: ActiveTab;
  unreadNotifications: number;
  onSelectTab: (tab: ActiveTab) => void;
  onScanNow: () => void;
  isScanning: boolean;
}

export function TopBar({
  activeTab,
  unreadNotifications,
  onSelectTab,
  onScanNow,
  isScanning,
}: TopBarProps) {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'feed', label: 'Live Feed' },
    {
      id: 'alerts',
      label: unreadNotifications > 0 ? `Alerts (${unreadNotifications})` : 'Alerts',
    },
    { id: 'sources', label: 'Firsthand Portals' },
    { id: 'rules', label: 'Alert Rules' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('feed')}
          className="font-serif text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 cursor-pointer hover:text-amber-800 transition-colors"
        >
          Dipti Job Radar
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-stone-900'
                    : item.id === 'alerts' && unreadNotifications > 0
                    ? 'text-amber-800 hover:text-stone-900'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-amber-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onScanNow}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Dubai...' : 'Scan Dubai Jobs'}</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto px-4 py-2 border-t border-stone-200/80"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
                isActive
                  ? 'text-stone-900 border-amber-700'
                  : item.id === 'alerts' && unreadNotifications > 0
                  ? 'text-amber-800 border-transparent'
                  : 'text-stone-500 border-transparent hover:text-stone-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
