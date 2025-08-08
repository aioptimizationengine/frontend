import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Database,
  Server,
  Activity,
  Ban,
  UserX,
  Fingerprint,
  Smartphone
} from 'lucide-react';
import { UserRole } from '@shared/types';

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'permission_denied' | 'api_key_used' | 'data_export' | 'configuration_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    maxAge: number;
  };
  loginSecurity: {
    maxFailedAttempts: number;
    lockoutDuration: number;
    requireMFA: UserRole[];
    sessionTimeout: number;
    maxConcurrentSessions: number;
  };
  apiSecurity: {
    rateLimitEnabled: boolean;
    requestsPerMinute: number;
    requireApiKeyRotation: boolean;
    rotationInterval: number;
  };
  dataProtection: {
    encryptionEnabled: boolean;
    backupEncryption: boolean;
    auditLogging: boolean;
    dataRetention: number;
  };
}

interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
  blockedBy: string;
}

interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  startedAt: Date;
  lastActivity: Date;
  isCurrentSession: boolean;
}

export default function Security() {
  const { user, hasPermission } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = () => {
    // Mock security events
    setSecurityEvents([
      {
        id: '1',
        type: 'failed_login',
        severity: 'medium',
        description: 'Failed login attempt with invalid credentials',
        userEmail: 'attacker@example.com',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date('2024-01-22T14:30:00Z')
      },
      {
        id: '2',
        type: 'login_attempt',
        severity: 'low',
        description: 'Successful login from new location',
        userEmail: 'user@example.com',
        ipAddress: '203.0.113.15',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date('2024-01-22T13:15:00Z')
      },
      {
        id: '3',
        type: 'api_key_used',
        severity: 'low',
        description: 'API key accessed from new IP address',
        userEmail: 'admin@example.com',
        ipAddress: '198.51.100.42',
        timestamp: new Date('2024-01-22T12:45:00Z')
      },
      {
        id: '4',
        type: 'permission_denied',
        severity: 'high',
        description: 'Unauthorized attempt to access admin panel',
        userEmail: 'user@example.com',
        ipAddress: '192.168.1.100',
        timestamp: new Date('2024-01-22T11:20:00Z')
      },
      {
        id: '5',
        type: 'data_export',
        severity: 'medium',
        description: 'Large data export request',
        userEmail: 'admin@example.com',
        ipAddress: '192.168.1.10',
        timestamp: new Date('2024-01-22T10:30:00Z'),
        metadata: { exportSize: '2.3 GB', recordCount: 15000 }
      }
    ]);

    // Mock security configuration
    setSecurityConfig({
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
        maxAge: 90
      },
      loginSecurity: {
        maxFailedAttempts: 5,
        lockoutDuration: 15,
        requireMFA: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        sessionTimeout: 30,
        maxConcurrentSessions: 3
      },
      apiSecurity: {
        rateLimitEnabled: true,
        requestsPerMinute: 1000,
        requireApiKeyRotation: true,
        rotationInterval: 30
      },
      dataProtection: {
        encryptionEnabled: true,
        backupEncryption: true,
        auditLogging: true,
        dataRetention: 365
      }
    });

    // Mock blocked IPs
    setBlockedIPs([
      {
        id: '1',
        ipAddress: '192.168.1.50',
        reason: 'Multiple failed login attempts',
        blockedAt: new Date('2024-01-22T14:35:00Z'),
        expiresAt: new Date('2024-01-22T15:35:00Z'),
        blockedBy: 'admin@example.com'
      },
      {
        id: '2',
        ipAddress: '10.0.0.25',
        reason: 'Suspicious API usage pattern',
        blockedAt: new Date('2024-01-22T12:00:00Z'),
        blockedBy: 'System Auto-block'
      }
    ]);

    // Mock active sessions
    setActiveSessions([
      {
        id: '1',
        userId: '1',
        userEmail: 'admin@example.com',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        location: 'San Francisco, CA',
        startedAt: new Date('2024-01-22T08:00:00Z'),
        lastActivity: new Date('2024-01-22T14:30:00Z'),
        isCurrentSession: true
      },
      {
        id: '2',
        userId: '2',
        userEmail: 'user@example.com',
        ipAddress: '203.0.113.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'New York, NY',
        startedAt: new Date('2024-01-22T13:15:00Z'),
        lastActivity: new Date('2024-01-22T14:25:00Z'),
        isCurrentSession: false
      }
    ]);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login_attempt':
      case 'failed_login':
        return <Users className="h-4 w-4" />;
      case 'permission_denied':
        return <Ban className="h-4 w-4" />;
      case 'api_key_used':
        return <Key className="h-4 w-4" />;
      case 'data_export':
        return <Download className="h-4 w-4" />;
      case 'configuration_change':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const blockIP = (ipAddress: string, reason: string) => {
    const newBlock: BlockedIP = {
      id: Date.now().toString(),
      ipAddress,
      reason,
      blockedAt: new Date(),
      blockedBy: user?.email || 'Unknown'
    };
    setBlockedIPs(prev => [...prev, newBlock]);
  };

  const unblockIP = (id: string) => {
    setBlockedIPs(prev => prev.filter(block => block.id !== id));
  };

  const terminateSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  if (!hasPermission('canViewSystemMetrics')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view security settings.</p>
        </div>
      </div>
    );
  }

  const securityScore = 85; // Mock security score
  const threatLevel = 'Low'; // Mock threat level

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Management</h1>
            <p className="text-gray-600 mt-2">
              Monitor security events, manage access controls, and configure security policies
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setShowConfigDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Security Settings
            </Button>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-green-600">{securityScore}/100</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Threat Level</p>
                <p className="text-2xl font-bold text-blue-600">{threatLevel}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked IPs</p>
                <p className="text-2xl font-bold text-red-600">{blockedIPs.length}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-purple-600">{activeSessions.length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="mr-2 h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      <span>Encryption</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      <span>Backup Security</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      <span>Audit Logging</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                      <span>Rate Limiting</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-start space-x-3 p-2 border rounded">
                      <div className="mt-1">{getEventIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                      </div>
                      {getSeverityBadge(event.severity)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Monitor and investigate security-related events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getEventIcon(event.type)}
                          <span className="font-medium">{event.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.userEmail ? (
                          <div className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {event.userEmail}
                          </div>
                        ) : (
                          <span className="text-gray-400">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {event.ipAddress}
                        </code>
                      </TableCell>
                      <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                      <TableCell>{formatDate(event.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-6">
          {securityConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Minimum Length</span>
                      <span className="font-medium">{securityConfig.passwordPolicy.minLength} characters</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uppercase Required</span>
                      <CheckCircle className={`h-4 w-4 ${securityConfig.passwordPolicy.requireUppercase ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex justify-between">
                      <span>Numbers Required</span>
                      <CheckCircle className={`h-4 w-4 ${securityConfig.passwordPolicy.requireNumbers ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex justify-between">
                      <span>Special Chars Required</span>
                      <CheckCircle className={`h-4 w-4 ${securityConfig.passwordPolicy.requireSpecialChars ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex justify-between">
                      <span>Password Reuse Prevention</span>
                      <span className="font-medium">Last {securityConfig.passwordPolicy.preventReuse}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Login Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Max Failed Attempts</span>
                      <span className="font-medium">{securityConfig.loginSecurity.maxFailedAttempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lockout Duration</span>
                      <span className="font-medium">{securityConfig.loginSecurity.lockoutDuration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Session Timeout</span>
                      <span className="font-medium">{securityConfig.loginSecurity.sessionTimeout} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Concurrent Sessions</span>
                      <span className="font-medium">{securityConfig.loginSecurity.maxConcurrentSessions}</span>
                    </div>
                    <div>
                      <span>MFA Required For:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {securityConfig.loginSecurity.requireMFA.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Blocked IPs Tab */}
        <TabsContent value="blocked" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Blocked IP Addresses</CardTitle>
              <CardDescription>
                Manage IP addresses that have been blocked for security reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {block.ipAddress}
                        </code>
                      </TableCell>
                      <TableCell>{block.reason}</TableCell>
                      <TableCell>{formatDate(block.blockedAt)}</TableCell>
                      <TableCell>
                        {block.expiresAt ? formatDate(block.expiresAt) : 'Permanent'}
                      </TableCell>
                      <TableCell>{block.blockedBy}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unblockIP(block.id)}
                        >
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Monitor and manage active user sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          <div>
                            <div className="font-medium">{session.userEmail}</div>
                            {session.isCurrentSession && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Globe className="mr-1 h-3 w-3" />
                          {session.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {session.ipAddress}
                        </code>
                      </TableCell>
                      <TableCell>{formatDate(session.startedAt)}</TableCell>
                      <TableCell>{formatDate(session.lastActivity)}</TableCell>
                      <TableCell className="text-right">
                        {!session.isCurrentSession && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => terminateSession(session.id)}
                          >
                            <UserX className="mr-1 h-3 w-3" />
                            Terminate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Security Configuration</DialogTitle>
            <DialogDescription>
              Configure security policies and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Security Configuration</h3>
              <p className="text-gray-600">
                Advanced security configuration interface would be implemented here,
                allowing fine-tuned control over password policies, authentication
                requirements, and security monitoring settings.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
