import { useState } from 'react';

function MobileView({ sessionId, onUpload, status }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>QuickShare Mobile Upload</h1>
      <p>Session: {sessionId}</p>
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