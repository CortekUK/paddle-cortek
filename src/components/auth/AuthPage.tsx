import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ensureOrgForUser } from '@/services/bootstrap';
import { routeAfterLogin } from '@/utils/routeGuards';
import { supabase } from '@/integrations/supabase/client';
import cortekLogo from '@/assets/cortek-logo.svg';
// Shared background component with floating orbs - MUST be outside AuthPage to prevent re-renders
const PremiumBackground = ({
  children
}: {
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/40 to-blue-50/30 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20 relative overflow-hidden">
    {/* Floating gradient orbs */}
    <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
    <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
    
    {/* Theme toggle in header */}
    <div className="absolute top-4 right-4 z-20">
      <ThemeToggle />
    </div>
    
    {/* Content */}
    <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-center min-h-screen p-4">
      {children}
    </div>
  </div>
);

// Shared glassmorphism card wrapper - MUST be outside AuthPage to prevent re-renders
const GlassCard = ({
  children
}: {
  children: React.ReactNode;
}) => (
  <div className="p-[1px] rounded-3xl bg-gradient-to-br from-primary/20 via-background to-accent/20 shadow-2xl shadow-primary/10 dark:shadow-primary/5">
    <Card className="bg-card/95 backdrop-blur-xl rounded-3xl border-0">
      {children}
    </Card>
  </div>
);

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') === 'login' ? 'login' : 'signup';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [error, setError] = useState('');
  const {
    signInWithPassword,
    signUp,
    resetPassword
  } = useAuth();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'login') {
      setActiveTab('login');
    }
  }, [searchParams]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const {
        error
      } = await signInWithPassword(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.');
        } else {
          setError(error.message);
        }
        return;
      }
      const redirectPath = await routeAfterLogin();
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || password !== confirmPassword) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined
        }
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.user) {
        const {
          error: signInError
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          setError('Account created but sign-in failed. Please try logging in manually.');
          return;
        }
        setTimeout(async () => {
          try {
            await ensureOrgForUser(data.user.id);
            navigate('/onboarding/step-1');
          } catch (err: any) {
            console.error('Error setting up user organization:', err);
            setError('Account created but setup failed. Please try logging in.');
          }
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    await resetPassword(resetEmail);
    setLoading(false);
    setShowResetForm(false);
    setResetEmail('');
  };
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
  };
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetForm();
    setShowResetForm(false);
  };

  if (showResetForm) {
    return <PremiumBackground>
        <GlassCard>
          <CardHeader className="space-y-2 text-center pb-4 pt-8 px-8">
            <img src={cortekLogo} alt="CORTEK" className="h-12 mx-auto mb-4" />
            <CardTitle className="text-xl font-semibold">Reset Password</CardTitle>
            <CardDescription className="font-medium">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="font-medium text-sm">Email Address</Label>
                <Input id="resetEmail" type="email" placeholder="your@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required disabled={loading} className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl border-muted-foreground/20 hover:bg-muted/50" onClick={() => setShowResetForm(false)} disabled={loading}>
                  Back
                </Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300" disabled={loading || !resetEmail} variant="hero">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          </CardContent>
        </GlassCard>
      </PremiumBackground>;
  }
  return <PremiumBackground>
      <GlassCard>
        <CardHeader className="text-center pb-8 pt-12 px-8">
          <img src={cortekLogo} alt="CORTEK" className="h-12 mx-auto" />
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {error && <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="login" className="rounded-lg h-10 font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg h-10 font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
                Create Account
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-6 mt-0">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail" className="font-medium text-sm">Email Address</Label>
                  <Input id="loginEmail" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input id="loginPassword" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="h-12 rounded-xl pr-10 border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all duration-300" disabled={loading || !email || !password}>
                  {loading ? 'Signing in...' : 'Log In'}
                </Button>
              </form>
              <div className="text-center">
                <Button type="button" variant="link" className="text-sm text-primary hover:text-primary/80" onClick={() => setShowResetForm(true)} disabled={loading}>
                  Forgot Password?
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-6 mt-0">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signupEmail" className="font-medium text-sm">Email Address</Label>
                  <Input id="signupEmail" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-12 rounded-xl border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input id="signupPassword" type={showPassword ? "text" : "password"} placeholder="Create a password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} disabled={loading} className="h-12 rounded-xl pr-10 border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-medium text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading} className="h-12 rounded-xl pr-10 border-muted-foreground/20 focus:border-primary placeholder:text-muted-foreground/60" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                {password && confirmPassword && password !== confirmPassword && <p className="text-sm text-destructive">Passwords do not match</p>}
                <Button type="submit" className="w-full h-12 rounded-xl bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all duration-300" disabled={loading || !email || !password || !confirmPassword || password !== confirmPassword || password.length < 8}>
                   {loading ? 'Creating Account...' : 'Create Account'}
                 </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </GlassCard>
    </PremiumBackground>;
}