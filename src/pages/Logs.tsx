
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react';

interface SendLog {
  id: string;
  created_at: string;
  channel: string;
  request_url: string;
  status_code?: number;
  response_body?: string;
  payload?: any;
  user_id: string;
  location_id: string;
}

export default function Logs() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const highlightLogId = searchParams.get('highlight');

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('send_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);
      
      // Auto-expand highlighted row
      if (highlightLogId) {
        setExpandedRows(new Set([highlightLogId]));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error loading logs",
        description: "Failed to load send logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return <Badge variant="secondary">No Response</Badge>;
    
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="bg-green-500">Success ({statusCode})</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="destructive">Client Error ({statusCode})</Badge>;
    } else if (statusCode >= 500) {
      return <Badge variant="destructive">Server Error ({statusCode})</Badge>;
    } else {
      return <Badge variant="secondary">{statusCode}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => 
    !searchTerm || 
    log.request_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.response_body && log.response_body.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send Logs</h1>
          <p className="text-muted-foreground">
            View message sending history and debug information.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by URL, channel, or response..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Send History ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Click on a row to view full request and response details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <Collapsible key={log.id} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow 
                        className={`cursor-pointer hover:bg-muted/50 ${
                          highlightLogId === log.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                        }`}
                        onClick={() => toggleRowExpansion(log.id)}
                      >
                        <TableCell>
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.channel}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                        <TableCell className="font-mono text-sm max-w-md truncate">
                          {log.request_url}
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Request Details</h4>
                              <div className="bg-background p-3 rounded border">
                                <p className="text-sm"><strong>URL:</strong> {log.request_url}</p>
                                <p className="text-sm"><strong>Channel:</strong> {log.channel}</p>
                                {log.payload && (
                                  <div className="mt-2">
                                    <strong className="text-sm">Payload:</strong>
                                    <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                                      {JSON.stringify(log.payload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Response Details</h4>
                              <div className="bg-background p-3 rounded border">
                                <p className="text-sm">
                                  <strong>Status Code:</strong> {log.status_code || 'N/A'}
                                </p>
                                {log.response_body && (
                                  <div className="mt-2">
                                    <strong className="text-sm">Response Body:</strong>
                                    <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto max-h-48 overflow-y-auto">
                                      {log.response_body}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No send logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
