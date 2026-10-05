import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useChangePassword, useUpdateProfile } from "@/api/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";
import { ApplicationApprovalSettings } from "@/components/ui/ApplicationApprovalSettings";
import { AiSettingsCard } from "@/components/ui/AiSettingsCard";

const profileSchema = z.object({
	name: z.string().trim().min(2, "Nama minimal 2 karakter"),
	phone: z
		.string()
		.trim()
		.regex(/^(\+?[0-9\s-]{8,20})?$/, "Nomor telepon tidak valid"),
	notifyEmail: z.boolean(),
	notifyWhatsapp: z.boolean(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Wajib diisi"),
		newPassword: z.string().min(8, "Minimal 8 karakter"),
		confirm: z.string(),
	})
	.refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Konfirmasi password tidak sama" });
type PasswordForm = z.infer<typeof passwordSchema>;

export function SettingsPage() {
	const user = useAuthStore((s) => s.user)!;
	const updateProfile = useUpdateProfile();
	const changePassword = useChangePassword();

	const profile = useForm<ProfileForm>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: user.name,
			phone: user.phone ?? "",
			notifyEmail: user.notifyEmail,
			notifyWhatsapp: user.notifyWhatsapp,
		},
	});
	const password = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

	const saveProfile = profile.handleSubmit(async (v) => {
		try {
			await updateProfile.mutateAsync({
				name: v.name,
				phone: v.phone || null,
				...(user.role === "SUPERADMIN" ? { notifyEmail: v.notifyEmail, notifyWhatsapp: v.notifyWhatsapp } : {}),
			});
			toast.success("Profil diperbarui");
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	const savePassword = password.handleSubmit(async (v) => {
		try {
			await changePassword.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword });
			toast.success("Password berhasil diubah");
			password.reset();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	return (
		<>
			<PageHeader title="Pengaturan" subtitle={user.role === "SUPERADMIN" ? "Kelola profil, notifikasi, dan alur approval aplikasi." : "Kelola profil akunmu."} />

			<div className="grid max-w-3xl gap-6">
				<InstallAppCard />
				{user.role === "SUPERADMIN" && <ApplicationApprovalSettings />}
				{user.role === "SUPERADMIN" && <AiSettingsCard />}
				<form onSubmit={saveProfile} className="surface grid gap-5 p-5 sm:p-6" noValidate>
					<div className="flex items-center gap-4">
						<Avatar name={user.name} size="lg" />
						<div className="min-w-0">
							<p className="break-all font-bold">{user.email}</p>
							<p className="text-sm text-base-content/60">{ROLE_LABEL[user.role]}</p>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Nama" error={profile.formState.errors.name?.message}>
							<input className="input input-bordered w-full" {...profile.register("name")} />
						</Field>
						<Field label="No. WhatsApp" error={profile.formState.errors.phone?.message} hint="Contoh: 08123456789">
							<input type="tel" inputMode="tel" className="input input-bordered w-full" {...profile.register("phone")} />
						</Field>
					</div>

					{user.role === "SUPERADMIN" && <fieldset className="grid gap-3 rounded-xl bg-base-200 p-4">
						<legend className="px-1 text-sm font-bold">Notifikasi</legend>
						<label className="flex cursor-pointer items-center justify-between gap-4">
							<span>
								<span className="block text-sm font-semibold">Email</span>
								<span className="text-xs text-base-content/60">Kirim kabar pengajuan & review ke email</span>
							</span>
							<input type="checkbox" className="toggle toggle-primary" {...profile.register("notifyEmail")} />
						</label>
						<label className="flex cursor-pointer items-center justify-between gap-4">
							<span>
								<span className="block text-sm font-semibold">WhatsApp</span>
								<span className="text-xs text-base-content/60">Perlu nomor WhatsApp di atas</span>
							</span>
							<input type="checkbox" className="toggle toggle-primary" {...profile.register("notifyWhatsapp")} />
						</label>
						<p className="text-xs text-base-content/50">
							Notifikasi di dalam aplikasi selalu aktif. Pengiriman email/WhatsApp berjalan jika sudah diaktifkan oleh admin sistem.
						</p>
					</fieldset>}

					<div>
						<button className="btn btn-primary" disabled={updateProfile.isPending}>
							{updateProfile.isPending && <span className="loading loading-spinner loading-sm" />}
							Simpan perubahan
						</button>
					</div>
				</form>

				<form onSubmit={savePassword} className="surface grid gap-4 p-5 sm:p-6" noValidate>
					<h2 className="font-bold">Ubah password</h2>
					<Field label="Password saat ini" error={password.formState.errors.currentPassword?.message}>
						<input
							type="password"
							autoComplete="current-password"
							className="input input-bordered w-full"
							{...password.register("currentPassword")}
						/>
					</Field>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Password baru" error={password.formState.errors.newPassword?.message}>
							<input
								type="password"
								autoComplete="new-password"
								className="input input-bordered w-full"
								{...password.register("newPassword")}
							/>
						</Field>
						<Field label="Ulangi password baru" error={password.formState.errors.confirm?.message}>
							<input
								type="password"
								autoComplete="new-password"
								className="input input-bordered w-full"
								{...password.register("confirm")}
							/>
						</Field>
					</div>
					<div>
						<button className="btn btn-outline" disabled={changePassword.isPending}>
							{changePassword.isPending && <span className="loading loading-spinner loading-sm" />}
							Ubah password
						</button>
					</div>
				</form>
			</div>
		</>
	);
}
