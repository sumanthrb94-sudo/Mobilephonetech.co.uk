import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Lock, RotateCcw, Save,
} from 'lucide-react';
import {
  loadHomeLayout, saveHomeLayout, defaultLayout, type SectionState,
} from '../../lib/homeLayout';
import { describeError } from '../../lib/adminApi';

/**
 * The home page's running order, editable without a deploy.
 *
 * What this deliberately is not: a page builder. Staff choose which blocks
 * appear and in what sequence; the blocks themselves stay designed. That is
 * the line that keeps the shop front coherent no matter who is running it —
 * every arrangement reachable from this page is one that was designed.
 *
 * The banner carousel cannot be switched off. A home page whose first screen
 * is a text strip is not a decision anyone makes on purpose, and the resolver
 * enforces it too, so hand-editing the document in the Firebase console
 * cannot get around it either.
 */
export default function HomeLayoutPage() {
  const [rows, setRows] = useState<SectionState[]>(defaultLayout);
  const [saved, setSaved] = useState<SectionState[]>(defaultLayout);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await loadHomeLayout();
    setRows(next);
    setSaved(next);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Compared by id order and visibility rather than by reference, so the Save
  // button reflects whether anything would actually change on the home page.
  const signature = (list: SectionState[]) =>
    list.map(s => `${s.id}:${s.visible ? 1 : 0}`).join('|');
  const dirty = signature(rows) !== signature(saved);

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    setRows(next.map((s, i) => ({ ...s, order: i })));
    setNotice(null);
  };

  const toggle = (id: string) => {
    setRows(rs => rs.map(s => (s.id === id && !s.locked ? { ...s, visible: !s.visible } : s)));
    setNotice(null);
  };

  const save = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await saveHomeLayout(rows);
      setSaved(rows);
      const off = rows.filter(s => !s.visible).length;
      setNotice(off
        ? `Home page updated. ${off} section${off === 1 ? '' : 's'} switched off.`
        : 'Home page updated. Every section is showing.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRows(defaultLayout());
    setNotice(null);
  };

  const hiddenCount = rows.filter(s => !s.visible).length;

  return (
    <div className="ops-stack">
      <div className="ops-head">
        <div>
          <p className="ops-eyebrow">Shop front</p>
          <h1 className="ops-title">Home page layout</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="admin-ghost" onClick={reset} disabled={busy}>
            <RotateCcw size={14} /> Restore default order
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => void save()}
            disabled={busy || !dirty}
          >
            {busy ? <Loader2 size={15} className="admin-spin" /> : <Save size={15} />}
            {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <p className="hl-intro">
        The order here is the order visitors see, top to bottom. Switching a
        section off keeps it — it stops appearing on the home page, and comes
        back the moment you switch it on again.
      </p>

      {error && (
        <p role="alert" className="admin-panel ord-fact" style={{ padding: 14, color: 'var(--color-sale)' }}>
          <AlertTriangle size={16} /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-panel ord-fact" style={{ padding: 14 }}>
          <Check size={16} /> {notice}
        </p>
      )}

      {loading ? (
        <p className="ord-empty"><Loader2 size={18} className="admin-spin" /> Loading layout…</p>
      ) : (
        <>
          <ol className="admin-panel hl-list" aria-label="Home page sections, in order">
            {rows.map((section, i) => (
              <li
                key={section.id}
                className={section.visible ? 'hl-row' : 'hl-row hl-row--off'}
              >
                <span className="hl-row__pos" aria-hidden="true">{i + 1}</span>

                <span className="hl-row__text">
                  <span className="hl-row__label">
                    {section.label}
                    {section.locked && (
                      <span className="hl-row__lock" title="Always shown">
                        <Lock size={11} /> Always on
                      </span>
                    )}
                    {!section.visible && <span className="hl-row__off">Off</span>}
                  </span>
                  <span className="hl-row__blurb">{section.blurb}</span>
                </span>

                <span className="hl-row__acts">
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => toggle(section.id)}
                    disabled={section.locked}
                    aria-label={`${section.visible ? 'Switch off' : 'Switch on'} ${section.label}`}
                  >
                    {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    {section.visible ? 'On' : 'Off'}
                  </button>
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${section.label} up`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label={`Move ${section.label} down`}
                  >
                    <ArrowDown size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ol>

          <p className="bn-field__hint">
            {hiddenCount === 0
              ? 'Every section is showing.'
              : `${hiddenCount} section${hiddenCount === 1 ? '' : 's'} switched off.`}
            {dirty && ' Changes are not live until you save.'}
          </p>
        </>
      )}
    </div>
  );
}
