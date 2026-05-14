import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cloudinaryAttachmentUrl } from '../lib/cloudinaryAttachmentUrl';

function formatRemaining(totalSeconds) {
  if (totalSeconds <= 0) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fileKind(file) {
  const m = file.mimetype || '';
  const name = file.filename || '';
  if (m.startsWith('image/')) return 'image';
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (/\.(mp4|webm|ogg|mov)$/i.test(name)) return 'video';
  if (m === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'other';
}

function IncomingFileCard({ file }) {
  const kind = fileKind(file);
  const downloadHref = file.download_url || cloudinaryAttachmentUrl(file.url, file.filename);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const btnStyle = {
    display: 'inline-block',
    marginRight: 8,
    marginTop: 8,
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#f4f4f5',
    color: '#111',
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer',
  };

  const runDownload = async () => {
    setDownloadBusy(true);
    try {
      const res = await fetch(downloadHref, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.filename || 'download';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadHref, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <li
      style={{
        listStyle: 'none',
        marginBottom: 20,
        padding: 16,
        border: '1px solid #e4e4e7',
        borderRadius: 10,
        background: '#fafafa',
        maxWidth: 560,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{file.filename}</div>

      {kind === 'image' ? (
        <img
          src={file.url}
          alt={file.filename}
          style={{
            maxWidth: '100%',
            maxHeight: 420,
            borderRadius: 8,
            display: 'block',
            background: '#fff',
          }}
        />
      ) : null}

      {kind === 'video' ? (
        <video
          src={file.url}
          controls
          style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, display: 'block', background: '#000' }}
        />
      ) : null}

      {kind === 'pdf' ? (
        <p style={{ margin: '8px 0', color: '#52525b', fontSize: '14px' }}>
          PDF — use Download to save a copy, or Open to view in the browser.
        </p>
      ) : null}

      {kind === 'other' ? (
        <p style={{ margin: '8px 0', color: '#52525b', fontSize: '14px' }}>Preview not available for this type.</p>
      ) : null}

      <div>
        <button
          type="button"
          style={{ ...btnStyle, fontFamily: 'inherit' }}
          disabled={downloadBusy}
          onClick={() => void runDownload()}
        >
          {downloadBusy ? 'Preparing…' : 'Download'}
        </button>
        <a href={file.url} target="_blank" rel="noreferrer" style={{ ...btnStyle, background: '#fff' }}>
          Open in new tab
        </a>
      </div>
    </li>
  );
}

function LaptopView({ sessionId, sessionExpiresAt, mobileConnected, files, status, onCreateSession }) {
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
      {!mobileConnected ? (
        <p>Scan this QR code from your mobile browser.</p>
      ) : (
        <p style={{ color: '#166534', maxWidth: 560 }}>
          Mobile connected — the QR code is hidden. Files you receive are listed below. Use <strong>New QR code</strong>{' '}
          to start another transfer.
        </p>
      )}
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
          {!mobileConnected ? (
            <>
              <QRCodeSVG value={qrValue} size={220} />
              <p>Session: {sessionId}</p>
              <p>
                Expires in: {formatRemaining(remainingSec)}
                {remainingSec <= 0 ? ' — refresh the page for a new QR code' : ''}
              </p>
            </>
          ) : (
            <p style={{ color: '#52525b' }}>
              Session expires in: {formatRemaining(remainingSec)}
              {remainingSec <= 0 ? ' — start a new session with the button below.' : ''}
            </p>
          )}
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
        <p style={{ color: '#71717a', fontSize: '14px', maxWidth: 560 }}>
          The server deletes each upload from Cloudinary after the retention window (default 15 minutes, override with{' '}
          <code>FILE_TTL_MINUTES</code> on the API). On hosts that sleep (e.g. Render free), cleanup runs when the
          server is awake. If assets never leave Cloudinary, check API logs for destroy errors and that Mongo still has
          the file row until delete succeeds.
        </p>
        {files.length ? (
          <ul style={{ paddingLeft: 0 }}>
            {files.map((file, index) => (
              <IncomingFileCard key={`${file.public_id}-${index}`} file={file} />
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
