import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @google/genai before importing handler
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

const { default: handler } = await import('../../../api/_routes/gemini-chat');

let ipCounter = 0;
function req(method: string, body: unknown = {}, ip?: string) {
  // A distinct IP per test by default: the rate limiter keeps in-memory
  // state keyed by IP, and a shared key would let one test's calls trip the
  // next test's limit. Pass a fixed ip to exercise the limit on purpose.
  const addr = ip ?? `10.0.0.${++ipCounter}`;
  return { method, body, headers: { 'x-forwarded-for': addr }, socket: { remoteAddress: addr } };
}
function res() {
  let _code = 200;
  let _body: unknown = null;
  return {
    get statusCode() { return _code; },
    get body() { return _body; },
    setHeader() { return this; },
    status(code: number) { _code = code; return this; },
    json(data: unknown) { _body = data; return this; },
  };
}

describe('POST /api/gemini-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it('returns 405 for GET requests', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 405 for PUT requests', async () => {
    const r = res();
    await handler(req('PUT'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 503 when GEMINI_API_KEY is not set', async () => {
    const r = res();
    await handler(req('POST', { prompt: 'Hello' }), r);
    expect(r.statusCode).toBe(503);
    expect((r.body as any).error).toContain('configured');
  });

  it('returns 400 when prompt is missing', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const r = res();
    await handler(req('POST', {}), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('prompt');
  });

  it('returns 400 when prompt is empty string', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const r = res();
    await handler(req('POST', { prompt: '   ' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 when prompt is not a string', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const r = res();
    await handler(req('POST', { prompt: 42 }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 200 with text from Gemini on success', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValueOnce({ text: 'Here is your answer.' });
    const r = res();
    await handler(req('POST', { prompt: 'What is the best refurb phone?' }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as any).text).toBe('Here is your answer.');
  });

  it('returns 200 with empty string when Gemini returns null text', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValueOnce({ text: null });
    const r = res();
    await handler(req('POST', { prompt: 'Question?' }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as any).text).toBe('');
  });

  it('returns 500 when Gemini throws an error', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValueOnce(new Error('API limit exceeded'));
    const r = res();
    await handler(req('POST', { prompt: 'Hello' }), r);
    expect(r.statusCode).toBe(500);
    expect((r.body as any).error).toContain('AI service error');
  });

  // ── Cost-DoS guards ──────────────────────────────────────────
  // The route spends money per call and took no account of who was calling
  // or how often: an unmetered public endpoint fronted by our paid key.
  it('rate-limits a single IP after the eleventh call in a window', async () => {
    process.env.GEMINI_API_KEY = 'k';
    mockGenerateContent.mockResolvedValue({ text: 'ok' });
    const IP = '203.0.113.9';

    let last;
    for (let i = 0; i < 11; i++) {
      last = res();
      await handler(req('POST', { prompt: 'hi' }, IP), last);
    }
    expect(last!.statusCode).toBe(429);
  });

  it('refuses a prompt longer than the cap without calling the model', async () => {
    process.env.GEMINI_API_KEY = 'k';
    const r = res();
    await handler(req('POST', { prompt: 'x'.repeat(2001) }), r);
    expect(r.statusCode).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rate-limits before the key check, so a probe cannot detect config', async () => {
    // No GEMINI_API_KEY set. The limiter must run first, or the 503/200
    // difference tells an attacker whether the key exists.
    const IP = '203.0.113.10';
    let last;
    for (let i = 0; i < 11; i++) {
      last = res();
      await handler(req('POST', { prompt: 'hi' }, IP), last);
    }
    expect(last!.statusCode).toBe(429);
  });
});