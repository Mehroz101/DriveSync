export const queryDefaults = {
  queries: {
    staleTime: 1000 * 60 * 3,      // fresh for 3 min
    gcTime: 1000 * 60 * 15,     // memory retention
    retry: (failureCount: number, error: Error & { status?: number }) => {
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  mutations: {
    retry: 1,
  },
};
