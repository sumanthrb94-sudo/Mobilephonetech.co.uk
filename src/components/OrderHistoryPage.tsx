import React, { useCallback, useEffect, useState } from 'react';
import { useCheckout } from '../context/CheckoutContext';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReturnFlowModal from './ReturnFlowModal';
import { useSeo, SITE_ORIGIN } from '../hooks/useSeo';
import { useAuth } from '../context/AuthContext';
import { listMyReturns, isReturnable, RETURN_STATUS_LABEL, WARRANTY_MONTHS } from '../lib/returns';
import type { ReturnItem, ReturnRequest } from '../types';

export default function OrderHistoryPage() {
  useSeo({
    title: 'Your orders | LeHart',
    description: 'Track deliveries and manage returns.',
    canonical: `${SITE_ORIGIN}/orders`,
    noindex: true,
  });
  const { orders } = useCheckout();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [returnOrder, setReturnOrder] = useState<{ id: string; createdAt: string; items: ReturnItem[] } | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);

  // Existing returns are shown against their order so a customer cannot raise
  // a second request for something already in progress — the commonest way a
  // returns queue fills with duplicates.
  const loadReturns = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest) { setReturns([]); return; }
    try {
      setReturns(await listMyReturns(user.id));
    } catch {
      setReturns([]);
    }
  }, [isAuthenticated, user]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const returnFor = (orderId: string) =>
    returns.find(r => r.orderId === orderId && r.status !== 'cancelled' && r.status !== 'rejected');

  const getStatusIcon = (status: string) => {
    const common = { size: 16 };
    switch (status) {
      case 'pending':
        return <Clock {...common} style={{ color: 'var(--color-warn)' }} />;
      case 'confirmed':
        return <CheckCircle2 {...common} style={{ color: 'var(--brand-cyan-hover)' }} />;
      case 'shipped':
        return <Truck {...common} style={{ color: 'var(--brand-cyan-hover)' }} />;
      case 'delivered':
        return <CheckCircle2 {...common} style={{ color: 'var(--color-trust-text)' }} />;
      default:
        return <Package {...common} style={{ color: 'var(--grey-40)' }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Unknown';
    }
  };

  const getStatusChipStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'pending':
        return { background: 'var(--color-warn-subtle)', color: '#92400e', border: '1px solid #fde68a' };
      case 'confirmed':
      case 'shipped':
        return { background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)', border: '1px solid rgba(0,108,73,0.3)' };
      case 'delivered':
        return { background: 'var(--green-5)', color: 'var(--color-trust-text)', border: '1px solid var(--green-20)' };
      default:
        return { background: 'var(--grey-5)', color: 'var(--grey-70)', border: '1px solid var(--grey-20)' };
    }
  };

  return (
    <div className="section-y" style={{ minHeight: "100vh", background: "var(--grey-0)" }}>
      <div className="container-bm" style={{ maxWidth: "880px" }}>
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--grey-50)] font-medium mb-6 hover:text-[var(--black)] transition-colors"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--black)] tracking-tight mb-4">Order History</h1>
          <p className="text-base text-[var(--grey-50)]">
            {orders.length === 0 ? 'No orders yet' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-[var(--grey-5)] flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-[var(--grey-30)]" />
            </div>
            <h3 className="text-xl font-extrabold text-[var(--black)] mb-2">No orders yet</h3>
            <p className="text-[var(--grey-50)] mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => navigate('/products')}
              className="btn btn-primary btn-md"
            >
              Browse products
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-[var(--grey-10)] rounded-2xl p-6 hover:border-[var(--grey-20)] transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="overline mb-1">Order Number</p>
                    <p className="text-lg font-extrabold text-[var(--black)]">{order.id}</p>
                  </div>
                  <div>
                    <p className="overline mb-1">Order Date</p>
                    <p className="text-lg font-extrabold text-[var(--black)]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="overline mb-1">Total</p>
                    <p className="text-lg font-extrabold text-[var(--black)]">£{order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="overline mb-1">Status</p>
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ ...getStatusChipStyle(order.status), fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}
                    >
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t border-[var(--grey-10)] pt-6 mb-6">
                  <h4 className="font-bold text-[var(--black)] mb-4">Items</h4>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div>
                          <p className="font-bold text-[var(--black)]">{item.model}</p>
                          <p className="text-xs text-[var(--grey-50)]">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-[var(--black)]">£{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-t border-[var(--grey-10)] pt-6">
                  <h4 className="font-bold text-[var(--black)] mb-4">Shipping Address</h4>
                  <div className="text-sm text-[var(--grey-60)]">
                    <p>{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>

                {/* Post-purchase actions */}
                <div style={{ borderTop: '1px solid var(--grey-10)', marginTop: '24px', paddingTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(() => {
                    const existing = returnFor(order.id);
                    if (existing) {
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34,
                          padding: '0 12px', borderRadius: 'var(--radius-full)',
                          background: 'var(--color-brand-subtle)', border: '1px solid rgba(161,98,7,0.25)',
                          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--brand-cyan-hover)',
                        }}>
                          <RotateCcw size={14} />
                          {existing.id} · {RETURN_STATUS_LABEL[existing.status]}
                        </span>
                      );
                    }
                    if (!isReturnable(order.createdAt)) {
                      return (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--grey-50)' }}>
                          This order is past its {WARRANTY_MONTHS}-month warranty period.
                        </span>
                      );
                    }
                    return (
                      <button
                        onClick={() => setReturnOrder({
                          id: order.id,
                          createdAt: order.createdAt,
                          items: order.items.map((i: any) => ({
                            productId: String(i.id ?? i.productId ?? ''),
                            model: String(i.model ?? ''),
                            brand: String(i.brand ?? ''),
                            quantity: Number(i.quantity ?? 1),
                            price: Number(i.price ?? 0),
                            imageUrl: i.imageUrl ?? null,
                          })),
                        })}
                        className="btn btn-secondary btn-md"
                      >
                        <RotateCcw size={14} /> Start a return
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ReturnFlowModal
        orderId={returnOrder?.id ?? ''}
        orderDate={returnOrder?.createdAt ?? new Date().toISOString()}
        items={returnOrder?.items ?? []}
        isOpen={!!returnOrder}
        onClose={() => setReturnOrder(null)}
        onCreated={loadReturns}
      />
    </div>
  );
}
