import React, { useState } from 'react';
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
    <section className="py-24 bg-white" id="compare">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <Scale className="h-3 w-3" /> Comparison Tool
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl">
            Side-by-Side Comparison
          </h2>
          <p className="mt-4 text-slate-500 font-medium max-w-2xl mx-auto">
            Compare specs, pricing, and features to find the perfect device for your needs.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-4 mb-12">
          {['Phones', 'Computing', 'Accessories'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedIds([]); // Clear selection when category changes
              }}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeCategory === cat 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
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
                        <span className="text-2xl font-black text-slate-900">£{phone.price}</span>
                        <Link 
                          to={`/product/${phone.id}`}
                          className="block w-full text-center mt-4 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-600 transition-colors"
                        >
                          View Details
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
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20"
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
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-xs font-bold transition-colors"
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
                      >
                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Plus className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Add {activeCategory.slice(0, -1)}</span>
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
