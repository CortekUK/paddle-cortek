import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import cortekLogo from '@/assets/cortek-logo.svg';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    await signIn(email);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        <CardHeader className="space-y-1 text-center pb-2">
          <img src={cortekLogo} alt="CORTEK" className="h-10 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Welcome to CORTEK</CardTitle>
          <CardDescription>
            Sign in to your paddle club automation dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 rounded-lg" 
              disabled={loading || !email}
              variant="hero"
            >
              {loading ? 'Sending magic link...' : 'Send magic link'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            We'll send you a secure link to sign in - no password needed!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}