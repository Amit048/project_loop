import { useEffect, useState } from 'react';
import useUiStore from '../store/uiStore';

// Full-screen, centered loading overlay driven entirely by
// uiStore.pendingRequests, which is incremented/decremented by the axios
// interceptors in api/authApi.js. Because every api/*.js module funnels
// through that one axios instance, this single component covers every
// action in the app — no per-page loading state needed.
//
// A short show-delay avoids flicker on requests that resolve almost
// instantly (e.g. cached/fast GETs), which is what makes a loader feel
// intentional rather than jittery.
const SHOW_DELAY_MS = 150;

const GlobalLoader = () => {
  const pendingRequests = useUiStore((s) => s.pendingRequests);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pendingRequests > 0) {
      const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [pendingRequests]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm loop-fade-in"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900/90 border border-slate-800 px-8 py-7 shadow-2xl shadow-black/40">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-loop-purple animate-spin" />
        </div>
        <p className="text-sm text-slate-400 tracking-wide">Loading…</p>
      </div>
    </div>
  );
};

export default GlobalLoader;
