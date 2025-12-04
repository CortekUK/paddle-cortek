
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
import { ChevronDown, ChevronRight, Search, RefreshCw, History } from 'lucide-react';

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

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

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
    if (!statusCode) return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
        No Response
      </Badge>
    );
    
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
          Success ({statusCode})
        </Badge>
      );
    } else if (statusCode >= 400 && statusCode < 500) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
          Client Error ({statusCode})
        </Badge>
      );
    } else if (statusCode >= 500) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
          Server Error ({statusCode})
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
          {statusCode}
        </Badge>
      );
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
      {/* Premium Gradient Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-8 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative flex items-start justify-between">
          <div className="text-left">
            <h1 className="text-3xl font-bold tracking-tight">Send Logs</h1>
            <p className="text-muted-foreground mt-1">
              View message sending history and debug information.
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" className="rounded-lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Card */}
      <Card className={cardClass}>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by URL, channel, or response..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className={cardClass}>
        <CardHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <History className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>Send History ({filteredLogs.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
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
                        className={`cursor-pointer hover:bg-muted/50 border-border/40 ${
                          highlightLogId === log.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                        }`}
                        onClick={() => toggleRowExpansion(log.id)}
                      >
                        <TableCell>
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-md">{log.channel}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                        <TableCell className="font-mono text-sm max-w-md truncate">
                          {log.request_url}
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow className="border-border/40">
                        <TableCell colSpan={5} className="bg-muted/20 p-6">
                          <div className="space-y-4 text-left">
                            <div className="bg-background rounded-lg border border-border/60 p-4">
                              <h4 className="font-semibold mb-3 text-sm">Request Details</h4>
                              <div className="space-y-2">
                                <p className="text-sm"><span className="text-muted-foreground">URL:</span> {log.request_url}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Channel:</span> {log.channel}</p>
                                {log.payload && (
                                  <div className="mt-3">
                                    <span className="text-sm text-muted-foreground">Payload:</span>
                                    <pre className="text-xs mt-2 p-3 bg-muted/50 rounded-lg overflow-x-auto font-mono">
                                      {JSON.stringify(log.payload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="bg-background rounded-lg border border-border/60 p-4">
                              <h4 className="font-semibold mb-3 text-sm">Response Details</h4>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Status Code:</span> {log.status_code || 'N/A'}
                                </p>
                                {log.response_body && (
                                  <div className="mt-3">
                                    <span className="text-sm text-muted-foreground">Response Body:</span>
                                    <pre className="text-xs mt-2 p-3 bg-muted/50 rounded-lg overflow-x-auto max-h-48 overflow-y-auto font-mono">
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
                <TableRow className="border-border/40">
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
