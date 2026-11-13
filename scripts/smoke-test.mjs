// Browser smoke test: starts Vite, drives the app with Playwright, checks every
// feature of the skeleton and that no Mermaid diagram falls back to raw code.
// Usage: npm run test:e2e   (screenshots go to ./screenshots, which is git-ignored)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const KEY = 'pilon-3/3-2-lvm-pe-le-lvextend-stratis';
const LESSON = `/lesson/${KEY}`;
mkdirSync('screenshots', { recursive: true });
// Temporary RO-only lesson to exercise the "EN missing" fallback banner; removed at the end.
const TMP_LESSON = 'content/pilon-3/99-smoke-fallback.ro.md';
writeFileSync(TMP_LESSON, '---\ntitle: Smoke fallback\nsummary: tmp\norder: 99\n---\nDoar RO.\n');

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite did not start')), 30000);
  server.stdout.on('data', (d) => String(d).includes('Local') && (clearTimeout(t), resolve()));
});

let failed = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failed++;
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

  // Dashboard
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Panou' }).waitFor();
  check(await page.locator('html.dark').count() === 1, 'dark theme is the default');
  await page.screenshot({ path: 'screenshots/01-dashboard-dark.png' });

  // Lesson: sections, Mermaid, glossary links
  await page.goto(BASE + LESSON);
  await page.waitForSelector('[data-mermaid="ok"]');
  await page.waitForFunction(() => !document.querySelector('[data-mermaid="loading"]'));
  const sections = await page.$$eval('[data-section]', (els) => els.map((e) => e.getAttribute('data-section')));
  check(
    JSON.stringify(sections) ===
      JSON.stringify(['analogy', 'architecture', 'exam-alert', 'interview', 'lab', 'exam', 'solution', 'references']),
    `Alex's 7 parts as 8 lesson sections in order (${sections.join(', ')})`,
  );
  const nMermaid = await page.locator('[data-mermaid="ok"]').count();
  check(nMermaid >= 1, `${nMermaid} Mermaid diagram(s) rendered as SVG`);
  check((await page.locator('[data-mermaid="error"]').count()) === 0, 'no Mermaid fallback errors');
  check((await page.locator('section[data-section="exam"] h3', { hasText: 'Partea A' }).count()) === 1, 'exam tasks (Partea A) shown');
  check(!(await page.locator('details[data-section="solution"]').evaluate((d) => d.open)), 'solution is folded by default');
  await page.screenshot({ path: 'screenshots/02-lesson-dark.png', fullPage: true });

  // Lab checklist persists
  await page.locator('section[data-section="lab"] input[type=checkbox]').first().check();
  // Exam timer: 20 minutes for chapter 3.2, counts down once started
  check((await page.getByTestId('timer-value').textContent()) === '20:00', 'exam timer starts at the chapter minutes (20:00)');
  await page.getByRole('button', { name: 'Pornește cronometrul' }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="timer-value"]')?.textContent !== '20:00');
  check(true, 'exam timer counts down');
  await page.getByRole('button', { name: 'Pauză' }).click();

  // Recall cards: reveal each answer, alternate "knew it" / "didn't know"
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-recall]').getByRole('button', { name: 'Arată răspunsul' }).click();
    check(await page.getByTestId('recall-answer').isVisible(), `recall q${i + 1}: answer shown`);
    await page.locator('[data-recall]').getByRole('button', { name: i % 2 ? 'N-am știut' : 'Am știut', exact: true }).click();
  }
  await page.getByText('Scor: 3/5').waitFor();
  const retry = page.getByRole('button', { name: /Refă doar greșelile/ });
  check(await retry.count() === 1, 'retry-only-mistakes offered');
  await retry.click();
  check((await page.getByText(/Întrebarea 1 din \d/).textContent()).match(/din (\d)/)[1] === '2', 'retry mode shows only the 2 missed questions');

  // Solution unfolds; code blocks have a copy button
  await page.locator('details[data-section="solution"] > summary').click();
  check(await page.locator('details[data-section="solution"]').getByText('PUNCTAJ FINAL CAPITOLUL 3.2', { exact: false }).isVisible(), 'grading script visible after unfolding the solution');
  check((await page.getByRole('button', { name: 'Copiază' }).count()) > 5, 'code blocks have a copy button');

  // Notes + mark done
  await page.fill('#notes', 'notiță de test');
  await page.getByRole('button', { name: /Marchează lecția ca terminată/ }).click();

  await page.reload();
  await page.waitForSelector('[data-mermaid="ok"]');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rhcsa-lms:v1')));
  check(stored.version === 1, 'LocalStorage key rhcsa-lms:v1 with version 1');
  check(Object.values(stored.lab[KEY] ?? {}).some(Boolean), 'lab step persisted after reload');
  check((stored.quiz[`${KEY}#exam`] ?? []).length === 1, 'recall score saved to history');
  check(stored.notes[KEY] === 'notiță de test', 'notes persisted');
  check(!!stored.completed[KEY], 'lesson marked complete');
  check(await page.locator('#notes').inputValue() === 'notiță de test', 'notes restored in UI');

  check((await page.locator('.katex').count()) > 0, 'math formulas rendered with KaTeX');
  check((await page.locator('.katex-error').count()) === 0, 'no KaTeX errors');

  // Theme toggle re-renders Mermaid
  const svgDark = await page.locator('[data-mermaid="ok"]').first().innerHTML();
  await page.getByRole('button', { name: 'Tema' }).click();
  await page.waitForFunction((prev) => {
    const el = document.querySelector('[data-mermaid="ok"]');
    return el && el.innerHTML !== prev;
  }, svgDark);
  check(await page.locator('html.dark').count() === 0, 'light theme toggled');
  check((await page.locator('[data-mermaid="error"]').count()) === 0, 'Mermaid re-rendered for light theme without errors');
  await page.screenshot({ path: 'screenshots/03-lesson-light.png', fullPage: true });

  // Language toggle: Alex's lessons are RO-only, so EN shows the RO text with a banner
  await page.getByRole('button', { name: 'Limba' }).click();
  check(await page.getByText('The English version of this lesson is not available yet').isVisible(), 'EN toggle shows the RO lesson with the fallback banner');
  await page.getByRole('button', { name: 'Theme' }).click(); // back to dark
  await page.getByRole('button', { name: 'Language' }).click(); // back to RO

  // Fallback banner for a lesson without EN
  await page.getByRole('button', { name: 'Limba' }).click(); // EN
  await page.goto(BASE + '/lesson/pilon-3/99-smoke-fallback');
  check(await page.getByText('The English version of this lesson is not available yet').isVisible(), 'fallback banner shown when EN is missing');
  await page.getByRole('button', { name: 'Language' }).click(); // back to RO

  // Search
  await page.fill('input[placeholder^="Caută"]', 'stratis');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Rezultate căutare' }).waitFor();
  const hits = await page.locator('main ul li').count();
  check(hits >= 1, `search finds the lesson (${hits} results)`);
  await page.screenshot({ path: 'screenshots/04-search.png' });

  // Curriculum
  await page.goto(BASE + '/curriculum');
  await page.getByRole('heading', { name: 'Curriculum' }).first().waitFor();
  const nMods = await page.locator('section[data-module]').count();
  const nChaps = await page.locator('li[data-chapter]').count();
  check(nMods === 3 && nChaps === 5, `curriculum lists all pillars and chapters (${nMods} modules, ${nChaps} chapters)`);
  check((await page.locator(`li[data-chapter="${KEY}"] a`).count()) === 1, 'available lesson is linked from curriculum');
  await page.screenshot({ path: 'screenshots/06-curriculum.png', fullPage: true });

  // Chapter 4.1: Alex's diagram #1 has a syntax error (docs/PENTRU-ALEX.md); the app must show the raw code, not crash
  await page.goto(BASE + '/lesson/pilon-4/4-1-networkmanager-nmcli-dns-chrony-ssh');
  await page.waitForFunction(() => !document.querySelector('[data-mermaid="loading"]'));
  check((await page.locator('[data-mermaid="error"]').count()) === 1, 'invalid diagram in 4.1 falls back to raw code with a message');

  // Export / import
  await page.goto(BASE + '/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportă/ }).click()]);
  const path = await download.path();
  const exported = JSON.parse(readFileSync(path, 'utf8'));
  check(exported.state?.version === 1, 'export produces a v1 backup');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-testid="import-input"]').setInputFiles(path);
  await page.getByText('Import reușit.').waitFor();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('rhcsa-lms:v1')));
  check(!!restored.completed[KEY], 'import restores progress');
  await page.locator('[data-testid="import-input"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"x":1}') });
  await page.getByText(/Fișier invalid/).waitFor();
  check(true, 'invalid import rejected with a message');

  // Mobile layout: no horizontal scroll
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE + LESSON);
  await mobile.waitForSelector('[data-mermaid="ok"]');
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `no horizontal page scroll on phone width (overflow ${overflow}px)`);
  await mobile.screenshot({ path: 'screenshots/05-lesson-mobile.png' });

  check(consoleErrors.length === 0, `no console errors${consoleErrors.length ? ': ' + consoleErrors.join(' | ') : ''}`);
} finally {
  await browser.close();
  server.kill();
  rmSync(TMP_LESSON, { force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
