import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Brain, Wifi, Zap } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | Error;
  onRetry?: () => void;
  type?: 'analysis' | 'llm' | 'network' | 'general';
  title?: string;
}

const getErrorContent = (type: string, error: string | Error) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  switch (type) {
    case 'analysis':
      return {
        icon: <Brain className="h-6 w-6 text-red-500" />,
        title: 'Analysis Failed',
        description: 'Unable to complete brand analysis',
        suggestion: 'Check your input data and try again'
      };
    case 'llm':
      return {
        icon: <Zap className="h-6 w-6 text-orange-500" />,
        title: 'AI Processing Error',
        description: 'LLM service encountered an issue',
        suggestion: 'This may be temporary. Please try again in a moment'
      };
    case 'network':
      return {
        icon: <Wifi className="h-6 w-6 text-red-500" />,
        title: 'Connection Error',
        description: 'Unable to connect to the service',
        suggestion: 'Check your internet connection and try again'
      };
    default:
      return {
        icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
        title: 'Error Occurred',
        description: 'Something went wrong',
        suggestion: 'Please try again or contact support if the issue persists'
      };
  }
};

export default function ErrorDisplay({ error, onRetry, type = 'general', title }: ErrorDisplayProps) {
  const content = getErrorContent(type, error);
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="flex items-center space-x-3 mb-4">
          {content.icon}
        </div>
        <CardTitle className="text-lg text-center mb-2 text-red-800">
          {title || content.title}
        </CardTitle>
        <CardDescription className="text-center max-w-md mb-4 text-red-700">
          {content.description}
        </CardDescription>
        
        {/* Error Details */}
        <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4 max-w-md w-full">
          <p className="text-sm text-red-800 font-mono break-words">
            {errorMessage}
          </p>
        </div>
        
        {/* Suggestion */}
        <p className="text-sm text-red-600 text-center mb-4 max-w-md">
          {content.suggestion}
        </p>
        
        {/* Retry Button */}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
