import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '../lib/i18n';

interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

const textOf = (n: HastNode | undefined): string =>
  !n ? '' : n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(textOf).join('');

/** Copies a code block's text; the lab commands are meant to be pasted into a terminal. */
export function CopyButton({ node }: { node?: unknown }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textOf(node as HastNode).replace(/\n$/, ''));
      setOk(true);
      window.setTimeout(() => setOk(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="not-prose absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs opacity-80 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      aria-label={ok ? t('copied') : t('copy')}
    >
      {ok ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {ok ? t('copied') : t('copy')}
    </button>
  );
}
