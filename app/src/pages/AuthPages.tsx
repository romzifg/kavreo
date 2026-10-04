import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CalendarCheck, Clapperboard, Eye, EyeOff, FileText, Lightbulb, Play, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { useLogin, useRegister } from "@/api/auth";
import { Field } from "@/components/ui/Field";
import { Brand } from "@/components/ui/Brand";
import { getErrorMessage } from "@/lib/api";

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
	return (
		<div className="auth-shell grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
			{/* Panel brand */}
			<aside className="auth-studio relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
				<div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
				<div aria-hidden className="absolute -bottom-32 -left-20 size-96 rounded-full bg-secondary/40 blur-3xl" />
				<div className="relative flex items-center justify-between">
					<Brand inverse />
					<span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/75">Made for creators</span>
				</div>

				<div className="relative my-10 max-w-xl">
					<p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
						<Sparkles className="size-4" /> Your next big idea starts here
					</p>
					<h2 className="text-4xl font-extrabold leading-[1.15] tracking-tight xl:text-5xl">
						Ide jadi cerita.
						<br />
						<span className="text-amber-300">Cerita jadi karya.</span>
					</h2>
					<p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
						Ruang kreatif untuk menyusun ide, meracik script, dan menjaga ritme kontenmu. Semua di Kavreo.
					</p>
					<div className="studio-board mt-8 rounded-3xl border border-white/20 p-5">
						<div className="flex items-center justify-between text-xs text-white/70">
							<span className="flex items-center gap-2">
								<Clapperboard className="size-4" /> CREATOR STUDIO
							</span>
							<span className="flex items-center gap-1.5">
								<span className="size-1.5 rounded-full bg-emerald-300" /> Let's create
							</span>
						</div>
						<div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
							<div>
								<span className="rounded-full bg-amber-300/15 px-2 py-1 text-[10px] font-bold text-amber-200">THE NEXT IDEA</span>
								<p className="mt-3 text-lg font-bold">
									Behind the scenes
									<br />
									of your next big thing.
								</p>
								<p className="mt-2 text-xs text-white/55">Dari inspirasi ke tombol publish.</p>
							</div>
							<div className="studio-play grid h-28 w-20 place-items-center rounded-2xl">
								<Play className="size-7 fill-white text-white" aria-hidden />
							</div>
						</div>
						<div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-[11px] font-semibold">
							<span className="rounded-full bg-white/10 px-3 py-1.5">01 Ide</span>
							<ArrowUpRight className="size-3 text-white/40" />
							<span className="rounded-full bg-white/10 px-3 py-1.5">02 Script</span>
							<ArrowUpRight className="size-3 text-white/40" />
							<span className="rounded-full bg-emerald-300/15 px-3 py-1.5 text-emerald-200">03 Tayang</span>
						</div>
					</div>
					<ul className="mt-6 grid gap-3 text-white/90 xl:grid-cols-3">
						{[
							{ icon: FileText, t: "Script video pendek", d: "Hook, isi, dan CTA terstruktur." },
							{ icon: Lightbulb, t: "Bank ide konten", d: "Catat ide sebelum hilang." },
							{ icon: CalendarCheck, t: "Kalender + approval", d: "Setiap tanggal bisa disetujui atau dikomentari." },
						].map((f) => (
							<li key={f.t} className="flex items-start gap-2">
								<span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/15">
									<f.icon className="size-4.5" />
								</span>
								<span>
									<b className="block text-xs">{f.t}</b>
									<span className="mt-1 block text-[11px] text-white/60">{f.d}</span>
								</span>
							</li>
						))}
					</ul>
				</div>
				<p className="relative text-xs text-white/50">Dari ide, jadi karya.</p>
			</aside>

			{/* Form */}
			<main className="auth-form-panel flex items-center justify-center px-5 py-10 sm:px-10">
				<div className="auth-card w-full max-w-md animate-fade-up rounded-3xl border border-base-300 bg-base-100 p-6 shadow-xl shadow-primary/5 sm:p-8">
					<div className="mb-8 flex items-center gap-2.5 lg:hidden">
						<Brand />
					</div>
					<span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
						<Sparkles className="size-3.5" /> Create something worth sharing
					</span>
					<h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
					<p className="mt-2 text-base-content/60">{subtitle}</p>
					<div className="mt-8">{children}</div>
					<div className="mt-6 text-center text-sm text-base-content/65">{footer}</div>
				</div>
			</main>
		</div>
	);
}

function PasswordInput({ error, ...props }: React.ComponentProps<"input"> & { error?: boolean }) {
	const [show, setShow] = useState(false);
	return (
		<div className="relative">
			<input {...props} type={show ? "text" : "password"} className={`input input-bordered w-full pr-11 ${error ? "input-error" : ""}`} />
			<button
				type="button"
				className="btn btn-ghost btn-sm btn-square absolute right-1.5 top-1/2 -translate-y-1/2"
				onClick={() => setShow((s) => !s)}
				aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
			>
				{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
			</button>
		</div>
	);
}

const loginSchema = z.object({
	email: z.email("Email tidak valid"),
	password: z.string().min(1, "Password wajib diisi"),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
	const navigate = useNavigate();
	const login = useLogin();
	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

	const onSubmit = handleSubmit(async (values) => {
		try {
			await login.mutateAsync(values);
			navigate("/", { replace: true });
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	const demo = [
		{ label: "User", email: "dina@contentplanner.test", password: "Password123!" },
		{ label: "Approval", email: "rina@contentplanner.test", password: "Password123!" },
		{ label: "Superadmin", email: "admin@contentplanner.test", password: "Admin12345!" },
	];

	return (
		<AuthShell
			title="Selamat datang kembali"
			subtitle="Masuk untuk melanjutkan perencanaan kontenmu."
			footer={
				<>
					Belum punya akun?{" "}
					<Link to="/register" className="link link-primary font-semibold no-underline">
						Daftar gratis
					</Link>
				</>
			}
		>
			<form onSubmit={onSubmit} className="grid gap-4" noValidate>
				<Field label="Email" error={errors.email?.message}>
					<input
						type="email"
						autoComplete="email"
						placeholder="nama@email.com"
						className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
						{...register("email")}
					/>
				</Field>
				<Field label="Password" error={errors.password?.message}>
					<PasswordInput autoComplete="current-password" placeholder="••••••••" error={!!errors.password} {...register("password")} />
				</Field>
				<button className="btn btn-primary mt-2 h-12 text-base" disabled={login.isPending}>
					{login.isPending && <span className="loading loading-spinner loading-sm" />}
					Masuk
				</button>
			</form>

			{import.meta.env.DEV && (
				<div className="mt-6 rounded-xl border border-dashed border-base-300 p-3">
					<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Akun demo (hasil seed)</p>
					<div className="flex flex-wrap gap-2">
						{demo.map((d) => (
							<button
								key={d.label}
								type="button"
								className="btn btn-xs btn-outline"
								onClick={() => {
									setValue("email", d.email);
									setValue("password", d.password);
								}}
							>
								{d.label}
							</button>
						))}
					</div>
				</div>
			)}
		</AuthShell>
	);
}

const registerSchema = z.object({
	name: z.string().trim().min(2, "Nama minimal 2 karakter"),
	email: z.email("Email tidak valid"),
	phone: z
		.string()
		.trim()
		.regex(/^(\+?[0-9\s-]{8,20})?$/, "Nomor telepon tidak valid")
		.optional(),
	password: z.string().min(8, "Password minimal 8 karakter"),
});
type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
	const navigate = useNavigate();
	const registerMutation = useRegister();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

	const onSubmit = handleSubmit(async (values) => {
		try {
			await registerMutation.mutateAsync({ ...values, phone: values.phone || undefined });
			toast.success("Akun berhasil dibuat. Selamat datang!");
			navigate("/", { replace: true });
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	return (
		<AuthShell
			title="Buat akun baru"
			subtitle="Mulai susun script, ide, dan kalender kontenmu."
			footer={
				<>
					Sudah punya akun?{" "}
					<Link to="/login" className="link link-primary font-semibold no-underline">
						Masuk
					</Link>
				</>
			}
		>
			<form onSubmit={onSubmit} className="grid gap-4" noValidate>
				<Field label="Nama lengkap" error={errors.name?.message}>
					<input autoComplete="name" className={`input input-bordered w-full ${errors.name ? "input-error" : ""}`} {...register("name")} />
				</Field>
				<Field label="Email" error={errors.email?.message}>
					<input
						type="email"
						autoComplete="email"
						className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
						{...register("email")}
					/>
				</Field>
				<Field label="No. WhatsApp (opsional)" hint="Dipakai untuk notifikasi WhatsApp jika diaktifkan" error={errors.phone?.message}>
					<input
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						placeholder="08123456789"
						className={`input input-bordered w-full ${errors.phone ? "input-error" : ""}`}
						{...register("phone")}
					/>
				</Field>
				<Field label="Password" hint="Minimal 8 karakter" error={errors.password?.message}>
					<PasswordInput autoComplete="new-password" error={!!errors.password} {...register("password")} />
				</Field>
				<button className="btn btn-primary mt-2 h-12 text-base" disabled={registerMutation.isPending}>
					{registerMutation.isPending && <span className="loading loading-spinner loading-sm" />}
					Daftar
				</button>
			</form>
		</AuthShell>
	);
}
