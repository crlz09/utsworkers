import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

function isStandaloneDisplay() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed || !installPrompt) {
    return null;
  }

  const install = async () => {
    installPrompt.prompt();
    const outcome = await installPrompt.userChoice;

    if (outcome?.outcome === "accepted") {
      setInstalled(true);
    }

    setInstallPrompt(null);
  };

  return (
    <button type="button" className="uts-install-btn" onClick={install}>
      <Download size={16} />
      <span>Install</span>
    </button>
  );
}
