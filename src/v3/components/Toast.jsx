import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Call this from anywhere — no context needed
export const toast = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = ({ detail }) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, ...detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold
            animate-in fade-in slide-in-from-bottom-2 duration-300
            ${t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-[#2C2511] text-[#FAF8F3]'}`}
        >
          {t.type === 'error'
            ? <AlertCircle size={16} className="shrink-0" />
            : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
};
