// Resolve a Chromium binary for the E2E suites.
//
// The container ships a preinstalled Chromium under PLAYWRIGHT_BROWSERS_PATH but
// the version-stamped directory name does not always match what the installed
// `playwright` package expects, so `chromium.launch()` with no executablePath
// fails with "Executable doesn't exist". Rather than require every caller to
// export E2E_CHROMIUM by hand, look for the newest build on disk and use that.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CANDIDATE_SUFFIXES = [
  'chrome-linux/chrome',
  'chrome-linux/headless_shell',
  'chrome-headless-shell-linux64/chrome-headless-shell',
];

export function resolveChromium() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;

  let dirs;
  try {
    dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('chromium'))
      // Prefer a full Chromium over the headless shell: the shell cannot take
      // the full-page screenshots this suite captures.
      .sort((a, b) => Number(a.name.includes('headless_shell')) - Number(b.name.includes('headless_shell')))
      .map((d) => join(root, d.name));
  } catch {
    return undefined;
  }

  for (const dir of dirs) {
    for (const suffix of CANDIDATE_SUFFIXES) {
      const exe = join(dir, suffix);
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}
