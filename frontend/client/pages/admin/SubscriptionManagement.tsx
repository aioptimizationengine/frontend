import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Users,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { fetchWithTimeout, TIMEOUT_DURATIONS, handleApiError } from '@/lib/api-utils';

interface Subscription {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan: 'free' | 'bring_your_own_key' | 'platform_managed' | 'enterprise';
  status: 'active' | 'cancelled' | 'suspended' | 'expired';
  created_at: Date;
  updated_at: Date;
  current_period_start: Date;
  current_period_end: Date;
  credits_remaining: number;
  credits_used_this_month: number;
  monthly_limit: number;
  billing_amount: number;
}

export default function SubscriptionManagement() {
  const { user, hasPermission } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    plan: '',
    status: '',
    credits_remaining: 0
  });

  useEffect(() => {
    isMountedRef.current = true;
    fetchSubscriptions();

    return () => {
      isMountedRef.current = false;
    };
  }, [statusFilter, planFilter]);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchTerm, statusFilter, planFilter]);

  const fetchSubscriptions = async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setSubscriptions([]);
    }

    try {
      const response = await fetchWithTimeout('/api/admin/subscriptions', {
        timeout: TIMEOUT_DURATIONS.SHORT
      }, isMountedRef);

      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current && data.success && data.data) {
          setSubscriptions(data.data);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('Subscriptions API error:', errorData.error || 'Service unavailable');
      }
    } catch (error) {
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('Subscriptions request failed:', errorMessage);
      }
      if (isMountedRef.current) {
        setSubscriptions([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filterSubscriptions = () => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(sub => sub.plan === planFilter);
    }

    setFilteredSubscriptions(filtered);
  };

  const handleEditSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetchWithTimeout(`/api/admin/subscriptions/${selectedSubscription.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          plan: editForm.plan,
          status: editForm.status,
          credits_remaining: editForm.credits_remaining
        }),
        timeout: TIMEOUT_DURATIONS.SHORT
      }, isMountedRef);

      if (response.ok) {
        const data = await response.json();
        if (data.success && isMountedRef.current) {
          setSubscriptions(prev => prev.map(sub =>
            sub.id === selectedSubscription.id
              ? {
                  ...sub,
                  plan: editForm.plan as any,
                  status: editForm.status as any,
                  credits_remaining: editForm.credits_remaining,
                  updated_at: new Date()
                }
              : sub
          ));
          setShowEditDialog(false);
          setSelectedSubscription(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update subscription');
      }
    } catch (error) {
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.error('Failed to update subscription:', errorMessage);
      }
    }
  };

  const openEditDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditForm({
      plan: subscription.plan,
      status: subscription.status,
      credits_remaining: subscription.credits_remaining
    });
    setShowEditDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      'free': 'bg-gray-100 text-gray-800',
      'bring_your_own_key': 'bg-blue-100 text-blue-800',
      'platform_managed': 'bg-purple-100 text-purple-800',
      'enterprise': 'bg-gold-100 text-gold-800'
    };

    return (
      <Badge className={colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {plan.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!hasPermission('canViewAllUsers')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage subscriptions.</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + s.billing_amount, 0),
    totalCreditsIssued: subscriptions.reduce((sum, s) => sum + s.credits_remaining, 0)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CreditCard className="mr-3 h-8 w-8 text-purple-600" />
            Subscription Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage user subscriptions, plans, and billing
          </p>
        </div>
        <Button onClick={fetchSubscriptions} variant="outline" disabled={loading}>
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
                <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubscriptions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credits Issued</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalCreditsIssued.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
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
                  placeholder="Search by user name, email, or subscription ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="bring_your_own_key">Bring Your Own Key</SelectItem>
                <SelectItem value="platform_managed">Platform Managed</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({filteredSubscriptions.length})</CardTitle>
          <CardDescription>
            User subscription details and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions to show</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                  ? 'No subscriptions match your current filters.'
                  : 'No subscriptions found in the system.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.user_name}</div>
                        <div className="text-sm text-gray-500">{subscription.user_email}</div>
                        <div className="text-xs text-gray-400">ID: {subscription.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPlanBadge(subscription.plan)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(subscription.status)}
                        {getStatusBadge(subscription.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {subscription.credits_remaining.toLocaleString()} remaining
                        </div>
                        <div className="text-gray-500">
                          {subscription.credits_used_this_month.toLocaleString()} used this month
                        </div>
                        <div className="text-xs text-gray-400">
                          Limit: {subscription.monthly_limit.toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(subscription.billing_amount)}/mo
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(subscription.current_period_start)}</div>
                        <div className="text-gray-500">to {formatDate(subscription.current_period_end)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(subscription)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Subscription
                          </DropdownMenuItem>
                          {subscription.status === 'active' && (
                            <DropdownMenuItem className="text-orange-600">
                              <Clock className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'suspended' && (
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription plan, status, and credits for {selectedSubscription?.user_name}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-plan">Plan</Label>
                <Select 
                  value={editForm.plan} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, plan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="bring_your_own_key">Bring Your Own Key</SelectItem>
                    <SelectItem value="platform_managed">Platform Managed</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-credits">Credits Remaining</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  value={editForm.credits_remaining}
                  onChange={(e) => setEditForm(prev => ({ ...prev, credits_remaining: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedSubscription(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditSubscription}>
                  Update Subscription
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
