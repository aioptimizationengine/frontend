import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface StrengthsWeaknessesProps {
  strengths?: string[];
  weaknesses?: string[];
  brandName: string;
}

export default function StrengthsWeaknesses({ strengths = [], weaknesses = [], brandName }: StrengthsWeaknessesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Strengths */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <TrendingUp className="mr-2 h-5 w-5" />
            Brand Strengths
          </CardTitle>
          <CardDescription>
            AI-identified competitive advantages for {brandName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No specific strengths identified</p>
            </div>
          ) : (
            <div className="space-y-3">
              {strengths.map((strength, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 font-medium text-sm leading-relaxed">
                      {strength}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  {strengths.length} strength{strengths.length !== 1 ? 's' : ''} identified
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weaknesses */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-800">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Areas for Improvement
          </CardTitle>
          <CardDescription>
            AI-identified optimization opportunities for {brandName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weaknesses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <XCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No specific weaknesses identified</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium text-sm leading-relaxed">
                      {weakness}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  {weaknesses.length} area{weaknesses.length !== 1 ? 's' : ''} for improvement
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
