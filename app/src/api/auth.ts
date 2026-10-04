import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types";

interface AuthResult {
  token: string;
  user: User;
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => unwrap<AuthResult>(api.post("/auth/login", body)),
    onSuccess: (r) => setAuth(r.token, r.user),
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (body: { name: string; email: string; phone?: string; password: string }) =>
      unwrap<AuthResult>(api.post("/auth/register", body)),
    onSuccess: (r) => setAuth(r.token, r.user),
  });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string | null; notifyEmail?: boolean; notifyWhatsapp?: boolean }) =>
      unwrap<User>(api.patch("/auth/me", body)),
    onSuccess: (user) => setUser(user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      unwrap<{ ok: boolean }>(api.post("/auth/change-password", body)),
  });
}
