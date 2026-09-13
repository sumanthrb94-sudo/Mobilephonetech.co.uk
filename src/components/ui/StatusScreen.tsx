import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

/**
 * StatusScreen — the one layout every "there is nothing to show yet" and
 * "this did not work" screen uses: waiting, offline, errored, not found.
 *
 * They were four different layouts before, which meant four different
 * answers to the same question and no guarantee any of them left the visitor
 * a way out. Sharing the frame makes the escape route structural: a screen
 * cannot be added here without saying what to do next.
 *
 * `tone` only moves the mark: the brand tile while waiting, an icon in a
 * muted disc once something has gone wrong. Failure is stated in the words,
 * never in alarm colouring — nothing here is the customer's fault.
 */

export interface StatusAction {
  label: string;
  /** An in-app destination. Use `onClick` instead for retrying in place. */
  to?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export interface StatusScreenProps {
  /** The mark at the top: the brand tile, or an icon for a failure. */
  icon?: ReactNode;
  spinning?: boolean;
  title: string;
  body?: ReactNode;
  actions?: StatusAction[];
  /** Extra detail under the actions — an error code, a support line. */
  footnote?: ReactNode;
  /**
   * 'status' for waiting (polite), 'alert' for a failure (assertive). A
   * spinner announced as an alert interrupts a screen-reader user for news
   * that is not news.
   */
  live?: 'status' | 'alert';
  /** Fills the viewport. False when the screen sits inside a page section. */
  full?: boolean;
}

export default function StatusScreen({
  icon,
  spinning = false,
  title,
  body,
  actions = [],
  footnote,
  live = 'status',
  full = true,
}: StatusScreenProps) {
  return (
    <div
      role={live}
      aria-live={live === 'alert' ? 'assertive' : 'polite'}
      className="status-screen"
      style={{ minHeight: full ? 'calc(100vh - var(--nav-total) - 64px)' : '40vh' }}
    >
      <div className="status-screen__inner">
        <div className="status-screen__mark">
          {icon ?? <BrandMark size="lg" spinning={spinning} />}
        </div>

        <h1 className="status-screen__title">{title}</h1>
        {body && <p className="status-screen__body">{body}</p>}

        {actions.length > 0 && (
          <div className="status-screen__actions">
            {actions.map((a) => {
              const cls = `btn btn-${a.variant ?? 'secondary'} btn-md`;
              return a.to ? (
                <Link key={a.label} to={a.to} className={cls} style={{ textDecoration: 'none' }}>
                  {a.label}
                </Link>
              ) : (
                <button key={a.label} type="button" className={cls} onClick={a.onClick}>
                  {a.label}
                </button>
              );
            })}
          </div>
        )}

        {footnote && <p className="status-screen__footnote">{footnote}</p>}
      </div>
    </div>
  );
}
