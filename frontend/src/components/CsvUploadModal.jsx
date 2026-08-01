import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiUpload, FiX } from 'react-icons/fi';
import { feedbackApi } from '../api/feedbackApi';

const CsvUploadModal = ({ onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    try {
      const { data } = await feedbackApi.bulkUpload(file, (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      setResult(data.data);
      toast.success(data.message);
      onImported?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Bulk import feedback (CSV)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Columns expected: <code className="text-loop-purple">content, channel, customer_label, source_ref</code>
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl py-8 cursor-pointer hover:border-loop-purple transition mb-4">
          <FiUpload className="text-2xl text-slate-400 mb-2" />
          <span className="text-slate-300 text-sm">{file ? file.name : 'Click to choose a .csv file'}</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {isUploading && (
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
            <div className="bg-loop-purple h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {result && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mb-4 text-sm space-y-1">
            <p className="text-green-400">✅ Imported: {result.importedCount}</p>
            <p className="text-red-400">❌ Failed: {result.failedCount}</p>
            {result.failedRows?.length > 0 && (
              <ul className="text-slate-400 text-xs mt-2 max-h-24 overflow-auto list-disc list-inside">
                {result.failedRows.slice(0, 10).map((r, i) => (
                  <li key={i}>Row {r.row}: {r.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm disabled:opacity-50"
          >
            {isUploading ? 'Uploading…' : 'Upload & Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvUploadModal;
