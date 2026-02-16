import { QueryClient } from "@tanstack/react-query";
import { queryDefaults } from "./defaults";

export const queryClient = new QueryClient({
  defaultOptions: queryDefaults,
});