import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, MessageSquare, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Modern paddle tennis court" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Automate Your
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ml-4">
              Paddle Club
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            CORTEK automatically sends WhatsApp messages about court availability, 
            events, and bookings to keep your members engaged and courts busy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild variant="hero" size="lg" className="text-lg px-8 py-4">
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
              Watch Demo
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Instant Updates</h3>
              <p className="text-gray-300">Real-time court availability sent directly to WhatsApp groups</p>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Smart Templates</h3>
              <p className="text-gray-300">Customizable message templates for every occasion</p>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <Clock className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Automated Scheduling</h3>
              <p className="text-gray-300">Set it once, let CORTEK handle the rest</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};