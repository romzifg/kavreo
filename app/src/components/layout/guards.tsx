import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import type { Role } from "@/types";

export function RequireAuth() {
	const token = useAuthStore((s) => s.token);
	return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export function GuestOnly() {
	const token = useAuthStore((s) => s.token);
	return token ? <Navigate to="/" replace /> : <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
	const user = useAuthStore((s) => s.user);
	return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
