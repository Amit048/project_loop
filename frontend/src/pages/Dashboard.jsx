import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import useAuthStore from '../utils/authStore';
import { insightsApi } from '../api/insightsApi';
import { PageHeader, StatCard, LoadingSpinner, ErrorState, EmptyState } from '../components/UiKit';

const SENTIMENT_COLORS = { POS: '#22c55e', NEU: '#eab308', NEG: '#ef4444', UNCLASSIFIED: '#64748b' };

const Dashboard = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [volume, setVolume] = useState([]);
  const [sentiment, setSentiment] = useState([]);
  const [topThemes, setTopThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [s, v, se, t] = await Promise.all([
          insightsApi.getSummary(),
          insightsApi.getVolume(),
          insightsApi.getSentiment(),
          insightsApi.getTopThemes(),
        ]);
        setSummary(s.data.data);
        setVolume(v.data.data);
        setSentiment(se.data.data);
        setTopThemes(t.data.data.themes);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} />;

  const noData = !summary?.totalFeedback;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}! 👋`}
        subtitle="Here's the shape of your customer feedback right now."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon="📥" label="Total Feedback" value={summary?.totalFeedback ?? 0} />
        <StatCard icon="😟" label="% Negative" value={`${summary?.negativePct ?? 0}%`} />
        <StatCard icon="🆕" label="New This Week" value={summary?.newThisWeek ?? 0} />
      </div>

      {noData ? (
        <EmptyState
          title="No feedback yet"
          description="Head to the Inbox to add feedback manually, import a CSV, or simulate a channel — then come back here."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Volume over time</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="count" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Sentiment breakdown</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sentiment} dataKey="count" nameKey="sentiment" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {sentiment.map((entry, i) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[entry.sentiment] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2">
            <h2 className="text-white font-semibold mb-4">Top themes</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topThemes} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="feedbackCount" fill="#6C5CE7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
