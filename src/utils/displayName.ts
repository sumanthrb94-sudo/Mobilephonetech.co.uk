/**
 * A product's name as shoppers read it: brand then model, without saying the
 * brand twice when the model already starts with it ("Apple Watch Ultra 2",
 * not "Apple Apple Watch Ultra 2").
 */
export function displayName(brand: string, model: string): string {
  const b = (brand ?? '').trim();
  const m = (model ?? '').trim();
  if (!b) return m;
  return m.toLowerCase().startsWith(b.toLowerCase() + ' ') || m.toLowerCase() === b.toLowerCase() ? m : `${b} ${m}`;
}
