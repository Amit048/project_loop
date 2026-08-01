import { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import { insightsApi } from '../api/insightsApi';
import { PageHeader, Badge } from '../components/UiKit';

const SENTIMENT_COLOR = { POS: 'green', NEG: 'red', NEU: 'yellow', UNCLASSIFIED: 'slate' };

const SUGGESTED_QUESTIONS = [
  'What are users saying about onboarding?',
  'What is the biggest complaint this month?',
  'Are customers happy with performance?',
];

const AskLoop = () => {
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text, usedFeedback}
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (question) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setIsAsking(true);
    try {
      const { data } = await insightsApi.ask(question);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: data.data.answer, usedFeedback: data.data.usedFeedback || [] },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: err.response?.data?.message || 'Something went wrong answering that.', usedFeedback: [] },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="Ask LOOP"
        subtitle="Ask a plain-English question — every answer is grounded in real, cited feedback."
      />

      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-10">
            <FiMessageSquare className="mx-auto text-3xl mb-3" />
            <p className="mb-4">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg rounded-xl p-3 text-sm ${
              m.role === 'user' ? 'bg-loop-purple text-white' : 'bg-slate-800 text-slate-200'
            }`}>
              <p>{m.text}</p>
              {m.usedFeedback?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <p className="text-xs opacity-70 uppercase tracking-wide">Cited feedback</p>
                  {m.usedFeedback.map((f) => (
                    <div key={f._id} className="bg-black/20 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={SENTIMENT_COLOR[f.sentiment] || 'slate'}>{f.sentiment}</Badge>
                        <span className="text-xs opacity-60 capitalize">{f.channel?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs opacity-90">{f.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-xl p-3 text-sm">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your feedback…"
          className="flex-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-loop-purple"
        />
        <button
          type="submit"
          disabled={isAsking || !input.trim()}
          className="px-4 py-3 rounded-lg bg-loop-purple hover:bg-loop-purple-dark text-white disabled:opacity-50"
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default AskLoop;
