import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function formatRemaining(totalSeconds) {
  if (totalSeconds <= 0) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function LaptopView({ sessionId, sessionExpiresAt, files, status, onCreateSession }) {
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!sessionExpiresAt) {
      setRemainingSec(0);
      return;
    }
    const end = new Date(sessionExpiresAt).getTime();
    const tick = () => {
      setRemainingSec(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionExpiresAt]);

  const publicOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN || window.location.origin;
  const qrValue = `${publicOrigin}?session=${sessionId}`;
  const needsLanHint =
    !import.meta.env.VITE_PUBLIC_APP_ORIGIN && window.location.hostname === 'localhost';

  return (
    <div style={{ padding: '20px' }}>
      <h1>QuickShare Laptop</h1>
      <p>Scan this QR code from your mobile browser.</p>
      {needsLanHint ? (
        <p style={{ maxWidth: 520, color: '#b45309', background: '#fffbeb', padding: '12px', borderRadius: 8 }}>
          You opened this page on <strong>localhost</strong>. Your phone cannot reach your PC that way.
          Either open this site using the <strong>Network</strong> URL from the Vite terminal (for example{' '}
          <code>http://192.168.x.x:5173</code>), or set <code>VITE_PUBLIC_APP_ORIGIN</code> and{' '}
          <code>VITE_BACKEND_URL</code> in <code>client/.env</code> to your computer&apos;s LAN address (same host
          for both, ports 5173 and 5000).
        </p>
      ) : null}
      {sessionId ? (
        <div>
          <QRCodeSVG value={qrValue} size={220} />
          <p>Session: {sessionId}</p>
          <p>
            Expires in: {formatRemaining(remainingSec)}
            {remainingSec <= 0 ? ' — refresh the page for a new QR code' : ''}
          </p>
          <p>
            <button type="button" onClick={() => onCreateSession?.()}>
              New QR code
            </button>
          </p>
        </div>
      ) : (
        <p>Creating session...</p>
      )}
      <div style={{ marginTop: '20px' }}>
        <h2>Incoming files</h2>
        {files.length ? (
          <ul>
            {files.map((file, index) => (
              <li key={`${file.public_id}-${index}`}>
                <a href={file.url} target="_blank" rel="noreferrer">
                  {file.filename}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No files received yet.</p>
        )}
      </div>
      <p>{status}</p>
    </div>
  );
}

export default LaptopView;
