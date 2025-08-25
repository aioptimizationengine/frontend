import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Building2, 
  Search,
  Users,
  Activity,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Gauge,
  Brain,
  Target,
  Zap,
  Trophy,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, hasPermission } = useAuth();

  const quickStats = [
    {
      title: 'Active Brands',
      value: '0',
      change: 'No data available',
      trend: 'neutral' as const,
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'AI Analyses',
      value: '0',
      change: 'No analyses run',
      trend: 'neutral' as const,
      icon: Brain,
      color: 'green'
    },
    {
      title: 'Avg. AI Score',
      value: '-%',
      change: 'Run analysis to see',
      trend: 'neutral' as const,
      icon: Gauge,
      color: 'purple'
    },
    {
      title: 'AI Citations',
      value: '0',
      change: 'No citations found',
      trend: 'neutral' as const,
      icon: Trophy,
      color: 'orange'
    }
  ];

  const recentAnalyses: any[] = [];

  const recommendations: any[] = [];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || user?.email || 'there'}
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor your AI optimization metrics and brand performance
            </p>
          </div>
          {hasPermission('canRunAnalysis') && (
            <Link to="/analysis">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Brain className="mr-2 h-4 w-4" />
                New AI Analysis
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.trend === 'up' && (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    )}
                    {stat.trend === 'down' && (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${
                      stat.trend === 'up' ? 'text-green-600' :
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent AI Analyses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gauge className="mr-2 h-5 w-5" />
              Recent AI Analyses
            </CardTitle>
            <CardDescription>
              Latest AI optimization analysis results and performance grades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gauge className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses to show</h3>
                <p className="text-gray-500 mb-4">
                  Run your first brand analysis to see results here.
                </p>
                {hasPermission('canRunAnalysis') && (
                  <Link to="/analysis">
                    <Button>
                      <Brain className="mr-2 h-4 w-4" />
                      Run First Analysis
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{analysis.brand}</h4>
                        <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                          {analysis.status}
                        </Badge>
                        {analysis.status === 'completed' && (
                          <Badge className={getGradeColor(analysis.grade)} variant="outline">
                            Grade {analysis.grade}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{analysis.timestamp}</p>
                      {analysis.improvements && (
                        <p className="text-xs text-green-600 mt-1">
                          +{analysis.improvements} optimization improvements found
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {analysis.status === 'completed' && (
                        <div className="text-2xl font-bold text-blue-600">
                          {analysis.overallScore}%
                        </div>
                      )}
                      {analysis.status === 'processing' && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span className="text-sm">Analyzing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentAnalyses.length > 0 && hasPermission('canViewReports') && (
              <div className="mt-4 pt-4 border-t">
                <Link to="/analytics">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" />
              Priority Recommendations
            </CardTitle>
            <CardDescription>
              AI optimization recommendations to improve your brand visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations to show</h3>
                <p className="text-gray-500 mb-4">
                  Run brand analyses to get personalized optimization recommendations.
                </p>
                {hasPermission('canRunAnalysis') && (
                  <Link to="/analysis">
                    <Button>
                      <Target className="mr-2 h-4 w-4" />
                      Run Analysis
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-600">{rec.brand}</span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{rec.impact} impact</div>
                          <div>{rec.timeline}</div>
                        </div>
                      </div>
                      <div className="mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {rec.category}
                        </span>
                      </div>
                      <h4 className="font-medium mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link to="/analysis">
                    <Button variant="outline" className="w-full">
                      <Target className="mr-2 h-4 w-4" />
                      Run New Analysis
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Optimization Metrics Overview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            AI Optimization Overview
          </CardTitle>
          <CardDescription>
            Key metrics across your brands for AI visibility and optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">-</div>
              <div className="text-sm text-gray-600">Avg Attribution Rate</div>
              <div className="text-xs text-gray-500 mt-1">No data available</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">0</div>
              <div className="text-sm text-gray-600">Total AI Citations</div>
              <div className="text-xs text-gray-500 mt-1">No citations found</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">-</div>
              <div className="text-sm text-gray-600">Avg Confidence Score</div>
              <div className="text-xs text-gray-500 mt-1">No data available</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Vector Index Presence</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-500">0%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Semantic Coverage</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-300 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-500">0%</span>
              </div>
            </div>
          </div>

          {hasPermission('canUpdateBilling') && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div>
                <h4 className="font-medium">Want to improve your AI optimization?</h4>
                <p className="text-sm text-gray-600">Upgrade your plan for advanced AI analysis features</p>
              </div>
              <Link to="/billing">
                <Button>
                  <Zap className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
