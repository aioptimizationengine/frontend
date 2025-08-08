import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripePaymentFormProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<StripePaymentFormProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    // Get form data
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const postalCode = formData.get('postalCode') as string;
    const country = formData.get('country') as string;

    try {
      // Create payment intent on the server
      const response = await fetch('/api/billing/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          planName,
          amount,
          billingDetails: {
            name: `${firstName} ${lastName}`,
            address: {
              line1: address,
              city,
              postal_code: postalCode,
              country,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the payment with the client secret
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: `${firstName} ${lastName}`,
            address: {
              line1: address,
              city,
              postal_code: postalCode,
              country,
            },
            email: 'customer@example.com', // You might want to get this from the user's profile
          },
        },
      });

      if (stripeError) {
        toast.error(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('An error occurred during payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardNumberElement
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#1a1f36',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          '::placeholder': {
                            color: '#9CA3AF',
                          },
                        },
                        invalid: {
                          color: '#DC2626',
                        },
                      },
                      placeholder: '4444 4444 4444 4444',
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardExpiryElement
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#1a1f36',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            '::placeholder': {
                              color: '#9CA3AF',
                            },
                          },
                          invalid: {
                            color: '#DC2626',
                          },
                        },
                        placeholder: 'MM/YY',
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardCvcElement
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#1a1f36',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            '::placeholder': {
                              color: '#9CA3AF',
                            },
                          },
                          invalid: {
                            color: '#DC2626',
                          },
                        },
                        placeholder: '067',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
              <input
                type="text"
                name="cardName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
              <input
                type="text"
                name="address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="New York"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  name="postalCode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10001"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                name="country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="JP">Japan</option>
                <option value="CN">China</option>
                <option value="IN">India</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="AE">United Arab Emirates</option>
                <option value="SA">Saudi Arabia</option>
                <option value="ZA">South Africa</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-between pt-2">
            <div className="text-sm text-gray-600">
              Plan: <span className="font-medium">{planName}</span>
            </div>
            <div className="text-lg font-bold">
              ${(amount / 100).toFixed(2)} / month
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isLoading}>
          {isLoading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3B82F6',
          },
        },
      }}
    >
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripePaymentForm;
