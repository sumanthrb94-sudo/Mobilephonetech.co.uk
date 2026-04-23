import React from 'react';
import Modal from './ui/Modal';
import { ProductGrade } from '../types';

const GRADES: { grade: ProductGrade; summary: string; detail: string; badgeClass: string }[] = [
  {
    grade: 'New',
    summary: 'Unopened. Factory seal intact.',
    detail: 'Original retail packaging, sealed. Full manufacturer warranty and all accessories included.',
    badgeClass: 'badge-new',
  },
  {
    grade: 'Pristine',
    summary: 'Indistinguishable from new.',
    detail: 'No visible marks under any lighting. Battery health 95%+. Comes in our branded box with a new charging cable.',
    badgeClass: 'badge-pristine',
  },
  {
    grade: 'Excellent',
    summary: 'Very light signs of use.',
    detail: 'Minor marks may be visible under bright light at arm\'s length. Screen is free of scratches. Battery health 90%+.',
    badgeClass: 'badge-excellent',
  },
  {
    grade: 'Good',
    summary: 'Visible signs of everyday use.',
    detail: 'Light scuffs on frame and back are visible, no chips or dents. Screen may have superficial marks invisible when on. Battery health 85%+.',
    badgeClass: 'badge-good',
  },
  {
    grade: 'Fair',
    summary: 'Clearly used but fully working.',
    detail: 'Cosmetic wear — visible scratches, scuffs, possibly minor dents. Fully functional and tested to the same standard as every other grade. Battery health 80%+.',
    badgeClass: 'badge-fair',
  },
];

/**
 * GradeExplainer — a dedicated modal that demystifies our refurb grading,
 * paired with the same badge tokens used on ProductCard / ProductDetail so
 * what shoppers see on listings matches what this modal describes.
 */
export default function GradeExplainer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How our grading works" width={620}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
        Every device passes the same 90-point technical inspection. Grades describe cosmetic condition only — performance and warranty are identical across all grades.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {GRADES.map((g) => (
          <div key={g.grade} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span className={`badge ${g.badgeClass}`}>{g.grade}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                {g.summary}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', lineHeight: 1.55 }}>
                {g.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px', padding: '12px 14px', background: 'var(--color-brand-subtle)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--brand-header)', lineHeight: 1.55 }}>
        Every grade comes with our 12-month warranty, free next-day delivery, and 30-day free returns.
      </div>
    </Modal>
  );
}
