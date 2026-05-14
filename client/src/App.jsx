import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import LaptopView from './components/LaptopView';
import MobileView from './components/MobileView';
import { useSession } from './hooks/useSession';
import { getBackendBaseUrl } from './lib/apiBase';

function App() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionParam = searchParams.get('session');
  const [sessionId, setSessionId] = useState(sessionParam || '');
  const [status, setStatus] = useState('');
  const [files, setFiles] = useState([]);
  const [mobileConnected, setMobileConnected] = useState(false);

  const {
    sessionId: generatedSessionId,
    sessionExpiresAt,
    status: sessionStatus,
    createSession: createSessionFromHook,
  } = useSession();

  const createSession = async () => {
    setMobileConnected(false);
    await createSessionFromHook();
  };

  useEffect(() => {
    if (sessionParam) {
      setSessionId(sessionParam);
    } else {
      setSessionId(generatedSessionId);
      setStatus(sessionStatus);
    }
  }, [sessionParam, generatedSessionId, sessionStatus]);

  useEffect(() => {
    if (!sessionId) return;

    const backendUrl = getBackendBaseUrl();
    const newSocket = io(backendUrl, { transports: ['websocket'] });

    const role = sessionParam ? 'mobile' : 'laptop';

    newSocket.on('connect', () => {
      newSocket.emit('joinSession', sessionId, role);
    });

    newSocket.on('mobile.joined', () => {
      if (!sessionParam) {
        setMobileConnected(true);
      }
    });

    newSocket.on('file.uploaded', (payload) => {
      if (payload?.files) {
        setFiles((prev) => [...prev, ...payload.files]);
        setStatus('File received from mobile');
      }
    });

    newSocket.on('connect_error', () => {
      setStatus('Socket connection failed');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, sessionParam]);

  const uploadFiles = async (selectedFiles) => {
    if (!selectedFiles.length) {
      setStatus('Please select one or more files.');
      return;
    }

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${getBackendBaseUrl()}/api/file/upload?session=${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(errorData.message || 'Upload failed');
        return;
      }

      setStatus('Upload complete. Laptop will receive the file shortly.');
    } catch (error) {
      setStatus('Upload failed.');
    }
  };

  if (sessionParam) {
    return <MobileView sessionId={sessionId} onUpload={uploadFiles} status={status} />;
  }

  return (
    <LaptopView
      sessionId={sessionId}
      sessionExpiresAt={sessionExpiresAt}
      mobileConnected={mobileConnected}
      files={files}
      status={status}
      onCreateSession={createSession}
    />
  );
}

export default App;
