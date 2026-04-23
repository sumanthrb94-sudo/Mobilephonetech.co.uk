import { useState } from 'react';
import { MOCK_PHONES } from '../data';
import { Phone } from '../types';
import { X, Plus, Search, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ComparisonTool() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Phones');

  const selectedPhones = selectedIds.map(id => MOCK_PHONES.find(p => p.id === id)).filter(Boolean) as Phone[];

  const addPhone = (id: string) => {
    if (selectedIds.length < 3 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
    setIsAdding(false);
    setSearchTerm('');
  };

  const removePhone = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const filteredPhones = MOCK_PHONES.filter(p => 
    p.category === activeCategory &&
    p.model.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !selectedIds.includes(p.id)
  );

  return (
    <section className="section-y" style={{ background: 'var(--grey-0)' }} id="compare">
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full mb-4"
            style={{
              padding: '4px 12px',
              background: 'var(--color-brand-subtle)',
              color: 'var(--brand-cyan-hover)',
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Scale className="h-3 w-3" /> Comparison tool
          </div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--black)', lineHeight: 1.1 }}>
            Side-by-side comparison
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--grey-50)', maxWidth: '640px', margin: '16px auto 0' }}>
            Compare specs, pricing, and features to find the perfect device for your needs.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          {['Phones', 'Computing', 'Accessories'].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedIds([]);
                }}
                style={{
                  height: '36px',
                  padding: '0 18px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--grey-0)' : 'var(--grey-60)',
                  background: isActive ? 'var(--brand-cyan)' : 'var(--grey-0)',
                  border: `1.5px solid ${isActive ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-default)',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50">
          {/* Labels Column */}
          <div className="bg-slate-50 p-8 hidden md:block">
            <div className="h-48 flex items-center mb-8">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Compare Specs</span>
            </div>
            <div className="space-y-8">
              <SpecLabel label="Brand" />
              <SpecLabel label="Processor" />
              <SpecLabel label="Display" />
              <SpecLabel label="Camera" />
              <SpecLabel label="Battery" />
              <SpecLabel label="RAM" />
              <SpecLabel label="OS" />
              <SpecLabel label="Price" />
            </div>
          </div>

          {/* Phone Columns */}
          {Array.from({ length: 3 }).map((_, idx) => {
            const phone = selectedPhones[idx];
            return (
              <div key={idx} className="bg-white p-8 relative min-h-[600px] flex flex-col">
                {phone ? (
                  <>
                    <button 
                      onClick={() => removePhone(phone.id)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <div className="h-48 mb-8 flex flex-col items-center justify-center text-center">
                      <img 
                        src={phone.imageUrl} 
                        alt={phone.model} 
                        className="h-32 object-contain mb-4 transform transition-transform hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <h3 className="font-black text-slate-900 tracking-tight">{phone.model}</h3>
                    </div>

                    <div className="space-y-8 flex-1">
                      <SpecValue value={phone.brand} mobileLabel="Brand" />
                      <SpecValue value={phone.specs.processor || 'N/A'} mobileLabel="Processor" />
                      <SpecValue value={phone.specs.display || 'N/A'} mobileLabel="Display" />
                      <SpecValue value={phone.specs.camera || 'N/A'} mobileLabel="Camera" />
                      <SpecValue value={phone.specs.battery || 'N/A'} mobileLabel="Battery" />
                      <SpecValue value={phone.specs.ram || 'N/A'} mobileLabel="RAM" />
                      <SpecValue value={phone.specs.os || 'N/A'} mobileLabel="OS" />
                      <div className="pt-4 border-t border-slate-50">
                        <span className="type-price" style={{ fontSize: '24px', color: 'var(--black)' }}>£{phone.price}</span>
                        <Link
                          to={`/product/${phone.id}`}
                          className="btn btn-primary btn-md btn-full"
                          style={{ marginTop: '16px', textDecoration: 'none' }}
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl m-2">
                    {isAdding ? (
                      <div className="w-full p-4">
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            autoFocus
                            type="text"
                            placeholder={`Search ${activeCategory}...`}
                            className="search-input"
                            style={{ height: '40px', paddingLeft: '36px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {filteredPhones.length > 0 ? (
                            filteredPhones.map(p => (
                              <button
                                key={p.id}
                                onClick={() => addPhone(p.id)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-body)',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'var(--grey-70)',
                                  transition: 'background var(--duration-fast), color var(--duration-fast)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--color-brand-subtle)';
                                  e.currentTarget.style.color = 'var(--brand-cyan-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'var(--grey-70)';
                                }}
                              >
                                {p.model}
                              </button>
                            ))
                          ) : (
                            <p className="text-[10px] text-center py-4">No {activeCategory} found</p>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsAdding(false)}
                          className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAdding(true)}
                        className="group flex flex-col items-center gap-4 transition-all hover:scale-105"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <div
                          className="h-16 w-16 rounded-full flex items-center justify-center transition-colors"
                          style={{ background: 'var(--grey-5)', color: 'var(--grey-50)' }}
                        >
                          <Plus className="h-6 w-6" />
                        </div>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-60)' }}>
                          Add {activeCategory.slice(0, -1)}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SpecLabel({ label }: { label: string }) {
  return (
    <div className="h-12 flex items-center">
      <span className="text-sm font-bold text-slate-900 tracking-tight">{label}</span>
    </div>
  );
}

function SpecValue({ value, mobileLabel }: { value: string, mobileLabel: string }) {
  return (
    <div className="min-h-12 flex flex-col justify-center">
      <span className="md:hidden text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{mobileLabel}</span>
      <span className="text-sm text-slate-500 font-medium leading-snug line-clamp-2">{value}</span>
    </div>
  );
}
