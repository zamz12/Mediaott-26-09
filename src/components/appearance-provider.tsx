"use client";

import { createContext, useContext, useState } from "react";
import { updateAppearanceAction } from "@/app/account/appearance/actions";

export type Palette = "cyan" | "violet" | "rose" | "emerald" | "amber";
export type UiScale = "COMPACT" | "COMFORTABLE" | "LARGE";

const AppearanceContext = createContext<{
  palette: Palette;
  uiScale: UiScale;
  setPalette: (p: Palette) => void;
  setUiScale: (s: UiScale) => void;
}>({
  palette: "cyan",
  uiScale: "COMFORTABLE",
  setPalette: () => {},
  setUiScale: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

// Server-rendered on <html> already (root layout), so there's no flash —
// this only exists to give instant feedback when the user changes a
// setting and to persist it, without a full page reload.
export function AppearanceProvider({
  children,
  initialPalette,
  initialUiScale,
}: {
  children: React.ReactNode;
  initialPalette: string;
  initialUiScale: string;
}) {
  const [palette, setPaletteState] = useState<Palette>(initialPalette as Palette);
  const [uiScale, setUiScaleState] = useState<UiScale>(initialUiScale as UiScale);

  function setPalette(p: Palette) {
    setPaletteState(p);
    document.documentElement.setAttribute("data-palette", p);
    updateAppearanceAction({ palette: p }).catch(() => {});
  }

  function setUiScale(s: UiScale) {
    setUiScaleState(s);
    document.documentElement.setAttribute("data-ui-scale", s);
    updateAppearanceAction({ uiScale: s }).catch(() => {});
  }

  return <AppearanceContext.Provider value={{ palette, uiScale, setPalette, setUiScale }}>{children}</AppearanceContext.Provider>;
}
