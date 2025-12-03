import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export const CTASection = () => {
  const benefits = [
    "14-day free trial with full access",
    "Setup completed in under 5 minutes",
    "Works with your existing Playtomic account", 
    "No technical knowledge required",
    "Cancel anytime with one click"
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-12 text-center border-2 border-primary/20 shadow-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Automate Your
            <span className="text-primary ml-3">Paddle Club?</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join leading paddle clubs who've increased court bookings by 35% 
            with automated WhatsApp messaging.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 text-left">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="text-6xl font-bold text-primary mb-2">14</div>
              <div className="text-lg text-muted-foreground">Days Free Trial</div>
              <div className="text-sm text-muted-foreground mt-2">
                Full access • No credit card required
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg" className="text-lg px-10 py-4">
              <Link to="/auth">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-10 py-4">
              Schedule a Demo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Trusted by 50+ paddle clubs across the UK • Average setup time: 3 minutes
          </p>
        </Card>
      </div>
    </section>
  );
};