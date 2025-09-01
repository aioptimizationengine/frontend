import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapIcon, Clock, CheckCircle2, Target, Lightbulb } from 'lucide-react';
import type { ImplementationRoadmap as ImplementationRoadmapType } from '../../../shared/api';

interface ImplementationRoadmapProps {
  roadmap: ImplementationRoadmapType;
}

export default function ImplementationRoadmap({ roadmap }: ImplementationRoadmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapIcon className="mr-2 h-5 w-5 text-blue-600" />
          AI-Generated Implementation Roadmap
        </CardTitle>
        <CardDescription>
          Strategic implementation plan with {roadmap.phases.length} phases over {roadmap.total_timeline}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Lightbulb className="h-4 w-4 mr-2" />
            Overview
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">{roadmap.overview}</p>
          <div className="mt-3 flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {roadmap.total_timeline}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {roadmap.phases.length} Phases
            </Badge>
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Implementation Phases
          </h3>
          
          {roadmap.phases.map((phase, index) => (
            <Card key={index} className="border-l-4 border-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    {phase.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {phase.duration}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tasks */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Tasks</h4>
                  <ul className="space-y-1">
                    {phase.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-start space-x-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deliverables */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Deliverables</h4>
                  <div className="flex flex-wrap gap-2">
                    {phase.deliverables.map((deliverable, delIndex) => (
                      <Badge key={delIndex} variant="secondary" className="text-xs">
                        {deliverable}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Success Metrics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Success Metrics</h4>
                  <ul className="space-y-1">
                    {phase.success_metrics.map((metric, metricIndex) => (
                      <li key={metricIndex} className="flex items-start space-x-2 text-sm">
                        <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{metric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Key Milestones */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Key Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roadmap.key_milestones.map((milestone, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{milestone}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Criteria */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Success Criteria
          </h3>
          <div className="space-y-2">
            {roadmap.success_criteria.map((criteria, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-green-800">{criteria}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
