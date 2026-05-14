import { useState, useEffect } from 'react';
import { getBackendBaseUrl } from '../lib/apiBase';

export function useSession() {
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('');

  const createSession = async () => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/api/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setStatus('QR code refreshed');
      }
    } catch (error) {
      setStatus('Unable to create session');
    }
  };

  useEffect(() => {
    createSession();
    const refreshInterval = setInterval(() => {
      createSession();
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, []);

  return { sessionId, status, createSession };
}