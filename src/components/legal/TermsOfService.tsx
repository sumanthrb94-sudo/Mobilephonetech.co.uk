import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-80)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-48)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-16)' }}>
            <FileText size={20} style={{ color: 'var(--blue-60)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'var(--blue-60)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legal & Compliance
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Terms of Service
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)' }}>
            Last updated: 22 April 2026<br />
            Effective from: 01 May 2026
          </p>
        </div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32)' }}
        >
          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>1. Introduction</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              These terms and conditions outline the rules and regulations for the use of MobileTech.co.uk's Website. By accessing this website we assume you accept these terms and conditions. Do not continue to use MobileTech.co.uk if you do not agree to take all of the terms and conditions stated on this page.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>2. Grading Definitions</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              As a marketplace for refurbished electronics, we guarantee the functionality of all devices. Cosmetic condition is categorized into the following grades:
            </p>
            <ul style={{ paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Pristine:</strong> Flawless cosmetic condition. Screen has no scratches. Body has no signs of use. Minimum 85% battery health.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Excellent:</strong> Very good cosmetic condition. Screen may have micro-scratches invisible from 20cm away. Body may have light signs of wear. Minimum 80% battery health.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Good:</strong> Visible signs of wear. Screen may have light scratches that do not affect visibility when the screen is on. Body may have scratches and dents. Minimum 80% battery health.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>3. Warranty & Returns</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              All devices come with a standard 12-month commercial warranty covering technical defects. This does not cover accidental damage, liquid damage, or software issues caused by third-party modifications.
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>
              Under the UK Consumer Contracts Regulations, you have the right to cancel your order and return the item within 30 days of receiving it, for any reason, no questions asked.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>4. Limitation of Liability</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>
              In no event shall MobileTech.co.uk, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Website whether such liability is under contract. MobileTech.co.uk, including its officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this Website.
            </p>
          </section>

        </motion.div>
      </div>
    </div>
  );
}
