import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Zap,
  Clock,
  Info
} from 'lucide-react';
import { useApiController, fetchWithTimeout, TIMEOUT_DURATIONS, handleApiError } from '@/lib/api-utils';

interface HealthService {
  database: boolean;
  redis: boolean;
  anthropic: boolean;
  openai: boolean;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthService;
  response_time: string;
  timestamp: string;
  version: string;
}

interface HealthResponse {
  success: boolean;
  data: HealthData;
  error: string | null;
  timestamp: string;
}

export default function HealthCheck() {
  const { user, hasPermission } = useAuth();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const { isMountedRef, cleanupAll } = useApiController();

  const fetchHealthData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithTimeout(`/api/health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-cache',
        timeout: TIMEOUT_DURATIONS.MEDIUM
      }, isMountedRef);

      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (Status: ${response.status})`);
      }

      // Try to parse JSON response
      let result: HealthResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid JSON response from server (Status: ${response.status})`);
      }

      if (response.ok && result.success) {
        setHealthData(result.data);
        setLastUpdated(new Date());
        setError(null);
        setConsecutiveFailures(0);
        setIsCircuitOpen(false);
      } else {
        // Handle 503 or other errors with backend unavailable
        setError(`Backend service error (HTTP ${response.status})`);
        const fallbackData: HealthData = {
          status: 'unhealthy',
          services: {
            database: false,
            redis: false,
            anthropic: false,
            openai: false
          },
          response_time: '0.000s',
          timestamp: new Date().toISOString(),
          version: 'Unknown'
        };
        setHealthData(fallbackData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = handleApiError(err, isMountedRef) || 'Health check failed';

      if (isMountedRef.current) {
        setError(errorMessage);
      }

      // Increment failure count and check circuit breaker
      setConsecutiveFailures(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setIsCircuitOpen(true);
        }
        return newCount;
      });

      // Show fallback data when completely unable to reach API
      const fallbackData: HealthData = {
        status: 'unhealthy',
        services: {
          database: false,
          redis: false,
          anthropic: false,
          openai: false
        },
        response_time: '0.000s',
        timestamp: new Date().toISOString(),
        version: 'Unknown'
      };
      setHealthData(fallbackData);
      setLastUpdated(new Date());
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh with circuit breaker logic
    const interval = setInterval(() => {
      // If circuit is open, reduce frequency to every 2 minutes
      if (isCircuitOpen) {
        return;
      }
      fetchHealthData();
    }, 30000);

    // Separate interval for circuit breaker recovery (every 2 minutes)
    const recoveryInterval = setInterval(() => {
      if (isCircuitOpen) {
        fetchHealthData();
      }
    }, 120000);

    return () => {
      clearInterval(interval);
      clearInterval(recoveryInterval);
      cleanupAll();
    };
  }, [isCircuitOpen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceIcon = (serviceName: string, isHealthy: boolean) => {
    const iconProps = {
      className: `h-5 w-5 ${isHealthy ? 'text-green-500' : 'text-red-500'}`
    };

    switch (serviceName) {
      case 'database': return <Database {...iconProps} />;
      case 'redis': return <Server {...iconProps} />;
      case 'anthropic': return <Zap {...iconProps} />;
      case 'openai': return <Activity {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const healthyServices = healthData ? Object.values(healthData.services).filter(Boolean).length : 0;
  const totalServices = healthData ? Object.keys(healthData.services).length : 0;

  if (!hasPermission('canViewAllUsers')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view system health. Only super admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Activity className="mr-3 h-8 w-8 text-blue-600" />
              System Health Check
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor the status of all system services and infrastructure
            </p>
          </div>
          <Button
            onClick={fetchHealthData}
            disabled={isLoading}
            variant="outline"
            className="flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert className={`mb-6 ${isCircuitOpen ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <AlertTriangle className={`h-4 w-4 ${isCircuitOpen ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription className={isCircuitOpen ? 'text-red-800' : 'text-orange-800'}>
            <strong>{isCircuitOpen ? 'Circuit Breaker Active:' : 'Backend Connection Issue:'}</strong> {error}
            <br />
            <span className="text-sm">
              {isCircuitOpen
                ? `Connection failed ${consecutiveFailures} times. Health checks reduced to every 2 minutes to prevent spam.`
                : error.includes('Network error') || error.includes('Failed to fetch') || error.includes('timeout')
                ? 'Cannot establish connection to backend at 192.168.0.105:8000. Ensure the server is running and accessible from this network.'
                : error.includes('Backend service') || error.includes('503')
                ? 'The backend service returned an error. The server may be starting up or experiencing issues.'
                : 'Unable to reach health API. Showing fallback status.'}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Status</p>
                <p className={`text-2xl font-bold ${healthData ? getStatusColor(healthData.status) : 'text-gray-400'}`}>
                  {healthData ? healthData.status.toUpperCase() : 'CHECKING...'}
                </p>
                {error && (
                  <p className="text-xs text-orange-600 mt-1">Backend Offline</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${error ? 'bg-red-50' : 'bg-blue-50'}`}>
                <Activity className={`h-6 w-6 ${error ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Services Online</p>
                <p className="text-2xl font-bold text-gray-900">
                  {healthyServices}/{totalServices}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Server className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {healthData ? healthData.response_time : '---'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Version</p>
                <p className="text-2xl font-bold text-gray-900">
                  {healthData ? healthData.version : '---'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50">
                <Info className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              Service Status
            </CardTitle>
            <CardDescription>
              Individual status of all system services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthData ? (
              <div className="space-y-4">
                {Object.entries(healthData.services).map(([serviceName, isHealthy]) => (
                  <div key={serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getServiceIcon(serviceName, isHealthy)}
                      <div>
                        <h4 className="font-medium capitalize">{serviceName}</h4>
                        <p className="text-sm text-gray-600">
                          {serviceName === 'database' && 'PostgreSQL Database'}
                          {serviceName === 'redis' && 'Redis Cache Server'}
                          {serviceName === 'anthropic' && 'Anthropic Claude API'}
                          {serviceName === 'openai' && 'OpenAI GPT API'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isHealthy ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <Badge className="bg-green-100 text-green-800">Online</Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <Badge variant="destructive">Offline</Badge>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="mx-auto h-12 w-12 mb-4 text-gray-300 animate-pulse" />
                <p>Loading service status...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Additional system details and metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Last Check */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Last Health Check</h4>
                  <p className="text-sm text-gray-600">
                    {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>

              {/* Status Badge */}
              {healthData && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Current Status</h4>
                    <p className="text-sm text-gray-600">System operational status</p>
                  </div>
                  <Badge className={getStatusBadge(healthData.status)} size="lg">
                    {healthData.status.toUpperCase()}
                  </Badge>
                </div>
              )}

              {/* API Timestamp */}
              {healthData && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">API Timestamp</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(healthData.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Server className="h-5 w-5 text-gray-400" />
                </div>
              )}

              {/* Auto-refresh */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h4 className="font-medium text-blue-900">Auto-refresh</h4>
                  <p className="text-sm text-blue-700">Updates every 30 seconds</p>
                </div>
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Degraded Status Alert */}
      {healthData && healthData.status === 'degraded' && (
        <Alert className="mt-8 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>System Degraded:</strong> Some services are experiencing issues. 
            Check the service status above for details. Functionality may be limited.
          </AlertDescription>
        </Alert>
      )}

      {/* Unhealthy Status Alert */}
      {healthData && healthData.status === 'unhealthy' && (
        <Alert className="mt-8 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error ? (
              <>
                <strong>Backend Unavailable:</strong> The backend service is not accessible.
                <br />
                <span className="text-sm">
                  To see live health data, ensure your backend server at 192.168.0.105:8000 is running and accessible from this network.
                </span>
              </>
            ) : (
              <>
                <strong>System Unhealthy:</strong> Critical services are down.
                Immediate attention required. Some features may be unavailable.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Backend Connection Instructions */}
      {error && (
        <div className="mt-8 space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-900">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Network Configuration Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="text-red-800">
              <div className="space-y-3 text-sm">
                <p><strong>Private IP Address Detected:</strong></p>
                <p>Your backend is running on <code className="bg-red-100 px-1 rounded">192.168.0.105:8000</code>, which is a private network IP address.</p>
                <p className="font-medium text-red-900">This cloud-hosted frontend cannot reach private IP addresses.</p>

                <div className="bg-red-100 p-3 rounded mt-3">
                  <p className="font-medium mb-2">Solutions:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li><strong>Use ngrok:</strong> <code className="bg-white px-1 rounded">ngrok http 8000</code> to get a public URL</li>
                    <li><strong>Deploy to cloud:</strong> Use services like Railway, Render, or Heroku</li>
                    <li><strong>Run frontend locally:</strong> Download and run this frontend on your machine</li>
                    <li><strong>Use public IP:</strong> If your router supports it, use port forwarding</li>
                  </ol>
                </div>

                <p className="mt-3 text-xs text-red-700">
                  {isCircuitOpen
                    ? 'Circuit breaker active: Health checks paused until network is accessible.'
                    : 'The health check will continue trying every 30 seconds.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900">
                <Info className="mr-2 h-5 w-5" />
                Quick Solution: Use ngrok
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              <div className="space-y-2 text-sm">
                <p><strong>Recommended: Use ngrok to expose your backend:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Install ngrok: <code className="bg-blue-100 px-1 rounded">npm install -g ngrok</code></li>
                  <li>Run: <code className="bg-blue-100 px-1 rounded">ngrok http 8000</code></li>
                  <li>Copy the https URL (e.g., https://abc123.ngrok.io)</li>
                  <li>Update your server configuration to use the ngrok URL</li>
                </ol>
                <p className="mt-2 text-xs">This will make your local backend accessible from anywhere on the internet.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-900">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Network Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-800">
              <div className="space-y-2 text-sm">
                <p><strong>If connection fails, check:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Backend server is running: <code>curl http://192.168.0.105:8000/health</code></li>
                  <li>Network connectivity: <code>ping 192.168.0.105</code></li>
                  <li>Port 8000 is not blocked by firewall</li>
                  <li>CORS headers allow requests from this domain</li>
                  <li>Backend logs for any startup errors</li>
                </ul>
                <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
                  <strong>Quick test:</strong> Try accessing <a href="http://192.168.0.105:8000/health" target="_blank" rel="noopener noreferrer" className="underline">http://192.168.0.105:8000/health</a> directly in your browser.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
