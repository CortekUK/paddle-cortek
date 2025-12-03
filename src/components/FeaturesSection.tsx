import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Settings, 
  BarChart3, 
  Shield, 
  Clock, 
  Zap,
  Users,
  Calendar
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "WhatsApp Integration",
      description: "Direct integration with WhatsApp groups your members already use",
      badge: "Core Feature"
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Smart Templates", 
      description: "Pre-built templates for courts, events, and custom messaging",
      badge: "Customizable"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Automated Scheduling",
      description: "Set your preferences once and let CORTEK handle the timing",
      badge: "Time Saver"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Playtomic Sync",
      description: "Real-time data from your Playtomic court management system", 
      badge: "Live Data"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Multi-Location Support",
      description: "Manage multiple venues with separate configurations",
      badge: "Scalable"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Role-Based Access",
      description: "Different permission levels for admins, editors, and viewers",
      badge: "Secure"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Notifications",
      description: "Send immediate updates for last-minute changes or openings",
      badge: "Real-time"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Event Management", 
      description: "Promote tournaments, lessons, and special events automatically",
      badge: "Engagement"
    }
  ];

  const getBadgeVariant = (badge: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      "Core Feature": "default",
      "Customizable": "secondary", 
      "Time Saver": "outline",
      "Live Data": "default",
      "Scalable": "secondary",
      "Secure": "outline", 
      "Real-time": "default",
      "Engagement": "secondary"
    };
    return variants[badge] || "secondary";
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to
            <span className="text-primary ml-3">Engage Members</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            CORTEK integrates seamlessly with your existing Playtomic setup to deliver 
            professional, automated messaging that keeps your courts busy and members informed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <Badge variant={getBadgeVariant(feature.badge)} className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed flex-grow">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};