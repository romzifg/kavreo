import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
	timeout: 20000,
});

api.interceptors.request.use((config) => {
	const token = useAuthStore.getState().token;
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

api.interceptors.response.use(
	(res) => res,
	(error: AxiosError) => {
		const isAuthCall = error.config?.url?.startsWith("/auth/login") || error.config?.url?.startsWith("/auth/register");
		if (error.response?.status === 401 && !isAuthCall && useAuthStore.getState().token) {
			useAuthStore.getState().logout();
		}
		return Promise.reject(error);
	},
);

interface ApiErrorBody {
	message?: string;
	errors?: { path: string; message: string }[];
}

export function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan, coba lagi"): string {
	if (axios.isAxiosError<ApiErrorBody>(error)) {
		if (!error.response) return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
		const body = error.response.data;
		if (body?.errors?.length) return body.errors.map((e) => e.message).join(". ");
		if (body?.message) return body.message;
	}
	return fallback;
}

/** Ambil `data` dari bungkus respons { data } */
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
	return (await promise).data.data;
}
