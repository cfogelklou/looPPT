import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface DiagnosticContextType {
  errors: string[];
  logError: (message: string) => void;
  clearErrors: () => void;
}

const DiagnosticContext = createContext<DiagnosticContextType | null>(null);

export function DiagnosticProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<string[]>([]);

  const logError = useCallback((message: string) => {
    setErrors((prev) => {
      const newErrors = [message, ...prev];
      return newErrors.slice(0, 100); // R6: Bounded ring buffer (max 100)
    });
    console.error(`[Diagnostic] ${message}`);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <DiagnosticContext.Provider value={{ errors, logError, clearErrors }}>
      {children}
    </DiagnosticContext.Provider>
  );
}

export function useDiagnostics() {
  const context = useContext(DiagnosticContext);
  if (!context) {
    throw new Error('useDiagnostics must be used within a DiagnosticProvider');
  }
  return context;
}
