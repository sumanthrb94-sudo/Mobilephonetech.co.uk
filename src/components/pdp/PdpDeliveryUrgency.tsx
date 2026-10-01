import { useState, useEffect } from 'react';
import { Truck, Clock } from 'lucide-react';

export default function PdpDeliveryUrgency() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Cut-off is 16:00 (4:00 PM) UK local time
      const cutoff = new Date();
      cutoff.setHours(16, 0, 0, 0);

      // If past 4 PM or weekend, target next business day 4 PM
      if (now > cutoff) {
        cutoff.setDate(cutoff.getDate() + 1);
      }
      // If cutoff lands on Saturday or Sunday, advance to Monday
      if (cutoff.getDay() === 6) cutoff.setDate(cutoff.getDate() + 2);
      if (cutoff.getDay() === 0) cutoff.setDate(cutoff.getDate() + 1);

      const diff = cutoff.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ hours: Math.max(0, hours), minutes: Math.max(0, minutes) });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // refresh every minute
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--grey-5)',
        border: '1px solid var(--grey-15)',
        borderRadius: 'var(--radius-md)',
        marginTop: '6px',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={17} style={{ color: 'var(--brand-cyan)' }} />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 2px white',
            }}
          />
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--grey-80)', fontWeight: 500 }}>
          Dispatch today with <strong style={{ color: 'var(--black)', fontWeight: 700 }}>Free Next-Day UK Delivery</strong>
        </div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'white', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--grey-20)', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-90)' }}>
        <Clock size={12} style={{ color: 'var(--color-sale)' }} />
        <span>Within {timeLeft.hours}h {timeLeft.minutes}m</span>
      </div>
    </div>
  );
}
