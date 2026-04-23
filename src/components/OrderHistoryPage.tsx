import React from 'react';
import { useCheckout } from '../context/CheckoutContext';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function OrderHistoryPage() {
  const { orders } = useCheckout();
  const navigate = useNavigate();

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
        return { background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)', border: '1px solid rgba(0,186,219,0.3)' };
      case 'delivered':
        return { background: 'var(--green-5)', color: 'var(--color-trust-text)', border: '1px solid var(--green-20)' };
      default:
        return { background: 'var(--grey-5)', color: 'var(--grey-70)', border: '1px solid var(--grey-20)' };
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Order History</h1>
          <p className="text-lg text-slate-500 font-medium">
            {orders.length === 0 ? 'No orders yet' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No orders yet</h3>
            <p className="text-slate-500 font-medium mb-6">Start shopping to see your orders here</p>
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
                className="border border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Order Number</p>
                    <p className="text-lg font-black text-slate-900">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Order Date</p>
                    <p className="text-lg font-black text-slate-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-lg font-black text-slate-900">£{order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
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
                <div className="border-t border-slate-100 pt-6 mb-6">
                  <h4 className="font-bold text-slate-900 mb-4">Items</h4>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div>
                          <p className="font-bold text-slate-900">{item.model}</p>
                          <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-slate-900">£{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="font-bold text-slate-900 mb-4">Shipping Address</h4>
                  <div className="text-sm text-slate-600">
                    <p>{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
