import { useQuery } from "@tanstack/react-query";
import { getDashboardStates } from "@/api/dashboard/dashboard.api";
import { dashboardKeys } from "@/api/dashboard/dashboard.keys";

export const useDashboardStates = () => {
  return useQuery({
    queryKey: dashboardKeys.states(),
    queryFn: getDashboardStates,
  });
};
