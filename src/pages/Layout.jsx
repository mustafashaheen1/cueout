
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../components/utils";
import { Phone, Clock, User } from "lucide-react";
import { PersonaProvider } from "../components/PersonaContext";
import { AppProvider, useApp } from "../components/AppContext";

function TabBar({ tabs, location }) {
  const { unreadHistoryCount, isTabBarHidden } = useApp();

  if (isTabBarHidden) return null;

  return (
    <div
      className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl shadow-black flex pointer-events-auto"
      style={{
        width: 'min(calc(100vw - 48px), 380px)',
        padding: 'clamp(8px, 2vw, 12px) clamp(10px, 3vw, 16px)',
        gap: 'clamp(4px, 1.5vw, 8px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        const isHistory = tab.name === 'History';

        return (
          <Link
            key={tab.name}
            to={tab.path}
            className={`relative flex-1 flex flex-col items-center gap-1 py-2 rounded-full transition-all duration-200 active:scale-95 ${
              isActive ? 'bg-red-500/20' : 'active:bg-zinc-800/50'
            }`}
          >
            {isActive && (
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
            )}
            <div className={`relative ${isActive ? 'text-red-500' : 'text-zinc-400'}`}>
              <Icon
                style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isHistory && unreadHistoryCount > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900" />
              )}
            </div>
            <span
              className={`relative font-semibold ${isActive ? 'text-red-500' : 'text-zinc-400'}`}
              style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const { isTabBarHidden } = useApp();
  
  const hideTabBar = ['Onboarding', 'Auth', 'PhoneVerification', 'PersonaSettings', 'Paywall'].includes(currentPageName) || isTabBarHidden;
  
  const tabs = [
    { name: 'Home', path: createPageUrl('Home'), icon: Phone, label: 'Schedule' },
    { name: 'History', path: createPageUrl('History'), icon: Clock, label: 'History' },
    { name: 'Account', path: createPageUrl('Account'), icon: User, label: 'Account' }
  ];

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden">
      <div
        id="scroll-container"
        className={`absolute inset-0 overflow-y-auto ${!hideTabBar ? 'pb-36' : ''}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Black safe area cover — blocks scrolled content from showing behind the notch */}
      <div
        className="absolute top-0 left-0 right-0 bg-black pointer-events-none z-[200]"
        style={{ height: 'env(safe-area-inset-top)' }}
      />

      {!hideTabBar && (
        <div className="absolute bottom-0 left-0 right-0 pb-safe pt-2 flex justify-center pointer-events-none z-[100]">
          <TabBar tabs={tabs} location={location} />
        </div>
      )}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}

export default function Layout(props) {
  return (
    <AppProvider>
      <PersonaProvider>
        <LayoutContent {...props} />
      </PersonaProvider>
    </AppProvider>
  );
}
