'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center justify-between px-4 py-2 text-xs"
            style={{
              backgroundColor: 'rgba(245, 166, 35, 0.08)',
              borderBottom: '1px solid rgba(245, 166, 35, 0.2)',
              color: 'var(--nexora-amber)',
            }}
          >
            <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
              <AlertTriangle size={13} className="shrink-0" />
              <span>
                <strong>Research Application:</strong> HaydenFlow is a testnet/research demonstrator.
                All tokenized assets (nSPY, nNVDA, nTSLA, etc.) are <strong>simulated</strong> and do{' '}
                <strong>not</strong> represent ownership in any real securities. This app is for
                demonstration purposes only. Not financial advice.
              </span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="ml-4 shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss disclaimer"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
