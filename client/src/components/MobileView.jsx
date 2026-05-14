import { useState, useEffect } from 'react';
import { getBackendBaseUrl } from '../lib/apiBase';

function MobileView({ sessionId, onUpload, status }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [limitLabel, setLimitLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${getBackendBaseUrl()}/api/file/limits`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setLimitLabel(`${data.maxFileSizeMiB} MB per file`);
      })
      .catch(() => {
        if (!cancelled) setLimitLabel('10 MB per file (default)');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>QuickShare Mobile Upload</h1>
      <p>Session: {sessionId}</p>
      {limitLabel ? (
        <p style={{ color: '#71717a', fontSize: '14px' }}>
          Max size: <strong>{limitLabel}</strong> (Cloudinary Free is 10 MiB; “10 MB” files from the phone are often a
          bit larger and may fail — compress or upgrade Cloudinary and raise MAX_FILE_SIZE_BYTES on the API).
        </p>
      ) : (
        <p style={{ color: '#71717a', fontSize: '14px' }}>Loading upload limits…</p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          multiple
          onChange={(event) => setSelectedFiles(event.target.files)}
        />
        <div style={{ marginTop: '10px' }}>
          <button type="submit">Upload files</button>
        </div>
      </form>
      <p>{status}</p>
    </div>
  );
}

export default MobileView;
