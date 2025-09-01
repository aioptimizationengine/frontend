import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Zap, Target, Clock, CheckCircle2 } from 'lucide-react';
import type { PriorityRecommendations as PriorityRecommendationsType } from '../../../shared/api';

interface PriorityRecommendationsProps {
  recommendations: PriorityRecommendationsType;
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'high': return <Zap className="h-4 w-4 text-orange-500" />;
    case 'medium': return <Target className="h-4 w-4 text-yellow-500" />;
    case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    default: return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'bg-red-50 border-red-200 text-red-800';
    case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'low': return 'bg-green-50 border-green-200 text-green-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

export default function PriorityRecommendations({ recommendations }: PriorityRecommendationsProps) {
  const totalRecommendations = 
    recommendations.critical.length + 
    recommendations.high.length + 
    recommendations.medium.length + 
    recommendations.low.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="mr-2 h-5 w-5 text-blue-600" />
          AI-Generated Priority Recommendations
        </CardTitle>
        <CardDescription>
          {totalRecommendations} personalized recommendations based on your brand analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="critical" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="critical" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Critical ({recommendations.critical.length})</span>
            </TabsTrigger>
            <TabsTrigger value="high" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>High ({recommendations.high.length})</span>
            </TabsTrigger>
            <TabsTrigger value="medium" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Medium ({recommendations.medium.length})</span>
            </TabsTrigger>
            <TabsTrigger value="low" className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Low ({recommendations.low.length})</span>
            </TabsTrigger>
          </TabsList>

          {Object.entries(recommendations).map(([priority, items]) => (
            <TabsContent key={priority} value={priority} className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No {priority} priority recommendations at this time.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className={`border-l-4 ${getPriorityColor(priority)}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                          {getPriorityIcon(priority)}
                          <span className="ml-2">{item.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-gray-700">{item.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              Impact: {item.impact}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              Effort: {item.effort}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.timeline}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
