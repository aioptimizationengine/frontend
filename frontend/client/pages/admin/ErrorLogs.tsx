import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Bug
} from 'lucide-react';

interface ErrorLog {
  id: string;
  timestamp: Date;
  severity: 'error' | 'warning' | 'critical';
  category: string;
  message: string;
  details: string;
  user_id?: string;
  resolved: boolean;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: Date;
}

export default function ErrorLogs() {
  const { user, hasPermission } = useAuth();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    fetchErrors();

    return () => {
      isMountedRef.current = false;
    };
  }, [severityFilter, categoryFilter, unresolvedOnly]);

  useEffect(() => {
    filterErrors();
  }, [errors, searchTerm, severityFilter, categoryFilter, unresolvedOnly]);

  const fetchErrors = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setErrors([]);
      }
    } catch (error) {
      console.log('Error logs unavailable');
      if (isMountedRef.current) {
        setErrors([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filterErrors = () => {
    let filtered = errors;

    if (searchTerm) {
      filtered = filtered.filter(error =>
        error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(error => error.severity === severityFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(error => error.category === categoryFilter);
    }

    if (unresolvedOnly) {
      filtered = filtered.filter(error => !error.resolved);
    }

    setFilteredErrors(filtered);
  };

  const handleResolveError = async () => {
    if (!selectedError || !resolutionNotes.trim()) return;

    try {
      // Update the error as resolved
      if (isMountedRef.current) {
        setErrors(prev => prev.map(error =>
          error.id === selectedError.id
            ? {
                ...error,
                resolved: true,
                resolution_notes: resolutionNotes,
                resolved_by: user?.name || 'Admin',
                resolved_at: new Date()
              }
            : error
        ));
      }
      
      setShowResolveDialog(false);
      setResolutionNotes('');
      setSelectedError(null);
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (!hasPermission('canViewAllUsers')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view error logs.</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalErrors: errors.length,
    unresolvedErrors: errors.filter(e => !e.resolved).length,
    criticalErrors: errors.filter(e => e.severity === 'critical' && !e.resolved).length,
    resolvedToday: errors.filter(e => 
      e.resolved && e.resolved_at && 
      new Date(e.resolved_at).toDateString() === new Date().toDateString()
    ).length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Bug className="mr-3 h-8 w-8 text-red-600" />
            Error Management
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor and resolve system errors and issues
          </p>
        </div>
        <Button onClick={fetchErrors} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalErrors}</p>
              </div>
              <Bug className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unresolved</p>
                <p className="text-2xl font-bold text-red-600">{stats.unresolvedErrors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalErrors}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search errors by message, category, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={unresolvedOnly ? "default" : "outline"}
              onClick={() => setUnresolvedOnly(!unresolvedOnly)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Unresolved Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Errors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logs ({filteredErrors.length})</CardTitle>
          <CardDescription>
            System errors and issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No errors to show</h3>
              <p className="text-gray-500">
                {searchTerm || severityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No errors match your current filters.'
                  : unresolvedOnly 
                    ? 'Great! No unresolved errors found.'
                    : 'No errors in the system.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredErrors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(error.severity)}
                        {getSeverityBadge(error.severity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{error.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{error.message}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {error.details}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(error.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {error.resolved ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                          {error.resolved_by && (
                            <div className="text-xs text-gray-500 mt-1">
                              by {error.resolved_by}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="destructive">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!error.resolved && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedError(error);
                            setShowResolveDialog(true);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Error Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Error</DialogTitle>
            <DialogDescription>
              Mark this error as resolved and add resolution notes
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div>
                <Label>Error Details</Label>
                <div className="p-3 bg-gray-50 rounded border mt-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getSeverityIcon(selectedError.severity)}
                    {getSeverityBadge(selectedError.severity)}
                    <Badge variant="outline">{selectedError.category}</Badge>
                  </div>
                  <p className="font-medium">{selectedError.message}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedError.details}</p>
                </div>
              </div>
              <div>
                <Label htmlFor="resolution-notes">Resolution Notes *</Label>
                <Textarea
                  id="resolution-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how this error was resolved..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResolveDialog(false);
                    setResolutionNotes('');
                    setSelectedError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleResolveError}
                  disabled={!resolutionNotes.trim()}
                >
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
