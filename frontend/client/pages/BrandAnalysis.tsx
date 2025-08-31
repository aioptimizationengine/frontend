import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Building2,
  Globe,
  FileText,
  Upload,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Users,
  MessageSquare,
  Star,
  Brain,
  Sparkles,
  Plus,
  X,
  RefreshCw,
  Download,
  Eye,
  Activity,
  Map as MapIcon,
  CheckCircle2
} from 'lucide-react';

import type {
  AnalyzeBrandRequest,
  AnalyzeBrandResponse,
  OptimizationMetricsRequest,
  AnalyzeQueriesRequest,
  AnalyzeQueriesResponse,
  BrandsResponse,
  Brand
} from '../../shared/api';

// Define SEOAnalysis type based on backend response structure
type SEOAnalysis = {
  whats_there?: string[];
  whats_needed?: string[];
  whats_perfect?: string[];
  can_be_improved?: string[];
  priority_recommendations?: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
    effort: string;
    timeline: string;
    action_items?: string[];
  }>;
  roadmap?: Array<{
    phase: string;
    items: string[];
  }>;
  summary?: string;
};

// Form state types
interface AnalysisFormState {
  brand_name: string;
  website_url: string;
  content_sample: string;
  categories: string[];
  competitors: string[];
  queries?: string[]; // Add optional queries field
}

interface OptimizationMetrics {
  chunk_retrieval_frequency?: number;
  embedding_relevance_score?: number;
  attribution_rate?: number;
  ai_citation_count?: number;
  vector_index_presence_ratio?: number;
  retrieval_confidence_score?: number;
  rrf_rank_contribution?: number;
  llm_answer_coverage?: number;
  amanda_crast_score?: number;
  zero_click_surface_presence?: number;
  machine_validated_authority?: number;
  performance_summary?: number;
  overall_score?: number;
  performance_grade?: string;
}

// Local type for optimization metrics response
interface LocalOptimizationMetricsResponse {
  success: boolean;
  data: {
    metrics: OptimizationMetrics;
    benchmarks: Partial<OptimizationMetrics>;
    improvement_suggestions: string[];
    timestamp: string;
  };
}
import { useApiController, fetchWithTimeout, TIMEOUT_DURATIONS, handleApiError } from '@/lib/api-utils';
import { Lightbulb } from 'lucide-react';

// Metric card component for consistent metric display
const MetricCard = ({ title, value, description }: { title: string; value: string; description: string }) => (
  <div className="bg-white p-4 rounded-lg border shadow-sm">
    <h5 className="text-sm font-medium text-gray-700 mb-1">{title}</h5>
    <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
);

// Helper function to get performance label from grade
const getPerformanceLabel = (grade: string): string => {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Needs Improvement';
    case 'F': return 'Poor';
    default: return 'Not Rated';
  }
};

export default function BrandAnalysis() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('full-analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // Enhanced API controller management
  const { isMountedRef, getController, cleanupController, cleanupAll } = useApiController();
  
  // Full Analysis State
  const [analysisData, setAnalysisData] = useState<{
    data: {
      seo_analysis?: SEOAnalysis;
      analysis_id: string;
      brand_name: string;
      analysis_results: any[];
      summary: {
        total_queries: number;
        brand_mentions: number;
        avg_position: number;
        visibility_score: number;
      };
      competitors_overview: any[];
      // Add any other properties that might be in the response
      [key: string]: any;
    } | null;
  } | null>(null);
  const [analysisForm, setAnalysisForm] = useState<AnalysisFormState>({
    brand_name: '',
    website_url: '',
    content_sample: '',
    categories: [],
    competitors: [],
    queries: []
  });
  
  // Optimization Metrics State
  const [metricsData, setMetricsData] = useState<LocalOptimizationMetricsResponse | null>(null);
  const [metricsForm, setMetricsForm] = useState({
    brand_name: '',
    website_url: '',
    content_sample: '',
    categories: [] as string[],
    competitors: [] as string[],
    time_period: '30d'
  });
  
  // Query Analysis State
  const [queryData, setQueryData] = useState<AnalyzeQueriesResponse | null>(null);
  const [queryForm, setQueryForm] = useState({
    brand_name: '',
    queries: [] as string[],
    categories: [] as string[]
  });

  // Input states for dynamic arrays
  const [newCategory, setNewCategory] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newQuery, setNewQuery] = useState('');

  // Fetch brands on component mount
  useEffect(() => {
    fetchBrands();
    return cleanupAll;
  }, []);

  const fetchBrands = async () => {
    cleanupController('brands');

    if (isMountedRef.current) {
      setLoadingBrands(true);
      setBrands([]);
    }

    try {
      const response = await fetchWithTimeout('/api/brands', {
        timeout: TIMEOUT_DURATIONS.SHORT
      }, isMountedRef);

      if (response.ok) {
        const data: BrandsResponse = await response.json();
        if (isMountedRef.current && data.success && data.data) {
          setBrands(data.data);
        }
      } else {
        // Handle error responses
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('Brands API error:', errorData.error || 'Service unavailable');
        if (isMountedRef.current) {
          setBrands([]);
        }
      }
    } catch (error) {
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage && isMountedRef.current) {
        console.log('Brands request failed:', errorMessage);
        setBrands([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingBrands(false);
      }
    }
  };

  const handleAnalyzeBrand = async () => {
    if (!analysisForm.brand_name || !analysisForm.content_sample) {
      console.log('❌ Missing brand_name or content_sample');
      return;
    }
    try {
      setIsLoading(true);
      console.log('🚀 Sending analysis request to /api/analyze-brand');
      console.log('🚀 Request payload:', {
        brand_name: analysisForm.brand_name,
        website_url: analysisForm.website_url,
        product_categories: analysisForm.categories,
        content_sample: analysisForm.content_sample,
        competitor_names: analysisForm.competitors
      });
      
      let response;
      let text;
      
      try {
        console.log('🔧 Using direct fetch instead of fetchWithTimeout for testing');
        
        // Get auth token from localStorage (check multiple possible keys)
        const authToken = localStorage.getItem('authToken') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('jwt') ||
                         localStorage.getItem('access_token');
        
        console.log('🔐 Auth token found:', authToken ? 'YES (length: ' + authToken.length + ')' : 'NO');
        console.log('🔐 localStorage keys:', Object.keys(localStorage));
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
          console.log('🔐 Added Authorization header');
        } else {
          console.warn('⚠️ No auth token found in localStorage');
        }
        
        console.log('🔐 Request headers:', headers);
        
        response = await fetch('/api/analyze-brand', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            brand_name: analysisForm.brand_name,
            website_url: analysisForm.website_url,
            product_categories: analysisForm.categories,
            content_sample: analysisForm.content_sample,
            competitor_names: analysisForm.competitors
          })
        });
        
        console.log('🌐 fetchWithTimeout completed successfully');
        console.log('🌐 Response received:', response);
        console.log('🌐 Response status:', response.status);
        console.log('🌐 Response ok:', response.ok);
        console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Read response text immediately to avoid abort issues
        text = await response.text();
        console.log('🟢 RAW RESPONSE TEXT:', text);
        console.log('🟢 Response text length:', text.length);
        
      } catch (fetchError) {
        console.error('❌ fetchWithTimeout or response.text() failed:', fetchError);
        console.error('❌ Error type:', typeof fetchError);
        console.error('❌ Error name:', fetchError?.name);
        console.error('❌ Error message:', fetchError?.message);
        console.error('❌ Error stack:', fetchError?.stack);
        
        // If it's an AbortError, it might be due to retry logic - let the retry handle it
        if (fetchError?.name === 'AbortError') {
          console.log('🔄 Request was aborted, likely due to retry logic');
        }
        throw fetchError;
      }
      
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
          console.log('🟢 PARSED DATA:', data);
          console.log('🟢 Data type:', typeof data);
          console.log('🟢 Data success field:', data?.success);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON:', parseError);
          console.error('❌ Raw text that failed to parse:', text);
          throw parseError;
        }
      } else {
        console.warn('⚠️ Empty response text received');
      }
      
      if (isMountedRef.current) {
        setAnalysisData(data);
        console.log('✅ analysisData set in state:', data);
      } else {
        console.log('❌ Component unmounted, not setting state');
      }
    } catch (error) {
      console.error('❌ FULL ERROR DETAILS:', {
        error,
        errorType: typeof error,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('❌ Analysis failed with message:', errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleOptimizationMetrics = async () => {
    if (!metricsForm.brand_name || !metricsForm.content_sample || !metricsForm.website_url) {
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔧 Using direct fetch for optimization metrics');
      
      // Get auth token from localStorage (check multiple possible keys)
      const authToken = localStorage.getItem('authToken') || 
                       localStorage.getItem('token') || 
                       localStorage.getItem('jwt') ||
                       localStorage.getItem('access_token');
      
      console.log('🔐 Auth token found:', authToken ? 'YES (length: ' + authToken.length + ')' : 'NO');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Added Authorization header for metrics');
      } else {
        console.warn('⚠️ No auth token found for metrics request');
      }
      
      console.log('🔐 Metrics request headers:', headers);
      console.log('🚀 Sending metrics request payload:', {
        brand_name: metricsForm.brand_name,
        content_sample: metricsForm.content_sample,
        website_url: metricsForm.website_url
      });

      const response = await fetch('/api/optimization-metrics', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_name: metricsForm.brand_name,
          content_sample: metricsForm.content_sample,
          website_url: metricsForm.website_url
        })
      });
      
      console.log('🌐 Metrics response received:', response);
      console.log('🌐 Metrics response status:', response.status);
      console.log('🌐 Metrics response ok:', response.ok);

      if (response.ok) {
        const text = await response.text();
        console.log('🟢 Metrics RAW RESPONSE TEXT:', text);
        
        let data: LocalOptimizationMetricsResponse;
        try {
          data = JSON.parse(text);
          console.log('🟢 Metrics PARSED DATA:', data);
        } catch (parseError) {
          console.error('❌ Failed to parse metrics JSON:', parseError);
          console.error('❌ Raw metrics text that failed to parse:', text);
          throw parseError;
        }
        
        if (isMountedRef.current) {
          setMetricsData(data);
          console.log('✅ metricsData set in state:', data);
        }
      } else {
        console.log('❌ Metrics API returned non-OK status:', response.status);
        const errorText = await response.text();
        console.log('❌ Metrics error response:', errorText);
      }
    } catch (error) {
      console.error('❌ METRICS ERROR DETAILS:', {
        error,
        errorType: typeof error,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('❌ Metrics failed with message:', errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleAnalyzeQueries = async () => {
    if (!queryForm.brand_name || queryForm.categories.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('🔧 Using direct fetch for analyze queries');
      
      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken');
      
      console.log('🔐 Auth token found:', authToken ? 'YES (length: ' + authToken.length + ')' : 'NO');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Added Authorization header for queries');
      } else {
        console.warn('⚠️ No auth token found for queries request');
      }
      
      console.log('🔐 Queries request headers:', headers);
      console.log('🚀 Sending queries request payload:', {
        brand_name: queryForm.brand_name,
        product_categories: queryForm.categories
      });

      const response = await fetch('/api/analyze-queries', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_name: queryForm.brand_name,
          product_categories: queryForm.categories
        })
      });
      
      console.log('🌐 Queries response received:', response);
      console.log('🌐 Queries response status:', response.status);
      console.log('🌐 Queries response ok:', response.ok);

      if (response.ok) {
        const text = await response.text();
        console.log('🟢 Queries RAW RESPONSE TEXT:', text);
        
        let data: AnalyzeQueriesResponse;
        try {
          data = JSON.parse(text);
          console.log('🟢 Queries PARSED DATA:', data);
        } catch (parseError) {
          console.error('❌ Failed to parse queries JSON:', parseError);
          console.error('❌ Raw queries text that failed to parse:', text);
          throw parseError;
        }
        
        if (isMountedRef.current) {
          setQueryData(data);
          console.log('✅ queryData set in state:', data);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Queries API failed:', response.status, response.statusText);
        console.error('❌ Queries error response:', errorText);
        throw new Error(`Query analysis failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Queries request failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      
      const errorMessage = handleApiError(error, isMountedRef);
      if (errorMessage) {
        console.log('❌ Queries failed with message:', errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Helper functions for dynamic arrays
  const addCategory = (formType: 'analysis' | 'metrics' | 'query') => {
    if (!newCategory.trim()) return;
    
    if (formType === 'analysis') {
      setAnalysisForm(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
    } else if (formType === 'metrics') {
      setMetricsForm(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
    } else {
      setQueryForm(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
    }
    setNewCategory('');
  };

  const removeCategory = (index: number, formType: 'analysis' | 'metrics' | 'query') => {
    if (formType === 'analysis') {
      setAnalysisForm(prev => ({
        ...prev,
        categories: prev.categories.filter((_, i) => i !== index)
      }));
    } else if (formType === 'metrics') {
      setMetricsForm(prev => ({
        ...prev,
        categories: prev.categories.filter((_, i) => i !== index)
      }));
    } else {
      setQueryForm(prev => ({
        ...prev,
        categories: prev.categories.filter((_, i) => i !== index)
      }));
    }
  };

  const addCompetitor = (formType: 'analysis' | 'metrics') => {
    if (!newCompetitor.trim()) return;
    
    if (formType === 'analysis') {
      setAnalysisForm(prev => ({
        ...prev,
        competitors: [...prev.competitors, newCompetitor.trim()]
      }));
    } else {
      setMetricsForm(prev => ({
        ...prev,
        competitors: [...prev.competitors, newCompetitor.trim()]
      }));
    }
    setNewCompetitor('');
  };

  const removeCompetitor = (index: number, formType: 'analysis' | 'metrics') => {
    if (formType === 'analysis') {
      setAnalysisForm(prev => ({
        ...prev,
        competitors: prev.competitors.filter((_, i) => i !== index)
      }));
    } else {
      setMetricsForm(prev => ({
        ...prev,
        competitors: prev.competitors.filter((_, i) => i !== index)
      }));
    }
  };

  const addQuery = () => {
    if (!newQuery.trim()) return;
    
    setAnalysisForm(prev => ({
      ...prev,
      queries: [...prev.queries, newQuery.trim()]
    }));
    setQueryForm(prev => ({
      ...prev,
      queries: [...prev.queries, newQuery.trim()]
    }));
    setNewQuery('');
  };

  const removeQuery = (index: number, formType: 'analysis' | 'query') => {
    if (formType === 'analysis') {
      setAnalysisForm(prev => ({
        ...prev,
        queries: prev.queries.filter((_, i) => i !== index)
      }));
    } else {
      setQueryForm(prev => ({
        ...prev,
        queries: prev.queries.filter((_, i) => i !== index)
      }));
    }
  };

  if (!hasPermission('canRunAnalysis')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                You don't have permission to run brand analysis. Please contact your administrator.
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
            <Brain className="mr-3 h-8 w-8 text-blue-600" />
            Brand Analysis
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze your brand's performance across AI platforms and optimize your presence
          </p>
        </div>
        <Button onClick={fetchBrands} variant="outline" disabled={loadingBrands}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loadingBrands ? 'animate-spin' : ''}`} />
          Refresh Brands
        </Button>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full-analysis" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Full Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="optimization-metrics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Optimization Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="query-analysis" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Query Analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Full Analysis Tab */}
        <TabsContent value="full-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analysis Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Brand Analysis Configuration
                </CardTitle>
                <CardDescription>
                  Configure your comprehensive brand analysis with SEO insights from website crawling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand Name */}
                <div>
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input
                    id="brand-name"
                    value={analysisForm.brand_name}
                    onChange={(e) => setAnalysisForm(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <Label htmlFor="website-url">Website URL</Label>
                  <Input
                    id="website-url"
                    type="url"
                    value={analysisForm.website_url}
                    onChange={(e) => setAnalysisForm(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://your-website.com"
                  />
                </div>

                {/* Content Sample */}
                <div>
                  <Label htmlFor="content-sample">Content Sample</Label>
                  <Textarea
                    id="content-sample"
                    value={analysisForm.content_sample}
                    onChange={(e) => setAnalysisForm(prev => ({ ...prev, content_sample: e.target.value }))}
                    placeholder="Provide a sample of your brand content - describe your brand, products, and services"
                    rows={3}
                  />
                </div>

                {/* Categories */}
                <div>
                  <Label>Product Categories</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add category"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory('analysis')}
                    />
                    <Button onClick={() => addCategory('analysis')} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysisForm.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{category}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCategory(index, 'analysis')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Competitors */}
                <div>
                  <Label>Competitors</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      placeholder="Add competitor"
                      onKeyPress={(e) => e.key === 'Enter' && addCompetitor('analysis')}
                    />
                    <Button onClick={() => addCompetitor('analysis')} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysisForm.competitors.map((competitor, index) => (
                      <Badge key={index} variant="outline" className="flex items-center space-x-1">
                        <span>{competitor}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCompetitor(index, 'analysis')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>


                <Button
                  onClick={handleAnalyzeBrand}
                  disabled={isLoading || !analysisForm.brand_name || !analysisForm.website_url || !analysisForm.content_sample}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Run Full Analysis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Brand & SEO Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-600">Total Queries</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {analysisData.data?.summary?.total_queries || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-green-600">Brand Mentions</div>
                        <div className="text-2xl font-bold text-green-900">
                          {analysisData.data.summary.brand_mentions}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-purple-600">Avg Position</div>
                        <div className="text-2xl font-bold text-purple-900">
                          {analysisData.data.summary.avg_position.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="text-sm text-orange-600">Visibility Score</div>
                        <div className="text-2xl font-bold text-orange-900">
                          {(analysisData.data.summary.visibility_score * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Competitor Analysis Results */}
                    {analysisData.data?.competitor_analysis?.competitors && analysisData.data.competitor_analysis.competitors.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Users className="h-5 w-5 mr-2 text-blue-600" />
                          Competitor Analysis
                        </h3>
                        
                        {/* Competitor Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-sm text-blue-600">Competitors Analyzed</div>
                            <div className="text-2xl font-bold text-blue-900">
                              {analysisData.data.competitor_analysis.competitors_analyzed} / {analysisData.data.competitor_analysis.total_competitors}
                            </div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600">Your Success Rate</div>
                            <div className="text-2xl font-bold text-green-900">
                              {(analysisData.data.competitor_analysis.comparison_metrics.brand_performance.success_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-sm text-purple-600">Competitor Avg</div>
                            <div className="text-2xl font-bold text-purple-900">
                              {(analysisData.data.competitor_analysis.comparison_metrics.competitor_average.avg_success_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Individual Competitor Results */}
                        <div className="space-y-4">
                          {analysisData.data.competitor_analysis.competitors.map((competitor: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-lg text-gray-900">{competitor.name}</h4>
                                {competitor.error ? (
                                  <Badge variant="destructive">Analysis Failed</Badge>
                                ) : (
                                  <Badge variant="outline">Analyzed</Badge>
                                )}
                              </div>
                              
                              {competitor.error ? (
                                <p className="text-sm text-red-600">Error: {competitor.error}</p>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{competitor.brand_mentions}</div>
                                    <div className="text-xs text-gray-500">Brand Mentions</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{(competitor.success_rate * 100).toFixed(1)}%</div>
                                    <div className="text-xs text-gray-500">Success Rate</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{competitor.avg_position.toFixed(1)}</div>
                                    <div className="text-xs text-gray-500">Avg Position</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{competitor.tested_queries}</div>
                                    <div className="text-xs text-gray-500">Queries Tested</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEO Analysis Results */}
                    <Accordion type="single" collapsible className="mt-6">
                      <AccordionItem value="seo-analysis">
                        <AccordionTrigger>Detailed SEO Analysis</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-6">
                            {/* Analysis Notice */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center space-x-2 text-blue-800">
                                <Globe className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  This information was extracted by crawling and analyzing your website
                                </span>
                              </div>
                            </div>

                            {/* SEO Analysis Sections - Always show this format */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* What is already there */}
                              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  What's Already There
                                </h4>
                                <div className="space-y-2">
                                  {analysisData.data.seo_analysis?.whats_there?.map((item, index) => (
                                    <div key={index} className="text-sm text-green-700 flex items-start">
                                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                      <span>{item}</span>
                                    </div>
                                  )) || (
                                    <div className="text-sm text-green-600 italic">
                                      SEO analysis will show existing optimized elements here
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* What is needed */}
                              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                                  <AlertCircle className="h-5 w-5 mr-2" />
                                  What's Needed
                                </h4>
                                <div className="space-y-2">
                                  {analysisData.data.seo_analysis?.whats_needed?.map((item, index) => (
                                    <div key={index} className="text-sm text-amber-700 flex items-start">
                                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                      <span>{item}</span>
                                    </div>
                                  )) || (
                                    <div className="text-sm text-amber-600 italic">
                                      SEO analysis will show missing requirements here
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* What is perfect */}
                              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                                <h4 className="font-semibold text-emerald-800 mb-3 flex items-center">
                                  <Star className="h-5 w-5 mr-2" />
                                  What's Perfect
                                </h4>
                                <div className="space-y-2">
                                  {analysisData.data.seo_analysis?.whats_perfect?.map((item, index) => (
                                    <div key={index} className="text-sm text-emerald-700 flex items-start">
                                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                      <span>{item}</span>
                                    </div>
                                  )) || (
                                    <div className="text-sm text-emerald-600 italic">
                                      SEO analysis will show perfectly optimized elements here
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>



                            {/* Priority Recommendations */}
                            <div className="mt-8">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Target className="h-5 w-5 mr-2 text-blue-600" />
                                Priority Recommendations
                              </h3>
                              <div className="space-y-4">
                                {analysisData.data.seo_analysis?.priority_recommendations && analysisData.data.seo_analysis.priority_recommendations.length > 0 ? (
                                  analysisData.data.seo_analysis.priority_recommendations.map((rec: any, index: number) => (
                                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                    rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                                    rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                    'border-green-500 bg-green-50'
                                  }`}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                                      </div>
                                      <Badge 
                                        variant={
                                          rec.priority === 'high' ? 'destructive' : 
                                          rec.priority === 'medium' ? 'outline' : 'default'
                                        }
                                        className="ml-2"
                                      >
                                        {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                      <div>
                                        <span className="text-gray-500">Impact:</span>{' '}
                                        <span className="font-medium">{rec.impact}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Effort:</span>{' '}
                                        <span className="font-medium">{rec.effort}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Timeline:</span>{' '}
                                        <span className="font-medium">{rec.timeline}</span>
                                      </div>
                                    </div>
                                    {rec.action_items && rec.action_items.length > 0 && (
                                      <div className="mt-3 col-span-3">
                                        <span className="text-xs font-medium text-gray-600">Action Items:</span>
                                        <ul className="mt-1 text-xs text-gray-600 space-y-1">
                                          {rec.action_items.map((item: string, itemIndex: number) => (
                                            <li key={itemIndex} className="flex items-start">
                                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))
                                ) : (
                                  <div className="text-sm text-gray-500 italic">
                                    No priority recommendations available
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SEO Roadmap */}
                            <div className="mt-8">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <MapIcon className="h-5 w-5 mr-2 text-blue-600" />
                                SEO Improvement Roadmap
                              </h3>
                              <div className="space-y-6">
                                {analysisData.data.seo_analysis?.roadmap?.map((phase: any, index: number) => (
                                  <div key={index} className="border rounded-lg overflow-hidden">
                                    <div className="bg-blue-50 px-4 py-3 border-b">
                                      <h4 className="font-medium text-blue-800">{phase.phase}</h4>
                                    </div>
                                    <ul className="divide-y divide-gray-200">
                                      {phase.items.map((item: string, itemIndex: number) => (
                                        <li key={itemIndex} className="px-4 py-3 text-sm">
                                          <div className="flex items-start">
                                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                            <span>{item}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )) || (
                                  <div className="text-sm text-gray-500 italic">
                                    No roadmap available
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SEO Summary */}
                            {analysisData.data.seo_analysis?.summary && (
                              <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">SEO Summary</h3>
                                <p className="text-blue-700">{analysisData.data.seo_analysis.summary}</p>
                              </div>
                            )}

                            {/* Implementation Roadmap - Removed for now as it's causing type issues */}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis data to show</h3>
                    <p>Run a brand analysis to see results here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Optimization Metrics Tab */}
        <TabsContent value="optimization-metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metrics Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Optimization Metrics
                </CardTitle>
                <CardDescription>
                  Get detailed optimization metrics for your brand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand Name */}
                <div>
                  <Label htmlFor="metrics-brand">Brand Name</Label>
                  <Input
                    id="metrics-brand"
                    value={metricsForm.brand_name}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <Label htmlFor="metrics-website">Website URL</Label>
                  <Input
                    id="metrics-website"
                    type="url"
                    value={metricsForm.website_url}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://your-website.com"
                  />
                </div>

                {/* Content Sample */}
                <div>
                  <Label htmlFor="metrics-content">Content Sample</Label>
                  <Textarea
                    id="metrics-content"
                    value={metricsForm.content_sample}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, content_sample: e.target.value }))}
                    placeholder="Provide a sample of your brand content for analysis"
                    rows={3}
                  />
                </div>

                {/* Time Period */}
                <div>
                  <Label htmlFor="time-period">Time Period</Label>
                  <Select 
                    value={metricsForm.time_period} 
                    onValueChange={(value) => setMetricsForm(prev => ({ ...prev, time_period: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories */}
                <div>
                  <Label>Categories</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add category"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory('metrics')}
                    />
                    <Button onClick={() => addCategory('metrics')} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {metricsForm.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{category}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCategory(index, 'metrics')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Competitors */}
                <div>
                  <Label>Competitors</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      placeholder="Add competitor"
                      onKeyPress={(e) => e.key === 'Enter' && addCompetitor('metrics')}
                    />
                    <Button onClick={() => addCompetitor('metrics')} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {metricsForm.competitors.map((competitor, index) => (
                      <Badge key={index} variant="outline" className="flex items-center space-x-1">
                        <span>{competitor}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCompetitor(index, 'metrics')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleOptimizationMetrics}
                  disabled={isLoading || !metricsForm.brand_name || !metricsForm.website_url || !metricsForm.content_sample}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Get Metrics
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Metrics Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Metrics Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsData ? (
                  <div className="space-y-6">
                    {/* Brand Performance Metrics */}
                    <div>
                      <h4 className="font-medium mb-4 text-lg">Optimization Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Embedding Relevance Score */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Embedding Relevance</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {(metricsData.data.metrics.embedding_relevance_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${metricsData.data.metrics.embedding_relevance_score * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Measures semantic relevance of content to search queries
                          </p>
                        </div>

                        {/* Retrieval Confidence Score */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Retrieval Confidence</span>
                            <span className="text-sm font-semibold text-purple-600">
                              {(metricsData.data.metrics.retrieval_confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-purple-600 h-2.5 rounded-full" 
                              style={{ width: `${metricsData.data.metrics.retrieval_confidence_score * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence in retrieving the most relevant content
                          </p>
                        </div>

                        {/* Vector Index Presence */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Vector Index Presence</span>
                            <span className="text-sm font-semibold text-green-600">
                              {(metricsData.data.metrics.vector_index_presence_ratio * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full" 
                              style={{ width: `${metricsData.data.metrics.vector_index_presence_ratio * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Coverage of content in vector search index
                          </p>
                        </div>

                        {/* Attribution Rate */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Attribution Rate</span>
                            <span className="text-sm font-semibold text-yellow-600">
                              {(metricsData.data.metrics.attribution_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-yellow-500 h-2.5 rounded-full" 
                              style={{ width: `${metricsData.data.metrics.attribution_rate * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Rate of proper content attribution
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Metrics Grid */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-4 text-lg">Detailed Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Chunk Retrieval Frequency */}
                        <MetricCard 
                          title="Chunk Retrieval Frequency"
                          value={metricsData.data.metrics.chunk_retrieval_frequency?.toFixed(2) ?? 'N/A'}
                          description="How often content chunks are retrieved in search results"
                        />

                        {/* Embedding Relevance Score */}
                        <MetricCard 
                          title="Embedding Relevance"
                          value={`${((metricsData.data.metrics.embedding_relevance_score ?? 0) * 100).toFixed(1)}%`}
                          description="Semantic match quality of content to search queries"
                        />

                        {/* Attribution Rate */}
                        <MetricCard 
                          title="Attribution Rate"
                          value={`${((metricsData.data.metrics.attribution_rate ?? 0) * 100).toFixed(1)}%`}
                          description="Rate of proper content attribution"
                        />

                        {/* AI Citation Count */}
                        <MetricCard 
                          title="AI Citation Count"
                          value={(metricsData.data.metrics.ai_citation_count ?? 0).toFixed(0)}
                          description="Number of times content is cited by AI systems"
                        />

                        {/* Vector Index Presence */}
                        <MetricCard 
                          title="Vector Index Presence"
                          value={`${((metricsData.data.metrics.vector_index_presence_ratio ?? 0) * 100).toFixed(1)}%`}
                          description="Coverage of content in vector search index"
                        />

                        {/* Retrieval Confidence Score */}
                        <MetricCard 
                          title="Retrieval Confidence"
                          value={`${((metricsData.data.metrics.retrieval_confidence_score ?? 0) * 100).toFixed(1)}%`}
                          description="Confidence in retrieving the most relevant content"
                        />

                        {/* RRF Rank Contribution */}
                        <MetricCard 
                          title="RRF Rank Contribution"
                          value={`${((metricsData.data.metrics.rrf_rank_contribution ?? 0) * 100).toFixed(1)}%`}
                          description="Relative ranking factor contribution"
                        />

                        {/* LLM Answer Coverage */}
                        <MetricCard 
                          title="LLM Answer Coverage"
                          value={`${((metricsData.data.metrics.llm_answer_coverage ?? 0) * 100).toFixed(1)}%`}
                          description="Coverage in LLM-generated answers"
                        />

                        {/* Amanda Crast Score */}
                        <MetricCard 
                          title="Amanda Crast Score"
                          value={(metricsData.data.metrics.amanda_crast_score ?? 0).toFixed(1)}
                          description="Specialized content quality metric"
                        />

                        {/* Zero-Click Surface Presence */}
                        <MetricCard 
                          title="Zero-Click Presence"
                          value={`${((metricsData.data.metrics.zero_click_surface_presence ?? 0) * 100).toFixed(1)}%`}
                          description="Appearance in zero-click search results"
                        />

                        {/* Machine Validated Authority */}
                        <MetricCard 
                          title="Machine Validated Authority"
                          value={`${((metricsData.data.metrics.machine_validated_authority ?? 0) * 100).toFixed(1)}%`}
                          description="Algorithmically determined authority score"
                        />

{/* Overall Score */}
                        <MetricCard 
                          title="Overall Score"
                          value={`${((metricsData.data.metrics.overall_score ?? 0) * 100).toFixed(1)}%`}
                          description="Composite score of all metrics"
                        />

                        {/* Performance Grade */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Performance Grade</h5>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                              {metricsData.data.metrics.performance_grade || 'N/A'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {getPerformanceLabel(metricsData.data.metrics.performance_grade || '')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Overall performance assessment
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Improvement Suggestions */}
                    {metricsData.data.improvement_suggestions && metricsData.data.improvement_suggestions.length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-medium text-lg mb-3">Improvement Suggestions</h4>
                        <div className="space-y-3">
                          {metricsData.data.improvement_suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-100">
                              <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics to show</h3>
                    <p>Run optimization metrics analysis to see performance data here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Query Analysis Tab */}
        <TabsContent value="query-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Query Analysis
                </CardTitle>
                <CardDescription>
                  Analyze your brand presence across AI-generated queries based on product categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Brand Name */}
                <div>
                  <Label htmlFor="query-brand">Brand Name</Label>
                  <Input
                    id="query-brand"
                    value={queryForm.brand_name}
                    onChange={(e) => setQueryForm(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>

                {/* Product Categories */}
                <div>
                  <Label>Product Categories</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add category"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory('query')}
                    />
                    <Button onClick={() => addCategory('query')} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {queryForm.categories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{category}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCategory(index, 'query')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAnalyzeQueries}
                  disabled={isLoading || !queryForm.brand_name || queryForm.categories.length === 0}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Analyze Queries
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Query Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Query Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-600">Total Queries</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {queryData.data.summary.total_queries}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-green-600">Successful Mentions</div>
                        <div className="text-2xl font-bold text-green-900">
                          {queryData.data.summary.successful_mentions}
                        </div>
                      </div>
                    </div>

                    {/* Query Results */}
                    <div className="space-y-3">
                      {queryData.data.query_results.map((result, index) => {
                        // Enhanced intent detection with query text analysis
                        const detectIntent = (query: string, explicitIntent?: string) => {
                          // If we have an explicit intent from the backend, use that first
                          if (explicitIntent) {
                            const normalized = explicitIntent.toLowerCase().replace(/[^a-z0-9]/g, '');
                            
                            // Check for known intent patterns
                            const intentMap = {
                              info: 'Informational',
                              navigat: 'Navigational',
                              transact: 'Transactional',
                              commercial: 'Commercial Investigation',
                              research: 'Commercial Investigation',
                              compare: 'Commercial Investigation',
                              buy: 'Transactional',
                              purchase: 'Transactional',
                              find: 'Navigational',
                              locate: 'Navigational',
                              what: 'Informational',
                              how: 'Informational',
                              why: 'Informational',
                              best: 'Commercial Investigation',
                              review: 'Commercial Investigation',
                              vs: 'Commercial Investigation',
                              price: 'Transactional',
                              cost: 'Transactional',
                              cheap: 'Transactional',
                              discount: 'Transactional',
                              near: 'Navigational',
                              location: 'Navigational',
                              store: 'Navigational',
                              where: 'Navigational',
                              when: 'Informational',
                              who: 'Informational',
                              define: 'Informational',
                              meaning: 'Informational',
                              guide: 'Informational',
                              tutorial: 'Informational',
                              learn: 'Informational',
                              alternative: 'Commercial Investigation',
                              top: 'Commercial Investigation',
                              list: 'Commercial Investigation',
                            };

                            for (const [key, intent] of Object.entries(intentMap)) {
                              if (normalized.includes(key)) {
                                return intent;
                              }
                            }
                          }

                          // If no explicit intent or no match, analyze the query text
                          const queryLower = query.toLowerCase();
                          
                          // Check for question words and patterns
                          const isQuestion = /^(what|how|why|when|where|who|which|can|could|would|will|is|are|do|does|did)/i.test(query);
                          const hasQuestionMark = queryLower.endsWith('?');
                          
                          // Transactional intent indicators
                          const transactionalWords = ['buy', 'purchase', 'price', 'cost', 'order', 'discount', 'deal', 'sale', 'cheap'];
                          const isTransactional = transactionalWords.some(word => queryLower.includes(word));
                          
                          // Navigational intent indicators
                          const navigationalWords = ['near me', 'location', 'store', 'find', 'where', 'locate', 'directions', 'address'];
                          const isNavigational = navigationalWords.some(word => queryLower.includes(word)) || 
                                               /(near|close to) (me|my location|here)/i.test(queryLower);
                          
                          // Commercial investigation indicators
                          const commercialWords = ['best', 'review', 'vs', 'versus', 'compare', 'alternative', 'top', 'worst', 'pros and cons'];
                          const isCommercial = commercialWords.some(word => queryLower.includes(word)) ||
                                             /(best|top) (\w+ )?(for|to|in)/i.test(queryLower);
                          
                          // Determine intent based on analysis
                          if (isTransactional) return 'Transactional';
                          if (isNavigational) return 'Navigational';
                          if (isCommercial) return 'Commercial Investigation';
                          if (isQuestion || hasQuestionMark) return 'Informational';
                          
                          // Default to Informational for short queries, Commercial Investigation for longer ones
                          return query.split(' ').length > 3 ? 'Commercial Investigation' : 'Informational';
                        };

                        // Get the detected intent
                        const detectedIntent = detectIntent(result.query, result.intent);
                        
                        // Map intent to display properties
                        const intentMap = {
                          'Informational': { variant: 'secondary' as const, icon: 'ℹ️' },
                          'Navigational': { variant: 'default' as const, icon: '📍' },
                          'Transactional': { variant: 'destructive' as const, icon: '💰' },
                          'Commercial Investigation': { variant: 'outline' as const, icon: '🔍' },
                        };
                        
                        const intentInfo = intentMap[detectedIntent] || { 
                          variant: 'secondary' as const, 
                          icon: '❓',
                          text: detectedIntent || 'Not Classified'
                        };
                        
                        return (
                          <div key={index} className="border p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium">{result.query}</div>
                              <div className="flex items-center space-x-2">
                                {detectedIntent && (
                                  <Badge variant={intentInfo.variant} className="flex items-center">
                                    <span className="mr-1">{intentInfo.icon}</span>
                                    <span>{detectedIntent}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={result.brand_mentioned ? "default" : "secondary"}>
                                {result.brand_mentioned ? "Mentioned" : "Not Mentioned"}
                              </Badge>
                              {result.brand_mentioned && (
                                <Badge variant="outline">
                                  Position: {result.position}
                                </Badge>
                              )}
                            </div>
                          {result.optimization_suggestions.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <div className="font-medium mb-1">Suggestions:</div>
                              <ul className="list-disc list-inside">
                                {result.optimization_suggestions.map((suggestion, suggestionIndex) => (
                                  <li key={suggestionIndex}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No query analysis to show</h3>
                    <p>Analyze specific queries to see brand presence results here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
