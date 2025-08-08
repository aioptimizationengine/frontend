import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Building2, 
  FileText, 
  BarChart3, 
  Key, 
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  Shield,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: string;
}

const iconMap = {
  Search,
  Building2,
  FileText,
  BarChart3,
  Key,
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  Shield,
  Settings
};

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap] || Settings;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <IconComponent className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Coming Soon</h3>
            <p className="text-sm text-blue-700">
              This feature is currently under development. Check back soon for updates, 
              or continue working on other areas of your AI optimization strategy.
            </p>
          </div>
          
          <div className="space-y-2">
            <Link to="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <p className="text-xs text-center text-gray-500">
              Need help? Let us know what features you'd like to see implemented first.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
