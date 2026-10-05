import { useState } from "react";
import { Link } from "react-router";
import { useAiUsage } from "@/api/ai";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/Loading";

const number = (v: number | null | undefined) => (v ?? 0).toLocaleString("id-ID");
const usd = (v: number | null | undefined) => (v === null ? "Tidak tersedia" : `US$ ${(v ?? 0).toFixed(6)}`);
export function AiUsagePage() {
	const today = new Date().toISOString().slice(0, 10);
	const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
		const [to, setTo] = useState(today);
		const [userId, setUserId] = useState("");
		const [page, setPage] = useState(1);

	const query = useAiUsage({ from, to, userId, page });
	const data = query.data;

	return (
		<>
			<PageHeader title="Pemakaian AI" subtitle="Pantau bantuan penulisan per pengguna. Tanggal filter menggunakan UTC." />
			<section className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
				<label className="grid gap-2 text-sm font-semibold">
					Dari tanggal
					<input
						type="date"
						className="input w-full"
						value={from}
						onChange={(e) => {
							setFrom(e.target.value);
							setPage(1);
						}}
					/>
				</label>
				<label className="grid gap-2 text-sm font-semibold">
					Sampai tanggal
					<input
						type="date"
						className="input w-full"
						value={to}
						onChange={(e) => {
							setTo(e.target.value);
							setPage(1);
						}}
					/>
				</label>
				<label className="grid gap-2 text-sm font-semibold">
					Pengguna
					<select
						className="select w-full"
						value={userId}
						onChange={(e) => {
							setUserId(e.target.value);
							setPage(1);
						}}
					>
						<option value="">Semua pengguna</option>
						{data?.users.map((u) => (
							<option value={u.id} key={u.id}>
								{u.name}
							</option>
						))}
					</select>
				</label>
				<div className="flex flex-wrap items-end gap-2">
					<button className="btn btn-outline" onClick={() => void query.refetch()}>
						Refresh
					</button>
					<Link to="/settings" className="btn btn-ghost">
						Pengaturan AI
					</Link>
				</div>
			</section>
			{query.isLoading ? (
				<span className="loading loading-spinner" />
			) : query.isError ? (
				<ErrorState error={query.error} onRetry={() => void query.refetch()} />
			) : (
				data && (
					<div className="grid gap-6">
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{[
								{
									title: "Permintaan",
									value: number(data.total),
									note: `${number(data.counts.SUCCESS)} berhasil · ${number(data.counts.FAILED)} gagal · ${number(data.counts.PENDING)} proses`,
								},
								{ title: "Token input", value: number(data.tokens.inputTokens), note: "Dari laporan penyedia" },
								{ title: "Token output", value: number(data.tokens.outputTokens), note: "Dari laporan penyedia" },
								{ title: "Estimasi biaya API", value: usd(data.tokens.costUsd), note: "Harga tersimpan saat permintaan" },
							].map((s) => (
								<section className="surface p-5" key={s.title}>
									<p className="text-xs font-bold uppercase tracking-wide text-primary">{s.title}</p>
									<p className="mt-3 break-all text-2xl font-bold">{s.value}</p>
									<p className="mt-2 text-xs text-base-content/60">{s.note}</p>
								</section>
							))}
						</div>
						<p className="text-xs leading-relaxed text-base-content/60">
							Permintaan gagal tetap dihitung dalam kuota. Token hanya dihitung jika penyedia melaporkannya; {number(data.unknownUsage)}{" "}
							permintaan berhasil tidak memiliki laporan token lengkap. Biaya adalah estimasi USD, bukan tagihan resmi; Ollama lokal USD
							0. Isi harga API cloud di Pengaturan agar estimasi bermakna.
						</p>
						<section className="surface overflow-hidden">
							<h2 className="p-5 font-bold">Ringkasan per pengguna</h2>
							<div className="overflow-x-auto">
								<table className="table">
									<thead>
										<tr>
											<th>Pengguna</th>
											<th>Permintaan</th>
											<th>Berhasil / Gagal / Proses</th>
											<th>Input / Output token</th>
											<th>Estimasi USD</th>
										</tr>
									</thead>
									<tbody>
										{data.rows.map((row) => (
											<tr key={row.id}>
												<td>
													<p className="font-semibold">{row.name}</p>
													<p className="text-xs text-base-content/60">{row.email}</p>
												</td>
												<td>{number(row.requests)}</td>
												<td>
													{number(row.success)} / {number(row.failed)} / {number(row.pending)}
												</td>
												<td>
													{number(row.inputTokens)} / {number(row.outputTokens)}
												</td>
												<td>{usd(row.costUsd)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{data.rows.length === 0 && <p className="p-5 text-sm text-base-content/60">Belum ada pengguna pada filter ini.</p>}
						</section>
						<section className="surface overflow-hidden">
							<h2 className="p-5 font-bold">Riwayat permintaan</h2>
							<div className="overflow-x-auto">
								<table className="table">
									<thead>
										<tr>
											<th>Waktu</th>
											<th>Pengguna</th>
											<th>Fitur / Model</th>
											<th>Status</th>
											<th>Token input / output</th>
											<th>Durasi</th>
											<th>Estimasi</th>
										</tr>
									</thead>
									<tbody>
										{data.logs.map((log) => (
											<tr key={log.id}>
												<td className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString("id-ID")}</td>
												<td>{log.user.name}</td>
												<td>
													<p>{log.feature === "SCRIPT" ? "Script" : log.feature === "IDEA" ? "Ide" : "Uji koneksi"}</p>
													<p className="text-xs text-base-content/60">
														{log.provider} · {log.model}
													</p>
												</td>
												<td>
													<span
														className={`badge badge-sm ${log.status === "SUCCESS" ? "badge-success" : log.status === "FAILED" ? "badge-error" : "badge-warning"}`}
													>
														{log.status === "SUCCESS" ? "Berhasil" : log.status === "FAILED" ? "Gagal" : "Proses"}
													</span>
													{log.errorCode && <p className="mt-1 text-xs text-error">{log.errorCode}</p>}
												</td>
												<td>
													{log.inputTokens === null ? "—" : number(log.inputTokens)} /{" "}
													{log.outputTokens === null ? "—" : number(log.outputTokens)}
												</td>
												<td>{log.durationMs === null ? "—" : `${(log.durationMs / 1000).toFixed(1)} dtk`}</td>
												<td>{usd(log.costUsd)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{data.logs.length === 0 && <p className="p-5 text-sm text-base-content/60">Belum ada pemakaian AI pada periode ini.</p>}
							<div className="flex items-center justify-between gap-3 border-t border-base-300 p-4">
								<button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
									Sebelumnya
								</button>
								<span className="text-xs">
									{data.page} / {data.pages}
								</span>
								<button className="btn btn-sm" disabled={page >= data.pages} onClick={() => setPage((v) => v + 1)}>
									Berikutnya
								</button>
							</div>
						</section>
					</div>
				)
			)}
		</>
	);
}
