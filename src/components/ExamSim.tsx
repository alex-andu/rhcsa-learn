import { useEffect, useRef, useState } from 'react';
import { Eye, Pause, Play, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { loc } from '../lib/content';
import { useStore } from '../lib/storage';
import { useT } from '../lib/i18n';
import type { ExamSim } from '../lib/types';
import { Md } from './Md';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Countdown for the timed part of the simulation (minutes come from Alex's "Pune-ți cronometrul pe X minute"). */
export function ExamTimer({ minutes }: { minutes: number }) {
  const t = useT();
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setRunning(false);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  };
  const up = left === 0;
  const pct = ((total - left) / total) * 100;

  return (
    <div className="not-prose mb-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3" data-testid="exam-timer">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--muted)]">{t('timeLeft')}</span>
        <span
          className={`font-mono text-2xl font-semibold tabular-nums ${up ? 'text-red-500' : ''}`}
          role="timer"
          aria-live={up ? 'assertive' : 'off'}
          data-testid="timer-value"
        >
          {up ? t('timerUp') : fmt(left)}
        </span>
        <span className="ml-auto flex gap-2">
          {running ? (
            <button className="btn inline-flex items-center gap-1" onClick={() => setRunning(false)}>
              <Pause size={16} aria-hidden="true" /> {t('timerPause')}
            </button>
          ) : (
            !up && (
              <button className="btn inline-flex items-center gap-1" onClick={start}>
                <Play size={16} aria-hidden="true" /> {left === total ? t('timerStart') : t('timerResume')}
              </button>
            )
          )}
          {left !== total && (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--hover)]"
              onClick={() => {
                setRunning(false);
                setLeft(total);
              }}
            >
              <RotateCcw size={16} aria-hidden="true" /> {t('timerReset')}
            </button>
          )}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-[var(--track)]">
        <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Partea B: open questions, answer revealed on demand, self-graded. Attempts go to the quiz history under `<lesson>#exam`. */
export function RecallView({ lessonKey, exam }: { lessonKey: string; exam: ExamSim }) {
  const { state, update } = useStore();
  const t = useT();
  const histKey = `${lessonKey}#exam`;
  const history = state.quiz[histKey] ?? [];
  const lastWrong = history.length ? history[history.length - 1].wrong : [];

  const [subset, setSubset] = useState<string[] | null>(null);
  const questions = subset ? exam.questions.filter((q) => subset.includes(q.id)) : exam.questions;
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [knew, setKnew] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const q = questions[idx];

  const reset = (ids: string[] | null) => {
    setSubset(ids);
    setIdx(0);
    setShown(false);
    setKnew({});
    setFinished(false);
  };

  const grade = (ok: boolean) => {
    const next = { ...knew, [q.id]: ok };
    setKnew(next);
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setShown(false);
      return;
    }
    const wrong = questions.filter((x) => !next[x.id]).map((x) => x.id);
    update((s) => ({
      ...s,
      quiz: {
        ...s.quiz,
        [histKey]: [...(s.quiz[histKey] ?? []), { ts: Date.now(), score: questions.length - wrong.length, total: questions.length, wrong }],
      },
    }));
    setFinished(true);
  };

  const score = Object.values(knew).filter(Boolean).length;

  return (
    <div className="not-prose mt-6" data-recall={lessonKey}>
      {exam.recallTitle && <h3 className="mb-1 text-base font-semibold">{loc(exam.recallTitle, state.lang)}</h3>}
      <p className="mb-3 text-sm text-[var(--muted)]">{t('recallHint')}</p>
      {finished ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
          <p className="text-lg font-semibold">
            {t('score')}: {score}/{questions.length}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => reset(null)}>
              {t('restart')}
            </button>
            {lastWrong.length > 0 && (
              <button className="btn" onClick={() => reset(lastWrong)}>
                {t('retryWrong')} ({lastWrong.length})
              </button>
            )}
          </div>
        </div>
      ) : (
        q && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">
              {t('question')} {idx + 1} {t('of')} {questions.length}
            </p>
            <div className="prose prose-sm mb-3 max-w-none font-medium dark:prose-invert">
              <Md>{loc(q.question, state.lang)}</Md>
            </div>
            {!shown ? (
              <button className="btn inline-flex items-center gap-1" onClick={() => setShown(true)}>
                <Eye size={16} aria-hidden="true" /> {t('showAnswer')}
              </button>
            ) : (
              <>
                <div
                  data-testid="recall-answer"
                  className="prose prose-sm max-w-none rounded-md border-l-4 border-emerald-500 bg-emerald-500/5 px-3 py-2 dark:prose-invert"
                >
                  <Md>{loc(q.answer, state.lang)}</Md>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-done inline-flex items-center gap-1" onClick={() => grade(true)}>
                    <ThumbsUp size={16} aria-hidden="true" /> {t('knewIt')}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    onClick={() => grade(false)}
                  >
                    <ThumbsDown size={16} aria-hidden="true" /> {t('didntKnow')}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      )}
      {history.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-[var(--muted)]">
            {t('history')} ({history.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.ts}>
                  {new Date(h.ts).toLocaleString(state.lang)} — {h.score}/{h.total}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
