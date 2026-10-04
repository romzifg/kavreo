import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "planner" | "planner-dark";

interface UiState {
	theme: Theme;
	toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme);
}

export const useUiStore = create<UiState>()(
	persist(
		(set, get) => ({
			theme: "planner",
			toggleTheme: () => {
				const next: Theme = get().theme === "planner" ? "planner-dark" : "planner";
				applyTheme(next);
				set({ theme: next });
			},
		}),
		{
			name: "cp-ui",
			onRehydrateStorage: () => (state) => {
				if (state) applyTheme(state.theme);
			},
		},
	),
);
