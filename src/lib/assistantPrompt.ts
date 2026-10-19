import type { Product } from '../types';

/**
 * The prompt the Tech Advisor chat sends to /api/gemini-chat.
 *
 * The widget used to put the WHOLE catalogue (every product, in stock or not)
 * and every spec sheet its question happened to match into one prompt: about
 * 7,600 characters at 133 products, against a server cap of 2,000. Every
 * question therefore got a 400 and the widget answered "technical glitch".
 * This builds a prompt that stays small however big the catalogue grows: only
 * what is for sale, only the models the question is about, and a hard ceiling
 * that sheds detail rather than failing.
 */

/** Longest question we pass on. */
export const ASSISTANT_QUESTION_MAX = 500;
/** The server refuses more than 8,000 characters (api/_routes/gemini-chat.ts); this leaves a margin. */
export const ASSISTANT_PROMPT_MAX = 6000;

/** Catalogue lines in one prompt, relevant models first. */
const MAX_CATALOGUE_LINES = 40;
/** Spec sheets in one prompt: each is about 1.5 KB even trimmed. */
const MAX_SPEC_SHEETS = 2;
/** The groups worth quoting; Network bands and Comms read as noise to a shopper. */
const SPEC_GROUPS = ['Launch', 'Body', 'Display', 'Platform', 'Memory', 'Main Camera', 'Selfie camera', 'Battery'];

export interface SpecEntry { model: string; specs: Record<string, unknown> }

/** Words that say nothing about WHICH device the shopper means. */
const STOP_WORDS = new Set(['any', 'the', 'you', 'have', 'got', 'for', 'and', 'with', 'what', 'which', 'are', 'can', 'does', 'this', 'that', 'your', 'how', 'much', 'sell', 'stock', 'there', 'about', 'tell', 'show', 'best', 'good', 'cheap', 'cheapest']);

/**
 * The words in a question that could name a device, each with its singular:
 * "watches" must find the Watch, "tablets" the Tab and "ipads" the iPad.
 */
export const questionStems = (text: string): string[][] =>
  text.toLowerCase().split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
    .map(word => [...new Set([word, word.replace(/es$/, ''), word.replace(/s$/, '')])].filter(stem => stem.length >= 3));

/** The spec sheets the question is about: its text contains the model name, or is a clear part of it. */
export function relevantSpecs(question: string, specs: SpecEntry[]): SpecEntry[] {
  const q = question.trim().toLowerCase();
  if (!q) return [];
  return specs
    .filter(entry => {
      const model = entry.model.toLowerCase();
      // The second test lets "iphone 15 pro max" find "Apple iPhone 15 Pro Max"; the
      // length floor stops "a" or "pro" from matching every sheet.
      return q.includes(model) || (q.length >= 4 && model.includes(q));
    })
    .slice(0, MAX_SPEC_SHEETS);
}

function specSummary(entry: SpecEntry): string {
  const lines: string[] = [];
  for (const group of SPEC_GROUPS) {
    const values = entry.specs[group];
    if (!values || typeof values !== 'object') continue;
    const pairs = Object.entries(values as Record<string, unknown>)
      .filter(([key, value]) => key && typeof value === 'string' && value)
      .map(([key, value]) => `${key}: ${value}`);
    if (pairs.length) lines.push(`${group} - ${pairs.join('; ')}`);
  }
  return `MODEL: ${entry.model}\n${lines.join('\n')}`;
}

/** What is for sale, one line per model (the cheapest unit), the ones the question names first. */
export function catalogueLines(question: string, products: Product[]): { lines: string[]; more: number } {
  const wanted = questionStems(question);
  const cheapest = new Map<string, Product>();
  for (const product of products) {
    if (!(product.stock > 0)) continue;
    const key = `${product.brand} ${product.model}`.toLowerCase();
    const seen = cheapest.get(key);
    if (!seen || product.price < seen.price) cheapest.set(key, product);
  }

  const ranked = [...cheapest.values()]
    .map(product => {
      // The category too, so "any watches?" or "tablets" finds them although no
      // model is called that.
      const name = `${product.brand} ${product.model} ${product.category ?? ''}`.toLowerCase();
      return { product, score: wanted.filter(stems => stems.some(stem => name.includes(stem))).length };
    })
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  const shown = ranked.slice(0, MAX_CATALOGUE_LINES);
  return {
    lines: shown.map(({ product }) =>
      `${product.brand} ${product.model}: from £${product.price}${product.grade ? `, grade ${product.grade}` : ''}`),
    more: ranked.length - shown.length,
  };
}

export function buildAssistantPrompt(input: { question: string; products: Product[]; specs: SpecEntry[] }): string {
  const question = input.question.trim().slice(0, ASSISTANT_QUESTION_MAX);
  let sheets = relevantSpecs(question, input.specs).map(specSummary);
  const { lines, more } = catalogueLines(question, input.products);
  let shownLines = lines;

  const assemble = (): string => `You are the Tech Advisor for "LeHart", a UK shop selling refurbished phones, tablets and watches.
Help shoppers choose a device. Only answer questions about phones, tablets, watches, accessories and shopping at LeHart; politely decline anything else.

IN STOCK NOW (cheapest unit of each model):
${shownLines.join('\n') || 'Nothing matching is in stock right now.'}${more > 0 && shownLines.length === lines.length ? `\n(and ${more} more models in stock)` : ''}

${sheets.length ? `SPECIFICATIONS (GSMArena):\n${sheets.join('\n---\n')}` : 'No spec sheet matched: use your general knowledge for specifications and say when you are unsure.'}

SHOPPER'S QUESTION: ${question}

RULES:
1. Be concise, friendly and accurate; plain text, no markdown unless a list really helps.
2. Quote prices and grades only from the list above; never invent a price, a stock level or a discount.
3. The list can be partial. If a model is not in it, do NOT say it is out of stock: say you cannot see it in the list you have and suggest searching the shop or asking the support team.`;

  // Shed detail, never fail: spec sheets go first (the biggest), then catalogue lines.
  let prompt = assemble();
  while (prompt.length > ASSISTANT_PROMPT_MAX && sheets.length > 0) {
    sheets = sheets.slice(0, -1);
    prompt = assemble();
  }
  while (prompt.length > ASSISTANT_PROMPT_MAX && shownLines.length > 0) {
    shownLines = shownLines.slice(0, Math.max(0, shownLines.length - 5));
    prompt = assemble();
  }
  return prompt;
}
