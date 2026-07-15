#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createRequire } from 'node:module';
import { stdin as input, stdout as output } from 'node:process';

const args = parseArgs(process.argv.slice(2));
const command = normalizeCommand(args._?.[0]);

if (command === 'manual' || command === 'assisted') {
  args.mode = args.mode || command;
  args.persist = args.persist ?? true;
}

if (command === 'run-playbook') {
  args.mode = args.mode || 'assisted';
  args.persist = args.persist ?? true;
}

if (command === 'headless') {
  args.headless = true;
  args.mode = args.mode || 'headless';
}

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const startedAt = new Date();
const projectRoot = path.resolve(args.cwd || process.cwd());
const stateRoot = path.resolve(projectRoot, args['state-dir'] || '.qa-browser');
const configPath = path.resolve(args.config || path.join(stateRoot, 'config.json'));
const config = await readJsonIfExists(configPath);
const profileName = args.profile || args.p || config.defaultProfile;
const profileConfig = profileName ? config.profiles?.[profileName] || {} : {};
const runtimeRoot = path.resolve(
  args['runtime-dir'] ||
  process.env.QA_BROWSER_RUNTIME ||
  path.join(os.homedir(), '.local/share/qa-browser-session')
);

if (profileName && config.profiles && !profileConfig.url && !args['create-profile']) {
  console.error(`Erro: perfil "${profileName}" nao existe em ${configPath}. Use --create-profile para criar/adotar um perfil novo.`);
  process.exit(1);
}

if (command === 'init') {
  await initProjectConfig({ stateRoot, configPath, args, projectRoot });
  process.exit(0);
}

if (command === 'prune') {
  const pruneRoot = path.resolve(projectRoot, args.output || args.o || profileConfig.outputDir || config.outputDir || path.join(stateRoot, 'runs'));
  await pruneRuns(pruneRoot, resolveRetention(config, profileConfig, args));
  process.exit(0);
}

if (command === 'learn') {
  const redaction = resolveRedaction(config, profileConfig, args);
  const draftPath = await learnPlaybookDraft({
    projectRoot,
    stateRoot,
    config,
    profileConfig,
    args,
    redaction
  });
  console.log(`Draft de playbook criado em: ${draftPath}`);
  process.exit(0);
}

const knowledgeRoot = path.resolve(projectRoot, args['knowledge-dir'] || profileConfig.knowledgeDir || config.knowledgeDir || path.join(stateRoot, 'knowledge'));
const playbookName = command === 'run-playbook' ? args.playbook || args._?.[1] : null;
if (command === 'run-playbook' && !playbookName) {
  console.error('Erro: informe o playbook com qa-browser run-playbook <nome> ou --playbook <nome>.');
  process.exit(1);
}
const playbook = playbookName ? await loadPlaybook({ knowledgeRoot, playbookName, runtimeRoot }) : null;

const baseUrl = args.url || args.u || process.env.QA_URL || playbook?.url || profileConfig.url || config.defaultUrl;

if (!baseUrl) {
  console.error('Erro: informe a URL com --url, QA_URL ou .qa-browser/config.json.');
  printHelp();
  process.exit(1);
}

const projectName = sanitizeName(args.name || args.project || config.project || path.basename(projectRoot) || hostNameFromUrl(baseUrl));
const outputRoot = path.resolve(projectRoot, args.output || args.o || profileConfig.outputDir || config.outputDir || path.join(stateRoot, 'runs'));
const runId = `${timestampForPath(startedAt)}-${projectName}`;
const runDir = path.join(outputRoot, runId);
const videoDir = path.join(runDir, 'videos');
const tracePath = path.join(runDir, 'trace.zip');
const harPath = path.join(runDir, 'network.har');
const eventsPath = path.join(runDir, 'events.json');
const summaryPath = path.join(runDir, 'summary.json');
const transcriptPath = path.join(runDir, 'ai-transcript.jsonl');
const finalScreenshotPath = path.join(runDir, 'final-screenshot.png');
const liveScreenshotDir = path.join(runDir, 'live-screenshots');
const liveTraceDir = path.join(runDir, 'live-traces');
const liveSummaryPath = path.join(runDir, 'live-summary.json');
const playbookResultPath = path.join(runDir, 'playbook-result.json');
const headless = Boolean(args.headless) || process.env.CI === 'true';
const mode = args.mode || profileConfig.mode || (headless ? 'headless' : 'manual');
const viewport = parseViewport(args.viewport || profileConfig.viewport || config.viewport);
const { chromium, firefox, webkit } = loadPlaywright(runtimeRoot);
const browserTarget = resolveBrowserTarget(args.browser || process.env.QA_BROWSER || profileConfig.browser || config.defaultBrowser || 'chromium');
const profileDir = resolveProfileDir({ args, projectName, mode, stateRoot, profileName });
const remoteDebuggingPort = args['remote-debugging-port'];
const capture = resolveCaptureOptions(config, profileConfig, args);
const redaction = resolveRedaction(config, profileConfig, args);

if (remoteDebuggingPort && !browserTarget.supportsCdp) {
  console.error(`Erro: --remote-debugging-port so e suportado por Chromium/Chrome/Edge. Browser solicitado: ${browserTarget.name}.`);
  process.exit(1);
}

await fs.mkdir(videoDir, { recursive: true });
await fs.mkdir(liveScreenshotDir, { recursive: true });
await fs.mkdir(liveTraceDir, { recursive: true });
if (profileDir) {
  await fs.mkdir(profileDir, { recursive: true });
}

const events = [];
let playbookResult = null;
let page = null;
let liveFlushTimer = null;
let liveScreenshotTimer = null;
let liveScreenshotSequence = 0;
let liveFlushChain = Promise.resolve();
let liveScreenshotChain = Promise.resolve();
let liveTraceTimer = null;
let liveTraceSequence = 0;
let liveTraceChunkActive = false;
let liveTraceChain = Promise.resolve();
let lastLiveTraceChunkPath = null;
let resolveSessionStop;
const sessionStop = new Promise((resolve) => {
  resolveSessionStop = resolve;
});
const addEvent = (type, payload = {}) => {
  events.push(redactValue({
    ts: new Date().toISOString(),
    type,
    ...payload
  }, redaction));
  scheduleLiveFlush();
};

function scheduleLiveFlush() {
  if (liveFlushTimer) return;
  liveFlushTimer = setTimeout(() => {
    liveFlushTimer = null;
    void flushLiveArtifacts();
  }, 750);
}

async function flushLiveArtifacts() {
  const snapshot = redactValue({
    updatedAt: new Date().toISOString(),
    runDir,
    totalEvents: events.length,
    eventsPath,
    transcriptPath,
    liveScreenshotDir,
    capture
  }, redaction);

  liveFlushChain = liveFlushChain.then(async () => {
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
    await fs.writeFile(liveSummaryPath, JSON.stringify(snapshot, null, 2));
    await fs.writeFile(transcriptPath, toJsonl(buildTranscript({ ...snapshot, endedAt: snapshot.updatedAt }, events)));
  }).catch((error) => {
    console.error(`Falha ao persistir evidencia incremental: ${error.message}`);
  });

  await liveFlushChain;
}

async function captureLiveScreenshot(reason = 'interval') {
  if (!page || page.isClosed() || !capture.liveScreenshots) return;
  liveScreenshotChain = liveScreenshotChain.then(async () => {
    if (!page || page.isClosed()) return;
    const sequence = String(++liveScreenshotSequence).padStart(6, '0');
    const screenshotPath = path.join(liveScreenshotDir, `${sequence}-${sanitizeName(reason)}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      addEvent('live-screenshot', { reason, path: screenshotPath });
    } catch (error) {
      addEvent('live-screenshot-error', { reason, message: error.message });
    }
  }).catch((error) => {
    addEvent('live-screenshot-chain-error', { reason, message: error.message });
  });
  await liveScreenshotChain;
}

async function flushLiveTraceChunk(reason = 'interval', restart = true) {
  if (!capture.liveTraceChunks || !liveTraceChunkActive) return;
  liveTraceChain = liveTraceChain.then(async () => {
    const sequence = String(++liveTraceSequence).padStart(6, '0');
    const traceChunkPath = path.join(liveTraceDir, `${sequence}-${sanitizeName(reason)}.zip`);
    try {
      await context.tracing.stopChunk({ path: traceChunkPath });
      liveTraceChunkActive = false;
      lastLiveTraceChunkPath = traceChunkPath;
      addEvent('live-trace-chunk', { reason, path: traceChunkPath });
      if (restart) {
        await context.tracing.startChunk();
        liveTraceChunkActive = true;
      }
    } catch (error) {
      addEvent('live-trace-chunk-error', { reason, message: error.message });
      liveTraceChunkActive = false;
    }
  }).catch((error) => {
    addEvent('live-trace-chain-error', { reason, message: error.message });
  });
  await liveTraceChain;
}

function requestSessionStop(signal) {
  addEvent('session-stop-requested', { signal });
  resolveSessionStop?.();
}

console.log(`Iniciando sessao QA: ${baseUrl}`);
console.log(`Projeto: ${projectName}`);
console.log(`Raiz do projeto: ${projectRoot}`);
console.log(`Runtime: ${runtimeRoot}`);
console.log(`Artefatos serao salvos em: ${runDir}`);
console.log(`Browser: ${browserTarget.name}${browserTarget.channel ? ` (${browserTarget.channel})` : ''}`);
if (profileDir) {
  console.log(`Perfil persistente: ${profileDir}`);
}
if (remoteDebuggingPort) {
  console.log(`CDP disponivel em: http://127.0.0.1:${remoteDebuggingPort}`);
}
if (playbook) {
  console.log(`Playbook: ${playbook.id || playbookName}`);
  printPlaybookPlan(playbook);
}

const browserArgs = ['--start-maximized'];
if (remoteDebuggingPort) {
  browserArgs.push(`--remote-debugging-port=${remoteDebuggingPort}`);
}

const contextOptions = {
  viewport,
  ...(capture.video ? {
    recordVideo: {
      dir: videoDir,
      size: viewport
    }
  } : {}),
  recordHar: {
    path: harPath,
    content: capture.harContent,
    mode: 'full'
  }
};

const browser = profileDir
  ? null
  : await browserTarget.type.launch({
      headless,
      channel: browserTarget.channel,
      args: browserArgs
    });

const context = profileDir
  ? await browserTarget.type.launchPersistentContext(profileDir, {
      headless,
      channel: browserTarget.channel,
      args: browserArgs,
      ...contextOptions
    })
  : await browser.newContext(contextOptions);

await context.tracing.start({
  screenshots: capture.traceScreenshots,
  snapshots: capture.traceSnapshots,
  sources: capture.traceSources
});
if (capture.liveTraceChunks) {
  await context.tracing.startChunk();
  liveTraceChunkActive = true;
}

await context.exposeBinding('__qaRecordDomEvent', async (_source, payload) => {
  addEvent('dom-event', payload);
});

await context.addInitScript({
  content: `(() => {
    const describe = (element) => ({
      tag: element?.tagName || null,
      id: element?.id || null,
      role: element?.getAttribute?.('role') || null,
      ariaLabel: element?.getAttribute?.('aria-label') || null,
      name: element?.getAttribute?.('name') || null,
      text: (element?.innerText || element?.textContent || '').trim().slice(0, 160)
    });
    const emit = (kind, element) => {
      if (typeof window.__qaRecordDomEvent === 'function') {
        window.__qaRecordDomEvent({ kind, element: describe(element), url: location.href });
      }
    };
    document.addEventListener('click', (event) => emit('click', event.target?.closest?.('button,a,[role=button],[role=option],[role=menuitem],input,textarea,select') || event.target), true);
    document.addEventListener('change', (event) => emit('change', event.target), true);
    document.addEventListener('submit', (event) => emit('submit', event.target), true);
  })();`
});

function attachPageListeners(targetPage) {
  targetPage.on('console', (message) => {
    addEvent('console', {
      level: message.type(),
      text: message.text(),
      location: message.location()
    });
  });

  targetPage.on('pageerror', (error) => {
    addEvent('pageerror', {
      message: error.message,
      stack: error.stack
    });
  });

  targetPage.on('requestfailed', (request) => {
    addEvent('requestfailed', {
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText
    });
  });

  targetPage.on('response', (response) => {
    if (response.status() >= 400) {
      addEvent('http-error', {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  targetPage.on('framenavigated', (frame) => {
    if (frame === targetPage.mainFrame()) {
      addEvent('navigation', { url: frame.url() });
      setTimeout(() => void captureLiveScreenshot('navigation'), 500);
    }
  });

  targetPage.on('close', () => {
    addEvent('page-closed', { url: targetPage.url() });
  });
}

context.on('page', (newPage) => {
  attachPageListeners(newPage);
});

page = await context.newPage();
attachPageListeners(page);

if (capture.liveScreenshots) {
  liveScreenshotTimer = setInterval(() => {
    void captureLiveScreenshot('interval');
  }, Math.max(1000, capture.liveScreenshotIntervalMs));
}
if (capture.liveTraceChunks) {
  liveTraceTimer = setInterval(() => {
    void flushLiveTraceChunk('interval');
  }, Math.max(5000, capture.liveTraceIntervalMs));
}

process.once('SIGINT', () => requestSessionStop('SIGINT'));
process.once('SIGTERM', () => requestSessionStop('SIGTERM'));
process.once('SIGUSR2', () => requestSessionStop('SIGUSR2'));

addEvent('run-started', {
  baseUrl,
  projectName,
  projectRoot,
  configPath,
  profileName,
  browser: browserTarget.name,
  browserChannel: browserTarget.channel,
  headless,
  mode,
  profileDir,
  remoteDebuggingPort,
  viewport
});

let exitCode = 0;

try {
  await page.goto(baseUrl, {
    waitUntil: args['wait-until'] || 'domcontentloaded',
    timeout: Number(args.timeout || 60000)
  });

  addEvent('initial-load-complete', {
    url: page.url(),
    title: await page.title().catch(() => '')
  });

  if (playbook) {
    playbookResult = await runPlaybook({
      page,
      playbook,
      selectors: await loadSelectors(knowledgeRoot, runtimeRoot),
      events,
      addEvent,
      runDir,
      playbookResultPath,
      redaction,
      args
    });
    if (playbookResult.status !== 'passed') {
      exitCode = 1;
    }
  } else if (headless || args.duration) {
    const durationMs = Number(args.duration || 5) * 1000;
    console.log(`Modo automatico: aguardando ${durationMs / 1000}s antes de encerrar.`);
    await page.waitForTimeout(durationMs);
  } else if (mode === 'assisted') {
    console.log('Sessao assistida ativa; evidencias incrementais serao persistidas enquanto o browser permanecer aberto.');
    console.log('Use qa-browser-tmux.sh stop (SIGUSR2) ou envie SIGINT/SIGTERM ao runner para finalizar com trace, HAR, video e screenshot final.');
    await sessionStop;
  } else {
    console.log('');
    console.log('Homologue manualmente no navegador aberto.');
    console.log('Quando terminar, volte para este terminal e pressione Enter.');
    console.log('Use Ctrl+C apenas se quiser abortar sem fechamento limpo.');
    const rl = readline.createInterface({ input, output });
    await rl.question('');
    rl.close();
  }

  if (capture.screenshot) {
    await liveScreenshotChain;
    await page.screenshot({
      path: finalScreenshotPath,
      fullPage: true
    }).catch((error) => {
      addEvent('screenshot-error', { message: error.message });
    });
  }
} catch (error) {
  exitCode = 1;
  addEvent('runner-error', {
    message: error.message,
    stack: error.stack
  });
  console.error(`Falha durante a sessao: ${error.message}`);
} finally {
  const endedAt = new Date();

  if (liveFlushTimer) {
    clearTimeout(liveFlushTimer);
    liveFlushTimer = null;
  }
  if (liveScreenshotTimer) {
    clearInterval(liveScreenshotTimer);
    liveScreenshotTimer = null;
  }
  if (liveTraceTimer) {
    clearInterval(liveTraceTimer);
    liveTraceTimer = null;
  }
  await flushLiveTraceChunk('final-before-close', false);
  await captureLiveScreenshot('final-before-close');
  await flushLiveArtifacts();

  if (capture.liveTraceChunks) {
    addEvent('trace-stop-skipped', { reason: 'live-trace-chunks-finalized' });
  } else {
    await context.tracing.stop({ path: tracePath }).catch((error) => {
      addEvent('trace-stop-error', { message: error.message });
    });
  }

  try {
    await fs.access(tracePath);
  } catch {
    if (lastLiveTraceChunkPath) {
      await fs.copyFile(lastLiveTraceChunkPath, tracePath);
      addEvent('trace-finalized-from-live-chunk', { path: tracePath, source: lastLiveTraceChunkPath });
    }
  }

  await context.close().catch((error) => {
    addEvent('context-close-error', { message: error.message });
  });

  if (browser) {
    await browser.close().catch(() => {});
  }

  await redactJsonFile(harPath, redaction).catch((error) => {
    addEvent('har-redaction-error', { message: error.message });
  });

  addEvent('run-ended', {
    durationMs: endedAt.getTime() - startedAt.getTime()
  });

  const summary = redactValue(buildSummary({
    startedAt,
    endedAt,
    baseUrl,
    projectName,
    browser: browserTarget.name,
    browserChannel: browserTarget.channel,
    headless,
    mode,
    profileDir,
    remoteDebuggingPort,
    playbook,
    playbookResult,
    capture,
    redaction,
    viewport,
    runDir,
    tracePath,
    harPath,
    eventsPath,
    transcriptPath,
    playbookResultPath: playbookResult ? playbookResultPath : null,
    finalScreenshotPath,
    liveScreenshotDir,
    liveTraceDir,
    events
  }), redaction);

  await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  await fs.writeFile(transcriptPath, toJsonl(buildTranscript(summary, events)));

  console.log('');
  console.log('Sessao QA finalizada.');
  console.log(`Resumo: ${summaryPath}`);
  console.log(`Transcript IA: ${transcriptPath}`);
  console.log(`Trace Playwright: ${tracePath}`);
  console.log(`HAR: ${harPath}`);
  console.log(`Videos: ${videoDir}`);

  if (command === 'prune' || config.retention?.autoPrune) {
    await pruneRuns(outputRoot, resolveRetention(config, profileConfig, args));
  }
}

process.exit(exitCode);

function normalizeCommand(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return ['init', 'manual', 'assisted', 'headless', 'prune', 'run-playbook', 'learn'].includes(normalized) ? normalized : null;
}

function loadPlaywright(runtimeRoot) {
  try {
    const requireFromRuntime = createRequire(path.join(runtimeRoot, 'package.json'));
    return requireFromRuntime('@playwright/test');
  } catch (error) {
    console.error(`Erro: runtime Playwright nao encontrado em ${runtimeRoot}.`);
    console.error('Instale com: mkdir -p ~/.local/share/qa-browser-session && cd ~/.local/share/qa-browser-session && npm install @playwright/test');
    throw error;
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Falha ao ler config JSON ${filePath}: ${error.message}`);
  }
}

async function initProjectConfig({ stateRoot, configPath, args, projectRoot }) {
  await fs.mkdir(stateRoot, { recursive: true });
  await fs.mkdir(path.join(stateRoot, 'profiles'), { recursive: true });
  await fs.mkdir(path.join(stateRoot, 'runs'), { recursive: true });
  await fs.mkdir(path.join(stateRoot, 'knowledge'), { recursive: true });
  await fs.mkdir(path.join(stateRoot, 'knowledge', 'playbooks'), { recursive: true });
  await fs.mkdir(path.join(stateRoot, 'knowledge', 'drafts'), { recursive: true });

  const existingConfig = await readJsonIfExists(configPath);
  if (!Object.keys(existingConfig).length) {
    const project = sanitizeName(args.project || args.name || path.basename(projectRoot));
    const config = {
      project,
      defaultUrl: args.url || 'http://localhost:3000',
      defaultBrowser: args.browser || 'chrome',
      defaultProfile: 'default',
      outputDir: '.qa-browser/runs',
      profiles: {
        default: {
          url: args.url || 'http://localhost:3000',
          browser: args.browser || 'chrome',
          mode: 'manual'
        }
      },
      privacy: {
        artifactPolicy: 'local-only',
        avoidRealSensitiveData: true
      },
      capture: {
        harContent: 'omit',
        traceSources: false,
        traceScreenshots: true,
        traceSnapshots: true,
        video: true,
        screenshot: true
      },
      redaction: {
        enabled: true,
        sensitiveKeys: [
          'authorization',
          'cookie',
          'set-cookie',
          'password',
          'token',
          'secret',
          'jwt',
          'cpf',
          'cns'
        ]
      },
      retention: {
        maxRuns: 20,
        maxAgeDays: 14,
        autoPrune: false
      },
      playbooks: {
        requireConfirmation: true,
        stopOnFailure: true
      }
    };
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  const gitignorePath = path.join(stateRoot, '.gitignore');
  try {
    await fs.writeFile(gitignorePath, ['profiles/', 'runs/', 'knowledge/', '*.har', '*.webm', '*.zip', '*.png', ''].join('\n'), { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  console.log(`Config QA criada/verificada em: ${configPath}`);
  console.log(`Estado local do projeto em: ${stateRoot}`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      parsed._ = parsed._ || [];
      parsed._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function parseViewport(value) {
  if (!value) {
    return { width: 1366, height: 768 };
  }

  if (typeof value === 'object' && value.width && value.height) {
    return { width: Number(value.width), height: Number(value.height) };
  }

  const [width, height] = String(value).split('x').map((part) => Number(part));

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('Viewport invalido. Use o formato 1366x768.');
  }

  return { width, height };
}

function resolveCaptureOptions(config, profileConfig, args) {
  const merged = {
    ...(config.capture || {}),
    ...(profileConfig.capture || {})
  };

  return {
    harContent: args['har-content'] || merged.harContent || 'omit',
    traceSources: booleanOption(args['trace-sources'], merged.traceSources, false),
    traceScreenshots: booleanOption(args['trace-screenshots'], merged.traceScreenshots, true),
    traceSnapshots: booleanOption(args['trace-snapshots'], merged.traceSnapshots, true),
    video: booleanOption(args.video, merged.video, true),
    screenshot: booleanOption(args.screenshot, merged.screenshot, true),
    liveScreenshots: booleanOption(args['live-screenshots'], merged.liveScreenshots, true),
    liveScreenshotIntervalMs: Number(args['live-screenshot-interval-ms'] || merged.liveScreenshotIntervalMs || 15000),
    liveTraceChunks: booleanOption(args['live-trace-chunks'], merged.liveTraceChunks, true),
    liveTraceIntervalMs: Number(args['live-trace-interval-ms'] || merged.liveTraceIntervalMs || 30000)
  };
}

function resolveRedaction(config, profileConfig, args) {
  const merged = {
    ...(config.redaction || {}),
    ...(profileConfig.redaction || {})
  };
  const sensitiveKeys = merged.sensitiveKeys || [
    'authorization',
    'cookie',
    'set-cookie',
    'password',
    'token',
    'secret',
    'jwt',
    'cpf',
    'cns'
  ];

  return {
    enabled: booleanOption(args.redact, merged.enabled, true),
    sensitiveKeys,
    replacement: merged.replacement || '[REDACTED]'
  };
}

function resolveRetention(config, profileConfig, args) {
  const merged = {
    ...(config.retention || {}),
    ...(profileConfig.retention || {})
  };

  return {
    maxRuns: Number(args['max-runs'] || merged.maxRuns || 20),
    maxAgeDays: Number(args['max-age-days'] || merged.maxAgeDays || 14),
    dryRun: Boolean(args['dry-run'])
  };
}

function booleanOption(value, configured, fallback) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
  }
  if (typeof configured === 'boolean') return configured;
  return fallback;
}

function redactValue(value, redaction, key = '') {
  if (!redaction.enabled) return value;

  if (value == null) return value;

  if (isSensitiveKey(key, redaction)) {
    return redaction.replacement;
  }

  if (typeof value === 'string') {
    return redactString(value, redaction);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redaction, key));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, redaction, entryKey)
      ])
    );
  }

  return value;
}

function redactString(value, redaction) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${redaction.replacement}`)
    .replace(/\b(token|secret|password|jwt)=([^&\s]+)/gi, `$1=${redaction.replacement}`)
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, redaction.replacement);
}

function isSensitiveKey(key, redaction) {
  const normalized = String(key || '').toLowerCase();
  return redaction.sensitiveKeys.some((sensitiveKey) => normalized.includes(String(sensitiveKey).toLowerCase()));
}

async function redactJsonFile(filePath, redaction) {
  if (!redaction.enabled) return;

  const content = await fs.readFile(filePath, 'utf8');
  const json = JSON.parse(content);
  await fs.writeFile(filePath, `${JSON.stringify(redactValue(json, redaction), null, 2)}\n`);
}

async function pruneRuns(runsDir, retention) {
  let entries = [];
  try {
    entries = await fs.readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  const now = Date.now();
  const runDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(runsDir, entry.name);
    const stat = await fs.stat(fullPath);
    runDirs.push({ path: fullPath, name: entry.name, mtimeMs: stat.mtimeMs });
  }

  runDirs.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const maxAgeMs = retention.maxAgeDays * 24 * 60 * 60 * 1000;
  const toDelete = runDirs.filter((run, index) => index >= retention.maxRuns || now - run.mtimeMs > maxAgeMs);

  for (const run of toDelete) {
    if (retention.dryRun) {
      console.log(`[dry-run] removeria ${run.path}`);
    } else {
      await fs.rm(run.path, { recursive: true, force: true });
      console.log(`Removido run antigo: ${run.path}`);
    }
  }
}

async function loadPlaybook({ knowledgeRoot, playbookName, runtimeRoot }) {
  if (!playbookName) {
    throw new Error('Informe o playbook: qa-browser run-playbook <nome>.');
  }

  const candidates = [
    path.resolve(playbookName),
    path.join(knowledgeRoot, 'playbooks', playbookName),
    path.join(knowledgeRoot, 'playbooks', `${playbookName}.json`),
    path.join(knowledgeRoot, 'playbooks', `${playbookName}.yaml`),
    path.join(knowledgeRoot, 'playbooks', `${playbookName}.yml`)
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        const playbook = await readStructuredFile(candidate, runtimeRoot);
        validatePlaybook(playbook, candidate);
        return playbook;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  throw new Error(`Playbook "${playbookName}" nao encontrado em ${path.join(knowledgeRoot, 'playbooks')}.`);
}

async function loadSelectors(knowledgeRoot, runtimeRoot) {
  const candidates = [
    path.join(knowledgeRoot, 'selectors.json'),
    path.join(knowledgeRoot, 'selectors.yaml'),
    path.join(knowledgeRoot, 'selectors.yml')
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return await readStructuredFile(candidate, runtimeRoot);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return {};
}

async function readStructuredFile(filePath, runtimeRoot) {
  const content = await fs.readFile(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  }

  if (ext === '.yaml' || ext === '.yml') {
    const yaml = loadOptionalRuntimeModule('yaml', runtimeRoot);
    if (!yaml) {
      throw new Error(`Para ler YAML, instale no runtime: cd ${runtimeRoot} && npm install yaml. JSON funciona sem dependencia extra.`);
    }
    return yaml.parse(content);
  }

  throw new Error(`Formato nao suportado: ${filePath}. Use .json, .yaml ou .yml.`);
}

function loadOptionalRuntimeModule(name, runtimeRoot) {
  try {
    const requireFromRuntime = createRequire(path.join(runtimeRoot, 'package.json'));
    return requireFromRuntime(name);
  } catch {
    return null;
  }
}

function validatePlaybook(playbook, filePath) {
  if (!playbook || typeof playbook !== 'object') {
    throw new Error(`Playbook invalido em ${filePath}: esperado objeto.`);
  }
  if (!Array.isArray(playbook.steps) || playbook.steps.length === 0) {
    throw new Error(`Playbook invalido em ${filePath}: steps deve ser uma lista nao vazia.`);
  }
  for (const [index, step] of playbook.steps.entries()) {
    if (!step || typeof step !== 'object' || !step.action) {
      throw new Error(`Playbook invalido em ${filePath}: step ${index + 1} precisa de action.`);
    }
  }
}

function printPlaybookPlan(playbook) {
  console.log('');
  console.log('Plano do playbook:');
  if (playbook.description) {
    console.log(`  ${playbook.description}`);
  }
  for (const [index, step] of playbook.steps.entries()) {
    const target = step.selector || step.selectorRef || step.url || step.text || step.name || '';
    console.log(`  ${index + 1}. ${step.action}${target ? ` -> ${target}` : ''}`);
  }
  console.log('');
}

async function runPlaybook({ page, playbook, selectors, events, addEvent, runDir, playbookResultPath, redaction, args }) {
  const startedAt = new Date();
  const result = {
    id: playbook.id || sanitizeName(playbook.name || 'playbook'),
    name: playbook.name || playbook.id || 'playbook',
    description: playbook.description || null,
    startedAt: startedAt.toISOString(),
    endedAt: null,
    status: 'running',
    steps: []
  };

  addEvent('playbook-started', {
    id: result.id,
    name: result.name,
    stepCount: playbook.steps.length
  });

  const stopOnFailure = playbook.stopOnFailure !== false && args['stop-on-failure'] !== 'false';

  for (const [index, step] of playbook.steps.entries()) {
    const stepResult = await runPlaybookStep({ page, step, selectors, index, events, addEvent, runDir, redaction });
    result.steps.push(stepResult);
    if (stepResult.status !== 'passed' && stopOnFailure) break;
  }

  const failed = result.steps.some((step) => step.status !== 'passed');
  result.status = failed ? 'failed' : 'passed';
  result.endedAt = new Date().toISOString();
  result.durationMs = Date.parse(result.endedAt) - Date.parse(result.startedAt);

  await fs.writeFile(playbookResultPath, `${JSON.stringify(redactValue(result, redaction), null, 2)}\n`);
  addEvent('playbook-ended', {
    id: result.id,
    status: result.status,
    passedSteps: result.steps.filter((step) => step.status === 'passed').length,
    failedSteps: result.steps.filter((step) => step.status !== 'passed').length,
    resultPath: playbookResultPath
  });

  return result;
}

async function runPlaybookStep({ page, step, selectors, index, events, addEvent, runDir, redaction }) {
  const startedAt = new Date();
  const stepName = step.name || `${step.action}-${index + 1}`;
  const stepResult = {
    index: index + 1,
    name: stepName,
    action: step.action,
    status: 'running',
    startedAt: startedAt.toISOString(),
    endedAt: null,
    error: null
  };

  addEvent('playbook-step-started', {
    index: stepResult.index,
    name: stepName,
    action: step.action,
    selector: step.selector || step.selectorRef,
    url: step.url
  });

  try {
    await executeAction({ page, step, selectors, events, runDir });
    stepResult.status = 'passed';
  } catch (error) {
    stepResult.status = 'failed';
    stepResult.error = {
      message: error.message,
      stack: error.stack
    };
  }

  stepResult.endedAt = new Date().toISOString();
  stepResult.durationMs = Date.parse(stepResult.endedAt) - Date.parse(stepResult.startedAt);

  addEvent('playbook-step-ended', redactValue({
    index: stepResult.index,
    name: stepName,
    action: step.action,
    status: stepResult.status,
    error: stepResult.error
  }, redaction));

  return redactValue(stepResult, redaction);
}

async function executeAction({ page, step, selectors, events, runDir }) {
  const timeout = Number(step.timeout || 10000);
  const selector = step.selector || resolveSelectorRef(step.selectorRef, selectors);

  if (step.action === 'goto') {
    if (!step.url) throw new Error('goto exige url.');
    await page.goto(step.url, { waitUntil: step.waitUntil || 'domcontentloaded', timeout });
    return;
  }

  if (step.action === 'click') {
    if (!selector) throw new Error('click exige selector ou selectorRef.');
    await page.locator(selector).click({ timeout });
    return;
  }

  if (step.action === 'fill') {
    if (!selector) throw new Error('fill exige selector ou selectorRef.');
    const value = resolveStepValue(step);
    await page.locator(selector).fill(value, { timeout });
    return;
  }

  if (step.action === 'press') {
    if (!selector) throw new Error('press exige selector ou selectorRef.');
    if (!step.key) throw new Error('press exige key.');
    await page.locator(selector).press(step.key, { timeout });
    return;
  }

  if (step.action === 'waitForSelector') {
    if (!selector) throw new Error('waitForSelector exige selector ou selectorRef.');
    await page.locator(selector).waitFor({ state: step.state || 'visible', timeout });
    return;
  }

  if (step.action === 'waitForURL') {
    if (!step.url) throw new Error('waitForURL exige url.');
    await page.waitForURL(step.url, { timeout });
    return;
  }

  if (step.action === 'waitForLoadState') {
    await page.waitForLoadState(step.state || 'domcontentloaded', { timeout });
    return;
  }

  if (step.action === 'expectTitle') {
    const title = await page.title();
    assertTextExpectation(title, step, 'title');
    return;
  }

  if (step.action === 'expectURL') {
    assertTextExpectation(page.url(), step, 'url');
    return;
  }

  if (step.action === 'expectText') {
    if (!selector) throw new Error('expectText exige selector ou selectorRef.');
    const text = await page.locator(selector).first().innerText({ timeout });
    assertTextExpectation(text, step, 'text');
    return;
  }

  if (step.action === 'expectNoErrors') {
    const counts = countBy(events, (event) => event.type);
    const failedRequests = counts.requestfailed || 0;
    const pageErrors = counts.pageerror || 0;
    const httpErrors = counts['http-error'] || 0;
    const allowedConsole = new Set(step.allowConsoleLevels || ['verbose', 'info', 'log', 'warning']);
    const consoleErrors = events.filter((event) => event.type === 'console' && !allowedConsole.has(event.level)).length;
    if (failedRequests || pageErrors || httpErrors || consoleErrors) {
      throw new Error(`Eventos de erro encontrados: failedRequests=${failedRequests}, pageErrors=${pageErrors}, httpErrors=${httpErrors}, consoleErrors=${consoleErrors}.`);
    }
    return;
  }

  if (step.action === 'screenshot') {
    const name = sanitizeName(step.name || `step-${Date.now()}`);
    const screenshotPath = path.join(runDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: step.fullPage !== false });
    return;
  }

  throw new Error(`Action nao suportada: ${step.action}.`);
}

function resolveSelectorRef(selectorRef, selectors) {
  if (!selectorRef) return null;
  const pathParts = String(selectorRef).replace(/^@/, '').split('.');
  let current = selectors;
  for (const part of pathParts) {
    current = current?.[part];
  }
  if (!current || typeof current !== 'string') {
    throw new Error(`selectorRef nao encontrado: ${selectorRef}.`);
  }
  return current;
}

function resolveStepValue(step) {
  if (Object.prototype.hasOwnProperty.call(step, 'value')) {
    return String(step.value);
  }
  if (step.valueEnv) {
    const value = process.env[step.valueEnv];
    if (value == null) throw new Error(`Variavel de ambiente ausente: ${step.valueEnv}.`);
    return value;
  }
  throw new Error('fill exige value ou valueEnv.');
}

function assertTextExpectation(actual, step, label) {
  if (Object.prototype.hasOwnProperty.call(step, 'equals') && actual !== step.equals) {
    throw new Error(`${label} esperado "${step.equals}", recebido "${actual}".`);
  }
  if (Object.prototype.hasOwnProperty.call(step, 'contains') && !actual.includes(step.contains)) {
    throw new Error(`${label} deveria conter "${step.contains}", recebido "${actual}".`);
  }
  if (Object.prototype.hasOwnProperty.call(step, 'matches')) {
    const regex = new RegExp(step.matches);
    if (!regex.test(actual)) {
      throw new Error(`${label} deveria casar com /${step.matches}/, recebido "${actual}".`);
    }
  }
}

async function learnPlaybookDraft({ projectRoot, stateRoot, config, profileConfig, args, redaction }) {
  const runsDir = path.resolve(projectRoot, args.output || args.o || profileConfig.outputDir || config.outputDir || path.join(stateRoot, 'runs'));
  const runDir = await resolveRunDir(runsDir, args['from-run']);
  const summary = await readJsonIfExists(path.join(runDir, 'summary.json'));
  const events = await readJsonIfExists(path.join(runDir, 'events.json'));
  const draftRoot = path.join(stateRoot, 'knowledge', 'drafts');
  await fs.mkdir(draftRoot, { recursive: true });

  const navigationEvents = Array.isArray(events) ? events.filter((event) => event.type === 'navigation') : [];
  const baseUrl = summary.baseUrl || navigationEvents[0]?.url || config.defaultUrl || profileConfig.url || null;
  const draft = redactValue({
    id: `${timestampForPath(new Date())}-learned-draft`,
    name: `Draft from ${path.basename(runDir)}`,
    description: 'Rascunho gerado por qa-browser learn. Revise seletores e expectativas antes de promover para playbooks/.',
    sourceRun: runDir,
    url: baseUrl,
    stopOnFailure: true,
    steps: [
      ...(baseUrl ? [{ action: 'goto', url: baseUrl, waitUntil: 'domcontentloaded' }] : []),
      { action: 'waitForLoadState', state: 'domcontentloaded' },
      { action: 'expectNoErrors' },
      { action: 'screenshot', name: 'learned-draft-final', fullPage: true }
    ],
    observations: {
      eventCounts: summary.counts || {},
      navigations: navigationEvents.map((event) => event.url)
    }
  }, redaction);

  const draftPath = path.join(draftRoot, `${draft.id}.json`);
  await fs.writeFile(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
  return draftPath;
}

async function resolveRunDir(runsDir, requested) {
  if (requested) {
    const direct = path.resolve(requested);
    try {
      const stat = await fs.stat(direct);
      if (stat.isDirectory()) return direct;
    } catch {}
    return path.join(runsDir, requested);
  }

  const entries = await fs.readdir(runsDir, { withFileTypes: true });
  const runDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(runsDir, entry.name);
    const stat = await fs.stat(fullPath);
    runDirs.push({ path: fullPath, mtimeMs: stat.mtimeMs });
  }
  runDirs.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!runDirs.length) throw new Error(`Nenhum run encontrado em ${runsDir}.`);
  return runDirs[0].path;
}

function resolveBrowserTarget(value) {
  const requested = String(value).trim().toLowerCase();
  const aliases = {
    google: 'chrome',
    'google-chrome': 'chrome',
    edge: 'msedge',
    'microsoft-edge': 'msedge',
    safari: 'webkit'
  };
  const browserName = aliases[requested] || requested;

  if (browserName === 'chromium') {
    return { name: 'chromium', type: chromium, channel: undefined, supportsCdp: true };
  }

  if (browserName === 'chrome') {
    return { name: 'chrome', type: chromium, channel: 'chrome', supportsCdp: true };
  }

  if (browserName === 'chrome-beta' || browserName === 'chrome-dev' || browserName === 'chrome-canary') {
    return { name: browserName, type: chromium, channel: browserName, supportsCdp: true };
  }

  if (browserName === 'msedge' || browserName === 'msedge-beta' || browserName === 'msedge-dev') {
    return { name: browserName, type: chromium, channel: browserName, supportsCdp: true };
  }

  if (browserName === 'firefox') {
    return { name: 'firefox', type: firefox, channel: undefined, supportsCdp: false };
  }

  if (browserName === 'webkit') {
    return { name: 'webkit', type: webkit, channel: undefined, supportsCdp: false };
  }

  throw new Error(`Browser invalido: ${value}. Use chromium, chrome, msedge, firefox ou webkit.`);
}

function resolveProfileDir({ args, projectName, mode, stateRoot, profileName }) {
  if (args['profile-dir']) {
    return path.resolve(String(args['profile-dir']));
  }

  if (args.persist || mode === 'assisted') {
    return path.join(stateRoot, 'profiles', sanitizeName(profileName || projectName));
  }

  return null;
}

function buildSummary({
  startedAt,
  endedAt,
  baseUrl,
  projectName,
  browser,
  browserChannel,
  headless,
  mode,
  profileDir,
  remoteDebuggingPort,
  playbook,
  playbookResult,
  capture,
  redaction,
  viewport,
  runDir,
  tracePath,
  harPath,
  eventsPath,
  transcriptPath,
  playbookResultPath,
  finalScreenshotPath,
  liveScreenshotDir,
  liveTraceDir,
  events
}) {
  const byType = countBy(events, (event) => event.type);
  const consoleByLevel = countBy(
    events.filter((event) => event.type === 'console'),
    (event) => event.level || 'unknown'
  );

  return {
    projectName,
    baseUrl,
    browser,
    browserChannel,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    mode: headless ? 'headless' : 'headed',
    sessionMode: mode,
    profileDir,
    remoteDebuggingPort: remoteDebuggingPort ? Number(remoteDebuggingPort) : null,
    playbook: playbook ? {
      id: playbook.id || null,
      name: playbook.name || null,
      status: playbookResult?.status || 'not-run'
    } : null,
    capture,
    redaction: {
      enabled: redaction.enabled,
      sensitiveKeys: redaction.sensitiveKeys
    },
    viewport,
    counts: {
      totalEvents: events.length,
      byType,
      consoleByLevel,
      httpErrors: byType['http-error'] || 0,
      pageErrors: byType.pageerror || 0,
      failedRequests: byType.requestfailed || 0
    },
    artifacts: {
      runDir,
      tracePath,
      harPath,
      eventsPath,
      transcriptPath,
      playbookResultPath,
      finalScreenshotPath,
      liveScreenshotDir,
      liveTraceDir,
      videoDir: path.join(runDir, 'videos')
    },
    aiReviewPrompt: [
      'Analise esta sessao de QA como um revisor tecnico.',
      'Priorize bugs reproduziveis, falhas de rede, erros de console, comportamento quebrado e riscos de dados sensiveis.',
      'Use summary.json, events.json, network.har, trace.zip, videos e screenshots como evidencias.',
      'Responda com: achados por severidade, passos de reproducao, evidencias, hipoteses de causa raiz e proximos testes.'
    ].join(' ')
  };
}

function buildTranscript(summary, events) {
  return [
    {
      type: 'session_summary',
      ts: summary.endedAt,
      data: summary
    },
    ...events.map((event) => ({
      type: 'event',
      ts: event.ts,
      data: event
    }))
  ];
}

function toJsonl(records) {
  return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function timestampForPath(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sanitizeName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'qa-session';
}

function hostNameFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return 'qa-session';
  }
}

function printHelp() {
  console.log(`
Uso:
  qa-browser init --project meu-projeto --url https://homolog.exemplo.com
  qa-browser manual --profile default
  qa-browser assisted --profile default --remote-debugging-port 9333
  qa-browser run-playbook smoke-auth --profile default
  qa-browser learn --from-run ultimo-run
  qa-browser prune --max-runs 20 --max-age-days 14
  node scripts/qa-browser.mjs manual --url http://localhost:3000 --project meu-projeto

Opcoes:
  --url <url>           URL inicial da homologacao. Tambem aceita QA_URL/config.
  --name <nome>         Nome do projeto usado no diretorio de evidencias.
  --project <nome>      Nome canonico do projeto.
  --profile <nome>      Perfil local em .qa-browser/config.json.
  --browser <browser>   chromium, chrome, msedge, firefox ou webkit. Padrao: chromium.
  --output <dir>        Diretorio de saida. Padrao: .qa-browser/runs.
  --viewport <WxH>      Tamanho da janela. Padrao: 1366x768.
  --duration <segundos> Encerra automaticamente apos N segundos.
  --headless            Roda sem janela visual, util para CI.
  --mode <modo>         manual, assisted ou headless. Padrao: manual/headless.
  --persist             Preserva cookies/localStorage em .qa-browser/profiles/<projeto>.
  --profile-dir <dir>   Diretorio de perfil persistente customizado.
  --state-dir <dir>     Diretorio local do projeto. Padrao: .qa-browser.
  --config <arquivo>    Config JSON. Padrao: .qa-browser/config.json.
  --knowledge-dir <dir> Diretorio de playbooks/selectors. Padrao: .qa-browser/knowledge.
  --runtime-dir <dir>   Runtime Node/Playwright. Padrao: ~/.local/share/qa-browser-session.
  --playbook <nome>     Nome/caminho do playbook para run-playbook.
  --from-run <dir>      Run usado pelo learn. Padrao: run mais recente.
  --stop-on-failure     Para playbook na primeira falha. Padrao: true.
  --create-profile      Permite usar/criar profile nao declarado no config.
  --har-content <modo>  omit, embed ou attach. Padrao: omit.
  --trace-sources       Inclui source no trace. Padrao: false.
  --redact <bool>       Redige eventos/HAR. Padrao: true.
  --max-runs <n>        Retencao para prune. Padrao: 20.
  --max-age-days <n>    Retencao por idade. Padrao: 14.
  --dry-run             Simula prune sem remover.
  --remote-debugging-port <porta>
                         Abre CDP para agente anexar na mesma sessao.
  --timeout <ms>        Timeout do carregamento inicial. Padrao: 60000.

Artefatos gerados:
  summary.json          Resumo da sessao e prompt de revisao por IA.
  ai-transcript.jsonl   Eventos estruturados para LLM/RAG.
  events.json           Console, erros de pagina, navegacoes e falhas HTTP.
  network.har           Requisicoes/respostas em formato HAR.
  trace.zip             Trace Playwright para abrir com npx playwright show-trace.
  videos/               Gravacao webm da sessao.
  final-screenshot.png  Screenshot final full-page.
`);
}
