import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { LANGUAGES } from "../lib/i18n";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem("gd_lang") || "en");
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinEligible, setSpinEligible] = useState(false);

  const refreshSpin = useCallback(async () => {
    if (!localStorage.getItem("gd_token")) { setSpinEligible(false); return; }
    try { const { data } = await api.get("/spin/status"); setSpinEligible(!!data.eligible); } catch { setSpinEligible(false); }
  }, []);

  const setLanguage = useCallback((code) => {
    setLang(code);
    localStorage.setItem("gd_lang", code);
    const cfg = LANGUAGES.find(l => l.code === code);
    document.documentElement.setAttribute("dir", cfg?.dir || "ltr");
    document.documentElement.setAttribute("lang", code);
    if (user) api.patch("/auth/me", { language: code }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const cfg = LANGUAGES.find(l => l.code === lang);
    document.documentElement.setAttribute("dir", cfg?.dir || "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("gd_token");
    if (!t) { setUser(null); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      if (data.language && data.language !== lang) setLang(data.language);
      refreshSpin();
    } catch { localStorage.removeItem("gd_token"); setUser(null); setSpinEligible(false); }
  }, [lang, refreshSpin]);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/meta"); setMeta(data); } catch {}
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("gd_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("gd_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => { localStorage.removeItem("gd_token"); setUser(null); setSpinEligible(false); };

  return (
    <AppCtx.Provider value={{ user, setUser, lang, setLanguage, meta, loading, login, register, logout, refreshUser, spinEligible, refreshSpin }}>
      {children}
    </AppCtx.Provider>
  );
}
