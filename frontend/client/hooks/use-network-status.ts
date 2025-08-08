import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isBackendAvailable: boolean;
  lastChecked: Date | null;
  checkBackendStatus: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('/api/ping', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      setIsBackendAvailable(response.ok);
      setLastChecked(new Date());
    } catch (error) {
      setIsBackendAvailable(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Check status on mount
    checkBackendStatus();

    // Check status every 2 minutes
    const interval = setInterval(checkBackendStatus, 120000);

    return () => clearInterval(interval);
  }, []);

  return {
    isBackendAvailable,
    lastChecked,
    checkBackendStatus,
  };
}
