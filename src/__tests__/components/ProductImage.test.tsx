import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductImage from '../../components/ProductImage';

describe('ProductImage', () => {
  it('shows an uploaded photo', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="https://res.cloudinary.com/x/iphone.jpg" alt="iPhone 16" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://res.cloudinary.com/x/iphone.jpg');
  });

  it('shows the LeHart mark, not a demo picture, when nothing was uploaded', () => {
    const { container } = render(<ProductImage brand="Apple" model="iPhone 16" color="Teal" imageUrl="/assets/iphone-16.jpg" alt="iPhone 16" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'iPhone 16, photo coming soon' })).toBeTruthy();
    expect(screen.getByText('Photo coming soon')).toBeTruthy();
  });

  it('shows the mark alone at thumbnail size', () => {
    render(<ProductImage brand="Apple" model="iPhone 16" imageUrl="" context="thumb" />);
    expect(screen.queryByText('Photo coming soon')).toBeNull();
    expect(screen.getByRole('img', { name: 'Photo coming soon' })).toBeTruthy();
  });
});
