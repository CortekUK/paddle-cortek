import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Wallet, Info, ExternalLink } from 'lucide-react';

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

export default function Billing() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-8">
      {/* Gradient Page Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-8 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your CORTEK subscription and billing settings.</p>
        </div>
      </div>

      {/* Current Plan */}
      <Card className={cardClass}>
        <CardHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>Current Plan</CardTitle>
          </div>
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
      <Card className={cardClass}>
        <CardHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>Billing Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button disabled variant="outline" className="w-full rounded-xl">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Customer Portal (Coming Soon)
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Stripe billing portal will be available in the next release.
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Features */}
      <Card className={cardClass}>
        <CardHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>Coming in Phase 2</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-left">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              Stripe payment processing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              Multiple subscription tiers
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              Usage-based billing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              Automatic billing management
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
