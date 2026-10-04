import { create } from "zustand";

export interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePwaStore = create<{
  installPrompt: InstallPrompt | null;
  installed: boolean;
  setInstallPrompt: (event: InstallPrompt | null) => void;
  setInstalled: (installed: boolean) => void;
}>((set) => ({
  installPrompt: null, installed: false,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
  setInstalled: (installed) => set({ installed }),
}));
