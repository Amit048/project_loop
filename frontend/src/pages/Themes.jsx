import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { themeApi } from '../api/themeApi';
import { PageHeader, LoadingSpinner, ErrorState, EmptyState, Badge } from '../components/UiKit';

const SENTIMENT_COLOR = { POS: 'green', NEG: 'red', NEU: 'yellow', UNCLASSIFIED: 'slate' };

const ThemesList = () => {
  const [themes, setThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    themeApi.list()
      .then(({ data }) => setThemes(data.data.themes))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load themes'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading themes…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Themes" subtitle="Feedback automatically grouped into named, trackable themes." />
      {themes.length === 0 ? (
        <EmptyState title="No themes yet" description="Themes are created automatically as feedback gets classified by AI." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Link
              key={theme._id}
              to={`/themes/${theme._id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-loop-purple/60 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }} />
                <h3 className="text-white font-semibold">{theme.name}</h3>
              </div>
              {theme.description && <p className="text-slate-400 text-sm mb-2">{theme.description}</p>}
              <p className="text-slate-500 text-xs">{theme.feedbackCount} feedback items</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const ThemeDetail = () => {
  const { id } = useParams();
  const [theme, setTheme] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    themeApi.getById(id)
      .then(({ data }) => { setTheme(data.data.theme); setFeedback(data.data.feedback); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load theme'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingSpinner label="Loading theme…" />;
  if (error) return <ErrorState message={error} />;
  if (!theme) return null;

  return (
    <div>
      <PageHeader title={theme.name} subtitle={theme.description || 'Underlying feedback items for this theme.'} />
      {feedback.length === 0 ? (
        <EmptyState title="No feedback linked yet" />
      ) : (
        <div className="space-y-3">
          {feedback.map((fb) => (
            <div key={fb._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge color={SENTIMENT_COLOR[fb.sentiment] || 'slate'}>{fb.sentiment}</Badge>
                <span className="text-slate-500 text-xs">{new Date(fb.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-200 text-sm">{fb.content}</p>
              {fb.customerLabel && <p className="text-slate-500 text-xs mt-1">{fb.customerLabel}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemesList;
