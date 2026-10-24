"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const prompt = useRef<InstallPrompt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const update = () => setVisible(!(display.matches || (navigator as Navigator & { standalone?: boolean }).standalone));
    const capture = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
      update();
    };
    const installed = () => {
      prompt.current = null;
      setVisible(false);
      dialog.current?.close();
    };
    update();
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", update);
    if (process.env.NODE_ENV === "production" && window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/pos-sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        setNotice("Offline setup is unavailable. Reconnect and open POS to retry.");
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", update);
    };
  }, []);

  async function install() {
    const pending = prompt.current;
    if (!pending) {
      dialog.current?.showModal();
      return;
    }
    prompt.current = null;
    setBusy(true);
    try {
      const result = await pending.prompt();
      if (result.outcome === "accepted") setVisible(false);
    } catch {
      setNotice("Use your browser menu to install the app, or try again later.");
      dialog.current?.showModal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {visible && <div className="install-app-bar no-print">
        <div className="flex min-w-0 items-center gap-2"><Smartphone size={18} aria-hidden="true" /><span><strong>Ilyas POS</strong><span className="hidden sm:inline"> · Your counter, one tap away</span></span></div>
        <button type="button" onClick={install} disabled={busy} className="install-app-button"><Download size={16} aria-hidden="true" />{busy ? "Opening…" : "Install app"}</button>
      </div>}
      <dialog ref={dialog} className="install-app-dialog no-print" aria-labelledby="install-title">
        <div className="flex items-center justify-between gap-4"><h2 id="install-title" className="text-xl font-bold">Install Ilyas POS</h2><button type="button" aria-label="Close installation guide" className="rounded-lg p-2" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
        <p className="mt-3 text-sm text-stone-600">Open your counter from your home screen or desktop in its own app window.</p>
        <ul className="my-5 space-y-4 text-sm leading-6">
          <li><strong>Android / Windows:</strong> Open the browser menu in Chrome or Edge and choose Install app or Add to Home screen, if offered.</li>
          <li><strong>iPhone / iPad:</strong> Open in Safari, tap Share, then Add to Home Screen. Enable Open as Web App if offered.</li>
          <li><strong>Mac:</strong> In Safari, choose File → Add to Dock if available, or use Chrome’s install option.</li>
        </ul>
        <p className="rounded-xl bg-orange-50 p-3 text-sm leading-6 text-orange-900">After installation, sign in, select your branch and open POS while online. Check that POS is saved for offline reopening before disconnecting. Sign-in and administration need a connection.</p>
        <p className="mt-3 text-xs leading-5 text-stone-500">Installation requires HTTPS or localhost and a supported browser. If already installed, launch it from your device. In development, use a production build to test offline reopening.</p>
        {notice && <p role="status" className="mt-3 text-sm text-amber-800">{notice}</p>}
        <button type="button" className="btn-primary mt-5 w-full" onClick={() => dialog.current?.close()}>Got it</button>
      </dialog>
    </>
  );
}
