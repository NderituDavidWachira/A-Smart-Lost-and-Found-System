import { useEffect, useState } from "react";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as an installed app: hide the button.
  if (installed) return null;

  async function handleClick() {
    if (promptEvent) {
      // Browser allows a direct install (Chrome / Edge / Android)
      promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
      return;
    }
    // Otherwise show manual steps
    setShowHelp((v) => !v);
  }

  return (
    <div className="install-wrap">
      <button type="button" className="install-btn" onClick={handleClick}>
        ⬇ Install app
      </button>

      {showHelp && (
        <p className="install-help">
          {isIos() ? (
            <>
              Tap the <strong>Share</strong> button in Safari, then choose <strong>Add to Home Screen</strong>.
            </>
          ) : (
            <>
              Click the <strong>install icon</strong> in the address bar, or open the browser menu and choose{" "}
              <strong>Install app</strong> (Chrome, Edge, or Android). Not available in Firefox.
            </>
          )}
        </p>
      )}
    </div>
  );
}