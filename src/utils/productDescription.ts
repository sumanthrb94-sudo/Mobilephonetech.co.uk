import type { Product } from '../types';

export function generateProductDescription(product: Product): string {
  const { brand, model, specs, category, grade, batteryHealth } = product;
  const cat = (category || '').toLowerCase();

  // Pull key spec tokens for use in sentences
  const display = specs?.displaySize ? `${specs.displaySize} ${specs.display || 'display'}` : null;
  const chip = specs?.chip || specs?.processor || null;
  const camera = specs?.mainCamera ? `${specs.mainCamera} camera system` : null;
  const battery = specs?.battery || null;
  const ram = specs?.ram || null;
  const network = specs?.network?.includes('5G') ? '5G' : specs?.network?.includes('4G') ? '4G' : null;
  const os = specs?.os || null;

  const conditionPhrase = grade
    ? grade === 'Pristine'
      ? 'in pristine, like-new condition'
      : grade === 'Excellent'
        ? 'in excellent cosmetic condition'
        : grade === 'Good'
          ? 'in good working order with light signs of use'
          : 'in fair condition with some cosmetic wear'
    : 'fully tested and certified';

  const healthNote = batteryHealth && batteryHealth >= 85
    ? ` Battery health is ${batteryHealth}%.`
    : batteryHealth
      ? ` Battery health ${batteryHealth}%.`
      : '';

  // Category-specific description templates
  if (cat === 'phones' || brand === 'Apple' || brand === 'Samsung' || brand === 'Google') {
    const parts: string[] = [];

    parts.push(
      `The ${brand} ${model} is a refurbished smartphone supplied ${conditionPhrase}.`
    );

    const highlights: string[] = [];
    if (display) highlights.push(`a ${display}`);
    if (chip) highlights.push(`${chip} performance`);
    if (camera) highlights.push(`a ${camera}`);
    if (network) highlights.push(`${network} connectivity`);
    if (ram) highlights.push(`${ram} RAM`);

    if (highlights.length > 0) {
      parts.push(
        `It features ${highlights.slice(0, 3).join(', ')}${highlights.length > 3 ? ', and more' : ''}.`
      );
    }

    if (battery) {
      parts.push(`Powered by a ${battery} battery.${healthNote}`);
    } else if (healthNote) {
      parts.push(healthNote.trim());
    }

    parts.push(
      `Every unit is independently tested, unlocked for all UK networks, and comes with a 12-month warranty and 30-day free returns.`
    );

    return parts.join(' ');
  }

  if (cat === 'tablets' || model.toLowerCase().includes('ipad') || model.toLowerCase().includes('tab')) {
    const parts: string[] = [
      `The ${brand} ${model} is a refurbished tablet supplied ${conditionPhrase}.`,
    ];
    const highlights: string[] = [];
    if (display) highlights.push(`a ${display}`);
    if (chip) highlights.push(`${chip} chipset`);
    if (os) highlights.push(`${os}`);
    if (highlights.length > 0) {
      parts.push(`It features ${highlights.slice(0, 3).join(', ')}.`);
    }
    parts.push(`Independently tested and covered by a 12-month warranty.`);
    return parts.join(' ');
  }

  if (cat === 'computing' || model.toLowerCase().includes('macbook') || model.toLowerCase().includes('laptop')) {
    const parts: string[] = [
      `The ${brand} ${model} is a refurbished laptop supplied ${conditionPhrase}.`,
    ];
    if (chip) parts.push(`Powered by ${chip}.`);
    if (ram) parts.push(`Configured with ${ram} RAM.`);
    parts.push(`Tested and certified — ready to use out of the box, backed by a 12-month warranty.`);
    return parts.join(' ');
  }

  if (cat === 'playables' || cat === 'gaming') {
    return `The ${brand} ${model} is a certified refurbished gaming device supplied ${conditionPhrase}. Fully tested and verified to meet our quality standards, covered by a 12-month warranty and 30-day free returns.`;
  }

  if (cat === 'speakers' || cat === 'audio' || cat === 'headphones') {
    return `The ${brand} ${model} is a refurbished audio device supplied ${conditionPhrase}. Independently tested and certified for full functionality, backed by our standard warranty.`;
  }

  // Generic fallback
  return `The ${brand} ${model} is supplied ${conditionPhrase}. Every unit is independently inspected and tested to ensure it meets our quality standards, and comes backed by a 12-month warranty and 30-day free returns.`;
}
