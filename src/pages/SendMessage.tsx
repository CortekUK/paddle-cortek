
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Send, Clock, CheckCircle, XCircle, ExternalLink, MessageSquare } from 'lucide-react';

interface RecentSend {
  id: string;
  created_at: string;
  status_code?: number;
  payload?: any;
}

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

export default function SendMessage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState('');
  const [sending, setSending] = useState(false);
  const [recentSends, setRecentSends] = useState<RecentSend[]>([]);

  const fetchRecentSends = async () => {
    try {
      const { data, error } = await supabase
        .from('send_logs')
        .select('id, created_at, status_code, payload')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentSends(data || []);
    } catch (error) {
      console.error('Error fetching recent sends:', error);
    }
  };

  React.useEffect(() => {
    fetchRecentSends();
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !groups.trim()) return;

    setSending(true);

    try {
      const groupsArray = groups.split(',').map(g => g.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('send-emulator', {
        body: {
          message: message.trim(),
          groups: groupsArray
        }
      });

      if (error) throw error;

      // Show detailed results
      if (data?.results) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const totalCount = data.results.length;
        
        if (successCount === totalCount) {
          toast({
            title: "Message sent successfully",
            description: `Message delivered to all ${data.total_groups} groups!`,
          });
        } else if (successCount > 0) {
          toast({
            title: "Partial success",
            description: `Message sent to ${successCount}/${totalCount} attempts`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Message failed to send",
            description: "All send attempts failed. Check logs for details.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Message sent successfully",
          description: "Your message has been delivered to the emulator.",
        });
      }
      
      setMessage('');
      setGroups('');
      
      // Refresh recent sends
      setTimeout(fetchRecentSends, 1000);
    } catch (error: any) {
      toast({
        title: "Send error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (statusCode?: number) => {
    if (!statusCode) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const characterCount = message.length;
  const isLongMessage = characterCount > 1800;

  return (
    <div className="space-y-6">
      {/* Premium Gradient Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Send Message</h1>
          <p className="text-muted-foreground mt-1.5">Send a message to your paddle groups via the emulator.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2">
          <Card className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                  <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-lg">Compose Message</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Enter your message and target groups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={sending}
                    className="min-h-32 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${isLongMessage ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {characterCount} characters
                    </span>
                    {isLongMessage && (
                      <span className="text-orange-600">
                        Long message will be split into multiple parts
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groups">Target Groups *</Label>
                  <Input
                    id="groups"
                    placeholder="group1, group2, group3"
                    value={groups}
                    onChange={(e) => setGroups(e.target.value)}
                    required
                    disabled={sending}
                    className="h-11 rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple groups with commas
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={sending || !message.trim() || !groups.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sends */}
        <div>
          <Card className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-lg">Recent Sends</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Your latest message attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSends.length > 0 ? (
                <div className="space-y-3">
                  {recentSends.map((send) => (
                    <Link
                      key={send.id}
                      to={`/admin/logs?highlight=${send.id}`}
                      className="block p-3 border border-border/60 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        {getStatusIcon(send.status_code)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(send.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {send.payload?.message || 'Message'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {send.payload?.groups?.join(', ') || 'Unknown groups'}
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/admin/logs"
                    className="block text-center text-sm text-primary hover:underline py-2"
                  >
                    View all logs →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border/60 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    No recent sends found.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
