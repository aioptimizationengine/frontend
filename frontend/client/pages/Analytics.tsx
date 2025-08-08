import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Users,
  Search,
  Target,
  RefreshCw,
  Calendar,
  Award,
  Zap
} from 'lucide-react';

import type { AnalyticsResponse, AnalyticsData, BrandsResponse } from '@/shared/api';
import { useApiController, fetchWithTimeout, TIMEOUT_DURATIONS, handleApiError } from '@/lib/api-utils';

export default function Analytics() {
  const { user, hasPermission } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [brands, setBrands] = useState<{ name: string; id: string }[]>([]);

  // Enhanced API controller management
  const { isMountedRef, cleanupAll } = useApiController();

  useEffect(() => {
    fetchBrands();
    return cleanupAll;
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [period, selectedBrand]);

  const fetchBrands = async () => {
    if (isMountedRef.current) {
      setBrands([]);
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Added Authorization header for brands');
      } else {
        console.warn('⚠️ No auth token found for brands request');
      }

      const response = await fetch('/api/brands', {
        headers
      });

      if (response.ok) {
        const data: BrandsResponse = await response.json();
        if (isMountedRef.current && data.success && data.data) {
          setBrands(data.data.map(brand => ({ name: brand.name, id: brand.id })));
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('Brands API error:', errorData.error || 'Service unavailable');
      }
    } catch (error) {
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('Brands request failed:', errorMessage);
      }
    }
  };

  const fetchAnalytics = async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setAnalyticsData(null);
    }

    try {
      const params = new URLSearchParams({
        period,
        ...(selectedBrand && selectedBrand !== 'all' && { brand: selectedBrand })
      });

      const authToken = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Added Authorization header for analytics');
      } else {
        console.warn('⚠️ No auth token found for analytics request');
      }

      const response = await fetch(`/api/analytics?${params}`, {
        headers
      });

      if (response.ok) {
        const data: AnalyticsResponse = await response.json();
        if (isMountedRef.current && data.success && data.data) {
          setAnalyticsData(data.data);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('Analytics API error:', errorData.error || 'Service unavailable');
      }
    } catch (error) {
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('Analytics request failed:', errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!hasPermission('canViewReports')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                You don't have permission to view analytics. Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div className="space-y-6 pt-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {firstName}! 👋</h1>
          <p className="text-gray-600">Here's what's happening with your account today</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Brand Filter */}
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period Filter */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyticsData ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Analyses</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatNumber(analyticsData.overview.total_analyses)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-gray-500">Analysis runs</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Brands</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatNumber(analyticsData.overview.total_brands)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-gray-500">Brands tracked</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Queries</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatNumber(analyticsData.overview.total_queries)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-gray-500">Queries analyzed</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Search className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Visibility Score</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatPercentage(analyticsData.overview.avg_visibility_score)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Target className="h-4 w-4 text-orange-500" />
                      <span className="text-xs text-gray-500">Overall performance</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Performance Trends
              </CardTitle>
              <CardDescription>
                Track your brand performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{new Date(trend.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Analyses</div>
                        <div className="font-bold">{trend.analyses_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Visibility</div>
                        <div className="font-bold">{formatPercentage(trend.visibility_score)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Mentions</div>
                        <div className="font-bold">{trend.brand_mentions}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Brands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Top Performing Brands
                </CardTitle>
                <CardDescription>
                  Brands with highest visibility scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.top_brands.map((brand, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{brand.brand_name}</div>
                          <div className="text-sm text-gray-500">{brand.analyses_count} analyses</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatPercentage(brand.avg_visibility_score)}</div>
                        <div className="text-sm text-gray-500">visibility</div>
                      </div>
                    </div>
                  ))}
                  {analyticsData.top_brands.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                      <p>No brand data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Competitor Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Competitor Insights
                </CardTitle>
                <CardDescription>
                  Most frequently mentioned competitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.competitor_insights.map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{competitor.competitor}</div>
                          <div className="text-sm text-gray-500">Avg position: {competitor.avg_position.toFixed(1)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{competitor.mention_frequency}</div>
                        <div className="text-sm text-gray-500">mentions</div>
                      </div>
                    </div>
                  ))}
                  {analyticsData.competitor_insights.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                      <p>No competitor data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
            <p className="text-gray-500 mb-4">
              Run some brand analyses to see analytics data here.
            </p>
            <Button onClick={fetchAnalytics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
