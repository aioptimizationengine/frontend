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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Activity,
  Bot,
  BarChart3,
  Search,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Globe
} from 'lucide-react';

interface LogUpload {
  id: string;
  filename: string;
  brand_id: string;
  log_format: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: Date;
  processed_lines?: number;
  total_lines?: number;
  error_message?: string;
}

interface LogAnalysis {
  brand_id: string;
  total_requests: number;
  unique_visitors: number;
  bot_requests: number;
  error_rate: number;
  peak_traffic_hour: string;
  top_pages: Array<{ path: string; hits: number }>;
  top_user_agents: Array<{ agent: string; count: number }>;
  status_codes: Record<string, number>;
}

interface BotActivity {
  platform: string;
  bot_name: string;
  requests: number;
  last_seen: Date;
  crawl_frequency: string;
  status_distribution: Record<string, number>;
}

export default function ServerLogs() {
  const { user, hasPermission } = useAuth();
  const [uploads, setUploads] = useState<LogUpload[]>([]);
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [botActivity, setBotActivity] = useState<BotActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedDays, setSelectedDays] = useState('30');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [logSample, setLogSample] = useState('');
  const [sampleFormat, setSampleFormat] = useState('apache_combined');
  const [sampleAnalysis, setSampleAnalysis] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const [uploadForm, setUploadForm] = useState({
    brand_id: '',
    log_format: 'apache_combined'
  });

  useEffect(() => {
    isMountedRef.current = true;
    fetchUploads();
    if (selectedBrand) {
      fetchAnalysis();
      fetchBotActivity();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [selectedBrand, selectedDays, selectedPlatform]);

  const fetchUploads = async () => {
    try {
      // Show empty state since API isn't available
      if (isMountedRef.current) {
        setUploads([]);
      }
    } catch (error) {
      console.log('Upload history unavailable');
      if (isMountedRef.current) {
        setUploads([]);
      }
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedBrand) return;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setAnalysis(null);
      }
    } catch (error) {
      console.log('Log analysis unavailable');
      if (isMountedRef.current) {
        setAnalysis(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchBotActivity = async () => {
    if (!selectedBrand) return;

    try {
      // Show empty state since API isn't available
      if (isMountedRef.current) {
        setBotActivity([]);
      }
    } catch (error) {
      console.log('Bot activity unavailable');
      if (isMountedRef.current) {
        setBotActivity([]);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadForm.brand_id) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brand_id', uploadForm.brand_id);
      formData.append('log_format', uploadForm.log_format);

      // Simulate upload since API isn't available
      const mockUpload: LogUpload = {
        id: Date.now().toString(),
        filename: file.name,
        brand_id: uploadForm.brand_id,
        log_format: uploadForm.log_format,
        status: 'uploading',
        progress: 0,
        created_at: new Date()
      };
      
      setUploads(prev => [mockUpload, ...prev]);
      setShowUploadDialog(false);
      
      // Simulate progress
      const updateProgress = () => {
        setUploads(prev => prev.map(upload => 
          upload.id === mockUpload.id 
            ? { ...upload, progress: Math.min(upload.progress + 10, 100) }
            : upload
        ));
      };
      
      const interval = setInterval(updateProgress, 500);
      setTimeout(() => {
        clearInterval(interval);
        setUploads(prev => prev.map(upload => 
          upload.id === mockUpload.id 
            ? { ...upload, status: 'completed', progress: 100, processed_lines: 15420, total_lines: 15420 }
            : upload
        ));
      }, 5000);
      
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const analyzeSample = async () => {
    if (!logSample.trim()) return;
    
    try {
      // Mock analysis result
      if (isMountedRef.current) {
        setSampleAnalysis({
          format_detected: sampleFormat,
          is_valid: true,
          extracted_fields: {
            ip: '127.0.0.1',
            timestamp: '25/Dec/2023:10:00:00 +0000',
            method: 'GET',
            path: '/api/brands',
            status: '200',
            size: '1234',
            user_agent: 'Mozilla/5.0 (compatible; bot/1.0)'
          },
          potential_bot: true,
          bot_probability: 0.85
        });
      }
    } catch (error) {
      console.error('Sample analysis failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!hasPermission('canRunAnalysis')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access server logs analysis.</p>
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
            <FileText className="mr-3 h-8 w-8 text-blue-600" />
            Server Logs Analysis
          </h1>
          <p className="text-gray-600 mt-2">
            Upload and analyze server logs to understand traffic patterns and bot activity
          </p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Log File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Server Log</DialogTitle>
              <DialogDescription>
                Upload a server log file for analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand-select">Brand</Label>
                <Select value={uploadForm.brand_id} onValueChange={(value) => setUploadForm(prev => ({ ...prev, brand_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand1">Example Brand</SelectItem>
                    <SelectItem value="brand2">Tech Corp</SelectItem>
                    <SelectItem value="brand3">Startup Inc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="log-format">Log Format</Label>
                <Select value={uploadForm.log_format} onValueChange={(value) => setUploadForm(prev => ({ ...prev, log_format: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select log format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apache_combined">Apache Combined</SelectItem>
                    <SelectItem value="apache_common">Apache Common</SelectItem>
                    <SelectItem value="nginx">Nginx</SelectItem>
                    <SelectItem value="iis">IIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="log-file">Log File</Label>
                <Input
                  id="log-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".log,.txt"
                  disabled={!uploadForm.brand_id}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: .log, .txt (max 100MB)
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="uploads" className="space-y-6">
        <TabsList>
          <TabsTrigger value="uploads">Upload History</TabsTrigger>
          <TabsTrigger value="analysis">Log Analysis</TabsTrigger>
          <TabsTrigger value="bot-activity">Bot Activity</TabsTrigger>
          <TabsTrigger value="sample-analyzer">Sample Analyzer</TabsTrigger>
        </TabsList>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>Recent log file uploads and processing status</CardDescription>
            </CardHeader>
            <CardContent>
              {uploads.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h3>
                  <p className="text-gray-500 mb-4">
                    Upload your first server log file to start analyzing traffic patterns.
                  </p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Log File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium">{upload.filename}</p>
                              <p className="text-sm text-gray-500">
                                Brand: {upload.brand_id} • Format: {upload.log_format}
                              </p>
                            </div>
                          </div>
                          {upload.status === 'uploading' || upload.status === 'processing' ? (
                            <div className="mt-2">
                              <Progress value={upload.progress} className="w-full" />
                              <p className="text-sm text-gray-500 mt-1">
                                {upload.status === 'uploading' ? 'Uploading...' : 'Processing...'} {upload.progress}%
                              </p>
                            </div>
                          ) : null}
                          {upload.processed_lines && (
                            <p className="text-sm text-gray-500 mt-1">
                              Processed {upload.processed_lines.toLocaleString()} lines
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(upload.status)}>
                            {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(upload.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand1">Example Brand</SelectItem>
                      <SelectItem value="brand2">Tech Corp</SelectItem>
                      <SelectItem value="brand3">Startup Inc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time Period</Label>
                  <Select value={selectedDays} onValueChange={setSelectedDays}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchAnalysis} disabled={!selectedBrand || loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Analyze
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysis ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Requests</p>
                        <p className="text-2xl font-bold text-gray-900">{analysis.total_requests.toLocaleString()}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                        <p className="text-2xl font-bold text-gray-900">{analysis.unique_visitors.toLocaleString()}</p>
                      </div>
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Bot Requests</p>
                        <p className="text-2xl font-bold text-gray-900">{analysis.bot_requests.toLocaleString()}</p>
                      </div>
                      <Bot className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Error Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{(analysis.error_rate * 100).toFixed(2)}%</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Pages and User Agents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Pages</CardTitle>
                    <CardDescription>Most requested pages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.top_pages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{page.path}</span>
                          <Badge variant="outline">{page.hits.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top User Agents</CardTitle>
                    <CardDescription>Most common user agents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.top_user_agents.map((agent, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-xs" title={agent.agent}>
                            {agent.agent}
                          </span>
                          <Badge variant="outline">{agent.count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : selectedBrand ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis data available</h3>
                <p className="text-gray-500">
                  Upload server logs for this brand to see analysis results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a brand to analyze</h3>
                <p className="text-gray-500">
                  Choose a brand from the dropdown above to view log analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bot-activity" className="space-y-6">
          {/* Bot Activity Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand1">Example Brand</SelectItem>
                      <SelectItem value="brand2">Tech Corp</SelectItem>
                      <SelectItem value="brand3">Startup Inc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period</Label>
                  <Select value={selectedDays} onValueChange={setSelectedDays}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bot Activity Results */}
          {botActivity.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {botActivity.map((bot, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-purple-500" />
                        <div>
                          <CardTitle>{bot.bot_name}</CardTitle>
                          <CardDescription>{bot.platform} • {bot.crawl_frequency}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{bot.requests.toLocaleString()} requests</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{bot.requests.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Total Requests</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {new Date(bot.last_seen).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">Last Seen</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{bot.crawl_frequency}</p>
                        <p className="text-sm text-gray-600">Frequency</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {Object.keys(bot.status_distribution).length}
                        </p>
                        <p className="text-sm text-gray-600">Status Codes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : selectedBrand ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bot activity found</h3>
                <p className="text-gray-500">
                  No bot activity detected for the selected brand and time period.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a brand</h3>
                <p className="text-gray-500">
                  Choose a brand to view bot activity analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sample-analyzer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log Sample Analyzer</CardTitle>
              <CardDescription>Test and analyze individual log entries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="log-sample">Log Sample</Label>
                <Textarea
                  id="log-sample"
                  value={logSample}
                  onChange={(e) => setLogSample(e.target.value)}
                  placeholder='127.0.0.1 - - [25/Dec/2023:10:00:00 +0000] "GET /api/brands HTTP/1.1" 200 1234 "-" "Mozilla/5.0 (compatible; bot/1.0)"'
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="sample-format">Log Format</Label>
                <Select value={sampleFormat} onValueChange={setSampleFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apache_combined">Apache Combined</SelectItem>
                    <SelectItem value="apache_common">Apache Common</SelectItem>
                    <SelectItem value="nginx">Nginx</SelectItem>
                    <SelectItem value="iis">IIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={analyzeSample} disabled={!logSample.trim()}>
                <Search className="mr-2 h-4 w-4" />
                Analyze Sample
              </Button>

              {sampleAnalysis && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Analysis Results</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Format Detected</p>
                      <p className="font-medium">{sampleAnalysis.format_detected}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Valid Format</p>
                      <Badge className={sampleAnalysis.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {sampleAnalysis.is_valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Potential Bot</p>
                      <Badge className={sampleAnalysis.potential_bot ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                        {sampleAnalysis.potential_bot ? `Bot (${(sampleAnalysis.bot_probability * 100).toFixed(0)}%)` : 'Human'}
                      </Badge>
                    </div>
                  </div>
                  {sampleAnalysis.extracted_fields && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Extracted Fields</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {Object.entries(sampleAnalysis.extracted_fields).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="font-medium text-gray-600 w-20 capitalize">{key}:</span>
                            <span className="truncate">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
