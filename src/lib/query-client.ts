import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Single browser-tab instance, shared by <Providers> (via QueryClientProvider)
// and api-client.ts's interceptor — the latter runs outside React and needs a
// way to wipe cached data on a forced logout (refresh-token failure).
export const queryClient = makeQueryClient();
