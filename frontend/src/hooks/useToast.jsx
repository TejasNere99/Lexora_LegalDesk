import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ToastProvider } from '../components/ui';

const ToastContext = createContext(null);

export function ToastGate({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3500);
  }, []);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastProvider toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
