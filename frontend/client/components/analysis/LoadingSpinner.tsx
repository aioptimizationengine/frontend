import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Brain, Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  title?: string;
  description?: string;
  type?: 'analysis' | 'recommendations' | 'faqs' | 'roadmap' | 'general';
}

const getLoadingContent = (type: string) => {
  switch (type) {
    case 'analysis':
      return {
        icon: <Brain className="h-6 w-6 text-blue-500" />,
        title: 'Analyzing Brand Performance',
        description: 'AI is processing your brand data and generating insights...'
      };
    case 'recommendations':
      return {
        icon: <Sparkles className="h-6 w-6 text-purple-500" />,
        title: 'Generating Recommendations',
        description: 'Creating personalized optimization strategies...'
      };
    case 'faqs':
      return {
        icon: <Sparkles className="h-6 w-6 text-green-500" />,
        title: 'Creating Brand FAQs',
        description: 'Generating relevant questions and answers for your brand...'
      };
    case 'roadmap':
      return {
        icon: <Sparkles className="h-6 w-6 text-orange-500" />,
        title: 'Building Implementation Roadmap',
        description: 'Creating a strategic plan for brand optimization...'
      };
    default:
      return {
        icon: <Brain className="h-6 w-6 text-blue-500" />,
        title: 'Processing',
        description: 'AI is working on your request...'
      };
  }
};

export default function LoadingSpinner({ title, description, type = 'general' }: LoadingSpinnerProps) {
  const content = getLoadingContent(type);
  
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex items-center space-x-3 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          {content.icon}
        </div>
        <CardTitle className="text-lg text-center mb-2">
          {title || content.title}
        </CardTitle>
        <CardDescription className="text-center max-w-md">
          {description || content.description}
        </CardDescription>
        <div className="mt-4 flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </CardContent>
    </Card>
  );
}
