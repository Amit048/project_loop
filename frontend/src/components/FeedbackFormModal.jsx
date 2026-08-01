import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import useFeedbackStore from '../store/feedbackStore';

const CHANNELS = [
  { value: 'manual', label: 'Manual entry' },
  { value: 'support_ticket', label: 'Support ticket' },
  { value: 'app_store_review', label: 'App store review' },
  { value: 'nps_survey', label: 'NPS / CSAT survey' },
  { value: 'sales_call_note', label: 'Sales call note' },
  { value: 'social_mention', label: 'Social mention' },
];

const FeedbackFormModal = ({ onClose }) => {
  const { createFeedback } = useFeedbackStore();
  const [form, setForm] = useState({ content: '', channel: 'manual', customerLabel: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.content.trim().length < 3) {
      setErrors({ content: 'Content must be at least 3 characters' });
      return;
    }
    setIsSubmitting(true);
    const result = await createFeedback(form);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('✅ Feedback added');
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Add feedback</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Feedback content</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="What did the customer say?"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white text-sm p-3 focus:outline-none focus:border-loop-purple"
            />
            {errors.content && <p className="text-red-400 text-xs mt-1">{errors.content}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white text-sm p-2.5"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Customer label</label>
              <input
                value={form.customerLabel}
                onChange={(e) => setForm({ ...form, customerLabel: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white text-sm p-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Add feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackFormModal;
