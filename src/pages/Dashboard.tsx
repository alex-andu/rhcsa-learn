import { Link } from 'react-router-dom';
import { BookOpenCheck, ClipboardCheck, PlayCircle, Timer } from 'lucide-react';
import { chapterKeys, getLesson, lessonKeys, loc, modules } from '../lib/content';
import { useStore } from '../lib/storage';
import { useT } from '../lib/i18n';
import { ProgressBar } from '../components/ProgressBar';

export function Dashboard() {
  const { state } = useStore();
  const t = useT();
  const all = lessonKeys();
  const allChapters = chapterKeys();
  const done = allChapters.filter((k) => state.completed[k]).length;
  const labSteps = Object.values(state.lab).reduce((n, steps) => n + Object.values(steps).filter(Boolean).length, 0);
  const sims = Object.values(state.quiz).filter((h) => h.length > 0).length;
  const started = done > 0 || labSteps > 0 || sims > 0 || !!state.lastLesson;

  const nextKey =
    (state.lastLesson && all.some((l) => l.key === state.lastLesson) && state.lastLesson) ||
    all.find((l) => !state.completed[l.key])?.key ||
    all[0]?.key;
  const next = nextKey ? getLesson(nextKey, state.lang) : undefined;

  const stats = [
    { icon: BookOpenCheck, value: `${done}/${allChapters.length}`, label: t('statChapters') },
    { icon: ClipboardCheck, value: String(labSteps), label: t('statLabSteps') },
    { icon: Timer, value: String(sims), label: t('statSims') },
  ];

  return (
    <div>
      <h1 className="sr-only">{t('dashboard')}</h1>
      <section className="hero mb-6" data-testid="welcome">
        <p className="text-2xl font-semibold sm:text-3xl">{started ? t('welcomeBack') : t('welcomeNew')}</p>
        <p className="mt-2 max-w-2xl text-white/90">{done === allChapters.length && done > 0 ? t('allDone') : t('welcomeText')}</p>
        {next && (
          <Link
            to={`/lesson/${nextKey}`}
            className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#7c2d1e] hover:bg-white/90"
          >
            <PlayCircle size={18} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {state.lastLesson ? t('continue') : t('start')}: {next.doc.meta.title}
            </span>
          </Link>
        )}
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="card flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xl font-semibold tabular-nums">{value}</span>
              <span className="block text-xs text-[var(--muted)]">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <p className="mb-2 text-sm font-medium">{t('globalProgress')}</p>
        <ProgressBar value={done} max={allChapters.length} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t('modules')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => {
          const keys = chapterKeys(m.id);
          const d = keys.filter((k) => state.completed[k]).length;
          return (
            <Link key={m.id} to={`/module/${m.id}`} className="card card-link block">
              <span className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] font-semibold text-[var(--accent)]">
                  {m.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{loc(m.title, state.lang).replace(/^Pilonul \d+:\s*/, '')}</span>
                  {m.target && <span className="mt-0.5 block text-sm text-[var(--muted)]">{loc(m.target, state.lang)}</span>}
                </span>
              </span>
              <span className="mb-2 mt-3 block text-xs text-[var(--muted)]">
                {keys.length} {t('chapters')}
              </span>
              <ProgressBar value={d} max={keys.length} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
