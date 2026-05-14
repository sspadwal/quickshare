import { useState, useEffect } from 'react';
import { getBackendBaseUrl } from '../lib/apiBase';

export function useSession() {
  const [sessionId, setSessionId] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
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
        if (data.expiresAt) {
          setSessionExpiresAt(data.expiresAt);
        }
        setStatus('Session ready');
      }
    } catch (error) {
      setStatus('Unable to create session');
    }
  };

  useEffect(() => {
    createSession();
  }, []);

  return { sessionId, sessionExpiresAt, status, createSession };
}
