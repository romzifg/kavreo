import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import { useUiStore } from "./stores/ui.store";
import { PwaStatus } from "./components/pwa/PwaStatus";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false },
	},
});

function ThemedToaster() {
	const theme = useUiStore((s) => s.theme);
	return <Toaster position="top-center" richColors closeButton theme={theme === "planner" ? "light" : "dark"} />;
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
				<PwaStatus />
				<ThemedToaster />
			</BrowserRouter>
		</QueryClientProvider>
	</StrictMode>,
);
