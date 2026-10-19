import { describe, it, expect } from 'vitest';
import {
  buildAssistantPrompt, catalogueLines, relevantSpecs,
  ASSISTANT_PROMPT_MAX, ASSISTANT_QUESTION_MAX, type SpecEntry,
} from '../../lib/assistantPrompt';
import type { Product } from '../../types';

const product = (over: Partial<Product>): Product => ({
  id: 'p', brand: 'Apple', model: 'iPhone 13', category: 'Phones', price: 400, originalPrice: 700,
  grade: 'Good', stock: 3, imageUrl: '', ...over,
}) as Product;

/** Four 3.5 KB sheets, like the real dataset. */
const specs: SpecEntry[] = ['Apple iPhone 15 Pro Max', 'Apple iPhone 14 Pro', 'Apple iPhone 13', 'Apple iPhone 12 Pro'].map(model => ({
  model,
  specs: {
    Network: { Technology: 'GSM / 5G', Bands: 'x'.repeat(900) },
    Display: { Type: 'LTPO Super Retina XDR OLED', Size: '6.7 inches' },
    Battery: { Type: 'Li-Ion 4441 mAh' },
    Comms: { Wlan: 'Wi-Fi 6E', NFC: 'Yes' },
  },
}));

const bigCatalogue = Array.from({ length: 160 }, (_, i) =>
  product({ id: `p${i}`, brand: i % 2 ? 'Samsung' : 'Apple', model: `Model ${i} Ultra Pro Max Plus`, price: 100 + i }));

describe('buildAssistantPrompt', () => {
  it('stays under the ceiling with a 160-product catalogue and every spec sheet matching', () => {
    // The old prompt was ~7,600 characters at 133 products against a 2,000 cap, so every question failed.
    const prompt = buildAssistantPrompt({ question: 'iphone', products: bigCatalogue, specs });
    expect(prompt.length).toBeLessThanOrEqual(ASSISTANT_PROMPT_MAX);
    expect(ASSISTANT_PROMPT_MAX).toBeLessThanOrEqual(8000 - 1000);
  });

  it('lists only what is in stock', () => {
    const prompt = buildAssistantPrompt({
      question: 'any phones?',
      products: [product({ model: 'iPhone 13', stock: 2 }), product({ model: 'iPhone 8', stock: 0 })],
      specs: [],
    });
    expect(prompt).toContain('iPhone 13');
    expect(prompt).not.toContain('iPhone 8');
  });

  it('puts the models the question names first and shows the cheapest unit of each', () => {
    const { lines } = catalogueLines('galaxy s23', [
      product({ brand: 'Apple', model: 'iPhone 13', price: 300 }),
      product({ brand: 'Samsung', model: 'Galaxy S23', price: 450 }),
      product({ brand: 'Samsung', model: 'Galaxy S23', price: 380 }),
    ]);
    expect(lines[0]).toContain('Galaxy S23: from £380');
    expect(lines).toHaveLength(2);
  });

  it('truncates a very long question', () => {
    const prompt = buildAssistantPrompt({ question: 'q'.repeat(5000), products: [], specs: [] });
    expect(prompt.match(/q+/g)!.sort((a, b) => b.length - a.length)[0].length).toBe(ASSISTANT_QUESTION_MAX);
  });

  it('says so when nothing is in stock rather than leaving a blank list', () => {
    expect(buildAssistantPrompt({ question: 'hi', products: [], specs: [] })).toContain('Nothing matching is in stock');
  });
});

describe('relevantSpecs', () => {
  it('matches a model named in the question, with a cap of two sheets', () => {
    expect(relevantSpecs('compare the iphone 14 pro and Apple iPhone 13 and apple iphone 12 pro', specs)).toHaveLength(2);
  });

  it('matches a clear part of a model name', () => {
    expect(relevantSpecs('iphone 15 pro max', specs).map(s => s.model)).toEqual(['Apple iPhone 15 Pro Max']);
  });

  it('does not match every sheet for a short fragment', () => {
    expect(relevantSpecs('pro', specs)).toEqual([]);
    expect(relevantSpecs('a', specs)).toEqual([]);
  });

  it('quotes shopper-relevant groups and leaves out radio bands', () => {
    const prompt = buildAssistantPrompt({ question: 'apple iphone 13', products: [], specs });
    expect(prompt).toContain('Display - Type: LTPO Super Retina XDR OLED');
    expect(prompt).toContain('Battery - Type: Li-Ion 4441 mAh');
    expect(prompt).not.toContain('xxxxxxxx');
    expect(prompt).not.toContain('Wi-Fi 6E');
  });
});
