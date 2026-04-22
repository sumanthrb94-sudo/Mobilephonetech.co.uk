import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, MapPin } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-80)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-48)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-16)' }}>
            <ShieldCheck size={20} style={{ color: 'var(--blue-60)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'var(--blue-60)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legal & Compliance
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Privacy Policy
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
              At MobileTech.co.uk ("we", "our", or "us"), we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>
              We are registered with the Information Commissioner's Office (ICO) under registration number: <strong>ZA123456</strong> (Mock Registration).
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>2. The data we collect about you</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul style={{ paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Financial Data</strong> includes bank account and payment card details (processed securely via Stripe; we do not store full card details).</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Transaction Data</strong> includes details about payments to and from you and other details of products you have purchased from us.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>3. How we use your personal data</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul style={{ paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., fulfilling an order).</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>4. Data security</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>5. Your legal rights</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
              Under the UK GDPR, you have rights including:
            </p>
            <ul style={{ paddingLeft: '24px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Your right of access</strong> - You have the right to ask us for copies of your personal information.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Your right to rectification</strong> - You have the right to ask us to rectify personal information you think is inaccurate.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Your right to erasure</strong> - You have the right to ask us to erase your personal information in certain circumstances.</li>
              <li style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}><strong>Your right to restriction of processing</strong> - You have the right to ask us to restrict the processing of your personal information in certain circumstances.</li>
            </ul>
          </section>

          <section style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--grey-10)', marginTop: 'var(--spacing-16)' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>Contact our Data Protection Officer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={16} style={{ color: 'var(--grey-40)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>dpo@mobiletech.co.uk</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={16} style={{ color: 'var(--grey-40)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>MobileTech Ltd, 124 Tech Hub, London, EC1A 1BB, United Kingdom</span>
              </div>
            </div>
          </section>

        </motion.div>
      </div>
    </div>
  );
}
