import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function Toast() {
  const { toastMessage, toastType, hideToast } = useUI();

  const bgColor = {
    success: 'bg-emerald-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
    warning: 'bg-amber-50',
  }[toastType];

  const borderColor = {
    success: 'border-emerald-200',
    error: 'border-red-200',
    info: 'border-blue-200',
    warning: 'border-amber-200',
  }[toastType];

  const textColor = {
    success: 'text-emerald-900',
    error: 'text-red-900',
    info: 'text-blue-900',
    warning: 'text-amber-900',
  }[toastType];

  const iconColor = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-amber-600',
  }[toastType];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }[toastType];

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 ${bgColor} border ${borderColor} rounded-lg px-4 py-3 shadow-lg flex items-center gap-3`}
        >
          <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
          <p className={`text-sm font-medium ${textColor}`}>{toastMessage}</p>
          <button
            onClick={hideToast}
            className={`ml-2 p-1 rounded hover:bg-white/50 transition-colors ${textColor}`}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
