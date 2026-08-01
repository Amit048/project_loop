import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiUpload, FiZap, FiSearch, FiRefreshCw } from 'react-icons/fi';
import useFeedbackStore from '../store/feedbackStore';
import useAuthStore from '../utils/authStore';
import { feedbackApi } from '../api/feedbackApi';
import { PageHeader, EmptyState, LoadingSpinner, ErrorState, Badge } from '../components/UiKit';
import FeedbackFormModal from '../components/FeedbackFormModal';
import CsvUploadModal from '../components/CsvUploadModal';

const SENTIMENT_COLOR = { POS: 'green', NEG: 'red', NEU: 'yellow', UNCLASSIFIED: 'slate' };
const STATUS_OPTIONS = ['NEW', 'REVIEWED', 'ACTIONED'];
const CHANNEL_OPTIONS = ['support_ticket', 'app_store_review', 'nps_survey', 'sales_call_note', 'social_mention', 'manual'];

const Inbox = () => {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const {
    items, pagination, filters, isLoading, error,
    fetchFeedback, setFilters, resetFilters, setPage, updateStatus, reclassify,
  } = useFeedbackStore();

  const [showForm, setShowForm] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { fetchFeedback(); }, [filters, pagination.page]);

  // Debounced search (Day 13)
  useEffect(() => {
    const t = setTimeout(() => setFilters({ search: searchInput }), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSimulateChannel = async (channel) => {
    try {
      const { data } = await feedbackApi.simulateChannel(channel, 15);
      toast.success(data.message);
      fetchFeedback();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation failed');
    }
  };

  const handleReclassifyAll = async () => {
    try {
      const { data } = await feedbackApi.reclassifyAll();
      toast.success(data.message);
      fetchFeedback();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reclassify failed');
    }
  };

  const handleReclassifyOne = async (id) => {
    const result = await reclassify(id);
    if (result.success) toast.success('✅ Reclassified');
    else toast.error(result.message);
  };

  return (
    <div>
      <PageHeader
        title="Feedback Inbox"
        subtitle="Search, filter, and triage everything customers are telling you."
        action={
          canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => handleSimulateChannel('app_store_review')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
              >
                <FiZap /> Simulate channel
              </button>
              <button
                onClick={handleReclassifyAll}
                title="Backfill AI classification (sentiment + themes) for any feedback still marked UNCLASSIFIED"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
              >
                <FiRefreshCw /> Reclassify all
              </button>
              <button
                onClick={() => setShowCsv(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
              >
                <FiUpload /> Import CSV
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm"
              >
                <FiPlus /> Add feedback
              </button>
            </div>
          )
        }
      />

      {/* Filter bar (Day 13) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Full-text search…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm"
          />
        </div>
        <select
          value={filters.channel}
          onChange={(e) => setFilters({ channel: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-sm"
        >
          <option value="">All channels</option>
          {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filters.sentiment}
          onChange={(e) => setFilters({ sentiment: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-sm"
        >
          <option value="">All sentiment</option>
          <option value="POS">Positive</option>
          <option value="NEU">Neutral</option>
          <option value="NEG">Negative</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { resetFilters(); setSearchInput(''); }}
          className="px-3 py-2 text-slate-400 hover:text-white text-sm"
        >
          Clear
        </button>
      </div>

      {isLoading && <LoadingSpinner label="Loading feedback…" />}
      {!isLoading && error && <ErrorState message={error} />}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title="No feedback yet"
          description="Add an item manually, import a CSV, or simulate a channel to get started."
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Content</th>
                <th className="text-left p-3">Channel</th>
                <th className="text-left p-3">Sentiment</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((fb) => (
                <tr key={fb._id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="p-3 text-slate-200 max-w-md">
                    <p className="line-clamp-2">{fb.content}</p>
                    {fb.customerLabel && <p className="text-slate-500 text-xs mt-1">{fb.customerLabel}</p>}
                  </td>
                  <td className="p-3 text-slate-400 capitalize">{fb.channel.replace('_', ' ')}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge color={SENTIMENT_COLOR[fb.sentiment] || 'slate'}>{fb.sentiment}</Badge>
                      {canEdit && fb.sentiment === 'UNCLASSIFIED' && (
                        <button
                          onClick={() => handleReclassifyOne(fb._id)}
                          title="Retry AI classification for this item"
                          className="text-slate-500 hover:text-loop-purple"
                        >
                          <FiRefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      value={fb.status}
                      disabled={!canEdit}
                      onChange={(e) => updateStatus(fb._id, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination (Day 12) */}
          <div className="flex items-center justify-between p-3 border-t border-slate-800 text-sm text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} items
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && <FeedbackFormModal onClose={() => setShowForm(false)} />}
      {showCsv && <CsvUploadModal onClose={() => setShowCsv(false)} onImported={fetchFeedback} />}
    </div>
  );
};

export default Inbox;
