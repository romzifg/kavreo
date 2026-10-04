import { Bell, CalendarDays, FileText, LayoutDashboard, Lightbulb, LogOut, Menu, Moon, Settings, Sun, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useNotifications } from "@/api/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { Brand } from "@/components/ui/Brand";
import { ROLE_LABEL, cn } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { Role } from "@/types";

interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	roles?: Role[];
	end?: boolean;
}

const NAV: NavItem[] = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
	{ to: "/scripts", label: "Script Video", icon: FileText },
	{ to: "/ideas", label: "Ide Konten", icon: Lightbulb },
	{ to: "/calendars", label: "Kalender", icon: CalendarDays },
	{ to: "/users", label: "Pengguna", icon: Users, roles: ["SUPERADMIN"] },
];

function Logo() {
	return (
		<Link to="/" className="flex items-center gap-2.5 px-2">
			<Brand />
		</Link>
	);
}

export function AppLayout() {
	const user = useAuthStore((s) => s.user)!;
	const logout = useAuthStore((s) => s.logout);
	const { theme, toggleTheme } = useUiStore();
	const { data: notif } = useNotifications();
	const unread = notif?.meta.unreadCount ?? 0;
	const location = useLocation();
	const drawerRef = useRef<HTMLInputElement>(null);

	// Tutup drawer di mobile saat berpindah halaman
	useEffect(() => {
		if (drawerRef.current) drawerRef.current.checked = false;
		window.scrollTo({ top: 0 });
	}, [location.pathname]);

	const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

	return (
		<div className="drawer lg:drawer-open">
			<input id="app-drawer" ref={drawerRef} type="checkbox" className="drawer-toggle" />

			<div className="creator-workspace drawer-content flex min-h-dvh min-w-0 flex-col">
				{/* Top bar */}
				<header className="app-topbar sticky top-0 z-30 flex min-h-16 items-center gap-1 border-b border-base-300 bg-base-100/85 px-2 backdrop-blur sm:gap-2 sm:px-6">
					<label htmlFor="app-drawer" className="btn btn-ghost btn-square lg:hidden" aria-label="Buka menu">
						<Menu className="size-5" />
					</label>
					<div className="mobile-brand min-w-0 lg:hidden">
						<Logo />
					</div>
					<div className="hidden items-center gap-2 text-xs font-semibold text-base-content/60 lg:flex">
						<span className="size-2 rounded-full bg-accent" aria-hidden /> Ruang untuk karya berikutnya
					</div>
					<div className="ml-auto flex items-center gap-1">
						<button className="btn btn-ghost btn-circle" onClick={toggleTheme} aria-label="Ganti tema">
							{theme === "planner" ? <Moon className="size-5" /> : <Sun className="size-5" />}
						</button>
						<Link to="/notifications" className="btn btn-ghost btn-circle" aria-label={`Notifikasi, ${unread} belum dibaca`}>
							<div className="indicator">
								{unread > 0 && (
									<span className="indicator-item badge badge-primary badge-xs px-1 text-[10px]">{unread > 9 ? "9+" : unread}</span>
								)}
								<Bell className="size-5" />
							</div>
						</Link>
						<Link to="/settings" className="ml-1 hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-base-200 sm:flex">
							<Avatar name={user.name} size="sm" />
							<span className="text-sm font-semibold">{user.name.split(" ")[0]}</span>
						</Link>
					</div>
				</header>

				<main className="app-main mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-10">
					<div key={location.pathname} className="animate-fade-up">
						<Outlet />
					</div>
				</main>

				{/* Navigasi bawah untuk mobile & tablet kecil */}
				<nav className="app-dock dock dock-sm border-t border-base-300 bg-base-100 lg:hidden" aria-label="Navigasi utama">
					{items.slice(0, 4).map((n) => (
						<NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn(isActive && "dock-active text-primary")}>
							<n.icon className="size-5" aria-hidden />
							<span className="dock-label">{n.label.split(" ")[0]}</span>
						</NavLink>
					))}
					<NavLink to="/settings" className={({ isActive }) => cn(isActive && "dock-active text-primary")}>
						<Settings className="size-5" aria-hidden />
						<span className="dock-label">Akun</span>
					</NavLink>
				</nav>
			</div>

			{/* Sidebar */}
			<div className="drawer-side z-40">
				<label htmlFor="app-drawer" aria-label="Tutup menu" className="drawer-overlay" />
				<aside className="creator-sidebar flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100 p-4">
					<div className="flex h-12 items-center">
						<Logo />
					</div>

					<nav className="mt-6 flex-1" aria-label="Menu">
						<ul className="menu w-full gap-1 p-0">
							{items.map((n) => (
								<li key={n.to}>
									<NavLink
										to={n.to}
										end={n.end}
										className={({ isActive }) =>
											cn("rounded-xl py-2.5 font-semibold", isActive && "menu-active creator-nav-active")
										}
									>
										<n.icon className="size-5" aria-hidden />
										{n.label}
									</NavLink>
								</li>
							))}
							<li className="mt-4">
								<NavLink
									to="/notifications"
									className={({ isActive }) => cn("rounded-xl py-2.5 font-semibold", isActive && "menu-active")}
								>
									<Bell className="size-5" aria-hidden />
									Notifikasi
									{unread > 0 && <span className="badge badge-primary badge-sm ml-auto">{unread}</span>}
								</NavLink>
							</li>
							<li>
								<NavLink
									to="/settings"
									className={({ isActive }) => cn("rounded-xl py-2.5 font-semibold", isActive && "menu-active")}
								>
									<Settings className="size-5" aria-hidden />
									Pengaturan
								</NavLink>
							</li>
						</ul>
					</nav>

					<div className="creator-note mb-4 rounded-2xl p-4">
						<Lightbulb className="mb-2 size-5 text-primary" aria-hidden />
						<p className="text-sm font-bold">Ide kecil, karya besar.</p>
						<p className="mt-1 text-xs leading-relaxed text-base-content/65">
							Tangkap idenya. Tulis ceritanya. Siapkan jadwal tayangnya.
						</p>
					</div>

					<div className="surface flex items-center gap-3 p-3">
						<Avatar name={user.name} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-bold">{user.name}</p>
							<p className="truncate text-xs text-base-content/55">{ROLE_LABEL[user.role]}</p>
						</div>
						<button className="btn btn-ghost btn-sm btn-square" onClick={logout} aria-label="Keluar">
							<LogOut className="size-4" />
						</button>
					</div>
				</aside>
			</div>
		</div>
	);
}
