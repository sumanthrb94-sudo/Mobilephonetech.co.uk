import React from 'react';
import { Truck, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { DeliveryPromise } from '../types';
import { calculateDeliveryPromises, isNextDayDeliveryAvailable } from '../utils/deliveryCalculator';

interface DeliveryPromiseProps {
  postalCode?: string;
  orderTime?: Date;
  showAllOptions?: boolean;
}

export default function DeliveryPromiseComponent({
  postalCode = 'SW1A 1AA',
  orderTime = new Date(),
  showAllOptions = false,
}: DeliveryPromiseProps) {
  const promises = calculateDeliveryPromises(postalCode, orderTime);
  const isNextDayAvailable = isNextDayDeliveryAvailable(orderTime);
  const fastestPromise = promises[0];

  if (!fastestPromise) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Fastest Delivery Highlight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border border-emerald-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Truck size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
              {isNextDayAvailable ? 'FASTEST DELIVERY' : 'STANDARD DELIVERY'}
            </p>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {fastestPromise.label}
            </h3>
            <p className="text-sm text-slate-600">
              {fastestPromise.time && `Delivery ${fastestPromise.time}`}
            </p>
            <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>Postcode: {postalCode}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            fastestPromise.confidence === 'high'
              ? 'bg-emerald-100 text-emerald-700'
              : fastestPromise.confidence === 'medium'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {fastestPromise.confidence} confidence
          </div>
        </div>
      </motion.div>

      {/* All Options */}
      {showAllOptions && promises.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
            Other Options
          </p>
          {promises.slice(1).map((promise, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{promise.label}</p>
                {promise.time && (
                  <p className="text-[10px] text-slate-500">{promise.time}</p>
                )}
              </div>
              <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${
                promise.confidence === 'high'
                  ? 'bg-emerald-100 text-emerald-700'
                  : promise.confidence === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {promise.confidence}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
