import { useEffect, useState } from 'react';
import { Button } from '../ui';

export function InstallPrompt() {
  const [event, setEvent] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('lexora-install-dismissed') === '1');
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setEvent(e);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (dismissed) return null;
  if (!event && !ios) return null;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <p className="font-semibold">Install Lexora LegalDesk</p>
      {event ? (
        <p className="mt-1 text-sm text-muted">Add this workspace to your home screen for quicker access. This is a browser app, not a store-listed native app.</p>
      ) : (
        <p className="mt-1 text-sm text-muted">On iPhone, open Share, then choose Add to Home Screen.</p>
      )}
      <div className="mt-3 flex gap-2">
        {event ? (
          <Button
            onClick={async () => {
              event.prompt();
              await event.userChoice;
              setEvent(null);
            }}
          >
            Install
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            localStorage.setItem('lexora-install-dismissed', '1');
            setDismissed(true);
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
