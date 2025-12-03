
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, Info } from 'lucide-react';

export default function Billing() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your CORTEK subscription and billing settings.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your subscription status and plan details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Free Trial</h3>
              <p className="text-sm text-muted-foreground">
                Full access to all features during trial period
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium">Trial Days Remaining</p>
              <p className="text-2xl font-bold text-primary">14</p>
            </div>
            <div>
              <p className="text-sm font-medium">Messages This Month</p>
              <p className="text-2xl font-bold">0 / ∞</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Portal */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>
            Access your billing history, update payment methods, and manage subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Customer Portal (Coming Soon)
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Stripe billing portal will be available in the next release.
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Coming in Phase 2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Stripe payment processing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Multiple subscription tiers
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Usage-based billing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              Automatic billing management
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
