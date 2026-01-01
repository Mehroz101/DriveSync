import { Navigate } from "react-router-dom";
import { getUserId } from "../utils/auth";
import type { JSX } from "react";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  return getUserId() ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
