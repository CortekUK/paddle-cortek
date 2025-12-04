
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, CheckCircle, XCircle, Activity, Info } from 'lucide-react';

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

export default function EmulatorTest() {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    status?: number;
    response?: string;
    url?: string;
    error?: string;
    timestamp: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-emulator', {
        body: {
          message: 'Test message from CORTEK Admin Panel',
          groups: ['test_group'],
          test: true
        }
      });

      if (error) throw error;

      const firstResult = data?.results?.[0];
      setLastResult({
        success: data.success,
        status: firstResult?.status_code || null,
        response: firstResult?.response_body || '',
        url: firstResult?.url || '',
        error: firstResult?.error_type || null,
        timestamp: new Date().toISOString()
      });

      if (data.success) {
        toast({
          title: "Test successful",
          description: "Emulator endpoint is responding correctly.",
        });
      } else {
        toast({
          title: "Test failed",
          description: `Error: ${firstResult?.error_type || 'Unknown error'}`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setLastResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Test error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gradient Page Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-8 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold">Emulator Test</h1>
          <p className="text-muted-foreground mt-1">Quick health check for your emulator endpoint.</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Health Check Card */}
        <Card className={cardClass}>
          <CardHeader className="text-left">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <CardTitle>Health Check</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTest}
              disabled={testing}
              className="w-full rounded-xl"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {testing ? 'Testing Connection...' : 'Send Test Message'}
            </Button>
          </CardContent>
        </Card>

        {/* Last Test Result Card */}
        {lastResult && (
          <Card className={cardClass}>
            <CardHeader className="text-left">
              <div className="flex items-center gap-4">
                {lastResult.success ? (
                  <div className="p-2.5 rounded-lg bg-green-100/50 dark:bg-green-900/20">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-red-100/50 dark:bg-red-900/20">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <CardTitle>Last Test Result</CardTitle>
                  <Badge variant={lastResult.success ? "default" : "destructive"}>
                    {lastResult.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 ml-[52px]">
                Tested at {new Date(lastResult.timestamp).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastResult.url && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Request URL</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-sm font-mono">{lastResult.url}</code>
                  </div>
                </div>
              )}

              {lastResult.status && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Status Code</h4>
                  <Badge 
                    variant={
                      lastResult.status >= 200 && lastResult.status < 300 
                        ? "default" 
                        : "destructive"
                    }
                  >
                    {lastResult.status}
                  </Badge>
                </div>
              )}

              {lastResult.response && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Response Body</h4>
                  <Textarea
                    value={lastResult.response}
                    readOnly
                    className="font-mono text-sm min-h-32 rounded-lg"
                  />
                </div>
              )}

              {lastResult.error && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Error Details</h4>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <code className="text-sm text-red-700 dark:text-red-300">
                      {lastResult.error}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* About This Test Card */}
        <Card className={cardClass}>
          <CardHeader className="text-left">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <CardTitle>About This Test</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3 text-left">
            <p>This test verifies your WhatsApp connection is working correctly by:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sending a test message to a group called "test_group"</li>
              <li>Using your location's configured emulator endpoint</li>
              <li>Checking for a response within 10 seconds</li>
            </ul>
            <p className="font-medium text-foreground">
              Note: Make sure you have a WhatsApp group named exactly "test_group" for this test to work.
            </p>
            <p>
              This test won't affect your regular automated messages.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
