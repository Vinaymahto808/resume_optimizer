import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../api";
import { pushGTMEvent } from "../hooks/useGTM";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      auth
        .me()
        .then((u) => {
          setUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await auth.login({ username: email, password });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    pushGTMEvent("login", { method: "email" });
    return data;
  };

  const register = async (email, password, full_name) => {
    const data = await auth.register({ email, password, full_name });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    pushGTMEvent("signup", { method: "email" });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    pushGTMEvent("logout");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
