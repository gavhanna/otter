type Recording = {
  id: string;
  title: string;
  date: string;
  duration: string;
};

const SAMPLE_RECORDINGS: Recording[] = [
  { id: '1', title: 'Morning notes', date: 'Oct 27, 2025', duration: '00:22' },
  { id: '2', title: 'Ideas with Jamie', date: 'Jul 27, 2025', duration: '03:07' },
  { id: '3', title: 'Grocery plan', date: 'Jul 24, 2025', duration: '00:37' }
];

export function RecordingsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Recent recordings</h1>
          <span className="text-xs text-slate-400">{SAMPLE_RECORDINGS.length} items</span>
        </header>
        <div className="space-y-2">
          {SAMPLE_RECORDINGS.map((recording) => (
            <article
              key={recording.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-brand hover:bg-slate-900 transition"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{recording.title}</h2>
                <span className="text-xs text-slate-400">{recording.duration}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{recording.date}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="min-h-[320px] rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Selected recording</p>
            <h2 className="text-xl font-semibold text-white">Pick an item to start</h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Share
            </button>
            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Delete
            </button>
          </div>
        </header>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-slate-500">
          <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700">
            Waveform preview coming soon
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-slate-950 font-semibold">
              ▶
            </button>
            <span className="text-sm text-slate-300">00:00 / 00:00</span>
          </div>
        </div>
      </section>
    </div>
  );
}
