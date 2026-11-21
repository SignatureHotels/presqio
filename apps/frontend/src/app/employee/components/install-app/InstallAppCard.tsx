import { useState } from "react";
import { useT } from "@/i18n";
import { dismissInstall, installApp, useInstallMode } from "@/utils/install-app";
import { Card } from "./InstallAppCard.style";

/** Offers to put Presqio on the home screen. Renders nothing once installed or dismissed. */
export function InstallAppCard() {
  const mode = useInstallMode();
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (!mode) return null;

  async function install() {
    setBusy(true);
    await installApp().catch(() => false);
    setBusy(false);
  }

  return (
    <Card aria-label={t("install.title")}>
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="text">
        <strong>{t("install.title")}</strong>
        <small>{mode === "ios" ? t("install.iosSteps") : t("install.subtitle")}</small>
      </div>
      <div className="actions">
        {mode === "prompt" && (
          <button type="button" className="install" onClick={() => void install()} disabled={busy}>
            {t("install.button")}
          </button>
        )}
        <button type="button" className="later" onClick={dismissInstall}>
          {t("install.later")}
        </button>
      </div>
    </Card>
  );
}
