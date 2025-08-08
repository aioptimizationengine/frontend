import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Key,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  DollarSign,
  Zap,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Brain,
  Search,
  Target
} from 'lucide-react';

import type {
  ApiKey,
  ApiKeysResponse,
  CreateApiKeyRequest,
  UpdateApiKeyRequest
} from '@/shared/api';

export default function ApiKeys() {
  const { user, hasPermission } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Refs for cleanup
  const apiKeysControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Form state
  const [formData, setFormData] = useState({
    key_name: '',
    provider: 'anthropic' as 'anthropic' | 'openai' | 'google' | 'perplexity',
    key: ''
  });

  const [editData, setEditData] = useState({
    key_name: '',
    is_valid: true
  });

  useEffect(() => {
    isMountedRef.current = true;
    fetchApiKeys();

    return () => {
      isMountedRef.current = false;
      if (apiKeysControllerRef.current && !apiKeysControllerRef.current.signal.aborted) {
        try {
          apiKeysControllerRef.current.abort('Component unmounting');
        } catch (error) {
          // Suppress expected abort errors during cleanup
        }
      }
    };
  }, []);

  const fetchApiKeys = async () => {
    // Immediately set loading and fallback state
    if (isMountedRef.current) {
      setLoading(true);
      setApiKeys([]);
    }

    let timeoutId: NodeJS.Timeout;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }, 5000);

      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Added Authorization header for API keys');
      } else {
        console.warn('⚠️ No auth token found for API keys request');
      }

      const response = await fetch('/api/user-api-keys', {
        signal: controller.signal,
        headers,
      });

      if (response.ok) {
        const data: ApiKeysResponse = await response.json();
        if (isMountedRef.current && data.data && data.data.length > 0) {
          setApiKeys(data.data);
        }
      }
    } catch (error) {
      // Handle different types of errors appropriately
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Request was aborted (timeout or component unmount) - this is expected
          console.log('API keys request cancelled');
        } else {
          // Other network errors
          console.log('API keys service unavailable');
        }
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCreateKey = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/user-api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchApiKeys();
        setShowCreateDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleUpdateKey = async () => {
    if (!selectedKey) return;

    try {
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/user-api-keys/${selectedKey.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        await fetchApiKeys();
        setShowEditDialog(false);
        setSelectedKey(null);
        resetEditForm();
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/user-api-keys/${selectedKey.id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        await fetchApiKeys();
        setShowDeleteDialog(false);
        setSelectedKey(null);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      key_name: '',
      provider: 'anthropic',
      key: ''
    });
  };

  const resetEditForm = () => {
    setEditData({
      key_name: '',
      is_valid: true
    });
  };

  const openEditDialog = (apiKey: any) => {
    setSelectedKey(apiKey);
    setEditData({
      key_name: apiKey.key_name || apiKey.name,
      is_valid: apiKey.is_valid !== undefined ? apiKey.is_valid : true
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (apiKey: any) => {
    setSelectedKey(apiKey);
    setShowDeleteDialog(true);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return <Brain className="h-4 w-4" />;
      case 'openai':
        return <Zap className="h-4 w-4" />;
      case 'google':
        return <Search className="h-4 w-4" />;
      case 'perplexity':
        return <Target className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return 'bg-purple-100 text-purple-800';
      case 'openai':
        return 'bg-green-100 text-green-800';
      case 'google':
        return 'bg-blue-100 text-blue-800';
      case 'perplexity':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isValidApiKey = (key: string, provider: string): boolean => {
    if (!key || !provider) return false;
    
    // Basic validation rules for each provider
    switch (provider) {
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length >= 50;
      case 'openai':
        return key.startsWith('sk-') && key.length >= 40;
      case 'google':
        return key.length >= 20 && /^[A-Za-z0-9_-]+$/.test(key);
      case 'perplexity':
        return key.startsWith('pplx-') && key.length >= 30;
      default:
        return key.length >= 10;
    }
  };

  if (!hasPermission('canUseOwnApiKeys')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                You don't have permission to manage API keys. Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Key className="mr-3 h-8 w-8 text-blue-600" />
            API Keys
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your API keys for different AI providers
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchApiKeys} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New API Key</DialogTitle>
                <DialogDescription>
                  Add your own API key to use with the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="key_name">Key Name</Label>
                  <Input
                    id="key_name"
                    value={formData.key_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, key_name: e.target.value }))}
                    placeholder="e.g., My Anthropic Key"
                  />
                </div>
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={formData.provider} onValueChange={(value: 'anthropic' | 'openai' | 'google' | 'perplexity') => setFormData(prev => ({ ...prev, provider: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-4 w-4" />
                          <span>Anthropic (Claude)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>OpenAI (GPT)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="google">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4" />
                          <span>Google (Gemini)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="perplexity">
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4" />
                          <span>Perplexity</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="key">API Key</Label>
                  <Input
                    id="key"
                    type="password"
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="Enter your API key"
                    className={formData.key && !isValidApiKey(formData.key, formData.provider) ? 'border-red-500' : ''}
                  />
                  {formData.key && !isValidApiKey(formData.key, formData.provider) && (
                    <p className="text-xs text-red-500 mt-1">
                      Invalid API key format for {formData.provider}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Your API key is encrypted and securely stored
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={!formData.key_name || !formData.key || !isValidApiKey(formData.key, formData.provider)}>
                    Add API Key
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* API Keys Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys to show</h3>
            <p className="text-gray-500 mb-4">
              No API keys configured. Add your first API key to start using custom AI providers.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getProviderIcon(apiKey.provider)}
                    <CardTitle className="text-lg">{apiKey.key_name || apiKey.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={(apiKey.is_valid !== undefined ? apiKey.is_valid : apiKey.isActive) ? "default" : "secondary"}
                      className={(apiKey.is_valid !== undefined ? apiKey.is_valid : apiKey.isActive) ? "bg-green-100 text-green-800" : ""}
                    >
                      {(apiKey.is_valid !== undefined ? apiKey.is_valid : apiKey.isActive) ? 'Valid' : 'Invalid'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(apiKey)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(apiKey)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Badge */}
                <div className="flex items-center space-x-2">
                  <Badge className={getProviderColor(apiKey.provider)}>
                    {getProviderIcon(apiKey.provider)}
                    <span className="ml-1 capitalize">{apiKey.provider}</span>
                  </Badge>
                </div>

                {/* API Key Preview */}
                <div>
                  <Label className="text-xs text-gray-500">API Key</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                      {showKey[apiKey.id] ? (apiKey.key_hint || apiKey.keyPreview || '••••••••••••••••') : '••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-xs text-blue-600">Usage Count</div>
                    <div className="font-bold text-blue-900">{apiKey.usage_count || 0}</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600">Status</div>
                    <div className="font-bold text-green-900">{(apiKey.is_valid !== undefined ? apiKey.is_valid : true) ? 'Valid' : 'Invalid'}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-xs text-purple-600">Validated</div>
                    <div className="font-bold text-purple-900">{apiKey.last_validated ? new Date(apiKey.last_validated).toLocaleDateString() : 'Never'}</div>
                  </div>
                </div>

                {/* Last Used */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {apiKey.last_used 
                        ? `Last used ${new Date(apiKey.last_used).toLocaleDateString()}`
                        : 'Never used'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity className="h-3 w-3" />
                    <span>Created {new Date(apiKey.created_at || apiKey.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update your API key settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-key-name">Key Name</Label>
              <Input
                id="edit-key-name"
                value={editData.key_name}
                onChange={(e) => setEditData(prev => ({ ...prev, key_name: e.target.value }))}
                placeholder="Enter key name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-valid"
                checked={editData.is_valid}
                onChange={(e) => setEditData(prev => ({ ...prev, is_valid: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-valid">Valid</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setShowEditDialog(false); resetEditForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateKey} disabled={!editData.key_name}>
                Update Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedKey?.key_name || selectedKey?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-red-600 hover:bg-red-700">
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">About API Keys</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Your API keys are encrypted and stored securely</p>
                <p>• You maintain full control over your usage and costs</p>
                <p>• Platform fees apply only when using your own keys</p>
                <p>• Keys can be activated/deactivated at any time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
