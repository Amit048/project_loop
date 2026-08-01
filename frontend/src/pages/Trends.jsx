import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { insightsApi } from '../api/insightsApi';
import { PageHeader, LoadingSpinner, ErrorState, EmptyState, Badge } from '../components/UiKit';

const Trends = () => {
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    insightsApi.getTrends()
      .then(({ data }) => setTrends(data.data.trends))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load trends'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Theme Trends"
        subtitle="Which themes are growing week-over-week — react to emerging issues early."
      />

      {isLoading && <LoadingSpinner label="Detecting trends…" />}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && trends.length === 0 && (
        <EmptyState title="No themes yet" description="Themes appear automatically once feedback is classified." />
      )}

      {!isLoading && !error && trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trends.map((t) => (
            <Link
              to={`/themes/${t.themeId}`}
              key={t.themeId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-loop-purple/60 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{t.name}</h3>
                {t.isSpiking && <Badge color="red">🔥 Spiking</Badge>}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>This week: <b className="text-white">{t.thisWeek}</b></span>
                <span>Last week: <b className="text-white">{t.lastWeek}</b></span>
                <span className={`flex items-center gap-1 ${t.deltaPct >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {t.deltaPct >= 0 ? <FiTrendingUp /> : <FiTrendingDown />} {Math.abs(t.deltaPct)}%
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-2">{t.totalCount} total feedback items</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trends;
