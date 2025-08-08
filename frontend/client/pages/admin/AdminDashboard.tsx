import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Users,
  Server,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Shield,
  Bug,
  CreditCard,
  Globe,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SystemOverview {
  users: {
    total: number;
    active_24h: number;
    new_this_month: number;
    growth_rate: number;
  };
  subscriptions: {
    total: number;
    active: number;
    revenue_monthly: number;
    revenue_growth: number;
  };
  system: {
    uptime: number;
    response_time: number;
    error_rate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  api: {
    calls_today: number;
    calls_growth: number;
    providers: Array<{
      name: string;
      calls: number;
      cost: number;
      status: 'online' | 'offline' | 'degraded';
    }>;
  };
  errors: {
    total_unresolved: number;
    critical_count: number;
    resolved_today: number;
  };
}

interface ActivityLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target: string;
  timestamp: Date;
  details: string;
}

export default function AdminDashboard() {
  const { user, hasPermission } = useAuth();
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemOverview();
    fetchRecentActivity();
  }, []);

  const fetchSystemOverview = async () => {
    try {
      setLoading(true);
      // For now, show empty state since API isn't available
      setOverview(null);
    } catch (error) {
      console.log('System overview unavailable');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // For now, show empty state since API isn't available
      setActivityLogs([]);
    } catch (error) {
      console.log('Activity logs unavailable');
      setActivityLogs([]);
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSystemStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProviderStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (!hasPermission('canViewAllUsers')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view admin dashboard.</p>
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            System overview and administrative controls
          </p>
        </div>
        <Button onClick={fetchSystemOverview} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {overview ? (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.users.total.toLocaleString()}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      {getTrendIcon(overview.users.growth_rate)}
                      <span className={`text-sm ${getTrendColor(overview.users.growth_rate)}`}>
                        {formatPercentage(overview.users.growth_rate)}
                      </span>
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.subscriptions.revenue_monthly)}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      {getTrendIcon(overview.subscriptions.revenue_growth)}
                      <span className={`text-sm ${getTrendColor(overview.subscriptions.revenue_growth)}`}>
                        {formatPercentage(overview.subscriptions.revenue_growth)}
                      </span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">API Calls Today</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.api.calls_today.toLocaleString()}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      {getTrendIcon(overview.api.calls_growth)}
                      <span className={`text-sm ${getTrendColor(overview.api.calls_growth)}`}>
                        {formatPercentage(overview.api.calls_growth)}
                      </span>
                    </div>
                  </div>
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <div className="mt-1">
                      {getSystemStatusBadge(overview.system.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {overview.system.uptime.toFixed(2)}% uptime
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">System Overview</TabsTrigger>
              <TabsTrigger value="providers">API Providers</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Performance</CardTitle>
                    <CardDescription>Real-time system metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Uptime</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{overview.system.uptime.toFixed(2)}%</div>
                        <Progress value={overview.system.uptime} className="w-20 h-2" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Response Time</span>
                      </div>
                      <div className="font-medium">{overview.system.response_time}ms</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Error Rate</span>
                      </div>
                      <div className="font-medium">{(overview.system.error_rate * 100).toFixed(3)}%</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Critical Alerts</CardTitle>
                    <CardDescription>Issues requiring immediate attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Bug className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium">Unresolved Errors</p>
                            <p className="text-xs text-gray-500">System errors pending resolution</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{overview.errors.total_unresolved}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium">Critical Errors</p>
                            <p className="text-xs text-gray-500">High priority issues</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{overview.errors.critical_count}</Badge>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Link to="/admin/errors">
                          <Button variant="outline" className="w-full">
                            <Bug className="mr-2 h-4 w-4" />
                            Manage Errors
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User & Subscription Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>User engagement metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{overview.users.active_24h}</div>
                        <div className="text-sm text-gray-600">Active (24h)</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{overview.users.new_this_month}</div>
                        <div className="text-sm text-gray-600">New This Month</div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link to="/admin/users">
                        <Button variant="outline" className="w-full">
                          <Users className="mr-2 h-4 w-4" />
                          Manage Users
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Overview</CardTitle>
                    <CardDescription>Revenue and subscription metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{overview.subscriptions.active}</div>
                        <div className="text-sm text-gray-600">Active Subscriptions</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(overview.subscriptions.revenue_monthly)}</div>
                        <div className="text-sm text-gray-600">Monthly Revenue</div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link to="/admin/subscriptions">
                        <Button variant="outline" className="w-full">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Subscriptions
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overview.api.providers.map((provider, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{provider.name}</CardTitle>
                        {getProviderStatusIcon(provider.status)}
                      </div>
                      <CardDescription>API provider status and usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Calls Today</span>
                          <span className="font-medium">{provider.calls.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cost Today</span>
                          <span className="font-medium">{formatCurrency(provider.cost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Status</span>
                          <Badge 
                            className={
                              provider.status === 'online' ? 'bg-green-100 text-green-800' :
                              provider.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {provider.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Admin Activity</CardTitle>
                  <CardDescription>Latest administrative actions and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                      <p>No recent activity to show</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Activity className="h-4 w-4 text-blue-500 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {log.admin_name} {log.action} {log.target}
                            </p>
                            <p className="text-xs text-gray-500">{log.details}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Empty State Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="mx-auto h-8 w-8 mb-4 text-gray-300" />
                    <p className="text-sm">No data available</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Access to Admin Features */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Quick Actions</CardTitle>
              <CardDescription>Access key administrative features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    User Management
                  </Button>
                </Link>
                <Link to="/admin/metrics">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    System Metrics
                  </Button>
                </Link>
                <Link to="/admin/errors">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <Bug className="h-6 w-6 mb-2" />
                    Error Management
                  </Button>
                </Link>
                <Link to="/admin/subscriptions">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <CreditCard className="h-6 w-6 mb-2" />
                    Subscriptions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
