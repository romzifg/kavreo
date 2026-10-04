import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { usePwaStore, type InstallPrompt } from "@/stores/pwa.store";

export function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  useEffect(() => {
    const { setInstalled, setInstallPrompt } = usePwaStore.getState();
    const display = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const done = () => { setInstalled(true); setInstallPrompt(null); };
    sync();
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    display.addEventListener("change", sync);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
      display.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  if (online && !needRefresh) return null;
  return (
    <aside className="pwa-status surface fixed z-50 mx-3 flex max-w-md items-start gap-3 p-4 shadow-xl" role="status" aria-live="polite">
      {online ? <RefreshCw className="mt-1 size-5 shrink-0 text-primary" /> : <WifiOff className="mt-1 size-5 shrink-0 text-warning" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{online ? "Versi baru Kavreo tersedia" : "Kamu sedang offline"}</p>
        <p className="mt-1 text-xs leading-relaxed text-base-content/65">{online ? "Simpan pekerjaanmu sebelum memperbarui aplikasi." : "Tampilan aplikasi tetap bisa dibuka. Login, memuat data, dan menyimpan konten membutuhkan internet."}</p>
        {online && <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => void updateServiceWorker(true)}>Perbarui sekarang</button>}
      </div>
      {online && <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Tunda pembaruan" onClick={() => setNeedRefresh(false)}><X className="size-4" /></button>}
    </aside>
  );
}
