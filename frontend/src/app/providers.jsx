import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../features/auth/AuthContext';
import { ToastGate } from '../hooks/useToast';

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastGate>{children}</ToastGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
