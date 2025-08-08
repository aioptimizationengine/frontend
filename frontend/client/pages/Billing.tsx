import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Star,
  Calendar,
  DollarSign,
  Loader2
} from 'lucide-react';
import { Subscription } from '@shared/types';
import StripePaymentForm from '@/components/billing/StripePaymentForm';
import { toast } from 'sonner';

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  billing: 'monthly' | 'annual';
  popular?: boolean;
  features: PlanFeature[];
  limits: {
    analyses: number | 'unlimited';
    apiCalls: number | 'unlimited';
    brands: number | 'unlimited';
    users: number | 'unlimited';
  };
}

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export default function Billing() {
  const { user, hasPermission } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billing: 'monthly',
      features: [
        { name: 'Basic brand analysis', included: true },
        { name: 'Limited analyses', included: true, limit: '2 analyses' },
        { name: 'Limited API calls', included: true, limit: '100 calls' },
        { name: 'Single brand', included: true, limit: '1 brand' },
        { name: 'Single user', included: true, limit: '1 user' },
        { name: 'Email support', included: true }
      ],
      limits: {
        analyses: 2,
        apiCalls: 100,
        brands: 1,
        users: 1
      }
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 49,
      billing: 'monthly',
      features: [
        { name: 'Full brand analysis', included: true },
        { name: 'Monthly analyses', included: true, limit: '50 analyses' },
        { name: 'API calls', included: true, limit: '5,000 calls' },
        { name: 'Multiple brands', included: true, limit: '5 brands' },
        { name: 'Team members', included: true, limit: '3 users' },
        { name: 'Email support', included: true }
      ],
      limits: {
        analyses: 50,
        apiCalls: 5000,
        brands: 5,
        users: 3
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 199,
      billing: 'monthly',
      popular: true,
      features: [
        { name: 'Advanced brand analysis', included: true },
        { name: 'Unlimited analyses', included: true },
        { name: 'Extended API calls', included: true, limit: '50,000 calls' },
        { name: 'Unlimited brands', included: true },
        { name: 'Team collaboration', included: true, limit: '10 users' },
        { name: 'Priority support', included: true }
      ],
      limits: {
        analyses: 'unlimited',
        apiCalls: 50000,
        brands: 'unlimited',
        users: 10
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 0,
      billing: 'monthly',
      features: [
        { name: 'Custom limits', included: true },
        { name: 'Custom pricing', included: true },
        { name: 'SLA guarantee', included: true },
        { name: 'Dedicated support', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Enterprise features', included: true }
      ],
      limits: {
        analyses: 'unlimited',
        apiCalls: 'unlimited',
        brands: 'unlimited',
        users: 'unlimited'
      }
    }
  ];

  useEffect(() => {
    // No subscription data - show empty state
    setCurrentSubscription(null);
    setInvoices([]);
  }, [user]);

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(false);
    setShowUpgradeDialog(true);
  };

  const handlePaymentSuccess = async () => {
    toast.success('Payment successful! Your subscription has been updated.');
    setShowUpgradeDialog(false);
    setSelectedPlan(null);
    // Refresh subscription data
    // You might want to add a refresh function here to update the UI
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentPlan = plans.find(p => p.id === currentSubscription?.planId);

  if (!hasPermission('canUpdateBilling')) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view billing information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Star className="mr-2 h-5 w-5 text-yellow-500" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>
                    Your active subscription
                  </CardDescription>
                </div>
                {currentSubscription?.status === 'active' && (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSubscription && currentPlan ? (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="text-lg font-semibold">{currentPlan.name} Plan</h3>
                      <p className="text-gray-600">
                        {formatCurrency(currentPlan.price)}/month
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Next billing</p>
                      <p className="font-medium">
                        {formatDate(currentSubscription.nextBillingDate)}
                      </p>
                    </div>
                  </div>

                  {/* Plan Features */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Plan Features</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {currentPlan.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          {feature.included ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" />
                          )}
                          <span className={feature.included ? '' : 'text-gray-400'}>
                            {feature.name}
                            {feature.limit && <span className="text-gray-500"> ({feature.limit})</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      className="flex-1"
                      onClick={() => setShowUpgradeDialog(true)}
                    >
                      Change Plan
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Cancel Subscription
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active subscription</h3>
                  <p className="text-gray-500 mb-4">
                    Subscribe to a plan to start using AI optimization features.
                  </p>
                  <Button onClick={() => setShowUpgradeDialog(true)}>
                    <Star className="mr-2 h-4 w-4" />
                    Choose a Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Manage your payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSubscription ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">CARD</span>
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• ••••</p>
                      <p className="text-sm text-gray-600">No payment method</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="mx-auto h-8 w-8 mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    No payment method configured.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`p-4 border rounded-lg ${plan.popular ? 'border-blue-500' : ''} ${plan.id === currentSubscription?.planId ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{plan.name} {plan.popular && <Badge className="ml-2">Popular</Badge>}</h3>
                        <p className="text-sm text-gray-600">
                          {plan.id === 'enterprise' 
                            ? 'Custom pricing' 
                            : `${formatCurrency(plan.price)}/month`}
                        </p>
                      </div>
                      <Button 
                        variant={plan.id === currentSubscription?.planId ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleUpgrade(plan)}
                        disabled={plan.id === currentSubscription?.planId}
                      >
                        {plan.id === currentSubscription?.planId ? 'Current Plan' : 'Select'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="invoices" className="mt-8">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="plans">All Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                View your past invoices and billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        <Calendar className="mx-auto h-8 w-8 mb-4 text-gray-300" />
                        <p>No invoices to show</p>
                        <p className="text-sm">Your billing history will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.id}</div>
                            <div className="text-sm text-gray-500">{invoice.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {plan.id === 'enterprise' ? 'Contact us' : formatCurrency(plan.price)}
                    {plan.id !== 'enterprise' && (
                      <span className="text-lg font-normal text-gray-600">
                        /mo
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        {feature.included ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-gray-300" />
                        )}
                        <span className={feature.included ? '' : 'text-gray-400'}>
                          {feature.name}
                          {feature.limit && <span className="text-gray-500"> ({feature.limit})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full"
                    variant={plan.id === currentSubscription?.planId ? 'outline' : 'default'}
                    onClick={() => handleUpgrade(plan)}
                    disabled={plan.id === currentSubscription?.planId}
                  >
                    {plan.id === currentSubscription?.planId ? 'Current Plan' : 
                     plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showPaymentForm ? 'Complete Your Purchase' : 'Confirm Plan Change'}
            </DialogTitle>
            <DialogDescription>
              {showPaymentForm 
                ? 'Enter your payment details to complete your subscription.'
                : `You're about to change to the ${selectedPlan?.name} plan.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Processing your request...</p>
            </div>
          ) : showPaymentForm && selectedPlan ? (
            <StripePaymentForm
              planId={selectedPlan.id}
              planName={selectedPlan.name}
              amount={selectedPlan.price * 100} // Convert to cents
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          ) : (
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="font-medium mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-medium">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Billing</span>
                    <span className="font-medium">
                      {selectedPlan?.billing === 'monthly' ? 'Monthly' : 'Annually'}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>
                      {selectedPlan?.id === 'enterprise'
                        ? 'Contact Sales'
                        : `${formatCurrency(selectedPlan?.price || 0)}/month`
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Plan Features</h4>
                <ul className="space-y-2 text-sm">
                  {selectedPlan?.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>
                        {feature.name}
                        {feature.limit && (
                          <span className="text-muted-foreground"> ({feature.limit})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpgradeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    if (selectedPlan?.id === 'enterprise') {
                      // Handle enterprise contact
                      window.location.href = 'mailto:sales@aisight.com?subject=Enterprise Plan Inquiry';
                    } else {
                      setShowPaymentForm(true);
                    }
                  }}
                >
                  {selectedPlan?.id === 'enterprise' ? 'Contact Sales' : 'Continue to Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
