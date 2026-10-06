import { ArrowRight, CalendarDays, Clapperboard, FileText, Lightbulb, Plus, RotateCcw, Sparkles, Users } from "lucide-react";
import { Link } from "react-router";
import { useDashboard } from "@/api/dashboard";
import { TaskList } from "@/components/ui/TaskList";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, PageLoader } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { PLATFORM_SHORT, ROLE_LABEL, TYPE_BASE_PATH, formatDate, timeAgo } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { ReviewStatus, StatusCounts } from "@/types";

const total = (c: StatusCounts) => c.DRAFT + c.SUBMITTED + c.REVISION + c.APPROVED;

const STATUS_ROWS: { key: ReviewStatus; label: string; dot: string }[] = [
	{ key: "DRAFT", label: "Draft", dot: "bg-base-content/30" },
	{ key: "SUBMITTED", label: "Menunggu", dot: "bg-info" },
	{ key: "REVISION", label: "Revisi", dot: "bg-warning" },
	{ key: "APPROVED", label: "Disetujui", dot: "bg-success" },
];

function StatCard({ to, title, icon: Icon, counts, tint }: { to: string; title: string; icon: typeof FileText; counts: StatusCounts; tint: string }) {
	return (
		<Link to={to} className="surface group block p-5 transition hover:border-primary/40 hover:shadow-sm">
			<div className="flex items-start justify-between">
				<span className={`grid size-11 place-items-center rounded-xl ${tint}`}>
					<Icon className="size-5" aria-hidden />
				</span>
				<ArrowRight className="size-4 text-base-content/30 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
			</div>
			<p className="mt-4 text-4xl font-extrabold tracking-tight">{total(counts)}</p>
			<p className="text-sm font-semibold text-base-content/60">{title}</p>
			<ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-base-content/70">
				{STATUS_ROWS.map((s) => (
					<li key={s.key} className="flex items-center gap-1.5">
						<span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
						{s.label}
						<b className="ml-auto text-base-content">{counts[s.key]}</b>
					</li>
				))}
			</ul>
		</Link>
	);
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
	return (
		<section className="surface p-5">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-bold">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-base-content/50">{text}</p>;

export function DashboardPage() {
	const user = useAuthStore((s) => s.user)!;
	const { data, isLoading, error, refetch } = useDashboard();

	if (isLoading) return <PageLoader />;
	if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

	const subtitle =
		user.role === "APPROVER"
			? "Berikut pengajuan yang menunggu keputusanmu."
			: user.role === "SUPERADMIN"
				? "Ringkasan seluruh aktivitas di aplikasi."
				: "Ringkasan pekerjaan kontenmu hari ini.";

	return (
		<>
			<PageHeader
				title={`Halo, ${user.name.split(" ")[0]} 👋`}
				subtitle={subtitle}
				actions={
					user.role === "USER" && (
						<>
							<Link to="/scripts/new" className="btn btn-primary btn-sm sm:btn-md">
								<Plus className="size-4" /> Script
							</Link>
							<Link to="/ideas/new" className="btn btn-outline btn-sm sm:btn-md">
								<Plus className="size-4" /> Ide
							</Link>
							<Link to="/calendars/new" className="btn btn-outline btn-sm sm:btn-md">
								<Plus className="size-4" /> Kalender
							</Link>
						</>
					)
				}
			/>

			<section className="creator-banner mb-6 flex items-center justify-between gap-4 rounded-3xl p-6 sm:p-8">
				<div className="relative z-10">
					<p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
						<Sparkles className="size-4" /> Your creative flow
					</p>
					<h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">Beri ruang untuk ide hebatmu.</h2>
					<p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
						Dari inspirasi pertama sampai jadwal tayang. Bangun karya berikutnya, satu langkah setiap hari.
					</p>
					<div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/85">
						<span className="rounded-full border border-white/20 px-3 py-1.5">Ide</span>
						<span className="rounded-full border border-white/20 px-3 py-1.5">Script</span>
						<span className="rounded-full border border-white/20 px-3 py-1.5">Tayang</span>
					</div>
				</div>
				<span className="hidden size-24 shrink-0 rotate-6 place-items-center rounded-3xl border border-white/20 bg-white/10 sm:grid">
					<Clapperboard className="size-11 text-amber-200" aria-hidden />
				</span>
			</section>

            <TaskList compact />
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<StatCard to="/scripts" title="Script video" icon={FileText} counts={data.contents.SCRIPT} tint="bg-primary/10 text-primary" />
				<StatCard to="/ideas" title="Ide konten" icon={Lightbulb} counts={data.contents.IDEA} tint="bg-warning/20 text-warning-content" />
				<StatCard
					to="/calendars"
					title="Kalender konten"
					icon={CalendarDays}
					counts={data.calendars}
					tint="bg-accent/25 text-accent-content"
				/>
			</div>

			<div className="mt-6 grid gap-4 lg:grid-cols-2">
				{user.role === "USER" && (
					<>
						<Section title="Perlu kamu revisi">
							{data.needRevision && data.needRevision.contents.length + data.needRevision.calendars.length > 0 ? (
								<ul className="grid gap-2">
									{data.needRevision.contents.map((c) => (
										<li key={c.id}>
											<Link
												to={`${TYPE_BASE_PATH[c.type]}/${c.id}`}
												className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-200"
											>
												<span className="grid size-9 place-items-center rounded-lg bg-warning/20 text-warning-content">
													<RotateCcw className="size-4" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-semibold">{c.title}</span>
													<span className="text-xs text-base-content/55">
														{c.type === "SCRIPT" ? "Script" : "Ide"} · {timeAgo(c.updatedAt)}
													</span>
												</span>
											</Link>
										</li>
									))}
									{data.needRevision.calendars.map((c) => (
										<li key={c.id}>
											<Link to={`/calendars/${c.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-200">
												<span className="grid size-9 place-items-center rounded-lg bg-warning/20 text-warning-content">
													<RotateCcw className="size-4" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-semibold">{c.title}</span>
													<span className="text-xs text-base-content/55">Kalender · {timeAgo(c.updatedAt)}</span>
												</span>
											</Link>
										</li>
									))}
								</ul>
							) : (
								<Empty text="Tidak ada yang perlu direvisi. Mantap! 🎉" />
							)}
						</Section>

						<Section
							title="Jadwal tayang terdekat"
							action={
								<Link to="/calendars" className="link link-primary text-sm no-underline">
									Lihat kalender
								</Link>
							}
						>
							{data.upcoming && data.upcoming.length > 0 ? (
								<ul className="grid gap-2">
									{data.upcoming.map((i) => (
										<li key={i.id}>
											<Link
												to={`/calendars/${i.calendar.id}`}
												className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-200"
											>
												<span className="grid w-12 shrink-0 place-items-center rounded-lg bg-primary/10 py-1 text-primary">
													<span className="text-lg font-extrabold leading-none">{formatDate(i.date, "d")}</span>
													<span className="text-[10px] font-semibold uppercase">{formatDate(i.date, "MMM")}</span>
												</span>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-semibold">{i.title}</span>
													<span className="text-xs text-base-content/55">
														{PLATFORM_SHORT[i.platform]} · {i.calendar.title}
													</span>
												</span>
											</Link>
										</li>
									))}
								</ul>
							) : (
								<Empty text="Belum ada jadwal mendatang." />
							)}
						</Section>
					</>
				)}

				{user.role === "APPROVER" && data.pending && (
					<>
						<Section title={`Script & ide menunggu review (${data.pending.contents.length})`}>
							{data.pending.contents.length ? (
								<ul className="grid gap-2">
									{data.pending.contents.map((c) => (
										<li key={c.id}>
											<Link
												to={`${TYPE_BASE_PATH[c.type]}/${c.id}`}
												className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-200"
											>
												<Avatar name={c.author.name} />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-semibold">{c.title}</span>
													<span className="text-xs text-base-content/55">
														{c.author.name} · {c.type === "SCRIPT" ? "Script" : "Ide"}
														{c.revisionCount > 0 && ` · revisi ke-${c.revisionCount}`}
													</span>
												</span>
												<ArrowRight className="size-4 text-base-content/30" />
											</Link>
										</li>
									))}
								</ul>
							) : (
								<Empty text="Tidak ada antrean. Semua sudah ditangani ✅" />
							)}
						</Section>
						<Section title={`Kalender menunggu review (${data.pending.calendars.length})`}>
							{data.pending.calendars.length ? (
								<ul className="grid gap-2">
									{data.pending.calendars.map((c) => (
										<li key={c.id}>
											<Link to={`/calendars/${c.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-200">
												<Avatar name={c.author.name} />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-semibold">{c.title}</span>
													<span className="text-xs text-base-content/55">
														{c.author.name}
														{c.revisionCount > 0 && ` · revisi ke-${c.revisionCount}`}
													</span>
												</span>
												<ArrowRight className="size-4 text-base-content/30" />
											</Link>
										</li>
									))}
								</ul>
							) : (
								<Empty text="Tidak ada kalender yang menunggu." />
							)}
						</Section>
					</>
				)}

				{user.role === "SUPERADMIN" && data.users && (
					<Section
						title="Pengguna"
						action={
							<Link to="/users" className="link link-primary text-sm no-underline">
								Kelola
							</Link>
						}
					>
						<div className="grid grid-cols-3 gap-3">
							{(Object.keys(data.users) as (keyof typeof data.users)[]).map((r) => (
								<div key={r} className="rounded-xl bg-base-200 p-4 text-center">
									<Users className="mx-auto mb-1 size-5 text-primary" aria-hidden />
									<p className="text-2xl font-extrabold">{data.users![r]}</p>
									<p className="text-xs text-base-content/60">{ROLE_LABEL[r]}</p>
								</div>
							))}
						</div>
					</Section>
				)}
			</div>
		</>
	);
}
