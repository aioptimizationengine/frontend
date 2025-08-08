import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Globe,
  Calendar,
  Package,
  RefreshCw,
  Search
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description?: string;
  website: string;
  industry?: string;
  categories: string[];
  created_at: string;
}

interface CreateBrandRequest {
  name: string;
  description: string;
  website: string;
  industry: string;
  categories: string[];
}

const createAuthenticatedFetch = (method = 'GET', body = null) => {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include'
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  return options;
};

export default function Brands() {
  const { hasPermission } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const isMountedRef = useRef(true);
  const [formData, setFormData] = useState<CreateBrandRequest>({
    name: '',
    description: '',
    website: '',
    industry: '',
    categories: []
  });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    fetchBrands();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchBrands = async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setBrands([]);
    }

    try {
      const response = await fetch('/api/brands', createAuthenticatedFetch('GET'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      if (isMountedRef.current) {
        setBrands(Array.isArray(data) ? data : data?.data?.brands || []);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCreateBrand = async () => {
    try {
      const response = await fetch(
        '/api/brands', 
        createAuthenticatedFetch('POST', formData)
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create brand');
      }
      
      await fetchBrands();
      setShowCreateDialog(false);
      resetForm();
      alert('Brand created successfully');
    } catch (error) {
      console.error('Failed to create brand:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while creating the brand');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      website: '',
      industry: '',
      categories: []
    });
    setNewCategory('');
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (brand.categories || []).some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!hasPermission('canManageBrands')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                You don't have permission to manage brands. Please contact your administrator.
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
            <Building2 className="h-8 w-8 mr-2" />
            Brand Management
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage your brands
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Brand
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchBrands}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Brands Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No brands found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new brand.</p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Brand
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{brand.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {brand.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {brand.description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Globe className="h-4 w-4 mr-1.5" />
                  <a 
                    href={brand.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {(() => {
                      try {
                        if (!brand.website) return 'No website';
                        const url = new URL(brand.website.startsWith('http') ? brand.website : `https://${brand.website}`);
                        return url.hostname.replace('www.', '');
                      } catch (e) {
                        console.warn('Invalid website URL:', brand.website);
                        return 'Invalid URL';
                      }
                    })()}
                  </a>
                </div>
                {brand.industry && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Building2 className="h-4 w-4 mr-1.5" />
                    {brand.industry}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Created {new Date(brand.created_at).toLocaleDateString()}
                </div>
                {brand.categories && brand.categories.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {brand.categories.map((category, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Brand Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Add a new brand to start tracking and analyzing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter brand name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter brand description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website URL *
              </label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
                placeholder="e.g., Technology, Healthcare"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <div className="flex space-x-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add a category"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
                <Button type="button" onClick={addCategory}>
                  Add
                </Button>
              </div>
              {formData.categories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.categories.map((category, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center">
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="ml-1.5 rounded-full hover:bg-gray-200 p-0.5"
                      >
                        <span className="sr-only">Remove</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBrand} 
              disabled={!formData.name || !formData.website}
            >
              Create Brand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
