'use client';

import { TxState } from '@nexora/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react';

interface TransactionStatusProps {
  state: TxState;
  onDismiss?: () => void;
}

export function TransactionStatus({ state, onDismiss }: TransactionStatusProps) {
  if (state.status === 'idle') return null;

  const configs = {
    awaiting_wallet: {
      icon: <Clock size={20} style={{ color: 'var(--nexora-amber)' }} />,
      title: 'Awaiting wallet confirmation',
      description: 'Please confirm the transaction in your wallet.',
      color: 'var(--nexora-amber)',
    },
    pending: {
      icon: <Loader2 size={20} className="animate-spin" style={{ color: 'var(--nexora-blue)' }} />,
      title: 'Transaction submitted',
      description: 'Your transaction is being processed on-chain.',
      color: 'var(--nexora-blue)',
    },
    confirmed: {
      icon: <CheckCircle size={20} style={{ color: 'var(--nexora-green)' }} />,
      title: 'Transaction confirmed',
      description: 'Your swap was executed successfully.',
      color: 'var(--nexora-green)',
    },
    failed: {
      icon: <XCircle size={20} style={{ color: 'var(--nexora-red)' }} />,
      title: 'Transaction failed',
      description: state.error ?? 'An error occurred. Please try again.',
      color: 'var(--nexora-red)',
    },
  };

  const config = configs[state.status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-80 rounded-xl p-4 shadow-2xl"
        style={{
          backgroundColor: 'var(--nexora-surface)',
          border: `1px solid ${config.color}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${config.color}20`,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
              {config.title}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--nexora-text-muted)' }}>
              {config.description}
            </div>
            {state.hash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${state.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-2 text-xs"
                style={{ color: 'var(--nexora-blue)' }}
              >
                View on explorer <ExternalLink size={10} />
              </a>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity ml-2"
              style={{ color: 'var(--nexora-text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>
        {state.status === 'pending' && (
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--nexora-blue)' }}
              initial={{ width: '10%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 15, ease: 'easeInOut' }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
