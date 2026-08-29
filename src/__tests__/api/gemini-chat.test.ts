import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @google/genai before importing handler
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

const { default: handler } = await import('../../../api/_routes/gemini-chat');

function req(method: string, body: unknown = {}) {
  return { method, body };
}
function res() {
  let _code = 200;
  let _body: unknown = null;
  return {
    get statusCode() { return _code; },
    get body() { return _body; },
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
});
