import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function LaptopView({ sessionId, files, status, onCreateSession }) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    setCountdown(15);
    const countdownTimer = setInterval(() => {
      setCountdown((value) => (value <= 1 ? 15 : value - 1));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [sessionId]);

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
          <p>Expires in: {countdown} seconds</p>
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