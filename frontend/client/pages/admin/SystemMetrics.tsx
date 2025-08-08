import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';

interface SystemOverview {
  server_status: 'healthy' | 'warning' | 'critical';
  total_users: number;
  active_users_24h: number;
  total_api_calls_today: number;
  average_response_time: number;
  error_rate: number;
  uptime_percentage: number;
}

interface ApiUsageMetrics {
  provider: string;
  total_calls: number;
  total_cost: number;
  average_response_time: number;
  error_count: number;
  success_rate: number;
}

export default function SystemMetrics() {
  const { user, hasPermission } = useAuth();
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsageMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const [selectedDays, setSelectedDays] = useState('7');
  const [selectedProvider, setSelectedProvider] = useState('all');

  useEffect(() => {
    isMountedRef.current = true;
    fetchSystemOverview();
    fetchApiUsage();

    return () => {
      isMountedRef.current = false;
    };
  }, [selectedDays, selectedProvider]);

  const fetchSystemOverview = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setOverview(null);
      }
    } catch (error) {
      console.log('System metrics unavailable');
      if (isMountedRef.current) {
        setOverview(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchApiUsage = async () => {
    try {
      // For now, show empty state since API isn't available
      if (isMountedRef.current) {
        setApiUsage([]);
      }
    } catch (error) {
      console.log('API usage metrics unavailable');
      if (isMountedRef.current) {
        setApiUsage([]);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!hasPermission('canViewAllUsers')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view system metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="mr-3 h-8 w-8 text-blue-600" />
            System Metrics
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor system performance, API usage, and infrastructure health
          </p>
        </div>
        <Button onClick={fetchSystemOverview} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="api-usage">API Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          {overview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">System Status</p>
                      <Badge className={getStatusColor(overview.server_status)}>
                        {overview.server_status.toUpperCase()}
                      </Badge>
                    </div>
                    <Server className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{overview.total_users}</p>
                      <p className="text-xs text-gray-500">{overview.active_users_24h} active (24h)</p>
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">API Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">{overview.total_api_calls_today.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{overview.average_response_time}ms avg response</p>
                    </div>
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uptime</p>
                      <p className="text-2xl font-bold text-gray-900">{overview.uptime_percentage.toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">{overview.error_rate.toFixed(3)}% error rate</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="mx-auto h-8 w-8 mb-4 text-gray-300" />
                      <p className="text-sm">No metrics available</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Infrastructure Status */}
          <Card>
            <CardHeader>
              <CardTitle>Infrastructure Status</CardTitle>
              <CardDescription>Real-time system component health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-gray-500">PostgreSQL</p>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Cpu className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">CPU Usage</p>
                      <p className="text-sm text-gray-500">Server load</p>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">-</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <HardDrive className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Storage</p>
                      <p className="text-sm text-gray-500">Disk usage</p>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">-</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-usage" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
                  <Select value={selectedDays} onValueChange={setSelectedDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last 24 hours</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Provider</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="All providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Usage Metrics */}
          {apiUsage.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {apiUsage.map((usage, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      {usage.provider.charAt(0).toUpperCase() + usage.provider.slice(1)} Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{usage.total_calls.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Total Calls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(usage.total_cost)}</p>
                        <p className="text-sm text-gray-600">Total Cost</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{usage.average_response_time}ms</p>
                        <p className="text-sm text-gray-600">Avg Response</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{usage.error_count}</p>
                        <p className="text-sm text-gray-600">Errors</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{usage.success_rate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">Success Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API usage data</h3>
                <p className="text-gray-500">
                  API usage metrics will appear here once the system starts tracking calls.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
