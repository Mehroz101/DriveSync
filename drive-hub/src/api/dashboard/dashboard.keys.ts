import { QUERY_SCOPE } from "@/constants/queryScopes";

export const dashboardKeys = {
  all: [QUERY_SCOPE.DASHBOARD] as const,

  states: () => [...dashboardKeys.all, "states"] as const,

};
