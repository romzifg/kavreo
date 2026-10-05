import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { GuestOnly, RequireAuth, RequireRole } from "@/components/layout/guards";
import { PageLoader } from "@/components/ui/Loading";

// Pemecahan kode per halaman agar muat pertama lebih ringan di perangkat mobile
const LoginPage = lazy(() => import("@/pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/AuthPages").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ContentListPage = lazy(() => import("@/pages/contents/ContentListPage").then((m) => ({ default: m.ContentListPage })));
const ContentFormPage = lazy(() => import("@/pages/contents/ContentFormPage").then((m) => ({ default: m.ContentFormPage })));
const ContentDetailPage = lazy(() => import("@/pages/contents/ContentDetailPage").then((m) => ({ default: m.ContentDetailPage })));
const CalendarListPage = lazy(() => import("@/pages/calendars/CalendarListPage").then((m) => ({ default: m.CalendarListPage })));
const CalendarFormPage = lazy(() => import("@/pages/calendars/CalendarFormPage").then((m) => ({ default: m.CalendarFormPage })));
const CalendarDetailPage = lazy(() => import("@/pages/calendars/CalendarDetailPage").then((m) => ({ default: m.CalendarDetailPage })));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const UsersPage = lazy(() => import("@/pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const AiUsagePage = lazy(() => import("@/pages/AiUsagePage").then((m) => ({ default: m.AiUsagePage })));

export default function App() {
	return (
		<Suspense fallback={<PageLoader />}>
			<Routes>
				<Route element={<GuestOnly />}>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
				</Route>

				<Route element={<RequireAuth />}>
					<Route element={<AppLayout />}>
						<Route index element={<DashboardPage />} />

						<Route path="scripts" element={<ContentListPage type="SCRIPT" />} />
						<Route path="scripts/new" element={<ContentFormPage type="SCRIPT" />} />
						<Route path="scripts/:id" element={<ContentDetailPage type="SCRIPT" />} />
						<Route path="scripts/:id/edit" element={<ContentFormPage type="SCRIPT" />} />

						<Route path="ideas" element={<ContentListPage type="IDEA" />} />
						<Route path="ideas/new" element={<ContentFormPage type="IDEA" />} />
						<Route path="ideas/:id" element={<ContentDetailPage type="IDEA" />} />
						<Route path="ideas/:id/edit" element={<ContentFormPage type="IDEA" />} />

						<Route path="calendars" element={<CalendarListPage />} />
						<Route path="calendars/new" element={<CalendarFormPage />} />
						<Route path="calendars/:id" element={<CalendarDetailPage />} />
						<Route path="calendars/:id/edit" element={<CalendarFormPage />} />

						<Route path="notifications" element={<NotificationsPage />} />
						<Route path="settings" element={<SettingsPage />} />

						<Route element={<RequireRole roles={["SUPERADMIN"]} />}>
							<Route path="users" element={<UsersPage />} />
							<Route path="ai-usage" element={<AiUsagePage />} />
						</Route>
					</Route>
				</Route>

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Suspense>
	);
}
