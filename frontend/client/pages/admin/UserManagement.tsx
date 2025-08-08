import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  MoreVertical,
  UserPlus,
  Search,
  Filter,

  Shield,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserX
} from 'lucide-react';
import { UserRole, User } from '@shared/types';

interface UserDetails extends User {
  subscription: {
    plan: string;
    status: 'active' | 'cancelled' | 'suspended';
    nextBilling: Date;
    usage: {
      analyses: number;
      apiCalls: number;
      brands: number;
    };
    revenue: number;
  };
}

export default function UserManagement() {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  useEffect(() => {
    // No users data - show empty state
    setUsers([]);
    setFilteredUsers([]);
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    if (selectedPlan !== 'all') {
      filtered = filtered.filter(user => user.subscription.plan === selectedPlan);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole, selectedPlan]);

  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete' | 'changeRole') => {
    switch (action) {
      case 'suspend':
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, subscription: { ...u.subscription, status: 'suspended' } }
            : u
        ));
        break;
      case 'activate':
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, subscription: { ...u.subscription, status: 'active' } }
            : u
        ));
        break;
      case 'delete':
        setUsers(prev => prev.filter(u => u.id !== userId));
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      [UserRole.SUPER_ADMIN]: 'bg-purple-100 text-purple-800',
      [UserRole.USER]: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[role]}>
        {role.replace('_', ' ').toLowerCase()}
      </Badge>
    );
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
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view user management.</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.subscription.status === 'active').length,
    totalRevenue: users.reduce((sum, u) => sum + u.subscription.revenue, 0),
    newThisMonth: users.filter(u => 
      new Date(u.createdAt).getMonth() === new Date().getMonth()
    ).length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage users, subscriptions, and access controls
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
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
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
              <UserPlus className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                <SelectItem value={UserRole.USER}>User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="text-gray-500">
                      <Users className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No users to show</h3>
                      <p className="text-gray-500">
                        {searchTerm || selectedRole !== 'all' || selectedPlan !== 'all'
                          ? 'No users match your current filters.'
                          : 'No users found in the system.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {userItem.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{userItem.name}</div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                          {userItem.company && (
                            <div className="text-xs text-gray-400">{userItem.company}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(userItem.role)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{userItem.subscription.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(userItem.subscription.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{userItem.subscription.usage.analyses} analyses</div>
                        <div className="text-gray-500">
                          {userItem.subscription.usage.apiCalls.toLocaleString()} API calls
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(userItem.subscription.revenue)}/mo
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(userItem.lastActive)}
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
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(userItem);
                            setShowUserDialog(true);
                          }}>
                            View Details
                          </DropdownMenuItem>
                          {userItem.subscription.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(userItem.id, 'suspend')}
                              className="text-orange-600"
                            >
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUserAction(userItem.id, 'activate')}
                              className="text-green-600"
                            >
                              Activate User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleUserAction(userItem.id, 'delete')}
                            className="text-red-600"
                          >
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information about {selectedUser.name}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <p className="font-medium">{selectedUser.company || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <div className="pt-1">{getRoleBadge(selectedUser.role)}</div>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <Label>Last Active</Label>
                    <p className="font-medium">{formatDate(selectedUser.lastActive)}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="subscription" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plan</Label>
                    <p className="font-medium">{selectedUser.subscription.plan}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="pt-1">{getStatusBadge(selectedUser.subscription.status)}</div>
                  </div>
                  <div>
                    <Label>Revenue</Label>
                    <p className="font-medium">{formatCurrency(selectedUser.subscription.revenue)}/month</p>
                  </div>
                  <div>
                    <Label>Next Billing</Label>
                    <p className="font-medium">{formatDate(selectedUser.subscription.nextBilling)}</p>
                  </div>
                </div>
                <div>
                  <Label>Usage This Month</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center p-3 border rounded">
                      <div className="text-lg font-bold">{selectedUser.subscription.usage.analyses}</div>
                      <div className="text-sm text-gray-600">Analyses</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-lg font-bold">{selectedUser.subscription.usage.apiCalls.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">API Calls</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-lg font-bold">{selectedUser.subscription.usage.brands}</div>
                      <div className="text-sm text-gray-600">Brands</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="activity" className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity to show</h3>
                  <p className="text-gray-500">
                    User activity history will appear here.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
