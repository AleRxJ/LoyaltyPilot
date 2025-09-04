import { useState, useEffect } from "react";
import { t, getLanguage, setLanguage, type Language } from "@/lib/i18n";

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getLanguage());

  useEffect(() => {
    // Initialize language from localStorage
    const savedLanguage = getLanguage();
    setCurrentLanguage(savedLanguage);
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCurrentLanguage(newLanguage);
    // Force a re-render by reloading the page
    window.location.reload();
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
  };
}