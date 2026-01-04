import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthToken } from "../api/auth.api";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Only store JWT token, no userId in localStorage
      setAuthToken(token);
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center text-gray-500">
      Signing you in…
    </div>
  );
};

export default AuthCallback;
