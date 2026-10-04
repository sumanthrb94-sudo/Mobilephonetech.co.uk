import Modal from './ui/Modal';
import { ProductGrade } from '../types';

const GRADES: { grade: ProductGrade; summary: string; detail: string; badgeClass: string }[] = [
  {
    grade: 'Pristine',
    summary: 'Indistinguishable from new.',
    detail: 'No visible marks under normal lighting. The screen, frame and back are exceptionally clean.',
    badgeClass: 'badge-pristine',
  },
  {
    grade: 'Excellent',
    summary: 'Very light signs of use.',
    detail: 'Very light signs of use may be visible under close inspection. The screen is free of noticeable scratches.',
    badgeClass: 'badge-excellent',
  },
  {
    grade: 'Good',
    summary: 'Visible signs of everyday use.',
    detail: 'Visible signs of everyday use such as light scuffs on the frame or back. It remains fully functional and tested.',
    badgeClass: 'badge-good',
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
        Every device passes the same 70-point technical inspection. Grades describe cosmetic condition only — performance and warranty are identical across all grades.
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
        Every grade comes with our 12-month warranty, free next-day delivery and 30-day free returns. Battery health is shown for the selected unit; the 85% minimum promise applies to Apple phones only.
      </div>
    </Modal>
  );
}
