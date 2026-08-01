// Small shared UI primitives reused across every page so states stay
// consistent (Day 6 design system + Day 28 loading/empty/error polish).

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const StatCard = ({ label, value, icon }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    {icon && <div className="text-2xl mb-2">{icon}</div>}
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-slate-400 text-sm">{label}</div>
  </div>
);

export const EmptyState = ({ icon = '🗂️', title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-xl">
    <div className="text-4xl mb-3">{icon}</div>
    <h3 className="text-white font-semibold mb-1">{title}</h3>
    {description && <p className="text-slate-400 text-sm max-w-sm mb-4">{description}</p>}
    {action}
  </div>
);

export const LoadingSpinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
    <span className="w-4 h-4 border-2 border-loop-purple border-t-transparent rounded-full animate-spin" />
    {label}
  </div>
);

export const ErrorState = ({ message = 'Something went wrong.' }) => (
  <div className="py-16 text-center text-red-400 text-sm bg-red-950/20 border border-red-900/40 rounded-xl">
    ⚠️ {message}
  </div>
);

export const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    purple: 'bg-loop-purple/20 text-loop-purple border-loop-purple/40',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

export default { PageHeader, StatCard, EmptyState, LoadingSpinner, ErrorState, Badge };
