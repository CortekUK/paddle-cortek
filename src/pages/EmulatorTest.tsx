
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TestTube, Send, CheckCircle, XCircle } from 'lucide-react';

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

      // Use the first result for display
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TestTube className="h-8 w-8" />
          Emulator Test
        </h1>
        <p className="text-muted-foreground">
          Quick health check for your emulator endpoint. Sends a test message and displays the raw response.
        </p>
      </div>

      {/* Test Control */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check</CardTitle>
          <CardDescription>
            Send a test message to verify the emulator is responding correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTest}
            disabled={testing}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {testing ? 'Testing Connection...' : 'Send Test Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Last Test Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Last Test Result
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? 'Success' : 'Failed'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Tested at {new Date(lastResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastResult.url && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Request URL</h4>
                <div className="bg-muted p-3 rounded-md">
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
                  className="font-mono text-sm min-h-32"
                />
              </div>
            )}

            {lastResult.error && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Error Details</h4>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <code className="text-sm text-red-700 dark:text-red-300">
                    {lastResult.error}
                  </code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Message Info */}
      <Card>
        <CardHeader>
          <CardTitle>About This Test</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This test sends a canned message with the following properties:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Message: "Test message from CORTEK Admin Panel"</li>
            <li>Groups: ["test_group"]</li>
            <li>Uses your location's configured emulator URL</li>
            <li>Includes proper RFC 3986 URL encoding</li>
            <li>Times out after 10 seconds</li>
          </ul>
          <p className="mt-3">
            This helps diagnose connectivity issues without affecting your main Send Message flow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
