import { createContext, useContext, useState, useCallback } from "react";

const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const [latestText, setLatestText] = useState(() => {
    return localStorage.getItem("latestResumeText") || "";
  });

  const updateResumeText = useCallback((text) => {
    setLatestText(text);
    if (text) localStorage.setItem("latestResumeText", text);
  }, []);

  return (
    <ResumeContext.Provider value={{ latestText, updateResumeText }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be inside ResumeProvider");
  return ctx;
}
