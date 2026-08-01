import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { FiFileText, FiDownload, FiPlus } from 'react-icons/fi';
import { reportApi } from '../api/reportApi';
import { PageHeader, LoadingSpinner, ErrorState, EmptyState, Badge } from '../components/UiKit';

const todayMinus = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const ReportsList = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [range, setRange] = useState({ periodStart: todayMinus(7), periodEnd: todayMinus(0) });
  const navigate = useNavigate();

  const load = () => {
    setIsLoading(true);
    reportApi.list()
      .then(({ data }) => setReports(data.data.reports))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load reports'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data } = await reportApi.generate(range.periodStart, range.periodEnd);
      toast.success('✅ Report generated');
      navigate(`/reports/${data.data.report._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Voice-of-Customer Reports"
        subtitle="One click produces a forward-ready digest grounded in real numbers."
        action={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={range.periodStart}
              onChange={(e) => setRange({ ...range, periodStart: e.target.value })}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="px-2 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-sm cursor-pointer"
            />
            <span className="text-slate-500 text-sm">to</span>
            <input
              type="date"
              value={range.periodEnd}
              onChange={(e) => setRange({ ...range, periodEnd: e.target.value })}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="px-2 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-sm cursor-pointer"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm disabled:opacity-50"
            >
              <FiPlus /> {isGenerating ? 'Generating…' : 'Generate report'}
            </button>
          </div>
        }
      />

      {isLoading && <LoadingSpinner label="Loading reports…" />}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && reports.length === 0 && (
        <EmptyState icon="📄" title="No reports yet" description="Pick a period above and generate your first Voice-of-Customer report." />
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link
              key={r._id}
              to={`/reports/${r._id}`}
              className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-loop-purple/60 transition"
            >
              <div className="flex items-center gap-3">
                <FiFileText className="text-loop-purple text-xl" />
                <div>
                  <p className="text-white font-medium">{r.title}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const ReportDetail = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportApi.getById(id)
      .then(({ data }) => setReport(data.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load report'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleExportPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    const c = report.contentJson;
    let y = 20;

    doc.setFontSize(16); doc.text(report.title, 14, y); y += 10;
    doc.setFontSize(10);
    doc.text(`${new Date(report.periodStart).toLocaleDateString()} - ${new Date(report.periodEnd).toLocaleDateString()}`, 14, y); y += 10;

    doc.setFontSize(12); doc.text('Summary', 14, y); y += 6;
    doc.setFontSize(10);
    const narrativeLines = doc.splitTextToSize(c.narrative || '', 180);
    doc.text(narrativeLines, 14, y); y += narrativeLines.length * 5 + 8;

    doc.setFontSize(12); doc.text('Top Themes', 14, y); y += 6;
    doc.setFontSize(10);
    (c.topThemes || []).forEach((t) => {
      doc.text(`- ${t.name}: ${t.count} items (${t.deltaPct >= 0 ? '+' : ''}${t.deltaPct}% vs prior period)`, 14, y);
      y += 6;
    });
    y += 4;

    doc.setFontSize(12); doc.text('Recommended Actions', 14, y); y += 6;
    doc.setFontSize(10);
    (c.recommendedActions || []).forEach((a) => {
      const lines = doc.splitTextToSize(`- ${a}`, 180);
      doc.text(lines, 14, y); y += lines.length * 5 + 2;
    });

    doc.save(`${report.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
  };

  if (isLoading) return <LoadingSpinner label="Loading report…" />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;
  const c = report.contentJson;

  return (
    <div>
      <PageHeader
        title={report.title}
        subtitle={`${new Date(report.periodStart).toLocaleDateString()} – ${new Date(report.periodEnd).toLocaleDateString()}`}
        action={
          <button onClick={handleExportPdf} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white text-sm">
            <FiDownload /> Export PDF
          </button>
        }
      />

      <div className="space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Summary</h2>
          <p className="text-slate-300 text-sm whitespace-pre-line">{c.narrative}</p>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Sentiment shift</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">Positive: {c.sentimentShift?.positivePct}%</span>
            <span className="text-yellow-400">Neutral: {c.sentimentShift?.neutralPct}%</span>
            <span className="text-red-400">Negative: {c.sentimentShift?.negativePct}%</span>
            <span className="text-slate-400">
              Δ vs prior period: {c.sentimentShift?.deltaFromPreviousPeriodPct >= 0 ? '+' : ''}
              {c.sentimentShift?.deltaFromPreviousPeriodPct}pts negative
            </span>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Top themes</h2>
          <div className="space-y-2">
            {(c.topThemes || []).map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{t.name}</span>
                <span className="text-slate-400">{t.count} items · {t.deltaPct >= 0 ? '+' : ''}{t.deltaPct}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Notable quotes</h2>
          <div className="space-y-3">
            {(c.notableQuotes || []).map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge color={q.sentiment === 'NEG' ? 'red' : q.sentiment === 'POS' ? 'green' : 'yellow'}>{q.sentiment}</Badge>
                <p className="text-slate-300 text-sm italic">"{q.quote}"</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Recommended actions</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
            {(c.recommendedActions || []).map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ReportsList;
