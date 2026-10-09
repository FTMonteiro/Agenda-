"use client";

import { Toaster } from "sonner";

import { useTheme } from "./ThemeProvider";

/*
 * O Toaster do sonner tem tema próprio e assume claro por omissão — sem isto
 * os toasts saíam brancos sobre a interface escura.
 */
export function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={theme}
    />
  );
}
