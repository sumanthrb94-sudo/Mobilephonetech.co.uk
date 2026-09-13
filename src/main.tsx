import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Take down the boot splash painted by index.html.
 *
 * Two frames of grace before starting the fade: render() only schedules the
 * work, so removing the cover in the same tick swaps the splash for an empty
 * page and back again. requestAnimationFrame twice means React has actually
 * committed and the browser has painted it.
 *
 * The fade itself is a CSS transition on the element, and the element is
 * removed when that transition ends — with a timeout behind it, because
 * `transitionend` never fires when the transition is off (reduced motion, or
 * a browser that skips it on a hidden tab) and the splash would then sit over
 * a working shop for ever.
 */
function dismissSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;

  const remove = () => splash.remove();
  splash.addEventListener('transitionend', remove, { once: true });
  splash.dataset.leaving = 'true';
  window.setTimeout(remove, 600);
}

requestAnimationFrame(() => requestAnimationFrame(dismissSplash));
